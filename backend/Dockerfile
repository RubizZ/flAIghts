# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.17.0

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN npm run build

RUN npm prune --production

FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=${PORT}
WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE ${PORT}

CMD ["npm", "start"]
