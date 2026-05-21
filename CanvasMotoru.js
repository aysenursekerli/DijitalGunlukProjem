import { DatabaseManager } from './Veritabani.js';

/**
 * DrawingPad Sınıfı: Uygulamanın çizim (Canvas) ve etkileşim (zoom, medya ekleme) motorudur.
 * Kullanıcının ekranda yaptığı tüm çizim hareketlerini, kalem kalınlıklarını, silgi işlemlerini 
 * ve sayfaya eklenen sticker/şekilleri yönetir.
 */
export class DrawingPad {
    constructor() {
        this.currentMode = 'hand'; 
        this.color = '#333333';
        this.size = 3;
        this.globalHistory = []; 
        this.currentStroke = null;
        this.lastTime = null;
        this.zoomLevel = 1;
        this.pendingZoom = 1;
        this.draftCanvas = document.createElement('canvas');
        this.draftCtx = this.draftCanvas.getContext('2d', { willReadFrequently: true });
        this.activeCanvas = null;
        this.activePageContent = null;
        this.isEditing = false;
        this.initToolbar();
        this.initZoomLogic();
        this.setupMediaManager();
        window.addEventListener('resize', () => {
             if(this.isEditing && this.activeCanvas) {
                this.resizeCanvas(this.activeCanvas);
                this.redrawCanvas(this.activeCanvas);
             }
        });
    }

