import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "보험광고 콘텐츠의 법령 위반 여부를 검증하고 법령 준수 콘텐츠를 생성하는 웹 애플리케이션.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
