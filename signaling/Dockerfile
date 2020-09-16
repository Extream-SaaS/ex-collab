FROM node:lts-alpine

ENV NODE_ENV=development

COPY . .

RUN yarn install

CMD [ "yarn", "start" ]