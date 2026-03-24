FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
ENV NODE_ENV=production
LABEL docker-monitor.exclude=true
COPY package.json ./
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
