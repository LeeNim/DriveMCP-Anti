# Drive MCP Server for Antigravity

This is a custom Google Drive Model Context Protocol (MCP) server for Antigravity, built in TypeScript.

It allows Antigravity agents to list and read files directly from your Google Drive.

## Tools Available
1. `drive_list_files(query, maxResults)`: Search for items in your Drive.
2. `drive_read_file(fileId)`: Read document content directly as text.

## Setup Instructions

1. Obtain OAuth 2.0 Credentials:
   - Go to the Google Cloud Console.
   - Enable the Google Drive API.
   - Create OAuth 2.0 Client IDs (Desktop app).

2. Set up your Antigravity MCP config:
   Update your `mcp.json` file inside `~/.gemini/mcp.json` to include:
   ```json
   "drivemcp": {
     "command": "node",
     "args": ["<Path_to_Repo>/build/index.js"],
     "env": {
       "GOOGLE_CLIENT_ID": "<Your Client ID>",
       "GOOGLE_CLIENT_SECRET": "<Your Client Secret>"
     }
   }
   ```
   
3. **Usage**:
   On the first run, the MCP Server will prompt for authorization in the Terminal via `stderr`. It will print an Authorization URL. Open it and sign in to Google to grant access. A local server at port `3000` will handle the redirect. Tokens are securely stored under `%APPDATA%\auto-drive-mcp` or `~/.auto-drive-mcp`.

## Why this Server?
I chose to build a Google Drive MCP Server because managing files is a core necessity for AI assistants. Antigravity currently lacks native, officially documented Drive support. By adding it, Antigravity becomes highly capable of ingesting large volumes of user knowledge dynamically from Google Drive.
