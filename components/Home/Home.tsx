"use client";

import ProfileImage from "components/ProfileImage";
import Link from "next/link";
import { styled } from "styled-components";

const Container = styled.div`
  max-width: calc(min(760px, 100%));
  margin: 0 auto;
  margin-bottom: 4rem;
`;

const Header = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Heading = styled.h1`
  margin: 0;
`;
const Subheading = styled.h2`
  margin: 0;
  font-weight: 500;
`;

const ListContainer = styled.div`
  & p {
    line-height: 1.75rem;
  }
  & ul li {
    line-height: 1.75rem;
  }
`;

export default function Home() {
  return (
    <Container>
      <Header>
        <ProfileImage size="large" />
        <div>
          <Heading>Hey, I&apos;m Liang Chun</Heading>
          <Subheading>
            I&apos;m a Rust, TypeScript, and JavaScript Engineer
          </Subheading>
        </div>
      </Header>
      <ListContainer>
        <p>Some things about me:</p>
        <ul>
          <li>Fullstack Engineer for trivago N.V., Düsseldorf, Germany</li>
          <li>
            B.Sc. graduate in Computer Engineering from{" "}
            <Link href="https://www.uni-due.de/">
              Universität Duisburg-Essen
            </Link>
          </li>
          <li>
            I fix up vintage cassette decks and Sony Walkmans in my free time
          </li>
          <li>
            <Link href="/posts">I write, sometimes</Link>
          </li>
          <li>
            I am passionate on improving and streamlining human workflows,
            whether be it with crafting tools that are intuitive and pleasant to
            use, or working on making everyone&apos;s lives easier with code
          </li>
        </ul>
      </ListContainer>
      <p>
        You can find me on{" "}
        <Link href="https://www.linkedin.com/in/liangchunwong/">LinkedIn</Link>
        {" and "}
        <Link href="https://github.com/liangchunn">GitHub</Link>
      </p>
      <p>
        🚧 <em>This site is a work-in-progress</em> 🚧
      </p>
    </Container>
  );
}
