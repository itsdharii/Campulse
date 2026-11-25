"""Crew Sync Phase 2 tools. Deterministic Python functions; no LLM calls here."""
import functools
from contextlib import closing
import re
from datetime import date, timedelta
from itertools import combinations
import db

SIMULATION_LABEL = "SIMULATION ONLY — no database changes made"
HEALTHY_FROM, WATCH_FROM = 70, 40

def error(message):
    return {"error": message, "result": None, "reason": message}

def safe_tool(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except (ValueError, TypeError, KeyError) as exc:
            return error(f"Invalid input for {func.__name__}: {exc}")
        except Exception as exc:
            return error(f"{func.__name__} could not complete: {exc}")
    return wrapper

def _resolve_club(conn, value):
    if isinstance(value, int) or str(value).isdigit():
        return conn.execute("SELECT * FROM clubs WHERE id=?", (int(value),)).fetchone()
    name = str(value).strip()
    full = name if name.lower().endswith("club") else name + " Club"
    return conn.execute("SELECT * FROM clubs WHERE lower(name) IN (lower(?),lower(?))",
                        (name, full)).fetchone()

def _resolve_event(conn, value):
    if isinstance(value, int) or str(value).isdigit():
        row = conn.execute(
            "SELECT e.*,c.name AS club,v.name AS venue FROM events e "
            "JOIN clubs c ON c.id=e.club_id JOIN venues v ON v.id=e.venue_id WHERE e.id=?",
            (int(value),)).fetchone()
    else:
        row = conn.execute(
            "SELECT e.*,c.name AS club,v.name AS venue FROM events e "
            "JOIN clubs c ON c.id=e.club_id JOIN venues v ON v.id=e.venue_id "
            "WHERE lower(e.title)=lower(?) ORDER BY e.id LIMIT 1", (str(value).strip(),)).fetchone()
    return row

def _load_events(conn):
    rows = conn.execute(
        "SELECT e.id,e.title,e.event_date AS date,e.start_time,e.status,c.name AS club,"
        "v.name AS venue,e.club_id,e.venue_id,e.skills_needed,e.volunteers_needed "
        "FROM events e JOIN clubs c ON c.id=e.club_id JOIN venues v ON v.id=e.venue_id "
        "ORDER BY e.event_date,e.start_time,e.id").fetchall()
    return [dict(r) for r in rows]

def _group_clashes(events):
    # Phase 1 has no end_time/duration; flag same-day bookings at the same venue conservatively.
    groups = {}
    for e in events:
        if e["status"] != "cancelled":
            groups.setdefault((e["date"], e["venue"]), []).append(e)
    return [{"date": day, "venue": venue,
             "events": [{"id": e["id"], "title": e["title"], "club": e["club"],
                         "start_time": e["start_time"]} for e in rows]}
            for (day, venue), rows in sorted(groups.items()) if len(rows) > 1]

@safe_tool
def find_clashes():
    """Find same-day same-venue clashes and volunteers assigned to multiple events on a date."""
    with closing(db.get_conn()) as conn:
        venue_clashes = _group_clashes(_load_events(conn))
        doubles = conn.execute(
            "SELECT e.event_date AS date,v.id AS volunteer_id,v.name AS volunteer,"
            "GROUP_CONCAT(e.title,' | ') AS events,COUNT(DISTINCT e.id) AS event_count "
            "FROM assignments a JOIN events e ON e.id=a.event_id "
            "JOIN volunteers v ON v.id=a.volunteer_id "
            "WHERE a.status='assigned' AND e.status!='cancelled' "
            "GROUP BY e.event_date,v.id HAVING COUNT(DISTINCT e.id)>1 "
            "ORDER BY e.event_date,v.id").fetchall()
    result = {"venue_clashes": venue_clashes, "volunteer_double_bookings": [dict(x) for x in doubles]}
    return {"result": result, "reason":
            f"Found {len(venue_clashes)} venue clash(es) and {len(doubles)} volunteer double-booking(s)."
            if venue_clashes or doubles else "No venue clashes or volunteer double-bookings found."}

def _health(conn, club, today=None):
    today = today or db.today()
    since = (today - timedelta(days=90)).isoformat()
    n_events = conn.execute(
        "SELECT COUNT(*) FROM events WHERE club_id=? AND status='completed' AND event_date BETWEEN ? AND ?",
        (club["id"], since, today.isoformat())).fetchone()[0]
    prev, current = int(club["volunteers_prev_90d"] or 0), int(club["volunteers_last_90d"] or 0)
    ratio = current / prev if prev else 1.0
    if ratio >= 1: trend, trend_label = 25, "steady or growing"
    elif ratio >= .9: trend, trend_label = 20, "about steady"
    elif ratio >= .75: trend, trend_label = 12, "slightly down"
    elif ratio >= .5: trend, trend_label = 6, "falling"
    else: trend, trend_label = 0, "falling fast"
    members, active = int(club["member_count"] or 0), int(club["active_members_30d"] or 0)
    share = active / members if members else 0
    plans = int(club["unfulfilled_plans"] or 0)
    plan_points = {0: 25, 1: 10, 2: 5}.get(plans, 0)
    parts = [
        {"name":"Events in last 90 days","points":min(n_events,5)*5,"max":25,
         "detail":f"{n_events} completed event(s) in the last 90 days"},
        {"name":"Volunteer trend","points":trend,"max":25,
         "detail":f"volunteers went from {prev} to {current} ({trend_label})"},
        {"name":"Member activity","points":round(share*25),"max":25,
         "detail":f"{active} of {members} members active ({round(share*100)}%)"},
        {"name":"Unfulfilled plans","points":plan_points,"max":25,
         "detail":f"{plans} unfulfilled plan(s)"},
    ]
    score = sum(p["points"] for p in parts)
    status = "Healthy" if score >= HEALTHY_FROM else "Watch" if score >= WATCH_FROM else "At risk"
    weak = [p["name"] for p in parts if p["points"] < .6*p["max"]]
    tips = []
    if "Events in last 90 days" in weak: tips.append("Schedule a small, achievable event in the next month.")
    if "Volunteer trend" in weak: tips.append("Run a volunteer re-engagement drive with recent participants.")
    if "Member activity" in weak: tips.append("Invite inactive members to a short, low-commitment activity.")
    if "Unfulfilled plans" in weak: tips.append("Review overdue plans and complete or formally reschedule them.")
    ideas = {
        "Literary Club":"Consider a joint open-mic with Music Club.",
        "Coding Club":"Consider a practical hack night with Robotics Club.",
        "Dance Club":"Consider a dance-and-music showcase with Music Club.",
        "Photography Club":"Consider co-hosting or covering an exhibition.",
        "Music Club":"Consider a joint open-mic with Literary Club.",
        "Robotics Club":"Consider a build day with Coding Club."
    }
    tips.append(ideas.get(club["name"],"Explore a joint activity with a complementary club."))
    return {"club_id":club["id"],"club":club["name"],"score":score,"status":status,
            "parts":parts,"weak_areas":weak,"suggestions":tips[:4]}

def _health_reason(h):
    return f"{h['club']} scores {h['score']}/100 ({h['status']}); weak indicators: {', '.join(h['weak_areas']) or 'none'}."

@safe_tool
def club_health(club_id):
    with closing(db.get_conn()) as conn:
        club = _resolve_club(conn, club_id)
        if club is None: return error(f"Club '{club_id}' was not found.")
        result = _health(conn, club)
    return {"result":result,"reason":_health_reason(result)}

@safe_tool
def all_club_health():
    with closing(db.get_conn()) as conn:
        results = [_health(conn,c) for c in conn.execute("SELECT * FROM clubs ORDER BY id").fetchall()]
    results.sort(key=lambda x:x["score"])
    return {"result":results,"reason":" | ".join(_health_reason(x) for x in results)}

def _skills(value):
    return [x.lower().strip() for x in db.split_list(value)]

def _collab(group, health):
    matches, total = [], 0
    for receiver in group:
        for need in receiver["needs"]:
            total += 1
            giver = next((g for g in group if g is not receiver and need in g["offers"]),None)
            if giver: matches.append({"skill":need,"from":giver["name"],"to":receiver["name"]})
    if not matches: return None
    roles = {}
    for c in group:
        roles[c["name"]] = {
            "contributes": sorted({m["skill"] for m in matches if m["from"]==c["name"]}),
            "receives": sorted({m["skill"] for m in matches if m["to"]==c["name"]})
        }
    names = [c["name"] for c in group]
    return {"idea":"Joint event: "+" + ".join(names),"clubs":names,"roles":roles,
            "needs_covered":len(matches),"total_needs":total,
            "coverage_percent":round(100*len(matches)/total) if total else 0,
            "at_risk_clubs_supported":[n for n in names if health.get(n)=="At risk"],
            "why":f"{len(matches)} of {total} listed skill needs are covered by other clubs in this group."}

@safe_tool
def match_clubs():
    with closing(db.get_conn()) as conn:
        rows = conn.execute("SELECT * FROM clubs ORDER BY id").fetchall()
        health = {r["name"]:_health(conn,r)["status"] for r in rows}
    clubs = [{"name":r["name"],"offers":_skills(r["skills_offered"]),"needs":_skills(r["skills_needed"])} for r in rows]
    options = []
    for size in (2,3):
        for group in combinations(clubs,size):
            option = _collab(group,health)
            if option: options.append(option)
    options.sort(key=lambda x:(-x["needs_covered"],-x["coverage_percent"],len(x["clubs"])))
    return {"result":{"suggested":options[0] if options else None,"other_ideas":options[1:4]},
            "reason":options[0]["why"] if options else "No complementary skill combinations found."}

def _volunteer_conflict(conn, volunteer_id, day, excluded_event):
    row = conn.execute(
        "SELECT e.title FROM assignments a JOIN events e ON e.id=a.event_id "
        "WHERE a.volunteer_id=? AND a.status='assigned' AND e.status!='cancelled' "
        "AND e.event_date=? AND e.id!=? LIMIT 1",
        (volunteer_id,day,excluded_event)).fetchone()
    return row["title"] if row else None

@safe_tool
def simulate_move(event_id,new_date):
    try: day = date.fromisoformat(str(new_date).strip()).isoformat()
    except ValueError: return error("Use YYYY-MM-DD for the proposed date.")
    with closing(db.get_conn()) as conn:
        event = _resolve_event(conn,event_id)
        if event is None: return error(f"Event '{event_id}' was not found.")
        events = _load_events(conn)
        before = _group_clashes(events)
        after = _group_clashes([dict(e,date=day) if e["id"]==event["id"] else e for e in events])
        venue_conflicts = [e["title"] for e in events if e["id"]!=event["id"] and
                           e["date"]==day and e["venue"]==event["venue"] and e["status"]!="cancelled"]
        assigned = conn.execute(
            "SELECT v.* FROM assignments a JOIN volunteers v ON v.id=a.volunteer_id "
            "WHERE a.event_id=? AND a.status='assigned'",(event["id"],)).fetchall()
        unavailable=[]
        for v in assigned:
            conflict = _volunteer_conflict(conn,v["id"],day,event["id"])
            if day not in db.split_list(v["available_dates"]):
                unavailable.append({"volunteer":v["name"],"issue":f"not marked available on {day}"})
            elif conflict:
                unavailable.append({"volunteer":v["name"],"issue":f"already assigned to {conflict}"})
    issues=[]
    if venue_conflicts: issues.append("Venue already booked by "+", ".join(venue_conflicts))
    if unavailable: issues.append(f"{len(unavailable)} assigned volunteer(s) unavailable")
    verdict = ("No change: event is already on that date." if day==event["event_date"]
               else "Needs attention: "+"; ".join(issues) if issues
               else "Looks feasible based on the available sample data.")
    result={"event_id":event["id"],"event":event["title"],"club":event["club"],"venue":event["venue"],
            "old_date":event["event_date"],"new_date":day,"venue_conflicts":venue_conflicts,
            "unavailable_assigned_volunteers":unavailable,"clashes_before":before,"clashes_after":after,
            "verdict":verdict}
    return {"label":SIMULATION_LABEL,"result":result,"reason":f"{SIMULATION_LABEL}: {event['title']} {event['event_date']} → {day}. {verdict}"}

@safe_tool
def find_replacements(event_id,n_needed,skill=None):
    try:
        n_needed=int(n_needed)
        if n_needed<0: return error("n_needed cannot be negative.")
    except (TypeError,ValueError): return error("n_needed must be a non-negative whole number.")
    wanted_skill=str(skill or "").strip().lower()
    with closing(db.get_conn()) as conn:
        event=_resolve_event(conn,event_id)
        if event is None: return error(f"Event '{event_id}' was not found.")
        event_skills=_skills(event["skills_needed"])
        wanted=[wanted_skill] if wanted_skill else event_skills
        linked={r["volunteer_id"] for r in conn.execute(
            "SELECT volunteer_id FROM assignments WHERE event_id=?",(event["id"],)).fetchall()}
        people=conn.execute("SELECT v.*,c.name AS club FROM volunteers v LEFT JOIN clubs c ON c.id=v.club_id ORDER BY v.id").fetchall()
        candidates=[]
        for v in people:
            skills=_skills(v["skills"])
            matched=sorted(set(skills)&set(wanted)) if wanted else skills
            if v["id"] in linked or (wanted and not matched): continue
            if event["event_date"] not in db.split_list(v["available_dates"]): continue
            conflict=_volunteer_conflict(conn,v["id"],event["event_date"],event["id"])
            if conflict: continue
            load=conn.execute("SELECT COUNT(*) FROM assignments WHERE volunteer_id=? AND status='assigned'",(v["id"],)).fetchone()[0]
            candidates.append({"id":v["id"],"name":v["name"],"club":v["club"],"skills":skills,
                "matching_skills":matched,"other_assignments":load,
                "reason":f"Matches {', '.join(matched) or 'general availability'}; {load} other assigned event(s)."})
    candidates.sort(key=lambda x:(-len(x["matching_skills"]),x["other_assignments"],x["id"]))
    chosen=candidates[:n_needed]
    return {"result":{"event_id":event["id"],"event":event["title"],"date":event["event_date"],
        "skill_filter":wanted_skill or None,"n_needed":n_needed,"candidate_count":len(candidates),
        "enough":len(candidates)>=n_needed,"candidates":candidates,"suggested_ids":[x["id"] for x in chosen]},
        "reason":f"Found {len(candidates)} eligible replacement(s); suggested {len(chosen)}."
        if len(candidates)>=n_needed else f"Only {len(candidates)} eligible replacement(s); {n_needed-len(candidates)} more needed."}

@safe_tool
def budget_guard(club_id,proposed_amount,description="Proposed expense"):
    """Compare a proposed expense against allocated less spent and reserved club funds."""
    try:
        amount=float(proposed_amount)
        if amount<0: return error("proposed_amount cannot be negative.")
    except (TypeError,ValueError): return error("proposed_amount must be a non-negative number.")
    with closing(db.get_conn()) as conn:
        club=_resolve_club(conn,club_id)
        if club is None: return error(f"Club '{club_id}' was not found.")
        budget=conn.execute("SELECT * FROM club_budgets WHERE club_id=?",(club["id"],)).fetchone()
        if budget is None: return error(f"No budget record exists for {club['name']}.")
    remaining=float(budget["allocated_amount"])-float(budget["spent_amount"])-float(budget["reserved_amount"])
    after=remaining-amount
    result={"club":club["name"],"description":str(description),"currency":budget["currency"],
        "allocated":budget["allocated_amount"],"spent":budget["spent_amount"],"reserved":budget["reserved_amount"],
        "remaining_before":round(remaining,2),"proposed_amount":round(amount,2),"remaining_after":round(after,2),
        "within_budget":after>=0,"status":"Within budget" if after>=0 else "Exceeds available budget"}
    return {"result":result,"reason":f"{club['name']} has {budget['currency']} {remaining:,.2f} available; "
        f"the proposed expense of {budget['currency']} {amount:,.2f} is {'within' if after>=0 else 'above'} budget."}

POSITIVE=("positive","good","great","excellent","loved","happy")
NEGATIVE=("negative","poor","bad","not ","complain")
FIXES=[
    ("delay","Confirm venue handover time in writing and do a walk-through the day before."),
    ("registration","Add registration-desk volunteers and open online pre-registration."),
    ("volunteer","Recruit about 20% more volunteers than needed and keep a reserve list."),
    ("sound","Run a sound and projector check before the doors open."),
    ("wifi","Test Wi-Fi the day before and keep a mobile hotspot as backup."),
]
def _to_int(value):
    if value is None or value=="": return None
    n=int(float(value))
    if n<0: raise ValueError("counts cannot be negative")
    return n
def _to_list(value):
    if not value:return []
    if isinstance(value,str):value=re.split(r",|;| and ",value)
    return [str(x).strip() for x in value if str(x).strip()]

@safe_tool
def generate_report(inputs):
    """Build a structured report draft; does not persist it to the database."""
    if not isinstance(inputs,dict):return error("inputs must be a dictionary.")
    expected=_to_int(inputs.get("expected_attendance",inputs.get("expected")))
    actual=_to_int(inputs.get("actual_attendance",inputs.get("actual")))
    volunteers=_to_int(inputs.get("volunteers"))
    if expected==0:return error("expected_attendance must be greater than zero.")
    problems=_to_list(inputs.get("problems"))
    feedback=str(inputs.get("feedback") or "").strip()
    title=str(inputs.get("event") or "Event").strip()
    rate=round(actual*100/expected) if expected and actual is not None else None
    facts=[]
    if rate is not None:facts.append(f"{actual} attended against {expected} expected ({rate}% of target)")
    elif actual is not None:facts.append(f"{actual} attended")
    if volunteers is not None:facts.append(f"{volunteers} volunteers helped")
    summary=f"{title}: "+", ".join(facts)+"." if facts else f"{title}: no attendance figures supplied."
    well=[]
    if rate is not None and rate>=70:well.append(f"Attendance reached {rate}% of target.")
    if volunteers:well.append(f"{volunteers} volunteers supported the event.")
    low=feedback.lower()
    if any(w in low for w in POSITIVE) and not any(w in low for w in NEGATIVE):
        well.append(f"Participant feedback was positive: {feedback}.")
    if not well:well.append("No positive outcomes supplied; collect participant feedback.")
    volunteer_summary=(f"{volunteers} volunteers for {actual} attendees (about 1 per {actual/volunteers:.1f} attendees)."
        if volunteers and actual else f"{volunteers} volunteers helped." if volunteers is not None else "Volunteer count not provided.")
    tips=[]
    for problem in problems:
        for word,tip in FIXES:
            if word in problem.lower() and tip not in tips:tips.append(tip)
    if rate is not None and rate<80:tips.append("Start promotion earlier using campus posters and social media.")
    if not tips:tips.append("Review this report with the committee and retain practices that worked.")
    report={"title":f"{title} report","summary":summary,"what_went_well":well,
        "problems":problems or ["No problems were reported."],"volunteer_summary":volunteer_summary,
        "suggestions":tips,"numbers":{"expected":expected,"actual":actual,"attendance_percent":rate,"volunteers":volunteers}}
    return {"result":report,"reason":"Structured report draft generated from organizer-provided information."}
