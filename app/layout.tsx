import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bracket Factory",
  description: "Generate and export single and double-elimination tournament brackets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
