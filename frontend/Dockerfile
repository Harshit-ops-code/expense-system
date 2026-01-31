FROM node:18-alpine as builder

WORKDIR /app

# install deps
COPY frontend/package*.json ./
COPY frontend/ .
RUN npm ci --silent
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
