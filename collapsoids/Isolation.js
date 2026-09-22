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
    // Browsers can restore the initial, non-isolated loader from their back/forward
    // cache after the worker takes control. Its startup promise already finished.
    window.addEventListener('pageshow', event => {
        if (event.persisted && !window.crossOriginIsolated) location.reload();
    });
    (async () => {
        const reloadKey = 'collapsoids-isolation-reload';
        if (!window.crossOriginIsolated) {
            if (!window.isSecureContext) {
                throw new Error('The page is not a secure context. Open the game using HTTPS or localhost.');
            }
            if (!navigator.serviceWorker) {
                throw new Error('Service workers are unavailable in this browser session. Try a regular tab instead of private browsing, and check browser settings.');
            }
            await navigator.serviceWorker.register('Isolation.js', { scope: './' });
            await navigator.serviceWorker.ready;
            // A hard reload can bypass an already active worker. A normal
            // navigation will be controlled once registration.ready resolves;
            // waiting for controllerchange here would never finish in that case.
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
        Module.onAbort(error);
    });
}
