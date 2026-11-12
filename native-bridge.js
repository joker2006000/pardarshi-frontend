document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;

    const plugins = window.Capacitor.Plugins || {};
    const PushNotifications = plugins.PushNotifications;
    const API_BASE = 'https://pardarshi-server-1.onrender.com';

    if (!PushNotifications) {
        console.error('Capacitor push notification plugin is unavailable.');
        return;
    }

    async function syncTokenToServer(fcmToken) {
        const guestToken = localStorage.getItem('pardarshi_guest_token');
        const orgSlug = new URLSearchParams(window.location.search).get('org') ||
            localStorage.getItem('pardarshi_last_org');

        if (!fcmToken || (!guestToken && !orgSlug)) return;

        try {
            await fetch(`${API_BASE}/api/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guest_token: guestToken,
                    org_slug: orgSlug,
                    fcm_token: fcmToken
                })
            });
            console.log('FCM device token synced to server');
        } catch (error) {
            console.warn('FCM token sync deferred:', error);
        }
    }

    window.PardarshiSyncPushToken = syncTokenToServer;
    const savedFcmToken = localStorage.getItem('pardarshi_fcm_token');
    if (savedFcmToken) await syncTokenToServer(savedFcmToken);

    try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') {
            permission = await PushNotifications.requestPermissions();
        }

        if (permission.receive === 'granted') {
            await PushNotifications.register();
        }
    } catch (error) {
        console.warn('Notification permission check failed:', error);
    }

    PushNotifications.addListener('registration', async token => {
        localStorage.setItem('pardarshi_fcm_token', token.value);
        await syncTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', error => {
        console.error('FCM registration failed:', error);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
        const url = notification.notification.data && notification.notification.data.url;
        const navigation = window.PardarshiNativeNavigation;

        if (url && navigation) {
            navigation.navigate(url);
        }
    });
});
