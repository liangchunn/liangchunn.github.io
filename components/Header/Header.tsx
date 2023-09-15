"use client";

import { PropsWithChildren } from "react";
import styles from "./Header.module.scss";

export default function Header({ children }: PropsWithChildren) {
  return <div className={styles.container}>{children}</div>;
}
