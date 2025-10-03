// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
 apiKey: "AIzaSyD1lhicexO-NKqLTbJ12Fb-9ZYteWyx8GU",
  authDomain: "hospital-scheduler-8b143.firebaseapp.com",
  projectId: "hospital-scheduler-8b143",
  storageBucket: "hospital-scheduler-8b143.firebasestorage.app",
  messagingSenderId: "378881903553",
  appId: "1:378881903553:web:86fcce343b57e651f07d40",
  measurementId: "G-B5Y6BE40N5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);