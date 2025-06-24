"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Center, Box } from "@mantine/core";
import { useHash } from "@mantine/hooks";
import Script from "next/script";
import { AppHeader } from "@/components/AppHeader";
import { useToastUI } from "@/hooks/useToastUI";

// https://uicdn.toast.com/editor/latest/toastui-editor.min.css
import "@/assets/toast-ui/toastui-editor.min.css";
// https://www.jsdelivr.com/package/npm/prismjs
import "@/assets/toast-ui/prism.min.css";
// https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight.min.css
import "@/assets/toast-ui/toastui-editor-plugin-code-syntax-highlight.min.css";

import "./note.scss";
import "./markdown.scss";

export default function NotePage() {
  const [hash] = useHash();
  const cid = hash.slice(1);
  const [inited, setInited] = useState(false);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const toastUI = useToastUI();

  const [content, setContent] = useState("");

  const initViewer = () => {
    setViewer(toastUI.initViewer());
    setInited(true);
  };
  const initEditor = () => {
    setEditor(toastUI.initEditor());
  };

  const fetchNote = () => {
    fetch(`https://cid.most.red/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((data) => {
        setContent(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  useEffect(() => {
    if (cid) fetchNote();
  }, [cid]);

  useEffect(() => {
    if (content) {
      if (viewer) {
        viewer.setMarkdown(content);
      }
      if (editor) {
        editor.setMarkdown(content);
      }
    }
  }, [content, viewer, editor]);

  // 使用 useMemo 缓存标题提取结果
  const title = useMemo(() => {
    if (!content) return "笔记";

    // 只取第一行作为标题
    const firstLineIndex = content.indexOf("\n");
    const firstLine =
      firstLineIndex === -1
        ? content.trim()
        : content.substring(0, firstLineIndex).trim();

    const t = firstLine.replace(/^#+\s*/, "").trim();
    if (t && t.length > 0) {
      // 限制标题长度，避免过长
      return t.length > 30 ? t.substring(0, 30) + "..." : t;
    }

    return "笔记";
  }, [content]);

  return (
    <>
      <AppHeader title={title} />

      <Box id="viewerElement" />
      <Box id="editorElement" />

      {/* https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js */}
      <Script src="/toast-ui/toastui-editor-all.min.js" />
      {/* https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js */}
      <Script
        src="/toast-ui/toastui-editor-plugin-code-syntax-highlight-all.min.js"
        strategy="lazyOnload"
        onReady={initViewer}
      />
      {/* https://uicdn.toast.com/editor/latest/i18n/zh-cn.js */}
      {inited ? (
        <Script
          src="/toast-ui/zh-cn.js"
          strategy="lazyOnload"
          onReady={initEditor}
        />
      ) : (
        <Center h={200}>
          <Loader size="md" />
        </Center>
      )}
    </>
  );
}
