import { useEffect } from 'react';
import { messaging, getToken, onMessage } from '@/lib/firebase';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function usePushNotifications() {
  const { session, addNotification } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;
    if (!VAPID_KEY) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;

    let unsub;

    async function setup() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Reuse the already-registered workbox service worker
        const registration = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (!token) return;

        await supabase.from('push_tokens').upsert(
          { user_id: session.user.id, token, platform: 'web' },
          { onConflict: 'user_id,token' }
        );
      } catch {
        // Silently fail — push is enhancement, not critical
      }

      // Show foreground messages as in-app notifications
      unsub = onMessage(messaging, payload => {
        addNotification({
          title: payload.notification?.title ?? 'CampusRun',
          body:  payload.notification?.body  ?? '',
          type:  payload.data?.type          ?? 'info',
        });
      });
    }

    setup();
    return () => { if (unsub) unsub(); };
  }, [session?.user?.id]);
}
