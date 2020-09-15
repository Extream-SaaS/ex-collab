/* CONFIGURATION */
require('dotenv').config();

const { OpenVidu, OpenViduRole } = require('openvidu-node-client');

// Node imports
const axios = require('axios');
const express = require('express');
const cors = require('cors')
const session = require('express-session');
const http = require('http');
const bodyParser = require('body-parser'); // Pull information from HTML POST (express4)
const app = express(); // Create our app with express


// Server configuration
app.use(cors());
app.use(session({
    saveUninitialized: true,
    resave: false,
    secret: '9S7zsvH6YTXhCLNYtXkKQUZus63dWhMQ'
}));
if (process.env.NODE_ENV === 'development') {
    // app.use(express.static(__dirname + '/public')); // Set the demo location if dev mode
}
app.use(bodyParser.urlencoded({
    'extended': 'true'
})); // Parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // Parse application/json
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
})); // Parse application/vnd.api+json as json

// Listen (start app with node server.js)
http.createServer(app).listen(process.env.SERVER_PORT);

// Environment variable: URL where our OpenVidu server is listening
const OPENVIDU_URL = process.env.OPENVIDU_URL;
// Environment variable: secret shared with our OpenVidu server
const OPENVIDU_SECRET = process.env.OPENVIDU_SECRET;
// EXAUTH microservices URL
const exauthURL = process.env.EXAUTH;

// Entrypoint to OpenVidu Node Client SDK
const OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

// Collection to pair session names with OpenVidu Session objects
const mapSessions = {};
// Collection to pair session names with tokens
const mapSessionNamesTokens = {};

console.log(`App listening on http://localhost:${process.env.SERVER_PORT}`);

/* CONFIGURATION */



/* REST API */

app.get('/auth/verify/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const resp = await verifyUser(token);
        req.session.loggedUser = resp.id;
        res.send(resp);
    } catch (err) {
        res.send(err);
    }
});

// Get token (add new user to session)
app.post('/sessions/token', function (req, res) {
    if (!isLogged(req.session)) {
        req.session.destroy();
        res.status(401).send('User not logged');
    } else {
        // The video-call to connect
        const sessionName = req.body.sessionName;

        // Role associated to this user
        console.log('session', req.session);
        const role = req.session.loggedUser;
        console.log(role);

        // Optional data to be passed to other users when this user connects to the video-call
        // In this case, a JSON with the value we stored in the req.session object on login
        const serverData = JSON.stringify({ serverData: req.session.loggedUser });

        console.log(`Getting a token`, `{sessionName}={${sessionName}}`);

        // Build tokenOptions object with the serverData and the role
        const tokenOptions = {
            data: serverData,
            role: role
        };

        if (mapSessions[sessionName]) {
            // Session already exists
            console.log('Existing session', sessionName);

            // Get the existing Session from the collection
            const mySession = mapSessions[sessionName];

            // Generate a new token asynchronously with the recently created tokenOptions
            mySession.generateToken(tokenOptions)
                .then(token => {

                    // Store the new token in the collection of tokens
                    mapSessionNamesTokens[sessionName].push(token);

                    // Return the token to the client
                    res.status(200).send({
                        0: token
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        } else {
            // New session
            console.log('New session', sessionName);

            // Create a new OpenVidu Session asynchronously
            OV.createSession()
                .then(session => {
                    // Store the new Session in the collection of Sessions
                    mapSessions[sessionName] = session;
                    // Store a new empty array in the collection of tokens
                    mapSessionNamesTokens[sessionName] = [];

                    // Generate a new token asynchronously with the recently created tokenOptions
                    session.generateToken(tokenOptions)
                        .then(token => {

                            // Store the new token in the collection of tokens
                            mapSessionNamesTokens[sessionName].push(token);

                            // Return the Token to the client
                            res.status(200).send({
                                0: token
                            });
                        })
                        .catch(error => {
                            console.error(error);
                        });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }
});

// Remove user from session
app.post('/sessions/remove-user', function (req, res) {
    if (!isLogged(req.session)) {
        req.session.destroy();
        res.status(401).send('User not logged');
    } else {
        // Retrieve params from POST body
        const sessionName = req.body.sessionName;
        const token = req.body.token;
        console.log('Removing user | {sessionName, token}={' + sessionName + ', ' + token + '}');

        // If the session exists
        if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
            const tokens = mapSessionNamesTokens[sessionName];
            const index = tokens.indexOf(token);

            // If the token exists
            if (index !== -1) {
                // Token removed
                tokens.splice(index, 1);
                console.log(sessionName + ': ' + tokens.toString());
            } else {
                const msg = 'Problems in the app server: the TOKEN wasn\'t valid';
                console.log(msg);
                res.status(500).send(msg);
            }
            if (tokens.length == 0) {
                // Last user left: session must be removed
                console.log(sessionName + ' empty!');
                delete mapSessions[sessionName];
            }
            res.status(200).send();
        } else {
            const msg = 'Problems in the app server: the SESSION does not exist';
            console.log(msg);
            res.status(500).send(msg);
        }
    }
});

/* REST API */



/* AUXILIARY METHODS */

const verifyUser = async (token) => {
    const config = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    const resp = await axios.get(`${exauthURL}/auth/user`, config);
    if (resp.status !== 200) {
        throw new Error('not logged in');
    }
    return resp.data;
};
function isLogged(session) {
    return (session.loggedUser !== null);
}
