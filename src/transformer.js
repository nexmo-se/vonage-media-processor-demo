/* eslint-disable no-unused-vars */
/* global VideoFrame */

import {
  SAMPLE_SERVER_BASE_URL
} from './config';

export default class Transformer {
  constructor() {
    try{
      this.canvas_ = null;
      this.ctx_ = null;

      this.transformType = "";
      
      this.image1 = null;
      this.image2 = null;

      this.faceDetectionResult = null;

    } catch(error) {
      console.log("Error", error);
    }
  }

  setTransformType(transformType) { this.transformType = transformType; }
  setFaceDetectionResult(faceDetectionResult) { this.faceDetectionResult = faceDetectionResult; }

  async drawLogo() {
    if (!this.image1) {
      const imgblob = await fetch(`${SAMPLE_SERVER_BASE_URL}/vonage.png`)
        .then(r => r.blob());
      this.image1 = await createImageBitmap(imgblob);
    }
    this.ctx_.drawImage(this.image1, 1080, 550, 150, 150);
  }

  async drawHat() {
    if (!this.image2) {
      const imgblob2 = await fetch(`${SAMPLE_SERVER_BASE_URL}/hat.png`)
        .then(r => r.blob());
      this.image2 = await createImageBitmap(imgblob2);
    }

    // console.log({faceDetectionResult: this.faceDetectionResult, canvas: this.canvas_});

    let faceHeight = this.canvas_.height * this.faceDetectionResult.boundingBox.height;
    let faceWidth = this.canvas_.width * this.faceDetectionResult.boundingBox.width;
    // console.log({faceHeight, faceWidth});

    let hatWidth = faceWidth * 0.5;
    let hatHeight = faceHeight * 0.6;
    // console.log({hatWidth, hatHeight});

    let rightEarTragion = {
      width: this.faceDetectionResult.landmarks[4].x * this.canvas_.width,
      height: this.faceDetectionResult.landmarks[4].y * this.canvas_.height
    };
    let leftEarTragion = {
      width: this.faceDetectionResult.landmarks[5].x * this.canvas_.width,
      height: this.faceDetectionResult.landmarks[5].y * this.canvas_.height
    };
    // console.log({rightEarTragion, leftEarTragion});

    let xpos = leftEarTragion.width - (faceWidth / 2) - 80;
    let ypos = leftEarTragion.height - faceHeight - 80;
    // console.log({xpos, ypos});

    this.ctx_.drawImage(this.image2, xpos, ypos, hatWidth, hatHeight);
  }

  start() {
    this.canvas_ = new OffscreenCanvas(1, 1);
    this.ctx_ = this.canvas_.getContext('2d', { alpha: false, desynchronized: true });
    if (!this.ctx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
  }

  async transform(frame, controller) {
    try {
      this.canvas_.width = frame.displayWidth;
      this.canvas_.height = frame.displayHeight;
      const timestamp = frame.timestamp;

      if (this.transformType === "logo") {
        // === Call function to draw Vonage Logo on bottom left of the VideoFrame
        this.ctx_.drawImage(frame, 0, 0);
        const imageData = this.ctx_.getImageData(0, 0, this.canvas_.width, this.canvas_.height);
        frame.close();
        this.ctx_.putImageData(imageData, 0, 0);
        this.drawLogo();
        controller.enqueue(new VideoFrame(this.canvas_, { timestamp, alpha: 'discard' }));

      } else if (this.transformType === "hat") {
        // === Call function to draw Hat on the top of person's head in the VideoFrame
        createImageBitmap(frame).then(image => {
          this.ctx_.drawImage(frame, 0, 0);
          const imageData = this.ctx_.getImageData(0, 0, this.canvas_.width, this.canvas_.height);
  
          frame.close();
          postMessage(image);
  
          this.ctx_.putImageData(imageData, 0, 0);
          this.drawHat();
          controller.enqueue(new VideoFrame(this.canvas_, { timestamp, alpha: 'discard' }));
        }).catch(e => {
          controller.enqueue(frame);
        });

      } else {
        this.ctx_.drawImage(frame, 0, 0);
        const imageData = this.ctx_.getImageData(0, 0, this.canvas_.width, this.canvas_.height);
        frame.close();
        this.ctx_.putImageData(imageData, 0, 0);
        controller.enqueue(new VideoFrame(this.canvas_, { timestamp, alpha: 'discard' }));
      }

    } catch (error) {
      console.log("error", error);
    }
  }

  flush() {
    console.log('canvas transformer flush');
  }
}