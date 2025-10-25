# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Build Smithery bundle
RUN npx -y @smithery/cli build -o .smithery/index.cjs

# Runtime stage
FROM node:22-slim

WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/.smithery/index.cjs /app/.smithery/
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build

# Install only production dependencies
RUN npm ci --omit=dev

# Set the entrypoint
ENTRYPOINT ["node", ".smithery/index.cjs"]
