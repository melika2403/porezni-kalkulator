import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ime, email, poruka } = await req.json();

  if (!ime || !email || !poruka) {
    return NextResponse.json({ error: "Sva polja su obavezna." }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY nije postavljen");
    return NextResponse.json({ error: "Konfiguracija servera." }, { status: 500 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Kontakt forma <noreply@poreznikalkulator.ba>",
      to: ["info@poreznikalkulator.ba"],
      reply_to: email,
      subject: `Kontakt forma, poruka od ${ime}`,
      text: `Ime: ${ime}\nEmail: ${email}\n\nPoruka:\n${poruka}`,
    }),
  });

  if (!res.ok) {
    console.error("Resend greška:", await res.text());
    return NextResponse.json({ error: "Slanje nije uspjelo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
