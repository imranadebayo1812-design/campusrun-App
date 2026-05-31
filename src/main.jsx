import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ModeProvider } from './context/ModeContext.jsx';
import './index.css';

// ─── iOS keyboard handling ────────────────────────────────────────────────────
//
// Strategy: KeyboardResize.Native
//   The native WKWebView frame shrinks when the keyboard opens, so iOS viewport
//   height (window.innerHeight / vh) decreases by exactly the keyboard height.
//   position:fixed elements with bottom:0 therefore automatically float to the
//   top of the keyboard — no custom --kb offset needed.
//
//   interactive-widget=overlays-content has been REMOVED from index.html because
//   it conflicts with Native resize: it tells WebKit to keep the layout viewport
//   full-size while Capacitor tries to shrink the frame, producing stale state.
//
//   The --kb variable is kept purely as a diagnostic; it is NOT used in any
//   modal style. If keyboard events fire but the modal still misbehaves, the
//   logs below will show exactly what iOS reported.
//
// ─────────────────────────────────────────────────────────────────────────────

if (Capacitor.getPlatform() === 'ios') {
  // Prevent the outer WKWebView UIScrollView from rubber-banding.
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('[data-scroll]')) e.preventDefault();
  }, { passive: false });

  // Eager import — plugin must be ready before the first input is focused.
  import('@capacitor/keyboard').then(({ Keyboard, KeyboardResize }) => {
    Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(console.error);

    // ── Diagnostic logging ──────────────────────────────────────────────────
    const stamp = () =>
      `innerHeight=${window.innerHeight} --kb=${
        getComputedStyle(document.documentElement).getPropertyValue('--kb').trim()
      }`;

    const setKb = (h) => {
      document.documentElement.style.setProperty('--kb', `${h}px`);
    };

    // Store handles so listeners can be removed for debugging or cleanup.
    const handles = Promise.all([
      Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
        setKb(keyboardHeight);
        console.log(`[KB] keyboardWillShow  height=${keyboardHeight}  ${stamp()}`);
      }),
      Keyboard.addListener('keyboardDidShow', ({ keyboardHeight }) => {
        setKb(keyboardHeight);
        console.log(`[KB] keyboardDidShow   height=${keyboardHeight}  ${stamp()}`);
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        console.log(`[KB] keyboardWillHide  (clearing --kb)  ${stamp()}`);
        setKb(0);
      }),
      Keyboard.addListener('keyboardDidHide', () => {
        setKb(0);
        console.log(`[KB] keyboardDidHide   (final)  ${stamp()}`);
      }),
    ]);

    // Expose cleanup on window so it can be called from Safari DevTools:
    //   window.__removeKbListeners()
    window.__removeKbListeners = async () => {
      const hs = await handles;
      await Promise.all(hs.map((h) => h.remove()));
      console.log('[KB] All keyboard listeners removed.');
    };
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
