
import { db, storage } from "./firebase.js";
import { collection, addDoc, getDocs, doc, getDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } 
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firestore collection
const col = collection(db, "cerpen");

// Upload cover to Storage
async function uploadCover(base64){
  if(!base64) return "";
  const id = "cover_" + Date.now();
  const r = ref(storage, "covers/" + id + ".jpg");
  await uploadString(r, base64, "data_url");
  return await getDownloadURL(r);
}

// Save cerpen
export async function saveCerpen(data){
  if(data.cover){
    data.cover = await uploadCover(data.cover);
  }
  await addDoc(col, data);
}

// Get all
export async function getAllCerpen(){
  const snap = await getDocs(col);
  return snap.docs.map(x=>({ id:x.id, ...x.data() }));
}

// Get one
export async function getCerpen(id){
  const d = await getDoc(doc(db,"cerpen",id));
  return d.exists()? {id:d.id, ...d.data()} : null;
}

// Delete
export async function deleteCerpen(id){
  await deleteDoc(doc(db,"cerpen",id));
}
