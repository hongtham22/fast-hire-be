FROM node:18.20.7-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install -g @nestjs/cli && npm install

# Copy app source
COPY . .

# Ensure hot reload works
RUN apk add --no-cache dumb-init

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["dumb-init", "npm", "run", "start:dev"]
