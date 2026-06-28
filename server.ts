import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Book, Order, OrderDetail, Transaction } from "./src/types";
import {
  fetchBooksFromSheet,
  fetchAdminsFromSheet,
  fetchStudentsFromSheet,
  fetchSettingsFromSheet,
  appendRowToSheet,
  updateCellsInSheet,
  fetchPublicSheetCSV,
  fetchSheetValuesWithToken,
  smartAppendRowToSheet,
  Student
} from "./sheets";

const app = express();
const PORT = 3000;

let activeGoogleToken: string | null = null;

app.use(express.json());

// Paths for persistent data store
const DB_FILE = path.join(process.cwd(), "db_store.json");

// Initial Seed Data
const INITIAL_BOOKS: Book[] = [
  // Kelas 1
  { kode: "B-W0101", nama: "Pendidikan Pancasila Kelas 1 (Kurikulum Merdeka)", kategori: "Wajib", kelas: "1", harga: 75000, stok: 60 },
  { kode: "B-W0102", nama: "Matematika SD Kelas 1", kategori: "Wajib", kelas: "1", harga: 82000, stok: 55 },
  { kode: "B-W0103", nama: "Bahasa Indonesia - Aku Bisa! Kelas 1", kategori: "Wajib", kelas: "1", harga: 68000, stok: 70 },
  { kode: "B-W0104", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 1", kategori: "Wajib", kelas: "1", harga: 60000, stok: 45 },
  { kode: "B-P0101", nama: "My Next Words Kelas 1 - English for Primary", kategori: "Pendamping", kelas: "1", harga: 55000, stok: 50 },
  
  // Kelas 2
  { kode: "B-W0201", nama: "Pendidikan Pancasila Kelas 2", kategori: "Wajib", kelas: "2", harga: 78000, stok: 50 },
  { kode: "B-W0202", nama: "Matematika SD Kelas 2", kategori: "Wajib", kelas: "2", harga: 85000, stok: 48 },
  { kode: "B-W0203", nama: "Bahasa Indonesia - Kawan Seiring Kelas 2", kategori: "Wajib", kelas: "2", harga: 70000, stok: 65 },
  { kode: "B-W0204", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 2", kategori: "Wajib", kelas: "2", harga: 62000, stok: 40 },
  { kode: "B-P0201", nama: "My Next Words Kelas 2", kategori: "Pendamping", kelas: "2", harga: 55000, stok: 45 },

  // Kelas 3
  { kode: "B-W0301", nama: "Pendidikan Pancasila Kelas 3", kategori: "Wajib", kelas: "3", harga: 80000, stok: 52 },
  { kode: "B-W0302", nama: "Matematika SD Kelas 3", kategori: "Wajib", kelas: "3", harga: 88000, stok: 50 },
  { kode: "B-W0303", nama: "Bahasa Indonesia Kelas 3", kategori: "Wajib", kelas: "3", harga: 72000, stok: 58 },
  { kode: "B-W0304", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 3", kategori: "Wajib", kelas: "3", harga: 65000, stok: 42 },
  { kode: "B-P0301", nama: "My Next Words Kelas 3", kategori: "Pendamping", kelas: "3", harga: 58000, stok: 40 },

  // Kelas 4
  { kode: "B-W0401", nama: "Pendidikan Pancasila Kelas 4", kategori: "Wajib", kelas: "4", harga: 85000, stok: 48 },
  { kode: "B-W0402", nama: "Matematika Volume 1 Kelas 4", kategori: "Wajib", kelas: "4", harga: 90000, stok: 40 },
  { kode: "B-W0403", nama: "Bahasa Indonesia Kelas 4", kategori: "Wajib", kelas: "4", harga: 75000, stok: 55 },
  { kode: "B-W0404", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 4", kategori: "Wajib", kelas: "4", harga: 68000, stok: 35 },
  { kode: "B-U0401", nama: "Science Primary 4 - Bilingual Edition", kategori: "Penunjang", kelas: "4", harga: 120000, stok: 25 },

  // Kelas 5
  { kode: "B-W0501", nama: "Pendidikan Pancasila Kelas 5", kategori: "Wajib", kelas: "5", harga: 88000, stok: 45 },
  { kode: "B-W0502", nama: "Matematika Volume 1 Kelas 5", kategori: "Wajib", kelas: "5", harga: 92000, stok: 42 },
  { kode: "B-W0503", nama: "Bahasa Indonesia Kelas 5", kategori: "Wajib", kelas: "5", harga: 78000, stok: 50 },
  { kode: "B-W0504", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 5", kategori: "Wajib", kelas: "5", harga: 70000, stok: 35 },
  { kode: "B-P0501", nama: "English Focus - Workbook Kelas 5", kategori: "Pendamping", kelas: "5", harga: 95000, stok: 30 },

  // Kelas 6
  { kode: "B-W0601", nama: "Pendidikan Pancasila Kelas 6", kategori: "Wajib", kelas: "6", harga: 90000, stok: 40 },
  { kode: "B-W0602", nama: "Matematika Volume 1 Kelas 6", kategori: "Wajib", kelas: "6", harga: 95000, stok: 40 },
  { kode: "B-W0603", nama: "Bahasa Indonesia Kelas 6", kategori: "Wajib", kelas: "6", harga: 80000, stok: 45 },
  { kode: "B-W0604", nama: "Pendidikan Agama Katolik & Budi Pekerti Kelas 6", kategori: "Wajib", kelas: "6", harga: 72000, stok: 35 },
  { kode: "B-U0601", nama: "Ringkasan Materi US SD/MI Xaverius", kategori: "Penunjang", kelas: "6", harga: 110000, stok: 40 }
];

const INITIAL_ADMINS = [
  { user: "admin", pass: "admin123", nama: "Yuliana Kristina Pogang, S.Pd." },
  { user: "tu", pass: "tu123", nama: "Yustinus Andhi Lesmana" }
];

// In-Memory state loaded from / saved to file
let dbState = {
  books: INITIAL_BOOKS,
  orders: [] as Order[],
  orderDetails: [] as OrderDetail[],
  transactions: [] as Transaction[],
  admins: INITIAL_ADMINS,
  students: [] as Student[],
  settings: {
    NamaSekolah: "SD Xaverius 2 Jambi",
    Alamat: "Jl. Untung Surapati No. 27 Kec. Jelutung Kel. Jelutung Kota Jambi",
    Telepon: "0741 40491",
    TahunPelajaran: "2026/2027",
    BidangKurikulum: "Yuliana Maya Safitri, S.Pd",
    Bendahara: "Yuliana Kristina Pogang, S.Pd"
  } as Record<string, string>
};

// Helper to load DB
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbState = JSON.parse(data);
      // Fallback/fill missing properties if schemas change slightly
      if (!dbState.books) dbState.books = INITIAL_BOOKS;
      if (!dbState.orders) dbState.orders = [];
      if (!dbState.orderDetails) dbState.orderDetails = [];
      if (!dbState.transactions) dbState.transactions = [];
      if (!dbState.admins) dbState.admins = INITIAL_ADMINS;
      if (!dbState.students) dbState.students = [];
      if (!dbState.settings) {
        dbState.settings = {
          NamaSekolah: "SD Xaverius 2 Jambi",
          Alamat: "Jl. Untung Surapati No. 27 Kec. Jelutung Kel. Jelutung Kota Jambi",
          Telepon: "0741 40491",
          TahunPelajaran: "2026/2027",
          BidangKurikulum: "Yuliana Maya Safitri, S.Pd",
          Bendahara: "Yuliana Kristina Pogang, S.Pd"
        };
      }
    } else {
      saveDB();
    }
  } catch (err) {
    console.error("Error loading db_store.json:", err);
  }
}

// Helper to save DB
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving db_store.json:", err);
  }
}

