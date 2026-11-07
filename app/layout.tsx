import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";
import { ConfirmDeleteHost } from "@/components/ConfirmDeleteHost";
import { NavLoading } from "@/components/NavLoading";
import { TouchRipple } from "@/components/TouchRipple";
import "./globals.css";

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-jua", preload: false });
const noto = Noto_Sans_KR({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-noto", preload: false });

export const metadata: Metadata = {
  title: "옥!소리 — 주머니 속 마을방송",
  description: "옥천 가게의 오늘 소식. 사장님이 알리고, 이웃이 채우고, 옥천신문이 확인해요.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/app-icon.jpg", apple: "/app-icon.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#F8F3E8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${noto.variable}`}>
      <body>
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">{children}</div>
        <Suspense fallback={null}>
          <NavLoading />
        </Suspense>
        <ConfirmDeleteHost />
        <TouchRipple />
      </body>
    </html>
  );
}
