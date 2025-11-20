FROM gcr.io/distroless/static:nonroot
ARG BINARY
COPY dist/${BINARY} /dot
EXPOSE 1976
USER nonroot
ENTRYPOINT ["/dot"]