import { DatabaseManager } from './Veritabani.js';
import { DrawingPad } from './CanvasMotoru.js';
import { generateTemplateContent } from './TemplateManager.js';
/**
 * AppManager (Uygulama Yöneticisi): Projenin kalbidir.
 * 3 farklı aşamayı (Phase) yönetir:
 * 1. Kütüphane (Defterlerin listelendiği ana sayfa)
 * 2. Önizleme (Defterin kapağının açılıp sayfaların çevrildiği görünüm)
 * 3. Düzenleme (Sayfaya çizim yapılan, sticker/yazı eklenen tam ekran mod)
 */
export const AppManager = {
    currentPhase: 1, 
    views: {},
    activePageData: null,
    currentCalDate: new Date(),
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
    activeNotebookId: null, // O an açık olan defterin ID'sini tutar

    /**
     * Uygulamanın Başlangıç (Init) Fonksiyonu.
     * Sayfa ilk açıldığında çalışır. Veritabanına bağlanır, kayıtlı defterleri çeker
     * ve butonların (Yeni Ekle, Çıkış vs.) tıklanma olaylarını (event) dinlemeye başlar.
     */
    init() {
        this.views = {
            1: document.getElementById('view-library'),
            2: document.getElementById('view-preview'),
            3: document.getElementById('view-edit'),
            4: document.getElementById('view-calendar')
        };
        this.loadTheme();
        DatabaseManager.init().then(async () => {
            const savedNotebooks = await DatabaseManager.loadNotebooks();
            if (savedNotebooks && savedNotebooks.length > 0) {
                this.notebooks = savedNotebooks;
            }
            this.renderLibrary();
            if (window.drawingPad) {
                const savedDrawings = await DatabaseManager.loadDrawings();
                window.drawingPad.globalHistory = savedDrawings || [];
            }
        }).catch(err => {
            console.error('Database initialization failed:', err);
            this.renderLibrary();
        });
        const modal = document.getElementById('notebook-modal');
        document.getElementById('add-new-btn').addEventListener('click', () => {
            modal.classList.add('active');
        });
        const themeBtn = document.getElementById('theme-toggle-btn');
        if(themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        document.getElementById('create-notebook-btn').addEventListener('click', () => {
            this.createNewNotebook();
            modal.classList.remove('active');
        });
        document.getElementById('close-template-btn').addEventListener('click', () => {
            document.getElementById('template-modal').classList.remove('active');
        });
        document.getElementById('btn-return-library').addEventListener('click', () => {
            this.switchPhase(1);
        });
        document.getElementById('btn-add-page').addEventListener('click', () => {
            this.openTemplateModal();
        });
        const btnEditCurrent = document.getElementById('btn-edit-current-page');
        if (btnEditCurrent) {
            btnEditCurrent.addEventListener('click', () => {
                if (window.pageFlip) {
                    const currentIndex = window.pageFlip.getCurrentPageIndex();
                    const allPages = document.querySelectorAll('#book .page');
                    let targetPage = allPages[currentIndex];
                    if (targetPage && (targetPage.classList.contains('page-cover') || targetPage.classList.contains('dummy-page'))) {
                        if (allPages[currentIndex + 1] && !allPages[currentIndex + 1].classList.contains('page-cover') && !allPages[currentIndex + 1].classList.contains('dummy-page')) {
                            targetPage = allPages[currentIndex + 1];
                        }
                    }
                    if (targetPage && !targetPage.classList.contains('page-cover') && !targetPage.classList.contains('dummy-page')) {
                        this.openEditMode(targetPage);
                    } else {
                        alert("Lütfen düzenlemek için kapak dışında bir sayfa açın.");
                    }
                }
            });
        }
        
        const stickerBtn = document.getElementById('sticker-popup-btn');
        if(stickerBtn) {
            stickerBtn.addEventListener('click', () => {
                const rightSidebar = document.getElementById('right-sidebar');
                if(rightSidebar) {
                    rightSidebar.classList.toggle('active');
                    if (rightSidebar.classList.contains('active')) {
                        const grid = document.getElementById('pixabay-grid');
                        if (grid && grid.innerHTML.trim() === '') {
                            this.fetchPixabayStickers('aesthetic sticker illustration');
                        }
                    }
                }
            });
        }
        
        const closeRightSidebarBtn = document.getElementById('close-right-sidebar-btn');
        if (closeRightSidebarBtn) {
            closeRightSidebarBtn.addEventListener('click', () => {
                document.getElementById('right-sidebar').classList.remove('active');
            });
        }

        const pixabaySearchBtn = document.getElementById('pixabay-search-btn');
        const pixabaySearchInput = document.getElementById('pixabay-search');
        if (pixabaySearchBtn && pixabaySearchInput) {
            const doSearch = () => {
                const query = pixabaySearchInput.value.trim() || 'aesthetic sticker illustration';
                this.fetchPixabayStickers(query);
            };
            pixabaySearchBtn.addEventListener('click', doSearch);
            pixabaySearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') doSearch();
            });
        }

        const btnToggleDate = document.getElementById('menu-toggle-date');
        if (btnToggleDate) {
            btnToggleDate.addEventListener('click', () => {
                if(!this.activePageData || !this.activeNotebookId) return;
                const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
                const pageId = this.activePageData.canvas.dataset.page;
                if(nb) {
                    const page = nb.pages.find(p => p.id === pageId);
                    if(page) {
                        page.hideDate = !page.hideDate;
                        DatabaseManager.saveNotebooks(this.notebooks);
                        
                        const watermark = this.activePageData.content.querySelector('.page-watermark-date');
                        if (watermark) {
                            watermark.style.display = page.hideDate ? 'none' : 'block';
                        }
                    }
                }
                const dropdown = document.getElementById('more-options-dropdown');
                if (dropdown) dropdown.classList.remove('active');
            });
        }

        document.getElementById('btn-finish-edit').addEventListener('click', () => {
            this.closeEditMode();
            this.switchPhase(1);
        });

        const btnExportPdf = document.getElementById('menu-export-pdf');
        if(btnExportPdf) {
            btnExportPdf.addEventListener('click', () => {
                const slot = document.getElementById('edit-page-slot');
                if (slot && typeof html2pdf !== 'undefined') {
                    const opt = {
                        margin: 0,
                        filename: 'Dijital-Ajanda-Sayfasi.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };
                    html2pdf().set(opt).from(slot).save();
                }
            });
        }

        const openCalBtn = document.getElementById('open-calendar-btn');
        if (openCalBtn) {
            openCalBtn.addEventListener('click', () => {
                this.switchPhase(4);
                this.renderCalendar();
            });
        }

        const btnReturnCal = document.getElementById('btn-return-library-from-cal');
        if (btnReturnCal) {
            btnReturnCal.addEventListener('click', () => {
                this.switchPhase(1);
            });
        }

        const btnPrevMonth = document.getElementById('btn-prev-month');
        if (btnPrevMonth) {
            btnPrevMonth.addEventListener('click', () => {
                this.currentCalDate.setMonth(this.currentCalDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        const btnNextMonth = document.getElementById('btn-next-month');
        if (btnNextMonth) {
            btnNextMonth.addEventListener('click', () => {
                this.currentCalDate.setMonth(this.currentCalDate.getMonth() + 1);
                this.renderCalendar();
            });
        }
        document.getElementById('btn-prev-edit-page').addEventListener('click', () => this.navigateToPage(-1));
        document.getElementById('btn-next-edit-page').addEventListener('click', () => this.navigateToPage(1));
        window.addEventListener('keydown', (e) => {
            if(this.currentPhase === 3 && window.drawingPad && window.drawingPad.currentMode === 'hand') {
                if(e.key === 'ArrowLeft') this.navigateToPage(-1);
                if(e.key === 'ArrowRight') this.navigateToPage(1);
            }
        });
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
        
        const menuAddPage = document.getElementById('menu-add-page');
        if(menuAddPage) {
            menuAddPage.addEventListener('click', () => {
                this.openTemplateModal();
            });
        }
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if(splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.style.display = 'none', 500);
            }
        }, 1500);
    },

    /**
     * Aşama 1: Kütüphane Ekranı.
     * Veritabanından çekilen defterleri (notebooks dizisini) ekrandaki ızgaraya (grid) yerleştirir.
     * Her defterin kendi rengi, adı ve kilit durumu burada oluşturulur.
     */
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
                        <button class="delete-nb-btn" data-id="${nb.id}" style="color: var(--danger);">Defteri Sil</button>
                    </div>
                    <h3 class="book-title">${nb.name}</h3>
                    <div class="book-date">${(() => {
                        if (!nb.createdAt) return new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                        return new Date(nb.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                    })()}</div>
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
            const deleteBtn = card.querySelector('.delete-nb-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                settingsMenu.classList.remove('active');
                if (confirm(`'${nb.name}' defterini tamamen silmek istediğinize emin misiniz? İçindeki tüm notlar kalıcı olarak silinecek.`)) {
                    await DatabaseManager.deleteNotebook(nb.id);
                    this.notebooks = this.notebooks.filter(n => n.id !== nb.id);
                    this.renderLibrary();
                }
            });
            grid.appendChild(card);
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.book-settings-menu.active').forEach(m => m.classList.remove('active'));
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    /**
     * Takvim Oluşturma Motoru (Calendar Rendering)
     */
    renderCalendar() {
        const grid = document.getElementById('calendar-days-grid');
        const title = document.getElementById('calendar-month-year-title');
        if (!grid || !title) return;

        grid.innerHTML = '';
        
        const year = this.currentCalDate.getFullYear();
        const month = this.currentCalDate.getMonth();
        
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        title.innerText = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // JS haftaya pazar(0) başlar, pazartesi(1) yapmak için offset
        let startDayOffset = firstDay - 1;
        if (startDayOffset < 0) startDayOffset = 6;

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        // Boş kutular
        for (let i = 0; i < startDayOffset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            grid.appendChild(emptyCell);
        }

        // Günler
        for (let d = 1; d <= daysInMonth; d++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.innerText = d;

            if (isCurrentMonth && d === today.getDate()) {
                cell.classList.add('today');
            }

            // Rastgele not noktası (Demo amaçlı)
            if (Math.random() > 0.8) {
                cell.classList.add('has-notes');
            }

            cell.addEventListener('click', () => {
                alert(`${d} ${monthNames[month]} ${year} tarihi için günlük açılıyor... (Yakında eklenecek)`);
            });

            grid.appendChild(cell);
        }
    },

    /**
     * Defterin ismini değiştirmek için açılan küçük kutucuğu (Modal) yönetir.
     * @param {Object} nb - İsmi değiştirilecek defter objesi
     */
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

    /**
     * "Yeni Günlük Ekle" butonuna basıldığında çağrılır.
     * UUID standardında (benzersiz şifreli) yeni bir ID üretir,
     * defteri oluşturur ve veritabanına kaydeder.
     */
    createNewNotebook() {
        const name = document.getElementById('notebook-name').value || 'Yeni Günlük';
        const color = document.getElementById('notebook-color').value;
        const pattern = document.getElementById('notebook-pattern').value;
        const pages = [];
        for(let i = 1; i <= 2; i++) {
            pages.push({ id: 'pg-' + (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2)), snapshot: null, createdAt: new Date().toISOString(), hideDate: false });
        }
        const newNb = {
            id: 'nb-' + (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2)),
            name: name,
            coverColor: color,
            pattern: pattern,
            pages: pages,
            isLocked: false,
            pinCode: '',
            createdAt: new Date().toISOString()
        };
        this.notebooks.push(newNb);
        DatabaseManager.saveNotebooks(this.notebooks);
        this.renderLibrary();
    },
    /**
     * Defterin üzerine tıklandığında kilitliyse şifre sorar, açıksa doğrudan defteri okuma modunda (Aşama 2) açar.
     * @param {Object} nb - Tıklanan defter objesi
     */
    handleBookClick(nb) {
        if(nb.isLocked && nb.pinCode) {
            this.openPinEntryModal(nb);
        } else {
            this.openBook(nb.id);
        }
    },

    /**
     * Deftere ilk kez kilit koyarken veya mevcut kilidi kaldırırken açılan ekranı yönetir.
     * @param {Object} nb - Şifrelenecek defter
     */
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
    /**
     * Kilitli bir deftere girerken şifre (PIN) sorulan ekranı yönetir.
     * Girilen PIN doğruysa defteri açar, yanlışsa kutucuğu sallar (shake efekti).
     * @param {Object} nb - Açılmak istenen kilitli defter
     */
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
    /**
     * Aşama 2: Önizleme (Preview) Modu.
     * Seçilen defterin kapağını ve içindeki sayfaları (çizimler ve stickerlarla birlikte)
     * HTML dom elemanları olarak oluşturup, "PageFlip" kütüphanesiyle gerçek bir defter gibi çevrilebilir hale getirir.
     * 
     * @param {string} id - Açılacak defterin ID'si
     * @param {number} startPage - Hangi sayfanın açık geleceği (varsayılan: 0, yani kapak)
     */
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
            let templateContent = '';
            if (pageObj.pattern && pageObj.pattern.startsWith('template-')) {
                templateContent = generateTemplateContent(pageObj.pattern, pageObj.bgImage);
            }
            let bgStyle = '';
            if (pageObj.bgImage) {
                bgStyle = `style="background-image: url('${pageObj.bgImage}'); background-size: cover; background-position: center;"`;
            }
            
            let dateHTML = '';
            if (!pageObj.hideDate) {
                const pDate = pageObj.createdAt ? new Date(pageObj.createdAt) : new Date();
                const formattedDate = pDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
                dateHTML = `<div class="page-watermark-date" style="position:absolute; top:20px; left:20px; color:var(--text-muted); font-size:0.85rem; font-style:italic; opacity:0.6; pointer-events:none; z-index:100; font-family:'Georgia', serif;">${formattedDate}</div>`;
            }

            bookDiv.innerHTML += `
                <div class="page pattern-${pageObj.pattern || nb.pattern}" data-page="${pageObj.id}">
                    <div class="page-content" ${bgStyle}>
                        ${dateHTML}
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
        
        // PageFlip kütüphanesini dinamik boyutlandırmayla başlat
        window.pageFlip = new St.PageFlip(bookDiv, {
            width: 500, 
            height: 700, 
            size: "stretch", 
            minWidth: 300, 
            maxWidth: 650, 
            minHeight: 400, 
            maxHeight: 850,
            maxShadowOpacity: 0.5, 
            showCover: true, 
            mobileScrollSupport: true,
            drawShadow: true
        });
        
        // Sayfaları PageFlip'e yükle
        requestAnimationFrame(() => {
            window.pageFlip.loadFromHTML(bookDiv.querySelectorAll(".page"));
            
            if (startPage > 0 && typeof window.pageFlip.turnToPage === 'function') {
                window.pageFlip.turnToPage(startPage);
            }
        });
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
        if (window.pageFlip) {
            window.pageFlip.on('flip', (data) => {
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
    loadTheme() {
        const savedTheme = localStorage.getItem('ajanda_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    },
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ajanda_theme', newTheme);
        this.updateThemeIcon(newTheme);
    },
    updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) {
            btn.innerHTML = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },
    /**
     * Sayfaların üzerine çift tıklandığında veya "Düzenle" butonuna basıldığında
     * Düzenleme moduna (Aşama 3) geçilmesini sağlayan olay dinleyicilerini bağlar.
     * @param {HTMLElement} container - Sayfaları barındıran DOM elemanı
     */
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
    /**
     * "Yeni Sayfa Ekle" butonuna basıldığında açılan Şablon Galerisini yönetir.
     * Kullanıcı boş sayfa, kareli sayfa, alışkanlık takibi veya günlük planlayıcı gibi şablonlar seçebilir.
     */
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
    /**
     * Seçilen şablonu (veya deseni) mevcut deftere yeni bir sayfa (Page) olarak ekler.
     * @param {string} bgImage - Sayfanın arka plan resmi
     * @param {string} pattern - Sayfanın css deseni (kareli, çizgili vb.)
     */
    addNewPageToBook(bgImage, pattern) {
        if(!this.activeNotebookId) return;
        const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
        let currentIndex = 0;
        if(window.pageFlip) {
            currentIndex = window.pageFlip.getCurrentPageIndex();
        }
        const newPageId1 = 'pg-' + (window.crypto && window.crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2));
        nb.pages.push({ id: newPageId1, snapshot: null, bgImage: bgImage || '', pattern: pattern || '', createdAt: new Date().toISOString(), hideDate: false });
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
    /**
     * Uygulamanın 3 ana ekranı (Aşama 1: Kütüphane, Aşama 2: Önizleme, Aşama 3: Düzenleme)
     * arasındaki geçişi yönetir. İlgili HTML div'lerini gizler veya gösterir.
     * @param {number} phase - Geçilecek aşama numarası (1, 2 veya 3)
     */
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
        if(phase === 2) {
            DatabaseManager.saveNotebooks(this.notebooks);
        }
        if(window.drawingPad) {
            window.drawingPad.setEditingState(phase === 3);
        }
    },
    /**
     * Aşama 3: Düzenleme Modu.
     * Kullanıcı bir sayfaya çift tıkladığında veya "Düzenle" butonuna bastığında çağrılır.
     * Seçilen sayfayı kopardığı gibi ekranın ortasına büyük bir şekilde yerleştirir
     * ve Çizim Motoruna (CanvasMotoru) bağlar.
     * @param {HTMLElement} pageElement - Düzenlenecek sayfanın DOM objesi
     */
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
        if(this.currentPhase !== 3) this.switchPhase(3);
        setTimeout(() => {
            if(window.drawingPad) {
                window.drawingPad.attachToSinglePage(canvas, pageContent);
                window.drawingPad.refreshAllCanvasesForZoom();
            }
        }, 10);
        this.renderSidebar();
    },
    /**
     * Düzenleme modundan çıkıldığında çağrılır.
     * Ekrandaki sayfayı tekrar küçültür ve defterin içindeki eski yerine (PageFlip içine) geri koyar.
     * @param {boolean} skipPhaseSwitch - Doğrudan kütüphaneye dönülecekse aradaki animasyon atlanır
     */
    closeEditMode(skipPhaseSwitch = false) {
        if(this.activePageData) {
            const { parent, content, canvas } = this.activePageData;
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
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const book = document.getElementById('book');
                    const nb = this.notebooks.find(n => n.id === this.activeNotebookId);
                    if (book && window.drawingPad && nb) {
                        book.querySelectorAll('.drawing-layer').forEach(c => {
                            window.drawingPad.resizeCanvas(c);
                            window.drawingPad.redrawCanvas(c);
                        });
                        if (window.pageFlip && typeof window.pageFlip.loadFromHTML === 'function') {
                            const pages = book.querySelectorAll('.page');
                            window.pageFlip.loadFromHTML(pages);
                        }
                        nb.pages.forEach(pageObj => {
                            const pageDrawings = window.drawingPad.globalHistory.filter(
                                d => d.notebookId === this.activeNotebookId && d.pageId === pageObj.id
                            );
                            DatabaseManager.syncDrawings(this.activeNotebookId, pageObj.id, window.drawingPad.globalHistory);
                        });
                    }
                    DatabaseManager.saveNotebooks(this.notebooks);
                }, 150);
            });
        }
    },
    
    /**
     * Pixabay API üzerinden sticker/resim arar ve sağ çekmece içerisindeki ızgaraya ekler.
     * @param {string} query Aranacak kelime
     */
    async fetchPixabayStickers(query) {
        const grid = document.getElementById('pixabay-grid');
        const loader = document.getElementById('pixabay-loader');
        if (!grid || !loader) return;
        
        grid.innerHTML = '';
        loader.style.display = 'block';
        
        try {
            const apiKey = '55967545-20fd7263d1d8c6f40c7bd6d11';
            const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&image_type=illustration&per_page=20`;
            const response = await fetch(url);
            const data = await response.json();
            
            loader.style.display = 'none';
            
            if (data.hits && data.hits.length > 0) {
                data.hits.forEach(hit => {
                    const item = document.createElement('div');
                    item.className = 'pixabay-item';
                    item.innerHTML = `<img src="${hit.webformatURL}" alt="${hit.tags}">`;
                    item.addEventListener('click', () => {
                        if (window.drawingPad) {
                            window.drawingPad.addMediaToPage({ type: 'image', content: hit.webformatURL, width: 200, height: 200 });
                        }
                    });
                    grid.appendChild(item);
                });
            } else {
                grid.innerHTML = '<div style="color:var(--text-muted); padding:20px; grid-column:span 2; text-align:center;">Sonuç bulunamadı.</div>';
            }
        } catch (err) {
            console.error('Pixabay API Hatası:', err);
            loader.style.display = 'none';
            grid.innerHTML = '<div style="color:var(--danger); padding:20px; grid-column:span 2; text-align:center;">Bağlantı hatası oluştu.</div>';
        }
    },

    /**
     * Düzenleme modundayken (Aşama 3) klavyedeki sağ/sol ok tuşlarına basıldığında
     * veya üst paneldeki ok butonlarına basıldığında bir sonraki / bir önceki sayfaya geçer.
     * @param {number} direction - 1 (ileri) veya -1 (geri)
     */
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
    /**
     * Deftere yeni sayfa eklendiğinde veya bir sayfa silindiğinde
     * ekrandaki defterin yapısını bozmadan sayfaları yeniden hesaplayarak sayfayı yeniler.
     * @param {string} targetPageId - Yenileme sonrası açılacak hedeflenen sayfa
     */
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
    /**
     * Düzenleme modundayken sol tarafta açılan Kenar Çubuğunu (Sidebar) oluşturur.
     * Sayfaların mini versiyonlarını (thumbnail) çizer ve sayfa silme/geçiş yapma imkanı sunar.
     */
    renderSidebar() {
        const container = document.getElementById('thumbnails-container');
        if(!container || !this.activeNotebookId) return;
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
            card.innerHTML = `
                <div class="thumbnail-preview pattern-${pageObj.pattern || nb.pattern}" ${bgStyle}></div>
                <div class="thumbnail-page-num">Sayfa ${index + 1}</div>
                <button class="delete-page-btn" title="Sayfayı Sil"><i data-lucide="trash-2"></i></button>
            `;
            const previewDiv = card.querySelector('.thumbnail-preview');
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 450; 
            miniCanvas.height = 600;
            miniCanvas.style.width = '100%';
            miniCanvas.style.height = '100%';
            previewDiv.appendChild(miniCanvas);
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
                nb.pages.splice(index, 1);
                if (window.drawingPad) {
                    window.drawingPad.globalHistory = window.drawingPad.globalHistory.filter(s => !(s.notebookId === nb.id && s.pageId === pageObj.id));
                    DatabaseManager.syncDrawings(nb.id, pageObj.id, []);
                }
                DatabaseManager.saveNotebooks(this.notebooks);
                let targetPageId = activePageId;
                if(activePageId === pageObj.id) {
                    targetPageId = nb.pages[0].id;
                }
                this.refreshBookStructure(targetPageId);
            });
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
                    const movedPage = nb.pages.splice(fromIndex, 1)[0];
                    nb.pages.splice(toIndex, 0, movedPage);
                    DatabaseManager.saveNotebooks(this.notebooks);
                    this.refreshBookStructure(activePageId);
                }
            });
            container.appendChild(card);
        });
        container.scrollTop = scrollTop;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};
document.addEventListener('DOMContentLoaded', async function() {
    await DatabaseManager.init();
    AppManager.init();
    setTimeout(async () => {
        window.drawingPad = new DrawingPad();
        window.drawingPad.getAppNotebooks = () => AppManager.notebooks;
        window.drawingPad.getActiveNotebookId = () => AppManager.activeNotebookId;
        window.drawingPad.onRenderSidebar = () => AppManager.renderSidebar();
        const savedDrawings = await DatabaseManager.loadDrawings();
        if (savedDrawings && savedDrawings.length > 0) {
            window.drawingPad.globalHistory = savedDrawings;
        }
    }, 100);
});
