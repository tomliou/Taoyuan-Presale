import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPlbcocBylqHSA_vpRG8HvuFhCx6fDc88",
  authDomain: "taoyuan-dd167.firebaseapp.com",
  projectId: "taoyuan-dd167",
  storageBucket: "taoyuan-dd167.firebasestorage.app",
  messagingSenderId: "1079472383479",
  appId: "1:1079472383479:web:b2d9e17178738207c13af2",
  measurementId: "G-NM87LBXJ89"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
