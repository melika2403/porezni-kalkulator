// RSS 2.0 feed sekcije Vijesti, generisan iz baze (isti izvor kao sajt).
import { getClanciServer } from "src/lib/vijestiServer";
import { putanjaClanka } from "src/data/vijesti";

const SITE_URL = "https://www.poreznikalkulator.ba";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const podaci = await getClanciServer({ limit: 30 });
  const items = (podaci?.items ?? [])
    .map((p) => {
      const url = `${SITE_URL}${putanjaClanka(p.tip, p.slug)}`;
      const datum = p.datumObjave ? new Date(p.datumObjave) : new Date();
      return `    <item>
      <title>${escapeXml(p.naslov)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(p.sazetak || "")}</description>
      <pubDate>${datum.toUTCString()}</pubDate>
      ${p.rubrika ? `<category>${escapeXml(p.rubrika)}</category>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Porezni Kalkulator BiH - Vijesti</title>
    <link>${SITE_URL}/vijesti</link>
    <description>Izmjene propisa, porezi, plate i obrasci u FBiH, objašnjeni za obrtnike i knjigovođe.</description>
    <language>bs</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
