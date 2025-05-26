// flask_gps_ponto/static/service-worker.js

const CACHE_NAME = 'controle-ponto-cache-v2';  // ✅ Incrementado para controle de versão
const urlsToCache = [
    '/',
    '/static/style.css',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png'
];

// ✅ Durante a instalação do Service Worker
self.addEventListener('install', event => {
    console.log('✅ Service Worker: Instalando e cacheando arquivos essenciais...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ Service Worker: Arquivos adicionados ao cache');
            return cache.addAll(urlsToCache);
        })
    );
});

// ✅ Durante a ativação: limpa caches antigos
self.addEventListener('activate', event => {
    console.log('✅ Service Worker: Ativando e limpando caches antigos...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Deletando cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// ✅ Intercepta requisições de rede
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('✅ Service Worker: Respondendo com cache:', event.request.url);
                    return response;
                }
                console.log('🌐 Service Worker: Buscando na rede:', event.request.url);
                return fetch(event.request);
            })
    );
});
