"""Offline tests for Responses API tool selection and multi-step orchestration."""
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace as NS

_TMP = tempfile.TemporaryDirectory(prefix="crewsync_agent_test_")
os.environ["CREWSYNC_DB"] = str(Path(_TMP.name) / "agent.db")

import db
import seed
from agent import CrewSyncAgent
from memory import SessionMemory
from tool_registry import execute_tool


def function_call(call_id, name, arguments):
    return NS(type="function_call", call_id=call_id, name=name, arguments=arguments)


def response(text=None, calls=None):
    output = [function_call(*c) for c in (calls or [])]
    return NS(output=output, output_text=text)


class FakeResponses:
    def __init__(self, responses, error=None):
        self.responses = list(responses)
        self.error = error
        self.requests = []

    def create(self, **kwargs):
        self.requests.append(kwargs)
        if self.error:
            raise self.error
        if not self.responses:
            raise AssertionError("No mocked response remains")
        return self.responses.pop(0)


class FakeClient:
    def __init__(self, responses, error=None):
        self.responses = FakeResponses(responses, error=error)


class AgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.DB_PATH = str(Path(_TMP.name) / "agent.db")
        seed.reset_demo_data()

    def test_single_tool_call_and_grounded_followup(self):
        fake = FakeClient([
            response(calls=[("c1", "club_health", '{"club_id":"Literary"}')]),
            response("Literary Club's health score is 49/100. Its weak indicators need attention."),
        ])
        agent = CrewSyncAgent(client=fake)
        result = agent.chat("How is Literary Club doing?", "single")
        self.assertTrue(result["ok"])
        self.assertEqual(result["tool_calls"], 1)
        self.assertEqual(result["tool_call_details"][0]["name"], "club_health")
        self.assertIn("49/100", result["message"])
        self.assertEqual(len(fake.responses.requests), 2)
        self.assertEqual(fake.responses.requests[0]["input"][0]["role"], "developer")
        tool_output = fake.responses.requests[1]["input"][-1]
        self.assertEqual(tool_output["type"], "function_call_output")
        self.assertIn("Literary Club", tool_output["output"])

    def test_multi_tool_sequential_orchestration(self):
        fake = FakeClient([
            response(calls=[("c1", "club_health", '{"club_id":"Literary"}')]),
            response(calls=[("c2", "match_clubs", "{}")]),
            response("The Literary Club should partner with Music Club for a joint open-mic."),
        ])
        agent = CrewSyncAgent(client=fake)
        result = agent.chat("Suggest a revival plan for Literary Club", "multi")
        self.assertEqual(result["tool_calls"], 2)
        self.assertEqual([x["name"] for x in result["tool_call_details"]], ["club_health", "match_clubs"])
        self.assertIn("open-mic", result["message"])

    def test_invalid_and_unknown_tool_calls_are_safe(self):
        self.assertIn("error", execute_tool("delete_everything", {}))
        self.assertIn("error", execute_tool("club_health", {"club_id": "Literary", "drop_table": True}))
        fake = FakeClient([
            response(calls=[("c1", "not_registered", "{}")]),
            response("That operation is not available in the registered tool set."),
        ])
        result = CrewSyncAgent(client=fake).chat("Run an unknown operation", "unknown")
        self.assertTrue(result["ok"])
        self.assertEqual(result["tool_calls"], 1)
        self.assertFalse(result["tool_call_details"][0]["ok"])

    def test_invalid_tool_json_does_not_crash_agent(self):
        fake = FakeClient([
            response(calls=[("c1", "club_health", "{not json")]),
            response("I couldn't run the lookup because the tool arguments were invalid."),
        ])
        result = CrewSyncAgent(client=fake).chat("Check club health", "bad-json")
        self.assertTrue(result["ok"])
        self.assertFalse(result["tool_call_details"][0]["ok"])

    def test_api_error_is_reported(self):
        result = CrewSyncAgent(client=FakeClient([], error=RuntimeError("offline"))).chat("Hello", "api-error")
        self.assertFalse(result["ok"])
        self.assertIn("offline", result["message"])

    def test_tool_call_limit(self):
        fake = FakeClient([
            response(calls=[("c1", "all_club_health", "{}")]),
            response(calls=[("c2", "match_clubs", "{}")]),
            response("Stopped at the configured limit; the findings are partial."),
        ])
        result = CrewSyncAgent(client=fake, max_tool_calls=1).chat("Analyse all clubs and match clubs", "limit")
        self.assertEqual(result["tool_calls"], 1)
        self.assertTrue(result["limit_reached"])
        self.assertIn("partial", result["message"])
        self.assertEqual(fake.responses.requests[-1]["tool_choice"], "none")

    def test_session_memory_is_retained_and_separate(self):
        fake = FakeClient([response("There are six clubs."), response("Yes, six clubs.")])
        agent = CrewSyncAgent(client=fake, memory=SessionMemory(max_messages=10))
        agent.chat("How many clubs?", "a")
        agent.chat("How many did you say?", "a")
        self.assertIn("There are six clubs.", [m["content"] for m in agent.memory.get("a")])
        self.assertEqual(agent.memory.get("b"), [])
        agent.reset_session("a")
        self.assertEqual(agent.memory.get("a"), [])

def tearDownModule():
    _TMP.cleanup()


if __name__ == "__main__":
    unittest.main(verbosity=2)
