# ex-collab
Extream Collaboration Microservice

## Manager
`set -o allexport`
`cd manager && source .env`
`set +o allexport`
`npm install`
`npm start`
A RESTful API that is triggered via Ex-Gateway events and hosted in App Engine

## Signaling
A RESTful API and Websocket service hosted in App Engine