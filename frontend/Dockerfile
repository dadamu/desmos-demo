FROM node:16-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:16-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID=NEXT_PUBLIC_APP_WEB3AUTH_CLIENT_ID yarn build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
# Install bash for entrypoint.sh
RUN apk add --no-cache bash

WORKDIR /app

RUN addgroup --system --gid 1001 demogroup
RUN adduser --system --uid 1001 demouser

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=demouser:demogroup /app/.next/standalone ./
COPY --from=builder --chown=demouser:demogroup /app/.next/static ./.next/static
COPY --from=builder --chown=demouser:demogorup /app/scripts /app/scripts

# Permisions to execute script
RUN ["chmod", "+x", "./scripts/entrypoint.sh"]
ENTRYPOINT ["/app/scripts/entrypoint.sh"]

USER demouser

EXPOSE 3000

CMD ["node", "server.js"]