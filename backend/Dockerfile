FROM node:18-alpine

# Install build dependencies for native node-modules (like isolated-vm)
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "dev"]
