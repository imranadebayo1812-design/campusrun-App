// Firebase background message handler — loaded by the workbox service worker.
// IMPORTANT: Replace the placeholder values below with your real Firebase config.
// These values are safe to commit (Firebase config is public; security is via Firebase rules).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'REPLACE_WITH_VITE_FIREBASE_API_KEY',
  authDomain:        'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
  projectId:         'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
  storageBucket:     'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId:             'REPLACE_WITH_VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification?.title ?? 'CampusRun',
    {
      body:  payload.notification?.body ?? '',
      icon:  '/logo.png',
      badge: '/logo.png',
      data:  payload.data ?? {},
    }
  );
});
