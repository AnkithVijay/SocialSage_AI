import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UpdateProfileData {
  displayName?: string;
  preferences?: {
    notifications: boolean;
    theme: 'light' | 'dark';
  };
}

// Create user profile after sign up
export const onUserCreated = functions.auth
  .user()
  .onCreate(async (user: admin.auth.UserRecord) => {
    try {
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        preferences: {
          notifications: true,
          theme: 'light' as const
        }
      };

      await db.collection('users').doc(user.uid).set(userProfile);
      
      functions.logger.info(`User profile created for ${user.uid}`);
      return { success: true };
    } catch (error) {
      functions.logger.error('Error creating user profile:', error);
      throw new functions.https.HttpsError('internal', 'Error creating user profile');
    }
});

// Update user profile
export const updateUserProfile = functions.https.onCall(async (data: UpdateProfileData, context) => {
  if (!context?.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { displayName, preferences } = data;
    const userId = context.auth.uid;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(displayName && { displayName }),
      ...(preferences && { preferences })
    };

    await db.collection('users').doc(userId).update(updateData);
    
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    functions.logger.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', 'Error updating user profile');
  }
}); 