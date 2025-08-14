# ---------- Base image ----------
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
# Ensure reproducible installs
ENV npm_config_fund=false \
    npm_config_audit=false

# ---------- Builder (installs dev deps + builds) ----------
FROM node:22-alpine AS builder
WORKDIR /app

# System deps only for build (node-gyp, etc.)
RUN apk add --no-cache python3 make g++ git

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
# If you use TypeScript, this should produce /app/dist
# Otherwise, ensure your build step outputs to dist or skip this line
RUN npm run build

# If your build needs to carry static/templates into dist, do it here:
# (uncomment if applicable)
# RUN cp -r src/views dist/ 2>/dev/null || true
# RUN cp -r public dist/ 2>/dev/null || true

# ---------- Production image (only runtime files) ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Copy only the files needed at runtime
COPY --chown=app:app package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy the built app and any runtime assets
COPY --from=builder --chown=app:app /app/dist ./dist
# If you kept static/templates outside of dist, copy them too:
# COPY --from=builder --chown=app:app /app/public ./public
# COPY --from=builder --chown=app:app /app/src/views ./views

# Set the port (change if your app uses a different one)
ENV PORT=8000
EXPOSE 8000

# Optional: lightweight healthcheck (change path to match your app)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  # CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

# If your start script runs "node dist/index.js", keep npm start.
# Otherwise, you can do: CMD ["node", "dist/index.js"]
CMD ["npm", "start"]
