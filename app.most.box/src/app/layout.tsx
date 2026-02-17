import AppProvider from "@/context/AppProvider";
import type { Metadata, Viewport } from "next";
import { theme } from "@/utils/theme";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";


import "prismjs/themes/prism.css";
import "@/app/markdown.scss";

import "@/app/global.scss";

export const metadata: Metadata = {
  title: "Most.Box - 如影随形",
  description: "数字资产，从此永生",
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
    { media: "(prefers-color-scheme: dark)", color: "#151718" },
  ],
  userScalable: false,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <div id="app">
          <MantineProvider defaultColorScheme="auto" theme={theme}>
            <Notifications limit={3} position="top-center" />
            <ModalsProvider>
              <AppProvider>{children}</AppProvider>
            </ModalsProvider>
          </MantineProvider>
        </div>
      </body>
    </html>
  );
}
