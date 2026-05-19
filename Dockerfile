FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/redirector .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tini \
 && addgroup -S app && adduser -S -G app -u 10001 app \
 && mkdir -p /data && chown app:app /data
USER app:app
WORKDIR /data
COPY --from=build /out/redirector /usr/local/bin/redirector
EXPOSE 8080 8081
VOLUME ["/data"]
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/redirector"]
