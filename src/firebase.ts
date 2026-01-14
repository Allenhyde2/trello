// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 1. 여기가 추가되었습니다 (DB 도구 가져오기)
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
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

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app); // 2. 여기가 핵심입니다! (db를 만들어서 밖으로 내보냄)
