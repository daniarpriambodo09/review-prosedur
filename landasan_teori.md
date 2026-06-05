# LANDASAN TEORI

## 1. Manajemen Dokumen dan Quality Management System (QMS)

### 1.1 Pengertian Quality Management System (QMS)
Quality Management System (QMS) adalah suatu sistem yang dirancang untuk memastikan bahwa organisasi dapat secara konsisten memberikan produk atau jasa yang memenuhi kebutuhan pelanggan dan standar kualitas yang telah ditetapkan (Kurnia & Hermawan, 2019). QMS merupakan bagian integral dari manajemen operasional perusahaan modern yang berorientasi pada kepuasan pelanggan dan peningkatan berkelanjutan.

Menurut ISO 9001:2015, QMS mencakup seperangkat kebijakan, prosedur, dan praktik yang digunakan untuk mengelola operasi bisnis dan memastikan konsistensi dalam kualitas produk atau layanan. Implementasi QMS yang efektif memerlukan dokumentasi yang terstruktur, kontrol proses yang ketat, dan sistem pelacakan yang komprehensif.

### 1.2 Pentingnya Manajemen Dokumen dalam QMS
Manajemen dokumen merupakan komponen kritis dalam QMS karena berfungsi sebagai fondasi untuk menjaga konsistensi, transparansi, dan kepatuhan terhadap standar yang telah ditetapkan (Prabowo & Nugraha, 2021). Dokumen prosedur yang terkelola dengan baik memastikan bahwa setiap proses dalam organisasi dilaksanakan sesuai dengan standar yang telah ditentukan.

Efektivitas manajemen dokumen dalam QMS bergantung pada:
- **Ketersediaan informasi yang akurat dan terkini**: Memastikan semua pihak menggunakan versi terbaru dari prosedur yang berlaku
- **Aksesibilitas**: Memudahkan karyawan mengakses dokumentasi yang relevan
- **Pelacakan perubahan**: Mencatat setiap modifikasi atau revisi pada dokumen
- **Pengarsipan yang terorganisir**: Menyimpan versi historis untuk audit dan referensi

### 1.3 Siklus Hidup Dokumen Prosedur
Siklus hidup dokumen prosedur dalam QMS meliputi tahap-tahap berikut (Rizki & Yuniarta, 2020):

1. **Pembuatan (Creation)**: Pembuatan dokumen prosedur baru sesuai dengan kebutuhan organisasi
2. **Review (Review & Approval)**: Proses validasi dan persetujuan dari pihak yang berwenang
3. **Publikasi (Publication)**: Pendistribusian dokumen ke pengguna yang relevan
4. **Implementasi (Implementation)**: Penggunaan dokumen dalam operasional sehari-hari
5. **Pemantauan (Monitoring)**: Pelacakan kepatuhan dan efektivitas penggunaan dokumen
6. **Revisi (Revision)**: Pembaruan dokumen sesuai dengan perubahan proses atau standar
7. **Pengarsipan (Archival)**: Penyimpanan versi lama untuk keperluan audit dan referensi

Sistem yang baik harus mendukung setiap tahap ini dengan efisien dan terukur.

---

## 2. Sistem Informasi Manajemen Dokumen Berbasis Web

### 2.1 Definisi Sistem Informasi Berbasis Web
Sistem informasi berbasis web adalah aplikasi perangkat lunak yang diakses melalui internet menggunakan browser web sebagai antarmuka pengguna (User Interface) (Sommerville, 2016). Sistem berbasis web menawarkan keuntungan termasuk aksesibilitas dari berbagai lokasi, kemudahan pemeliharaan, dan skalabilitas yang lebih baik dibandingkan aplikasi desktop tradisional.

Menurut Pressman (2015), sistem berbasis web mengintegrasikan:
- **Server-side processing**: Pemrosesan data dan logika bisnis di sisi server
- **Client-side presentation**: Presentasi antarmuka pengguna melalui browser
- **Database management**: Pengelolaan data yang terstruktur dan aman

