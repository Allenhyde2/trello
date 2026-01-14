// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB3BZV8OaERbm4l1Db_NIO2iyeE--kUzq4",
  authDomain: "trellodataserver.firebaseapp.com",
  projectId: "trellodataserver",
  storageBucket: "trellodataserver.firebasestorage.app",
  messagingSenderId: "724918870120",
  appId: "1:724918870120:web:3fa257f355247ead029bdd",
  measurementId: "G-SKJJZ0L6W9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