async function syncLaporanHarianToSheets(formatTanggal: string, orderItems: any[], token: string) {
  try {
    console.log("Syncing to 07_LaporanHarian in real-time...");
    const csvRows = await fetchSheetValuesWithToken("07_LaporanHarian", token);
    
    for (const item of orderItems) {
      const matchIndex = csvRows.findIndex((row, idx) => {
        if (idx === 0) return false;
        return (
          row[0]?.trim() === formatTanggal &&
          row[1]?.trim() === item.namaBuku &&
          row[2]?.trim() === String(item.kelas)
        );
      });

      const localBook = dbState.books.find(b => b.kode === item.kodeBuku);
      const remainingStock = localBook ? localBook.stok : 0;

      if (matchIndex !== -1) {
        const rowNum = matchIndex + 1; // 1-indexed
        const currentQty = parseInt(String(csvRows[matchIndex][3] || "0").replace(/[^\d]/g, "")) || 0;
        const currentTotal = parseInt(String(csvRows[matchIndex][5] || "0").replace(/[^\d]/g, "")) || 0;

        const newQty = currentQty + item.qty;
        const newTotal = currentTotal + item.subtotal;

        // Columns: D (Jumlah Buku), E (Jumlah Stok Tersedia), F (Total)
        await updateCellsInSheet("07_LaporanHarian", `D${rowNum}:F${rowNum}`, [[newQty, remainingStock, newTotal]], token);
        console.log(`Updated 07_LaporanHarian row ${rowNum} for ${item.namaBuku}`);
      } else {
        await smartAppendRowToSheet("07_LaporanHarian", [
          formatTanggal,
          item.namaBuku,
          String(item.kelas),
          item.qty,
          remainingStock,
          item.subtotal
        ], token);
        console.log(`Appended to 07_LaporanHarian for ${item.namaBuku}`);
      }
    }
  } catch (err: any) {
    console.error("Error syncing 07_LaporanHarian:", err.message);
  }
}

