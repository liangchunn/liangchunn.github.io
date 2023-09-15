import ProfileImage from "components/ProfileImage";
import Link from "next/link";
import styles from "./Home.module.scss";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ProfileImage size="large" />
        <div>
          <div className={styles.heading}>Hey, I&apos;m Liang Chun</div>
          <div className={styles.subheading}>
            I&apos;m a Rust, TypeScript, and JavaScript Engineer
          </div>
        </div>
      </div>
      <div className={styles.listContainer}>
        <p>Some things about me:</p>
        <ul>
          <li>Fullstack Engineer for trivago N.V., Düsseldorf, Germany</li>
          <li>
            B.Sc. graduate in Computer Engineering from{" "}
            <Link href="https://www.uni-due.de/">
              Universität Duisburg-Essen
            </Link>
          </li>
          <li>
            I fix up vintage cassette decks and Sony Walkmans in my free time
          </li>
          <li>
            <Link href="/posts">I write, sometimes</Link>
          </li>
          <li>
            I am passionate on improving and streamlining human workflows,
            whether be it with crafting tools that are intuitive and pleasant to
            use, or working on making everyone&apos;s lives easier with code
          </li>
        </ul>
      </div>
      <p>
        You can find me on{" "}
        <Link href="https://www.linkedin.com/in/liangchunwong/">LinkedIn</Link>
        {" and "}
        <Link href="https://github.com/liangchunn">GitHub</Link>
      </p>
      <p>
        🚧 <em>This site is a work-in-progress</em> 🚧
      </p>
    </div>
  );
}
