"""Unit tests for bounded session memory."""
import unittest
from memory import SessionMemory

class MemoryTests(unittest.TestCase):
    def test_history_is_bounded(self):
        memory = SessionMemory(3)
        for i in range(5):
            memory.add("s", "user", f"u{i}")
        self.assertEqual([x["content"] for x in memory.get("s")], ["u2", "u3", "u4"])

    def test_sessions_are_isolated(self):
        memory = SessionMemory(5)
        memory.add("one", "user", "hello")
        self.assertEqual(memory.get("two"), [])

    def test_reset_and_role_validation(self):
        memory = SessionMemory(5)
        memory.add("one", "user", "hello")
        memory.reset("one")
        self.assertEqual(memory.get("one"), [])
        with self.assertRaises(ValueError):
            memory.add("one", "tool", "not persisted")

if __name__ == "__main__":
    unittest.main(verbosity=2)
