import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Attempt to load service account and initialize App.
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("Please export FIREBASE_SERVICE_ACCOUNT containing the service account JSON string first.");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function setAdmin() {
  const email = process.argv[2] || "pd789pd789@gmail.com";
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log("User found:", userRecord.uid);
    
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      role: 'admin', // the key change
      email: email,
      points: 99999,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(\`Successfully promoted \${email} to admin.\`);
    process.exit(0);
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      console.error("User not found in Firebase Auth. Please sign up in the app first.");
    } else {
      console.error(e);
    }
    process.exit(1);
  }
}

setAdmin();
