import { spawn } from "child_process";
import * as path from "path";

const serverPath = path.resolve("./build/index.js");

console.log(`[Client] Starting Drive MCP Server at ${serverPath}...`);
const server = spawn("node", [serverPath], {
    env: {
        ...process.env,
        GOOGLE_CLIENT_ID: "<Your Client ID>",
        GOOGLE_CLIENT_SECRET: "<Your Client Secret>"
    }
});

server.stderr.on("data", (data) => process.stderr.write(data));

server.on("exit", (code) => {
    console.log(`[Client] Server exited with code ${code}`);
});

let msgId = 1;

function request(method: string, params: any = {}) {
    const req = {
        jsonrpc: "2.0",
        id: msgId++,
        method,
        params,
    };
    server.stdin.write(JSON.stringify(req) + "\n");
}

let logs = "";

server.stdout.on("data", (data) => {
    const str = data.toString();
    const parts = str.split("\n").filter(Boolean);

    for (const p of parts) {
        try {
            const resp = JSON.parse(p);
            console.log(`[Client] Received response for id ${resp.id}`);

            if (resp.result?.serverInfo) {
                console.log(`[Client] Server info:`, resp.result.serverInfo);
                console.log(`[Client] Requesting tools list...`);
                request("tools/list");
            } else if (resp.result?.tools) {
                console.log(`[Client] Available tools:`, resp.result.tools.map((t: any) => t.name).join(", "));
                console.log(`[Client] Calling drive_list_files...`);
                request("tools/call", { name: "drive_list_files", arguments: { maxResults: 5 } });
            } else if (resp.result?.content) {
                console.log(`[Client] Tool Response:\n`, resp.result.content[0].text);

                console.log(`[Client] Test successful! Shutting down...`);
                server.kill();
                process.exit(0);
            }
        } catch (e) {
            // Not JSON
        }
    }
});

// Start the handshake
request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" }
});
