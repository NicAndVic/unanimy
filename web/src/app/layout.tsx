import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unanimy",
  description: "Collaborative decision making made simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
