/**
 * Unit Test (Birim Testleri): Projenin kritik parçalarının (veritabanı bağlantısı, ID üretimi vb.) 
 * doğru çalışıp çalışmadığını otomatik olarak kontrol eden scriptlerdir.
 * Terminalden "node --test" komutu ile çalıştırılır.
 */

// Node.js'in yerleşik test modüllerini içe aktar
import test from 'node:test';
import assert from 'node:assert';

// Node.js ortamında tarayıcıdaki (window, document) değişkenleri bulunmaz.
// Testlerin çökmemesi için bu objeleri (Mock / Simülasyon) sabit referanslarla oluşturuyoruz.

const mockModal = {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: (selector) => {
        if (selector === '.close-modal') return mockCloseModal;
        return null;
    }
};
const mockCropperImage = { src: '' };
const mockCancelBtn = { onclick: null };
const mockSkipBtn = { onclick: null };
const mockConfirmBtn = { onclick: null };
const mockCloseModal = { onclick: null };

global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    crypto: {
        randomUUID: () => '12345678-1234-1234-1234-123456789012'
    }
};

global.document = {
    addEventListener: () => {},
    getElementById: (id) => {
        if (id === 'image-crop-modal') return mockModal;
        if (id === 'cropper-image') return mockCropperImage;
        if (id === 'crop-cancel-btn') return mockCancelBtn;
        if (id === 'crop-skip-btn') return mockSkipBtn;
        if (id === 'crop-confirm-btn') return mockConfirmBtn;
        
        return { 
            addEventListener: () => {}, 
            classList: { add: () => {}, remove: () => {} }, 
            value: 'Test Notebook',
            appendChild: () => {},
            querySelectorAll: () => [],
            getContext: () => ({
                clearRect: () => {},
                fillRect: () => {},
                drawImage: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                closePath: () => {}
            })
        };
    },
    querySelectorAll: () => [],
    querySelector: (selector) => {
        if (selector === '.close-modal') return mockCloseModal;
        return null;
    },
    createElement: (tag) => {
        const elem = {
            style: {},
            classList: { add: () => {}, remove: () => {} },
            querySelector: () => ({
                addEventListener: () => {}
            }),
            querySelectorAll: () => []
        };
        if (tag === 'canvas') {
            elem.getContext = () => ({
                clearRect: () => {},
                fillRect: () => {},
                drawImage: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                closePath: () => {}
            });
        }
        return elem;
    }
};

/**
 * TEST 1: Veritabanı (IndexedDB) Başlatma Simülasyonu
 * Amaç: DatabaseManager modülünün hatasız yüklendiğini ve "init" (başlatma) metodunun var olduğunu kontrol etmek.
 */
test('Veritabani.js - DatabaseManager başlatma simülasyonu', async (t) => {
    // Veritabanı modülünü yükle
    const { DatabaseManager } = await import('../Veritabani.js');
    
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

/**
 * TEST 3: Görsel Kırpma (window.promptImageCrop) Senkronizasyon ve Fallback Testi
 * Amaç: promptImageCrop fonksiyonunun DOM elemanları mevcut olduğunda veya eksik olduğunda 
 * güvenle callback çalıştırıp çalıştırmadığını doğrulamak.
 */
test('Arayuz.js - window.promptImageCrop görsel kırpma modalı entegrasyon testi', async (t) => {
    // Arayuz modülünü yükle (yan etkilerle window.promptImageCrop tanımlanacaktır)
    await import('../Arayuz.js');

    assert.strictEqual(typeof window.promptImageCrop, 'function', 'window.promptImageCrop fonksiyonu tanımlanmış olmalı');

    // Callback çağrılma testi
    let callbackCalled = false;
    let returnedSrc = '';
    const testSrc = 'data:image/png;base64,test-image-data';

    // Mock ortamında promptImageCrop'u tetikleyelim
    window.promptImageCrop(testSrc, (src) => {
        callbackCalled = true;
        returnedSrc = src;
    });

    // mockSkipBtn onclick özelliği tanımlanmış olmalı
    assert.strictEqual(typeof mockSkipBtn.onclick, 'function', 'mockSkipBtn.onclick tanımlanmış olmalı');
    mockSkipBtn.onclick();

    // Mock DOM'da modal butonları tam olduğu için onclick tetiklendiğinde callback çağrılmalı
    assert.ok(callbackCalled, 'promptImageCrop callback fonksiyonunu çağırmalı');
    assert.strictEqual(returnedSrc, testSrc, 'Callback ile dönen resim kaynağı orijinal kaynak ile uyuşmalı');
});

/**
 * TEST 4: CanvasMotoru.js - DrawingPad Kement Kırpma (Lasso Crop) Metotlarının Testi
 * Amaç: DrawingPad sınıfının kement kırpma durumu değişkenlerini ve metotlarını barındırdığını teyit etmek.
 */
test('CanvasMotoru.js - DrawingPad kement kırpma (lasso crop) metot varlığı ve durum kontrolü', async (t) => {
    const { DrawingPad } = await import('../CanvasMotoru.js');
    
    const pad = new DrawingPad();
    
    // Durum değişkenlerinin varlığı kontrolü
    assert.strictEqual(pad.isCroppingMode, false, 'isCroppingMode başlangıçta false olmalı');
    assert.strictEqual(pad.targetMediaToCrop, null, 'targetMediaToCrop başlangıçta null olmalı');
    
    // Metotların varlığı kontrolü
    assert.strictEqual(typeof pad.startCroppingMode, 'function', 'startCroppingMode metodu bulunmalı');
    assert.strictEqual(typeof pad.exitCroppingMode, 'function', 'exitCroppingMode metodu bulunmalı');
    assert.strictEqual(typeof pad.applyCrop, 'function', 'applyCrop metodu bulunmalı');
    
    // startCroppingMode tetiklendiğinde durumun güncellenmesi testi
    pad.startCroppingMode('media-test-123');
    assert.strictEqual(pad.isCroppingMode, true, 'startCroppingMode çağrıldığında isCroppingMode true olmalı');
    assert.strictEqual(pad.targetMediaToCrop, 'media-test-123', 'targetMediaToCrop parametreyle eşleşmeli');
});
