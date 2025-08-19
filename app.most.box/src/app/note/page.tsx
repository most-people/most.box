"use client";

import { useEffect, useMemo, useState, Suspense, useRef } from "react";
import {
  Box,
  Button,
  Group,
  Switch,
  Loader,
  Center,
  Container,
} from "@mantine/core";

import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";

import "@/app/note/note.scss";

import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { api } from "@/constants/api";
import { notifications } from "@mantine/notifications";
import { mostDecode, mostEncode } from "@/constants/MostWallet";
import Link from "next/link";

const PageContent = () => {
  const params = useSearchParams();
  const dotCID = useUserStore((state) => state.dotCID);
  const wallet = useUserStore((state) => state.wallet);

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const markdown = useMarkdown();

  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSecret, setIsSecret] = useState(false);

  const setHash = (cid: string, uid?: string) => {
    const url = new URL(window.location.href);
    url.hash = cid;
    if (uid) {
      url.searchParams.set("uid", uid);
    }
    window.history.replaceState(null, "", url.href);
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
      })
      .finally(() => {
        setLoading(false);
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
        setHash(cid, wallet?.address);
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

  const initToastUI = async () => {
    if (viewerElement.current) {
      const viewer = await markdown.initViewer(viewerElement.current);
      setViewer(viewer);
    }
    if (editorElement.current) {
      const editor = await markdown.initEditor(editorElement.current);
      setEditor(editor);
    }
  };

  const init = async () => {
    const hash = location.hash;
    const uid = params.get("uid");
    const name = params.get("name");
    const customAPI = params.get("dot") || undefined;

    if (uid && name) {
      try {
        const resDot = await api.get(`/api.dot`, { baseURL: customAPI });
        const customCID = (resDot.data?.CIDs?.[0] as string) || undefined;
        const res = await api.get(`/files.find.cid/${uid}/.note/${name}`, {
          baseURL: customAPI,
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
    return (
      <Group gap="xs" wrap="nowrap">
        {isEditing ? (
          <>
            <Button size="xs" onClick={handleSave}>
              保存
            </Button>
            <Button size="xs" variant="outline" onClick={handleCancel}>
              取消
            </Button>
          </>
        ) : wallet ? (
          <Button size="xs" onClick={() => setIsEditing(true)}>
            编辑
          </Button>
        ) : (
          <Button size="xs" variant="gradient" component={Link} href="/login">
            编辑
          </Button>
        )}
      </Group>
    );
  };

  useEffect(() => {
    if (viewer) {
      viewer.setMarkdown(content);
    }
    if (editor) {
      editor.setMarkdown(content);
    }
  }, [content, viewer, editor]);

  const viewerElement = useRef<HTMLDivElement>(null);
  const editorElement = useRef<HTMLDivElement>(null);

  const nodeDark = useUserStore((state) => state.nodeDark);

  useEffect(() => {
    init();
    initToastUI();
  }, []);

  return (
    <Container id="page-note">
      <AppHeader title={title} variant="text" right={renderHeaderButtons()} />

      <Box
        id="viewer-box"
        className={nodeDark}
        ref={viewerElement}
        style={{ display: isEditing ? "none" : "block" }}
      />
      <Box
        id="editor-box"
        className={nodeDark}
        ref={editorElement}
        style={{ display: isEditing ? "block" : "none" }}
      />

      <Box id="switch-box" style={{ display: isEditing ? "block" : "none" }}>
        <Switch
          checked={isSecret}
          onChange={(event) => setIsSecret(event.currentTarget.checked)}
          label={isSecret ? "加密" : "公开"}
        />
      </Box>

      {loading && (
        <Center mt="md">
          <Loader size="xl" type="dots" />
        </Center>
      )}
    </Container>
  );
};

const PageNote = () => {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
};

export default PageNote;
