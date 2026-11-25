"""seed.py - fills the database with FAKE sample data for the Crew Sync demo.

    python seed.py          rebuilds the demo data and runs quick self-checks

In the app, call reset_demo_data() to restore everything with one click.
Click it right before presenting: "Tech Expo Prep Day" is set to start 2 hours
after the reset, so "starts in two hours" is true during the demo.

Every name here is made up. No real students, staff or clubs.
"""
from datetime import datetime, timedelta

import db

HACKATHON_DAY = "2026-12-15"   # Hackathon and Dance Competition clash here
MOVE_TO_DAY = "2026-12-17"     # kept completely free at Main Auditorium

# (short name, description, skills offered, skills needed, members,
#  active in last 30 days, volunteers 90-180 days ago, volunteers last 90 days,
#  unfulfilled plans, note about the plan)
CLUBS = [
    ("Coding", "Builds apps and runs workshops, bootcamps and hackathons.",
     "tech support", "photography, content writing", 60, 42, 12, 14, 0, ""),
    ("Dance", "Performances, workshops and dance competitions.",
     "stage management", "photography, registration desk", 45, 31, 10, 10, 0, ""),
    ("Photography", "Event coverage, photo walks and editing workshops.",
     "photography", "tech support, content writing", 38, 27, 8, 9, 0, ""),
    ("Literary", "Poetry, creative writing and debates.",
     "content writing, social media", "photography, tech support",
     40, 9, 12, 4, 1, "Annual poetry slam planned for October was never held."),
    ("Music", "Bands, open mics and jam nights.",
     "stage management, social media", "photography, registration desk",
     50, 35, 9, 10, 0, ""),
    ("Robotics", "Robot builds, drone demos and Arduino workshops.",
     "tech support, registration desk", "stage management, social media",
     35, 25, 7, 7, 0, ""),
]

VENUES = [("Main Auditorium", 500), ("Seminar Hall", 120), ("Open Air Theatre", 800),
          ("Innovation Lab", 60), ("Campus Lawn", 300)]

# (club, venue, title, days ago or fixed date, start time, status,
#  expected attendance, actual attendance, volunteers needed, skills needed)
# Completed events: Literary has only ONE in the last 90 days, the others 3-4.
EVENTS = [
    ("Coding", "Seminar Hall", "Python Workshop", -12, "10:00", "completed", 80, 72, 0, ""),
    ("Coding", "Innovation Lab", "Git and GitHub Basics", -30, "14:00", "completed", 50, 47, 0, ""),
    ("Coding", "Innovation Lab", "Web Dev Bootcamp", -48, "09:30", "completed", 60, 58, 0, ""),
    ("Coding", "Seminar Hall", "Mock Interview Day", -70, "10:00", "completed", 70, 66, 0, ""),
    ("Dance", "Main Auditorium", "Freshers Dance Night", -8, "18:00", "completed", 200, 185, 0, ""),
    ("Dance", "Seminar Hall", "Salsa Workshop", -27, "16:00", "completed", 40, 38, 0, ""),
    ("Dance", "Open Air Theatre", "Flash Mob", -45, "13:00", "completed", 100, 120, 0, ""),
    ("Dance", "Seminar Hall", "Hip-Hop Masterclass", -66, "15:00", "completed", 60, 55, 0, ""),
    ("Photography", "Campus Lawn", "Campus Photo Walk", -15, "07:30", "completed", 40, 36, 0, ""),
    ("Photography", "Seminar Hall", "Editing Workshop", -40, "11:00", "completed", 35, 30, 0, ""),
    ("Photography", "Seminar Hall", "Portrait Day", -62, "10:00", "completed", 45, 41, 0, ""),
    ("Literary", "Seminar Hall", "Poetry Evening", -75, "17:00", "completed", 60, 34, 0, ""),
    ("Music", "Open Air Theatre", "Open Mic Night", -10, "18:30", "completed", 120, 95, 0, ""),
    ("Music", "Seminar Hall", "Unplugged Evening", -33, "18:00", "completed", 80, 76, 0, ""),
    ("Music", "Seminar Hall", "Guitar Workshop", -52, "15:00", "completed", 40, 40, 0, ""),
    ("Music", "Main Auditorium", "Battle of Bands", -80, "17:00", "completed", 300, 280, 0, ""),
    ("Robotics", "Innovation Lab", "Arduino Basics", -20, "10:00", "completed", 40, 39, 0, ""),
    ("Robotics", "Innovation Lab", "Line-Follower Build", -44, "10:00", "completed", 30, 28, 0, ""),
    ("Robotics", "Campus Lawn", "Drone Demo", -71, "11:00", "completed", 150, 140, 0, ""),
    # Upcoming events (December 2026). The first two clash on purpose.
    ("Coding", "Main Auditorium", "Hackathon", HACKATHON_DAY, "09:00", "scheduled", 150, None, 6,
     "tech support, registration desk, social media, content writing"),
    ("Dance", "Main Auditorium", "Dance Competition", HACKATHON_DAY, "10:00", "scheduled", 300, None, 8,
     "stage management, registration desk, tech support, photography"),
    ("Robotics", "Seminar Hall", "Line-Follower Workshop", "2026-12-09", "11:00", "scheduled", 40, None, 3,
     "tech support"),
    ("Photography", "Campus Lawn", "Winter Photo Walk", "2026-12-12", "07:30", "scheduled", 40, None, 2,
     "photography"),
    ("Music", "Open Air Theatre", "Winter Jam Night", "2026-12-19", "18:00", "scheduled", 250, None, 5,
     "stage management, tech support"),
    # "Tech Expo Prep Day" is added in seed_database(): it starts 2 hours from now.
]