    /**
     * Araç Çubuğunu (Toolbar) Başlatır.
     * Kullanıcının seçtiği kalemi, rengi, boyutu ve 'Geri Al' (Undo) butonunun tıklanma olaylarını dinler.
     */
    initToolbar() {
        const tools = document.querySelectorAll('.tool-btn:not(.danger):not(#undo-btn)');
        const colorPicker = document.getElementById('color-picker');
        const sizePicker = document.getElementById('size-picker');
        const clearBtn = document.getElementById('menu-clear-page');
        const undoBtn = document.getElementById('undo-btn');
        if(undoBtn) undoBtn.addEventListener('click', () => this.undo());
        tools.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(!btn.dataset.tool) return; 
                if(btn.parentElement.classList.contains('dropdown')) return; 

                const popup = document.getElementById('thickness-popup');
                
                if (btn.classList.contains('active') && ['pen', 'fountain', 'highlighter', 'eraser'].includes(btn.dataset.tool)) {
                    popup.classList.toggle('active');
                    const rect = btn.getBoundingClientRect();
                    popup.style.left = rect.left + 'px';
                } else {
                    if(popup) popup.classList.remove('active');
                    tools.forEach(t => t.classList.remove('active'));
                    btn.classList.add('active');
                    this.setMode(btn.dataset.tool);
                }
            });
        });
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                colorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.color = btn.dataset.color;
                colorPicker.value = this.color; 
                const penBtn = document.querySelector('[data-tool="pen"]');
                if(!penBtn.classList.contains('active')) penBtn.click();
            });
        });
        colorPicker.addEventListener('input', (e) => {
            this.color = e.target.value;
            colorButtons.forEach(b => b.classList.remove('active'));
            const penBtn = document.querySelector('[data-tool="pen"]');
            if(!penBtn.classList.contains('active')) penBtn.click();
        });
        sizePicker.addEventListener('input', (e) => this.size = e.target.value);
        clearBtn.addEventListener('click', () => {
            if(!this.activeCanvas) return;
            if (!this.activeCanvas.dataset.page) {
                console.warn('Canvas sayfa numarası bulunamadı');
                return;
            }
            const pageId = this.activeCanvas.dataset.page;
            const notebookId = this.getActiveNotebookId();
            this.globalHistory = this.globalHistory.filter(s => !(s.notebookId === notebookId && s.pageId === pageId));
            DatabaseManager.syncDrawings(notebookId, pageId, this.globalHistory);
            this.redrawCanvas(this.activeCanvas);
            if(this.onRenderSidebar) this.onRenderSidebar();
        });
    }

    /**
     * Uygulama "Düzenleme Modu"na (Aşama 3) geçtiğinde çağrılır.
     * Sadece tek bir sayfanın üzerindeki Canvas'ı (tuvali) aktif hale getirir.
     * Böylece kullanıcı sadece o an ekranda açık olan sayfaya çizim yapabilir.
     * 
     * @param {HTMLCanvasElement} canvas - Üzerine çizim yapılacak HTML tuvali
     * @param {HTMLElement} pageContent - Sayfanın HTML içeriği (medyaların eklendiği katman)
     */
    attachToSinglePage(canvas, pageContent) {
        this.activeCanvas = canvas;
        this.activePageContent = pageContent;
        canvas.style.zIndex = "999";
        canvas.style.touchAction = "none";
        if(!canvas.dataset.hasEvents) {
            canvas.addEventListener('pointerdown', (e) => this.startDrawing(e, canvas), { passive: false });
            canvas.addEventListener('pointermove', (e) => this.draw(e, canvas), { passive: false });
            canvas.addEventListener('pointerup', () => this.stopDrawing());
            canvas.addEventListener('pointerout', () => this.stopDrawing());
            canvas.addEventListener('pointercancel', () => this.stopDrawing());
            canvas.addEventListener('touchstart', (e) => { if(this.currentMode !== 'hand') e.stopPropagation(); }, { passive: false });
            canvas.addEventListener('mousedown', (e) => { if(this.currentMode !== 'hand') e.stopPropagation(); });
            canvas.dataset.hasEvents = 'true';
        }
        this.setEditingState(true);
        pageContent.querySelectorAll('.static-media').forEach(el => el.remove());
        const pageId = canvas.dataset.page;
        const nb = this.getAppNotebooks().find(n => n.id === this.getActiveNotebookId());
        if(nb) {
            const page = nb.pages.find(p => p.id === pageId);
            if(page && page.media) {
                page.media.forEach(m => this.addMediaToPage(m, true));
            }
        }
    }

    /**
     * Kullanıcı düzenleme modundan çıktığında (Kütüphaneye döndüğünde) çağrılır.
     * Tuvali ve zoom (yakınlaştırma) seviyesini sıfırlar.
     */
    detachSinglePage() {
        if(this.activeCanvas) {
            this.activeCanvas.style.pointerEvents = 'none'; 
        }
        this.zoomLevel = 1;
        this.pendingZoom = 1;
        const zoomWrapper = document.getElementById('zoom-wrapper');
        if(zoomWrapper) zoomWrapper.style.transform = `scale(1)`;
        this.activeCanvas = null;
        this.activePageContent = null;
        this.setEditingState(false);
    }
    setEditingState(state) {
        this.isEditing = state;
        if(this.activeCanvas) {
            this.activeCanvas.style.pointerEvents = state && this.currentMode !== 'hand' ? 'auto' : 'none';
        }
    }

    /**
     * Geri Al (Undo) İşlemi:
     * Aktif sayfadaki en son yapılan çizimi bellekten siler ve tuvali (canvas) baştan çizdirir.
     */
    undo() {
        if(this.globalHistory.length === 0 || !this.activeCanvas) return;
        if (!this.activeCanvas.dataset.page) {
            console.warn('Canvas sayfa numarası bulunamadı');
            return;
        }
        const pageId = this.activeCanvas.dataset.page;
        const notebookId = this.getActiveNotebookId();
        for(let i = this.globalHistory.length -1; i >= 0; i--) {
            const stroke = this.globalHistory[i];
            if(stroke.notebookId === notebookId && stroke.pageId === pageId) {
                this.globalHistory.splice(i, 1);
                break;
            }
        }
        DatabaseManager.syncDrawings(notebookId, pageId, this.globalHistory);
        requestAnimationFrame(() => this.redrawCanvas(this.activeCanvas));
        if(this.onRenderSidebar) this.onRenderSidebar();
    }

    /**
     * Tuvali (Canvas) baştan sona yeniden çizer.
     * Özellikle sayfa çevrildiğinde veya silgi kullanıldığında mevcut geçmişi (history)
     * okuyarak ekrandaki çizgileri pürüzsüzce tekrar oluşturur.
     * 
     * @param {HTMLCanvasElement} canvas - Yeniden çizilecek olan tuval
     */
    redrawCanvas(canvas) {
        if(!canvas) return;
        if (!canvas.dataset.page) {
            console.warn('Canvas sayfa numarası bulunamadı');
            return;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        const pageId = canvas.dataset.page;
        const notebookId = this.getActiveNotebookId();
        const strokes = this.globalHistory.filter(s => s.notebookId === notebookId && s.pageId === pageId);
        strokes.forEach(stroke => {
            if (stroke.points.length === 0) return;
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            let actualLineWidth = stroke.normSize * canvas.width;
            if (stroke.mode === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = actualLineWidth * 2;
                ctx.globalAlpha = 1;
            } else if (stroke.mode === 'highlighter') {
                ctx.globalCompositeOperation = 'multiply';
                ctx.strokeStyle = stroke.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = actualLineWidth * 3;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color;
                ctx.globalAlpha = 1;
            }
            const startX = stroke.points[0].x * canvas.width;
            const startY = stroke.points[0].y * canvas.height;
            ctx.moveTo(startX, startY);
            for(let i = 1; i < stroke.points.length; i++) {
                const pt = stroke.points[i];
                if(stroke.mode === 'fountain' && pt.thicknessMultiplier) {
                    ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
                    ctx.lineWidth = actualLineWidth * pt.thicknessMultiplier;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
                } else {
                    ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
    }

    /**
     * Dokunmatik ekranlar ve fare tekerleği için Yakınlaştırma (Zoom) algoritmalarını içerir.
     * Kullanıcı iki parmağıyla (pinch-to-zoom) sayfaya yaklaşıp uzaklaşabilir.
     */
    initZoomLogic() {
        const zoomWrapper = document.querySelector('#view-edit #zoom-wrapper');
        const container = document.getElementById('edit-workspace');
        if(!zoomWrapper || !container) return;
        let initialDist = null;
        let activePointers = new Map();
        const getDistance = (p1, p2) => Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        container.addEventListener('pointerdown', (e) => {
            if(!this.isEditing) return;
            activePointers.set(e.pointerId, e);
            if(activePointers.size >= 2) this.stopDrawing();
        }, { capture: true });
        container.addEventListener('pointermove', (e) => {
            if(activePointers.has(e.pointerId)) activePointers.set(e.pointerId, e);
            if(activePointers.size === 2) {
                e.preventDefault(); e.stopPropagation();
                const ptrs = Array.from(activePointers.values());
                const dist = getDistance(ptrs[0], ptrs[1]);
                if(initialDist === null) {
                    initialDist = dist;
                } else {
                    const scaleChange = dist / initialDist;
                    let newZoom = this.zoomLevel * scaleChange;
                    newZoom = Math.min(Math.max(1, newZoom), 10);
                    zoomWrapper.style.transform = `scale(${newZoom})`;
                    this.pendingZoom = newZoom;
                }
            }
        }, { capture: true });
        const pointerEnd = (e) => {
            activePointers.delete(e.pointerId);
            if(activePointers.size < 2) {
                initialDist = null;
                if(this.pendingZoom && this.pendingZoom !== this.zoomLevel) {
                    this.zoomLevel = this.pendingZoom;
                    this.refreshAllCanvasesForZoom();
                }
            }
        };
        container.addEventListener('pointerup', pointerEnd, { capture: true });
        container.addEventListener('pointercancel', pointerEnd, { capture: true });
        container.addEventListener('pointerout', pointerEnd, { capture: true });
        container.addEventListener('wheel', (e) => {
            if(!this.isEditing) return;
            e.preventDefault(); 
            const zoomSpeed = 0.15;
            const direction = e.deltaY > 0 ? -1 : 1;
            let newZoom = this.zoomLevel + (direction * zoomSpeed);
            newZoom = Math.min(Math.max(1, newZoom), 10);
            this.pendingZoom = newZoom;
            zoomWrapper.style.transform = `scale(${newZoom})`;
            clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                if(this.pendingZoom !== this.zoomLevel) {
                    this.zoomLevel = this.pendingZoom;
                    this.refreshAllCanvasesForZoom();
                }
            }, 300); 
        }, { passive: false });
    }
    refreshAllCanvasesForZoom() {
        if(this.activeCanvas) {
            this.resizeCanvas(this.activeCanvas);
            this.redrawCanvas(this.activeCanvas);
        }
    }

    /**
     * Şekil (Kare, Daire vb.), Metin, Sticker ve Resim ekleme butonlarının olaylarını bağlar.
     * Kullanıcı bu araçlardan birine tıkladığında ilgili medyayı sayfaya yerleştirir.
     */
    setupMediaManager() {
        const uploadInput = document.getElementById('image-upload');
        const stickerBtns = document.querySelectorAll('.sticker-btn');
        if(uploadInput) {
            const uploadTrigger = document.getElementById('btn-upload-trigger');
            if(uploadTrigger) {
                uploadTrigger.addEventListener('click', () => uploadInput.click());
            }
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if(file) {
                    const reader = new FileReader();
                    reader.onload = (event) => this.addMediaToPage({ type: 'image', content: event.target.result, width: 200, height: 200 });
                    reader.readAsDataURL(file);
                }
            });
        }
        document.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const emoji = btn.dataset.sticker;
                this.addMediaToPage({ type: 'sticker', content: emoji, width: 100, height: 100 });
            });
        });
        const stickerModal = document.getElementById('sticker-modal');
        const stickerBtn = document.getElementById('sticker-popup-btn');
        const closeStickerBtn = document.getElementById('close-sticker-btn');
        if(stickerBtn) {
            stickerBtn.addEventListener('click', () => {
                stickerModal.classList.add('active');
                this.renderStickerLibrary('general');
            });
        }
        if(closeStickerBtn) {
            closeStickerBtn.addEventListener('click', () => stickerModal.classList.remove('active'));
        }
        document.querySelectorAll('[data-sticker-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-sticker-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.renderStickerLibrary(tab.dataset.stickerTab);
            });
        });
        const btnAddText = document.getElementById('btn-add-text');
        if (btnAddText) {
            btnAddText.addEventListener('click', () => {
                this.addMediaToPage({
                    type: 'text',
                    content: 'Yeni Metin',
                    width: 150,
                    height: 50
                });
            });
        }
        const shapeBtns = document.querySelectorAll('.shape-btn');
        shapeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const shapeType = btn.dataset.shape;
                this.addMediaToPage({
                    type: 'shape',
                    content: shapeType,
                    width: 100,
                    height: 100
                });
                const dropdown = document.getElementById('shape-dropdown');
                if (dropdown) {
                    const content = dropdown.querySelector('.dropdown-content');
                    content.style.display = 'none';
                    setTimeout(() => content.style.display = '', 100);
                }
            });
        });
        const closeTextFormattingBtn = document.getElementById('close-text-formatting');
        if (closeTextFormattingBtn) {
            closeTextFormattingBtn.addEventListener('click', () => {
                this.hideTextFormattingMenu();
            });
        }
        const formatBtns = document.querySelectorAll('.text-align-btn[data-format]');
        formatBtns.forEach(btn => {
            btn.addEventListener('mousedown', e => e.preventDefault());
            btn.addEventListener('click', e => {
                const format = e.target.closest('.text-align-btn').dataset.format;
                document.execCommand(format, false, null);
                if(window.currentTextMediaData && window.currentTextWrapper) {
                    const textContent = window.currentTextWrapper.querySelector('.text-content');
                    if(textContent) this.updateMediaData(window.currentTextMediaData.id, { content: textContent.innerHTML });
                }
            });
        });
        document.addEventListener('pointerdown', (e) => {
            if(!e.target.closest('.transform-box') && !e.target.closest('.text-formatting-menu') && this.currentMode === 'hand') {
                document.querySelectorAll('.transform-box').forEach(el => {
                    el.classList.remove('selected');
                    const textContent = el.querySelector('.text-content');
                    if (textContent && textContent.isContentEditable) {
                        textContent.contentEditable = "false";
                        const zoomWrapper = document.getElementById('zoom-wrapper');
                        if(zoomWrapper) zoomWrapper.classList.remove('zoom-active');
                        this.updateMediaData(el.dataset.id, { content: textContent.innerText });
                    }
                });
                this.hideTextFormattingMenu();
            }
        });
    }

    /**
     * Sticker (Çıkartma) menüsü açıldığında, seçilen kategoriye (Doğa, Okul vb.) göre
     * içindeki emojileri/resimleri arayüze dizer.
     * @param {string} category - Gösterilecek çıkartma kategorisi
     */
    renderStickerLibrary(category) {
        const grid = document.getElementById('sticker-library-grid');
        if(!grid) return;
        grid.innerHTML = '';
        const stickerData = {
            general: ['🐱', '🐶', '🦊', '🐨', '🦁', '🐷', '🦄', '🐝', '🦋', '🐳'],
            nature: ['🌸', '🌻', '🌲', '🍀', '🍂', '🍄', '🌍', '🌙', '☀️', '🌊'],
            school: ['📚', '✏️', '🎨', '🎓', '🎒', '🔬', '📐', '🖍️', '📖', '💻'],
            custom: ['stecerlar/1.jpg', 'stecerlar/2.jpg', 'stecerlar/3.jpg', 'stecerlar/4.jpg', 'stecerlar/5.jpg', 'stecerlar/6.jpg', 'stecerlar/7.jpg', 'stecerlar/8.jpg', 'stecerlar/9.jpg', 'stecerlar/10.jpg', 'stecerlar/11.jpg']
        };
        const items = stickerData[category] || [];
        items.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'sticker-item';
            const isImage = emoji.includes('.jpg') || emoji.includes('.png');
            if (isImage) {
                item.innerHTML = `<img src="${emoji}" style="width:100%; height:100%; object-fit:contain;">`;
            } else {
                item.innerHTML = emoji;
            }
            item.addEventListener('click', () => {
                if (isImage) {
                    this.addMediaToPage({ type: 'image', content: emoji, width: 120, height: 120 });
                } else {
                    this.addMediaToPage({ type: 'sticker', content: emoji, width: 100, height: 100 });
                }
                document.getElementById('sticker-modal').classList.remove('active');
            });
            grid.appendChild(item);
        });
    }

    /**
     * Sayfaya yeni bir medya objesi (Yazı kutusu, Sticker, Resim veya Şekil) ekler.
     * Eklenen nesneye boyutlandırma (resize), döndürme (rotate) ve sürükleme (drag) özelliklerini otomatik atar.
     * 
     * @param {Object} mediaData - Eklenecek medyanın özellikleri (türü, boyutu, konumu)
     * @param {boolean} isInitialLoad - Sayfa ilk yüklenirken (veritabanından) mi ekleniyor? (true/false)
     */
    addMediaToPage(mediaData, isInitialLoad = false) {
        if(!this.activePageContent) return; 
        if (!mediaData.id) {
            mediaData.id = 'media-' + (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2));
            mediaData.x = 50;
            mediaData.y = 50;
            mediaData.width = mediaData.width || 100;
            mediaData.height = mediaData.height || 100;
            mediaData.rotation = 0;
            mediaData.zIndex = 10;
            mediaData.fontStyle = 'Inter';
            mediaData.textAlign = 'left';
            mediaData.textColor = '#333333';
        }
        const wrapper = document.createElement('div');
        wrapper.className = isInitialLoad ? 'transform-box' : 'transform-box selected';
        wrapper.dataset.id = mediaData.id;
        wrapper.style.left = `${mediaData.x}px`;
        wrapper.style.top = `${mediaData.y}px`;
        wrapper.style.width = `${mediaData.width}px`;
        wrapper.style.height = `${mediaData.height}px`;
        wrapper.style.transform = `rotate(${mediaData.rotation}deg)`;
        wrapper.style.zIndex = mediaData.zIndex;
        let innerHTML = '';
        if (mediaData.type === 'text') {
            innerHTML = `<div class="media-content text-content" contenteditable="false" style="font-family: ${mediaData.fontStyle}; text-align: ${mediaData.textAlign}; color: ${mediaData.textColor};">${mediaData.content}</div>`;
        } else if (mediaData.type === 'shape') {
            let shapeClass = '';
            if(mediaData.content === 'square') shapeClass = 'shape-square';
            else if(mediaData.content === 'circle') shapeClass = 'shape-circle';
            else if(mediaData.content === 'line') shapeClass = 'shape-line';
            else if(mediaData.content === 'triangle') shapeClass = 'shape-triangle';
            else if(mediaData.content === 'star') shapeClass = 'shape-star';
            else if(mediaData.content === 'arrow') shapeClass = 'shape-arrow';
            else if(mediaData.content === 'diamond') shapeClass = 'shape-diamond';
            innerHTML = `<div class="media-content ${shapeClass}"></div>`;
        } else if (mediaData.type === 'sticker') {
            innerHTML = `<div class="media-content"><div class="sticker" style="font-size: ${mediaData.width/20}rem;">${mediaData.content}</div></div>`;
        } else if (mediaData.type === 'image') {
            innerHTML = `<div class="media-content"><img src="${mediaData.content}"></div>`;
        }
        wrapper.innerHTML = `
            <div class="settings-toggle" title="Katman Ayarları"><i data-lucide="more-vertical"></i></div>
            <div class="media-controls">
                <button class="layer-btn" data-action="front" title="Öne Getir"><i data-lucide="arrow-up-to-line"></i></button>
                <button class="layer-btn" data-action="back" title="Arkaya Gönder"><i data-lucide="arrow-down-to-line"></i></button>
                <button class="layer-btn delete-btn" data-action="delete" title="Sil"><i data-lucide="trash-2"></i></button>
                ${mediaData.type === 'text' ? `
                <div style="border-top:1px solid rgba(255,255,255,0.1); margin-top:4px; padding-top:4px; display:flex; flex-direction:column; gap:6px;">
                    <select class="layer-font-select" style="background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:4px; font-size:12px; outline:none; cursor:pointer; width:100%;">
                        <option value="Inter" ${mediaData.fontStyle==='Inter'?'selected':''}>Klasik</option>
                        <option value="cursive" ${mediaData.fontStyle==='cursive'?'selected':''}>El Yazısı</option>
                        <option value="Georgia" ${mediaData.fontStyle==='Georgia'?'selected':''}>Serif</option>
                        <option value="'Courier New'" ${mediaData.fontStyle==="'Courier New'"?'selected':''}>Daktilo</option>
                    </select>
                    <div style="display:flex; gap:4px; justify-content:space-between;">
                        <button class="layer-btn align-btn" data-align="left" style="flex:1; ${mediaData.textAlign==='left'?'background:var(--accent);color:white;':''}"><i data-lucide="align-left" style="width:14px;height:14px;"></i></button>
                        <button class="layer-btn align-btn" data-align="center" style="flex:1; ${mediaData.textAlign==='center'?'background:var(--accent);color:white;':''}"><i data-lucide="align-center" style="width:14px;height:14px;"></i></button>
                        <button class="layer-btn align-btn" data-align="right" style="flex:1; ${mediaData.textAlign==='right'?'background:var(--accent);color:white;':''}"><i data-lucide="align-right" style="width:14px;height:14px;"></i></button>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:0 2px;">
                        <span style="font-size:11px; color:var(--text-muted);">Renk:</span>
                        <input type="color" class="layer-color-picker" value="${mediaData.textColor}" style="width:24px; height:24px; padding:0; border:1px solid var(--border); border-radius:4px; cursor:pointer; background:transparent;">
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="rotate-handle" title="Döndür"><i data-lucide="rotate-cw"></i></div>
            <div class="resize-handle resize-nw" data-resize="nw"></div>
            <div class="resize-handle resize-n" data-resize="n"></div>
            <div class="resize-handle resize-ne" data-resize="ne"></div>
            <div class="resize-handle resize-w" data-resize="w"></div>
            <div class="resize-handle resize-e" data-resize="e"></div>
            <div class="resize-handle resize-sw" data-resize="sw"></div>
            <div class="resize-handle resize-s" data-resize="s"></div>
            <div class="resize-handle resize-se" data-resize="se"></div>
            ${innerHTML}
        `;
        this.activePageContent.appendChild(wrapper);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (mediaData.type === 'text') {
            const textContent = wrapper.querySelector('.text-content');
            wrapper.addEventListener('dblclick', (e) => {
                if (this.currentMode !== 'hand') return;
                textContent.contentEditable = "true";
                textContent.focus();
                document.execCommand('selectAll', false, null);
                document.getSelection().collapseToEnd();
                const zoomWrapper = document.getElementById('zoom-wrapper');
                if(zoomWrapper) zoomWrapper.classList.add('zoom-active');
                this.showTextFormattingMenu(wrapper, mediaData);
            });
            textContent.addEventListener('pointerdown', (e) => {
                if (textContent.isContentEditable) e.stopPropagation();
            });
            textContent.addEventListener('blur', () => {
                const zoomWrapper = document.getElementById('zoom-wrapper');
                if(zoomWrapper) zoomWrapper.classList.remove('zoom-active');
                this.updateMediaData(mediaData.id, { content: textContent.innerHTML });
                this.hideTextFormattingMenu();
            });
        }
        const settingsToggle = wrapper.querySelector('.settings-toggle');
        const mediaControls = wrapper.querySelector('.media-controls');
        if (settingsToggle && mediaControls) {
            settingsToggle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                mediaControls.classList.toggle('active');
            });
            const layerFontSelect = wrapper.querySelector('.layer-font-select');
            const layerColorPicker = wrapper.querySelector('.layer-color-picker');
            const alignBtns = wrapper.querySelectorAll('.align-btn');
            
            if (layerFontSelect) {
                layerFontSelect.addEventListener('pointerdown', e => e.stopPropagation());
                layerFontSelect.addEventListener('change', (e) => {
                    const newFont = e.target.value;
                    const textContent = wrapper.querySelector('.text-content');
                    if (textContent) {
                        textContent.style.fontFamily = newFont;
                        this.updateMediaData(mediaData.id, { fontStyle: newFont });
                    }
                });
            }
            if (layerColorPicker) {
                layerColorPicker.addEventListener('pointerdown', e => e.stopPropagation());
                layerColorPicker.addEventListener('input', (e) => {
                    const newColor = e.target.value;
                    const textContent = wrapper.querySelector('.text-content');
                    if (textContent) {
                        textContent.style.color = newColor;
                        this.updateMediaData(mediaData.id, { textColor: newColor });
                    }
                });
            }
            if (alignBtns.length > 0) {
                alignBtns.forEach(btn => {
                    btn.addEventListener('pointerdown', e => {
                        e.stopPropagation();
                        e.preventDefault();
                        const align = btn.dataset.align;
                        const textContent = wrapper.querySelector('.text-content');
                        if (textContent) {
                            textContent.style.textAlign = align;
                            this.updateMediaData(mediaData.id, { textAlign: align });
                            alignBtns.forEach(b => {
                                b.style.background = 'transparent';
                                b.style.color = 'inherit';
                            });
                            btn.style.background = 'var(--accent)';
                            btn.style.color = 'white';
                        }
                    });
                });
            }
        }
        this.setupTransformEngine(wrapper, mediaData);
        if (!isInitialLoad) {
            this.saveMediaToDB(mediaData);
        }
    }
    setupTransformEngine(elem, mediaData) {
        let isDragging = false, isResizing = false, isRotating = false;
        let startX, startY, startW, startH, startLeft, startTop, startAngle;
        let resizeDir = '';
        const rotateHandle = elem.querySelector('.rotate-handle');
        const resizeHandles = elem.querySelectorAll('.resize-handle');
        const mediaControls = elem.querySelector('.media-controls');
        if(mediaControls) {
            mediaControls.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                const action = e.target.closest('.layer-btn')?.dataset.action;
                let currentZ = parseInt(elem.style.zIndex) || 10;
                if(action === 'back') {
                    elem.style.zIndex = Math.max(-50, currentZ - 1);
                    this.updateMediaData(elem.dataset.id, { zIndex: parseInt(elem.style.zIndex) });
                } else if(action === 'front') {
                    elem.style.zIndex = currentZ + 1;
                    this.updateMediaData(elem.dataset.id, { zIndex: parseInt(elem.style.zIndex) });
                } else if(action === 'delete') {
                    const mediaId = elem.dataset.id;
                    elem.remove();
                    this.deleteMediaFromDB(mediaId);
                }
            });
        }
        elem.addEventListener('pointerdown', (e) => {
            if(this.currentMode !== 'hand') return; 
            e.stopPropagation(); 
            e.preventDefault();
            document.querySelectorAll('.transform-box').forEach(el => el.classList.remove('selected'));
            elem.classList.add('selected');
            startX = e.clientX;
            startY = e.clientY;
            startLeft = elem.offsetLeft;
            startTop = elem.offsetTop;
            startW = elem.offsetWidth;
            startH = elem.offsetHeight;
            const tr = window.getComputedStyle(elem).getPropertyValue("transform");
            if(tr !== 'none') {
                const values = tr.split('(')[1].split(')')[0].split(',');
                const a = values[0];
                const b = values[1];
                startAngle = Math.round(Math.atan2(b, a) * (180/Math.PI));
            } else {
                startAngle = 0;
            }
            if (e.target === rotateHandle) {
                isRotating = true;
            } else if (e.target.classList.contains('resize-handle')) {
                isResizing = true;
                resizeDir = e.target.dataset.resize;
            } else {
                isDragging = true;
            }
            elem.setPointerCapture(e.pointerId);
        });
        elem.addEventListener('pointermove', (e) => {
            if (!isDragging && !isResizing && !isRotating) return;
            e.stopPropagation();
            const dx = (e.clientX - startX) / this.zoomLevel;
            const dy = (e.clientY - startY) / this.zoomLevel;
            if (isDragging) {
                elem.style.left = `${startLeft + dx}px`;
                elem.style.top = `${startTop + dy}px`;
            } else if (isResizing) {
                let newW = startW, newH = startH, newL = startLeft, newT = startTop;
                if (resizeDir.includes('e')) {
                    newW = startW + dx;
                }
                if (resizeDir.includes('w')) {
                    newW = startW - dx;
                    newL = startLeft + dx;
                }
                if (resizeDir.includes('s')) {
                    newH = startH + dy;
                }
                if (resizeDir.includes('n')) {
                    newH = startH - dy;
                    newT = startTop + dy;
                }
                if(newW < 20) { newW = 20; if(resizeDir.includes('w')) newL = startLeft + startW - 20; }
                if(newH < 20) { newH = 20; if(resizeDir.includes('n')) newT = startTop + startH - 20; }
                elem.style.width = `${newW}px`;
                elem.style.left = `${newL}px`;
                elem.style.height = `${newH}px`;
                elem.style.top = `${newT}px`;
                const sticker = elem.querySelector('.sticker');
                if(sticker) sticker.style.fontSize = `${Math.max(20, newW)/20}rem`; 
            } else if (isRotating) {
                const rect = elem.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                elem.style.transform = `rotate(${angle + 90}deg)`;
            }
        });
        elem.addEventListener('pointerup', () => { 
            if(isDragging || isResizing || isRotating) {
                const currentAngleStr = elem.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                const currentAngle = currentAngleStr ? parseFloat(currentAngleStr[1]) : startAngle;
                this.updateMediaData(elem.dataset.id, {
                    x: elem.offsetLeft,
                    y: elem.offsetTop,
                    width: elem.offsetWidth,
                    height: elem.offsetHeight,
                    rotation: currentAngle
                });
            }
            isDragging = false; isResizing = false; isRotating = false; 
        });
    }
    saveMediaToDB(mediaData) {
        if (!this.getActiveNotebookId() || !this.activeCanvas) return;
        const pageId = this.activeCanvas.dataset.page;
        const nb = this.getAppNotebooks().find(n => n.id === this.getActiveNotebookId());
        if(!nb) return;
        const page = nb.pages.find(p => p.id === pageId);
        if(!page) return;
        if(!page.media) page.media = [];
        page.media.push(mediaData);
        DatabaseManager.saveNotebooks(this.getAppNotebooks());
    }
    deleteMediaFromDB(mediaId) {
        if (!this.getActiveNotebookId() || !this.activeCanvas) return;
        const pageId = this.activeCanvas.dataset.page;
        const nb = this.getAppNotebooks().find(n => n.id === this.getActiveNotebookId());
        if(!nb) return;
        const page = nb.pages.find(p => p.id === pageId);
        if(!page || !page.media) return;
        page.media = page.media.filter(m => m.id !== mediaId);
        DatabaseManager.saveNotebooks(this.getAppNotebooks());
    }
    showTextFormattingMenu(textWrapper, mediaData) {
        const menu = document.getElementById('text-formatting-menu');
        if (!menu) return;
        const fontSelect = document.getElementById('text-font-style');
        const colorPicker = document.getElementById('text-color-picker');
        const alignBtns = document.querySelectorAll('.text-align-btn[data-align]');
        fontSelect.value = mediaData.fontStyle || 'Inter';
        colorPicker.value = mediaData.textColor || '#333333';
        alignBtns.forEach(btn => btn.classList.remove('active'));
        const activeAlignBtn = document.querySelector(`.text-align-btn[data-align="${mediaData.textAlign || 'left'}"]`);
        if (activeAlignBtn) activeAlignBtn.classList.add('active');
        const rect = textWrapper.getBoundingClientRect();
        menu.style.left = (rect.left + rect.width + 10) + 'px';
        menu.style.top = rect.top + 'px';
        menu.classList.add('active');
        fontSelect.removeEventListener('change', fontSelectHandler);
        colorPicker.removeEventListener('input', colorPickerHandler);
        alignBtns.forEach(btn => {
            btn.removeEventListener('click', alignBtnHandler);
        });
        window.currentTextMediaData = mediaData;
        window.currentTextWrapper = textWrapper;
        const fontSelectHandler = () => {
            const newFont = fontSelect.value;
            const textContent = textWrapper.querySelector('.text-content');
            if (textContent) {
                textContent.style.fontFamily = newFont;
            }
            this.updateMediaData(mediaData.id, { fontStyle: newFont });
        };
        const colorPickerHandler = () => {
            const newColor = colorPicker.value;
            const textContent = textWrapper.querySelector('.text-content');
            if (textContent) {
                textContent.style.color = newColor;
            }
            this.updateMediaData(mediaData.id, { textColor: newColor });
        };
        const alignBtnHandler = (e) => {
            const align = e.target.closest('.text-align-btn').dataset.align;
            alignBtns.forEach(btn => btn.classList.remove('active'));
            e.target.closest('.text-align-btn').classList.add('active');
            const textContent = textWrapper.querySelector('.text-content');
            if (textContent) {
                textContent.style.textAlign = align;
            }
            this.updateMediaData(mediaData.id, { textAlign: align });
        };
        fontSelect.addEventListener('change', fontSelectHandler);
        colorPicker.addEventListener('input', colorPickerHandler);
        alignBtns.forEach(btn => {
            btn.addEventListener('click', alignBtnHandler);
        });
    }
    hideTextFormattingMenu() {
        const menu = document.getElementById('text-formatting-menu');
        if (menu) {
            menu.classList.remove('active');
        }
    }
    updateMediaData(mediaId, updates) {
        if (!this.getActiveNotebookId() || !this.activeCanvas) return;
        const pageId = this.activeCanvas.dataset.page;
        const nb = this.getAppNotebooks().find(n => n.id === this.getActiveNotebookId());
        if(!nb) return;
        const page = nb.pages.find(p => p.id === pageId);
        if(!page || !page.media) return;
        const media = page.media.find(m => m.id === mediaId);
        if(media) {
            Object.assign(media, updates);
            DatabaseManager.saveNotebooks(this.getAppNotebooks());
        }
    }
    resizeCanvas(canvas) {
        const rect = canvas.parentElement.getBoundingClientRect();
        if(rect.width > 0) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }
    }
    setMode(mode) {
        this.currentMode = mode;
        if(this.activeCanvas) {
            this.activeCanvas.style.pointerEvents = (this.currentMode === 'hand') ? 'none' : 'auto';
        }
    }
    startDrawing(e, canvas) {
        if (this.currentMode === 'hand' || !this.isEditing) return; 
        if (!canvas.dataset.page) {
            console.warn('Canvas sayfa numarası bulunamadı');
            return;
        }
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        canvas.setPointerCapture(e.pointerId);
        this.isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const unX = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
        const unY = Math.min(Math.max(0, (e.clientY - rect.top) / rect.height), 1);
        let cColor = this.color;
        const pageId = canvas.dataset.page;
        const notebookId = this.getActiveNotebookId();
        this.currentStroke = {
            mode: this.currentMode,
            color: cColor,
            normSize: this.size / rect.width, 
            points: [{x: unX, y: unY, thicknessMultiplier: 1}],
            notebookId: notebookId,
            pageId: pageId,
            _saved: false
        };
        this.lastPoint = {x: e.clientX, y: e.clientY};
        this.lastTime = Date.now();
        const ctx = canvas.getContext('2d');
        if (this.currentMode === 'highlighter') {
            this.draftCanvas.width = canvas.width;
            this.draftCanvas.height = canvas.height;
            this.draftCtx.clearRect(0, 0, canvas.width, canvas.height);
            this.draftCtx.drawImage(canvas, 0, 0);
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            let actualLineWidth = this.currentStroke.normSize * canvas.width;
            ctx.lineWidth = actualLineWidth * 3;
            ctx.globalCompositeOperation = 'multiply';
            ctx.strokeStyle = cColor;
            ctx.globalAlpha = 0.4;
            const drawX = unX * canvas.width;
            const drawY = unY * canvas.height;
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX, drawY);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            let actualLineWidth = this.currentStroke.normSize * canvas.width;
            ctx.lineWidth = actualLineWidth;
            if (this.currentMode === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = actualLineWidth * 2; 
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = cColor;
            }
            const drawX = unX * canvas.width;
            const drawY = unY * canvas.height;
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX, drawY);
            ctx.stroke();
        }
    }
    draw(e, canvas) {
        if (!this.isDrawing || !this.currentStroke || !this.isEditing) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const rect = canvas.getBoundingClientRect();
        const unX = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
        const unY = Math.min(Math.max(0, (e.clientY - rect.top) / rect.height), 1);
        let thicknessMultiplier = 1;
        if (this.currentMode === 'fountain') {
            const now = Date.now();
            const dist = Math.hypot(e.clientX - this.lastPoint.x, e.clientY - this.lastPoint.y);
            const timeDiff = now - this.lastTime || 1;
            const speed = dist / timeDiff;
            thicknessMultiplier = Math.max(0.2, 1.5 - speed * 0.2);
            this.lastPoint = {x: e.clientX, y: e.clientY};
            this.lastTime = now;
        }
        this.currentStroke.points.push({x: unX, y: unY, thicknessMultiplier});
        const ctx = canvas.getContext('2d');
        const drawX = unX * canvas.width;
        const drawY = unY * canvas.height;
        if (this.currentMode === 'highlighter') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this.draftCanvas, 0, 0);
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = this.currentStroke.normSize * canvas.width * 3;
            ctx.globalCompositeOperation = 'multiply';
            ctx.strokeStyle = this.currentStroke.color;
            ctx.globalAlpha = 0.4;
            const startX = this.currentStroke.points[0].x * canvas.width;
            const startY = this.currentStroke.points[0].y * canvas.height;
            ctx.moveTo(startX, startY);
            for(let i = 1; i < this.currentStroke.points.length; i++) {
                ctx.lineTo(this.currentStroke.points[i].x * canvas.width, this.currentStroke.points[i].y * canvas.height);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        } else if(this.currentMode === 'fountain') {
            ctx.beginPath();
            const prev = this.currentStroke.points[this.currentStroke.points.length - 2];
            ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
            ctx.lineTo(drawX, drawY);
            ctx.lineWidth = this.currentStroke.normSize * canvas.width * thicknessMultiplier;
            ctx.stroke();
        } else {
            if (this.currentMode === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = this.currentStroke.normSize * canvas.width * 2;
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.lineTo(drawX, drawY);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over'; 
        }
    }
    stopDrawing() {
        if(!this.isDrawing) return;
        this.isDrawing = false;
        
        if(this.currentStroke && this.currentStroke.points.length > 0) {
            this.globalHistory.push(this.currentStroke);
            const notebookId = this.currentStroke.notebookId;
            const pageId = this.currentStroke.pageId;
            DatabaseManager.syncDrawings(notebookId, pageId, this.globalHistory);
            if(this.onRenderSidebar) this.onRenderSidebar();
        }
        this.currentStroke = null;
    }
}
