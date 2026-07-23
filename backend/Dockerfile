# Node.js 22 LTS Alpine base image
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript build if needed)
RUN npm ci

# Copy source code
COPY src ./src

# Production Stage
FROM node:22-alpine AS runner


WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and installed modules
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# Start Express server via tsx
CMD ["npm", "run", "start"]
