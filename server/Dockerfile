FROM node:lts-alpine

ENV NODE_ENV=development

COPY . .

RUN yarn install

RUN cd demo && yarn build

CMD [ "yarn", "start" ]