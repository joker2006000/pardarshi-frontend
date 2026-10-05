self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'PARDARSHI', {
            body: data.body || 'New update available.',
            icon: '/logo-1.png',
            badge: '/favicon.ico'
        })
    );
});