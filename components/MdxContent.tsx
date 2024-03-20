import { Fragment } from "react";
import * as runtime from "react/jsx-runtime";
import { run } from "@mdx-js/mdx";

type Props = {
  code: string;
};

export async function MdxContent({ code }: Props) {
  const mdxModule = await run(code, {
    ...(runtime as any),
    baseUrl: import.meta.url,
    Fragment,
  });
  const Content = mdxModule.default;

  return <Content />;
}
