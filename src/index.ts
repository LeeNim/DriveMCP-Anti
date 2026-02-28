import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google, drive_v3 } from "googleapis";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";

// Constants for OAuth
const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
// The user needs to provide a credentials.json or we can fall back to env vars if necessary
const PORT = 3000;

// To store auth
const APP_DATA_DIR = process.platform === "win32"
  ? path.join(process.env.APPDATA || os.tmpdir(), "auto-drive-mcp")
  : path.join(os.homedir(), ".auto-drive-mcp");

const TOKEN_PATH = path.join(APP_DATA_DIR, "token.json");

if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
}

// Drive MCP Server
class DriveMCPServer {
  private server: Server;
  private drive: drive_v3.Drive | null = null;
  private authClient: any = null;

  constructor() {
    this.server = new Server(
      {
        name: "drive-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async authorize(): Promise<void> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.");
    }

    this.authClient = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `http://localhost:${PORT}`
    );

    // Check if token exists
    if (fs.existsSync(TOKEN_PATH)) {
      const tokenStr = fs.readFileSync(TOKEN_PATH, "utf-8");
      this.authClient.setCredentials(JSON.parse(tokenStr));
      this.drive = google.drive({ version: "v3", auth: this.authClient });
      return;
    }

    // Need to authenticate via Web
    return new Promise((resolve, reject) => {
      const authUrl = this.authClient.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });

      console.error("[Drive MCP] Authentication required.");
      console.error(`[Drive MCP] Please open the following URL in your browser:\n\n${authUrl}\n`);

      const httpServer = http.createServer(async (req, res) => {
        try {
          if (req.url?.startsWith("/?code=")) {
            const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
            const code = qs.get("code");

            if (code) {
              const { tokens } = await this.authClient.getToken(code);
              this.authClient.setCredentials(tokens);
              fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
              
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end("<h1>Authentication successful!</h1><p>You can close this tab and return to the terminal.</p>");
              
              this.drive = google.drive({ version: "v3", auth: this.authClient });
              httpServer.close();
              resolve();
            } else {
              res.writeHead(400);
              res.end("Authentication failed: No code found.");
              reject(new Error("No code in callback"));
            }
          }
        } catch (e) {
          res.writeHead(500);
          res.end("Internal Server Error");
          reject(e);
        }
      });

      httpServer.listen(PORT, () => {
        console.error(`[Drive MCP] Local callback server listening on port ${PORT}`);
      });
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "drive_list_files",
            description: "List or search for files in Google Drive. Supports Drive search queries.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Google Drive search query (e.g. \"name contains 'budget'\" or \"mimeType='text/plain'\"). Empty to list recent files.",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of files to return. Default 10.",
                },
              },
            },
          },
          {
            name: "drive_read_file",
            description: "Read the content or metadata of a specific file from Google Drive.",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "The ID of the file to read.",
                },
              },
              required: ["fileId"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.drive) {
        throw new Error("Google Drive API is not initialized. Please authenticate first.");
      }

      const { name, arguments: args } = request.params;

      if (name === "drive_list_files") {
        const query = typeof args?.query === 'string' ? args.query : "";
        const maxResults = typeof args?.maxResults === 'number' ? args.maxResults : 10;

        try {
          const res = await this.drive.files.list({
            q: query,
            pageSize: maxResults,
            fields: "nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(res.data.files, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error listing files: ${error.message}` }],
            isError: true,
          };
        }
      } else if (name === "drive_read_file") {
        const fileId = String(args?.fileId);
        if (!fileId) {
          throw new Error("fileId is required");
        }

        try {
          // Attempt to get metadata first
          const metaRes = await this.drive.files.get({
            fileId: fileId,
            fields: "id, name, mimeType",
          });

          const mimeType = metaRes.data.mimeType || "";
          let content = "";

          // If it's a Google Workspace document, we must export it
          if (mimeType.includes("application/vnd.google-apps.document")) {
            const exportRes = await this.drive.files.export(
              { fileId: fileId, mimeType: "text/plain" },
              { responseType: "text" }
            );
            content = exportRes.data as string;
          } else if (mimeType.startsWith("text/") || mimeType === "application/json") {
            // If it's pure text, we can download it directly
            const downloadRes = await this.drive.files.get(
              { fileId: fileId, alt: "media" },
              { responseType: "text" }
            );
            content = downloadRes.data as string;
          } else {
            content = `[File is of type ${mimeType} and cannot be downloaded as plain text. Use front-end UI instead. Link: https://drive.google.com/open?id=${fileId}]`;
          }

          return {
            content: [
              {
                type: "text",
                text: content,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [{ type: "text", text: `Error reading file: ${error.message}` }],
            isError: true,
          };
        }
      }

      throw new Error(`Tool not found: ${name}`);
    });
  }

  public async run() {
    try {
      // Must read from environment first or start auth flow
      await this.authorize();

      // Once authorized, connect stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("[Drive MCP] Server started and connected via stdio.");
    } catch (e) {
      console.error("[Drive MCP] Failed to start server:", e);
      process.exit(1);
    }
  }
}

const server = new DriveMCPServer();
server.run();
