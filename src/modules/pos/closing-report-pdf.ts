import PDFDocument from "pdfkit";

export type ClosingReportSale = {
  saleNumber: string;
  completedAt: Date;
  status: string;
  subtotal: bigint;
  discount: bigint;
  tax: bigint;
  total: bigint;
  itemCount: number;
  paymentMethods: string[];
};

export type ClosingReportPayment = { method: string; amount: bigint };
export type ClosingReportCashMovement = { type: "CASH_IN" | "CASH_OUT"; amount: bigint; reason: string; createdAt: Date };

export type ClosingReportData = {
  businessName: string;
  branchName: string;
  branchCode: string;
  cashierName: string;
  currency: string;
  timezone: string;
  sessionId: string;
  openedAt: Date;
  closedAt: Date;
  openingCash: bigint;
  expectedCash: bigint;
  actualCash: bigint;
  cashDifference: bigint;
  generatedAt: Date;
  sales: ClosingReportSale[];
  payments: ClosingReportPayment[];
  cashMovements: ClosingReportCashMovement[];
};

const palette = { ink: "#17211B", muted: "#68736C", line: "#DCE4DF", soft: "#F2F6F3", green: "#176B49", evergreen: "#073F32", mint: "#DFF1E7", danger: "#A93636" };
const page = { left: 40, right: 555, bottom: 790 };

