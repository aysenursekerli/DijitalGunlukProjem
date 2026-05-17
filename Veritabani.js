export const DatabaseManager = {
    dbName: 'diaryDB',
    version: 2,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (db.objectStoreNames.contains('notebooks')) db.deleteObjectStore('notebooks');
                if (db.objectStoreNames.contains('drawings')) db.deleteObjectStore('drawings');
                
                db.createObjectStore('notebooks', { keyPath: 'id' });
                db.createObjectStore('drawings', { keyPath: 'id', autoIncrement: true });
            };
        });
    },

    async saveNotebooks(notebooks) {
        if (!this.db) return;
        const tx = this.db.transaction('notebooks', 'readwrite');
        const store = tx.objectStore('notebooks');
        
        for (let nb of notebooks) {
            await new Promise((resolve, reject) => {
                const req = store.put(nb);
                req.onsuccess = resolve;
                req.onerror = reject;
            });
        }
    },

    async loadNotebooks() {
        if (!this.db) return [];
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('notebooks', 'readonly');
            const store = tx.objectStore('notebooks');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

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

    async syncDrawings(notebookId, pageId, currentHistory) {
        if (!this.db) return;
        
        const tx = this.db.transaction('drawings', 'readwrite');
        const store = tx.objectStore('drawings');
        
        // İlgili sayfa ve defter için tüm eski çizimleri sil
        return new Promise((resolve, reject) => {
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = async () => {
                const allDrawings = getAllRequest.result;
                
                // Silmek için de transaction gerekli
                const deletePromises = allDrawings
                    .filter(d => d.notebookId === notebookId && d.pageId === pageId)
                    .map(d => {
                        return new Promise((resolveDelete, rejectDelete) => {
                            const deleteReq = store.delete(d.id);
                            deleteReq.onsuccess = resolveDelete;
                            deleteReq.onerror = rejectDelete;
                        });
                    });
                
                await Promise.all(deletePromises);
                
                // Yeni çizimleri ekle
                const savePromises = currentHistory
                    .filter(h => h.notebookId === notebookId && h.pageId === pageId)
                    .map(h => {
                        return new Promise((resolveSave, rejectSave) => {
                            const saveReq = store.add(h);
                            saveReq.onsuccess = resolveSave;
                            saveReq.onerror = rejectSave;
                        });
                    });
                
                await Promise.all(savePromises);
                resolve();
            };
            
            getAllRequest.onerror = reject;
        });
    }
};

// === UYGULAMA DURUM (PHASE) YÖNETİCİSİ ===