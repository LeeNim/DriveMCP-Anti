# Drive MCP Server for Antigravity

This is a custom Google Drive Model Context Protocol (MCP) server for Antigravity, built in TypeScript.

It allows Antigravity agents to list and read files directly from your Google Drive.

## Tools Available
1. `drive_list_files(query, maxResults)`: Search for items in your Drive.
2. `drive_read_file(fileId)`: Read document content directly as text.

## Setup Instructions

1. Obtain OAuth 2.0 Credentials:
   - Go to the Google Cloud Console.
   - **CRITICAL**: Go to **APIs & Services > Library** and search for **Google Drive API**. Click **ENABLE**.
   - Create OAuth 2.0 Client IDs (Desktop app or Web app with redirect URI `http://localhost:8080`).

2. Set up your Antigravity MCP config:
   Update your `mcp.json` file to include this server.
   
   **Where is the `mcp.json` file?**
   - **Windows:** `C:\Users\<YourUsername>\.gemini\mcp.json`
     *(Note: `.gemini` might be a hidden folder. You can open File Explorer, type `%USERPROFILE%\.gemini` in the path bar, and press Enter to access it directly).*
   - **macOS/Linux:** `~/.gemini/mcp.json`

   ### Option A: Running via Docker (Recommended)
   First, build the Docker image locally:
   ```bash
   docker build -t drivemcp-server .
   ```
   Then, add this configuration into the `mcpServers` section of your `mcp.json`:
   ```json
   "drivemcp": {
     "command": "docker",
     "args": [
       "run",
       "-i",
       "--rm",
       "-v",
       "drive-mcp-data:/root/.auto-drive-mcp",
       "-e", "GOOGLE_CLIENT_ID=<Your Client ID>",
       "-e", "GOOGLE_CLIENT_SECRET=<Your Client Secret>",
       "drivemcp-server"
     ]
   }
   ```
   *(Note: This creates a persistent Docker volume `drive-mcp-data` so your Google token is saved across restarts.)*

   ### Option B: Running locally via Node.js
   Ensure you run `npm install` and `npm run build` in this directory first.
   Add the following configuration into the `mcpServers` section of your `mcp.json`:
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
   
3. **Usage & Authentication**:
   On the first run, the MCP Server will require authorization.
   - Look in your Antigravity MCP logs for a URL starting with `https://accounts.google.com/...`
   - Open that URL in your browser.
   - **Important**: If the server redirects to a white page that keeps spinning on `localhost:8080`, simply change `localhost` in your address bar to `127.0.0.1` and press Enter. (This is a common IPv6/IPv4 DNS issue on Windows).
   - Once authorized, the local server at port `8080` will intercept it, save the token, and the MCP Server will start responding!

## Why this Server?
I chose to build a Google Drive MCP Server because managing files is a core necessity for AI assistants. Antigravity currently lacks native, officially documented Drive support. By adding it, Antigravity becomes highly capable of ingesting large volumes of user knowledge dynamically from Google Drive.
