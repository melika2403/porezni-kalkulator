import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import { notFound } from "next/navigation";
import BlogPostPage from "src/sections/blog/BlogPostPage";
import { BLOG_POSTS, getPostBySlug } from "src/sections/blog/posts";

const SITE_URL = "https://www.poreznikalkulator.ba";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    // bez ručnog suffixa: template iz root layouta dodaje "| Porezni Kalkulator BiH"
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      images: OG_IMAGE,
      type: "article",
      locale: "bs_BA",
      url,
      siteName: "Porezni Kalkulator BiH",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: postUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    image: `${SITE_URL}/og-image.png`,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "bs-BA",
    author: {
      "@type": "Organization",
      name: "Porezni Kalkulator BiH",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Porezni Kalkulator BiH",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/og-image.png`,
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <BlogPostPage slug={slug} />
    </>
  );
}
