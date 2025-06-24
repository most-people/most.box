"use client";

import { useEffect, useState } from "react";
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

  return (
    <>
      <AppHeader title="笔记" />

      <Box id="viewerElement" className="mp-markdown viewer"></Box>
      <Box
        id="editorElement"
        className="mp-markdown editor"
        style={{ display: "none" }}
      />

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
