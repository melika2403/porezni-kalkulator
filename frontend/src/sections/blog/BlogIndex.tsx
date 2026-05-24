import Link from "next/link";
import styles from "./blog.module.css";
import { BLOG_POSTS } from "./posts";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

export default function BlogIndex() {
  return (
    <main className={styles.indexWrap}>
      <div className={styles.indexHeader}>
        <div className={styles.label}>Blog</div>
        <h1 className={styles.h1}>
          Stručni <em>vodiči</em> i savjeti za poduzetnike
        </h1>
        <p className={styles.lead}>
          Praktični članci o porezima, obrascima, plati, ugovorima i
          računovodstvu u Federaciji BiH. Sve sa primjerima i brojevima.
        </p>
      </div>

      {BLOG_POSTS.length === 0 ? (
        <div className={styles.empty}>Trenutno nema objavljenih članaka.</div>
      ) : (
        <div className={styles.list}>
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
              <div className={styles.cardMeta}>
                {post.category && (
                  <span className={styles.cardCategory}>{post.category}</span>
                )}
                <span>{fmtDate(post.date)}</span>
                <span>·</span>
                <span>{post.readingTime}</span>
              </div>
              <h2 className={styles.cardTitle}>{post.title}</h2>
              <p className={styles.cardExcerpt}>{post.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
