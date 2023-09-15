"use client";

import Link from "next/link";
import styles from "./Footer.module.scss";

export default function Footer() {
  const staticYear = new Date().getFullYear();
  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.splitPane}>
          <div className={styles.pane}>
            <p>Made with</p>
            <p>
              <Link href="https://nextjs.org/">Next.js</Link>
            </p>
            <p>
              <Link href="https://www.contentlayer.dev/">Contentlayer</Link>
            </p>
            <p>
              <Link href="https://mdxjs.com/">MDX</Link>
            </p>
          </div>
          <div className={styles.pane}>
            <p>Socials</p>
            <p>
              <Link href="https://www.linkedin.com/in/liangchunwong/">
                LinkedIn
              </Link>
            </p>
            <p>
              <Link href="http://github.com/liangchunn">GitHub</Link>
            </p>
          </div>
        </div>
        <div>
          © {staticYear}{" "}
          <Link href="https://github.com/liangchunn">Liang Chun</Link>
        </div>
      </div>
    </div>
  );
}
