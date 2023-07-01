"use client";

import { format, parseISO } from "date-fns";
import { getMDXComponent } from "next-contentlayer/hooks";
import { Post } from "contentlayer/generated";
import Link from "next/link";
import styled from "styled-components";
import ProfileImage from "components/ProfileImage";

type PostProps = {
  post: Post;
  hideContent?: boolean;
};

const ArticleContainer = styled.article`
  margin: 0 auto;
  font-size: 1.2rem;
  margin-bottom: 3.5rem;

  & > * {
    max-width: calc(min(760px, 100%));
    margin: 0 auto;
    margin-bottom: 1.8rem;
  }

  pre {
    max-width: calc(min(1000px, 100%));
    margin: 0 auto;
    margin-bottom: 1.8rem;
  }

  p img {
    max-width: calc(min(1000px, 100%));
    margin: 0 auto;
    margin-bottom: 1.8rem;
  }

  h1:first-child,
  h2:first-child {
    margin-bottom: 0.5rem;
    margin-top: 0;
    line-height: 1.2;
  }
`;

const Metadata = styled.div`
  display: block;
  color: var(--text-secondary-color);
  font-size: 1rem;

  a {
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  & > * {
    &:not(:last-child):after {
      margin-left: 0.5rem;
      margin-right: 0.5rem;
      content: "•";
      text-decoration: none;
      display: inline-block;
    }
  }

  & span img {
    vertical-align: top;
  }
`;

const Description = styled.p`
  margin: 0;
  margin-top: 0.5rem;
`;

const TagLink = styled(Link)`
  margin-right: 0.5rem;
  &:last-child {
    margin-right: 0;
  }
`;

const BioNoWrap = styled.span`
  white-space: nowrap;
`;

export default function Post({ post, hideContent }: PostProps) {
  const Content = getMDXComponent(post.body.code);
  const tags = post.tags;

  return (
    <ArticleContainer>
      <div>
        {hideContent === true ? (
          <h2>
            <Link href={post.url}>{post.title}</Link>
          </h2>
        ) : (
          <h1>{post.title}</h1>
        )}
        <Metadata>
          <time dateTime={post.date}>
            {format(parseISO(post.date), "LLL d, yyyy")}
          </time>
          <span>{post.readingTime.text}</span>
          {tags && (
            <span>
              {tags.map((tag) => (
                <TagLink key={tag} href={`/tags/${tag}`}>
                  #{tag}
                </TagLink>
              ))}
            </span>
          )}
          <BioNoWrap>
            <ProfileImage size="small" /> Liang Chun
          </BioNoWrap>
        </Metadata>
        {hideContent ? <Description>{post.description}</Description> : null}
      </div>
      {hideContent !== true && <Content />}
    </ArticleContainer>
  );
}
