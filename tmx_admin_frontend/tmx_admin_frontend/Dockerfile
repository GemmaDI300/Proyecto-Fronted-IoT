# Etapa 1: Construcción
FROM node:20.11.1-alpine3.19 AS build
WORKDIR /app

# Definir argumentos para las variables de entorno
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" >> .env

# Copiar package.json y yarn.lock
COPY package.json yarn.lock ./

# Instalar dependencias
RUN yarn install

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación
RUN yarn run build

# Etapa 2: Servidor de producción
FROM nginx:1.25.4-alpine3.18

# Copiar la configuración de Nginx
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos generados por Vite
COPY --from=build /app/dist /var/www/html/

# Exponer el puerto
EXPOSE 10003

# Iniciar Nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]
