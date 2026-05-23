export const OnboardingManager = {
    createManual() {
        const generateId = (prefix) => prefix + '-' + (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2));

        const notebookId = generateId('nb');
        const page1Id = generateId('pg');
        const page2Id = generateId('pg');
        
        return {
            id: notebookId,
            name: 'Memori Hızlı Başlangıç',
            coverColor: '#1e3a8a', 
            pattern: 'blank', 
            isUserManual: true, 
            isLocked: false,
            pinCode: '',
            createdAt: new Date().toISOString(),
            pages: [
                {
                    id: page1Id,
                    snapshot: null,
                    bgImage: '',
                    pattern: 'blank',
                    createdAt: new Date().toISOString(),
                    hideDate: true,
                    media: [
                        {
                            id: generateId('md'), type: 'text',
                            content: "Memori'ye Hoş Geldiniz!\n\nSağ üstteki menüden yeni sayfalar ekleyebilir, fotoğraflar ve emojilerle anılarınızı canlandırabilirsiniz.\n\nSayfayı çevirmek için köşeden tutup sürükleyin! 👉",
                            x: 40, y: 80, width: 400, height: 250, rotation: 0, zIndex: 10
                        },
                        {
                            id: generateId('md'), type: 'image',
                            content: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=350&q=80",
                            x: 60, y: 350, width: 300, height: 200, rotation: -3, zIndex: 5
                        },
                        {
                            id: generateId('md'), type: 'sticker', content: "📌", x: 200, y: 330, width: 40, height: 40, rotation: 0, zIndex: 6
                        },
                        {
                            id: generateId('md'), type: 'sticker', content: "✨", x: 340, y: 380, width: 50, height: 50, rotation: 15, zIndex: 7
                        }
                    ]
                },
                {
                    id: page2Id,
                    snapshot: null,
                    bgImage: '',
                    pattern: 'dotted',
                    createdAt: new Date().toISOString(),
                    hideDate: true,
                    media: [
                        {
                            id: generateId('md'), type: 'text',
                            content: "Kalemleri Keşfedin 🎨\n\nÜstteki ikonlara tıklayarak çizim moduna geçin.\n\n• Normal Kalem: Notlarınızı alın.\n• Dolma Kalem: Estetik çizimler yapın.\n• Fosforlu Kalem: Önemli yerleri vurgulayın!\n\n(Örnek olarak yukarıdan fosforlu kalemi seçip bu cümlenin üstünü çizmeyi deneyin.)\n\nHadi, sol üstten Kütüphaneye Dön butonuna basın ve ilk ajandanızı oluşturmaya başlayın! 🚀",
                            x: 40, y: 80, width: 400, height: 400, rotation: 0, zIndex: 10
                        }
                    ]
                }
            ]
        };
    }
};
