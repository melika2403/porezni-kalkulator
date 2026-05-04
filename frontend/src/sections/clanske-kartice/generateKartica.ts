import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";

export interface KarticaData {
  memberName: string;
  code: string;
  clubName: string;
  validUntil: string; // ISO yyyy-mm-dd
  orgPhone?: string;
  orgEmail?: string;
  logoDataUrl?: string; // base64 image data URL
  /** Hex/RGB accent color for the club name */
  accentColor?: string;
}

// Credit card size: 85.6 × 53.98 mm → at 72 DPI:
// 1 mm = 2.83464567 pt → 85.6 × 2.83 ≈ 242.6, 54 × 2.83 ≈ 153
const PAGE_W = 242;
const PAGE_H = 153;
const MARGIN = 8;
const BLACK = rgb(0, 0, 0);

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return { r: 1, g: 0.55, b: 0 }; // fallback orange
  return {
    r: parseInt(m[0], 16) / 255,
    g: parseInt(m[1], 16) / 255,
    b: parseInt(m[2], 16) / 255,
  };
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}.`;
}

export async function generateKartica(data: KarticaData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Embed Arial bold + regular (already in templates)
  const [boldBytes, regBytes] = await Promise.all([
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
  ]);
  const fontBold = await doc.embedFont(boldBytes);
  const fontReg = await doc.embedFont(regBytes);

  const page = doc.addPage([PAGE_W, PAGE_H]);

  // Background — white (default)
  // Border: subtle dashed line around card
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 0.5,
  });

  const accent = hexToRgb(data.accentColor ?? "#e88a1a");

  // ── Top row: Logo (large) + QR (smaller) ─────────────────────────────────
  const topY = PAGE_H - MARGIN; // top of card
  const logoSize = 85; // bigger logo
  const qrSize = 55;   // smaller QR
  const logoY = topY - logoSize;
  const qrY = logoY + (logoSize - qrSize) / 2; // QR vertically centered with logo

  // Logo (top-left)
  if (data.logoDataUrl) {
    try {
      const m = data.logoDataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
      if (m) {
        const isPng = m[1] === "png";
        const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
        const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const ratio = Math.min(logoSize / img.width, logoSize / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        page.drawImage(img, {
          x: MARGIN,
          y: logoY + (logoSize - h) / 2,
          width: w,
          height: h,
        });
      }
    } catch {
      // ignore image errors
    }
  }

  // QR code (right of logo)
  const qrX = MARGIN + logoSize + 10;
  if (data.code) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.code, {
        margin: 0,
        width: 256,
        errorCorrectionLevel: "M",
      });
      const qrBytes = Uint8Array.from(
        atob(qrDataUrl.split(",")[1]),
        (c) => c.charCodeAt(0),
      );
      const qrImg = await doc.embedPng(qrBytes);
      page.drawImage(qrImg, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    } catch {
      /* ignore */
    }
  }

  // ── Bottom area: Member name + Club name (CENTERED horizontally) ─────────
  const nameSize = 16;
  const clubSize = 18;
  const bottomTextY = logoY - 8;

  const memberText = data.memberName || "—";
  const memberW = fontBold.widthOfTextAtSize(memberText, nameSize);
  page.drawText(memberText, {
    x: (PAGE_W - memberW) / 2,
    y: bottomTextY - nameSize,
    size: nameSize,
    font: fontBold,
    color: BLACK,
  });

  const clubText = data.clubName || "Klub";
  const clubW = fontBold.widthOfTextAtSize(clubText, clubSize);
  page.drawText(clubText, {
    x: (PAGE_W - clubW) / 2,
    y: bottomTextY - nameSize - clubSize - 2,
    size: clubSize,
    font: fontBold,
    color: rgb(accent.r, accent.g, accent.b),
  });

  // ── "Vrijedi do" (bottom-right corner) ───────────────────────────────────
  const validSize = 8;
  const validText = `Vrijedi do: ${fmtDate(data.validUntil)}`;
  const validW = fontBold.widthOfTextAtSize(validText, validSize);
  page.drawText(validText, {
    x: PAGE_W - MARGIN - validW,
    y: MARGIN,
    size: validSize,
    font: fontBold,
    color: BLACK,
  });

  // ── Org contact (bottom-left corner, small) ─────────────────────────────
  const orgContactSize = 7;
  let cy = MARGIN;
  if (data.orgEmail) {
    page.drawText(data.orgEmail, {
      x: MARGIN,
      y: cy,
      size: orgContactSize,
      font: fontReg,
      color: rgb(0.4, 0.4, 0.4),
    });
    cy += orgContactSize + 2;
  }
  if (data.orgPhone) {
    page.drawText(`tel: ${data.orgPhone}`, {
      x: MARGIN,
      y: cy,
      size: orgContactSize,
      font: fontReg,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return doc.save();
}
