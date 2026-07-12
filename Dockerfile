FROM node:18-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY server.js ./
CMD node server.js
