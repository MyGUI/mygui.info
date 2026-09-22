/* Serve this file beside the game, within the same URL directory. */
if (typeof window === 'undefined') {
    // A service worker supplies isolation headers on static hosts. It does not
    // cache assets; new builds and normal HTTP cache validation remain effective.
    self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
    self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', event => {
        const request = event.request;
        if (new URL(request.url).origin !== self.location.origin ||
            (request.cache === 'only-if-cached' && request.mode !== 'same-origin')) return;
        event.respondWith(fetch(request).then(response => {
            if (response.status === 0) return response;
            const headers = new Headers(response.headers);
            headers.set('Cross-Origin-Opener-Policy', 'same-origin');
            headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
            return new Response(response.body, {
                status: response.status, statusText: response.statusText, headers
            });
        }));
    });
} else {
    (async () => {
        const reloadKey = 'grid-racer-isolation-reload';
        if (!window.crossOriginIsolated) {
            if (!window.isSecureContext || !('serviceWorker' in navigator)) {
                throw new Error('Threaded gameplay requires HTTPS or localhost and service worker support.');
            }
            await navigator.serviceWorker.register('GridRacerIsolation.js', { scope: './' });
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Isolation setup timed out.')), 15000);
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        clearTimeout(timeout);
                        resolve();
                    }, { once: true });
                });
            }
            if (sessionStorage.getItem(reloadKey)) {
                throw new Error('The browser could not enable cross-origin isolation.');
            }
            sessionStorage.setItem(reloadKey, '1');
            location.reload();
            return;
        }
        sessionStorage.removeItem(reloadKey);
        if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error('The browser does not support shared memory.');
        }
        // Do not execute Emscripten until the document can create shared memory.
        const template = document.getElementById('game-script');
        for (const source of template.content.querySelectorAll('script')) {
            const script = document.createElement('script');
            for (const attribute of source.attributes) script.setAttribute(attribute.name, attribute.value);
            script.textContent = source.textContent;
            document.body.appendChild(script);
        }
    })().catch(error => {
        console.error(error);
        Module.onAbort();
    });
}
