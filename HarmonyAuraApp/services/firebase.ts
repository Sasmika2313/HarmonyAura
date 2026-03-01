import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {

  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,

  authDomain: "harmonyaura-cf679.firebaseapp.com",

  databaseURL:
    "https://harmonyaura-cf679-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId: "harmonyaura-cf679",

  storageBucket: "harmonyaura-cf679.appspot.com",

  messagingSenderId: "860325260354",

  appId: "1:860325260354:web:1384c4ed45ddeb1c0791db"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

