self.addEventListener('push', function(event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'You have a new update.',
            icon: '/logo-1.png', 
            badge: '/logo-1.png', // Required for Android status bar
            vibrate: [200, 100, 200], // Forces hardware vibration
            requireInteraction: true, // Keeps it on screen until swiped away
            data: {
                url: data.url || '/' 
            }
        };

        // CRITICAL: event.waitUntil tells the OS "Do not kill this background 
        // process until the notification has successfully painted to the screen."
        event.waitUntil(
            self.registration.showNotification(data.title || 'Pardarshi Alert', options)
        );
    } catch (e) {
        console.error("Push event failed:", e);
    }
});

// Wakes up the app when the user taps the notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});