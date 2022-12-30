/* eslint-disable indent */
import { MediaProcessor } from  '@vonage/media-processor'; 
import Transformer from './transformer.js';

let mediaProcessor;

let transformType = "", faceDetectionResult;
let transformer;

onmessage = async (event) => {
  try {
    const { operation, message } = event.data;
    // console.log("OPERATION", operation, " | MESSAGE", message);
    switch (operation) {
      case 'init': {
        mediaProcessor = new MediaProcessor();

        transformer = new Transformer();
        const transformers = [transformer];

        mediaProcessor.setTransformers(transformers);
        break;
      }

      case 'transform': {
        const { readable, writable } = event.data;
        mediaProcessor.transform(readable, writable).then(() => {
          const msg = { callbackType: 'success', message: 'transform' };
          postMessage(JSON.stringify(msg));
        }).catch(e => console.error(e));
        break;
      }

      case 'setTransformType': {
        transformType = event.data.message.transformType;
        transformer.setTransformType(transformType);
        break;
      }

      case 'faceDetectionResult': {
        // console.log("worker | faceDetectionResult", event.data)
        faceDetectionResult = event.data.result;
        transformer.setFaceDetectionResult(faceDetectionResult);

        const msg = { callbackType: 'success', message: 'faceDetectionResult' };
        postMessage(JSON.stringify(msg));
        break;
      }

      case 'destroy': {
        let msg;
        try {
          await mediaProcessor.destroy();
          msg = { callbackType: 'success', message: 'destroy' };
        } catch (error) {
          msg = { callbackType: 'failure', message: error };
        }
        postMessage(JSON.stringify(msg));
        break;
      }

      default: {
        break;
      }
    }
  } catch (error) { console.log("ERR", error); }
};
