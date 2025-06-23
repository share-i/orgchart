FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache git && npm install
COPY . .
EXPOSE 8891
CMD ["npm", "start"] 