import * as XLSX from "xlsx";

function parseNumber(v: any): number {
  if (v === undefined || v === null) return 0;
  const s = String(v).trim().replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: any): string {
  const d = new Date(String(v).trim());
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export const ImportExport = {
  parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(x => x.trim().length > 0);
    if (!lines.length) return [];
    const header = lines[0].split(",").map(x => x.trim().toLowerCase());
    const idx = {
      date: header.findIndex(x => x.includes("date")),
      desc: header.findIndex(x => x.includes("description")),
      cat: header.findIndex(x => x.includes("category")),
      merch: header.findIndex(x => x.includes("merchant")),
      paid: header.findIndex(x => x.includes("paid")),
      inc: header.findIndex(x => x.includes("income")),
      exp: header.findIndex(x => x.includes("expense"))
    };
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      rows.push({
        expense_date: parseDate(parts[idx.date] ?? ""),
        expense_description: String(parts[idx.desc] ?? "").trim(),
        expense_category: String(parts[idx.cat] ?? "").trim(),
        merchant_name: String(parts[idx.merch] ?? "").trim(),
        paid_through: String(parts[idx.paid] ?? "").trim(),
        income_amount: parseNumber(parts[idx.inc]),
        expense_amount: parseNumber(parts[idx.exp])
      });
    }
    return rows;
  },
  parseWorkbookBase64(base64: string) {
    const wb = XLSX.read(base64, { type: "base64" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return json.map((r: any) => ({
      expense_date: parseDate(r["Expense Date"] ?? r["Date"] ?? r["date"] ?? ""),
      expense_description: String(r["Expense Description"] ?? r["Description"] ?? r["description"] ?? "").trim(),
      expense_category: String(r["Expense Category"] ?? r["Category"] ?? r["category"] ?? "").trim(),
      merchant_name: String(r["Merchant Name"] ?? r["Merchant"] ?? r["merchant"] ?? "").trim(),
      paid_through: String(r["Paid Through"] ?? r["paid_through"] ?? r["Paid"] ?? "").trim(),
      income_amount: parseNumber(r["Income Amount"] ?? r["Income"] ?? r["income"]),
      expense_amount: parseNumber(r["Expense Amount"] ?? r["Expense"] ?? r["amount"])
    }));
  },
  generateExcelBase64(records: any[]) {
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  }
};
