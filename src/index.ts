#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  merged: boolean;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  changed_files: number;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PullRequest> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "pull-request-context-mcp",
  };

  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

async function fetchPRDiff(
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  const response = await fetch(
    `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${prNumber}.diff`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PR diff: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

function parsePRIdentifier(identifier: string): {
  owner: string;
  repo: string;
  prNumber: number;
} | null {
  // Support formats:
  // - owner/repo/pull/123
  // - owner/repo#123
  // - https://github.com/owner/repo/pull/123

  // Remove https://github.com/ if present
  let cleaned = identifier.replace(/^https?:\/\/github\.com\//, "");

  // Match owner/repo/pull/123 or owner/repo/pulls/123
  let match = cleaned.match(/^([^\/]+)\/([^\/]+)\/pulls?\/(\d+)$/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  // Match owner/repo#123
  match = cleaned.match(/^([^\/]+)\/([^#]+)#(\d+)$/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
    };
  }

  return null;
}

function formatPRContext(pr: PullRequest, diff?: string): string {
  let output = `<title> ${pr.title} </title>
<pull_request>${pr.number} - ${pr.state}${pr.merged ? " (merged)" : ""}</pull_request>
<author> ${pr.user.login} </author>
<url> ${pr.html_url} </url>

<branch> \`${pr.head.ref}\` → \`${pr.base.ref}\` </branch>
<created> ${new Date(pr.created_at).toLocaleString()} </created>
<updated> ${new Date(pr.updated_at).toLocaleString()} </updated>

<changes> +${pr.additions} -${pr.deletions} across ${pr.changed_files} file(s) </changes>

<description>
${pr.body || "*No description provided*"}
</description>`;

  if (diff) {
    output += `

<diff>
${diff && diff.length > 2000 
  ? diff.slice(0, 2000) + "\n...[truncated, see original for more]..." 
  : diff}
</diff>`;
  }

  return output;
}

// Export default function for Smithery
export default function createServer() {
  const server = new Server(
    {
      name: "pull-request-context-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "pr://help",
          name: "Pull Request Help",
          description: "Information on how to use this MCP server",
          mimeType: "text/plain",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "pr://help") {
      return {
        contents: [
          {
            uri: "pr://help",
            mimeType: "text/plain",
            text: `Pull Request Context MCP Server

This server provides tools to fetch GitHub pull request information.

Usage:
1. Use the 'get_pr_context' tool with a PR identifier
2. Supported formats:
   - owner/repo/pull/123
   - owner/repo#123
   - https://github.com/owner/repo/pull/123

Example: get_pr_context with identifier "facebook/react/pull/12345"

Environment Variables:
- GITHUB_TOKEN: Optional GitHub personal access token for higher rate limits
`,
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_pr_context",
          description:
            "Fetch detailed context about a GitHub pull request. Accepts PR identifiers in formats like 'owner/repo/pull/123', 'owner/repo#123', or full GitHub URLs.",
          inputSchema: {
            type: "object",
            properties: {
              identifier: {
                type: "string",
                description:
                  "PR identifier (e.g., 'facebook/react/pull/12345' or 'facebook/react#12345')",
              },
              include_diff: {
                type: "boolean",
                description:
                  "Whether to include the full diff content in the response (default: true)",
              },
            },
            required: ["identifier"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_pr_context") {
      const identifier = request.params.arguments?.identifier;
      const includeDiff = request.params.arguments?.include_diff ?? true;

      if (typeof identifier !== "string") {
        throw new Error("identifier must be a string");
      }

      const parsed = parsePRIdentifier(identifier);
      if (!parsed) {
        throw new Error(
          `Invalid PR identifier format: ${identifier}. Use formats like 'owner/repo/pull/123' or 'owner/repo#123'`
        );
      }

      try {
        const pr = await fetchPullRequest(
          parsed.owner,
          parsed.repo,
          parsed.prNumber
        );

        let diff: string | undefined;
        if (includeDiff) {
          diff = await fetchPRDiff(parsed.owner, parsed.repo, parsed.prNumber);
        }

        const formattedContext = formatPRContext(pr, diff);

        return {
          content: [
            {
              type: "text",
              text: formattedContext,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch PR: ${errorMessage}`);
      }
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}

// If running directly (not through Smithery), use stdio transport
async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Pull Request Context MCP Server running on stdio");
}

// Run the MCP server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
