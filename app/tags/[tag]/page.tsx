import Article from "components/Article";
import Header from "components/Header";
import { allPosts } from "content-collections";
import Link from "next/link";

export const generateStaticParams = async () => {
  const allTags = allPosts.flatMap((post) => post.tags ?? []);
  const uniqueTags = [...new Set(allTags)];
  return uniqueTags.map((tag) => ({ tag }));
};

export const generateMetadata = ({ params }: { params: { tag: string } }) => {
  const allTags = allPosts.flatMap((post) => post.tags ?? []);
  const uniqueTags = [...new Set(allTags)];
  if (!uniqueTags.includes(params.tag)) {
    throw new Error("invalid tag");
  }
  return {
    title: `#${params.tag}`,
  };
};

export default function Tag({ params }: { params: { tag: string } }) {
  const posts = allPosts.filter(
    (post) => post.tags?.includes(params.tag) ?? false
  );
  if (!posts) {
    throw new Error("invalid tag");
  }
  return (
    <>
      <Header>
        <h1>All posts about #{params.tag}</h1>
        <h3>
          Looking for another tag? See <Link href="/tags">all tags</Link>.
        </h3>
      </Header>
      <article>
        {posts.map((post) => (
          <Article post={post} hideContent key={post.slug} />
        ))}
      </article>
    </>
  );
}
