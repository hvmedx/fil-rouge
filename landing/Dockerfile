FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="mycontacts-landing" \
      org.opencontainers.image.source="https://github.com/hbenarous/fil-rouge" \
      org.opencontainers.image.description="MyContacts landing page (static)"

ARG BUILD_SHA=dev

RUN rm -rf /usr/share/nginx/html/* \
    && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css main.js /usr/share/nginx/html/
RUN echo "{\"sha\":\"${BUILD_SHA}\"}" > /usr/share/nginx/html/build.json

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
