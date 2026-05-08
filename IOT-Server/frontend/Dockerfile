FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.25-alpine
# Generar certificado autofirmado para desarrollo (TLS en localhost)
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
           -keyout /etc/nginx/certs/server.key \
           -out    /etc/nginx/certs/server.crt \
           -subj "/C=MX/ST=Dev/L=Dev/O=IoT-Dev/CN=localhost" \
           -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    && chmod 600 /etc/nginx/certs/server.key
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /var/www/html/
EXPOSE 3000
ENTRYPOINT ["nginx", "-g", "daemon off;"]
