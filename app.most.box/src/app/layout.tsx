import AppProvider from "@/context/AppProvider";
import { AppKitProvider } from "@/context/Web3Modal";
import type { Metadata, Viewport } from "next";
import { theme } from "@/constants/theme";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

// Toast UI Editor CSS from npm packages
import "@toast-ui/editor/dist/toastui-editor.css";
import "@toast-ui/editor/dist/theme/toastui-editor-dark.css";
import "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight.css";
import "prismjs/themes/prism.css";
import "@/app/markdown.scss";

import "@/app/global.scss";

export const metadata: Metadata = {
  title: "Most.Box - 如影随形",
  description: "回归数据存储本质，随时访问，随时分享",
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
      <body>
        <div id="app">
          <AppKitProvider>
            <MantineProvider defaultColorScheme="auto" theme={theme}>
              <AppProvider />
              <Notifications limit={3} position="top-center" />
              <ModalsProvider>{children}</ModalsProvider>
            </MantineProvider>
          </AppKitProvider>
        </div>
      </body>
    </html>
  );
}
