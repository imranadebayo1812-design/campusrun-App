import { useEffect } from 'react';
import { getMessagingInstance, getToken, onMessage } from '@/lib/firebase';
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
        const messaging = await getMessagingInstance();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (!token) return;

        await supabase.from('push_tokens').upsert(
          { user_id: session.user.id, token, platform: 'web' },
          { onConflict: 'user_id,token' },
        );

        unsub = onMessage(messaging, payload => {
          addNotification({
            title: payload.notification?.title ?? 'CampusRun',
            body:  payload.notification?.body  ?? '',
            type:  payload.data?.type          ?? 'info',
          });
        });
      } catch {
        // Push is an enhancement — silently ignore all errors
      }
    }

    setup();
    return () => { if (unsub) unsub(); };
  }, [session?.user?.id]);
}