async function syncFromSheetsOnBoot() {
  console.log("Attempting to load initial data from Google Sheets...");
  try {
    const sheetBooks = await fetchBooksFromSheet();
    if (sheetBooks && sheetBooks.length > 0) {
      dbState.books = sheetBooks;
      console.log(`Loaded ${sheetBooks.length} books from Google Sheets.`);
    }
  } catch (err: any) {
    console.warn("Failed to load books from Google Sheets on boot, using cache:", err.message);
  }

  try {
    const sheetAdmins = await fetchAdminsFromSheet();
    if (sheetAdmins && sheetAdmins.length > 0) {
      dbState.admins = sheetAdmins.map(a => ({ user: a.user, pass: a.pass, nama: a.nama }));
      console.log(`Loaded ${sheetAdmins.length} admins from Google Sheets.`);
    }
  } catch (err: any) {
    console.warn("Failed to load admins from Google Sheets on boot, using cache:", err.message);
  }

  try {
    const sheetStudents = await fetchStudentsFromSheet();
    if (sheetStudents && sheetStudents.length > 0) {
      dbState.students = sheetStudents;
      console.log(`Loaded ${sheetStudents.length} students from Google Sheets.`);
    }
  } catch (err: any) {
    console.warn("Failed to load students from Google Sheets on boot, using cache:", err.message);
  }

  try {
    const sheetSettings = await fetchSettingsFromSheet();
    if (sheetSettings && Object.keys(sheetSettings).length > 0) {
      dbState.settings = { ...dbState.settings, ...sheetSettings };
      console.log("Loaded settings from Google Sheets:", dbState.settings);
    }
  } catch (err: any) {
    console.warn("Failed to load settings from Google Sheets on boot, using defaults:", err.message);
  }

  saveDB();
}

// Load DB immediately on server boot
loadDB();
syncFromSheetsOnBoot();

// ==========================================
// API ROUTES
// ==========================================

// 1. GET Book Catalog
app.get("/api/buku", (req, res) => {
  res.json(dbState.books);
});

