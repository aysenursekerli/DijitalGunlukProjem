content = """# 📓 Dijital Günlük ve Akıllı Ajanda

Ben **AYŞE NUR ŞEKERLİ**, Pamukkale Üniversitesi Yönetim Bilişim Sistemleri (YBS) öğrencisiyim. Bu proje benim hem yazılım öğrenme sürecimin hem de dönem ödevimin bir parçası. 

---

## ✨ Uygulamamın Tüm Özellikleri (Neler Yapabiliyor?)

### 1. Gerçekçi Kitap Deneyimi ve Şablonlar
* **3D Sayfa Çevirme (Page Flip):** Sayfaları fareyle veya dokunarak tuttuğumda gerçek bir defter gibi kıvrılarak çevriliyor.
* **Defter Kütüphanesi:** İstediğim kadar yeni defter oluşturabiliyor ve her birine farklı dijital kapaklar seçebiliyorum.
* **Sayfa Taslakları:** İhtiyacıma göre çizgili, kareli, noktalı (bullet journal) veya tamamen boş sayfa şablonları kullanabiliyorum.

### 2. Çizim ve Not Alma (Canvas Motoru)
* **Hassas Çizim Araçları:** Kalemle ekrana yazarken gecikme olmuyor. Farklı renk paletleri, fırça kalınlıkları ve silgi seçenekleri var.

### 3. Gelişmiş İçerik ve Düzenleme (Transform Motoru)
* **Şekil ve İkon Menüsü:** Sadece çizim değil; Kare, Daire, Yıldız, Üçgen, Ok gibi temiz vektörel şekiller ekleyebiliyorum.
* **Metin Kutuları:** Klavyeyle yazı yazabilmek için sayfaya sürüklenebilir metin kutuları ekleyebiliyorum.
* **Sticker ve Fotoğraf:** Sayfaları süslemek için çıkartma ve cihazımdan resim ekleme desteği.
* **360° Döndürme ve Boyutlandırma:** Eklediğim her şekli, yazıyı veya resmi köşelerinden tutup büyütebiliyor ve döndürme koluyla 360 derece çevirebiliyorum.
* **Katman Yönetimi:** Bir şekle tıkladığımda açılan cam efektli minik menüden onu diğer şekillerin önüne getirebiliyor veya arkasına gönderebiliyorum.

### 4. Akıllı Sayfa Yönetimi ve Güvenlik
* **Akıllı Yan Panel (Sidebar):** Sayfaların küçük ön izlemelerini (thumbnail) solda açılır bir panelde görüyorum. Sayfaların yerlerini sürükleyip değiştirebiliyor veya silebiliyorum.
* **Akıllı Zoom:** Yazı yazmaya başladığımda sayfa bana otomatik olarak yaklaşıyor (zoom yapıyor), bitince pürüzsüzce geri uzaklaşıyor.
* **Gizli Kasa (PIN Kilit Sistemi):** Özel defterlerime 4 haneli şifre koyabiliyorum. Şifreyi bilmeyen içindeki sayfaları göremiyor!
* **Kusursuz Veri Kaydı (PageId):** Sayfaları sıra numarasıyla değil, onlara özel gizli kimliklerle (UUID) cihaz hafızasına (IndexedDB) kaydediyorum. Böylece aradan sayfa silsem bile çizimler ve eklediğim şekiller asla birbirine karışmıyor.

---


## Takıldığım Yerler ve Yapay Zeka ile Çözümlerimiz


* **Sorun:** Sayfayı çevirmeye çalışıyorum ama çevrilmiyor! Çünkü üstteki çizim katmanı tıklamaları engelliyordu.
  * **Çözüm Promptu:** *"Üst katmana `pointer-events: none` ver, sadece içindeki nesnelere `auto` ver ki boşluğa tıklayınca sayfa çevrilsin."*
  
* **Sorun:** Şekil ekliyorum ama kalemle çizmişim gibi kalıyor, yerinden oynamıyor.
  * **Çözüm Promptu:** *"Şekilleri canvas'a çizme, onları ayrı bir HTML div'i olarak ekle ve etrafına 8 tane tutma noktası olan bir çerçeve yap."*

* **Sorun:** Düzenleme moduna bir giriyorum, her yer mavi çerçeve dolu! Gözüm yoruldu.
  * **Çözüm Promptu:** *"Hepsini gizle! Sadece tıkladığım nesnenin çerçevesi ve döndürme kolu görünsün, diğerleri tertemiz kalsın."*

* **Sorun:** Sayfa silince eski çizimler yeni sayfaların üstüne biniyordu.
  * **Çözüm Promptu:** *"Sayfaları numarayla değil `pageId` (UUID) ile takip et, veritabanını buna göre sıfırla ve yeniden kur."*

---

## 🚀 Kurulum ve Kullanım

Proje **ES6 Modülleri (`export` / `import`)** mimarisi kullanılarak Clean Code prensiplerine uygun olarak refactor edilmiştir. Bu nedenle projeyi düz HTML dosyasına çift tıklayarak çalıştıramazsınız (Tarayıcı CORS güvenlik kısıtlamaları).

**Çalıştırma Adımları:**
1. Bilgisayarınızda **Node.js** yüklü olmalıdır.
2. Terminal (Komut İstemi) açıp proje klasörüne gidin.
3. Herhangi bir yerel HTTP Sunucusu başlatın. Örneğin:
   * **VS Code** kullanıyorsanız: `Live Server` eklentisini kurup `index.html`'e sağ tıklayıp "Open with Live Server" diyebilirsiniz.
   * **Python** ile: Terminale `python -m http.server` yazın.
   * **Node.js** ile: Terminale `npx serve` veya `npx http-server` yazın.
4. Tarayıcınızdan `http://localhost:8000` (veya sunucunun verdiği porta) giderek uygulamayı kullanmaya başlayabilirsiniz.

---

## 🧪 Çıktı Kontrol Metodolojisi (Testler)

Projeye kod güvenilirliğini artırmak için **Birim Testleri (Unit Tests)** entegre edilmiştir. Uygulamanın IndexedDB'ye kayıt atma, doğru veri yapısı oluşturma (UUID temelli ID atama vb.) fonksiyonlarının sağlamlığı doğrulanmıştır.

**Testleri Çalıştırmak İçin:**
1. Proje dizininde terminali açın.
2. Bağımlılık sorunu yaşamadan yerleşik test aracını çalıştırmak için aşağıdaki komutu girin:
   ```bash
   node --test __tests__/temel.test.js
   ```
3. Tüm testlerin "Geçti" (Pass) ibaresiyle sonuçlandığını konsoldan teyit edebilirsiniz. Veritabanı ve Arayüz mock (simülasyon) testleri başarıyla tamamlanmıştır.
