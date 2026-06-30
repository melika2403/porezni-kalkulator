// RSS 2.0 feed bloga, generisan iz BLOG_POSTS.
import { BLOG_POSTS } from "src/sections/blog/posts";

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
  const items = BLOG_POSTS.map((p) => {
    const url = `${SITE_URL}/blog/${p.slug}`;
    return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(p.excerpt)}</description>
      <pubDate>${new Date(`${p.date}T08:00:00Z`).toUTCString()}</pubDate>
      ${p.category ? `<category>${escapeXml(p.category)}</category>` : ""}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Porezni Kalkulator BiH - Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Praktični vodiči o porezima, platama i poslovanju za poduzetnike u BiH.</description>
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