# (name, club, skills, available on) - "today" also covers the Prep Day date.
# Availability keys: 15, 16, 17 mean 15/16/17 December 2026.
VOLUNTEERS = [
    ("Anaya Rao", "Photography", "photography, social media", "15,16,17,today"),
    ("Kabir Nair", "Photography", "photography", "15,17"),
    ("Isha Menon", "Photography", "photography, content writing", "15,16,17"),
    ("Rohan Das", "Photography", "photography, tech support", "15,17,today"),
    ("Meera Iyer", "Photography", "photography, social media", "15,17"),
    ("Dev Malhotra", "Photography", "photography", "17"),
    ("Tara Bose", "Photography", "photography, registration desk", "15,today"),
    ("Aarav Mehta", "Coding", "tech support, registration desk", "15,17"),
    ("Vihaan Kulkarni", "Coding", "tech support", "15,17,today"),
    ("Ishaan Reddy", "Coding", "tech support, stage management", "15,17"),
    ("Zoya Khan", "Coding", "tech support, content writing", "15,16,17,today"),
    ("Neel Joshi", "Coding", "tech support, registration desk", "15,17,today"),
    ("Sana Qureshi", "Coding", "tech support, social media", "15,17"),
    ("Diya Kapoor", "Dance", "stage management, registration desk", "15,today"),
    ("Aditi Verma", "Dance", "stage management, social media", "15,16,today"),
    ("Karan Singh", "Dance", "stage management", "15,today"),
    ("Riya Sen", "Dance", "stage management, registration desk", "15,16,today"),
    ("Yash Patel", "Dance", "stage management, tech support", "15,16,today"),
    ("Naina Pillai", "Literary", "content writing, social media", "15,16,17,today"),
    ("Ira Chandra", "Literary", "content writing", "16,17"),
    ("Omkar Desai", "Literary", "content writing, registration desk", "15,17,today"),
    ("Samar Gill", "Music", "stage management, tech support", "15,16,today"),
    ("Lavanya Shetty", "Music", "social media, registration desk", "15,16,17"),
    ("Tanvi Chopra", "Robotics", "tech support, registration desk", "15,today"),
    ("Pranav Bhat", "Robotics", "registration desk", "17,today"),
]

