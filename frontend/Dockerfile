# Etapa 1: Build 
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Inyectamos la URL del backend en tiempo de build
ARG VITE_BACKEND_URL=http://localhost:3001
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Etapa 2: Servir con nginx (imagen ultraligera)
FROM nginx:alpine

# Copiamos el build estático generado por Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración de nginx para SPA (redirigir rutas al index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
