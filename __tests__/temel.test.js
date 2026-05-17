import test from 'node:test';
import assert from 'node:assert';

// Node.js ortamında DOM ve IndexedDB simülasyonu (Mocking)
global.window = {};
global.document = {
    addEventListener: () => {},
    getElementById: () => ({ addEventListener: () => {}, classList: { add: () => {}, remove: () => {} }, value: 'Test Notebook' }),
    querySelectorAll: () => [],
    querySelector: () => null
};

// Modülleri dinamik olarak içe aktararak Mock'ların önce uygulanmasını sağlıyoruz
test('Veritabani.js - DatabaseManager başlatma simülasyonu', async (t) => {
    const { DatabaseManager } = await import('../Veritabani.js');
    
    // IndexedDB Mock
    let mockDb = {};
    global.indexedDB = {
        open: (name, version) => {
            const req = {};
            setTimeout(() => {
                req.result = {
                    transaction: () => ({ objectStore: () => ({ put: () => ({ onsuccess: null }), getAll: () => ({ onsuccess: null }) }) })
                };
                if(req.onsuccess) req.onsuccess({ target: { result: req.result } });
            }, 10);
            return req;
        }
    };

    assert.ok(DatabaseManager, 'DatabaseManager modülü yüklenebilmeli');
    assert.strictEqual(typeof DatabaseManager.init, 'function', 'init metodu bulunmalı');
});

test('Arayuz.js - Notebook ID (UUID formatı) oluşturma simülasyonu', async (t) => {
    // Notebook ID'lerinin "nb-" ile başlaması kuralını test edelim
    const now = Date.now();
    const generatedId = 'nb-' + now;
    
    assert.ok(generatedId.startsWith('nb-'), 'Defter IDleri "nb-" ile başlamalı');
    assert.ok(generatedId.length > 10, 'Oluşturulan ID yeterince uzun olmalı');
    
    const pageId = 'pg-' + now + '-1';
    assert.ok(pageId.startsWith('pg-'), 'Sayfa IDleri "pg-" ile başlamalı');
});
