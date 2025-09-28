import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Client SDK needs different config (not service account)
const firebaseConfig = {
  apiKey: "AIzaSyDMZH_QbSN4zI1J90iOgRD-_zqc_rkwKkw",
  authDomain: "vite-todo-app-265fa.firebaseapp.com",
  projectId: "vite-todo-app-265fa",
  storageBucket: "vite-todo-app-265fa.firebasestorage.app",
  messagingSenderId: "505654985942",
  appId: "1:505654985942:web:0981063630c72a9c5db577",
  measurementId: "G-1J7ELYG5GQ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
