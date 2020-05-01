FROM node:10-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY config ./
COPY contracts ./
COPY migrations ./
COPY src ./
COPY test ./

RUN apk add -t .gyp git python g++ make

RUN npm install -g truffle@nodeLTS
RUN apk del .gyp
COPY truffle.js ./
RUN apk add git
#RUN npm install @truffle/hdwallet-provider
#RUN npm install
#USER node
#ENTRYPOINT ["truffle"]
#RUN truffle compile
#RUN truffle migrate
COPY build ./
RUN npm install
CMD ["npm", "run", "dapp"]
#
#COPY --chown=node:node . .
#
#EXPOSE 8080
#
#CMD [ "node", "app.js" ]