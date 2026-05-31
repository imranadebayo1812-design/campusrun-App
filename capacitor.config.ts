import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusrun.app',
  appName: 'CampusRun',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080812',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#080812',
    },
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
    },
  },
  ios: {
    // 'never' = we handle safe-areas purely in CSS via env(safe-area-inset-*).
    // 'always' caused double-padding: native UIScrollView added safeAreaInset offset
    // AND our CSS env() added the same again → huge gap at the top.
    contentInset: 'never',
    // Disable the outer WKWebView UIScrollView bounce. CSS overflow containers
    // (our <main> scroll area) still scroll normally.
    scrollEnabled: false,
    allowsLinkPreview: false,
    backgroundColor: '#080812',
  },
  android: {
    backgroundColor: '#080812',
  },
};

export default config;
