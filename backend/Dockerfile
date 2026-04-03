FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080

CMD ["sh", "-lc", "if [ \"$RAILWAY_SERVICE_NAME\" = \"worker\" ]; then npm run worker; else npm start; fi"]
