import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoanApp Guard: live loan app research",
  description: "A live research workspace for public Google Play loan-app data and review signals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
