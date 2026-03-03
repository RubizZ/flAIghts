# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.17.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV development
WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

EXPOSE 3000 9229

CMD npm run dev
