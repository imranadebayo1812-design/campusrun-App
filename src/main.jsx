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

  // Lock keyboard so it never resizes the viewport — prevents layout
  // misorientation when tapping inputs in modals and forms.
  import('@capacitor/keyboard').then(({ Keyboard, KeyboardResize }) => {
    Keyboard.setResizeMode({ mode: KeyboardResize.None }).catch(() => {});
    // Push modal panels up when keyboard appears so inputs stay visible
    Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      document.documentElement.style.setProperty('--kb', `${keyboardHeight}px`);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--kb', '0px');
    });
  });
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
