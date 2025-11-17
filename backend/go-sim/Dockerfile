FROM golang:1.21-alpine as builder
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags='-s -w' -o /out/go-sim ./

FROM alpine:3.18
COPY --from=builder /out/go-sim /usr/local/bin/go-sim
EXPOSE 9090
CMD ["/usr/local/bin/go-sim"]
