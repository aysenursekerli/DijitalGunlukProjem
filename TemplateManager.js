/**
 * TemplateManager modülü: Ajanda sayfalarına (örneğin; kalori takibi, spor günlüğü, bütçe) 
 * ait özel HTML yapılarını oluşturur. Spagetti kod oluşmasını engellemek için Arayuz.js'den ayrılmıştır.
 *
 * @param {string} pattern - Sayfanın şablon tipi (örn: 'template-kalori', 'template-spor')
 * @param {string} bgImage - Sayfanın arka plan resmi (eğer varsa)
 * @returns {string} - İlgili şablonun HTML kod bloğu (string olarak)
 */
export function generateTemplateContent(pattern, bgImage) {
    let templateHTML = ''; // Şablonun HTML kodunu tutacak değişken

    // Hangi şablonun seçildiğine göre ilgili HTML yapısını oluştur
    if (pattern === 'template-kalori') {
        // Kalori Takibi Şablonu: Günlük öğünlerin (kahvaltı, öğle vb.) kalori hesaplarını tutar
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
        // Spor Günlüğü Şablonu: Yapılan egzersiz sürelerini ve mesafeleri tutar
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
        // Bütçe Takibi Şablonu: Aylık gelir ve giderleri listeleyen tasarım
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
        // Duygu Takibi Şablonu: Kullanıcının günlük modunu ve minnettar olduğu şeyleri yazar
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
        // Okuma Listesi Şablonu: Kitap isimleri ve okunma durumlarını barındırır
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
    
    // Oluşturulan HTML şablon metnini geri döndür
    return templateHTML;
}