### 2.2 Keuntungan Sistem Berbasis Web untuk Manajemen Dokumen
Implementasi sistem manajemen dokumen berbasis web menawarkan beberapa keuntungan signifikan (Bahrin et al., 2016):

1. **Aksesibilitas Global**: Pengguna dapat mengakses dokumen dari mana saja asalkan terhubung ke internet
2. **Kolaborasi Real-Time**: Memfasilitasi kolaborasi antar tim dalam proses review dan persetujuan
3. **Otomatisasi Proses**: Mengurangi pekerjaan manual dalam pengelolaan workflow dokumen
4. **Audit Trail**: Mencatat setiap aktivitas untuk keperluan keamanan dan compliance
5. **Version Control**: Mengelola berbagai versi dokumen dengan mudah
6. **Cost Efficiency**: Mengurangi biaya operasional melalui digitalisasi
7. **Scalability**: Mudah untuk menambah kapasitas dan fitur sesuai kebutuhan

### 2.3 Arsitektur Sistem Berbasis Web
Arsitektur sistem berbasis web modern umumnya mengikuti pola Model-View-Controller (MVC) atau Model-View-ViewModel (MVVM) yang memisahkan antara logika bisnis, presentasi, dan data management (Fowler, 2002). Arsitektur yang baik memungkinkan:
- Pemeliharaan kode yang lebih mudah
- Testability yang lebih baik
- Skalabilitas horizontal
- Separation of concerns

---

## 3. Teknologi Web Modern untuk Implementasi Sistem

### 3.1 Next.js sebagai Framework Web
Next.js adalah framework React yang dibangun di atas Node.js yang menyediakan struktur dan tools untuk membangun aplikasi web modern dengan Server-Side Rendering (SSR), Static Site Generation (SSG), dan API routes (Vercel, 2024). Framework ini menawarkan:

**Fitur-fitur Utama:**
- **File-based Routing**: Struktur folder secara otomatis menjadi route URL
- **Server Components**: Memungkinkan eksekusi kode di server untuk performa optimal
- **API Routes**: Menyediakan backend API dalam satu project
- **Built-in Optimization**: Automatic optimization untuk image, font, dan script
- **TypeScript Support**: Dukungan penuh untuk type-safe development

Penggunaan Next.js dalam proyek ini memungkinkan pengembangan full-stack application yang efisien dengan performa tinggi dan user experience yang optimal (Vercel, 2024).

### 3.2 React dan Component-Based Architecture
React adalah library JavaScript untuk membangun user interface dengan menggunakan component-based architecture (Facebook Inc., 2021). Setiap komponen React merepresentasikan bagian terpisah dari UI yang dapat dipilih kembali (reusable) dan dikelola keadaannya (stateful) secara independen.

**Prinsip-prinsip React:**
- **Components**: Unit terkecil dari UI yang dapat dipilih kembali
- **Props**: Cara mengkomunikasikan data dari parent ke child component
- **State**: Mengelola data internal component yang dapat berubah
- **Hooks**: Function yang memungkinkan menggunakan state dan lifecycle features dalam functional components

Dengan React, sistem manajemen dokumen dapat dibangun dengan:
- Komponen yang modular dan maintainable
- Real-time reactivity terhadap perubahan data
- Performance optimization melalui virtual DOM
- Ecosystem yang besar dengan library pendukung

### 3.3 TypeScript untuk Type Safety
TypeScript adalah superset dari JavaScript yang menambahkan static typing ke bahasa (Microsoft, 2023). Penggunaan TypeScript dalam proyek ini memberikan:

**Manfaat:**
- **Type Safety**: Mendeteksi error pada saat development bukan runtime
- **Autocompletion**: IDE dapat memberikan suggestions yang lebih akurat
- **Documentation**: Type definition berfungsi sebagai dokumentasi kode
- **Refactoring**: Lebih aman melakukan refactoring karena tipe yang jelas
- **Maintainability**: Kode lebih mudah dipahami dan dimaintain

