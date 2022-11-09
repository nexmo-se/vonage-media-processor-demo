// require("dotenv").config();

// const PORT = process.env.PORT;
// const PROJECT_API_KEY = process.env.PROJECT_API_KEY;
// const PROJECT_API_SECRET = process.env.PROJECT_API_SECRET;

// const atob = require('atob');
// const jwt = require('jsonwebtoken');
// const bodyParser = require('body-parser');
// const path = require("path");
// const express = require("express");
// const app = express(); // create express app

// app.use(express.static(path.join(__dirname, "..", "build")));
// app.use(express.static("public"));
// app.use(bodyParser.json());

// // TODO: change before deployment
// // const APP_BASE_URL = "https://vids.vonage.com/media-processor-demo";
// const APP_BASE_URL = "https://f0c3-116-87-51-142.ngrok.io";
// let db = {
//   "rooms": []
// };

// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "..", "build", "index.html"));
// });

// app.post("/session", (req, res) => {
//   console.log("/session", req.body);
//   res.json({
//     apiKey: "",
//     sessionId: "",
//     token: ""
//   })
// });

// app.listen(PORT, () => {
//   console.log(`Server started on port ${PORT}`);
// });



require("dotenv").config();

const PORT = process.env.PORT;
const PROJECT_API_KEY = process.env.PROJECT_API_KEY;
const PROJECT_API_SECRET = process.env.PROJECT_API_SECRET;

var express = require('express');
var cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "..", "build")));
app.use(express.static("public"));
// app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------------

var axios = require('axios');
const atob = require('atob');
const jwt = require('jsonwebtoken');
const Util = require('util');
const OpenTok = require("opentok");
const opentok = new OpenTok(PROJECT_API_KEY, PROJECT_API_SECRET);

// TODO: change before deployment
// const APP_BASE_URL = "https://vids.vonage.com/media-processor-demo";
const APP_BASE_URL = "https://c57a-116-87-51-142.ngrok.io";
let db = {
  "rooms": []
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "build", "index.html"));
});

app.post('/init', async (req, res, next) => {
  try {
    let { uid, jwtToken } = req.body;

    if (!jwtToken && !uid) {
      throw({ code: 401, message: "Unauthorized - no credentials given" });
    }

    // If they are using jwtToken, they are the host - we can create the room if it doesn't exist
    // Otherwise, if they are a participant, we will prevent them from creating the room
    let role = jwtToken ? "host" : "participant";
    let roomId;

    if (jwtToken) {
      let jwtPayload = await parseJwt(jwtToken);
      // console.log("jwtPayload : ", JSON.stringify(jwtPayload));

      // Validate token expiry
      if (new Date() >= new Date(jwtPayload.exp * 1000)) {
        throw({ code: 401, message: "Unauthorized - token expired" });
      }

      roomId = jwtPayload.userid;
    } else {
      roomId = uid;
    }
    let roomLink = `${APP_BASE_URL}?uid=${roomId}`;

    let result = await findRoom(roomId, role);
    if (result.code) {
      throw(result);
    }

    let room = result;
    if (!room.sessionId) {
      const generateSessionFunction = Util.promisify(generateSession);
      let sessionId = await generateSessionFunction();
      room = await saveSessionId(roomId, sessionId);
    }

    let token = await generateToken(room.sessionId);
    console.log(`Token created`);

    res.json({
      apiKey: PROJECT_API_KEY,
      sessionId: room.sessionId,
      token, roomLink, roomId
    });

  } catch (error) {
    console.error(error);
    if (!error.code) {
      error.code = 500;
    }
    res.status(error.code).send(error.message);
  }
});

// ------------------------------------------------------------------------

async function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

async function findRoom(roomId, role) {
  if (!db.rooms.hasOwnProperty(roomId)){
    if (role === "participant") {
      return { code: 404, message: "Room doesn't exist" };
    }

    let ts = new Date();
    let hours = 24;
    db.rooms[roomId] = {
      sessionId: "",
      createdAt: ts.toISOString()
    };
  }

  return db.rooms[roomId];
}

function generateSession(callback) {
  opentok.createSession({ mediaMode: "routed" }, (err, session) => {
    if (err) {
      console.error(err);
      return callback(err);
    }

    console.log(`Session created`);
    callback(null, session.sessionId);
  });
}

async function saveSessionId(roomId, sessionId) {
  db.rooms[roomId].sessionId = sessionId;

  return db.rooms[roomId];
}

async function generateToken(sessionId) {
  return opentok.generateToken(sessionId);
}

// ------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});