FROM gcr.io/distroless/static:nonroot
ARG TARGETPLATFORM
COPY $TARGETPLATFORM/dot /dot
EXPOSE 1976
USER nonroot
ENTRYPOINT ["/dot"]