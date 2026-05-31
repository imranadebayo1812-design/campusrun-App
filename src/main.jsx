import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ModeProvider } from './context/ModeContext.jsx';
import './index.css';

// iOS-only fixes — do not apply on Android or web
if (Capacitor.getPlatform() === 'ios') {
  // Prevent the outer WKWebView UIScrollView from rubber-banding.
  // Only elements with [data-scroll] are allowed to scroll.
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('[data-scroll]')) e.preventDefault();
  }, { passive: false });

  // KeyboardResize.None keeps the WKWebView frame at full height so the layout
  // never jumps. We track keyboard height ourselves via Capacitor events and
  // expose it as --kb so modal backdrops can push panels above the keyboard.
  // NOTE: window.visualViewport does NOT update in WKWebView with KeyboardResize.None
  // (Capacitor owns the frame; WebKit never learns about the keyboard). The only
  // reliable source of keyboard height in this configuration is the Capacitor
  // keyboard plugin events — which is what we use here.
  import('@capacitor/keyboard').then(({ Keyboard, KeyboardResize }) => {
    Keyboard.setResizeMode({ mode: KeyboardResize.None }).catch(() => {});

    const setKb = (h) => document.documentElement.style.setProperty('--kb', `${h}px`);

    // Will* fires during animation start; Did* fires after animation completes.
    // We listen to both so the panel moves with the keyboard rather than after it.
    Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => setKb(keyboardHeight));
    Keyboard.addListener('keyboardDidShow',  ({ keyboardHeight }) => setKb(keyboardHeight));
    Keyboard.addListener('keyboardWillHide', () => setKb(0));
    Keyboard.addListener('keyboardDidHide',  () => setKb(0));
  });
}

// PWA / web fallback: VisualViewport works correctly in a real browser
// (Safari, Chrome) where WebKit manages keyboard visibility natively.
if (Capacitor.getPlatform() === 'web' && window.visualViewport) {
  const updateKb = () => {
    const kb = Math.max(
      0,
      window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop
    );
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`);
  };
  window.visualViewport.addEventListener('resize', updateKb);
  window.visualViewport.addEventListener('scroll', updateKb);
}

// When a new service worker activates and takes control, reload once so the
// app immediately runs the latest code instead of waiting for a manual restart.
if ('serviceWorker' in navigator) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload(); }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModeProvider>
            <App />
          </ModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
