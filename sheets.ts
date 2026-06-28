import { Book, Order, OrderDetail, Transaction } from "./src/types";

const SPREADSHEET_ID = "1Ff5ru5DPHxDoHERc38ukdHtPW7XedLU2bGJp3f7g1hE";

// RFC 4180 compliant CSV parser
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue);
      currentValue = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(currentValue);
      if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
        result.push(row);
      }
      row = [];
      currentValue = "";
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
    } else {
      currentValue += char;
    }
  }
  if (currentValue || row.length > 0) {
    row.push(currentValue);
    result.push(row);
  }
  return result;
}

// Fetch a public sheet as CSV (extremely fast, zero auth, zero quotas)
export async function fetchPublicSheetCSV(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet [${sheetName}]: status ${res.status}`);
  }
  const text = await res.text();
  if (text.includes("Error") && text.length < 200) {
    throw new Error(`Google Sheets reported an error for sheet [${sheetName}]: ${text.trim()}`);
  }
  return parseCSV(text);
}

// Map CSV to Book objects
export async function fetchBooksFromSheet(): Promise<Book[]> {
  try {
    const rows = await fetchPublicSheetCSV("02_Buku");
    if (rows.length <= 1) return []; // Only header or empty
    
    // Header check: "KodeBuku","Barcode","NamaBuku","Kelas","Harga","Stok","Kategori","Status"
    const books: Book[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 6) continue;
      
      const kode = row[0]?.trim();
      const nama = row[2]?.trim();
      const kelas = row[3]?.trim();
      const rawHarga = row[4]?.trim() || "0";
      const rawStok = row[5]?.trim() || "0";
      const kategori = row[6]?.trim() || "Wajib";
      const status = row[7]?.trim() || "Aktif";

      // Only include active books
      if (!kode || !nama || status.toLowerCase() === "nonaktif" || status.toLowerCase() === "tidak aktif") {
        continue;
      }

      // Parse price (remove currency symbol, dots, commas)
      const hargaStr = rawHarga.replace(/[^\d]/g, "");
      const harga = parseInt(hargaStr) || 0;

      // Parse stock
      const stokStr = rawStok.replace(/[^\d]/g, "");
      const stok = parseInt(stokStr) || 0;

      books.push({
        kode,
        nama,
        kategori,
        kelas,
        harga,
        stok
      });
    }
    return books;
  } catch (err: any) {
    console.error("Error fetching books from Google Sheets:", err.message);
    throw err;
  }
}

// Map CSV to Admin users (for password login)
export async function fetchAdminsFromSheet(): Promise<{ user: string; pass: string; nama: string; role: string }[]> {
  try {
    const rows = await fetchPublicSheetCSV("05_Admin");
    if (rows.length <= 1) return [];
    
    // Header: "Username","Password","Nama Petugas","Role"
    const admins: { user: string; pass: string; nama: string; role: string }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;
      
      const user = row[0]?.trim();
      const pass = row[1]?.trim();
      const nama = row[2]?.trim();
      const role = row[3]?.trim() || "Staff";

      if (user && pass && nama) {
        admins.push({ user, pass, nama, role });
      }
    }
    return admins;
  } catch (err: any) {
    console.error("Error fetching admins from Google Sheets:", err.message);
    throw err;
  }
}

// Map CSV to Student info
export interface Student {
  nis: string;
  nama: string;
  kelas: string;
  jenisKelamin: string;
  namaOrtu: string;
  noHp: string;
  status: string;
}

export async function fetchStudentsFromSheet(): Promise<Student[]> {
  try {
    const rows = await fetchPublicSheetCSV("01_Siswa");
    if (rows.length <= 1) return [];
    
    // Header: "NIS","Nama","Kelas","JenisKelamin","NamaOrtu","NoHP","Status"
    const students: Student[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;
      
      const nis = row[0]?.trim() || "";
      const nama = row[1]?.trim() || "";
      const kelas = row[2]?.trim() || "";
      const jenisKelamin = row[3]?.trim() || "";
      const namaOrtu = row[4]?.trim() || "";
      const noHp = row[5]?.trim() || "";
      const status = row[6]?.trim() || "Aktif";

      if (nama) {
        students.push({ nis, nama, kelas, jenisKelamin, namaOrtu, noHp, status });
      }
    }
    return students;
  } catch (err: any) {
    console.error("Error fetching students from Google Sheets:", err.message);
    throw err;
  }
}

// Fetch general configuration from Sheet 09_Pengaturan
export async function fetchSettingsFromSheet(): Promise<Record<string, string>> {
  try {
    const rows = await fetchPublicSheetCSV("09_Pengaturan");
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.length >= 2) {
        const key = row[0]?.trim();
        const val = row[1]?.trim();
        if (key && val) {
          settings[key] = val;
        }
      }
    }
    return settings;
  } catch (err: any) {
    console.error("Error fetching settings from Google Sheets:", err.message);
    return {};
  }
}

// Append a row using Google Sheets API
export async function appendRowToSheet(sheetName: string, rowValues: any[], token: string): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      range: `${sheetName}!A1`,
      majorDimension: "ROWS",
      values: [rowValues]
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to append row to [${sheetName}]: status ${res.status} - ${errText}`);
  }
  return await res.json();
}

// Fetch spreadsheet values directly via API v4 using token (100% aligned with rows and absolute cell indexes)
export async function fetchSheetValuesWithToken(sheetName: string, token: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?valueRenderOption=UNFORMATTED_VALUE`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet values for [${sheetName}]: status ${res.status}`);
  }
  const data = await res.json();
  return data.values || [];
}

// Smart append that fills the first blank row if a formatted table has pre-allocated empty rows
export async function smartAppendRowToSheet(sheetName: string, rowValues: any[], token: string): Promise<any> {
  try {
    const rows = await fetchSheetValuesWithToken(sheetName, token);
    
    // Find the first row (excluding header row 1, so index >= 1) where column A is empty or blank
    let firstBlankRowIdx = -1;
    for (let i = 1; i < rows.length; i++) {
      const firstCell = rows[i][0];
      if (firstCell === undefined || firstCell === null || String(firstCell).trim() === "") {
        firstBlankRowIdx = i;
        break;
      }
    }

    if (firstBlankRowIdx !== -1) {
      const rowNum = firstBlankRowIdx + 1; // 1-indexed
      const colLetter = String.fromCharCode(65 + rowValues.length - 1); // A, B, C...
      const range = `A${rowNum}:${colLetter}${rowNum}`;
      console.log(`Smart append: found blank row in [${sheetName}] at row ${rowNum}. Updating range ${range}.`);
      return await updateCellsInSheet(sheetName, range, [rowValues], token);
    } else {
      console.log(`Smart append: no blank row found in [${sheetName}]. Appending new row.`);
      return await appendRowToSheet(sheetName, rowValues, token);
    }
  } catch (err: any) {
    console.error(`Smart append failed for [${sheetName}], falling back to normal append:`, err.message);
    return await appendRowToSheet(sheetName, rowValues, token);
  }
}

// Update cells inside sheet using Google Sheets API (used to change order status or update stock)
export async function updateCellsInSheet(sheetName: string, range: string, values: any[][], token: string): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=USER_ENTERED`;
  
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      range: `${sheetName}!${range}`,
      majorDimension: "ROWS",
      values
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update range [${range}] in [${sheetName}]: status ${res.status} - ${errText}`);
  }
  return await res.json();
}
