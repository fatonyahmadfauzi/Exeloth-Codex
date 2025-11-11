// assets/js/firebase-config.js
// Config akan diisi oleh build process

const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "AIzaSyBV5a4ufA6pB386F11I73iUGJ2-1ilBSl8",
  authDomain: "exeloth-codex.firebaseapp.com",
  projectId: "exeloth-codex",
  storageBucket: "exeloth-codex.firebasestorage.app",
  messagingSenderId: "244745543500",
  appId: "1:244745543500:web:bc5aa6124bb3c9b996b9e9",
  measurementId: "G-B71ET4STML"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();