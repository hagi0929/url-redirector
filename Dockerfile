FROM golang:1.20-alpine AS build

WORKDIR /app

COPY . .

RUN go build -o redirector main.go

FROM alpine:latest

WORKDIR /root/

COPY --from=build /app/redirector .

EXPOSE 8080

CMD ["./redirector"]
