FROM rust:1.77 as builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /usr/src/app/target/release/ameba_earth_sim /usr/local/bin/ameba_earth_sim
EXPOSE 4001
CMD ["/usr/local/bin/ameba_earth_sim"]
