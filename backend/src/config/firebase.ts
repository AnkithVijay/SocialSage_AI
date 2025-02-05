import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import * as path from 'path';

// Path to service account key
const serviceAccountPath = path.join(__dirname, 'keys', 'serviceKey.json');

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  try {
    if (!getApps().length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        // Add any other configurations like storage bucket etc.
        // storageBucket: "your-storage-bucket.appspot.com"
      });
    }
    return admin;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

// Export the initialized admin instance
export const firebaseAdmin = initializeFirebaseAdmin();

// Export commonly used services
export const db = firebaseAdmin.firestore();
export const auth = firebaseAdmin.auth();
export const storage = firebaseAdmin.storage(); 