"use client";

import { PropsWithChildren } from "react";
import styled from "styled-components";

const HeaderContainer = styled.div`
  max-width: calc(min(760px, 100%));
  margin: 0 auto;
  margin-bottom: 4rem;

  h1,
  h2,
  h3 {
    margin: 0;
  }

  h2,
  h3 {
    font-weight: normal;
  }

  p {
    font-size: 1.2rem;
  }
`;

export default function Header({ children }: PropsWithChildren) {
  return <HeaderContainer>{children}</HeaderContainer>;
}