# (event title, volunteer, role, cancels in the demo?)
# Note: Aarav Mehta is booked on BOTH events on 15 Dec - that is the 2nd clash.
ASSIGNMENTS = [
    ("Hackathon", "Aarav Mehta", "tech support", 0),
    ("Hackathon", "Ishaan Reddy", "tech support", 0),
    ("Hackathon", "Rohan Das", "tech support", 0),
    ("Hackathon", "Sana Qureshi", "social media", 0),
    ("Hackathon", "Lavanya Shetty", "registration desk", 0),
    ("Hackathon", "Naina Pillai", "content writing", 0),
    ("Dance Competition", "Aarav Mehta", "tech support", 0),
    ("Dance Competition", "Yash Patel", "stage management", 0),
    ("Dance Competition", "Samar Gill", "stage management", 0),
    ("Dance Competition", "Omkar Desai", "registration desk", 0),
    ("Tech Expo Prep Day", "Neel Joshi", "registration desk", 1),
    ("Tech Expo Prep Day", "Diya Kapoor", "registration desk", 1),
    ("Tech Expo Prep Day", "Riya Sen", "registration desk", 1),
    ("Tech Expo Prep Day", "Karan Singh", "stage management", 1),
    ("Tech Expo Prep Day", "Aditi Verma", "stage management", 1),
    ("Tech Expo Prep Day", "Vihaan Kulkarni", "tech support", 0),
    ("Tech Expo Prep Day", "Zoya Khan", "tech support", 0),
    ("Tech Expo Prep Day", "Anaya Rao", "photography", 0),
]

# (event, club, days ago, expected, actual, volunteers,
#  summary, what went well, problems, volunteer summary, suggestions)
REPORTS = [
    ("Open Mic Night", "Music", -9, 120, 95, 10,
     "Open Mic Night drew 95 of 120 expected guests. Performances were strong but the start was late.",
     "Great performances and crowd energy. Volunteers posted live updates on social media.",
     "Sound check ran late. Only one volunteer at the registration desk when the queue peaked.",
     "10 volunteers helped. The stage crew did very well; registration desk was understaffed.",
     "Hold the sound check the day before. Assign at least 3 registration desk volunteers "
     "for events with more than 100 guests."),
    ("Web Dev Bootcamp", "Coding", -47, 60, 58, 6,
     "Web Dev Bootcamp had near-full attendance and positive feedback.",
     "Hands-on sessions were praised. Almost everyone who registered attended.",
     "The lab Wi-Fi dropped twice during live coding.",
     "6 volunteers helped. Tech support was strong.",
     "Test the Wi-Fi the day before and keep a mobile hotspot as a backup."),
]


def _day(value) -> str:
    """A number means 'days from today'; a string is already a date."""
    if isinstance(value, int):
        return (db.today() + timedelta(days=value)).isoformat()
    return value


def _availability(keys: str, prep_day: str) -> str:
    """'15,today' -> '2026-12-15,<today>,<prep day>'"""
    dates = set()
    for key in db.split_list(keys):
        if key == "today":
            dates.update([db.today().isoformat(), prep_day])
        else:
            dates.add(f"2026-12-{int(key):02d}")
    return ",".join(sorted(dates))


