import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ─── Environment Variables ─────────────────────────────────────────────────────
// Read from Vite environment variables (VITE_* prefix required)
// Fall back to empty string for local dev (set in .env.local)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "",
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID           || "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET       || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID               || "",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID       || "",
};

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Validate required config
const required = ["apiKey", "projectId", "authDomain", "appId"];
const missing = required.filter(k => !firebaseConfig[k as keyof typeof firebaseConfig]);
if (missing.length > 0) {
  console.warn(
    `[OpenVans] Firebase config missing required fields: ${missing.join(", ")}`,
    "Set them in .env.local or Vercel Environment Variables."
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);

export default app;