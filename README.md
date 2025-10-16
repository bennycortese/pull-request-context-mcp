# Pull Request Context MCP Server

An MCP (Model Context Protocol) server that fetches GitHub pull request context for use in AI prompts.

Just paste `facebook/react/pull/12345` in your prompt and get full PR context automatically.

## Quick Setup (Easiest!)

### Option 1: Smithery (Recommended)

Install with one command:

```bash
npx @smithery/cli install pull-request-context-mcp --client claude
```

That's it! Restart Claude and you're ready to go.

### Option 2: npx (No Installation)

Add this to your Claude config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pull-request-context": {
      "command": "npx",
      "args": ["-y", "pull-request-context-mcp"]
    }
  }
}
```

Restart Claude and done!

### Option 3: Local Development

```bash
git clone https://github.com/yourusername/pull-request-context-mcp.git
cd pull-request-context-mcp
npm install
npm run build
```

Then add to Claude config:

```json
{
  "mcpServers": {
    "pull-request-context": {
      "command": "node",
      "args": ["/absolute/path/to/pull-request-context-mcp/build/index.js"]
    }
  }
}
```

## Optional: Add GitHub Token

For higher rate limits (5000/hr vs 60/hr), add your token to the config:

```json
{
  "mcpServers": {
    "pull-request-context": {
      "command": "npx",
      "args": ["-y", "pull-request-context-mcp"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

Create a token at: https://github.com/settings/tokens (no scopes needed for public repos)

## Usage

Once configured, just reference PRs in your prompts:

```
Review this PR: bennycortese/integration-hub-v0/pull/54
```

```
What changed in facebook/react#12345?
```

```
Summarize https://github.com/microsoft/vscode/pull/98765
```

### Supported Formats

- `owner/repo/pull/123`
- `owner/repo#123`
- `https://github.com/owner/repo/pull/123`

### What You Get

- PR title and description
- Author and status (open/closed/merged)
- Branch information
- File change stats (+additions, -deletions)
- Timestamps

All formatted in XML tags for easy parsing in prompts.

## Publishing

### To npm

```bash
npm run build
npm publish
```

### To Smithery

1. Push to GitHub
2. Visit https://smithery.ai/submit
3. Submit your repository URL
4. Users can install with: `npx @smithery/cli install pull-request-context-mcp --client claude`

## Development

```bash
npm install
npm run build        # Build once
npm run watch        # Watch mode
```

## License

MIT
