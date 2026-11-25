"""Run Crew Sync locally as a terminal demo with human approval commands."""
from __future__ import annotations

import argparse
import os

import approval
import seed
from agent import AgentError, CrewSyncAgent


def main() -> int:
    parser = argparse.ArgumentParser(description="Crew Sync Phase 3 demo")
    parser.add_argument("--session", default="demo", help="Conversation session ID")
    args = parser.parse_args()

    # Safe initialisation: create/seed only when the database has no club rows.
    seed.ensure_demo_data()
    try:
        agent = CrewSyncAgent()
    except AgentError as exc:
        print(f"Configuration error: {exc}")
        return 2

    print("\nCrew Sync — Phase 3 Agent")
    print("Commands: /pending, /approve ID, /reject ID, /reset, /quit")
    print("Demo database only. Pending actions require an explicit approval.\n")

    while True:
        try:
            user_text = input("You > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting Crew Sync.")
            break
        if not user_text:
            continue
        command, _, rest = user_text.partition(" ")
        if command.lower() in {"/quit", "/exit"}:
            break
        if command.lower() == "/reset":
            agent.reset_session(args.session)
            print("Conversation context reset.\n")
            continue
        if command.lower() == "/pending":
            pending = approval.list_pending()
            if not pending:
                print("No pending actions.\n")
            else:
                for item in pending:
                    print(f"[{item['action_id']}] {item['action_type']} — {item['description']} — {item['status']}")
                    print(f"    Payload: {item['payload']}")
                print()
            continue
        if command.lower() in {"/approve", "/reject"}:
            try:
                action_id = int(rest.strip())
                result = approval.decide(action_id, "approve" if command.lower() == "/approve" else "reject",
                                         "Reviewed in local Crew Sync CLI")
                print(result, "\n")
            except (ValueError, approval.ApprovalError) as exc:
                print(f"Could not process decision: {exc}\n")
            continue

        result = agent.chat(user_text, session_id=args.session)
        print(f"\nCrew Sync > {result['message']}\n")
        if result.get("tool_call_details"):
            used = ", ".join(item["name"] for item in result["tool_call_details"])
            print(f"[Tools used: {used}; total calls: {result['tool_calls']}]\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
