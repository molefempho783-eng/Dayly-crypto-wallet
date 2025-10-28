// firebaseConfig.ts
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Auth (RN persistence)
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-expect-error: RN export exists at runtime; typing quirk
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyB91UEqTJVnNcg8Jsy0_6FsvqG9A6irEkE",
    authDomain: "communitychat-f3fb0.firebaseapp.com",
    projectId: "communitychat-f3fb0",
    storageBucket: "communitychat-f3fb0.firebasestorage.app",
    messagingSenderId: "975021405125",
    appId: "1:975021405125:web:9560540eb3d567dfad91ac",
    measurementId: "G-311RJN9VQ9"
};

export const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === 'web'
    ? getAuth(app) // web uses default persistence (IndexedDB/localStorage)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(app);

// ✅ Export Storage so screens can import it
export const storage = getStorage(app);