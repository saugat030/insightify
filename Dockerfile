# syntax=docker/dockerfile:1
# 3 levels build

# install once cached on package files alone 
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# produce .next/standalone
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next build imports every route so module-level env assertions run here dummy values to next doesnot crash out in build time
ENV JWT_SECRET=build-only-placeholder
ENV JWT_REFRESH_SECRET=build-only-placeholder
ENV GOOGLE_GEMINI_API_KEY=build-only-placeholder
ENV NEXT_TELEMETRY_DISABLED=1
ARG BUILD_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$BUILD_GOOGLE_CLIENT_ID
RUN npm run build

# standalone output
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# server.js plus only the node_modules the traced build actually needs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
