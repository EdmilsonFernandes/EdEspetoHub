import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPsfkeVaSZdrzV23ZF1-exKHBK2CoHQc4",
  authDomain: "espetinho-datony.firebaseapp.com",
  projectId: "espetinho-datony",
  storageBucket: "espetinho-datony.firebasestorage.app",
  messagingSenderId: "470031764612",
  appId: "1:470031764612:web:7be9fc99da35efcacd46d1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
