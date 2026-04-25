// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC29hXnWM6Gul1SuDSeYpTcu8L2ooifTrY",
  authDomain: "choir-register.firebaseapp.com",
  projectId: "choir-register",
  storageBucket: "choir-register.firebasestorage.app",
  messagingSenderId: "789835587100",
  appId: "1:789835587100:web:1ad6e0853b36a6d8d249d9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };