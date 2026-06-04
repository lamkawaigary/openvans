import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your OpenVans Firebase configuration
export const GOOGLE_MAPS_API_KEY = "AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg";

const firebaseConfig = {
  apiKey: "AIzaSyAV0l3Tx3Z3DAYWExyf3Y_H1yktPkZCHdg",
  authDomain: "openvans.firebaseapp.com",
  projectId: "openvans",
  storageBucket: "openvans.firebasestorage.app",
  messagingSenderId: "547677087724",
  appId: "1:547677087724:web:e8b8f201b0c7eb412582c9",
  measurementId: "G-WNHJ65RKN9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