// 2. ADD/UPDATE Book (Admin)
app.post("/api/buku", (req, res) => {
  const { kode, nama, kategori, kelas, harga, stok } = req.body;
  if (!kode || !nama || !kelas) {
    return res.status(400).json({ error: "Kode, Nama, and Kelas are required" });
  }

  const existingIndex = dbState.books.findIndex((b) => b.kode.toLowerCase() === kode.trim().toLowerCase());
  const updatedBook: Book = {
    kode: kode.trim(),
    nama: nama.trim(),
    kategori: kategori || "Wajib",
    kelas: kelas.trim(),
    harga: Number(harga) || 0,
    stok: Number(stok) || 0,
  };

  if (existingIndex !== -1) {
    dbState.books[existingIndex] = updatedBook;
  } else {
    dbState.books.push(updatedBook);
  }

  saveDB();
  res.json({ status: "success", book: updatedBook });
});

// 3. POST Parent Order Submission
app.post("/api/pesan", async (req, res) => {
  try {
    const { namaSiswa, namaOrangTua, kelas, items } = req.body;
    if (!namaSiswa || !kelas || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "gagal", mesej: "Detail pesanan tidak lengkap!" });
    }

    const noPesanan = "PSN-" + Math.floor(Date.now() / 1000);
    const now = new Date();
    // Use GMT+7 timezone representation for Jambi
    const formatterTgl = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
    const formatterJam = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
    
    // Format tanggal as YYYY-MM-DD for consistency
    const partsTgl = formatterTgl.formatToParts(now);
    const day = partsTgl.find(p => p.type === "day")?.value || "01";
    const month = partsTgl.find(p => p.type === "month")?.value || "01";
    const year = partsTgl.find(p => p.type === "year")?.value || "2026";
    const tglString = `${year}-${month}-${day}`;
    
    const jamString = formatterJam.format(now).replace(".", ":");

    let totalBayar = 0;
    const detailBukuTerbeli: OrderDetail[] = [];

    // Process items
    for (const item of items) {
      const infoBuku = dbState.books.find(b => b.kode.trim() === String(item.kode).trim());
      if (infoBuku) {
        const qty = Number(item.qty) || 0;
        if (qty <= 0) continue;

        const subtotal = infoBuku.harga * qty;
        totalBayar += subtotal;

        const detailItem: OrderDetail = {
          noPesanan,
          kodeBuku: infoBuku.kode,
          namaBuku: infoBuku.nama,
          kelas: infoBuku.kelas,
          qty,
          harga: infoBuku.harga,
          subtotal
        };

        detailBukuTerbeli.push(detailItem);
        dbState.orderDetails.push(detailItem);
      }
    }

    if (detailBukuTerbeli.length === 0) {
      return res.status(400).json({ status: "gagal", mesej: "Tidak ada buku valid yang dipilih!" });
    }

    const newOrder: Order = {
      noPesanan,
      tanggal: tglString,
      jam: jamString,
      namaSiswa: String(namaSiswa).trim(),
      kelas: String(kelas).trim(),
      total: totalBayar,
      status: "Belum Bayar",
      noTransaksi: "-",
      petugas: "-",
      metodeBayar: "-",
      namaOrangTua: String(namaOrangTua || "-").trim(),
    };

    dbState.orders.push(newOrder);
    saveDB();

    // Sync order to Google Sheets in real-time if token is available
    if (activeGoogleToken) {
      try {
        await smartAppendRowToSheet("03_Pesanan", [
          newOrder.noPesanan,
          newOrder.tanggal,
          newOrder.jam,
          newOrder.namaSiswa,
          newOrder.kelas,
          newOrder.total,
          newOrder.status,
          newOrder.noTransaksi,
          newOrder.petugas,
          newOrder.metodeBayar,
          newOrder.namaOrangTua
        ], activeGoogleToken);

        for (const item of detailBukuTerbeli) {
          await smartAppendRowToSheet("04_DetailPesanan", [
            item.noPesanan,
            item.kodeBuku,
            item.namaBuku,
            item.kelas,
            item.qty,
            item.harga,
            item.subtotal
          ], activeGoogleToken);
        }
        console.log(`Successfully synced order ${newOrder.noPesanan} to Google Sheets in real-time.`);
      } catch (sheetErr: any) {
        console.error(`Real-time sheet sync failed for order ${newOrder.noPesanan}:`, sheetErr.message);
      }
    }

    res.json({
      status: "berjaya",
      noPesanan,
      tanggal: tglString,
      jam: jamString,
      namaSiswa: newOrder.namaSiswa,
      namaOrangTua: newOrder.namaOrangTua,
      kelas: newOrder.kelas,
      total: totalBayar,
      items: detailBukuTerbeli
    });
  } catch (err: any) {
    res.status(500).json({ status: "gagal", mesej: err.toString() });
  }
});

