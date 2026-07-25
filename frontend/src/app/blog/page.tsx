import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import BlogIndex from "src/sections/blog/BlogIndex";
import { BLOG_POSTS } from "src/sections/blog/posts";

const PAGE_URL = "https://www.poreznikalkulator.ba/blog";

export const metadata: Metadata = {
  title: "Blog, porezi, plata i obrasci u FBiH",
  description:
    "Praktični vodiči o porezima, obrascima, obračunu plata, ugovorima i računovodstvu u FBiH, sa primjerima i brojevima za obrtnike, d.o.o. i knjigovođe.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Blog, Vodiči o porezima, plati i obrascima u FBiH",
    description:
      "Praktični članci o porezima, obrascima i obračunu plata u FBiH.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const blogListSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Porezni Kalkulator BiH, Blog",
  url: PAGE_URL,
  inLanguage: "bs-BA",
  blogPost: BLOG_POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `${PAGE_URL}/${p.slug}`,
    datePublished: p.date,
    description: p.excerpt,
  })),
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }}
      />
      <BlogIndex />
    </>
  );
}
