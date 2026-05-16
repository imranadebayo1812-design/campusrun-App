// Firebase background message handler — loaded by the workbox service worker.
// IMPORTANT: Replace the placeholder values below with your real Firebase config.
// These values are safe to commit (Firebase config is public; security is via Firebase rules).

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyBhZ-vx57wXkJC8tQXPTYu4kXdaK00D7RI',
  authDomain:        'campusrun-9f977.firebaseapp.com',
  projectId:         'campusrun-9f977',
  storageBucket:     'campusrun-9f977.firebasestorage.app',
  messagingSenderId: '533791548849',
  appId:             '1:533791548849:web:65102ec1ac452c35a34990',
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
