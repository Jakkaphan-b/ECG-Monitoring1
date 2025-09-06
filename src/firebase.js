// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";   // ✅ เพิ่มบรรทัดนี้
import { getAuth } from "firebase/auth";              // ✅ เพิ่มบรรทัดนี้
// import { getAnalytics } from "firebase/analytics"; // (ถ้าไม่ได้ใช้ analytics ก็ไม่ต้องเปิด)

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUAxUXSkkRH-oKDbZVXK4ODDWpazxeNb4",
  authDomain: "ecg-monitor-f1fcb.firebaseapp.com",
  projectId: "ecg-monitor-f1fcb",
  storageBucket: "ecg-monitor-f1fcb.firebasestorage.app",
  messagingSenderId: "294890917162",
  appId: "1:294890917162:web:ce9f81fe7b2f244403e253",
  measurementId: "G-CE0G11XXLW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
