import { defineCollection, defineConfig } from "@content-collections/core";
import { compile } from "@mdx-js/mdx";
import readingTime from "reading-time";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import rehypeToc from "rehype-toc";
import rehypePrettyCode from "rehype-pretty-code";
import { getLangIcon } from "./plugins/getLangIcon";

const posts = defineCollection({
  name: "posts",
  directory: "posts",
  include: "**/*.md",
  schema: (z) => ({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    tags: z.string().array(),
  }),
  transform: async ({ content, ...data }) => {
    const body = String(
      await compile(content, {
        outputFormat: "function-body",
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
                      alt: "",
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
              behavior: "wrap",
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
      })
    );
    return {
      ...data,
      readingTime: readingTime(content),
      slug: data._meta.path,
      body,
    };
  },
});

export default defineConfig({
  collections: [posts],
});
