FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund --fetch-retries=2 --fetch-timeout=60000 --progress=false

COPY . .

EXPOSE 3011

CMD ["node", "index.js"]
