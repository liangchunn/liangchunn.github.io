import { format, parseISO } from "date-fns";
import { getMDXComponent } from "next-contentlayer/hooks";
import { Post } from "contentlayer/generated";
import Link from "next/link";
import ProfileImage from "components/ProfileImage";

import styles from "./Article.module.scss";

type PostProps = {
  post: Post;
  hideContent?: boolean;
};

export default function Post({ post, hideContent }: PostProps) {
  const Content = getMDXComponent(post.body.code);
  const tags = post.tags;

  return (
    <article className={styles.article}>
      <div>
        {hideContent === true ? (
          <h2>
            <Link href={post.url}>{post.title}</Link>
          </h2>
        ) : (
          <h1>{post.title}</h1>
        )}
        <div className={styles.metadata}>
          <time dateTime={post.date}>
            {format(parseISO(post.date), "LLL d, yyyy")}
          </time>
          <span>{post.readingTime.text}</span>
          {tags && (
            <span>
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${tag}`}
                  className={styles.tagLink}
                >
                  #{tag}
                </Link>
              ))}
            </span>
          )}
          <span className={styles.bioNoWrap}>
            <ProfileImage size="small" /> Liang Chun
          </span>
        </div>
        {hideContent ? (
          <p className={styles.description}>{post.description}</p>
        ) : null}
      </div>
      {hideContent !== true && <Content />}
    </article>
  );
}
