import { useState } from 'react';
import '../../../styles/common.css';

interface GuideStep {
  title: string;
  description: string;
  icon: string;
  tips?: string[];
}

export default function FinancialReports() {
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const guideSteps: GuideStep[] = [
    // MASTER DATA
    {
      title: '� Products',
      description: 'Kelola daftar produk/item yang dijual',
      icon: '📋',
      tips: [
        'Tambah produk baru dengan kode, nama, kategori',
        'Atur harga jual dan harga beli',
        'Kelola stok dan level pemesanan ulang',
        'Kategorikan produk untuk laporan',
      ],
    },
    {
      title: '📦 Materials',
      description: 'Kelola daftar material/bahan baku',
      icon: '📦',
      tips: [
        'Tambah material baru untuk produksi',
        'Atur harga dan satuan material',
        'Kelola stok material',
        'Gunakan untuk Bill of Materials (BOM)',
      ],
    },
    {
      title: '� Customers',
      description: 'Kelola data pelanggan',
      icon: '�',
      tips: [
        'Tambah pelanggan baru dengan kontak lengkap',
        'Atur syarat pembayaran (Net 30, Net 60, dll)',
        'Kelompokkan pelanggan per wilayah',
        'Lihat riwayat transaksi pelanggan',
      ],
    },
    {
      title: '🏢 Suppliers',
      description: 'Kelola data supplier/pemasok',
      icon: '🏢',
      tips: [
        'Tambah supplier baru dengan kontak lengkap',
        'Atur syarat pembayaran',
        'Kelompokkan supplier per kategori',
        'Lihat riwayat pembelian dari supplier',
      ],
    },
    {
      title: '📊 Stock',
      description: 'Kelola inventaris/stok barang',
      icon: '📊',
      tips: [
        'Lihat stok real-time semua produk',
        'Identifikasi stok yang rendah',
        'Lihat pergerakan stok (masuk/keluar)',
        'Lakukan stock opname',
      ],
    },

    // PACKAGING
    {
      title: '� Workflow',
      description: 'Kelola alur kerja produksi',
      icon: '�',
      tips: [
        'Lihat status pesanan dari awal hingga selesai',
        'Monitor progress produksi',
        'Identifikasi bottleneck dalam proses',
        'Lihat timeline produksi',
      ],
    },
    {
      title: '📋 Orders',
      description: 'Kelola pesanan penjualan',
      icon: '�',
      tips: [
        'Buat pesanan penjualan baru dari pelanggan',
        'Tambah item dan jumlah yang dipesan',
        'Atur tanggal pengiriman',
        'Konfirmasi pesanan untuk memulai produksi',
      ],
    },
    {
      title: '📅 Planning',
      description: 'Perencanaan produksi (PPIC)',
      icon: '📅',
      tips: [
        'Rencanakan jadwal produksi',
        'Alokasikan sumber daya (mesin, tenaga kerja)',
        'Lihat kapasitas produksi',
        'Identifikasi konflik jadwal',
      ],
    },
    {
      title: '🛒 Purchasing',
      description: 'Kelola pembelian material',
      icon: '🛒',
      tips: [
        'Buat pesanan pembelian ke supplier',
        'Tentukan jumlah dan tanggal pengiriman',
        'Lacak status pesanan pembelian',
        'Terima barang dan verifikasi',
      ],
    },
    {
      title: '⚙️ Production',
      description: 'Kelola proses produksi',
      icon: '⚙️',
      tips: [
        'Mulai produksi dari SPK (Surat Perintah Kerja)',
        'Catat jumlah yang diproduksi',
        'Catat waktu mulai dan selesai',
        'Identifikasi masalah produksi',
      ],
    },
    {
      title: '✅ QC',
      description: 'Kontrol kualitas produk',
      icon: '✅',
      tips: [
        'Inspeksi produk sebelum pengiriman',
        'Tandai produk PASS atau FAIL',
        'Catat alasan penolakan jika ada',
        'Kirim produk yang lolos QC ke pengiriman',
      ],
    },
    {
      title: '🚚 Delivery',
      description: 'Kelola pengiriman produk',
      icon: '🚚',
      tips: [
        'Buat nota pengiriman dari pesanan',
        'Verifikasi jumlah barang',
        'Catat tanggal pengiriman aktual',
        'Tandai pengiriman sebagai selesai',
      ],
    },
    {
      title: '↩️ Returns',
      description: 'Kelola pengembalian barang',
      icon: '↩️',
      tips: [
        'Catat barang yang dikembalikan pelanggan',
        'Tentukan alasan pengembalian',
        'Proses refund atau penggantian',
        'Update stok setelah pengembalian',
      ],
    },

    // REPORTS
    {
      title: '📊 Dashboard',
      description: 'Lihat ringkasan laporan keuangan',
      icon: '📊',
      tips: [
        'Lihat KPI utama (revenue, profit, dll)',
        'Monitor tren penjualan',
        'Lihat performa per kategori',
        'Bandingkan dengan periode sebelumnya',
      ],
    },

    // FINANCE
    {
      title: '📄 Invoices',
      description: 'Kelola faktur penjualan',
      icon: '📄',
      tips: [
        'Buat faktur dari pesanan penjualan',
        'Catat pembayaran dari pelanggan',
        'Lihat status pembayaran (belum bayar, lunas, overdue)',
        'Export faktur ke PDF untuk dikirim ke pelanggan',
      ],
    },
    {
      title: '💳 Payments',
      description: 'Catat transaksi pembayaran',
      icon: '💳',
      tips: [
        'Catat pembayaran dari pelanggan (AR)',
        'Catat pembayaran ke supplier (AP)',
        'Pilih metode pembayaran (tunai, transfer, cek)',
        'Lihat riwayat pembayaran lengkap',
      ],
    },
    {
      title: '💰 Expenses',
      description: 'Kelola pengeluaran operasional',
      icon: '💰',
      tips: [
        'Catat pengeluaran harian (listrik, air, dll)',
        'Kategorikan pengeluaran (operasional, maintenance, dll)',
        'Lihat total pengeluaran per kategori',
        'Bandingkan pengeluaran antar periode',
      ],
    },
    {
      title: '📊 Reports',
      description: 'Lihat laporan keuangan',
      icon: '📊',
      tips: [
        'Laporan Laba Rugi (Income Statement)',
        'Laporan Neraca (Balance Sheet)',
        'Laporan Arus Kas (Cash Flow)',
        'Analisis tren keuangan',
      ],
    },
    {
      title: '📈 Analytics',
      description: 'Analisis data keuangan mendalam',
      icon: '📈',
      tips: [
        'Analisis profitabilitas per produk',
        'Analisis margin keuntungan',
        'Lihat tren penjualan vs biaya',
        'Proyeksi keuangan ke depan',
      ],
    },
    {
      title: '💵 Receivable',
      description: 'Kelola piutang pelanggan',
      icon: '💵',
      tips: [
        'Lihat daftar piutang per pelanggan',
        'Lihat umur piutang (berapa lama belum dibayar)',
        'Identifikasi piutang overdue',
        'Kirim pengingat pembayaran ke pelanggan',
      ],
    },
    {
      title: '💸 Payable',
      description: 'Kelola hutang ke supplier',
      icon: '💸',
      tips: [
        'Lihat daftar hutang per supplier',
        'Lihat umur hutang (berapa lama belum dibayar)',
        'Identifikasi hutang yang akan jatuh tempo',
        'Catat pembayaran hutang',
      ],
    },
    {
      title: '🧾 Tax',
      description: 'Kelola pajak dan laporan pajak',
      icon: '🧾',
      tips: [
        'Catat PPN masukan dan keluaran',
        'Buat laporan SPT Masa PPN',
        'Catat PPh 21, 22, 23, 25',
        'Export data untuk pelaporan ke DJP',
      ],
    },
    {
      title: '📑 Accounts',
      description: 'Kelola Chart of Accounts (COA)',
      icon: '📑',
      tips: [
        'Lihat struktur akun (Aset, Liabilitas, Ekuitas, dll)',
        'Tambah akun baru sesuai kebutuhan',
        'Kelompokkan akun per kategori',
        'Gunakan untuk jurnal entry',
      ],
    },

    // HR
    {
      title: '👤 Staff',
      description: 'Kelola data karyawan',
      icon: '👤',
      tips: [
        'Tambah karyawan baru dengan data lengkap',
        'Atur posisi dan departemen',
        'Kelola gaji dan tunjangan',
        'Lihat riwayat karyawan',
      ],
    },
    {
      title: '⚙️ Config',
      description: 'Konfigurasi HR',
      icon: '⚙️',
      tips: [
        'Atur struktur organisasi',
        'Kelola posisi dan jabatan',
        'Atur kebijakan cuti dan libur',
        'Kelola benefit karyawan',
      ],
    },

    // ADMIN
    {
      title: '⚙️ Settings',
      description: 'Pengaturan sistem',
      icon: '⚙️',
      tips: [
        'Atur informasi perusahaan',
        'Kelola pengguna dan akses',
        'Atur preferensi sistem',
        'Backup dan restore data',
      ],
    },
    {
      title: '🗄️ Data',
      description: 'Kelola data server',
      icon: '🗄️',
      tips: [
        'Lihat semua data yang tersimpan',
        'Hapus data yang tidak diperlukan',
        'Backup data penting',
        'Monitor penggunaan storage',
      ],
    },
    {
      title: '👤 Access',
      description: 'Kontrol akses pengguna',
      icon: '👤',
      tips: [
        'Kelola user dan password',
        'Atur role dan permission',
        'Lihat aktivitas pengguna',
        'Audit trail untuk keamanan',
      ],
    },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '28px', fontWeight: '600' }}>
          📚 User Guide
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
          Panduan lengkap untuk semua menu dan fitur sistem
        </p>
      </div>

      {/* User Guide - 3 Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {guideSteps.map((step, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-primary)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <button
              onClick={() => setExpandedGuide(expandedGuide === step.title ? null : step.title)}
              style={{
                width: '100%',
                padding: '16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{step.icon}</span>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ marginBottom: '4px' }}>
                  {step.title.split(' ').slice(1).join(' ')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400', lineHeight: '1.4' }}>
                  {step.description}
                </div>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }}>
                {expandedGuide === step.title ? '▼' : '▶'}
              </span>
            </button>

            {expandedGuide === step.title && (
              <div style={{ 
                padding: '16px', 
                borderTop: '1px solid var(--border-color)', 
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '12px',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
              }}>
                {step.tips && (
                  <div>
                    <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>💡 Tips:</strong>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {step.tips.map((tip, tipIdx) => (
                        <li key={tipIdx} style={{ marginBottom: '6px', color: 'var(--text-secondary)' }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
