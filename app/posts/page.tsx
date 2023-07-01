import { compareDesc } from "date-fns";
import { allPosts } from "contentlayer/generated";
import Article from "components/Article";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Posts",
};

export default function AllPosts() {
  const posts = allPosts.sort((a, b) =>
    compareDesc(new Date(a.date), new Date(b.date))
  );

  return (
    <div>
      {posts.map((post, idx) => (
        <Article hideContent key={idx} post={post} />
      ))}
    </div>
  );
}