TypeScript memastikan bahwa sistem manajemen dokumen memiliki foundasi yang solid dengan error checking yang ketat.

### 3.4 Tailwind CSS untuk Styling
Tailwind CSS adalah utility-first CSS framework yang menyediakan kelas-kelas CSS siap pakai untuk styling (Tailwind Labs, 2024). Pendekatan utility-first memberikan:

**Keuntungan:**
- **Rapid Development**: Styling langsung di HTML tanpa menulis custom CSS
- **Consistency**: Design system yang konsisten di seluruh aplikasi
- **Responsive Design**: Built-in responsive utilities untuk mobile-first development
- **Customization**: Mudah customize theme sesuai dengan branding
- **Performance**: Automatic purging CSS yang tidak digunakan

Tailwind CSS memungkinkan pengembangan UI yang cepat namun tetap menjaga konsistensi visual dalam sistem.

---

## 4. Database dan Sistem Penyimpanan Data

### 4.1 PostgreSQL sebagai Database Management System
PostgreSQL adalah open-source relational database management system (RDBMS) yang powerful dan reliable (PostgreSQL Global Development Group, 2024). Dipilihnya PostgreSQL karena:

**Karakteristik:**
- **ACID Compliance**: Menjamin integritas data dalam setiap transaksi
- **Extensibility**: Kemampuan untuk extend dengan custom functions dan data types
- **Performance**: Optimized query engine untuk handling data besar
- **Security**: Built-in security features termasuk row-level security
- **JSON Support**: Dukungan native untuk JSON dan JSONB data types

Dalam konteks manajemen dokumen prosedur, PostgreSQL menyediakan:
- Penyimpanan data dokumen yang terstruktur dan aman
- Audit trail untuk tracking perubahan dokumen
- Query yang complex untuk reporting dan analytics
- Relasi antar entitas (dokumen, status, user, approval chain)

### 4.2 Node.js dan pg Library
Node.js adalah runtime environment JavaScript yang berjalan di server (Node.js Foundation, 2024). Kombinasi dengan pg library memungkinkan:

**Fungsi:**
- **Asynchronous Database Operations**: Non-blocking database queries
- **Connection Pooling**: Efisiensi dalam mengelola database connections
- **Type-safe Queries**: Parametrized queries untuk mencegah SQL injection
- **JSON Integration**: Seamless integration dengan PostgreSQL JSON features

Penggunaan Node.js dengan pg library memberikan performa tinggi dan reliability dalam menangani multiple concurrent requests.

### 4.3 Strukturisasi Data untuk Manajemen Dokumen
Data dalam sistem manajemen dokumen harus terstruktur dengan baik untuk mendukung:

**Entitas Utama:**
1. **Users/Karyawan**: Menyimpan informasi pengguna dan role mereka
2. **Procedures/Dokumen Prosedur**: Menyimpan konten dan metadata dokumen
3. **Reviews/Status Tracking**: Mencatat status review dan approval setiap dokumen
4. **Revisions/Versi**: Menyimpan riwayat versi untuk setiap dokumen
5. **Audit Logs**: Mencatat setiap aktivitas untuk compliance

Struktur data yang baik memastikan integritas data dan memfasilitasi queries yang efisien.

---

## 5. Fitur Review dan Workflow Management

### 5.1 Konsep Review Dokumen dalam QMS
Review dokumen adalah proses validasi dan persetujuan dokumen untuk memastikan bahwa dokumen tersebut:
- Sesuai dengan standar kualitas yang ditetapkan
- Akurat dan lengkap
- Siap untuk diimplementasikan

Menurut ISO 9001:2015, setiap dokumen QMS harus melalui proses review dan approval dari pihak yang berwenang sebelum dipublikasikan (International Organization for Standardization, 2015).

