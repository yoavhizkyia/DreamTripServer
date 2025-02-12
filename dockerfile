FROM node:18 as base

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]