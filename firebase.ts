// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrj6jyhGCXDunGNDTHdX-1bZ9y6C0Ke20",
  authDomain: "dish-line-bill-collect.firebaseapp.com",
  projectId: "dish-line-bill-collect",
  storageBucket: "dish-line-bill-collect.appspot.com",
  messagingSenderId: "216816241845",
  appId: "1:216816241845:web:220e9b8bed850efa9c82fc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };