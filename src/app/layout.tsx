import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TUM Agent",
  description: "Basic Next.js app scaffold for the TUM.ai makeathon project",
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