// 4. GET All Orders (Admin)
app.get("/api/pesanan", (req, res) => {
  // Return orders decorated with their details for rich rendering in dashboard
  const enrichedOrders = dbState.orders.map(order => {
    const items = dbState.orderDetails.filter(detail => detail.noPesanan === order.noPesanan);
    return { ...order, items };
  });
  // Sort descending by date & time or custom id
  enrichedOrders.reverse();
  res.json(enrichedOrders);
});

// 5. POST Confirm Payment (Admin)
app.post("/api/sahkan", async (req, res) => {
  try {
    const { noPesanan, metode, namaPetugas } = req.body;
    if (!noPesanan || !metode || !namaPetugas) {
      return res.status(400).json({ status: "gagal", mesej: "Parameter konfirmasi tidak lengkap!" });
    }

    const orderIndex = dbState.orders.findIndex(o => o.noPesanan === noPesanan);
    if (orderIndex === -1) {
      return res.status(404).json({ status: "gagal", mesej: "Pesanan tidak ditemukan!" });
    }

    const order = dbState.orders[orderIndex];
    if (order.status === "Selesai") {
      return res.status(400).json({ status: "gagal", mesej: "Pesanan sudah selesai dibayar sebelumnya!" });
    }

    // Check stock for all items
    const orderItems = dbState.orderDetails.filter(d => d.noPesanan === noPesanan);
    for (const item of orderItems) {
      const bookIndex = dbState.books.findIndex(b => b.kode === item.kodeBuku);
      if (bookIndex !== -1) {
        if (dbState.books[bookIndex].stok < item.qty) {
          return res.status(400).json({
            status: "gagal",
            mesej: `Stok buku "${dbState.books[bookIndex].nama}" tidak mencukupi! Tersisa: ${dbState.books[bookIndex].stok}, Diminta: ${item.qty}`
          });
        }
      }
    }

    // Generate TX number
    const noTransaksi = "TX-" + Math.floor(Date.now() / 1000);
    const now = new Date();
    
    const formatterTgl = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
    const formatterJam = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    
    const partsTgl = formatterTgl.formatToParts(now);
    const day = partsTgl.find(p => p.type === "day")?.value || "01";
    const month = partsTgl.find(p => p.type === "month")?.value || "01";
    const year = partsTgl.find(p => p.type === "year")?.value || "2026";
    const formatTanggal = `${day}/${month}/${year}`;
    
    const formatJam = formatterJam.format(now).replace(".", ":");

    // Deduct stock
    for (const item of orderItems) {
      const bookIndex = dbState.books.findIndex(b => b.kode === item.kodeBuku);
      if (bookIndex !== -1) {
        dbState.books[bookIndex].stok = Math.max(0, dbState.books[bookIndex].stok - item.qty);
      }
    }

    // Update order
    order.status = "Selesai";
    order.noTransaksi = noTransaksi;
    order.petugas = namaPetugas;
    order.metodeBayar = metode;

    // Append to Transactions
    const newTx: Transaction = {
      noTransaksi,
      noPesanan,
      tanggalBayar: formatTanggal,
      jamBayar: formatJam,
      metode,
      jumlah: order.total,
      petugas: namaPetugas,
      status: "Selesai"
    };
    dbState.transactions.push(newTx);

    saveDB();

    // Sync payment and deduct stock in Google Sheets in real-time if token is available
    if (activeGoogleToken) {
      try {
        // 1. Update status inside 03_Pesanan
        const pesananRows = await fetchSheetValuesWithToken("03_Pesanan", activeGoogleToken);
        const pesananIndex = pesananRows.findIndex(row => row[0]?.trim() === noPesanan);
        if (pesananIndex !== -1) {
          const rowNum = pesananIndex + 1; // 1-indexed
          // Column index mappings:
          // G is column 7 (index 6): Status
          // H is column 8 (index 7): No Transaksi
          // I is column 9 (index 8): Petugas
          // J is column 10 (index 9): Metode Bayar
          await updateCellsInSheet("03_Pesanan", `G${rowNum}:H${rowNum}`, [["Selesai", noTransaksi]], activeGoogleToken);
          await updateCellsInSheet("03_Pesanan", `I${rowNum}:J${rowNum}`, [[namaPetugas, metode]], activeGoogleToken);
        }

        // 2. Append transaction to 06_Transaksi
        await smartAppendRowToSheet("06_Transaksi", [
          noTransaksi,
          noPesanan,
          formatTanggal,
          formatJam,
          metode,
          order.total,
          namaPetugas,
          "Selesai"
        ], activeGoogleToken);

        // 3. Deduct stock in 02_Buku
        const bukuRows = await fetchSheetValuesWithToken("02_Buku", activeGoogleToken);
        for (const item of orderItems) {
          const bIndex = bukuRows.findIndex(row => row[0]?.trim() === item.kodeBuku);
          if (bIndex !== -1) {
            const rowNum = bIndex + 1;
            const currentSheetStok = parseInt(String(bukuRows[bIndex][5] || "0").replace(/[^\d]/g, "")) || 0;
            const newSheetStok = Math.max(0, currentSheetStok - item.qty);
            // Stock is column F (column 6, index 5)
            await updateCellsInSheet("02_Buku", `F${rowNum}`, [[newSheetStok]], activeGoogleToken);
          }
        }

        // 4. Update Daily Report 07_LaporanHarian
        await syncLaporanHarianToSheets(formatTanggal, orderItems, activeGoogleToken);

        console.log(`Successfully synced payment validation for ${noPesanan}, updated stocks and Daily Report in Google Sheets.`);
      } catch (sheetErr: any) {
        console.error(`Real-time sheet sync failed for payment validation of ${noPesanan}:`, sheetErr.message);
      }
    }

    res.json({ status: "berjaya", noTransaksi });
  } catch (err: any) {
    res.status(500).json({ status: "gagal", mesej: err.toString() });
  }
});

