import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function usePushNotifications() {
  const { session, addNotification } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;

    if (Capacitor.isNativePlatform()) {
      setupNative(session.user.id, addNotification);
    } else {
      setupWeb(session.user.id, addNotification);
    }
  }, [session?.user?.id]);
}

// ── Native Android (Capacitor PushNotifications) ───────────────────

async function setupNative(userId, addNotification) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const { receive } = await PushNotifications.checkPermissions();
    let finalStatus = receive;

    if (receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      finalStatus = result.receive;
    }

    if (finalStatus !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async ({ value: token }) => {
      // Remove old web (Chrome) tokens so notifications only come from the native app
      await supabase.from('push_tokens').delete()
        .eq('user_id', userId).eq('platform', 'web');

      await supabase.from('push_tokens').upsert(
        { user_id: userId, token, platform: 'android' },
        { onConflict: 'user_id,token' },
      );
    });

    PushNotifications.addListener('registrationError', err => {
      console.error('[CampusRun Push] FCM registration error:', JSON.stringify(err));
    });

    PushNotifications.addListener('pushNotificationReceived', notification => {
      addNotification({
        title: notification.title ?? 'CampusRun',
        body:  notification.body  ?? '',
        type:  notification.data?.type ?? 'info',
      });
    });
  } catch (err) {
    console.error('[CampusRun Push] Setup error:', err?.message ?? err);
  }
}

// ── Web (Firebase Web SDK) ─────────────────────────────────────────

async function setupWeb(userId, addNotification) {
  if (!VAPID_KEY) return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'denied') return;

  try {
    const { getMessagingInstance, getToken, onMessage } = await import('@/lib/firebase');

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
      { user_id: userId, token, platform: 'web' },
      { onConflict: 'user_id,token' },
    );

    onMessage(messaging, payload => {
      addNotification({
        title: payload.notification?.title ?? 'CampusRun',
        body:  payload.notification?.body  ?? '',
        type:  payload.data?.type          ?? 'info',
      });
    });
  } catch {
    // Push is an enhancement — silently ignore errors
  }
}
