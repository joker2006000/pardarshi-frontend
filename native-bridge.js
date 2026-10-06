document.addEventListener('DOMContentLoaded', async () => {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { App, PushNotifications } = window.Capacitor.Plugins;

        // 1. Intercept Deep Links
        App.addListener('appUrlOpen', (event) => {
            const url = new URL(event.url);
            const token = url.searchParams.get('token');
            const org = url.searchParams.get('org');

            if (token) localStorage.setItem('pardarshi_guest_token', token);
            if (org) {
                localStorage.setItem('pardarshi_last_org', org);
                const path = window.location.pathname;
                if (path.includes('project')) window.location.href = `/project?org=${org}&proj=${url.searchParams.get('proj') || ''}`;
                else if (path.includes('support')) window.location.href = `/support?org=${org}`;
                else window.location.href = `/org?org=${org}`;
            }
        });

        // 2. Register FCM Device Token
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();
        PushNotifications.addListener('registration', async (token) => {
            const orgSlug = new URLSearchParams(window.location.search).get('org');
            const guestToken = localStorage.getItem('pardarshi_guest_token');
            if (orgSlug) {
                await fetch('https://pardarshi-server-1.onrender.com/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guest_token: guestToken, org_slug: orgSlug, fcm_token: token.value })
                });
            }
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            if (notification.notification.data.url) window.location.href = notification.notification.data.url;
        });
    }
});