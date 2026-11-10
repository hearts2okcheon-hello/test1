import type { Metadata, Viewport } from "next";
import { Jua, Noto_Sans_KR } from "next/font/google";
import { Suspense } from "react";
import { ConfirmDeleteHost } from "@/components/ConfirmDeleteHost";
import { InAppGate } from "@/components/InAppGate";
import { NavLoading } from "@/components/NavLoading";
import { OwnerAlertHost } from "@/components/OwnerAlertHost";
import { PwaSetup } from "@/components/PwaSetup";
import { TabSwipe } from "@/components/TabSwipe";
import { TouchRipple } from "@/components/TouchRipple";
import "./globals.css";

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-jua", preload: false });
const noto = Noto_Sans_KR({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-noto", preload: false });

const TITLE = "옥!소리 — 주머니 속 마을방송";
const DESCRIPTION = "옥천 가게의 오늘 소식. 사장님이 알리고, 이웃이 채우고, 옥천신문이 확인해요.";
// 링크 미리보기 그림은 절대 주소여야 한다. Vercel 이 정식 주소를 알려 준다
const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "옥!소리", statusBarStyle: "default" },
  // 카카오톡·문자로 링크를 보낼 때 보이는 카드
  openGraph: {
    type: "website",
    siteName: "옥!소리",
    title: TITLE,
    description: DESCRIPTION,
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "옥!소리 로고와 오소리" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#FBF5E6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${jua.variable} ${noto.variable}`}>
      <body>
        <div className="ok-shell mx-auto flex min-h-dvh max-w-[480px] flex-col">
          <InAppGate />
          <OwnerAlertHost />
          {children}
        </div>
        <Suspense fallback={null}>
          <NavLoading />
        </Suspense>
        <ConfirmDeleteHost />
        <TouchRipple />
        <TabSwipe />
        <PwaSetup />
      </body>
    </html>
  );
}
