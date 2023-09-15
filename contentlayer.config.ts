import { defineDocumentType, makeSource } from "contentlayer/source-files";
import readingTime from "reading-time";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import rehypeToc from "rehype-toc";
import rehypePrettyCode from "rehype-pretty-code";
import { getLangIcon } from "./plugins/getLangIcon";

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
      [
        rehypePrettyCode,
        {
          theme: "github-light",
          onVisitTitle: (element: any) => {
            const lang = element.properties["data-language"];
            const icon = getLangIcon(lang);
            if (icon) {
              element.children.unshift({
                type: "element",
                tagName: "img",
                properties: {
                  src: icon,
                  "data-rehype-pretty-code-title-icon": "",
                  width: "18px",
                  height: "18px",
                },
              });
            }
          },
        },
      ],
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
