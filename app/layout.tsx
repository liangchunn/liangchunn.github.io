import "../styles/global.css";
import "../styles/shiki.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import Link from "next/link";
import Footer from "components/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Liang Chun",
    default: "Liang Chun",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🫧</text></svg>"
        />
        <meta name="theme-color" content="#ede7f6" />
      </head>
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/posts">Posts</Link>
        </nav>
        <div className="content">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
