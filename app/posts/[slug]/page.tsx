import { allPosts } from "contentlayer/generated";
import Article from "components/Article";

export const generateStaticParams = async () =>
  allPosts.map((post) => ({ slug: post._raw.flattenedPath }));

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug);
  if (!post) {
    throw new Error("invalid slug");
  }
  return { title: post.title };
};

const PostLayout = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post._raw.flattenedPath === params.slug);
  if (!post) {
    throw new Error("invalid slug");
  }

  return <Article post={post} />;
};

export default PostLayout;
