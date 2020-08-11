'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const {OAuth2Client} = require('google-auth-library');
const path = require('path');
const process = require('process'); // Required for mocking environment variables

const {Create} = require('./actions/create');

// By default, the client will authenticate using the service account file
// specified by the GOOGLE_APPLICATION_CREDENTIALS environment variable and use
// the project specified by the GOOGLE_CLOUD_PROJECT environment variable. See
// https://github.com/GoogleCloudPlatform/google-cloud-node/blob/master/docs/authentication.md
// These environment variables are set automatically on Google App Engine
const {PubSub} = require('@google-cloud/pubsub');
const { openStdin } = require('process');

// Instantiate a pubsub client
const authClient = new OAuth2Client();
const pubsub = new PubSub();

const app = express();

const formBodyParser = bodyParser.urlencoded({extended: false});
const jsonBodyParser = bodyParser.json();

const claims = [];
const tokens = [];

// The following environment variables are set by app.yaml when running on GAE,
// but will need to be manually set when running locally.
const {PUBSUB_VERIFICATION_TOKEN} = process.env;
const TOPIC = process.env.PUBSUB_TOPIC;

const topic = pubsub.topic(TOPIC);

app.post('/', formBodyParser, async (req, res, next) => {
  if (!req.body.payload) {
    res.status(400).send('Missing payload');
    return;
  }

  const data = Buffer.from(req.body.payload);
  try {
    const messageId = await topic.publish(data);
    res.status(200).send(`Message ${messageId} sent.`);
  } catch (error) {
    next(error);
  }
});

app.post('/ex-collab/local-push', jsonBodyParser, async (req, res) => {
  // Verify that the request originates from the application.
  if (req.query.token !== PUBSUB_VERIFICATION_TOKEN) {
    res.status(400).send('Invalid request');
    return;
  }

  // The message is a unicode string encoded in base64.
  const message = JSON.stringify(req.body.message.data);

  const payload = JSON.parse(message);
  let resp;
  let status;
  switch (payload.action) {
    case "create":
      try {
        resp = await Create(payload);
        status = 200;
      } catch (error) {
        resp = error.errors || { message: error.message, code: error.name };
        status = error.code || 500;
      }
      break;
  }
  res.status(status).send(resp);
});

app.post('/ex-collab/push', jsonBodyParser, async (req, res) => {
  // Verify that the request originates from the application.
  if (req.query.token !== PUBSUB_VERIFICATION_TOKEN) {
    res.status(400).send('Invalid request');
    return;
  }

  // Verify that the push request originates from Cloud Pub/Sub.
  try {
    // Get the Cloud Pub/Sub-generated JWT in the "Authorization" header.
    const bearer = req.header('Authorization');
    const [, token] = bearer.match(/Bearer (.*)/);
    tokens.push(token);

    // Verify and decode the JWT.
    // Note: For high volume push requests, it would save some network
    // overhead if you verify the tokens offline by decoding them using
    // Google's Public Cert; caching already seen tokens works best when
    // a large volume of messages have prompted a single push server to
    // handle them, in which case they would all share the same token for
    // a limited time window.
    const ticket = await authClient.verifyIdToken({
      idToken: token,
    });

    const claim = ticket.getPayload();
    claims.push(claim);
  } catch (e) {
    res.status(400).send('Invalid token');
    return;
  }

  // The message is a unicode string encoded in base64.
  const message = Buffer.from(req.body.message.data, 'base64').toString(
    'utf-8'
  );

  const payload = JSON.parse(message);
  switch (payload.action) {
    case "create":
      await Create(payload);
      break;
  }

  res.status(200).send();
});

// Start the server
const PORT = process.env.PORT || 8800;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;