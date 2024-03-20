import Header from "components/Header";
import { allPosts } from "content-collections";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tags",
};

export default function TagsPage() {
  const allTags = allPosts.flatMap((post) => post.tags ?? []);
  const uniqueTags = [...new Set(allTags)];
  uniqueTags.sort();
  const lastIndex = uniqueTags.length - 1;

  return (
    <div>
      <Header>
        <h1>All tags</h1>
        <p>
          {uniqueTags.map((tag, index) => {
            return (
              <>
                <Link href={`/tags/${tag}`} key={tag}>
                  {tag}
                </Link>
                {index === lastIndex ? null : " • "}
              </>
            );
          })}
        </p>
      </Header>
    </div>
  );
}