### 5.2 Workflow dan Approval Chain
Workflow adalah urutan proses yang harus dilalui dokumen dari pembuatan hingga publikasi (Workflow Management Coalition, 1999). Dalam konteks manajemen dokumen prosedur:

**Tahapan Workflow:**
1. **Draft**: Dokumen baru dalam tahap pembuatan
2. **Submitted for Review**: Dokumen disubmit untuk direview
3. **Under Review**: Dokumen sedang dalam proses review
4. **Revision Required**: Reviewer meminta revisi
5. **Approved**: Dokumen telah disetujui
6. **Published**: Dokumen dipublikasikan untuk digunakan
7. **Archived**: Dokumen versi lama diarsipkan

Approval chain yang jelas memastikan bahwa hanya dokumen yang telah melalui validasi yang tepat yang dapat digunakan dalam operasional.

### 5.3 Role-Based Access Control (RBAC)
RBAC adalah model kontrol akses yang memberikan permission berdasarkan role pengguna (Sandhu et al., 1996). Dalam sistem ini, role dapat mencakup:

**Role dan Tanggung Jawab:**
- **Admin**: Penuh kontrol atas sistem, termasuk user management dan configuration
- **Prosedure Owner/PIC**: Mengelola prosedur yang mereka tanggungjawabi
- **Reviewer**: Melakukan review dan approval dokumen
- **End User**: Mengakses dokumen untuk keperluan operasional
- **Auditor**: Melakukan audit dan monitoring sistem

Implementasi RBAC memastikan bahwa setiap user hanya memiliki akses ke data dan fitur yang relevan dengan role mereka.

---

## 6. Tracking Status dan Real-Time Monitoring

### 6.1 Sistem Pelacakan Status Dokumen
Tracking status adalah mekanisme untuk memantau perubahan status dokumen sepanjang siklus hidupnya (Prabowo & Nugraha, 2021). System tracking yang baik memungkinkan:

**Manfaat:**
- **Visibility**: Semua stakeholder dapat melihat status terkini dokumen
- **Accountability**: Setiap perubahan status tercatat dengan informasi siapa yang melakukannya dan kapan
- **Bottleneck Identification**: Memudahkan identifikasi proses yang lambat
- **Compliance Reporting**: Mendukung laporan compliance dan audit

### 6.2 Status Progression dan Business Logic
Status dokumen mengikuti alur tertentu yang didefinisikan oleh business logic sistem. Alur status harus:
- **Linear atau Conditional**: Tergantung dari workflow requirements
- **Reversible when needed**: Memungkinkan kembali ke status sebelumnya jika perlu revisi
- **Timestamped**: Setiap perubahan status dicatat dengan waktu dan user yang melakukannya
- **Documented**: Alasan atau komentar untuk setiap perubahan status

### 6.3 Dashboard dan Reporting
Dashboard menyediakan overview visual dari status berbagai dokumen dan metrics sistem. Dashboard yang efektif menampilkan:

**Informasi Kritis:**
- Total dokumen per status
- Dokumen yang pending approval
- Dokumen yang memerlukan revisi
- Timeline dari approval process
- Performance metrics dari review team

---

## 7. Sistem Pengarsipan Dokumen

### 7.1 Pengertian dan Pentingnya Pengarsipan
Pengarsipan adalah proses penyimpanan dokumen-dokumen lama atau tidak aktif untuk keperluan referensi dan compliance (Duranti & Preston, 2008). Dalam konteks QMS:

**Tujuan Pengarsipan:**
- **Regulatory Compliance**: Memenuhi requirement dari regulasi (ISO 9001, audit internal, dll)
- **Historical Reference**: Menyimpan riwayat dokumen untuk referensi
- **Data Retention**: Menjaga data sesuai dengan retention policy
- **Space Management**: Mengorganisir storage dengan lebih efisien

### 7.2 Retention Policy dan Lifecycle Management
Kebijakan retensi menentukan berapa lama dokumen harus disimpan sebelum dapat dihapus. Policy ini didasarkan pada:

