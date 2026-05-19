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

FROM alpine:3.20 AS geo
# Downloads db-ip Lite country MMDB (CC-BY, no signup). Tries the current
# month first, falls back to the previous month if db-ip hasn't published
# the new release yet (typical first few days of a month).
RUN apk add --no-cache curl ca-certificates coreutils \
 && mkdir -p /geo \
 && THIS_MONTH=$(date -u +%Y-%m) \
 && LAST_MONTH=$(date -u -d "$(date -u +%Y-%m-01) -1 day" +%Y-%m) \
 && (curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-${THIS_MONTH}.mmdb.gz" -o /geo/db.mmdb.gz \
     || curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-${LAST_MONTH}.mmdb.gz" -o /geo/db.mmdb.gz) \
 && gunzip /geo/db.mmdb.gz

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tini \
 && addgroup -S app && adduser -S -G app -u 10001 app \
 && mkdir -p /data /geo && chown app:app /data
COPY --from=geo /geo/db.mmdb /geo/dbip-country-lite.mmdb
RUN chown app:app /geo/dbip-country-lite.mmdb
USER app:app
WORKDIR /data
COPY --from=build /out/redirector /usr/local/bin/redirector
ENV GEOIP_DB=/geo/dbip-country-lite.mmdb
EXPOSE 8080 8081
VOLUME ["/data"]
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/redirector"]
