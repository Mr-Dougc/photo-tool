FROM node:18-slim AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:18-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js ./
EXPOSE 8080
CMD ["node", "server.js"]