def seed_database() -> None:
    """Fill the (empty) tables with the demo data."""
    start = db.now() + timedelta(hours=2)        # Prep Day starts in 2 hours
    prep_day = start.date().isoformat()
    conn = db.get_conn()
    try:
        club_id, venue_id, event_id, vol_id = {}, {}, {}, {}

        for c in CLUBS:
            cur = conn.execute(
                "INSERT INTO clubs (name, description, skills_offered, skills_needed, member_count,"
                " active_members_30d, volunteers_prev_90d, volunteers_last_90d, unfulfilled_plans,"
                " unfulfilled_plans_note) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (f"{c[0]} Club",) + c[1:])
            club_id[c[0]] = cur.lastrowid

        for name, capacity in VENUES:
            venue_id[name] = conn.execute(
                "INSERT INTO venues (name, capacity) VALUES (?,?)", (name, capacity)).lastrowid

        # Fictional annual club budgets for the Budget Guard demo (amounts in INR).
        budgets = {
            "Coding": (150000, 72000, 18000),
            "Dance": (120000, 65000, 15000),
            "Photography": (80000, 30000, 10000),
            "Literary": (60000, 18000, 5000),
            "Music": (100000, 52000, 12000),
            "Robotics": (140000, 85000, 20000),
        }
        for club_name, values in budgets.items():
            conn.execute(
                "INSERT INTO club_budgets (club_id, allocated_amount, spent_amount, reserved_amount, currency) "
                "VALUES (?,?,?,?,?)",
                (club_id[club_name], *values, "INR"))

        rows = list(EVENTS) + [
            ("Coding", "Innovation Lab", "Tech Expo Prep Day", prep_day,
             start.strftime("%H:%M"), "scheduled", 30, None, 8,
             "registration desk, stage management, tech support, photography")]
        for club, venue, title, when, time, status, expected, actual, needed, skills in rows:
            day = _day(when)
            event_id[title] = conn.execute(
                "INSERT INTO events (club_id, venue_id, title, event_date, start_time, status,"
                " expected_attendance, actual_attendance, volunteers_needed, skills_needed)"
                " VALUES (?,?,?,?,?,?,?,?,?,?)",
                (club_id[club], venue_id[venue], title, day, f"{day} {time}", status,
                 expected, actual, needed, skills)).lastrowid

        for name, club, skills, available in VOLUNTEERS:
            vol_id[name] = conn.execute(
                "INSERT INTO volunteers (name, club_id, skills, available_dates) VALUES (?,?,?,?)",
                (name, club_id[club], skills, _availability(available, prep_day))).lastrowid

        for title, name, role, cancels in ASSIGNMENTS:
            conn.execute(
                "INSERT INTO assignments (event_id, volunteer_id, role, demo_cancels)"
                " VALUES (?,?,?,?)", (event_id[title], vol_id[name], role, cancels))

        # Two past reports, so the agent can learn from history later.
        for title, club, days_ago, expected, actual, vols, *text in REPORTS:
            conn.execute(
                "INSERT INTO reports (event_id, club_id, title, created_on, expected_attendance,"
                " actual_attendance, volunteers, summary, went_well, problems, volunteer_summary,"
                " suggestions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (event_id[title], club_id[club], f"{title} report", _day(days_ago),
                 expected, actual, vols, *text))
        conn.commit()
    finally:
        conn.close()


def reset_demo_data() -> dict:
    """Wipe the database and rebuild the demo data. Returns row counts."""
    db.create_tables(drop_first=True)
    seed_database()
    return {t: db.query(f"SELECT COUNT(*) AS n FROM {t}")[0]["n"] for t in reversed(db.TABLES)}


def ensure_demo_data() -> None:
    """Create and fill the database only if it is missing or empty."""
    db.create_tables()
    if not db.query("SELECT 1 FROM clubs LIMIT 1"):
        seed_database()


