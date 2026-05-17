/**
 * Service Worker: Uygulamanın internet bağlantısı olmadan (Offline) çalışmasını sağlar.
 * PWA (Progressive Web App) standartlarının en önemli parçasıdır.
 */

// Önbellek (Cache) deposunun adı. Dosyaları güncellediğimizde bu versiyon numarasını (v1 -> v2) artırmalıyız.
const CACHE_NAME = 'ajanda-cache-v1';

// Çevrimdışı çalışabilmesi için cihaz hafızasına indirilecek dosyaların listesi
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './Arayuz.js',
  './CanvasMotoru.js',
  './Veritabani.js',
  './TemplateManager.js',
  './manifest.json',
  './assets/icons/icon.svg',
  'https://unpkg.com/lucide@latest', // Dışarıdan alınan İkon Kütüphanesi
  'https://cdn.jsdelivr.net/npm/page-flip/dist/js/page-flip.browser.js', // Sayfa çevirme kütüphanesi
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700&display=swap' // Yazı Tipleri
];

/**
 * 1. KURULUM (INSTALL) AŞAMASI
 * Kullanıcı siteye ilk girdiğinde tetiklenir.
 * ASSETS_TO_CACHE listesindeki tüm dosyaları indirip cihaz hafızasına kopyalar.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Önbellek (Cache) başarıyla açıldı ve dosyalar indiriliyor...');
        // Promise.allSettled kullanılarak bir dosya inmese bile diğerlerinin inmeye devam etmesi sağlanır
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Dosya önbelleğe alınamadı:', url, err)))
        );
      })
  );
});

/**
 * 2. GETİRME (FETCH) AŞAMASI
 * Uygulama her bir dosya veya resim istediğinde (örneğin Arayuz.js'yi yüklerken) araya girer.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    // Önce istenen dosya cihaz hafızasında (Cache) var mı diye kontrol et
    caches.match(event.request)
      .then(response => {
        // Eğer dosya Cache'de varsa, internete bağlanmadan doğrudan Cache'den ver (İnternetsiz çalışma anı)
        if (response) {
          return response;
        }
        
        // Eğer dosya Cache'de YOKSA, normal bir şekilde internetten indir
        return fetch(event.request).then(
          function(response) {
            // Gelen veri bozuksa veya geçersizse doğrudan geri döndür
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Eğer internetten başarılı bir şekilde dosya indirildiyse, 
            // bir kopyasını al (clone) ve ileride internetsiz kullanılabilmesi için Cache'e kaydet.
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});

/**
 * 3. AKTİFLEŞTİRME (ACTIVATE) AŞAMASI
 * Service Worker güncellendiğinde (örneğin v1'den v2'ye geçildiğinde) çalışır.
 * Amacı: Eski versiyonda kalmış gereksiz Cache dosyalarını silerek cihaz hafızasında yer açmaktır.
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // İsimler eşleşmiyorsa (yani eski bir Cache ise) tamamen sil
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
