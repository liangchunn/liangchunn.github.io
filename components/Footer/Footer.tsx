"use client";

import Link from "next/link";
import styled from "styled-components";

const FooterContainer = styled.div`
  background: var(--background-paper-color);
  margin-top: 8rem;
`;

const ContentWrapper = styled.div`
  max-width: calc(min(760px, 100%));
  margin: 0 auto;
  // TODO: this is ugly (see .content global class)
  padding: 4rem 15px;
`;

const SplitPane = styled.div`
  display: flex;
  margin-bottom: 1rem;
`;

const Pane = styled.div`
  flex: 1;

  & p:first-child {
    font-weight: 500;
  }
`;
export default function Footer() {
  const staticYear = new Date().getFullYear();
  return (
    <FooterContainer>
      <ContentWrapper>
        <SplitPane>
          <Pane>
            <p>Made with</p>
            <p>
              <Link href="https://nextjs.org/">Next.js</Link>
            </p>
            <p>
              <Link href="https://www.contentlayer.dev/">Contentlayer</Link>
            </p>
            <p>
              <Link href="https://mdxjs.com/">MDX</Link>
            </p>
            <p>
              <Link href="https://styled-components.com/">
                styled-components
              </Link>
            </p>
          </Pane>
          <Pane>
            <p>Socials</p>
            <p>
              <Link href="https://www.linkedin.com/in/liangchunwong/">
                LinkedIn
              </Link>
            </p>
            <p>
              <Link href="http://github.com/liangchunn">GitHub</Link>
            </p>
          </Pane>
        </SplitPane>
        <div>
          © {staticYear}{" "}
          <Link href="https://github.com/liangchunn">Liang Chun</Link>
        </div>
      </ContentWrapper>
    </FooterContainer>
  );
}
