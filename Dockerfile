FROM node:20
WORKDIR /app

RUN apt-get update && apt-get install -y \
  uuid-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev

COPY package.json ./
RUN npm install --force

COPY . .

CMD ["node", "src/index.js"]
