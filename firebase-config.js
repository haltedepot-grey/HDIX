// firebase-config.js - Version ultime
const firebaseConfig = {
  apiKey: "AIzaSyATqyBuVf81rE5wRxdHmkxZTQgnNtg7SWw",
  authDomain: "hdix-91e43.firebaseapp.com",
  projectId: "hdix-91e43",
  storageBucket: "hdix-91e43.firebasestorage.app",
  messagingSenderId: "571330832594",
  appId: "1:571330832594:web:e7e72614616822ccf6250b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Pour les notifications push
const messaging = firebase.messaging();

window.db = db;
window.auth = auth;
window.messaging = messaging;