**Faktor-faktor Pertimbangan:**
- **Regulatory Requirements**: Requirement dari regulator atau standar industri
- **Organizational Policy**: Kebijakan internal organisasi
- **Legal Hold**: Dokumen yang sedang dalam kasus hukum tidak boleh dihapus
- **Reference Value**: Dokumen yang memiliki value untuk referensi jangka panjang

### 7.3 Storage Management dan Organization
Pengarsipan yang baik memerlukan organisasi storage yang terstruktur:

**Struktur Pengarsipan:**
- **By Department**: Dokumen diorganisir berdasarkan departemen
- **By Process**: Dokumen diorganisir berdasarkan process atau procedure
- **By Date**: Dokumen diorganisir berdasarkan tanggal pembuatan atau archive date
- **By Version**: Menyimpan multiple versi dari dokumen yang sama

Sistem yang baik memungkinkan easy retrieval dari dokumen archived sambil maintaining security dan compliance.

---

## 8. Keamanan dan Authentication

### 8.1 Authentication dan Authorization
Authentication adalah proses verifikasi identitas user, sementara authorization adalah proses menentukan apa yang user boleh lakukan (Stallings & Brown, 2018).

**Mekanisme Authentication:**
- **Password-based Authentication**: User login dengan username dan password
- **Password Hashing**: Menggunakan hashing algorithm (bcryptjs) untuk secure password storage
- **Session Management**: Mengelola user session setelah authentication
- **JWT (JSON Web Tokens)**: Alternative untuk stateless authentication

Authentication yang robust memastikan bahwa hanya authorized users yang dapat mengakses sistem.

### 8.2 Data Security dan Encryption
Keamanan data adalah prioritas utama dalam sistem manajemen dokumen karena dokumen mungkin berisi informasi sensitive. Mekanisme keamanan meliputi:

**Implementasi:**
- **Password Hashing**: Menggunakan bcryptjs untuk hash password
- **SQL Injection Prevention**: Menggunakan parametrized queries
- **HTTPS**: Enkripsi komunikasi data antara client dan server
- **Access Control**: Limiting akses berdasarkan role dan permission

### 8.3 Audit Logging dan Compliance
Audit logging adalah mekanisme untuk mencatat setiap aktivitas dalam sistem untuk keperluan compliance dan investigation (Prabowo & Nugraha, 2021).

**Informasi yang Dicatat:**
- User yang melakukan action
- Waktu action dilakukan
- Type action (create, read, update, delete)
- Data yang diakses atau dimodifikasi
- IP address atau source system

Audit trail yang lengkap memastikan accountability dan memfasilitasi investigasi jika terjadi masalah keamanan.

---

## 9. Performa dan Scalability

### 9.1 Performance Optimization
Performa adalah faktor kritis dalam sistem manajemen dokumen karena mendapat mengakses dari multiple users secara concurrent (Somerville, 2016). Optimisasi performa meliputi:

**Strategi:**
- **Database Indexing**: Membuat index pada kolom yang sering di-query
- **Caching**: Menyimpan data yang sering diakses di cache
- **Query Optimization**: Menulis efficient SQL queries
- **Code Splitting**: Memisahkan JavaScript code untuk faster initial load
- **Asset Optimization**: Compressing dan optimizing images dan static assets

### 9.2 Scalability dan Load Handling
Scalability adalah kemampuan sistem untuk menangani peningkatan load tanpa degradasi performa (Fowler, 2015). Sistem yang scalable dapat:

**Kemampuan:**
- **Horizontal Scaling**: Menambah server untuk load balancing
- **Vertical Scaling**: Meningkatkan resources dari server yang ada
- **Database Scaling**: Menggunakan replication atau partitioning
- **Caching Strategy**: Mengurangi load ke database

---

## 10. Best Practices dalam Implementasi Sistem Manajemen Dokumen

### 10.1 User-Centered Design
Sistem yang sukses harus dirancang dengan mempertimbangkan kebutuhan user (Norman, 2013). Prinsip-prinsip user-centered design:

