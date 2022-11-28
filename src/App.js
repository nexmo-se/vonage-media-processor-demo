/*global OT, navigator*/
/*eslint no-undef: ["error"] */

import React from "react";
import axios from "axios";
import "./styles.css";

import initLayoutContainer from 'opentok-layout-js'
import { isSupported, MediapipeHelper } from '@vonage/ml-transformers';
import { MediaProcessor, MediaProcessorConnector } from '@vonage/media-processor';

// import Worker from './worker';
// console.log("Worker", Worker);
// const worker = new window.Worker('src/worker.js');
// console.log("worker", worker);
import worker from "./worker.js";
import WebWorker from "./workerSetup";

const backendUrl = "http://localhost:3000";

const DEFAULT_BRIGHNESS_LEVEL = 1;

const options = {
  maxRatio: 2/3,             // The narrowest ratio that will be used (default 2x3)
  minRatio: 16/9,            // The widest ratio that will be used (default 16x9)
  fixedRatio: true,         // If this is true then the aspect ratio of the video is maintained and minRatio and maxRatio are ignored (default false)
  scaleLastRow: false,        // If there are less elements on the last row then we can scale them up to take up more space
  alignItems: 'center',      // Can be 'start', 'center' or 'end'. Determines where to place items when on a row or column that is not full
  bigClass: "OT_big",        // The class to add to elements that should be sized bigger
  bigPercentage: 0.8,        // The maximum percentage of space the big ones should take up
  minBigPercentage: 0,       // If this is set then it will scale down the big space if there is left over whitespace down to this minimum size
  bigFixedRatio: false,      // fixedRatio for the big ones
  bigScaleLastRow: true,     // scale last row for the big elements
  bigAlignItems: 'center',   // How to align the big items
  smallAlignItems: 'center', // How to align the small row or column of items if there is a big one
  maxWidth: Infinity,        // The maximum width of the elements
  maxHeight: Infinity,       // The maximum height of the elements
  smallMaxWidth: Infinity,   // The maximum width of the small elements
  smallMaxHeight: Infinity,  // The maximum height of the small elements
  bigMaxWidth: Infinity,     // The maximum width of the big elements
  bigMaxHeight: Infinity,    // The maximum height of the big elements
  bigMaxRatio: 3/2,          // The narrowest ratio to use for the big elements (default 2x3)
  bigMinRatio: 9/16,         // The widest ratio to use for the big elements (default 16x9)
  bigFirst: true,            // Whether to place the big one in the top left (true) or bottom right (false).
                             // You can also pass 'column' or 'row' to change whether big is first when you are in a row (bottom) or a column (right) layout
  animate: true,             // Whether you want to animate the transitions using jQuery (not recommended, use CSS transitions instead)
  window: window,            // Lets you pass in your own window object which should be the same window that the element is in
  ignoreClass: 'OT_ignore',  // Elements with this class will be ignored and not positioned. This lets you do things like picture-in-picture
  onLayout: null,            // A function that gets called every time an element is moved or resized, (element, { left, top, width, height }) => {} 
};

