import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPC Workspace",
  description: "Social content automation workspace for OPC operators"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
