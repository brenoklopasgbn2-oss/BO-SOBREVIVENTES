FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --registry=https://registry.npmjs.org/
COPY . .
CMD ["npm", "start"]
