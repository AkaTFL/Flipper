ARG ENV=production

FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o server .

FROM golang:1.25-alpine AS dev

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

EXPOSE 8080

CMD ["air", "-c", ".air.toml"]

FROM alpine:3.22 AS production

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/server /app/server

EXPOSE 8080

USER app

CMD ["/app/server"]

FROM ${ENV} AS final
