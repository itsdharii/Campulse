"""Integration tests for transactional human approval workflows."""
import os
import tempfile
import unittest
from pathlib import Path

_TMP = tempfile.TemporaryDirectory(prefix="crewsync_approval_test_")
os.environ["CREWSYNC_DB"] = str(Path(_TMP.name) / "approval.db")

import db
import seed
import tools
import approval
from tool_registry import execute_tool, PHASE2_TOOL_MAP
import inspect

class ApprovalTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.DB_PATH = str(Path(_TMP.name) / "approval.db")
        seed.reset_demo_data()

    def setUp(self):
        seed.reset_demo_data()

    def test_move_proposal_is_not_executed_until_approved(self):
        event = db.query("SELECT id,event_date,start_time FROM events WHERE title='Hackathon'")[0]
        proposal = approval.create_proposal("move_event", {"event_id": event["id"], "new_date": "2026-12-17"}, "Move Hackathon")
        unchanged = db.query("SELECT event_date,start_time FROM events WHERE id=?", (event["id"],))[0]
        self.assertEqual(unchanged["event_date"], event["event_date"])
        self.assertEqual(unchanged["start_time"], event["start_time"])
        result = approval.decide(proposal["action_id"], "approve", "Reviewed")
        self.assertTrue(result["executed"])
        changed = db.query("SELECT event_date,start_time FROM events WHERE id=?", (event["id"],))[0]
        self.assertEqual(changed["event_date"], "2026-12-17")
        self.assertTrue(changed["start_time"].startswith("2026-12-17 "))
        self.assertEqual(db.query("SELECT status FROM pending_actions WHERE id=?", (proposal["action_id"],))[0]["status"], "approved")
        self.assertEqual(db.query("SELECT COUNT(*) AS n FROM decision_log WHERE pending_action_id=?", (proposal["action_id"],))[0]["n"], 1)

    def test_rejection_never_executes_action(self):
        event = db.query("SELECT id,event_date FROM events WHERE title='Hackathon'")[0]
        proposal = approval.create_proposal("move_event", {"event_id": event["id"], "new_date": "2026-12-17"}, "Move Hackathon")
        result = approval.decide(proposal["action_id"], "reject", "Not approved")
        self.assertFalse(result["executed"])
        self.assertEqual(db.query("SELECT event_date FROM events WHERE id=?", (event["id"],))[0]["event_date"], event["event_date"])
        self.assertEqual(db.query("SELECT decision FROM decision_log WHERE pending_action_id=?", (proposal["action_id"],))[0]["decision"], "rejected")

    def test_duplicate_decision_is_prevented(self):
        event = db.query("SELECT id FROM events WHERE title='Hackathon'")[0]
        proposal = approval.create_proposal("move_event", {"event_id": event["id"], "new_date": "2026-12-17"}, "Move Hackathon")
        approval.decide(proposal["action_id"], "approve")
        with self.assertRaises(approval.ApprovalError):
            approval.decide(proposal["action_id"], "approve")

    def test_stale_move_proposal_is_revalidated_and_blocked(self):
        event = db.query("SELECT id,event_date,venue_id FROM events WHERE title='Hackathon'")[0]
        proposal = approval.create_proposal("move_event", {"event_id": event["id"], "new_date": "2026-12-17"}, "Move Hackathon")
        # Create a new booking after proposal creation to model changed campus data.
        conn = db.get_conn()
        try:
            conn.execute(
                "INSERT INTO events (club_id,venue_id,title,event_date,start_time,status) VALUES (?,?,?,?,?,'scheduled')",
                (1, event["venue_id"], "New competing booking", "2026-12-17", "2026-12-17 12:00"),
            )
            conn.commit()
        finally:
            conn.close()
        with self.assertRaises(approval.ApprovalError):
            approval.decide(proposal["action_id"], "approve")
        self.assertEqual(db.query("SELECT status FROM pending_actions WHERE id=?", (proposal["action_id"],))[0]["status"], "pending")
        self.assertEqual(db.query("SELECT event_date FROM events WHERE id=?", (event["id"],))[0]["event_date"], "2026-12-15")

    def test_conflicting_move_is_rejected_before_proposal_creation(self):
        event = db.query("SELECT id FROM events WHERE title='Hackathon'")[0]
        with self.assertRaises(approval.ApprovalError):
            approval.create_proposal("move_event", {"event_id": event["id"], "new_date": "2026-12-15"}, "Move into existing clash")

    def test_approved_assignment_uses_recommended_eligible_candidates(self):
        replacement = tools.find_replacements("Tech Expo Prep Day", 5)
        self.assertTrue(replacement["result"]["enough"])
        ids = replacement["result"]["suggested_ids"][:2]
        event_id = replacement["result"]["event_id"]
        proposal = approval.create_proposal("assign_volunteers", {"event_id": event_id, "volunteer_ids": ids}, "Assign two replacement volunteers")
        before = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        result = approval.decide(proposal["action_id"], "approve")
        after = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        self.assertTrue(result["executed"])
        self.assertEqual(after, before + 2)


    def test_model_exposed_move_proposal_only_creates_pending_record(self):
        event = db.query("SELECT id,event_date FROM events WHERE title='Hackathon'")[0]
        proposal = execute_tool("propose_event_move", {
            "event_id": "Hackathon", "new_date": "2026-12-17", "reason": "Venue is clear in the simulation"
        })
        self.assertNotIn("error", proposal)
        self.assertEqual(proposal["status"], "pending")
        self.assertFalse(proposal["executed"])
        self.assertEqual(db.query("SELECT event_date FROM events WHERE id=?", (event["id"],))[0]["event_date"], event["event_date"])
        self.assertEqual(approval.get_action(proposal["action_id"])["status"], "pending")

    def test_model_exposed_assignment_proposal_only_creates_pending_record(self):
        recommendation = tools.find_replacements("Tech Expo Prep Day", 2)["result"]
        event_id = recommendation["event_id"]
        volunteer_ids = recommendation["suggested_ids"][:2]
        before = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        proposal = execute_tool("propose_volunteer_assignments", {
            "event_id": "Tech Expo Prep Day", "volunteer_ids": volunteer_ids,
            "reason": "Selected from eligible replacement recommendations"
        })
        self.assertNotIn("error", proposal)
        self.assertFalse(proposal["executed"])
        after = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        self.assertEqual(after, before)

    def test_registered_phase2_tools_match_actual_function_signatures(self):
        expected = {
            "find_clashes": [], "club_health": ["club_id"], "all_club_health": [],
            "match_clubs": [], "simulate_move": ["event_id", "new_date"],
            "find_replacements": ["event_id", "n_needed", "skill"],
            "budget_guard": ["club_id", "proposed_amount", "description"],
            "generate_report": ["inputs"],
        }
        self.assertEqual(set(expected), set(PHASE2_TOOL_MAP))
        for name, parameters in expected.items():
            self.assertEqual(list(inspect.signature(PHASE2_TOOL_MAP[name]).parameters), parameters)

    def test_bad_payload_and_unknown_action_are_rejected(self):
        with self.assertRaises(approval.ApprovalError):
            approval.create_proposal("delete_database", {}, "No")
        with self.assertRaises(approval.ApprovalError):
            approval.create_proposal("move_event", {"event_id": 1, "new_date": "tomorrow", "sql": "DROP"}, "Bad")

    def test_decision_rolls_back_when_assignment_is_invalid(self):
        event_id = db.query("SELECT id FROM events WHERE title='Tech Expo Prep Day'")[0]["id"]
        candidate = tools.find_replacements("Tech Expo Prep Day", 1)["result"]["suggested_ids"][0]
        proposal = approval.create_proposal("assign_volunteers", {"event_id": event_id, "volunteer_ids": [candidate]}, "Try invalid replacement")
        # Force an invalid condition after proposal creation to prove revalidation.
        db.execute("UPDATE volunteers SET available_dates='' WHERE id=?", (candidate,))
        count_before = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        with self.assertRaises(approval.ApprovalError):
            approval.decide(proposal["action_id"], "approve")
        count_after = db.query("SELECT COUNT(*) AS n FROM assignments WHERE event_id=?", (event_id,))[0]["n"]
        status = db.query("SELECT status FROM pending_actions WHERE id=?", (proposal["action_id"],))[0]["status"]
        self.assertEqual(count_after, count_before)
        self.assertEqual(status, "pending")

def tearDownModule():
    _TMP.cleanup()


if __name__ == "__main__":
    unittest.main(verbosity=2)
