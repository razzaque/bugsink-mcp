# Bugsink MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server for interacting with [Bugsink](https://www.bugsink.com/) error tracking via LLMs.

This server enables AI assistants like Claude, Cursor, and other MCP-compatible tools to query and analyze errors from your Bugsink instance.

## Features

- **List Projects** - View all projects in your Bugsink instance
- **List Teams** - View all teams
- **List Issues** - Query grouped error occurrences by project
- **Get Issue Details** - Retrieve detailed issue information
- **List Events** - View individual error occurrences with stacktraces
- **Get Event Details** - Full event data including tags and contexts
- **Test Connection** - Verify API connectivity

## Installation

### Via npx (Recommended)

```bash
npx bugsink-mcp
```

### Global Install

```bash
npm install -g bugsink-mcp
```

### From Source

```bash
git clone https://github.com/j-shelfwood/bugsink-mcp.git
cd bugsink-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BUGSINK_URL` | Yes | Your Bugsink instance URL (e.g., `https://error-tracking.example.com`) |
| `BUGSINK_TOKEN` | Yes | API token for authentication |

### Generating an API Token

```bash
# Via Bugsink management command
bugsink-manage create_auth_token
```

Or through the Bugsink web UI under Settings > API Tokens.

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bugsink": {
      "command": "npx",
      "args": ["bugsink-mcp"],
      "env": {
        "BUGSINK_URL": "https://your-bugsink-instance.com",
        "BUGSINK_TOKEN": "your-api-token"
      }
    }
  }
}
```

### Claude Code CLI

```bash
claude mcp add bugsink -- npx bugsink-mcp
```

Then set environment variables in your shell or `.env` file.

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "bugsink": {
      "command": "npx",
      "args": ["bugsink-mcp"],
      "env": {
        "BUGSINK_URL": "https://your-bugsink-instance.com",
        "BUGSINK_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### `test_connection`
Test connectivity to your Bugsink instance.

### `list_projects`
List all projects in the Bugsink instance.

### `get_project`
Get detailed information about a specific project including DSN.

**Parameters:**
- `project_id` (number, required): The project ID

### `list_teams`
List all teams in the Bugsink instance.

### `list_issues`
List issues for a specific project.

**Parameters:**
- `project_id` (number, required): The project ID
- `status` (string, optional): Filter by status ('unresolved', 'resolved', 'muted')
- `limit` (number, optional): Max results (default: 25)

### `get_issue`
Get detailed information about a specific issue.

**Parameters:**
- `issue_id` (number, required): The issue ID

### `list_events`
List events (individual error occurrences) for a specific issue.

**Parameters:**
- `issue_id` (number, required): The issue ID
- `limit` (number, optional): Max results (default: 10)

### `get_event`
Get detailed event information including full stacktrace.

**Parameters:**
- `event_id` (string, required): The event ID

### `resolve_issue`
Mark an issue resolved.

**Parameters:**
- `issue_id` (string, required): The issue UUID

### `resolve_issue_next_release`
Mark an issue resolved by the **next** release. A recurrence after that release ships reopens
it as a regression, so prefer this over `resolve_issue` when a fix is merged but not yet
deployed.

Requires events to carry a `release` — with no release reported there is no "next" for Bugsink
to compare against, and the resolution behaves like a plain one.

**Parameters:**
- `issue_id` (string, required): The issue UUID

### `mute_issue`
Mute an issue indefinitely. Use for noise that is not a defect — dev/shell tracebacks, expected
third-party failures — rather than `resolve_issue`, which asserts a fix that does not exist.

**Parameters:**
- `issue_id` (string, required): The issue UUID

### `mute_issue_for_period`
Mute an issue for a fixed period, after which it becomes visible again.

**Parameters:**
- `issue_id` (string, required): The issue UUID
- `period_name` (string, required): Period unit, e.g. `day`, `week`, `month`
- `nr_of_periods` (number, required): How many periods (>= 1)

### `mute_issue_until_threshold`
Mute an issue until it recurs at least a threshold number of times within a window — surfaces it
again only if it gets worse.

**Parameters:**
- `issue_id` (string, required): The issue UUID
- `period_name` (string, required): Period unit
- `nr_of_periods` (number, required): Window length in periods (>= 1)
- `gte_threshold` (number, required): Recurrence count that unmutes it

### `unmute_issue`
Unmute a muted issue.

**Parameters:**
- `issue_id` (string, required): The issue UUID

### `reopen_issue`
Reopen a resolved or muted issue — for when a resolution turns out to be wrong.

**Parameters:**
- `issue_id` (string, required): The issue UUID

### `bulk_issue_action`
Apply one action to many issues in a single call — for backlog triage, where one round trip
per issue is not workable.

Continues on error and reports which issues failed and why, grouped by distinct error, rather
than aborting part-way. A partial mutation the caller cannot see the shape of is worse than a
completed one with an explicit list of what did not apply. Requests are sequential, not
parallel: a self-hosted instance should not have to absorb a few hundred concurrent writes.

**Parameters:**
- `issue_ids` (string[], required): Issue UUIDs, 1–500
- `action` (enum, required): `resolve` | `resolve_next` | `mute` | `unmute` | `reopen`

## Example Usage

Once configured, you can ask your AI assistant:

- "List all projects in Bugsink"
- "Show me the latest issues for project 1"
- "What's the stacktrace for issue #42?"
- "Get the details of the most recent error event"

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## API Compatibility

This server is designed for [Bugsink](https://www.bugsink.com/), a self-hosted error tracking platform. Bugsink uses its own REST API (`/api/canonical/0/`) which is different from Sentry's API.

**Note:** This server does NOT work with Sentry or Sentry-hosted services. For Sentry, use the official [sentry-mcp](https://github.com/getsentry/sentry-mcp) server.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/j-shelfwood/bugsink-mcp).
