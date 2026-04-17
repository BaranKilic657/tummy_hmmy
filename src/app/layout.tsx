import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Autopilot",
  description: "Campus Autopilot by TUMmy & HMmy",
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
