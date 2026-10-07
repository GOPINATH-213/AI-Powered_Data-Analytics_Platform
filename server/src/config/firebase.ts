import * as admin from 'firebase-admin';
import { env } from './env';

let firebaseAdminInstance: admin.app.App | null = null;
let isFirebaseInitialized = false;

try {
  if (env.firebase.projectId && env.firebase.clientEmail && env.firebase.privateKey) {
    firebaseAdminInstance = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });
    isFirebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn(
      'WARNING: Firebase credentials are incomplete. Firebase Authentication will run in local mock/fallback mode.'
    );
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', (error as Error).message);
  console.warn('Falling back to developer bypass authentication mode.');
}

export const getFirebaseAdmin = (): admin.app.App | null => {
  return firebaseAdminInstance;
};

export { isFirebaseInitialized };
