// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/predracun  →  vraća PDF (binarno) + meta zaglavlja:
//    X-Predracun-Number, X-Predracun-Plan, X-Predracun-Gross
// ──────────────────────────────────────────────────────────────────────────────
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type Plan = "PRO" | "BUSINESS";

export interface BuyerInput {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email: string;
  idNumber?: string;
  vatNumber?: string;
}

export interface PredracunResult {
  ok: true;
  pdfBlob: Blob;
  pdfUrl: string;
  fullNumber: string;
  plan: Plan;
  gross: string;
}
export interface PredracunError {
  ok: false;
  error: string;
}

export async function createPredracun(
  plan: Plan,
  buyer: BuyerInput,
): Promise<PredracunResult | PredracunError> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/predracun`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, buyer }),
    });

    if (!res.ok) {
      // pokušaj parsirati JSON greške
      try {
        const j = await res.json();
        return { ok: false, error: j?.error || `HTTP ${res.status}` };
      } catch {
        return { ok: false, error: `HTTP ${res.status}` };
      }
    }

    const fullNumber = res.headers.get("X-Predracun-Number") || "";
    const planHeader = (res.headers.get("X-Predracun-Plan") as Plan) || plan;
    const gross = res.headers.get("X-Predracun-Gross") || "";

    const pdfBlob = await res.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return { ok: true, pdfBlob, pdfUrl, fullNumber, plan: planHeader, gross };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "NETWORK_ERROR" };
  }
}
