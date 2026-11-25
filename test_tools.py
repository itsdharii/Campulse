"""Integration tests use a temporary SQLite DB; original demo DB is not touched."""
import os, tempfile, unittest
from pathlib import Path
_TMP=tempfile.TemporaryDirectory(prefix="crewsync_test_")
os.environ["CREWSYNC_DB"]=str(Path(_TMP.name)/"test_crewsync.db")
import db, seed, tools

class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed.reset_demo_data()
    def test_seed_checks(self):
        checks=seed.run_checks()
        self.assertTrue(all(ok for _,ok in checks),checks)
    def test_clashes(self):
        r=tools.find_clashes(); self.assertNotIn("error",r,r)
        self.assertGreaterEqual(len(r["result"]["venue_clashes"]),1)
        self.assertGreaterEqual(len(r["result"]["volunteer_double_bookings"]),1)
    def test_club_health(self):
        r=tools.club_health("Literary"); self.assertNotIn("error",r,r)
        self.assertEqual(r["result"]["club"],"Literary Club")
        self.assertEqual(sum(p["points"] for p in r["result"]["parts"]),r["result"]["score"])
    def test_all_health(self):
        r=tools.all_club_health(); self.assertNotIn("error",r,r)
        self.assertEqual(len(r["result"]),6)
        self.assertEqual(r["result"],sorted(r["result"],key=lambda x:x["score"]))
    def test_matchmaking(self):
        r=tools.match_clubs(); self.assertNotIn("error",r,r)
        self.assertIsNotNone(r["result"]["suggested"])
    def test_simulation(self):
        r=tools.simulate_move("Hackathon","2026-12-17"); self.assertNotIn("error",r,r)
        self.assertEqual(r["result"]["new_date"],"2026-12-17")
        self.assertEqual(db.query("SELECT event_date FROM events WHERE title='Hackathon'")[0]["event_date"],"2026-12-15")
    def test_replacements(self):
        r=tools.find_replacements("Tech Expo Prep Day",5); self.assertNotIn("error",r,r)
        self.assertGreaterEqual(r["result"]["candidate_count"],5)
    def test_budget(self):
        r=tools.budget_guard("Coding",10000,"Demo equipment"); self.assertNotIn("error",r,r)
        self.assertTrue(r["result"]["within_budget"])
        self.assertFalse(tools.budget_guard("Coding",9999999)["result"]["within_budget"])
    def test_report(self):
        r=tools.generate_report({"event":"Test","expected_attendance":200,"actual_attendance":150,
            "volunteers":20,"problems":"venue delay and registration shortage","feedback":"mostly positive"})
        self.assertNotIn("error",r,r); self.assertEqual(r["result"]["numbers"]["attendance_percent"],75)
        self.assertTrue(r["result"]["suggestions"])
    def test_invalid_inputs(self):
        self.assertIn("error",tools.club_health("No such club"))
        self.assertIn("error",tools.simulate_move("Hackathon","bad-date"))
        self.assertIn("error",tools.find_replacements("Hackathon",-1))
        self.assertIn("error",tools.budget_guard("Coding",-10))

if __name__=="__main__":
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(IntegrationTests))
    print("\\nPhase 1 + Phase 2 integration:", "PASS" if result.wasSuccessful() else "FAIL")
    raise SystemExit(not result.wasSuccessful())


def tearDownModule():
    _TMP.cleanup()
