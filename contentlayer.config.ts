import { defineDocumentType, makeSource } from "contentlayer/source-files";
import readingTime from "reading-time";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeCodeTitles from "rehype-code-titles";
import rehypePrism from "rehype-prism-plus";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import rehypeToc from "rehype-toc";

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `**/*.md`,
  fields: {
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    description: { type: "string", required: true },
    tags: {
      type: "list",
      of: { type: "string" },
    },
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (post) => `/posts/${post._raw.flattenedPath}`,
    },
    readingTime: {
      type: "json",
      resolve: (post) => readingTime(post.body.raw),
    },
  },
  contentType: "mdx",
}));

export default makeSource({
  contentDirPath: "posts",
  documentTypes: [Post],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeCodeTitles,
      rehypePrism,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behaviour: "wrap",
          properties: {
            className: ["anchor"],
          },
        },
      ],
      [
        rehypeToc,
        {
          nav: false,
        },
      ],
    ],
  },
});
