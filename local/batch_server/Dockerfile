FROM node:9

RUN mkdir -p /usr/src/batch_server
WORKDIR /usr/src/batch_server

COPY package.json /usr/src/batch_server/
RUN npm install
COPY . /usr/src/batch_server

# replace this with your application's default port
EXPOSE 3001

CMD ["npm", "start"]