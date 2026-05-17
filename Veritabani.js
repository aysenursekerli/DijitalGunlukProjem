/**
 * DatabaseManager: Tarayıcının yerleşik IndexedDB veritabanını kullanarak
 * defterleri ve çizimleri çevrimdışı (offline) olarak cihaz hafızasına kaydeder.
 */
export const DatabaseManager = {
    dbName: 'diaryDB', // Veritabanı adı
    version: 2,        // Veritabanı sürümü. Yapı değiştiğinde (yeni tablo vb.) bu sayı artırılır.
    db: null,          // Veritabanı bağlantı objesini tutar

    /**
     * Veritabanı bağlantısını başlatır (Açılışta çağrılır).
     * @returns {Promise} Bağlantı başarılı olursa çözümlenir (resolve).
     */
    async init() {
        return new Promise((resolve, reject) => {
            // Veritabanı açma isteği gönder
            const request = indexedDB.open(this.dbName, this.version);
            
            // Hata oluşursa Promise'i reddet
            request.onerror = () => reject(request.error);
            
            // Bağlantı başarılı olursa veritabanı objesini kaydet ve işlemi bitir
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            // Veritabanı ilk kez oluşturulurken veya sürümü (version) güncellendiğinde tetiklenir
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // 'notebooks' (Defterler) tablosu yoksa oluştur. 'id' sütununu birincil anahtar (keyPath) yap.
                if (!db.objectStoreNames.contains('notebooks')) {
                    db.createObjectStore('notebooks', { keyPath: 'id' });
                }
                
                // 'drawings' (Çizimler) tablosu yoksa oluştur. Her kayda otomatik artan bir 'id' ver (autoIncrement).
                if (!db.objectStoreNames.contains('drawings')) {
                    db.createObjectStore('drawings', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    },

    /**
     * Defter dizisini (Array) veritabanına kaydeder.
     * @param {Array} notebooks - Kaydedilecek defterlerin listesi
     */
    async saveNotebooks(notebooks) {
        if (!this.db) return; // Bağlantı yoksa işlem yapma
        
        // 'notebooks' tablosunda okuma/yazma (readwrite) işlemi başlat
        const tx = this.db.transaction('notebooks', 'readwrite');
        const store = tx.objectStore('notebooks');
        
        // Tüm defterleri tek tek veritabanına yaz (var olanı günceller, yoksa ekler)
        for (let nb of notebooks) {
            await new Promise((resolve, reject) => {
                const req = store.put(nb);
                req.onsuccess = resolve;
                req.onerror = reject;
            });
        }
    },

    /**
     * Veritabanında kayıtlı olan tüm defterleri belleğe yükler.
     * @returns {Promise<Array>} Kayıtlı defterler dizisi döner.
     */
    async loadNotebooks() {
        if (!this.db) return [];
        return new Promise((resolve, reject) => {
            // Sadece okuma (readonly) işlemi başlatıyoruz
            const tx = this.db.transaction('notebooks', 'readonly');
            const store = tx.objectStore('notebooks');
            
            // Tüm defterleri getir
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Sayfaya yapılan tek bir çizim işlemini (stroke) veritabanına ekler.
     * @param {Object} drawing - Çizim noktalarını, rengini ve kalınlığını barındıran obje
     */
    async saveDrawing(drawing) {
        if (!this.db) return;
        const tx = this.db.transaction('drawings', 'readwrite');
        const store = tx.objectStore('drawings');
        
        return new Promise((resolve, reject) => {
            const req = store.add(drawing);
            req.onsuccess = resolve;
            req.onerror = reject;
        });
    },

    /**
     * Kayıtlı olan tüm çizimleri (her sayfanın, her defterin) veritabanından çeker.
     * @returns {Promise<Array>} Çizimler listesi döner.
     */
    async loadDrawings() {
        if (!this.db) return [];
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('drawings', 'readonly');
            const store = tx.objectStore('drawings');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Veritabanındaki tüm defterleri ve çizimleri kalıcı olarak siler (Uygulamayı sıfırlar).
     */
    async clearAll() {
        if (!this.db) return;
        const tx = this.db.transaction(['notebooks', 'drawings'], 'readwrite');
        await new Promise((resolve, reject) => {
            const req1 = tx.objectStore('notebooks').clear();
            const req2 = tx.objectStore('drawings').clear();
            req1.onsuccess = resolve;
            req1.onerror = reject;
        });
    },

    /**
     * Belirli bir sayfadaki (pageId) çizimleri, canvas motorundaki (currentHistory) en güncel haliyle senkronize eder.
     * Silinmiş veya geri alınmış (undo) çizimleri veritabanından temizleyip, yeni listeyi kaydeder.
     * 
     * @param {string} notebookId - Çizimin ait olduğu defterin ID'si
     * @param {string} pageId - Çizimin ait olduğu sayfanın ID'si
     * @param {Array} currentHistory - Sayfanın ekranda görünen en güncel çizim hareketleri (geçmişi)
     */
    async syncDrawings(notebookId, pageId, currentHistory) {
        if (!this.db) return;
        
        const tx = this.db.transaction('drawings', 'readwrite');
        const store = tx.objectStore('drawings');
        
        return new Promise((resolve, reject) => {
            // Önce tüm çizimleri al
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = async () => {
                const allDrawings = getAllRequest.result;
                
                // 1. ADIM: Bu sayfaya ait olan ESKİ kayıtları bul ve veritabanından SİL
                const deletePromises = allDrawings
                    .filter(d => d.notebookId === notebookId && d.pageId === pageId)
                    .map(d => {
                        return new Promise((resolveDelete, rejectDelete) => {
                            const deleteReq = store.delete(d.id);
                            deleteReq.onsuccess = resolveDelete;
                            deleteReq.onerror = rejectDelete;
                        });
                    });
                
                await Promise.all(deletePromises); // Tüm silme işlemleri bitene kadar bekle
                
                // 2. ADIM: Ekranda görünen (Güncel) kayıtları YENİDEN veritabanına ekle
                const savePromises = currentHistory
                    .filter(h => h.notebookId === notebookId && h.pageId === pageId)
                    .map(h => {
                        return new Promise((resolveSave, rejectSave) => {
                            const saveReq = store.add(h);
                            saveReq.onsuccess = resolveSave;
                            saveReq.onerror = rejectSave;
                        });
                    });
                
                await Promise.all(savePromises); // Tüm ekleme işlemleri bitene kadar bekle
                resolve();
            };
            getAllRequest.onerror = reject;
        });
    }
};
