# ---------- Build stage ----------
FROM public.ecr.aws/docker/library/node:lts-alpine3.22 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM public.ecr.aws/docker/library/node:lts-alpine3.22
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# only the built artifacts + any assets you need
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/views  ./views

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
