/* Baby Pet — funciona sem internet.
   Páginas e código: tenta a internet primeiro (assim as atualizações chegam sozinhas) e usa a cópia salva se estiver offline.
   Imagens: usa a cópia salva primeiro. */
const CACHE = 'babypet-v2';
const BASE = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'assets/babi.png', 'assets/cuidadora.png', 'assets/cuidadora-busto.png', 'assets/botao.png',
  'assets/icon-192.png', 'assets/icon-512.png', 'assets/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const imagem = req.destination === 'image';
  e.respondWith(imagem
    ? caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; }))
    : fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
