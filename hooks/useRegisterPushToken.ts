// hooks/useRegisterPushToken.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // iOS SDK 49/50 typings want these too:
    shouldShowBanner: Platform.OS === 'ios',
    shouldShowList: Platform.OS === 'ios',
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

/** Prompts the user if needed, returns Expo push token or null */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      Alert.alert('Push Notifications', 'Must use a physical device for push notifications.');
      return null;
    }

    // 1) Check current permission
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2) Ask if not granted
    if (existingStatus !== 'granted' && canAskAgain) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications disabled',
        'Please enable notifications in Settings to receive message alerts.'
      );
      return null;
    }

    await ensureAndroidChannel();

    // 3) Get an Expo push token (needs EAS projectId)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      'YOUR-EAS-PROJECT-ID';

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token ?? null;
  } catch (e) {
    console.warn('registerForPushNotificationsAsync error', e);
    return null;
  }
}

export async function savePushTokenToUser(token: string) {
  const uid = auth.currentUser?.uid;
  if (!uid || !token) return;
  const ref = doc(db, 'users', uid);
  // create if missing
  await setDoc(ref, { expoPushTokens: [token] }, { merge: true });
  // de-dupe-friendly
  await updateDoc(ref, { expoPushTokens: arrayUnion(token) });
}
