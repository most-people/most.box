import AppProvider from "@/components/AppProvider";
import type { Metadata, Viewport } from "next";
import { theme } from "@/constants/theme";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import "@/app/global.scss";

export const metadata: Metadata = {
  title: "Most.Box - 如影随形",
  description: "隐私分身，数据加密，随时访问，随时分享",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Most.Box",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/mask-icon.svg",
        color: "#FFFFFF",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  userScalable: false,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <div id="app">
          <MantineProvider defaultColorScheme="auto" theme={theme}>
            <AppProvider />
            <Notifications limit={3} position="bottom-center" />
            <ModalsProvider>{children}</ModalsProvider>
          </MantineProvider>
        </div>
      </body>
    </html>
  );
}
