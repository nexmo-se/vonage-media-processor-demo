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

      this.hatCurrentWidth = 0;
      this.hatCurrentHeight = 0;
      this.hatCurrentXpos = 0;
      this.hatCurrentYpos = 0;

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
    //this.ctx_.drawImage(this.image1, 1080, 550, 150, 150);

    let logoScaling = 0.25;
    let paddingScaling = 0.02;

    let logoWidth = this.canvas_.height * logoScaling;
    let logoHeight = logoWidth;

    let padding = this.canvas_.height * paddingScaling;

    let xpos = this.canvas_.width - logoWidth - padding;
    let ypos = this.canvas_.height - logoHeight - padding;
    console.log({ canvas: this.canvas_, xpos, ypos, logoWidth, logoHeight, padding });

    this.ctx_.drawImage(this.image1, parseInt(xpos), parseInt(ypos), parseInt(logoWidth), parseInt(logoHeight));
  }

  async drawHat() {
    if (!this.image2) {
      const imgblob2 = await fetch(`${SAMPLE_SERVER_BASE_URL}/hat.png`)
        .then(r => r.blob());
      this.image2 = await createImageBitmap(imgblob2);
    }

    // console.log({faceDetectionResult: this.faceDetectionResult, canvas: this.canvas_});

    let faceWidth = this.canvas_.width * this.faceDetectionResult.boundingBox.width;
    let faceHeight = this.canvas_.height * this.faceDetectionResult.boundingBox.height;
    // console.log({faceHeight, faceWidth});

    let rightEye = {
      width: this.faceDetectionResult.landmarks[0].x * this.canvas_.width,
      height: this.faceDetectionResult.landmarks[0].y * this.canvas_.height
    };
    let leftEye = {
      width: this.faceDetectionResult.landmarks[1].x * this.canvas_.width,
      height: this.faceDetectionResult.landmarks[1].y * this.canvas_.height
    };
    // console.log({rightEye, leftEye});

    const posTreshold = 10, sizeTreshold = 5;

    // ---

    let hatWidth = leftEye.width - rightEye.width;
    let hatHeight = faceHeight * 0.6;
    // console.log({hatWidth, hatHeight});

    if (Math.abs(this.hatCurrentXpos - hatWidth) > sizeTreshold) {
      this.hatCurrentWidth = hatWidth;
    } else {
      hatWidth = this.hatCurrentWidth;
    }

    if (Math.abs(this.hatCurrentHeight - hatHeight) > sizeTreshold) {
      this.hatCurrentHeight = hatHeight;
    } else {
      hatHeight = this.hatCurrentHeight;
    }

    // ---

    let xpos = rightEye.width;
    let ypos = rightEye.height - (hatHeight * 2);

    if (Math.abs(this.hatCurrentXpos - xpos) > posTreshold) {
      this.hatCurrentXpos = xpos;
    } else {
      xpos = this.hatCurrentXpos;
    }

    if (Math.abs(this.hatCurrentYpos - ypos) > posTreshold) {
      this.hatCurrentYpos = ypos;
    } else {
      ypos = this.hatCurrentYpos;
    }

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

      // console.log("this.faceDetectionResult", this.faceDetectionResult);

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
          if (this.faceDetectionResult){
            this.drawHat();
          }
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