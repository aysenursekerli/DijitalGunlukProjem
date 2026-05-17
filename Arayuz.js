import { DatabaseManager } from './Veritabani.js';
import { DrawingPad } from './CanvasMotoru.js';

export const AppManager = {
    currentPhase: 1, // 1: Library, 2: Preview, 3: Edit
    views: {},
    activePageData: null,
    
    notebooks: [
        {
            id: 'nb-sample-1',
            name: 'Dijital Ajanda',
            coverColor: '#1e293b',
            pattern: 'blank',
            pages: [
                { id: 'pg-sample-1', snapshot: null },
                { id: 'pg-sample-2', snapshot: null },
                { id: 'pg-sample-3', snapshot: null },
                { id: 'pg-sample-4', snapshot: null }
            ]
        }
    ],
    activeNotebookId: null,

    init() {
        this.views = {
            1: document.getElementById('view-library'),
            2: document.getElementById('view-preview'),
            3: document.getElementById('view-edit')
        };

        // Veritabanını başlat ve verileri yükle
        DatabaseManager.init().then(async () => {
            const savedNotebooks = await DatabaseManager.loadNotebooks();
            if (savedNotebooks && savedNotebooks.length > 0) {
                this.notebooks = savedNotebooks;
            }
            
            this.renderLibrary();
            
            // çizimleri yükle ve globalHistory'ye ekle
            if (window.drawingPad) {
                const savedDrawings = await DatabaseManager.loadDrawings();
                window.drawingPad.globalHistory = savedDrawings || [];
            }
        }).catch(err => {
            console.error('Database initialization failed:', err);
            this.renderLibrary();
        });

        // Kütüphane Eventleri - Yeni Ekle Modal
        const modal = document.getElementById('notebook-modal');
        document.getElementById('add-new-btn').addEventListener('click', () => {
            modal.classList.add('active');
        });
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        document.getElementById('create-notebook-btn').addEventListener('click', () => {
            this.createNewNotebook();
            modal.classList.remove('active');
        });

        // Template Modal Eventleri
        document.getElementById('close-template-btn').addEventListener('click', () => {
            document.getElementById('template-modal').classList.remove('active');
        });

        // Aşama 2 Eventleri
        document.getElementById('btn-return-library').addEventListener('click', () => {
            this.switchPhase(1);
        });
        
        document.getElementById('btn-add-page').addEventListener('click', () => {
            this.openTemplateModal();
        });

        // Aşama 3 Eventleri
        document.getElementById('btn-finish-edit').addEventListener('click', () => {
            this.closeEditMode();
            this.switchPhase(1);
        });
        document.getElementById('btn-prev-edit-page').addEventListener('click', () => this.navigateToPage(-1));
        document.getElementById('btn-next-edit-page').addEventListener('click', () => this.navigateToPage(1));
        
        window.addEventListener('keydown', (e) => {
            if(this.currentPhase === 3 && window.drawingPad && window.drawingPad.currentMode === 'hand') {
                if(e.key === 'ArrowLeft') this.navigateToPage(-1);
                if(e.key === 'ArrowRight') this.navigateToPage(1);
            }
        });

        // Yan Panel Eventleri
        const sidebar = document.getElementById('sidebar-navigator');
        const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        if(toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
        
        const sidebarAddPageBtn = document.getElementById('sidebar-add-page-btn');
        if(sidebarAddPageBtn) {
            sidebarAddPageBtn.addEventListener('click', () => {
                this.openTemplateModal();
            });
        }

        // Splash screen timeout
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 500);
            }
        }, 1500);
    },

    renderLibrary() {
        const grid = document.querySelector('.library-grid');
        const addNewBtn = document.getElementById('add-new-btn');
        grid.innerHTML = '';
        grid.appendChild(addNewBtn);

        this.notebooks.forEach(nb => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            let lockHtml = nb.isLocked ? `<i data-lucide="lock" class="book-lock-icon"></i>` : '';
            
            card.innerHTML = `
                <div class="book-cover-design" style="background: ${nb.coverColor}; position: relative;">
                    ${lockHtml}
                    <div class="book-settings" title="Defter Ayarları" data-id="${nb.id}">
                        <i data-lucide="more-vertical"></i>
                    </div>
                    <div class="book-settings-menu" id="menu-${nb.id}">
                        <button class="toggle-pin-btn" data-id="${nb.id}">${nb.isLocked ? 'Şifreyi Kaldır' : 'Şifre Koy'}</button>
                        <button class="rename-nb-btn" data-id="${nb.id}">İsim Değiştir</button>
                    </div>
                    <h3 class="book-title">${nb.name}</h3>
                    <div class="book-date">Nisan 2026</div>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.book-settings') || e.target.closest('.book-settings-menu')) return;
                this.handleBookClick(nb);
            });

            const settingsBtn = card.querySelector('.book-settings');
            const settingsMenu = card.querySelector('.book-settings-menu');
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.book-settings-menu.active').forEach(m => {
                    if(m !== settingsMenu) m.classList.remove('active');
                });
                settingsMenu.classList.toggle('active');
            });

            const togglePinBtn = card.querySelector('.toggle-pin-btn');
            togglePinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsMenu.classList.remove('active');
                this.openPinSetupModal(nb);
            });

            const renameBtn = card.querySelector('.rename-nb-btn');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsMenu.classList.remove('active');
                this.openRenameModal(nb);
            });

            grid.appendChild(card);
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.book-settings-menu.active').forEach(m => m.classList.remove('active'));
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    openRenameModal(nb) {
        const modal = document.getElementById('rename-modal');
        const input = document.getElementById('rename-input');
        const btnConfirm = document.getElementById('btn-confirm-rename');
        const btnCancel = document.getElementById('btn-cancel-rename');
        const btnClose = document.getElementById('close-rename-btn');

        input.value = nb.name;
        modal.classList.add('active');
        setTimeout(() => { input.focus(); input.select(); }, 80);

        const cleanup = () => {
            modal.classList.remove('active');
            btnConfirm.replaceWith(btnConfirm.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
            btnClose.replaceWith(btnClose.cloneNode(true));
        };

        const confirm = () => {
            const val = input.value.trim();
            if (val.length > 0) {
                nb.name = val.substring(0, 30);
                DatabaseManager.saveNotebooks(this.notebooks);
                this.renderLibrary();
            }
            cleanup();
        };

        document.getElementById('btn-confirm-rename').addEventListener('click', confirm);
        document.getElementById('btn-cancel-rename').addEventListener('click', cleanup);
        document.getElementById('close-rename-btn').addEventListener('click', cleanup);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cleanup();
        });
    },

    createNewNotebook() {
        const name = document.getElementById('notebook-name').value || 'Yeni Günlük';
        const color = document.getElementById('notebook-color').value;
        const pattern = document.getElementById('notebook-pattern').value;

        const pages = [];
        for(let i = 1; i <= 2; i++) {
            pages.push({ id: 'pg-' + Date.now() + '-' + i, snapshot: null });
        }

        const newNb = {
            id: 'nb-' + Date.now(),
            name: name,
            coverColor: color,
            pattern: pattern,
            pages: pages,
            isLocked: false,
            pinCode: ''
        };
        this.notebooks.push(newNb);
        DatabaseManager.saveNotebooks(this.notebooks);
        this.renderLibrary();
    },

    handleBookClick(nb) {
        if(nb.isLocked && nb.pinCode) {
            this.openPinEntryModal(nb);
        } else {
            this.openBook(nb.id);
        }
    },

    openPinSetupModal(nb) {
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-modal-title');
        const input = document.getElementById('pin-input');
        const btnSubmit = document.getElementById('btn-submit-pin');
        const btnCancel = document.getElementById('btn-cancel-pin');

        modal.classList.add('active');
        input.value = '';
        input.focus();

        if (nb.isLocked) {
            title.innerText = 'Mevcut PIN\'i Girin (Kaldırmak için)';
        } else {
            title.innerText = 'Yeni PIN Belirleyin';
        }

        const cleanup = () => {
            modal.classList.remove('active');
            btnSubmit.replaceWith(btnSubmit.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
            input.classList.remove('shake');
        };

        const handleSubmit = () => {
            const val = input.value.trim();
            if(val.length !== 4 || isNaN(val)) {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 300);
                return;
            }

            if(nb.isLocked) {
                if(val === nb.pinCode) {
                    nb.isLocked = false;
                    nb.pinCode = '';
                    DatabaseManager.saveNotebooks(this.notebooks);
                    this.renderLibrary();
                    cleanup();
                } else {
                    input.classList.add('shake');
                    input.value = '';
                    setTimeout(() => input.classList.remove('shake'), 300);
                }
            } else {
                nb.isLocked = true;
                nb.pinCode = val;
                DatabaseManager.saveNotebooks(this.notebooks);
                this.renderLibrary();
                cleanup();
            }
        };

        document.getElementById('btn-submit-pin').addEventListener('click', handleSubmit);
        document.getElementById('btn-cancel-pin').addEventListener('click', cleanup);
    },

    openPinEntryModal(nb) {
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-modal-title');
        const input = document.getElementById('pin-input');
        const btnSubmit = document.getElementById('btn-submit-pin');
        const btnCancel = document.getElementById('btn-cancel-pin');

        modal.classList.add('active');
        input.value = '';
        input.focus();
        title.innerText = 'PIN Girin';

        const cleanup = () => {
            modal.classList.remove('active');
            btnSubmit.replaceWith(btnSubmit.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
            input.classList.remove('shake');
        };

        const handleSubmit = () => {
            const val = input.value.trim();
            if(val === nb.pinCode) {
                cleanup();
                this.openBook(nb.id);
            } else {
                input.classList.add('shake');
                input.value = '';
                setTimeout(() => input.classList.remove('shake'), 300);
            }
        };

        document.getElementById('btn-submit-pin').addEventListener('click', handleSubmit);
        document.getElementById('btn-cancel-pin').addEventListener('click', cleanup);
    },

    generateTemplateContent(pattern, bgImage) {
        let templateHTML = '';
        
        if (pattern === 'template-kalori') {
            templateHTML = `
                <div class="template-tracker kalori-tracker" style="position:relative; z-index:10; padding:16px; border-radius:16px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid rgba(255,140,66,0.3);">
                        <div style="background:linear-gradient(135deg,#FF8C42,#FF5722); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">🍎</div>
                        <div>
                            <div style="font-weight:800; color:#CC5500; font-size:1rem; line-height:1;">Kalori Takibi</div>
                            <div style="font-size:0.7rem; color:#FF8C42; font-weight:500;">Günlük Beslenme Kaydı</div>
                        </div>
                        <div style="margin-left:auto; background:rgba(255,140,66,0.12); padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#FF8C42;">📅 __.__</div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                        <div style="background:rgba(255,140,66,0.08); border:1px solid rgba(255,140,66,0.2); padding:9px 11px; border-radius:10px;">
                            <div style="font-size:0.65rem; color:#FF8C42; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">🌅 Kahvaltı</div>
                            <div style="font-size:0.85rem; color:#333; font-weight:600;">___ kcal</div>
                            <div style="font-size:0.65rem; color:#999; margin-top:2px;">protein / karb / yağ</div>
                        </div>
                        <div style="background:rgba(255,140,66,0.08); border:1px solid rgba(255,140,66,0.2); padding:9px 11px; border-radius:10px;">
                            <div style="font-size:0.65rem; color:#FF8C42; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">☀️ Öğle</div>
                            <div style="font-size:0.85rem; color:#333; font-weight:600;">___ kcal</div>
                            <div style="font-size:0.65rem; color:#999; margin-top:2px;">protein / karb / yağ</div>
                        </div>
                        <div style="background:rgba(255,140,66,0.08); border:1px solid rgba(255,140,66,0.2); padding:9px 11px; border-radius:10px;">
                            <div style="font-size:0.65rem; color:#FF8C42; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">🌙 Akşam</div>
                            <div style="font-size:0.85rem; color:#333; font-weight:600;">___ kcal</div>
                            <div style="font-size:0.65rem; color:#999; margin-top:2px;">protein / karb / yağ</div>
                        </div>
                        <div style="background:rgba(255,140,66,0.08); border:1px solid rgba(255,140,66,0.2); padding:9px 11px; border-radius:10px;">
                            <div style="font-size:0.65rem; color:#FF8C42; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">🍿 Ara Öğün</div>
                            <div style="font-size:0.85rem; color:#333; font-weight:600;">___ kcal</div>
                            <div style="font-size:0.65rem; color:#999; margin-top:2px;">protein / karb / yağ</div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#FF8C42,#FF5722); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:rgba(255,255,255,0.85); font-size:0.72rem; font-weight:600;">Günlük Hedef</span>
                        <span style="color:white; font-weight:800; font-size:0.9rem;">___ / 2000 kcal</span>
                    </div>
                </div>
            `;
        } else if (pattern === 'template-spor') {
            templateHTML = `
                <div class="template-tracker spor-tracker" style="position:relative; z-index:10; padding:16px; border-radius:16px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid rgba(0,102,204,0.25);">
                        <div style="background:linear-gradient(135deg,#1565C0,#0288D1); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">🏃</div>
                        <div>
                            <div style="font-weight:800; color:#0D47A1; font-size:1rem; line-height:1;">Spor Günlüğü</div>
                            <div style="font-size:0.7rem; color:#1976D2; font-weight:500;">Aktivite & Egzersiz Kaydı</div>
                        </div>
                        <div style="margin-left:auto; background:rgba(0,102,204,0.1); padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#1565C0;">📅 __.__</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(0,102,204,0.05); border:1px solid rgba(0,102,204,0.15); padding:8px 10px; border-radius:10px;">
                            <input type="checkbox" style="width:15px;height:15px;accent-color:#1565C0;flex-shrink:0;">
                            <span style="font-size:0.8rem; color:#333; font-weight:600; flex:1;">🏃 Koşu</span>
                            <span style="font-size:0.72rem; color:#888;">___ km · ___ dk</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(0,102,204,0.05); border:1px solid rgba(0,102,204,0.15); padding:8px 10px; border-radius:10px;">
                            <input type="checkbox" style="width:15px;height:15px;accent-color:#1565C0;flex-shrink:0;">
                            <span style="font-size:0.8rem; color:#333; font-weight:600; flex:1;">🚶 Yürüyüş</span>
                            <span style="font-size:0.72rem; color:#888;">___ km · ___ dk</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(0,102,204,0.05); border:1px solid rgba(0,102,204,0.15); padding:8px 10px; border-radius:10px;">
                            <input type="checkbox" style="width:15px;height:15px;accent-color:#1565C0;flex-shrink:0;">
                            <span style="font-size:0.8rem; color:#333; font-weight:600; flex:1;">🚴 Bisiklet</span>
                            <span style="font-size:0.72rem; color:#888;">___ km · ___ dk</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; background:rgba(0,102,204,0.05); border:1px solid rgba(0,102,204,0.15); padding:8px 10px; border-radius:10px;">
                            <input type="checkbox" style="width:15px;height:15px;accent-color:#1565C0;flex-shrink:0;">
                            <span style="font-size:0.8rem; color:#333; font-weight:600; flex:1;">🧘 Yoga / Esneme</span>
                            <span style="font-size:0.72rem; color:#888;">___ dk</span>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#1565C0,#0288D1); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:rgba(255,255,255,0.85); font-size:0.72rem; font-weight:600;">Toplam Süre</span>
                        <span style="color:white; font-weight:800; font-size:0.9rem;">___ dakika 🔥</span>
                    </div>
                </div>
            `;
        } else if (pattern === 'template-butce') {
            templateHTML = `
                <div class="template-tracker butce-tracker" style="position:relative; z-index:10; padding:16px; border-radius:16px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:10px; border-bottom:2px solid rgba(56,142,60,0.25);">
                        <div style="background:linear-gradient(135deg,#2E7D32,#43A047); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">💰</div>
                        <div>
                            <div style="font-weight:800; color:#1B5E20; font-size:1rem; line-height:1;">Bütçe Takibi</div>
                            <div style="font-size:0.7rem; color:#388E3C; font-weight:500;">Aylık Gelir & Gider Planı</div>
                        </div>
                        <div style="margin-left:auto; background:rgba(56,142,60,0.1); padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#2E7D32;">📅 __.__</div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                        <div style="background:rgba(46,125,50,0.07); border:1.5px solid rgba(46,125,50,0.2); padding:10px; border-radius:10px;">
                            <div style="font-size:0.65rem; font-weight:800; color:#2E7D32; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">📈 Gelirler</div>
                            <div style="font-size:0.75rem; color:#555; margin-bottom:3px;">Maaş: <b>___ TL</b></div>
                            <div style="font-size:0.75rem; color:#555; margin-bottom:3px;">Ek gelir: <b>___ TL</b></div>
                            <div style="font-size:0.75rem; color:#555;">Diğer: <b>___ TL</b></div>
                        </div>
                        <div style="background:rgba(229,57,53,0.07); border:1.5px solid rgba(229,57,53,0.2); padding:10px; border-radius:10px;">
                            <div style="font-size:0.65rem; font-weight:800; color:#C62828; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">📉 Giderler</div>
                            <div style="font-size:0.75rem; color:#555; margin-bottom:3px;">Kira: <b>___ TL</b></div>
                            <div style="font-size:0.75rem; color:#555; margin-bottom:3px;">Market: <b>___ TL</b></div>
                            <div style="font-size:0.75rem; color:#555;">Diğer: <b>___ TL</b></div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#2E7D32,#43A047); padding:8px 12px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:rgba(255,255,255,0.85); font-size:0.72rem; font-weight:600;">💳 Kalan Bakiye</span>
                        <span style="color:white; font-weight:800; font-size:0.95rem;">___ TL</span>
                    </div>
                </div>
            `;
        } else if (pattern === 'template-duygu') {
            templateHTML = `
                <div class="template-tracker duygu-tracker" style="position:relative; z-index:10; padding:16px; border-radius:16px; max-height:62%; overflow:hidden; background:rgba(255,255,255,0.6); backdrop-filter:blur(8px);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid rgba(156,39,176,0.2);">
                        <div style="background:linear-gradient(135deg,#7B1FA2,#AB47BC); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">🌙</div>
                        <div>
                            <div style="font-weight:800; color:#4A148C; font-size:1rem; line-height:1;">Günlük Duygu</div>
                            <div style="font-size:0.7rem; color:#7B1FA2; font-weight:500;">Nasıl Hissediyorum?</div>
                        </div>
                        <div style="margin-left:auto; background:rgba(156,39,176,0.1); padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#7B1FA2;">📅 __.__</div>
                    </div>
                    <div style="display:flex; justify-content:space-around; margin-bottom:12px; background:rgba(156,39,176,0.05); border:1px solid rgba(156,39,176,0.15); padding:8px; border-radius:12px;">
                        <div style="text-align:center; cursor:default;">
                            <div style="font-size:1.6rem;">😄</div>
                            <div style="font-size:0.6rem; color:#666; margin-top:2px;">Harika</div>
                        </div>
                        <div style="text-align:center; cursor:default;">
                            <div style="font-size:1.6rem;">🙂</div>
                            <div style="font-size:0.6rem; color:#666; margin-top:2px;">İyi</div>
                        </div>
                        <div style="text-align:center; cursor:default;">
                            <div style="font-size:1.6rem;">😐</div>
                            <div style="font-size:0.6rem; color:#666; margin-top:2px;">Normal</div>
                        </div>
                        <div style="text-align:center; cursor:default;">
                            <div style="font-size:1.6rem;">😔</div>
                            <div style="font-size:0.6rem; color:#666; margin-top:2px;">Kötü</div>
                        </div>
                        <div style="text-align:center; cursor:default;">
                            <div style="font-size:1.6rem;">😞</div>
                            <div style="font-size:0.6rem; color:#666; margin-top:2px;">Berbat</div>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
                        <div style="background:rgba(255,167,38,0.1); border:1px solid rgba(255,167,38,0.25); padding:9px; border-radius:10px;">
                            <div style="font-size:0.65rem; font-weight:700; color:#E65100; margin-bottom:4px;">🌟 Bugün Neyim İçin Minnetarım?</div>
                            <div style="font-size:0.7rem; color:#aaa;">Buraya yaz...</div>
                            <div style="height:18px;"></div>
                        </div>
                        <div style="background:rgba(66,165,245,0.1); border:1px solid rgba(66,165,245,0.25); padding:9px; border-radius:10px;">
                            <div style="font-size:0.65rem; font-weight:700; color:#1565C0; margin-bottom:4px;">🎯 Bugünün Hedefi</div>
                            <div style="font-size:0.7rem; color:#aaa;">Buraya yaz...</div>
                            <div style="height:18px;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (pattern === 'template-okuma') {
            templateHTML = `
                <div class="template-tracker okuma-tracker" style="position:relative; z-index:10; padding:16px; border-radius:16px; max-height:62%; overflow:hidden; background:rgba(255,255,255,0.65); backdrop-filter:blur(8px);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid rgba(245,124,0,0.25);">
                        <div style="background:linear-gradient(135deg,#E65100,#FB8C00); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">📚</div>
                        <div>
                            <div style="font-weight:800; color:#BF360C; font-size:1rem; line-height:1;">Okuma Listesi</div>
                            <div style="font-size:0.7rem; color:#E65100; font-weight:500;">Kitap Takip Defteri</div>
                        </div>
                        <div style="margin-left:auto; background:rgba(245,124,0,0.1); padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; color:#E65100;">📅 __.__</div>
                    </div>
                    <div style="display:flex; gap:6px; margin-bottom:8px; font-size:0.65rem;">
                        <div style="flex:2; background:rgba(245,124,0,0.08); border:1px solid rgba(245,124,0,0.2); padding:5px 8px; border-radius:8px; font-weight:700; color:#BF360C;">📖 Kitap Adı</div>
                        <div style="flex:1; background:rgba(245,124,0,0.08); border:1px solid rgba(245,124,0,0.2); padding:5px 8px; border-radius:8px; font-weight:700; color:#BF360C;">Durum</div>
                        <div style="flex:1; background:rgba(245,124,0,0.08); border:1px solid rgba(245,124,0,0.2); padding:5px 8px; border-radius:8px; font-weight:700; color:#BF360C;">Puan</div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <div style="display:flex; gap:6px; font-size:0.7rem;">
                            <div style="flex:2; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#555;">_______________</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#aaa; font-size:0.65rem;">Okunuyor</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#F4C542;">★★★☆☆</div>
                        </div>
                        <div style="display:flex; gap:6px; font-size:0.7rem;">
                            <div style="flex:2; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#555;">_______________</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#aaa; font-size:0.65rem;">Okunacak</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#ccc;">★☆☆☆☆</div>
                        </div>
                        <div style="display:flex; gap:6px; font-size:0.7rem;">
                            <div style="flex:2; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#555;">_______________</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#aaa; font-size:0.65rem;">Okundu ✓</div>
                            <div style="flex:1; background:rgba(255,255,255,0.7); border:1px solid rgba(0,0,0,0.08); padding:6px 8px; border-radius:8px; color:#F4C542;">★★★★★</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return templateHTML;
    },

    openBook(id, startPage = 0) {
        this.activeNotebookId = id;
        const nb = this.notebooks.find(n => n.id === id);
        if(!nb) return;

        const container = document.getElementById('main-container');
        container.innerHTML = ''; 
        
        const bookDiv = document.createElement('div');
        bookDiv.className = 'book';
        bookDiv.id = 'book';
        
        bookDiv.innerHTML += `
            <div class="page page-cover page-cover-top" data-density="hard">
                <div class="page-content" style="background: ${nb.coverColor}">
                    <h2>${nb.name}</h2>
                </div>
            </div>
        `;

        nb.pages.forEach((pageObj, index) => {
            let mediaHTML = '';
            if(pageObj.media && pageObj.media.length > 0) {
                pageObj.media.forEach(m => {
                    let inner = '';
                    if (m.type === 'text') inner = `<div class="media-content text-content">${m.content}</div>`;
                    else if (m.type === 'shape') {
                        let shapeClass = '';
                        if(m.content === 'square') shapeClass = 'shape-square';
                        else if(m.content === 'circle') shapeClass = 'shape-circle';
                        else if(m.content === 'line') shapeClass = 'shape-line';
                        else if(m.content === 'triangle') shapeClass = 'shape-triangle';
                        else if(m.content === 'star') shapeClass = 'shape-star';
                        else if(m.content === 'arrow') shapeClass = 'shape-arrow';
                        else if(m.content === 'diamond') shapeClass = 'shape-diamond';
                        inner = `<div class="media-content ${shapeClass}"></div>`;
                    }
                    else if (m.type === 'sticker') inner = `<div class="media-content"><div class="sticker" style="font-size: ${m.width/20}rem;">${m.content}</div></div>`;
                    else if (m.type === 'image') inner = `<div class="media-content"><img src="${m.content}"></div>`;

                    mediaHTML += `<div class="static-media" style="position:absolute; left:${m.x}px; top:${m.y}px; width:${m.width}px; height:${m.height}px; transform:rotate(${m.rotation || 0}deg); z-index:${m.zIndex}; pointer-events:none;">${inner}</div>`;
                });
            }

            // Template içeriğini ekle
            let templateContent = '';
            if (pageObj.pattern && pageObj.pattern.startsWith('template-')) {
                templateContent = this.generateTemplateContent(pageObj.pattern, pageObj.bgImage);
            }

            let bgStyle = '';
            if (pageObj.bgImage) {
                bgStyle = `style="background-image: url('${pageObj.bgImage}'); background-size: cover; background-position: center;"`;
            }

            bookDiv.innerHTML += `
                <div class="page pattern-${pageObj.pattern || nb.pattern}" data-page="${pageObj.id}">
                    <div class="page-content" ${bgStyle}>
                        ${templateContent}
                        ${mediaHTML}
                        <button class="edit-page-btn" title="Bu Sayfayı Düzenle"><i data-lucide="pencil"></i> Düzenle</button>
                        <div class="page-footer">${index + 1}</div>
                    </div>
                    <canvas class="drawing-layer" data-page="${pageObj.id}"></canvas>
                </div>
            `;
        });

        let totalPages = nb.pages.length + 2;
        let dummyPageHtml = '';
        if (totalPages % 2 !== 0) {
            dummyPageHtml = `
                <div class="page dummy-page">
                    <div class="page-content" style="background: ${nb.coverColor}; display: flex; justify-content: center; align-items: center; color: rgba(255,255,255,0.5);">
                        Boş Sayfa
                    </div>
                </div>
            `;
        }

        bookDiv.innerHTML += dummyPageHtml + `
            <div class="page page-cover page-cover-bottom" data-density="hard">
                <div class="page-content" style="background: ${nb.coverColor}">
                    <h2>Son</h2>
                </div>
            </div>
        `;

        container.appendChild(bookDiv);

        this.bindPageEvents(bookDiv);

        if(window.pageFlip) {
            window.pageFlip.destroy();
        }
        
        window.pageFlip = new St.PageFlip(bookDiv, {
            width: 450, height: 600, size: "stretch", 
            minWidth: 300, maxWidth: 600, minHeight: 400, maxHeight: 800,
            maxShadowOpacity: 0.5, showCover: true, mobileScrollSupport: true 
        });
        window.pageFlip.loadFromHTML(bookDiv.querySelectorAll(".page"));
        
        if (startPage > 0 && typeof window.pageFlip.turnToPage === 'function') {
            window.pageFlip.turnToPage(startPage);
        }

        // Tüm canvas'ları re-render et
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (window.drawingPad) {
                    bookDiv.querySelectorAll('.drawing-layer').forEach(canvas => {
                        window.drawingPad.resizeCanvas(canvas);
                        window.drawingPad.redrawCanvas(canvas);
                    });
                }
            }, 150);
        });

        // onFlip event'i: sayfa çevrildiğinde ekranda görünen canvas'ları redraw et
        if (window.pageFlip) {
            window.pageFlip.on('flip', (data) => {
                // Aktif (ekranda görünen) sayfaları al ve redraw et
                setTimeout(() => {
                    if (window.drawingPad) {
                        const pages = bookDiv.querySelectorAll('.page');
                        pages.forEach(page => {
                            const canvas = page.querySelector('.drawing-layer');
                            if (canvas) {
                                window.drawingPad.resizeCanvas(canvas);
                                window.drawingPad.redrawCanvas(canvas);
                            }
                        });
                    }
                }, 50);
            });
        }

        this.switchPhase(2);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    bindPageEvents(container) {
        const pages = container.querySelectorAll('.page:not(.page-cover)');
        pages.forEach(page => {
            if(page.dataset.eventsBound) return;
            const btn = page.querySelector('.edit-page-btn');
            const enterEdit = () => this.openEditMode(page);
            if(btn) btn.addEventListener('click', enterEdit);
            page.addEventListener('dblclick', enterEdit);
            page.dataset.eventsBound = "true";
        });
    },

    openTemplateModal() {
        const modal = document.getElementById('template-modal');
        const grid = document.getElementById('template-grid');
        grid.innerHTML = '';
        
        const createDivider = (text) => {
            const div = document.createElement('div');
            div.className = 'template-divider';
            div.innerText = text;
            grid.appendChild(div);
        };

        createDivider('Temel Sayfalar');

        const basePatterns = [
            { name: 'Boş', pattern: 'blank', bg: '#fff', desc: 'Tamamen boş, özgür yazma alanı' },
            { name: 'Noktalı', pattern: 'dotted', bg: 'radial-gradient(#cbd5e1 2px, transparent 2px)', size: '15px 15px', desc: 'Çizim ve yazma için nokta rehberi' },
            { name: 'Kareli', pattern: 'squared', bg: 'linear-gradient(#e2e8f0 1px,transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px)', size: '15px 15px', desc: 'Matematiksel işlemler için uygun' },
            { name: 'Çizgili', pattern: 'lined', bg: 'linear-gradient(transparent 95%, #e2e8f0 5%)', size: '100% 24px', desc: 'Hızlı not almak için ideal' }
        ];

        basePatterns.forEach(bp => {
            const item = document.createElement('div');
            item.className = 'template-item base-template-item';
            item.style.position = 'relative';
            let styleStr = `width:100%; height:240px; background-color:#fff; display:flex; align-items:center; justify-content:center; color:#333; font-weight:bold; font-size:1.1rem;`;
            if (bp.pattern !== 'blank') {
                styleStr += ` background-image:${bp.bg}; background-size:${bp.size};`;
            }
            item.innerHTML = `
                <div style="${styleStr}">
                    <span style="background:rgba(255,255,255,0.9); padding:8px 14px; border-radius:6px; border:2px solid rgba(100,100,100,0.1);">${bp.name}</span>
                </div>
                <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(to top, rgba(0,0,0,0.6), transparent); color:white; padding:12px 10px; font-size:0.75rem; font-weight:600; text-align:center; opacity:0; transition:opacity 0.3s; border-radius:0 0 8px 8px;" class="base-template-desc">
                    ${bp.desc}
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                const desc = item.querySelector('.base-template-desc');
                if(desc) desc.style.opacity = '1';
            });
            
            item.addEventListener('mouseleave', () => {
                const desc = item.querySelector('.base-template-desc');
                if(desc) desc.style.opacity = '0';
            });
            
            item.addEventListener('click', () => {
                modal.classList.remove('active');
                this.addNewPageToBook('', bp.pattern);
            });
            grid.appendChild(item);
        });

        createDivider('Sayfalar');
        const sayfaFiles = [
            "sayfa1.jpg", "sayfa2.jpg", "sayfa3.jpg", "sayfa4.jpg", "sayfa5.jpg", "sayfa6.jpg", "sayfa7.jpg", "sayfa8.jpg", "sayfa9.jpg", "sayfa10.jpg", "sayfa11.jpg", "sayfa12.jpg", "sayfa13.jpg", "sayfa14.jpg"
        ];
        sayfaFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `<img src="assets/sayfalar/${file}" alt="${file}">`;
            item.addEventListener('click', () => {
                modal.classList.remove('active');
                this.addNewPageToBook(`assets/sayfalar/${file}`, '');
            });
            grid.appendChild(item);
        });

        createDivider('Günlük Planlayıcılar');
        const gunlukFiles = [
            "günlükPlanlayıcı1.jpg", "günlükPlanlayıcı2.jpg", "günlükPlanlayıcı3.jpg", "günlükPlanlayıcı4.jpg", "günkükPlanlayıcı5.jpg"
        ];
        gunlukFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `<img src="assets/sayfalar/${file}" alt="${file}">`;
            item.addEventListener('click', () => {
                modal.classList.remove('active');
                this.addNewPageToBook(`assets/sayfalar/${file}`, '');
            });
            grid.appendChild(item);
        });

        createDivider('Haftalık Planlayıcılar');
        const haftalikFiles = [
            "haftalıkPlanlayıcı1.jpg", "haftalıkPlanlayıcı2.jpg", "haftalıkPlanlayıcı3.jpg", "haftalıkPlanlayıcı4.jpg", "haftalıkPlanlayıcı5.jpg"
        ];
        haftalikFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `<img src="assets/sayfalar/${file}" alt="${file}">`;
            item.addEventListener('click', () => {
                modal.classList.remove('active');
                this.addNewPageToBook(`assets/sayfalar/${file}`, '');
            });
            grid.appendChild(item);
        });

        createDivider('Alışkanlık Takibi & Yıllık');
        const digerFiles = [
            "alışkanlıkTakibi1.jpg", "alışkanlıkTakibi2.jpg", "alışkanlıkTakibi3.jpg", "alışkanlıkTakibi4.jpg",
            "yıllık1.jpg"
        ];
        digerFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.innerHTML = `<img src="assets/sayfalar/${file}" alt="${file}">`;
            item.addEventListener('click', () => {
                modal.classList.remove('active');
                this.addNewPageToBook(`assets/sayfalar/${file}`, '');
            });
            grid.appendChild(item);
        });

        modal.classList.add('active');
    },

    addNewPageToBook(bgImage, pattern) {
        if(!this.activeNotebookId) return;
        const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
        
        let currentIndex = 0;
        if(window.pageFlip) {
            currentIndex = window.pageFlip.getCurrentPageIndex();
        }

        const timestamp = Date.now();
        const newPageId1 = 'pg-' + timestamp + '-1';
        nb.pages.push({ id: newPageId1, snapshot: null, bgImage: bgImage || '', pattern: pattern || '' });
        
        // Notebooks'u DB'ye kaydet
        DatabaseManager.saveNotebooks(this.notebooks);
        
        if (this.currentPhase === 3) {
            this.refreshBookStructure(newPageId1);
        } else {
            this.openBook(this.activeNotebookId, currentIndex);
            setTimeout(() => {
                if(window.pageFlip) window.pageFlip.flip(nb.pages.length);
            }, 150);
        }
    },

    switchPhase(phase) {
        this.currentPhase = phase;
        Object.values(this.views).forEach(v => {
            if(v) {
                v.classList.remove('active');
                v.style.pointerEvents = 'none';
            }
        });
        
        const activeView = this.views[phase];
        if(activeView) {
            activeView.classList.add('active');
            activeView.style.pointerEvents = 'auto';
        }

        // Phase 2'ye dönüşte verileri DB'ye kaydet
        if(phase === 2) {
            DatabaseManager.saveNotebooks(this.notebooks);
        }

        if(window.drawingPad) {
            window.drawingPad.setEditingState(phase === 3);
        }
    },

    openEditMode(pageElement) {
        if(this.activePageData) {
            this.closeEditMode(true); 
        }
        
        const slot = document.getElementById('edit-page-slot');
        const pageContent = pageElement.querySelector('.page-content');
        const canvas = pageElement.querySelector('.drawing-layer');

        if(!pageContent || !canvas) return;

        this.activePageData = {
            parent: pageElement,
            content: pageContent,
            canvas: canvas
        };

        const editBtn = pageContent.querySelector('.edit-page-btn');
        if(editBtn) editBtn.style.display = 'none';

        const patternClasses = Array.from(pageElement.classList).filter(c => c.startsWith('pattern-'));
        slot.className = 'fullscreen-canvas-wrapper ' + patternClasses.join(' ');

        slot.appendChild(pageContent);
        slot.appendChild(canvas);

        // Önce Phase 3'e geçip sayfayı ekranda görünür yap
        if(this.currentPhase !== 3) this.switchPhase(3);
        
        // Sayfa ekranda görünür olduktan sonra canvas boyutunu hesapla
        setTimeout(() => {
            if(window.drawingPad) {
                window.drawingPad.attachToSinglePage(canvas, pageContent);
                window.drawingPad.refreshAllCanvasesForZoom();
            }
        }, 10);

        this.renderSidebar();
    },

    closeEditMode(skipPhaseSwitch = false) {
        if(this.activePageData) {
            const { parent, content, canvas } = this.activePageData;
            
            // Revert dynamic media to static to clean up DOM for Phase 2
            content.querySelectorAll('.transform-box').forEach(el => el.remove());
            
            const pageId = canvas.dataset.page;
            const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
            if(nb) {
                const page = nb.pages.find(p => p.id === pageId);
                if(page && page.media) {
                    page.media.forEach(m => {
                        let inner = '';
                        if (m.type === 'text') inner = `<div class="media-content text-content">${m.content}</div>`;
                        else if (m.type === 'shape') {
                            let shapeClass = '';
                            if(m.content === 'square') shapeClass = 'shape-square';
                            else if(m.content === 'circle') shapeClass = 'shape-circle';
                            else if(m.content === 'line') shapeClass = 'shape-line';
                            else if(m.content === 'triangle') shapeClass = 'shape-triangle';
                            else if(m.content === 'star') shapeClass = 'shape-star';
                            else if(m.content === 'arrow') shapeClass = 'shape-arrow';
                            else if(m.content === 'diamond') shapeClass = 'shape-diamond';
                            inner = `<div class="media-content ${shapeClass}"></div>`;
                        }
                        else if (m.type === 'sticker') inner = `<div class="media-content"><div class="sticker" style="font-size: ${m.width/20}rem;">${m.content}</div></div>`;
                        else if (m.type === 'image') inner = `<div class="media-content"><img src="${m.content}"></div>`;

                        const staticDiv = document.createElement('div');
                        staticDiv.className = 'static-media';
                        staticDiv.style.cssText = `position:absolute; left:${m.x}px; top:${m.y}px; width:${m.width}px; height:${m.height}px; transform:rotate(${m.rotation || 0}deg); z-index:${m.zIndex}; pointer-events:none;`;
                        staticDiv.innerHTML = inner;
                        content.insertBefore(staticDiv, content.querySelector('.edit-page-btn'));
                    });
                }
            }

            const editBtn = content.querySelector('.edit-page-btn');
            if(editBtn) editBtn.style.display = 'block';

            parent.appendChild(content);
            parent.appendChild(canvas);

            const slot = document.getElementById('edit-page-slot');
            slot.className = 'fullscreen-canvas-wrapper';

            if(window.drawingPad) {
                window.drawingPad.detachSinglePage();
            }

            this.activePageData = null;
        }
        if(!skipPhaseSwitch) {
            this.switchPhase(2);
            // Canvas'ı orijinal yerine taşıdıktan hemen sonra redraw et
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const book = document.getElementById('book');
                    const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
                    if (book && window.drawingPad && nb) {
                        // Tüm canvas'ları yeniden boyutlandır ve çiz
                        book.querySelectorAll('.drawing-layer').forEach(c => {
                            window.drawingPad.resizeCanvas(c);
                            window.drawingPad.redrawCanvas(c);
                        });
                        // PageFlip'i refresh et
                        if (window.pageFlip && typeof window.pageFlip.loadFromHTML === 'function') {
                            const pages = book.querySelectorAll('.page');
                            window.pageFlip.loadFromHTML(pages);
                        }
                        
                        // Veritabanını senkronize et: tüm sayfalar için globalHistory'yi kaydet
                        nb.pages.forEach(pageObj => {
                            const pageDrawings = window.drawingPad.globalHistory.filter(
                                d => d.notebookId === this.activeNotebookId && d.pageId === pageObj.id
                            );
                            DatabaseManager.syncDrawings(this.activeNotebookId, pageObj.id, window.drawingPad.globalHistory);
                        });
                    }
                    // Notebook bilgilerini kaydet
                    DatabaseManager.saveNotebooks(this.notebooks);
                }, 150);
            });
        }
    },

    navigateToPage(direction) {
        if(!this.activePageData) return;
        const currentPage = this.activePageData.parent;
        const pageId = currentPage.dataset.page;
        if(!pageId) return;

        const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
        if(!nb) return;

        const currentIndex = nb.pages.findIndex(p => p.id === pageId);
        if(currentIndex === -1) return;

        const targetIndex = currentIndex + direction;
        if(targetIndex < 0 || targetIndex >= nb.pages.length) return;

        const targetPageId = nb.pages[targetIndex].id;
        const bookDiv = document.getElementById('book');
        const targetPageElement = bookDiv.querySelector(`.page[data-page="${targetPageId}"]`);
        
        if(targetPageElement) {
            this.openEditMode(targetPageElement);
        }
    },

    refreshBookStructure(targetPageId) {
        if (this.currentPhase === 3 && this.activePageData) {
            this.closeEditMode(true);
        }
        
        let currentIndex = 0;
        if(window.pageFlip) {
            currentIndex = window.pageFlip.getCurrentPageIndex();
        }
        
        this.openBook(this.activeNotebookId, currentIndex);
        if (this.currentPhase !== 3) {
            this.switchPhase(3);
        }
        
        if(targetPageId) {
            setTimeout(() => {
                const bookDiv = document.getElementById('book');
                const targetPageElement = bookDiv.querySelector(`.page[data-page="${targetPageId}"]`);
                if(targetPageElement) {
                    this.openEditMode(targetPageElement);
                }
            }, 100);
        }
        
        this.renderSidebar();
    },

    renderSidebar() {
        const container = document.getElementById('thumbnails-container');
        if(!container || !this.activeNotebookId) return;
        
        // Scroll konumunu kaydet
        const scrollTop = container.scrollTop;
        
        container.innerHTML = '';
        const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
        if(!nb) return;

        const activePageId = this.activePageData ? this.activePageData.parent.dataset.page : null;

        nb.pages.forEach((pageObj, index) => {
            const card = document.createElement('div');
            card.className = 'thumbnail-card';
            card.draggable = true;
            if(pageObj.id === activePageId) {
                card.classList.add('active');
            }

            let bgStyle = '';
            if (pageObj.bgImage) {
                bgStyle = `style="background-image: url('${pageObj.bgImage}'); background-size: cover; background-position: center;"`;
            }

            // Thumbnail içeriği
            card.innerHTML = `
                <div class="thumbnail-preview pattern-${pageObj.pattern || nb.pattern}" ${bgStyle}></div>
                <div class="thumbnail-page-num">Sayfa ${index + 1}</div>
                <button class="delete-page-btn" title="Sayfayı Sil"><i data-lucide="trash-2"></i></button>
            `;

            // Mini Canvas oluştur
            const previewDiv = card.querySelector('.thumbnail-preview');
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 450; 
            miniCanvas.height = 600;
            miniCanvas.style.width = '100%';
            miniCanvas.style.height = '100%';
            previewDiv.appendChild(miniCanvas);
            
            // Çizimleri yükle
            if (window.drawingPad && window.drawingPad.globalHistory) {
                const ctx = miniCanvas.getContext('2d');
                const strokes = window.drawingPad.globalHistory.filter(s => s.notebookId === nb.id && s.pageId === pageObj.id);
                strokes.forEach(stroke => {
                    if (stroke.points.length === 0) return;
                    ctx.beginPath();
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    let actualLineWidth = stroke.normSize * miniCanvas.width;
                    ctx.lineWidth = actualLineWidth;
                    if (stroke.mode === 'eraser') {
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.lineWidth = actualLineWidth * 2;
                    } else if (stroke.mode === 'highlighter') {
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.strokeStyle = stroke.color;
                        ctx.globalAlpha = 0.4;
                        ctx.lineWidth = actualLineWidth * 3;
                    } else {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = stroke.color;
                    }
                    ctx.moveTo(stroke.points[0].x * miniCanvas.width, stroke.points[0].y * miniCanvas.height);
                    for(let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x * miniCanvas.width, stroke.points[i].y * miniCanvas.height);
                    }
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.globalCompositeOperation = 'source-over';
                });
            }

            // Olaylar
            card.addEventListener('click', () => {
                if(pageObj.id !== activePageId) {
                    const bookDiv = document.getElementById('book');
                    const targetPageElement = bookDiv.querySelector(`.page[data-page="${pageObj.id}"]`);
                    if(targetPageElement) this.openEditMode(targetPageElement);
                }
            });

            const deleteBtn = card.querySelector('.delete-page-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(nb.pages.length <= 1) {
                    alert('Bir defterde en az 1 sayfa bulunmalıdır!');
                    return;
                }
                
                // Silme işlemi
                nb.pages.splice(index, 1);
                
                // DB'den çizimleri sil
                if (window.drawingPad) {
                    window.drawingPad.globalHistory = window.drawingPad.globalHistory.filter(s => !(s.notebookId === nb.id && s.pageId === pageObj.id));
                    DatabaseManager.syncDrawings(nb.id, pageObj.id, []);
                }
                DatabaseManager.saveNotebooks(this.notebooks);
                
                // Eğer silinen sayfa şu an aktif olan sayfaysa, ilk sayfayı aç
                let targetPageId = activePageId;
                if(activePageId === pageObj.id) {
                    targetPageId = nb.pages[0].id;
                }
                this.refreshBookStructure(targetPageId);
            });

            // Sürükle Bırak (Drag & Drop)
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                container.querySelectorAll('.thumbnail-card').forEach(c => c.classList.remove('drag-over'));
            });
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
            });
            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = index;
                if(fromIndex !== toIndex && !isNaN(fromIndex)) {
                    // Sayfaların yerini değiştir
                    const movedPage = nb.pages.splice(fromIndex, 1)[0];
                    nb.pages.splice(toIndex, 0, movedPage);
                    DatabaseManager.saveNotebooks(this.notebooks);
                    this.refreshBookStructure(activePageId);
                }
            });

            container.appendChild(card);
        });
        
        // Scroll konumunu geri yükle
        container.scrollTop = scrollTop;
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};


// Ana Kurulum
document.addEventListener('DOMContentLoaded', async function() {
    // Veritabanını başlat
    await DatabaseManager.init();
    
    // AppManager başlat
    AppManager.init();

    setTimeout(async () => {
        window.drawingPad = new DrawingPad();
        
        // Veritabanından çizimleri yükle
        const savedDrawings = await DatabaseManager.loadDrawings();
        if (savedDrawings && savedDrawings.length > 0) {
            window.drawingPad.globalHistory = savedDrawings;
        }
    }, 100);
});
