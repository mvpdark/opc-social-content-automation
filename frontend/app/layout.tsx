import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPC 内容运营中枢",
  description: "面向 OPC 运营流程的社媒图文自动化工作台",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/app-icon.png", type: "image/png", sizes: "1024x1024" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
