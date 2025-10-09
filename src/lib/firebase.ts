import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Client SDK needs different config (not service account)
const firebaseConfig = {
  apiKey: "AIzaSyCTM5_DoF5CdbVqOCpnd7_ps1e9wSahTMY",
  authDomain: "logitrack-e1972.firebaseapp.com",
  projectId: "logitrack-e1972",
  storageBucket: "logitrack-e1972.firebasestorage.app",
  messagingSenderId: "29625075825",
  appId: "1:29625075825:web:0fcbaa6ff2bb1d9fe433d0",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db }
