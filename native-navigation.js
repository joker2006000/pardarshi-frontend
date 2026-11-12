(function () {
    const capacitor = window.Capacitor;
    if (!capacitor || !capacitor.isNativePlatform()) return;

    const config = window.PARDARSHI_NATIVE_PAGE_CONFIG;
    const allowedRoutes = config && Array.isArray(config.allowedRoutes)
        ? config.allowedRoutes
        : [];

    if (!config || !Array.isArray(config.allowedRoutes)) {
        console.error('Native page configuration is missing or invalid; all routes are blocked.');
    }

    const plugins = capacitor.Plugins || {};
    const app = plugins.App;
    const browser = plugins.Browser;
    const openingUrls = new Set();
    const recentlyOpenedUrls = new Map();
    let lastAllowedUrl = null;
    let deepLinkDestination = null;
    let deepLinkNavigationStarted = false;
    let startupNavigationHandled = false;
    let launchCheckPromise = Promise.resolve();

    function normalizePath(pathname) {
        if (pathname.length > 1) return pathname.replace(/\/+$/, '');
        return pathname;
    }

    function routeMatches(route, pathname) {
        if (typeof route !== 'string' || !route.startsWith('/')) return false;

        const routeParts = normalizePath(route).split('/');
        const pathParts = normalizePath(pathname).split('/');
        if (routeParts.length !== pathParts.length) return false;

        return routeParts.every((part, index) =>
            part.startsWith(':') ? pathParts[index].length > 0 : part === pathParts[index]
        );
    }

    function isAllowed(url) {
        return url.origin === window.location.origin &&
            allowedRoutes.some(route => routeMatches(route, url.pathname));
    }

    if (!isAllowed(new URL(window.location.href))) {
        document.documentElement.style.visibility = 'hidden';
    }

    function openExternal(url) {
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return Promise.resolve(false);
        if (openingUrls.has(url.href)) return Promise.resolve(false);

        const now = Date.now();
        recentlyOpenedUrls.forEach((openedAt, openedUrl) => {
            if (now - openedAt >= 1500) recentlyOpenedUrls.delete(openedUrl);
        });
        const lastOpenedAt = recentlyOpenedUrls.get(url.href);
        if (lastOpenedAt && now - lastOpenedAt < 1500) return Promise.resolve(false);
        recentlyOpenedUrls.set(url.href, now);

        if (!browser || typeof browser.open !== 'function') {
            console.error('Capacitor Browser plugin is unavailable; cannot open:', url.href);
            return Promise.resolve(false);
        }

        openingUrls.add(url.href);
        return browser.open({ url: url.href })
            .then(() => true)
            .catch(error => {
                console.error('Failed to open external page:', url.href, error);
                return false;
            })
            .finally(() => openingUrls.delete(url.href));
    }

    function navigate(urlValue) {
        let destination;
        try {
            destination = new URL(urlValue, window.location.href);
        } catch (error) {
            console.error('Invalid navigation URL:', urlValue, error);
            return Promise.resolve(false);
        }

        if (isAllowed(destination)) {
            if (destination.href !== window.location.href) {
                window.location.assign(destination.href);
            }
            return Promise.resolve(true);
        }

        return openExternal(destination);
    }

    const originalWindowOpen = window.open;
    window.open = function (urlValue, target, features) {
        if (urlValue == null || urlValue === '') {
            return originalWindowOpen.call(window, urlValue, target, features);
        }

        let destination;
        try {
            destination = new URL(urlValue, window.location.href);
        } catch (error) {
            console.error('Invalid window.open URL:', urlValue, error);
            return null;
        }

        if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
            return originalWindowOpen.call(window, urlValue, target, features);
        }

        if (isAllowed(destination)) {
            window.location.assign(destination.href);
        } else {
            openExternal(destination);
        }
        return null;
    };

    window.PardarshiNativeNavigation = {
        isAllowed: urlValue => {
            try {
                return isAllowed(new URL(urlValue, window.location.href));
            } catch (error) {
                console.error('Invalid route URL:', urlValue, error);
                return false;
            }
        },
        navigate
    };

    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const clickTarget = event.target instanceof Element
            ? event.target
            : event.target && event.target.parentElement;
        const link = clickTarget && clickTarget.closest('a[href]');
        if (!link || link.hasAttribute('download')) return;

        let destination;
        try {
            destination = new URL(link.href, window.location.href);
        } catch (error) {
            console.error('Invalid link URL:', link.href, error);
            return;
        }

        if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return;

        if (!isAllowed(destination)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openExternal(destination);
            return;
        }

        if (link.target && link.target !== '_self') {
            event.preventDefault();
            window.location.assign(destination.href);
        }
    }, true);

    document.addEventListener('submit', event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== 'get') return;

        let destination;
        try {
            destination = new URL(form.action, window.location.href);
        } catch (error) {
            console.error('Invalid form URL:', form.action, error);
            return;
        }

        if ((destination.protocol === 'http:' || destination.protocol === 'https:') &&
            !isAllowed(destination)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                if (typeof value === 'string') destination.searchParams.append(key, value);
            }
            openExternal(destination);
        }
    }, true);

    ['pushState', 'replaceState'].forEach(method => {
        const original = window.history[method];
        window.history[method] = function (state, title, url) {
            if (url == null) return original.apply(this, arguments);

            let destination;
            try {
                destination = new URL(url, window.location.href);
            } catch (error) {
                console.error('Invalid history URL:', url, error);
                return;
            }

            if (!isAllowed(destination)) {
                openExternal(destination);
                return;
            }

            lastAllowedUrl = destination.href;
            return original.apply(this, arguments);
        };
    });

    window.addEventListener('popstate', () => {
        const currentUrl = new URL(window.location.href);
        if (isAllowed(currentUrl)) {
            lastAllowedUrl = currentUrl.href;
            return;
        }

        document.documentElement.style.visibility = 'hidden';
        openExternal(currentUrl);
        window.location.replace(lastAllowedUrl || 'about:blank');
    });

    window.addEventListener('load', () => {
        launchCheckPromise.then(() => {
            if (startupNavigationHandled) return;

            const currentUrl = new URL(window.location.href);
            if (isAllowed(currentUrl)) {
                lastAllowedUrl = currentUrl.href;
                return;
            }

            if (deepLinkDestination) {
                if (isAllowed(deepLinkDestination)) {
                    if (!deepLinkNavigationStarted) {
                        window.location.assign(deepLinkDestination.href);
                    }
                    return;
                }
                window.location.replace('about:blank');
                return;
            }

            if (currentUrl.pathname === '/' && !document.referrer) {
                window.location.replace('/mobile-start');
                return;
            }

            openExternal(currentUrl);
            window.location.replace('about:blank');
        });
    }, { once: true });

    if (app && typeof app.addListener === 'function') {
        const handleAppUrl = event => {
            if (!event || !event.url) return;

            try {
                const incomingUrl = new URL(event.url, window.location.href);
                deepLinkDestination = incomingUrl;
                const token = incomingUrl.searchParams.get('token');
                const org = incomingUrl.searchParams.get('org');
                if (token) localStorage.setItem('pardarshi_guest_token', token);
                if (org) localStorage.setItem('pardarshi_last_org', org);
                const savedFcmToken = localStorage.getItem('pardarshi_fcm_token');
                if (savedFcmToken && typeof window.PardarshiSyncPushToken === 'function') {
                    window.PardarshiSyncPushToken(savedFcmToken);
                }
            } catch (error) {
                console.error('Deep link parse error:', error);
            }

            deepLinkNavigationStarted = isAllowed(deepLinkDestination);
            navigate(event.url);
        };

        app.addListener('appUrlOpen', handleAppUrl)
            .catch(error => console.error('Failed to register app URL listener:', error));

        const launchHandledKey = 'pardarshi_native_launch_url_checked';
        if (typeof app.getLaunchUrl === 'function' &&
            window.location.pathname === '/' &&
            !sessionStorage.getItem(launchHandledKey)) {
            sessionStorage.setItem(launchHandledKey, 'true');
            launchCheckPromise = app.getLaunchUrl()
                .then(launch => {
                    if (launch && launch.url) handleAppUrl(launch);
                })
                .catch(error => console.error('Failed to read app launch URL:', error));
        }
    }

    if (window.location.pathname === '/' && !document.referrer) {
        launchCheckPromise.then(() => {
            startupNavigationHandled = true;
            if (deepLinkDestination) {
                if (isAllowed(deepLinkDestination)) {
                    if (!deepLinkNavigationStarted) navigate(deepLinkDestination.href);
                } else {
                    window.location.replace('about:blank');
                }
                return;
            }

            if (isAllowed(new URL(window.location.href))) return;
            window.location.replace('/mobile-start');
        });
    }
})();
