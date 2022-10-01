import { initializeApp } from 'firebase/app';
import admin from 'firebase-admin';
import adminServiceAccount from "../serviceAccountKey.json";

import env from '../env';

const isStaging = process.env.is_staging;

const _admin = admin.initializeApp({
    credential: admin.credential.cert(adminServiceAccount)
}, 'admin');

export const firebaseConfig = {
    apiKey: env.apiKey,
    authDomain: env.authDomain,
    projectId: env.projectId,
    storageBucket: env.storageBucket,
    messagingSenderId: env.messagingSenderId,
    appId: env.appId,
    measurementId: env.measurementId
  };
  
const _app = initializeApp(firebaseConfig);

export const firebaseAdmin = _admin;
export const firebaseApp = _app;