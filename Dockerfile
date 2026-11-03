# Official Node.js image matching the repository's .node-version.
FROM node:22-bookworm-slim

WORKDIR /workspace

# Use the exact pnpm version declared by the root package.json.
RUN corepack enable \
    && corepack prepare pnpm@12.15.0 --activate \
    && node --version \
    && pnpm --version

CMD ["sh", "-lc", "pnpm install --no-frozen-lockfile && sleep infinity"]
