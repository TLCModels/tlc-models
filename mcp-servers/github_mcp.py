"""
Task 1.2 -- GitHub Issues MCP Server for Claude Code
=====================================================
A FastMCP server that connects Claude Code directly to the GitHub Issues API.
Allows reading, creating, updating, and closing issues as tasks are completed.

Install dependencies:
    pip install "mcp[cli]" httpx

Add to claude_desktop_config.json:
    {
      "mcpServers": {
        "github": {
          "command": "python",
          "args": ["mcp-servers/github_mcp.py"],
          "env": {
            "GITHUB_TOKEN": "your-github-pat",
            "GITHUB_OWNER": "TLCModels",
            "GITHUB_REPO": "tlc-models"
          }
        }
      }
    }
"""

import os
import json
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Configuration ---
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_OWNER = os.environ.get("GITHUB_OWNER", "TLCModels")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "tlc-models")
BASE_URL = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}"

mcp = FastMCP(
    "github-issues",
    description="GitHub Issues MCP server for TLC Models task tracking",
)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


# ---------- Tools ----------


@mcp.tool()
async def list_issues(
    state: str = "open",
    labels: Optional[str] = None,
    per_page: int = 30,
) -> str:
    """List GitHub issues. Filter by state (open/closed/all) and comma-separated labels."""
    params: dict = {"state": state, "per_page": per_page}
    if labels:
        params["labels"] = labels
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/issues", headers=_headers(), params=params
        )
        resp.raise_for_status()
    issues = resp.json()
    return json.dumps(
        [
            {
                "number": i["number"],
                "title": i["title"],
                "state": i["state"],
                "labels": [l["name"] for l in i["labels"]],
                "assignee": (i.get("assignee") or {}).get("login"),
                "created_at": i["created_at"],
                "url": i["html_url"],
            }
            for i in issues
        ],
        indent=2,
    )


@mcp.tool()
async def get_issue(issue_number: int) -> str:
    """Get full details of a specific issue by number."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/issues/{issue_number}", headers=_headers()
        )
        resp.raise_for_status()
    issue = resp.json()
    return json.dumps(
        {
            "number": issue["number"],
            "title": issue["title"],
            "body": issue["body"],
            "state": issue["state"],
            "labels": [l["name"] for l in issue["labels"]],
            "assignee": (issue.get("assignee") or {}).get("login"),
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
            "url": issue["html_url"],
        },
        indent=2,
    )


@mcp.tool()
async def create_issue(
    title: str,
    body: str = "",
    labels: Optional[list[str]] = None,
) -> str:
    """Create a new GitHub issue with title, body, and optional labels."""
    payload: dict = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/issues", headers=_headers(), json=payload
        )
        resp.raise_for_status()
    issue = resp.json()
    return json.dumps(
        {
            "number": issue["number"],
            "title": issue["title"],
            "url": issue["html_url"],
            "message": f"Issue #{issue['number']} created successfully.",
        },
        indent=2,
    )


@mcp.tool()
async def update_issue(
    issue_number: int,
    title: Optional[str] = None,
    body: Optional[str] = None,
    state: Optional[str] = None,
    labels: Optional[list[str]] = None,
) -> str:
    """Update an existing issue. Set state to 'closed' to close it."""
    payload: dict = {}
    if title is not None:
        payload["title"] = title
    if body is not None:
        payload["body"] = body
    if state is not None:
        payload["state"] = state
    if labels is not None:
        payload["labels"] = labels
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{BASE_URL}/issues/{issue_number}",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
    issue = resp.json()
    return json.dumps(
        {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "url": issue["html_url"],
            "message": f"Issue #{issue['number']} updated successfully.",
        },
        indent=2,
    )


@mcp.tool()
async def close_issue(issue_number: int, comment: Optional[str] = None) -> str:
    """Close an issue, optionally adding a completion comment."""
    if comment:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{BASE_URL}/issues/{issue_number}/comments",
                headers=_headers(),
                json={"body": comment},
            )
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{BASE_URL}/issues/{issue_number}",
            headers=_headers(),
            json={"state": "closed"},
        )
        resp.raise_for_status()
    return json.dumps(
        {
            "number": issue_number,
            "state": "closed",
            "message": f"Issue #{issue_number} closed successfully.",
        },
        indent=2,
    )


@mcp.tool()
async def add_comment(issue_number: int, body: str) -> str:
    """Add a comment to an existing issue."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/issues/{issue_number}/comments",
            headers=_headers(),
            json={"body": body},
        )
        resp.raise_for_status()
    comment = resp.json()
    return json.dumps(
        {
            "issue_number": issue_number,
            "comment_id": comment["id"],
            "url": comment["html_url"],
            "message": "Comment added successfully.",
        },
        indent=2,
    )


@mcp.tool()
async def list_labels() -> str:
    """List all labels in the repository."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/labels", headers=_headers(), params={"per_page": 100}
        )
        resp.raise_for_status()
    labels = resp.json()
    return json.dumps(
        [{"name": l["name"], "color": l["color"]} for l in labels], indent=2
    )


@mcp.tool()
async def create_label(name: str, color: str = "ededed", description: str = "") -> str:
    """Create a new label in the repository. Color is hex without #."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/labels",
            headers=_headers(),
            json={"name": name, "color": color, "description": description},
        )
        resp.raise_for_status()
    label = resp.json()
    return json.dumps(
        {"name": label["name"], "color": label["color"], "message": "Label created."},
        indent=2,
    )


if __name__ == "__main__":
    mcp.run()
