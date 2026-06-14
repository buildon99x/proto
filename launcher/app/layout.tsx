import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";

export const metadata: Metadata = {
  title: "Prototype Lab",
  description: "A launcher for prototype projects"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Prototype Lab
          </Link>
          <nav>
            <Link href="/projects">Projects</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
