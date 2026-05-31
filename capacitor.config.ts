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
  },
  ios: {
    // 'never' = we handle safe-areas purely in CSS via env(safe-area-inset-*).
    // 'always' caused double-padding: native UIScrollView added safeAreaInset offset
    // AND our CSS env() added the same again → huge gap at the top.
    contentInset: 'never',
    // scrollEnabled is intentionally NOT set to false. Setting it false forces iOS
    // into frame-based keyboard avoidance (moves the entire WKWebView frame up),
    // which makes position:fixed modals and the nav bar disappear when the keyboard
    // opens. Leaving it as default (true) uses scroll-based avoidance instead —
    // fixed elements stay in place and the UIScrollView scrolls to reveal inputs.
    allowsLinkPreview: false,
    backgroundColor: '#080812',
  },
  android: {
    backgroundColor: '#080812',
  },
};

export default config;
