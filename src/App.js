/*global OT, navigator*/
/*eslint no-undef: ["error"] */

import Axios from "axios";
import React from "react";
import { OTSession, OTPublisher, OTStreams, OTSubscriber } from 'opentok-react';

import "./index.css";

import { isSupported, MediapipeHelper } from '@vonage/ml-transformers';
import { MediaProcessor, MediaProcessorConnector } from '@vonage/media-processor';

import { WorkerMediaProcessor } from './worker-media-processor.js';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    const { apiKey, sessionId, token } = this.props.credentials;
    const { roomLink, roomId } = this.props.roomDetails;

    this.state = {
      error: null,
      connection: 'Connecting',
      publishVideo: true,
      streamPublished: false,
      transformType: ""
    };

    this.session = null;
    this.publisher = null;

    this.mediaProcessor = null;
    this.mediaProcessorConnector = null;

    this.publisherEventHandlers = {
      accessDenied: () => {
        console.log('User denied access to media source');
      },
      streamCreated: () => {
        console.log('Publisher stream created');
      },
      streamDestroyed: ({ reason }) => {
        console.log(`Publisher stream destroyed because: ${reason}`);
      },
    };

    this.subscriberEventHandlers = {
      videoEnabled: () => {
        console.log('Subscriber video enabled');
      },
      videoDisabled: () => {
        console.log('Subscriber video disabled');
      },
    };
  }

  onSessionError = error => {
    this.setState({ error });
  };

  onPublish = () => {
    console.log('Publish Success');
  };

  onPublishError = error => {
    this.setState({ error });
  };

  onSubscribe = () => {
    console.log('Subscribe Success');
  };

  onSubscribeError = error => {
    this.setState({ error });
  };

  toggleVideo = () => {
    this.setState(state => ({
      publishVideo: !state.publishVideo,
    }));
  };

  componentDidMount() {
    const { apiKey, sessionId, token } = this.props.credentials;
    if (apiKey && sessionId && token) {
      this.initWorker();
    }
  }

  async initWorker() {
    if (await this.checkMediaStreamSupport()) {
      this.initializeSession();
      return;
    }
  }

  async checkMediaStreamSupport() {
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

  transformStream() {
    const mediaProcessor = new WorkerMediaProcessor();
    this.mediaProcessor = mediaProcessor;

    const mediaProcessorConnector = new MediaProcessorConnector(mediaProcessor);
    this.mediaProcessorConnector = mediaProcessorConnector;

    if (OT.hasMediaProcessorSupport()) {
      this.opentokPublisher
        .setVideoMediaProcessorConnector(mediaProcessorConnector)
        .catch((e) => {
          console.error(e);
        });
    } else {
      console.log('Browser does not support media processors');
    }
  }

  async initializeSession() {
    const { apiKey, sessionId, token } = this.props.credentials;
    // console.log("initializeSession", { apiKey, sessionId, token });

    const session = OT.initSession(apiKey, sessionId);
    this.opentokSession = session;

    // Subscribe to a newly created stream
    session.on({
      streamCreated: (event) => {
        const subscriberOptions = {
          insertMode: 'append',
          width: '100%',
          height: '100%'
        };
        session.subscribe(
          event.stream,
          'subscriber',
          subscriberOptions,
          handleError
        );
      },
      sessionConnected: () => {
        this.setState({ connection: 'Connected' });
      },
      sessionDisconnected: () => {
        this.setState({ connection: 'Disconnected' });
      },
      sessionReconnected: () => {
        this.setState({ connection: 'Reconnected' });
      },
      sessionReconnecting: () => {
        this.setState({ connection: 'Reconnecting' });
      },
    });

    // initialize the publisher
    const publisherOptions = {
      insertMode: 'append',
      width: '100%',
      height: '100%'
    };
    const publisher = await OT.initPublisher(
      'publisher',
      publisherOptions,
      (error) => {
        if (error) {
          console.warn(error);
        }
      }
    );
    this.opentokPublisher = publisher;

    // Connect to the session
    session.connect(token, async (error) => {
      if (error) {
        await handleError(error);
      } else {
        // If the connection is successful, publish the publisher to the session
        // and transform stream
        session.publish(publisher, () => this.transformStream(publisher));
      }
    });

  }

  isButtonDisabled = (transformType) => {
    if (this.state.transformType === transformType) {
      return true;
    }
    return false;
  }
  changeTransformType = (transformType) => {
    this.setState({ transformType: transformType });
    this.mediaProcessor.changeTransformType(transformType);
  }

  copyRoomLink = () => {
    navigator.clipboard.writeText(this.props.roomDetails.roomLink);
  }
  
  render() {
    const { apiKey, sessionId, token } = this.props.credentials;
    const { roomLink, roomId } = this.props.roomDetails;
    const { error, connection, publishVideo, streamPublished, transformType } = this.state;
    
    return (
      <div>
        <div id="videos">
          <h1>Vonage Media Processor Demo</h1>

          <div id="divider"></div>

          <h2>You</h2>

          <div id="sessionStatus">Room ID: {roomId}</div>
          <div id="sessionStatus">Session Status: {connection}</div>
          {error ? (
            <div className="error">
              <strong>Error:</strong> {error}
            </div>
          ) : null}
          
          <div id="publisher"></div>
          <div id="transformTypeWrapper">
            <span id="transformType">Transform Type</span>
            <button onClick={() => this.changeTransformType("logo")} disabled={transformType === "logo"}>
              Add Vonage Logo
            </button>
            <button onClick={() => this.changeTransformType("hat")} disabled={transformType === "hat"}>
              Add Party Hat
            </button>
            <button onClick={() => this.changeTransformType("")} disabled={transformType === ""}>
              None
            </button>
          </div>
          <div id="otherToolsWrapper">
            <button onClick={this.copyRoomLink}>
              Copy Room Link 
            </button>
          </div>

          <div id="divider"></div>

          <h2>Other Participants</h2>
          <div id="subscriber"></div>
        </div>
      </div>
    );
  }
}

function handleError(error) {
  if (error) {
    alert(error.message ? error.message : error);
  }
}