document.addEventListener('DOMContentLoaded', async () => {
    // Verify if running in native Android container
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
        return;
    }

    const { App, PushNotifications } = window.Capacitor.Plugins;
    const API_BASE = 'https://pardarshi-server-1.onrender.com';

    // Helper: Sync FCM Token with Node.js Server
    async function syncTokenToServer(fcmToken) {
        const guestToken = localStorage.getItem('pardarshi_guest_token');
        const orgSlug = new URLSearchParams(window.location.search).get('org') || localStorage.getItem('pardarshi_last_org');

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
            console.log('✅ FCM device token synced to server');
        } catch (err) {
            console.warn('⚠️ Token sync deferred:', err);
        }
    }

    // -------------------------------------------------------------
    // 1. DYNAMIC DEEP LINK INTERCEPTOR (Cold Start & App In-Memory)
    // -------------------------------------------------------------
    App.addListener('appUrlOpen', (event) => {
        try {
            const incomingUrl = new URL(event.url);
            const token = incomingUrl.searchParams.get('token');
            const org = incomingUrl.searchParams.get('org');

            // Persist session tokens immediately
            if (token) localStorage.setItem('pardarshi_guest_token', token);
            if (org) localStorage.setItem('pardarshi_last_org', org);

            // Re-sync push token now that org/contributor context exists
            const savedFcmToken = localStorage.getItem('pardarshi_fcm_token');
            if (savedFcmToken) syncTokenToServer(savedFcmToken);

            // Route to incoming target path (preserves query params like type, txn_id, etc.)
            const targetRoute = incomingUrl.pathname + incomingUrl.search;
            if (targetRoute && targetRoute !== window.location.pathname + window.location.search) {
                window.location.href = targetRoute;
            }
        } catch (e) {
            console.error('Deep link parse error:', e);
        }
    });

    // -------------------------------------------------------------
    // 2. NATIVE PUSH NOTIFICATION (FCM / Background Waker)
    // -------------------------------------------------------------
    try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === 'granted') {
            await PushNotifications.register();
        }
    } catch (e) {
        console.warn('Notification permission check failed:', e);
    }

    // Token Registration Callback
    PushNotifications.addListener('registration', async (token) => {
        console.log('✅ Native FCM Token:', token.value);
        localStorage.setItem('pardarshi_fcm_token', token.value);
        await syncTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
        console.error('FCM Registration Error:', error);
    });

    // Handle Tap on Background Notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const payloadData = notification.notification.data;
        if (payloadData && payloadData.url) {
            window.location.href = payloadData.url;
        }
    });
});


// Helper: Route the user based on the URL
    function handleDeepLink(urlStr) {
        if (!urlStr) return;
        try {
            const incomingUrl = new URL(urlStr);
            const token = incomingUrl.searchParams.get('token');
            const org = incomingUrl.searchParams.get('org');

            // Persist tokens
            if (token) localStorage.setItem('pardarshi_guest_token', token);
            if (org) localStorage.setItem('pardarshi_last_org', org);

            // Re-sync push token now that org/contributor context exists
            const savedFcmToken = localStorage.getItem('pardarshi_fcm_token');
            if (savedFcmToken) syncTokenToServer(savedFcmToken);

            // Navigate to the correct page
            const targetRoute = incomingUrl.pathname + incomingUrl.search;
            
            // Prevent endless looping if already on the correct page
            if (targetRoute && targetRoute !== window.location.pathname + window.location.search && targetRoute !== '/') {
                window.location.href = targetRoute;
            }
        } catch (e) {
            console.error('Deep link parse error:', e);
        }
    }

    // 1. App is currently running in the background (Warm Start)
    App.addListener('appUrlOpen', (event) => {
        handleDeepLink(event.url);
    });

    // 2. App was completely closed and just opened via a link (Cold Start)
    App.getLaunchUrl().then((launchData) => {
        if (launchData && launchData.url) {
            handleDeepLink(launchData.url);
        }
    });