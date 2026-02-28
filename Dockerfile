FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Make sure the app data directory exists for token storage
RUN mkdir -p /root/.auto-drive-mcp

# Start the MCP server via stdio
ENTRYPOINT ["node", "build/index.js"]
