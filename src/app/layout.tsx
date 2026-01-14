import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holen - Mind Map & Org Chart Editor",
  description: "Create hierarchical mind maps and org charts with multi-format export",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
