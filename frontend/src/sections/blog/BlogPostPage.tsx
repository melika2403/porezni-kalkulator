import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./blog.module.css";
import { BLOG_POSTS, getPostBySlug } from "./posts";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

export default function BlogPostPage({ slug }: { slug: string }) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const Content = post.Content;
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  // prev/next hronološki (BLOG_POSTS je najnoviji prvi)
  const idx = BLOG_POSTS.findIndex((p) => p.slug === post.slug);
  const noviji = idx > 0 ? BLOG_POSTS[idx - 1] : null;
  const stariji = idx < BLOG_POSTS.length - 1 ? BLOG_POSTS[idx + 1] : null;

  return (
    <main className={styles.postWrap}>
      <article>
        <header className={styles.postHeader}>
          <Link href="/blog" className={styles.backLink}>
            ← Svi članci
          </Link>
          <div className={styles.postMeta}>
            {post.category && (
              <span className={styles.cardCategory}>{post.category}</span>
            )}
            <span>{fmtDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime} čitanja</span>
          </div>
          <h1 className={styles.postTitle}>{post.title}</h1>
        </header>

        <div className={styles.postBody}>
          <Content />
        </div>

        <footer className={styles.postFooter}>
          {(stariji || noviji) && (
            <nav
              aria-label="Navigacija među člancima"
              className={styles.postNav}
            >
              {stariji && (
                <Link href={`/blog/${stariji.slug}`} className={styles.navBtn}>
                  <span className={styles.navBtnLabel}>
                    ← Prethodni članak
                  </span>
                  <span className={styles.navBtnTitle}>{stariji.title}</span>
                </Link>
              )}
              {noviji && (
                <Link
                  href={`/blog/${noviji.slug}`}
                  className={`${styles.navBtn} ${styles.navBtnRight}`}
                >
                  <span className={styles.navBtnLabel}>
                    Sljedeći članak →
                  </span>
                  <span className={styles.navBtnTitle}>{noviji.title}</span>
                </Link>
              )}
            </nav>
          )}
          {related.length > 0 && (
            <div className={styles.related}>
              <h3 className={styles.relatedTitle}>Pročitajte još</h3>
              <div className={styles.list}>
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.card}>
                    <div className={styles.cardMeta}>
                      {p.category && (
                        <span className={styles.cardCategory}>{p.category}</span>
                      )}
                      <span>{fmtDate(p.date)}</span>
                    </div>
                    <h4 className={styles.cardTitle}>{p.title}</h4>
                    <p className={styles.cardExcerpt}>{p.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </footer>
      </article>
    </main>
  );
}
