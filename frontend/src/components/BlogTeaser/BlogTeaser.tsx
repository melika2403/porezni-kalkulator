import Link from "next/link";
import styles from "./BlogTeaser.module.css";
import { BLOG_POSTS } from "src/sections/blog/posts";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

export default function BlogTeaser() {
  const posts = BLOG_POSTS.slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="blog-teaser-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <div className={styles.label}>Iz našeg bloga</div>
          <h2 id="blog-teaser-title" className={styles.h2}>
            Vodiči i <em>savjeti</em>
          </h2>
          <p className={styles.lead}>
            Praktični članci o porezima, plati i obrascima u FBiH, sa
            primjerima, brojevima i zakonskom referencom.
          </p>
        </div>

        <div className={styles.grid}>
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.card}>
              <div className={styles.cardMeta}>
                {p.category && (
                  <span className={styles.cardCategory}>{p.category}</span>
                )}
                <span>{fmtDate(p.date)}</span>
              </div>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardExcerpt}>{p.excerpt}</p>
              <span className={styles.cardLink}>Pročitaj članak →</span>
            </Link>
          ))}
        </div>

        <div className={styles.cta}>
          <Link href="/blog" className={styles.ctaBtn}>
            Svi članci →
          </Link>
        </div>
      </div>
    </section>
  );
}
