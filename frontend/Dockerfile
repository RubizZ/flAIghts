# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.18.0

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /usr/src/app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
ARG PORT=80
ENV PORT=${PORT}

RUN printf "server {\n    listen %s;\n    location / {\n        root   /usr/share/nginx/html;\n        index  index.html index.htm;\n        try_files \$uri \$uri/ /index.html;\n    }\n}\n" "$PORT" > /etc/nginx/conf.d/default.conf

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

EXPOSE ${PORT}

CMD ["nginx", "-g", "daemon off;"]