// 6. POST Login Admin
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ status: "gagal", mesej: "Username dan password diperlukan!" });
    }

    const admin = dbState.admins.find(
      (a) => a.user.trim() === username.trim() && a.pass.trim() === password.trim()
    );

    if (admin) {
      res.json({ status: "berjaya", nama: admin.nama, username: admin.user });
    } else {
      res.status(401).json({ status: "gagal", mesej: "Username atau password salah!" });
    }
  } catch (err: any) {
    res.status(500).json({ status: "gagal", mesej: err.toString() });
  }
});

// 7. GET Transactions History
app.get("/api/transaksi", (req, res) => {
  res.json([...dbState.transactions].reverse());
});

// 8. POST Reset Database
app.post("/api/reset", async (req, res) => {
  try {
    // Clear simulation transaction, orders, and orderDetails data
    dbState.orders = [];
    dbState.orderDetails = [];
    dbState.transactions = [];
    
    // Reload the latest actual books, admins, students, and settings from Google Sheets
    await syncFromSheetsOnBoot();
    
    saveDB();
    res.json({ status: "success", message: "Database reset to initial state" });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.toString() });
  }
});

// 9. POST Connect Google Sheets Token
app.post("/api/sheets/connect", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Access token is required" });
  }
  activeGoogleToken = token;
  console.log("Google Sheets OAuth token received and cached on server.");
  res.json({ status: "success", connected: true });
});

// 10. GET Google Sheets Connection Status
app.get("/api/sheets/status", (req, res) => {
  res.json({
    connected: activeGoogleToken !== null,
    sheetId: "1Ff5ru5DPHxDoHERc38ukdHtPW7XedLU2bGJp3f7g1hE"
  });
});

