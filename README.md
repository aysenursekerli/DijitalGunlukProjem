# 📓 Memori: OmniPlanner - Nesne Yönelimli ve Yapay Zeka Destekli Dijital Ajanda

**Memori: OmniPlanner**, geleneksel web tabanlı not defterlerinin sunduğu yüzeysel çözümlerin ötesine geçerek; modern web teknolojilerini **(PWA, HTML5 Canvas API, IndexedDB)** güçlü bir yazılım mimarisiyle harmanlayan akademik düzeyde bir dijital ajanda projesidir. 

Bu proje, karmaşık çizim ve katman (layer) işlemlerini pürüzsüz bir "3D Sayfa Çevirme" deneyimiyle birleştirir. Temel amacı, kullanıcılara sanki fiziksel bir deftere yazıyormuş hissini %100 çevrimdışı (offline-first) çalışabilen, yüksek performanslı ve nesne yönelimli (OOP) bir ekosistem içerisinde sunmaktır.

---

## ⚙️ Teknik Mimari ve Akademik Yaklaşım

Projenin altyapısı, SOLID prensipleri ve Clean Code standartları gözetilerek inşa edilmiştir. Spagetti kod yığınlarından kaçınılmış ve modüler bir mimari benimsenmiştir.

| Teknoloji / Mimari | Projedeki Görevi | Yazılım Mühendisliği Karşılığı |
| :--- | :--- | :--- |
| **ES6 Modül Mimarisi & CustomEvent** | `Arayuz.js` ve `CanvasMotoru.js` arasındaki sıkı bağlılığın (Tight Coupling) kırılması ve olay tabanlı (event-driven) iletişimin sağlanması. | **Loose Coupling & Separation of Concerns (SoC):** Modüllerin birbirinden bağımsız çalışabilir ve test edilebilir hale getirilmesi. |
| **TemplateManager.js** | Kullanıcı arayüzüne ait statik HTML şablonlarının (defter listesi, çıkartma paneli vb.) JS mantığından ayrıştırılarak tek bir merkezden yönetilmesi. | **Single Responsibility Principle (SRP):** Her modülün sadece kendi işinden (bu durumda arayüz bileşenleri oluşturmaktan) sorumlu olması. |
| **IndexedDB (Asenkron DB)** | Çizim yolları (strokes), katman koordinatları ve şifreli notların tarayıcı üzerinde asenkron olarak saklanması. | LocalStorage'ın 5MB kısıtlamasını aşan, veri kayıpsız (Data Persistence) ve performanslı NoSQL veri yönetimi. |
| **Service Worker & PWA** | Uygulamanın statik dosyalarının önbelleğe alınması (caching) ve internet bağlantısı olmadan da tam kapasite çalışabilmesi. | **Progressive Web App (PWA) & Offline-First:** Platform bağımsız (Desktop/Mobil) kurulabilen dayanıklı (Resilient) uygulama altyapısı. |
| **Pixabay REST API** | Kullanıcıların "Sticker (Çıkartma)" arayüzü üzerinden dinamik, estetik ve transparan illüstrasyonlar çekerek sayfalarına ekleyebilmesi. | **API Tüketimi & Asenkron Mimari:** Uzak sunucularla asenkron (Fetch/Promises) veri alışverişi. |

---

## 🧭 Temel Özellikler ve Kullanım Kılavuzu

### 1. Kütüphane & Defter Yönetimi 📚
- Kullanıcılar kendi defterlerini oluşturabilir, defter kapak renklerini ve isimlerini belirleyebilirler. 
- Her bir defter, IndexedDB üzerinde kendi "Benzersiz Kimliği (UUID)" ile tutulur.

### 2. StPageFlip Entegrasyonu 📖
- Uygulama, zarif bir "Memori" kalem animasyonu ile başlar ve kullanıcıyı doğrudan kütüphaneye alır. 
- Defter açıldığında, sayfa çevirme işlemleri 3D (StPageFlip) algoritmasıyla fiziksel bir kitap deneyimi sunar. 

