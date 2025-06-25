"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Center, Box, Button, Group } from "@mantine/core";
import { useHash } from "@mantine/hooks";
import Script from "next/script";
import { AppHeader } from "@/components/AppHeader";
import { useToastUI } from "@/hooks/useToastUI";
// import { useUserStore } from "@/stores/userStore";

// https://uicdn.toast.com/editor/latest/toastui-editor.min.css
import "@/assets/toast-ui/toastui-editor.min.css";
// https://www.jsdelivr.com/package/npm/prismjs
import "@/assets/toast-ui/prism.min.css";
// https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight.min.css
import "@/assets/toast-ui/toastui-editor-plugin-code-syntax-highlight.min.css";

import "./note.scss";
import "./markdown.scss";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { api } from "@/constants/api";
import { notifications } from "@mantine/notifications";

export default function NotePage() {
  const [hash, setHash] = useHash();
  const params = useSearchParams();
  const dotCID = useUserStore((state) => state.dotCID);

  const [inited, setInited] = useState(false);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const toastUI = useToastUI();

  // const wallet = useUserStore((state) => state.wallet);

  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const initViewer = () => {
    setViewer(toastUI.initViewer());
    setInited(true);
  };
  const initEditor = () => {
    setEditor(toastUI.initEditor());
  };

  const fetchNote = (cid: string) => {
    fetch(`${dotCID}/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((data) => {
        setContent(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const updateNote = async (name: string, newContent: string) => {
    const formData = new FormData();
    const blob = new Blob([newContent], { type: "text/markdown" });
    formData.append("file", blob, "index.md");
    formData.append("path", `/.note/${name}/index.md`);

    try {
      const res = await api.put("/files.upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const cid = res.data?.cid;
      if (cid) {
        setHash(cid);
        notifications.show({
          message: `${name} 保存成功`,
          color: "green",
        });
      }
    } catch (error: any) {
      let message = error?.response?.data || "文件上传失败，请重试";
      if (message.includes("already has")) {
        message = "文件已存在";
      }
      notifications.show({
        title: "保存失败",
        message,
        color: "red",
      });
    }
  };

  const handleSave = () => {
    if (editor) {
      const newContent = editor.getMarkdown();
      setContent(newContent);
      const name = params.get("name");
      if (name) {
        updateNote(name, newContent);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (editor) {
      // 恢复原始内容
      editor.setMarkdown(content);
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (inited) {
      const uid = params.get("uid");
      const name = params.get("name");
      if (uid && name) {
        api
          .get(`/find.cid/${uid}/.note/${name}`)
          .then((res) => {
            const cid = res.data;
            if (cid) {
              setHash(cid);
              fetchNote(cid);
            } else if (hash) {
              fetchNote(hash.slice(1));
            }
          })
          .catch(() => {
            if (hash) {
              fetchNote(hash.slice(1));
            }
          });
      }
    }
  }, [inited]);

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
    let t = "笔记";
    const name = params.get("name");
    if (name) {
      t = name;
    }
    return t;
  }, [content]);

  // 根据编辑状态渲染不同的按钮
  const renderHeaderButtons = () => {
    if (isEditing) {
      return (
        <Group gap="xs">
          <Button size="xs" onClick={handleSave}>
            保存
          </Button>
          <Button size="xs" variant="outline" onClick={handleCancel}>
            取消
          </Button>
        </Group>
      );
    }
    return (
      <Button size="xs" onClick={handleEdit}>
        编辑
      </Button>
    );
  };

  return (
    <>
      <AppHeader title={title} right={renderHeaderButtons()} />

      <Box
        id="viewerElement"
        style={{ display: isEditing ? "none" : "block" }}
      />
      <Box
        id="editorElement"
        style={{ display: isEditing ? "block" : "none" }}
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
