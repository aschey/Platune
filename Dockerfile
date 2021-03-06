FROM ghcr.io/aschey/platune/gstreamer-rust:20.04-1.50.0

COPY . .
RUN rustup component add rustfmt
RUN cargo build --release
CMD ["cargo", "test"]