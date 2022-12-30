import Axios from "axios";
import React from 'react';
import ReactDOM from 'react-dom';
import '@opentok/client';

import App from './App';
import './index.css';

import {
  SAMPLE_SERVER_BASE_URL,
} from './config';

function renderApp(credentials, roomDetails) {
  ReactDOM.render(
    <App credentials={credentials} roomDetails={roomDetails} />,
    document.getElementById('root')
  );
}

const queryParams = new URLSearchParams(window.location.search);
const jwtToken = queryParams.get("ref");
const uid = queryParams.get("uid");
console.log({ jwtToken, uid });

const url = SAMPLE_SERVER_BASE_URL + "/init";
console.log({ url });

Axios.post(
  url,
  { jwtToken, uid }
)
.then((result) => {
  console.log("/init result", result);
  if (result.status === 200) {
    let credentials = {
      apiKey: result.data ? result.data.apiKey : "",
      sessionId: result.data ? result.data.sessionId : "",
      token: result.data ? result.data.token : ""
    };
    let roomDetails = {
      roomLink: result.data ? result.data.roomLink : "",
      roomId: result.data ? result.data.roomId : "",
    };
    renderApp(credentials, roomDetails);
  } else {
    console.error('Failed to /init', result);
    alert('Error: ');
  }
})
.catch((err) => {
  console.log("/init error", err);
  console.error('Failed to get session credentials', err);
  alert('Failed to get opentok sessionId and token. Make sure you have updated the config.js file.');
});