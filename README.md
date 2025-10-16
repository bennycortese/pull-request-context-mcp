# Pull Request Context MCP Server

An MCP (Model Context Protocol) server that fetches GitHub pull request context for use in AI prompts.

## Features

- Fetch detailed PR information including title, description, author, status, and changes
- Support for multiple PR identifier formats
- Works with or without GitHub authentication (unauthenticated has lower rate limits)

## Installation

```bash
npm install
npm run build
```

## Configuration

Add this server to your Claude Code (or other MCP client) configuration.

### For Claude Code

Edit your Claude Code settings file (usually at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pull-request-context": {
      "command": "node",
      "args": ["C:\\Users\\antho\\benny_stuff\\pull-request-context-mcp\\build\\index.js"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

Note: Replace the path with the actual path to your `build/index.js` file.

### Environment Variables

- `GITHUB_TOKEN` (optional): GitHub personal access token for higher rate limits
  - Without token: 60 requests per hour
  - With token: 5,000 requests per hour
  - Create a token at: https://github.com/settings/tokens

## Usage

Once configured, you can use the `get_pr_context` tool in your prompts:

### Supported PR Identifier Formats

- `owner/repo/pull/123`
- `owner/repo#123`
- `https://github.com/owner/repo/pull/123`

### Example

In Claude Code (or any MCP client), simply ask:

```
Can you review this PR: facebook/react/pull/12345
```

The server will automatically fetch the PR context including:
- PR title and description
- Author information
- Current state (open/closed/merged)
- Branch information
- File change statistics
- Created/updated timestamps

## API

### Tools

#### `get_pr_context`

Fetches detailed context about a GitHub pull request.

**Parameters:**
- `identifier` (string): PR identifier in one of the supported formats

**Returns:**
A formatted text response with complete PR information.

### Resources

#### `pr://help`

Returns help information about using this server.

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch
```

## License

MIT
