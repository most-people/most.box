"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import {
  Box,
  Button,
  Group,
  useMantineColorScheme,
  useComputedColorScheme,
  Switch,
} from "@mantine/core";
import Script from "next/script";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
// import { useUserStore } from "@/stores/userStore";

// https://uicdn.toast.com/editor/latest/toastui-editor.min.css
import "@/assets/toast-ui/toastui-editor.min.css";
// https://www.jsdelivr.com/package/npm/prismjs
import "@/assets/toast-ui/prism.min.css";
// https://uicdn.toast.com/editor/latest/theme/toastui-editor-dark.css
import "@/assets/toast-ui/toastui-editor-dark.css";
// https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight.min.css
import "@/assets/toast-ui/toastui-editor-plugin-code-syntax-highlight.min.css";

import "./note.scss";
import "./markdown.scss";

import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { api } from "@/constants/api";
import { notifications } from "@mantine/notifications";
import { mostDecode, mostEncode } from "@/constants/MostWallet";

const PageContent = () => {
  const params = useSearchParams();
  const dotCID = useUserStore((state) => state.dotCID);
  const wallet = useUserStore((state) => state.wallet);

  const [inited, setInited] = useState(false);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const markdown = useMarkdown();

  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSecret, setIsSecret] = useState(false);

  const setHash = (cid: string) => {
    const url = new URL(window.location.href);
    url.hash = cid;
    window.history.replaceState(null, "", url.href);
  };

  const initViewer = () => {
    setViewer(markdown.initViewer());
    setInited(true);
  };
  const initEditor = () => {
    setEditor(markdown.initEditor());
  };

  const fetchNote = (cid: string, customCID?: string) => {
    fetch(`${customCID || dotCID}/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((content) => {
        const customAPI = params.get("dot") || "";
        const url = new URL(window.location.href);
        url.searchParams.set("dot", customAPI || api.getUri());
        window.history.replaceState(null, "", url.href);

        if (wallet && content.startsWith("mp://2")) {
          // 解密
          const decrypted = mostDecode(
            content,
            wallet.public_key,
            wallet.private_key
          );
          if (decrypted) {
            // 解密成功
            setIsSecret(true);
            setContent(decrypted);
            return;
          }
        }

        setIsSecret(false);
        setContent(content);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const updateNote = async (name: string, newContent: string) => {
    // 加密
    if (wallet && isSecret) {
      newContent = mostEncode(
        newContent,
        wallet.public_key,
        wallet.private_key
      );
    }

    const formData = new FormData();
    const blob = new Blob([newContent], { type: "text/markdown" });
    formData.append("file", blob, "index.md");
    formData.append("path", `/.note/${name}/index.md`);

    try {
      const res = await api.put("/files.upload", formData);
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

  const init = async () => {
    const hash = location.hash;
    const uid = params.get("uid");
    const name = params.get("name");
    const customAPI = params.get("dot") || "";

    if (uid && name) {
      try {
        const resDot = await api.get(`/api.dot`, {
          baseURL: customAPI || undefined,
        });
        const customCID = (resDot.data?.CIDs[0] as string) || undefined;
        const res = await api.get(`/files.find.cid/${uid}/.note/${name}`, {
          baseURL: customAPI || undefined,
        });
        const cid = res.data;
        if (cid) {
          setHash(cid);
          fetchNote(cid, customCID);
        } else if (hash) {
          fetchNote(hash.slice(1), customCID);
        }
      } catch (error) {
        console.error(error);
        if (hash) {
          fetchNote(hash.slice(1));
        }
      }
    }
  };

  // 获取最新的 CID
  useEffect(() => {
    if (inited) {
      init();
    }
  }, [inited]);

  useEffect(() => {
    if (viewer) {
      viewer.setMarkdown(content);
    }
    if (editor) {
      editor.setMarkdown(content);
    }
  }, [content, viewer, editor]);

  // 使用 useMemo 缓存标题提取结果
  const title = useMemo(() => {
    let t = "笔记";
    const name = params.get("name");
    if (name) {
      t = name;
    }
    if (isSecret) {
      t = "🔒 " + t;
    }
    return t;
  }, [isSecret]);

  // 根据编辑状态渲染不同的按钮
  const renderHeaderButtons = () => {
    if (isEditing) {
      return (
        <Group gap="xs" wrap="nowrap">
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
      <Button size="xs" onClick={() => setIsEditing(true)} disabled={!wallet}>
        编辑
      </Button>
    );
  };

  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();

  useEffect(() => {
    const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;
    const isDark = theme === "dark";
    if (viewer) {
      if (isDark) {
        viewer.options.el.classList.add("toastui-editor-dark");
      } else {
        viewer.options.el.classList.remove("toastui-editor-dark");
      }
    }
    if (editor) {
      if (isDark) {
        editor.options.el.classList.add("toastui-editor-dark");
      } else {
        editor.options.el.classList.remove("toastui-editor-dark");
      }
    }
  }, [colorScheme, computedColorScheme, viewer, editor]);

  return (
    <Box id="page-note">
      <AppHeader title={title} variant="text" right={renderHeaderButtons()} />

      <Box
        id="viewerElement"
        style={{ display: isEditing ? "none" : "block" }}
      />
      <Box
        id="editorElement"
        style={{ display: isEditing ? "block" : "none" }}
      />

      <Box id="switch-box" style={{ display: isEditing ? "block" : "none" }}>
        <Switch
          checked={isSecret}
          onChange={(event) => setIsSecret(event.currentTarget.checked)}
          label={isSecret ? "加密" : "公开"}
        />
      </Box>

      {/* https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js */}
      <Script src="/toast-ui/toastui-editor-all.min.js" />
      {/* https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js */}
      <Script
        src="/toast-ui/toastui-editor-plugin-code-syntax-highlight-all.min.js"
        strategy="lazyOnload"
        onReady={initViewer}
      />
      {/* https://uicdn.toast.com/editor/latest/i18n/zh-cn.js */}
      {inited && (
        <Script
          src="/toast-ui/zh-cn.js"
          strategy="lazyOnload"
          onReady={initEditor}
        />
      )}
    </Box>
  );
};

export default function PageNote() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
