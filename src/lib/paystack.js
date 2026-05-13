export const PAYSTACK_PUBLIC_KEY = 'pk_test_db94ec1afa8e6699c8693e6a93818d0f1aca78b7';

/**
 * Lazily injects the Paystack inline script and resolves when ready.
 * Polls up to 10 seconds before rejecting.
 */
export const ensurePaystack = () =>
  new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    if (!document.getElementById('paystack-script')) {
      const s = document.createElement('script');
      s.id = 'paystack-script';
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.async = true;
      document.head.appendChild(s);
    }
    let attempts = 0;
    const poll = setInterval(() => {
      if (window.PaystackPop) { clearInterval(poll); resolve(); }
      else if (++attempts > 50) { clearInterval(poll); reject(new Error('Paystack failed to load')); }
    }, 200);
  });