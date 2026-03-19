import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Techie Shorts",
  description: "Developer news in 60 words — swipe, read, stay updated.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
