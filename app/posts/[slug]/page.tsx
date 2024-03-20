import { allPosts } from "content-collections";
import Article from "components/Article";

export const generateStaticParams = async () =>
  allPosts.map((post) => ({ slug: post.slug }));

export const generateMetadata = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post.slug === params.slug);
  if (!post) {
    throw new Error("invalid slug");
  }
  return { title: post.title, description: post.description };
};

const PostLayout = ({ params }: { params: { slug: string } }) => {
  const post = allPosts.find((post) => post.slug === params.slug);
  if (!post) {
    throw new Error("invalid slug");
  }

  return <Article post={post} />;
};

export default PostLayout;
