"use client";

import { useEffect, useState } from "react";
import { Paper, Loader, Center, Box } from "@mantine/core";
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
  const { initEditor, initViewer } = useToastUI();

  const [content, setContent] = useState("");

  const initToastUI = () => {
    setEditor(initEditor());
    setViewer(initViewer());
  };

  const fetchNote = () => {
    fetch(`https://cid.most.red/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((data) => {
        setContent(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        setInited(true);
      });
  };

  useEffect(() => {
    if (cid) {
      fetchNote();
    }
  }, [cid]);

  useEffect(() => {
    if (content) {
      if (viewer) {
        // viewer.setMarkdown(content);
      }
      if (editor) {
        editor.setMarkdown(content);
      }
    }
  }, [content, viewer, editor]);

  if (!inited) {
    return (
      <Center h={200}>
        <Loader size="md" />
      </Center>
    );
  }

  return (
    <>
      <AppHeader title="笔记" />
      {/* <Paper shadow="sm" p="md" radius="md">
          <Title order={1} mb="md">
            {noteData?.title || "笔记详情"}
          </Title>

          <Text size="sm" c="dimmed" mb="lg">
            CID: {cid}
          </Text>

          <Image
            src="https://cid.most.red/ipfs/QmYS521g2zomKqvfuZjZhmbcTEn6ZjMYim7yRq6kebhC8Y"
            alt="笔记图片"
            mb="lg"
          />

          <Text>{noteData?.content || "暂无内容"}</Text>

          {noteData?.createdAt && (
            <Text size="xs" c="dimmed" mt="md">
              创建时间: {new Date(noteData.createdAt).toLocaleString()}
            </Text>
          )}
        </Paper> */}
      <Paper shadow="sm" p="md" radius="md">
        <Box id="viewerElement" className="mp-markdown viewer"></Box>
      </Paper>
      <Box id="editorElement" className="mp-markdown editor"></Box>

      {/* https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js */}
      <Script src="/toast-ui/toastui-editor-all.min.js" />
      {/* https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js */}
      <Script
        src="/toast-ui/toastui-editor-plugin-code-syntax-highlight-all.min.js"
        strategy="lazyOnload"
        onReady={initToastUI}
      />
      {/* https://uicdn.toast.com/editor/latest/i18n/zh-cn.js */}
      {inited && <Script src="/toast-ui/zh-cn.js" strategy="lazyOnload" />}
    </>
  );
}