### 3. Gelişmiş Çizim Motoru (Canvas API) 🎨
- Kullanıcılar defterin herhangi bir sayfasına **serbest el çizimleri** yapabilir. 
- Katman mantığı sayesinde yazılar, resimler ve çıkartmalar üst üste binebilir; kilitlenebilir (Layer Lock) ve kalınlık ayarları dinamik olarak değiştirilebilir.

### 4. Estetik Çıkartmalar (Sticker Drawer) 🌈
- Ekranı karartan klasik "Popup (Modal)" mantığı terk edilmiştir. Bunun yerine sağdan yumuşakça kayarak açılan (Right Drawer) modern bir arayüz paneli tasarlanmıştır.
- Panel içerisindeki canlı arama çubuğu, **Pixabay API** ile haberleşerek saniyeler içinde estetik illüstrasyonları getirir ve sürükle-bırak/tıklama mantığıyla tuvale entegre eder.

---

## 🛠️ Karşılaşılan Zorluklar ve Çözümler

Proje geliştirme sürecinde, hem donanım/tarayıcı kısıtlamalarından hem de kod büyüdükçe ortaya çıkan yapısal karmaşadan dolayı çeşitli teknik borçlarla (Technical Debt) karşılaşılmış ve akademik çözümler üretilmiştir:

* **🚨 Sorun 1 (Mimari Kilitlenme):** Projenin ilk aşamalarında tüm fonksiyonların global alanda (window objesinde) yer alması, değişken çakışmalarına ve bakım zorluğuna (Spagetti Kod) yol açtı.
  * **💡 Çözüm:** Sistematik olarak **ES6 Modül yapısına** geçiş yapıldı. Bağımlılıklar `import/export` ifadeleri ile izole edildi. Ek olarak `TemplateManager.js` oluşturularak HTML şablonları JavaScript mantığından tamamen soyutlandı.

* **🚨 Sorun 2 (UI/UX Kesintisi):** Kullanıcıların çıkartma (sticker) eklemek için bir butona bastığında açılan ortalanmış popup, defterin görünürlüğünü engelliyor ve odak kaybına neden oluyordu.
  * **💡 Çözüm:** Popup yapısı tamamen iptal edildi. Ekranın sağ tarafından kayarak açılan ve arka planı karartmayan şık bir **"Drawer (Yan Panel)"** entegre edildi. Kullanıcılar artık defterlerini görürken bir yandan Pixabay sonuçlarında gezinebilmektedir.

* **🚨 Sorun 3 (Sayfa Çevirirken Veri Kaybı):** StPageFlip kütüphanesi ile sayfalar arası 3D geçiş yapılırken, tek bir Canvas kullanıldığı için eski sayfanın çizimleri yeni sayfaya taşıyor veya siliniyordu.
  * **💡 Çözüm:** Güçlü bir **Event-Driven (Olay Yönelimli)** yapı kuruldu. Sayfa her çevrildiğinde `page-flipped` isimli bir CustomEvent (Özel Olay) fırlatıldı. `CanvasMotoru.js` bu olayı dinleyerek; önce tuvali (context) temizledi, ardından yeni sayfanın (pageIndex) verilerini IndexedDB'den asenkron olarak okuyup ilgili çizimleri ve medya katmanlarını tuvale kusursuz bir şekilde yeniden giydirdi.

---

## 🚀 Gelecek Vizyonu

Memori: OmniPlanner projesinin mevcut web mimarisi (HTML5, CSS3, ES6 JS, IndexedDB) oldukça esnek, asenkron ve modüler bir temel üzerine oturtulmuştur. 

Gelecekteki temel vizyonumuz; bu web tabanlı PWA altyapısındaki iş kurallarını (Business Logic) koruyarak projeyi **Flutter** veya **React Native** teknolojileri kullanılarak tam yerel (Native) bir mobil iOS/Android uygulamasına dönüştürmektir. Böylelikle tabletlerde (örneğin iPad ve Apple Pencil entegrasyonuyla) daha derin donanımsal çizim ivmelenmelerine ve basınç hassasiyetine erişim sağlanacaktır.
