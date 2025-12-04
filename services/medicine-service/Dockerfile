FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache tini wget
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund
RUN npm install -g ts-node typescript
COPY . .
RUN if [ -f tsconfig.json ]; then npm run build || echo "Build failed, using ts-node"; fi
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD if [ -f "dist/app.js" ]; then \
      node dist/app.js; \
    elif [ -f "dist/server.js" ]; then \
      node dist/server.js; \
    elif [ -f "dist/index.js" ]; then \
      node dist/index.js; \
    elif [ -f "src/app.ts" ]; then \
      npx ts-node src/app.ts; \
    elif [ -f "src/server.ts" ]; then \
      npx ts-node src/server.ts; \
    elif [ -f "src/index.ts" ]; then \
      npx ts-node src/index.ts; \
    else \
      echo "No entry point found" && exit 1; \
    fi
