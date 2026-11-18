FROM node:22-alpine
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY core ./core
COPY server ./server
EXPOSE 8787
CMD ["npm", "start"]
