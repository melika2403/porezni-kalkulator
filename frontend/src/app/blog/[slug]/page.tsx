import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPage from "src/sections/blog/BlogPostPage";
import { BLOG_POSTS, getPostBySlug } from "src/sections/blog/posts";

const SITE_URL = "https://poreznikalkulator.ba";

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
    title: `${post.title} | Porezni Kalkulator BiH`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
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

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}/blog/${post.slug}`,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BlogPostPage slug={slug} />
    </>
  );
}
