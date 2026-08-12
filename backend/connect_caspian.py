"""Create a Caspian channel connection using the official Caspian SDK.

Slack supports either OAuth (recommended for a workspace install) or Socket
Mode with an existing Slack bot. Credentials are read from environment
variables and never printed.
"""

import json
import os

from app.caspian_bridge import load_caspian_environment


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing {name}. Add it to .env and retry.")
    return value


def main() -> None:
    load_caspian_environment()
    from caspian_sdk import CommClient

    client = CommClient()
    mode = os.getenv("CASPIAN_SLACK_MODE", "oauth").casefold()
    if mode == "oauth":
        connection = client.connect_slack(
            slack_client_id=required("SLACK_CLIENT_ID"),
            slack_client_secret=required("SLACK_CLIENT_SECRET"),
            slack_signing_secret=required("SLACK_SIGNING_SECRET"),
        )
    elif mode == "socket":
        connection = client.connect_slack(
            bot_token=required("SLACK_BOT_TOKEN"),
            app_token=required("SLACK_APP_TOKEN"),
        )
    else:
        raise SystemExit("CASPIAN_SLACK_MODE must be oauth or socket")
    print(json.dumps(connection, indent=2))
    if connection.get("authorize_url"):
        print("Open authorize_url in a browser to approve the Slack workspace.")
    client.close()


if __name__ == "__main__":
    main()
