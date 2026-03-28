'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: Modified to work correctly on Vercel
export function initializeFirebase() {
  if (!getApps().length) {
    // Directly use config object for initialization to ensure it works in all environments
    let firebaseApp;
    try {
      console.log('Initializing Firebase with config object');
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization error:', e);
      // If initialization fails, retry with the same config
      try {
        console.log('Retrying Firebase initialization with config object');
        firebaseApp = initializeApp(firebaseConfig);
      } catch (retryError) {
        console.error('Firebase initialization failed after retry:', retryError);
        throw new Error('Failed to initialize Firebase. Please check your configuration.');
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
