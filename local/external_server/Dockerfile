FROM node:9

RUN mkdir -p /usr/src/external_server
WORKDIR /usr/src/external_server

COPY package.json /usr/src/external_server/
RUN npm install
COPY . /usr/src/external_server

# replace this with your application's default port
EXPOSE 3002

CMD [ "npm", "start"]