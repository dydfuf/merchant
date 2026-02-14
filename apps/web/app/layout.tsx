import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@repo/ui/styles.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "모던 머천트",
  description: "서버 권위 기반 실시간 보드게임 클라이언트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} appBody`}>
        {children}
      </body>
    </html>
  );
}
