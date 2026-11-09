# Wave Music Player

A mobile-friendly starter web app with:
- Google sign-in and email/password sign-in
- Per-user cloud song library and playlists (Firestore)
- Favorites and recently played
- YouTube official embedded video playback

## Important playback limitation
This app does **not** stream/extract YouTube Music audio. It embeds regular YouTube videos using YouTube's official player. It cannot remove ads, unlock Premium, or guarantee background/audio-only playback. YouTube controls availability and advertising.

## Firebase setup (required)
1. Create a project at https://console.firebase.google.com/
2. Add a Web app and copy its Firebase config.
3. Open `app.js` and replace the six `YOUR_...` values in `firebaseConfig`.
4. In Firebase Authentication → Sign-in method, enable **Email/Password** and **Google**.
5. In Authentication → Settings → Authorized domains, add the domain where you will host the app.
6. Create a Firestore database.
7. In Firestore → Rules, paste the contents of `firestore.rules` and publish.
8. Host the folder using Firebase Hosting or another HTTPS static host. For local testing, use a local web server (not `file://`) because the app uses JavaScript modules.

## Run locally
From this folder, run a static server, for example:
`python -m http.server 8000`
Then open `http://localhost:8000`.

Firebase config is intended to be public in a browser app. Never put service-account private keys or admin credentials in `app.js`.
