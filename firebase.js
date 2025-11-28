
// Firebase init
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2-BRqOnFX6o4WDl-ZmYs3M6uuk7srYaM",
  authDomain: "tintaku-58bcf.firebaseapp.com",
  projectId: "tintaku-58bcf",
  storageBucket: "tintaku-58bcf.appspot.com",
  messagingSenderId: "597580314120",
  appId: "1:597580314120:web:5f643b1941cdf42fb183bd",
  measurementId: "G-YFLLB1MJRC"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
