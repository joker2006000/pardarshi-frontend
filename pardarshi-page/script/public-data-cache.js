(() => {
    const CACHE_NAME = 'pardarshi-public-data-v1';
    const MEMORY_PREFIX = 'pardarshi-public-data-v1:';
    const memory = new Map();
    const inFlight = new Map();

    function getGuestToken(options) {
        const headers = options && options.headers;
        if (!headers) return '';
        if (typeof headers.get === 'function') return headers.get('x-guest-token') || '';
        return headers['x-guest-token'] || headers['X-Guest-Token'] || '';
    }

    function hashKey(value) {
        let first = 2166136261;
        let second = 2246822519;
        for (let index = 0; index < value.length; index++) {
            const character = value.charCodeAt(index);
            first = Math.imul(first ^ character, 16777619);
            second = Math.imul(second ^ character, 3266489917);
        }
        return `${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}-${value.length.toString(36)}`;
    }

    function cacheKey(url, options) {
        return hashKey(`${new URL(url, window.location.href).href}\n${getGuestToken(options)}`);
    }

    function cacheRequest(key) {
        return new Request(`${window.location.origin}/__pardarshi_data_cache__/${key}`);
    }

    async function read(url, options) {
        const key = cacheKey(url, options);
        const stored = memory.get(key);
        if (stored) return JSON.parse(stored);

        if ('caches' in window) {
            try {
                const cache = await window.caches.open(CACHE_NAME);
                const response = await cache.match(cacheRequest(key));
                if (response) {
                    const value = await response.json();
                    const serialized = JSON.stringify(value);
                    memory.set(key, serialized);
                    return value;
                }
            } catch (error) {
                console.warn('Browser data cache read failed.', error);
            }
        }

        try {
            const serialized = window.localStorage.getItem(MEMORY_PREFIX + key);
            if (serialized) {
                memory.set(key, serialized);
                return JSON.parse(serialized);
            }
        } catch (error) {
            console.warn('Local data cache read failed.', error);
        }
        return null;
    }

    async function write(url, options, value) {
        const key = cacheKey(url, options);
        const serialized = JSON.stringify(value);
        memory.set(key, serialized);

        if ('caches' in window) {
            try {
                const cache = await window.caches.open(CACHE_NAME);
                await cache.put(
                    cacheRequest(key),
                    new Response(serialized, { headers: { 'Content-Type': 'application/json' } })
                );
                return;
            } catch (error) {
                console.warn('Browser data cache write failed.', error);
            }
        }

        try {
            window.localStorage.setItem(MEMORY_PREFIX + key, serialized);
        } catch (error) {
            console.warn('Local data cache write failed.', error);
        }
    }

    async function refresh(url, options = {}) {
        const key = cacheKey(url, options);
        if (inFlight.has(key)) return inFlight.get(key);

        const request = (async () => {
            const response = await window.fetch(url, Object.assign({}, options, { cache: 'no-store' }));
            const value = await response.json();
            if (value && value.success === true) await write(url, options, value);
            return value;
        })();
        inFlight.set(key, request);

        try {
            return await request;
        } finally {
            inFlight.delete(key);
        }
    }

    async function load(url, options, onData) {
        const cached = await read(url, options);
        if (cached !== null) {
            onData(cached, { cached: true });
            refresh(url, options).then(value => {
                if (value && value.success === true) {
                    onData(value, { cached: false });
                } else {
                    console.warn('Background data refresh returned no successful result.', url);
                }
            }).catch(error => {
                console.warn('Background data refresh failed.', error);
            });
            return cached;
        }

        const value = await refresh(url, options);
        onData(value, { cached: false });
        return value;
    }

    window.PardarshiDataCache = { load, read, refresh };
})();