// 11. GET School Settings (dynamic from sheets)
app.get("/api/settings", (req, res) => {
  res.json({
    ...dbState.settings,
    connectedToSheets: activeGoogleToken !== null
  });
});

// 12. GET Students List for Autocompletion
app.get("/api/siswa", (req, res) => {
  res.json(dbState.students || []);
});

// 13. POST Sync with Google Sheets
app.post("/api/sheets/sync", async (req, res) => {
  const { token } = req.body;
  if (token) {
    activeGoogleToken = token;
  }

  if (!activeGoogleToken) {
    return res.status(401).json({ status: "gagal", mesej: "Google Sheets belum terhubung! Silakan login Google terlebih dahulu." });
  }

  try {
    // 1. Pull latest Books, Admins, Students, Settings
    await syncFromSheetsOnBoot();

    // 2. Push any local orders that might be missing in sheets
    const pesananRows = await fetchSheetValuesWithToken("03_Pesanan", activeGoogleToken);
    const existingNoPesanan = new Set(pesananRows.map(row => row[0]?.trim()));

    let syncedOrdersCount = 0;
    for (const order of dbState.orders) {
      if (!existingNoPesanan.has(order.noPesanan)) {
        await smartAppendRowToSheet("03_Pesanan", [
          order.noPesanan,
          order.tanggal,
          order.jam,
          order.namaSiswa,
          order.kelas,
          order.total,
          order.status,
          order.noTransaksi,
          order.petugas,
          order.metodeBayar,
          order.namaOrangTua
        ], activeGoogleToken);

        const details = dbState.orderDetails.filter(d => d.noPesanan === order.noPesanan);
        for (const item of details) {
          await smartAppendRowToSheet("04_DetailPesanan", [
            item.noPesanan,
            item.kodeBuku,
            item.namaBuku,
            item.kelas,
            item.qty,
            item.harga,
            item.subtotal
          ], activeGoogleToken);
        }
        syncedOrdersCount++;
      } else {
        // Update status in sheet if local status is "Selesai" but sheet status is pending
        const sheetRowIdx = pesananRows.findIndex(row => row[0]?.trim() === order.noPesanan);
        if (sheetRowIdx !== -1) {
          const sheetStatus = pesananRows[sheetRowIdx][6]?.trim();
          if (order.status === "Selesai" && sheetStatus !== "Selesai") {
            const rowNum = sheetRowIdx + 1;
            await updateCellsInSheet("03_Pesanan", `G${rowNum}:H${rowNum}`, [["Selesai", order.noTransaksi]], activeGoogleToken);
            await updateCellsInSheet("03_Pesanan", `I${rowNum}:J${rowNum}`, [[order.petugas, order.metodeBayar]], activeGoogleToken);
          }
        }
      }
    }

    // 3. Push missing transactions
    const txRows = await fetchSheetValuesWithToken("06_Transaksi", activeGoogleToken);
    const existingTxNo = new Set(txRows.map(row => row[0]?.trim()));

    let syncedTxCount = 0;
    for (const tx of dbState.transactions) {
      if (!existingTxNo.has(tx.noTransaksi)) {
        await smartAppendRowToSheet("06_Transaksi", [
          tx.noTransaksi,
          tx.noPesanan,
          tx.tanggalBayar,
          tx.jamBayar,
          tx.metode,
          tx.jumlah,
          tx.petugas,
          "Selesai"
        ], activeGoogleToken);
        syncedTxCount++;
      }
    }

    res.json({
      status: "berjaya",
      mesej: "Sinkronisasi dengan Google Sheets berhasil!",
      detail: {
        booksLoaded: dbState.books.length,
        studentsLoaded: dbState.students.length,
        ordersSynced: syncedOrdersCount,
        transactionsSynced: syncedTxCount
      }
    });
  } catch (err: any) {
    console.error("Full sync failed:", err);
    res.status(500).json({ status: "gagal", mesej: `Sinkronisasi gagal: ${err.message}` });
  }
});

// ==========================================
// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SD Xaverius 2 Bookstore] Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