# ------------------------------------------------------------- self-checks
def run_checks() -> list[tuple[str, bool]]:
    """Check that the data tells the demo story. Returns (description, passed)."""
    out = []
    q = db.query

    clash = q("SELECT e.event_date AS d, v.name AS venue, COUNT(*) AS n FROM events e"
              " JOIN venues v ON v.id = e.venue_id GROUP BY e.event_date, e.venue_id HAVING n > 1")
    out.append(("Exactly one venue clash: 15 Dec at Main Auditorium",
                len(clash) == 1 and clash[0]["d"] == HACKATHON_DAY
                and clash[0]["venue"] == "Main Auditorium"))

    free = q("SELECT COUNT(*) AS n FROM events e JOIN venues v ON v.id = e.venue_id"
             " WHERE e.event_date = ? AND v.name = 'Main Auditorium'", (MOVE_TO_DAY,))[0]["n"]
    out.append(("17 Dec is completely free at Main Auditorium", free == 0))

    lo, hi = (db.today() - timedelta(days=90)).isoformat(), db.today().isoformat()
    counts = {r["name"]: r["n"] for r in q(
        "SELECT c.name, COUNT(e.id) AS n FROM clubs c LEFT JOIN events e ON e.club_id = c.id"
        " AND e.status = 'completed' AND e.event_date BETWEEN ? AND ? GROUP BY c.id", (lo, hi))}
    out.append(("Literary has 1 event in 90 days; every other club has 3+",
                counts["Literary Club"] == 1
                and all(n >= 3 for k, n in counts.items() if k != "Literary Club")))

    lit = q("SELECT * FROM clubs WHERE name = 'Literary Club'")[0]
    out.append(("Literary volunteers are falling and 1 plan is unfulfilled",
                lit["volunteers_last_90d"] < lit["volunteers_prev_90d"] and lit["unfulfilled_plans"] == 1))

    free_photo = [v for v in q("SELECT v.*, c.name AS club FROM volunteers v JOIN clubs c ON c.id = v.club_id")
                  if v["club"] == "Photography Club" and HACKATHON_DAY in db.split_list(v["available_dates"])
                  and not q("SELECT 1 FROM assignments a JOIN events e ON e.id = a.event_id"
                            " WHERE a.volunteer_id = ? AND e.event_date = ?", (v["id"], HACKATHON_DAY))]
    out.append((f"{len(free_photo)} Photography volunteers are free on 15 Dec", len(free_photo) >= 3))

    doubles = q("SELECT a.volunteer_id FROM assignments a JOIN events e ON e.id = a.event_id"
                " WHERE e.event_date = ? GROUP BY a.volunteer_id HAVING COUNT(*) > 1", (HACKATHON_DAY,))
    out.append(("One volunteer is double-booked on 15 Dec (2nd clash)", len(doubles) == 1))

    hack = q("SELECT v.available_dates FROM assignments a JOIN events e ON e.id = a.event_id"
             " JOIN volunteers v ON v.id = a.volunteer_id WHERE e.title = 'Hackathon'")
    out.append(("All Hackathon volunteers are free on 17 Dec (move works)",
                len(hack) == 6 and all(MOVE_TO_DAY in db.split_list(h["available_dates"]) for h in hack)))

    prep = q("SELECT * FROM events WHERE title = 'Tech Expo Prep Day'")[0]
    mins = (datetime.fromisoformat(prep["start_time"]) - db.now()).total_seconds() / 60
    asg = q("SELECT demo_cancels FROM assignments WHERE event_id = ?", (prep["id"],))
    out.append(("Prep Day starts in ~2 hours with 8 volunteers, 5 will cancel",
                105 <= mins <= 125 and len(asg) == 8 and sum(a["demo_cancels"] for a in asg) == 5))

    pool = [v for v in q("SELECT * FROM volunteers")
            if prep["event_date"] in db.split_list(v["available_dates"])
            and not q("SELECT 1 FROM assignments WHERE event_id = ? AND volunteer_id = ?", (prep["id"], v["id"]))
            and {"registration desk", "stage management"} & set(db.split_list(v["skills"]))]
    out.append((f"{len(pool)} free volunteers can replace the 5 who cancel", len(pool) >= 5))

    out.append(("2 past reports exist", q("SELECT COUNT(*) AS n FROM reports")[0]["n"] == 2))
    return out


if __name__ == "__main__":
    print("Rebuilding demo data (this wipes crewsync.db)...")
    for table, n in reset_demo_data().items():
        print(f"  {table:16s} {n}")
    print("\nSelf-checks:")
    results = run_checks()
    for text, ok in results:
        print(f"  [{'OK' if ok else 'FAIL'}] {text}")
    print("\nAll checks passed." if all(ok for _, ok in results) else "\nSome checks FAILED.")
