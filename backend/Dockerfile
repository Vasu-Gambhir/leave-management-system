# Backend Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install system dependencies for potential native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including dev deps for building)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript with increased memory allocation
RUN NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Remove source files after build to reduce image size
RUN rm -rf src tsconfig.json

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Production command
CMD ["npm", "start"]