import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Router",
  description: "Cost-optimized LLM routing - route queries to the right model",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
