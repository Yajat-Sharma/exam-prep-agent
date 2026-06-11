import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Exam Prep Agent",
  description: "AI-powered exam preparation for Mumbai University students",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
