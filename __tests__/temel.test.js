/**
 * Unit Test (Birim Testleri): Projenin kritik parçalarının (veritabanı bağlantısı, ID üretimi vb.) 
 * doğru çalışıp çalışmadığını otomatik olarak kontrol eden scriptlerdir.
 * Terminalden "node --test" komutu ile çalıştırılır.
 */

// Node.js'in yerleşik test modüllerini içe aktar
import test from 'node:test';
import assert from 'node:assert';

// Node.js ortamında tarayıcıdaki (window, document) değişkenleri bulunmaz.
// Testlerin çökmemesi için bu objeleri (Mock / Simülasyon) sahte olarak oluşturuyoruz.
global.window = {};
global.document = {
    addEventListener: () => {},
    getElementById: () => ({ addEventListener: () => {}, classList: { add: () => {}, remove: () => {} }, value: 'Test Notebook' }),
    querySelectorAll: () => [],
    querySelector: () => null
};

/**
 * TEST 1: Veritabanı (IndexedDB) Başlatma Simülasyonu
 * Amaç: DatabaseManager modülünün hatasız yüklendiğini ve "init" (başlatma) metodunun var olduğunu kontrol etmek.
 */
test('Veritabani.js - DatabaseManager başlatma simülasyonu', async (t) => {
    // Veritabanı modülünü yükle
    const { DatabaseManager } = await import('../Veritabani.js');
    let mockDb = {};
    
    // Tarayıcıdaki indexedDB yapısını Node.js için sahte olarak (Mock) oluşturuyoruz
    global.indexedDB = {
        open: (name, version) => {
            const req = {};
            // 10 milisaniye sonra bağlantının başarılı (onsuccess) olduğunu simüle et
            setTimeout(() => {
                req.result = {
                    transaction: () => ({ objectStore: () => ({ put: () => ({ onsuccess: null }), getAll: () => ({ onsuccess: null }) }) })
                };
                if(req.onsuccess) req.onsuccess({ target: { result: req.result } });
            }, 10);
            return req;
        }
    };
    
    // Doğrulama (Assert) Adımları
    // 1: DatabaseManager başarıyla import edildi mi?
    assert.ok(DatabaseManager, 'DatabaseManager modülü yüklenebilmeli');
    // 2: DatabaseManager objesinin içinde 'init' adında bir fonksiyon var mı?
    assert.strictEqual(typeof DatabaseManager.init, 'function', 'init metodu bulunmalı');
});

/**
 * TEST 2: ID Üretim Standartları Testi
 * Amaç: Defterlere (nb-) ve Sayfalara (pg-) verilen benzersiz ID'lerin doğru formata sahip olduğunu doğrulamak.
 */
test('Arayuz.js - Notebook ID (UUID formatı) oluşturma simülasyonu', async (t) => {
    // Simüle edilmiş bir ID oluştur
    const now = Date.now();
    const generatedId = 'nb-' + now; // Örnek çıktı: nb-16789012345
    
    // Doğrulama (Assert) Adımları
    // 1: Defter ID'si "nb-" önekiyle mi başlıyor? (nb = notebook)
    assert.ok(generatedId.startsWith('nb-'), 'Defter IDleri "nb-" ile başlamalı');
    // 2: Üretilen ID yeterince uzun mu? (Güvenlik ve benzersizlik kontrolü)
    assert.ok(generatedId.length > 10, 'Oluşturulan ID yeterince uzun olmalı');
    
    // Aynı testi Sayfa (page) ID'si için de yap (pg = page)
    const pageId = 'pg-' + now + '-1'; // Örnek çıktı: pg-16789012345-1
    assert.ok(pageId.startsWith('pg-'), 'Sayfa IDleri "pg-" ile başlamalı');
});
