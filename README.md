Vonage Media Processor Demo
---------------------------

This App showcases Vonage Media Processor Library capabilities, such as adding image onto the video frame or adding a party hat to someone's head using the Face Detection provided by MediapipeHelper.

## 📚 Dependencies
- [Vonage Video API](https://www.vonage.com/communications-apis/video/)
- [Vonage ML Transformers](https://socket.dev/npm/package/@vonage/ml-transformers)
- [MediaPipe Face Detection](https://google.github.io/mediapipe/solutions/face_detection.html)
- [React.js](https://reactjs.org/)

## 🛠 Prerequisites
1. Create a [Tokbox account](https://tokbox.com/account/) and create a new project with the type "Vonage Video API".
2. Create a Vonage account with Neru capabilities enabled.
3. Change the content of `SAMPLE_SERVER_BASE_URL` in `src/config.js` appropriately.
4. If using Neru to deploy:
    1. Copy and change the content of `BASE_URL`, `PROJECT_API_KEY`, and `PROJECT_API_SECRET` in `neru.yml.example` appropriately, in a new file named `neru.yml`.
    2. Under `server/index.js`, comment out line 4-7 and use line 10-11.
5. Otherwise, if using other services to deploy:  
    1. Copy and change the content of `PORT`, `BASE_URL`, `PROJECT_API_KEY`, and `PROJECT_API_SECRET` in `.env.example` appropriately, in a new file named `.env`.
    2. Under `server/index.js`, comment out line 10-11 and use line 4-7.

## ▶️ Running Project (Local)
- If using Neru, execute `neru debug`
- If using others, execute `npm start dev` 
    - OpenTok requires https, so for testing purposes, setup a [ngrok tunnel](https://ngrok.com/). Open the URL accordingly.
- The project is expecting `ref` params in the url, which should contain a valid JWT token.