// const mediaPipeHelper = new MediapipeHelper();
// const mediaProcessor = new MediaProcessor();
// const transformers = [
//   new MyTransformer(),
// ];
// mediaProcessor.setTransformers(transformers);
// const connector = new MediaProcessorConnector(mediaProcessor);

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      layoutContainer: null,
      layout: null,
      // session info variables
      apiKey: "",
      sessionId: "",
      token: "",
      session: "",
      // face detection variables
      videoInfo: {},
      padding: {
        width: 60,
        height: 80
      }
    };

    this.handleError = this.handleError.bind(this);
    this.checkMediaStreamSupport = this.checkMediaStreamSupport.bind(this);
    this.initUserMedia = this.initUserMedia.bind(this);
    this.initMediaPipeHelper = this.initMediaPipeHelper.bind(this);
    // this.initMediaPipeHelper = this.initMediaPipeHelper.bind(this);
  }

  fetchWebWorker() {
    // this.worker.postMessage("Fetch Users");

    this.worker.addEventListener("message", event => {
      console.log("fetchWebWorker", event)
    });
  };

  componentDidMount() {

    const mediaProcessor = new MediaProcessor();
    console.log("componentDidMount mediaProcessor", mediaProcessor);
    const queryParams = new URLSearchParams(window.location.search);
    const jwtToken = queryParams.get("ref");
    const uid = queryParams.get("uid");
    console.log({ jwtToken, uid });
    
    this.worker = new WebWorker(worker);
    console.log(this.worker);

    if (jwtToken || uid) {
      const layoutContainer = document.getElementById("layoutContainer");
      this.setState({ layoutContainer: layoutContainer });
      this.setState({ layout: initLayoutContainer(layoutContainer, options) }, () => {
        this.state.layout.layout(); console.log(this.state)
      });

      const brightnessLevelSection = document.getElementById('brightnessLevel');
      const brightnessLevelInput = brightnessLevelSection.getElementsByTagName('input')[0];
      brightnessLevelInput.value = DEFAULT_BRIGHNESS_LEVEL;

      if (this.checkMediaStreamSupport()) {
        this.initUserMedia();
        this.initMediaPipeHelper();

        console.log(this.state);

        this.worker.addEventListener('message', ((msg) => {
          console.log("message from worker:", msg);
        }));

        this.worker.postMessage({
          operation: "init",
          metaData: JSON.stringify({appId: '123', sourceType: 'test'}),
          padding: this.state.padding,
          videoInfo: this.state.videoInfo,
          brightnessLevel: DEFAULT_BRIGHNESS_LEVEL
        })
      }

    } else {
      this.handleError("Missing authentication details");
    }
  }

  handleError(error) {
    if (error) {
      alert(error.message ? error.message : error);
    }
  }

  checkMediaStreamSupport() {
    console.log("checkMediaStreamSupport");
    if ( typeof MediaStreamTrackProcessor === 'undefined' ||
         typeof MediaStreamTrackGenerator === 'undefined' ) {
      alert(
          'Your browser does not support the experimental MediaStreamTrack API ' +
          'for Insertable Streams of Media. See the note at the bottom of the ' +
          'page.');
      return false;
    }
    return true;
  }

  initUserMedia() {
    console.log("initUserMedia");
    // Get webcam track
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then((track) => {
      // Set Media Stream 
      const videoTrack = track.getVideoTracks()[0];
      const { width, height, frameRate } = videoTrack.getSettings();
      this.setState({
        videoInfo: { width, height, frameRate }
      });
    });
  }

  initMediaPipeHelper() {
    console.log("initMediaPipeHelper");
    // mediaPipeHelper.initialize({
    //   mediaPipeModelConfigArray: [{modelType: "face_detection", options: {
    //       selfieMode: false,
    //       minDetectionConfidence: 0.5,
    //       model: 'short'
    //     }, 
    //     listener: (results) => {
    //       console.log("initMediaPipeHelper listener results", results);
    //       if (results && results.detections.length !== 0) {
    //         worker.postMessage({
    //           operation: "faceDetectionResult",
    //           result: results.detections[0].boundingBox
    //         })
    //       }
    //     }}]
    // })
  }


  
  render() {
    return (
      <div className="vonage-media-processor-demo">
        <div id="loader" class="is-loading">
          <h1 id="instruction">Please look at the camera.</h1>
        </div>
        <div id="layoutContainer">
          <video id="croppedVideo" width="300px" height="300px" autoplay muted></video>
        </div>
        <section id="popOverWrapper">
          <button id="popOverTitle">Settings</button>
          <section id="popOverContent">
            <div id="zoom">
              <button id="autoZoomButton" class="enable">Auto Zoom</button>
              <div id="fixedRatio" class="is-shown">
                <input type="checkbox" name="fixedRatio" />
                <label for="fixedRatio"> Fixed Ratio</label>
              </div>
              <div id="faceTracking" class="is-shown">
                <input type="checkbox" name="faceTracking" />
                <label for="faceTracking"> Face Tracking</label>
              </div>
              <div id="widthPadding" class="is-shown">
                <label>Width Padding:</label>
                <input type="range" disabled value="0" step="1" min="0" max="80" />
              </div>
              <div id="heightPadding" class="is-shown">
                <label>Height Padding:</label>
                <input type="range" disabled value="0" step="1" min="0" max="80" />
              </div>
            </div>
            <div id="brightness">
              <button id="adjustBrightnessButton" class="enable">Adjust Brightness</button>
              <div id="autoBrightness" class="is-shown">
                <input type="checkbox" name="autoBrightness" checked />
                <label for="autoBrightness">Auto Adjust</label>
              </div>
              <div id="brightnessLevel">
                <label>Brightness Level:</label>
                <input type="range" value="1" step="0.1" min="0.1" max="2" />
              </div>
            </div>
          </section>
        </section>
      </div>
    );
  }
}



// export default class App extends React.Component {
//   constructor(props) {
//     super(props);

//   }

//   render() {
//     return (
//       <div>Hi</div>
//     )
//   }
// }