FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        python3 \
    && curl -sSL https://sdk.cloud.google.com | bash \
    && ln -s /root/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backup.sh /app/backup.sh

RUN chmod +x /app/backup.sh

ENTRYPOINT ["/app/backup.sh"]