- **Usability**: Interface yang mudah digunakan tanpa training yang extensive
- **Accessibility**: Dapat diakses oleh users dengan berbagai kemampuan
- **Feedback**: Sistem memberikan feedback yang jelas untuk setiap action
- **Error Handling**: Error messages yang helpful dan actionable

### 10.2 Change Management
Implementasi sistem baru memerlukan change management yang baik untuk memastikan adoption (Kotter, 2012):

**Elemen:**
- **Communication**: Komunikasi yang jelas tentang mengapa sistem diimplementasikan
- **Training**: Training yang adekuat untuk users
- **Support**: Support yang responsive untuk membantu users
- **Feedback Loop**: Mechanism untuk collect feedback dan improvement

### 10.3 Continuous Improvement
Sistem manajemen dokumen harus terus diperbaiki berdasarkan feedback dan monitoring (Deming, 1986):

- **Monitoring**: Regular monitoring terhadap performa dan usage patterns
- **Analysis**: Analisis data untuk mengidentifikasi areas of improvement
- **Implementation**: Implementasi improvement berdasarkan hasil analisis
- **Verification**: Verifikasi bahwa improvement memberikan hasil yang diinginkan

---

## REFERENSI

Bahrin, A. S., Othman, M. F., Azli, N. H. N., & Talib, M. F. (2016). Industry 4.0: A review on industrial automation and robotic. *Jurnal Teknologi*, 78(6-13), 137-143.

Deming, W. E. (1986). *Out of the Crisis: Quality, Productivity and Competitive Position*. MIT Press.

Duranti, L., & Preston, R. (2008). *Preservation of archival documents: A review of theory and practice*. Archivaria, 45, 22-37.

Facebook Inc. (2021). *React: A JavaScript library for building user interfaces*. Retrieved from https://react.dev

Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley Professional.

Fowler, M. (2015). *Building Microservices: Designing Fine-Grained Systems*. O'Reilly Media.

International Organization for Standardization. (2015). *ISO 9001:2015 Quality Management Systems – Requirements*. ISO.

Kotter, J. P. (2012). *Leading Change*. Harvard Business Review Press.

Kurnia, H., & Hermawan, A. (2019). Implementasi sistem manajemen mutu berbasis ISO 9001:2015. *Jurnal Teknik Industri*, 20(1), 45-58.

Microsoft. (2023). *TypeScript: A Typed Superset of JavaScript*. Retrieved from https://www.typescriptlang.org

Node.js Foundation. (2024). *Node.js - JavaScript Runtime*. Retrieved from https://nodejs.org

Norman, D. A. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.

PostgreSQL Global Development Group. (2024). *PostgreSQL: The World's Most Advanced Open Source Database*. Retrieved from https://www.postgresql.org

Prabowo, B., & Nugraha, A. (2021). Sistem informasi manajemen dokumen untuk meningkatkan efisiensi proses bisnis. *Jurnal Sistem Informasi*, 16(2), 123-135.

Pressman, R. S. (2015). *Software Engineering: A Practitioner's Approach* (8th ed.). McGraw-Hill Education.

Rizki, M., & Yuniarta, G. A. (2020). Manajemen dokumen dan pencatatan dalam sistem informasi akuntansi. *Jurnal Akuntansi Modern*, 12(3), 78-92.

Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. *IEEE Computer*, 29(2), 38-47.

Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson Education Limited.

Stallings, W., & Brown, L. L. (2018). *Computer Security: Principles and Practice* (3rd ed.). Pearson Education.

Tailwind Labs. (2024). *Tailwind CSS – Rapidly Build Modern Websites*. Retrieved from https://tailwindcss.com

Vercel. (2024). *Next.js: The React Framework for Production*. Retrieved from https://nextjs.org

Workflow Management Coalition. (1999). *Workflow Management Coalition: The Workflow Reference Model*. WfMC Technical Report, Document Number TC00-1003.