function money(value: bigint, currency: string) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${currency} ${whole}.${fraction}`;
}

function dateTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: timezone, year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true }).format(value);
}

function shortTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true }).format(value);
}

function displayMethod(method: string) { return method.replaceAll("_", " "); }

export function summarizeClosingReport(report: ClosingReportData) {
  const completedSales = report.sales.filter((sale) => sale.status === "COMPLETED");
  const netSales = completedSales.reduce((total, sale) => total + sale.total, 0n);
  const discounts = completedSales.reduce((total, sale) => total + sale.discount, 0n);
  const items = completedSales.reduce((total, sale) => total + sale.itemCount, 0);
  const cashIn = report.cashMovements.filter((movement) => movement.type === "CASH_IN").reduce((total, movement) => total + movement.amount, 0n);
  const cashOut = report.cashMovements.filter((movement) => movement.type === "CASH_OUT").reduce((total, movement) => total + movement.amount, 0n);
  return { transactions: completedSales.length, netSales, discounts, items, cashIn, cashOut };
}

function drawCart(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc.save().lineWidth(2.4).lineCap("round").lineJoin("round").strokeColor("#FFFFFF");
  doc.moveTo(x, y).lineTo(x + 8, y).lineTo(x + 13, y + 22).lineTo(x + 39, y + 22).lineTo(x + 45, y + 6).lineTo(x + 16, y + 6).stroke();
  doc.fillColor(palette.mint).circle(x + 18, y + 29, 2.8).fill().circle(x + 36, y + 29, 2.8).fill();
  doc.strokeColor(palette.mint).lineWidth(2).moveTo(x + 20, y + 13).lineTo(x + 37, y + 13).stroke().restore();
}

function drawFirstHeader(doc: PDFKit.PDFDocument, report: ClosingReportData) {
  doc.rect(0, 0, doc.page.width, 104).fill(palette.evergreen);
  drawCart(doc, 40, 25);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(17).text("Retail Logic", 96, 28);
  doc.fillColor(palette.mint).font("Helvetica").fontSize(8).text("DAILY POS CLOSING REPORT", 96, 51, { characterSpacing: 1.1 });
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(14).text(report.businessName, 295, 26, { width: 260, align: "right", ellipsis: true, lineBreak: false });
  doc.fillColor(palette.mint).font("Helvetica").fontSize(9).text(`${report.branchName} (${report.branchCode})`, 295, 50, { width: 260, align: "right", ellipsis: true, lineBreak: false });
  doc.y = 126;
}

function drawContinuationHeader(doc: PDFKit.PDFDocument, report: ClosingReportData) {
  doc.fillColor(palette.evergreen).font("Helvetica-Bold").fontSize(10).text("RETAIL LOGIC", page.left, 28);
  doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(`${report.branchName} - Daily POS closing report`, 190, 29, { width: 365, align: "right" });
  doc.moveTo(page.left, 46).lineTo(page.right, 46).lineWidth(1).strokeColor(palette.line).stroke();
  doc.y = 62;
}

function addPage(doc: PDFKit.PDFDocument, report: ClosingReportData) {
  doc.addPage();
  drawContinuationHeader(doc, report);
}

function ensureSpace(doc: PDFKit.PDFDocument, report: ClosingReportData, height: number) {
  if (doc.y + height > page.bottom) addPage(doc, report);
}

function sectionTitle(doc: PDFKit.PDFDocument, report: ClosingReportData, title: string, subtitle?: string) {
  ensureSpace(doc, report, subtitle ? 45 : 32);
  doc.fillColor(palette.green).font("Helvetica-Bold").fontSize(8).text(title.toUpperCase(), page.left, doc.y, { characterSpacing: 0.9 });
  if (subtitle) doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text(subtitle, 240, doc.y - 1, { width: 315, align: "right" });
  doc.y += 14;
  doc.moveTo(page.left, doc.y).lineTo(page.right, doc.y).lineWidth(1).strokeColor(palette.line).stroke();
  doc.y += 12;
}

function metric(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string, tone: "default" | "danger" = "default") {
  const previousY = doc.y;
  doc.roundedRect(x, y, width, 58, 6).fill(palette.soft);
  doc.fillColor(palette.muted).font("Helvetica").fontSize(7.5).text(label.toUpperCase(), x + 11, y + 11, { width: width - 22, characterSpacing: 0.6 });
  doc.fillColor(tone === "danger" ? palette.danger : palette.ink).font("Helvetica-Bold").fontSize(11).text(value, x + 11, y + 31, { width: width - 22, ellipsis: true });
  doc.y = previousY;
}

function labelValue(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
  const previousY = doc.y;
  doc.fillColor(palette.muted).font("Helvetica").fontSize(7.5).text(label.toUpperCase(), x, y, { width, characterSpacing: 0.5 });
  doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(9).text(value, x, y + 13, { width, ellipsis: true });
  doc.y = previousY;
}

function tableHeader(doc: PDFKit.PDFDocument, columns: { label: string; x: number; width: number; align?: "left" | "right" }[]) {
  const y = doc.y;
  doc.rect(page.left, y, page.right - page.left, 23).fill(palette.evergreen);
  for (const column of columns) doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7).text(column.label.toUpperCase(), column.x, y + 8, { width: column.width, align: column.align ?? "left", ellipsis: true });
  doc.y = y + 23;
}

function saleRows(doc: PDFKit.PDFDocument, report: ClosingReportData) {
  const columns = [
    { label: "Time", x: 48, width: 58 },
    { label: "Sale", x: 112, width: 92 },
    { label: "Tender", x: 210, width: 95 },
    { label: "Items", x: 312, width: 38, align: "right" as const },
    { label: "Status", x: 365, width: 61 },
    { label: "Total", x: 433, width: 114, align: "right" as const },
  ];
  tableHeader(doc, columns);
  if (!report.sales.length) {
    doc.fillColor(palette.muted).font("Helvetica").fontSize(9).text("No sales were recorded in this session.", 48, doc.y + 13);
    doc.y += 40;
    return;
  }
  report.sales.forEach((sale, index) => {
    if (doc.y + 34 > page.bottom) { addPage(doc, report); tableHeader(doc, columns); }
    const y = doc.y;
    if (index % 2 === 0) doc.rect(page.left, y, page.right - page.left, 32).fill("#F8FAF8");
    const values = [shortTime(sale.completedAt, report.timezone), sale.saleNumber, sale.paymentMethods.length ? sale.paymentMethods.map(displayMethod).join(", ") : "-", String(sale.itemCount), sale.status, money(sale.total, report.currency)];
    columns.forEach((column, columnIndex) => doc.fillColor(sale.status === "COMPLETED" ? palette.ink : palette.muted).font(columnIndex === 5 ? "Helvetica-Bold" : "Helvetica").fontSize(7.6).text(values[columnIndex], column.x, y + 10, { width: column.width, align: column.align ?? "left", ellipsis: true, lineBreak: false }));
    doc.y = y + 32;
  });
  doc.y += 8;
}

export async function buildClosingReportPdf(report: ClosingReportData) {
  const summary = summarizeClosingReport(report);
  const doc = new PDFDocument({ size: "A4", margins: { top: 40, right: 40, bottom: 20, left: 40 }, bufferPages: true, info: { Title: `POS closing report - ${report.branchName}`, Author: "Retail Logic", Subject: `Session ${report.sessionId}` } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawFirstHeader(doc, report);
  labelValue(doc, 40, doc.y, 158, "Cashier", report.cashierName);
  labelValue(doc, 216, doc.y, 158, "Session opened", dateTime(report.openedAt, report.timezone));
  labelValue(doc, 392, doc.y, 163, "Session closed", dateTime(report.closedAt, report.timezone));
  doc.y += 48;

  sectionTitle(doc, report, "Sales summary", `${summary.transactions} completed transactions - ${summary.items} units`);
  const metricWidth = 121;
  metric(doc, 40, doc.y, metricWidth, "Net sales", money(summary.netSales, report.currency));
  metric(doc, 171, doc.y, metricWidth, "Discounts", money(summary.discounts, report.currency));
  metric(doc, 302, doc.y, metricWidth, "Transactions", String(summary.transactions));
  metric(doc, 433, doc.y, metricWidth, "Units sold", String(summary.items));
  doc.y += 75;

  sectionTitle(doc, report, "Cash reconciliation");
  metric(doc, 40, doc.y, metricWidth, "Opening cash", money(report.openingCash, report.currency));
  metric(doc, 171, doc.y, metricWidth, "Expected cash", money(report.expectedCash, report.currency));
  metric(doc, 302, doc.y, metricWidth, "Counted cash", money(report.actualCash, report.currency));
  metric(doc, 433, doc.y, metricWidth, "Difference", money(report.cashDifference, report.currency), report.cashDifference === 0n ? "default" : "danger");
  doc.y += 75;

  sectionTitle(doc, report, "Payment breakdown", `Cash in ${money(summary.cashIn, report.currency)} - Cash out ${money(summary.cashOut, report.currency)}`);
  const paymentColumns = Math.min(Math.max(report.payments.length, 1), 3);
  const paymentWidth = (page.right - page.left - (paymentColumns - 1) * 10) / paymentColumns;
  if (!report.payments.length) {
    metric(doc, 40, doc.y, paymentWidth, "Payments", money(0n, report.currency));
  } else {
    report.payments.forEach((payment, index) => {
      if (index > 0 && index % paymentColumns === 0) doc.y += 68;
      const column = index % paymentColumns;
      metric(doc, 40 + column * (paymentWidth + 10), doc.y, paymentWidth, displayMethod(payment.method), money(payment.amount, report.currency));
    });
  }
  doc.y += 76;

  sectionTitle(doc, report, "Sales ledger", "All transactions recorded in this POS session");
  saleRows(doc, report);

  sectionTitle(doc, report, "Cash movements", `${report.cashMovements.length} recorded movement${report.cashMovements.length === 1 ? "" : "s"}`);
  const movementColumns = [
    { label: "Time", x: 48, width: 70 },
    { label: "Type", x: 125, width: 80 },
    { label: "Reason", x: 212, width: 230 },
    { label: "Amount", x: 450, width: 97, align: "right" as const },
  ];
  tableHeader(doc, movementColumns);
  if (!report.cashMovements.length) {
    doc.fillColor(palette.muted).font("Helvetica").fontSize(9).text("No cash movements were recorded.", 48, doc.y + 13);
    doc.y += 40;
  } else {
    report.cashMovements.forEach((movement, index) => {
      if (doc.y + 32 > page.bottom) { addPage(doc, report); tableHeader(doc, movementColumns); }
      const y = doc.y;
      if (index % 2 === 0) doc.rect(page.left, y, page.right - page.left, 32).fill("#F8FAF8");
      const values = [shortTime(movement.createdAt, report.timezone), displayMethod(movement.type), movement.reason, money(movement.amount, report.currency)];
      movementColumns.forEach((column, columnIndex) => doc.fillColor(palette.ink).font(columnIndex === 3 ? "Helvetica-Bold" : "Helvetica").fontSize(7.6).text(values[columnIndex], column.x, y + 10, { width: column.width, align: column.align ?? "left", ellipsis: true, lineBreak: false }));
      doc.y = y + 32;
    });
  }

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const footerY = doc.page.height - 31;
    doc.moveTo(page.left, footerY - 8).lineTo(page.right, footerY - 8).lineWidth(0.7).strokeColor(palette.line).stroke();
    const footer = `Generated ${dateTime(report.generatedAt, report.timezone)} | Session ${report.sessionId.slice(0, 8)} | Page ${index - range.start + 1} of ${range.count}`;
    doc.fillColor(palette.muted).font("Helvetica").fontSize(7).text(footer, page.left, footerY, { width: page.right - page.left, align: "center", lineBreak: false });
  }

  doc.end();
  return complete;
}

export function closingReportFilename(report: Pick<ClosingReportData, "branchCode" | "closedAt" | "timezone">) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: report.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(report.closedAt);
  const branch = report.branchCode.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "branch";
  return `pos-closing-${branch}-${date}.pdf`;
}
