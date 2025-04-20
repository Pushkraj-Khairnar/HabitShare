
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCKYTeJpgcPOrMaszLwy4y9juxALSFN5B4",
  authDomain: "habit-88ee0.firebaseapp.com",
  projectId: "habit-88ee0",
  storageBucket: "habit-88ee0.firebasestorage.app",
  messagingSenderId: "941698687967",
  appId: "1:941698687967:web:d507a6d0cfae2ecece1a6a",
  measurementId: "G-NHVL48QF7K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
