import { MediapipeHelper } from '@vonage/ml-transformers';

export class WorkerMediaProcessor {
  constructor() {
    this.worker = new Worker(new URL('./worker.js', import.meta.url));
    this.worker.postMessage({
      operation: 'init'
    });

    const mediaPipeHelper = new MediapipeHelper();
    mediaPipeHelper.initialize({
      mediaPipeModelConfigArray: [{modelType: "face_detection", options: {
        selfieMode: false,
        minDetectionConfidence: 0.5,
        model: "short"
      }, 
      listener: (results) => {
        // console.log("WMP | results", results);
        if (results && results.detections.length !== 0) {
          this.worker.postMessage({
            operation: "faceDetectionResult",
            result: results.detections[0]
          })
        }
      }}]
    })

    this.worker.addEventListener('message', ((msg) => {
      if(msg.data instanceof ImageBitmap){
        mediaPipeHelper.send(msg.data).then(() => {
          msg.data.close();
        })
        .catch(e => {
          console.log("error: ", e)
        })
      } else {
        // console.log("WMP | MESSAGE EVENT from worker: ", msg);
      }
    }));
  }

  async transform(readable, writable) {
    this.worker.postMessage(
      {
        operation: 'transform',
        readable,
        writable
      },
      [readable, writable]
    );
  }

  async changeTransformType(transformType) {
    this.worker.postMessage(
      {
        operation: 'setTransformType',
        message: { transformType }
      }
    );
  }

  destroy() {
    this.worker.postMessage({
      operation: 'destroy'
    });
  }
}
