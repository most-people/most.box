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
  TextInput,
} from "@mantine/core";

import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";

import "@/app/note/note.scss";

import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { useDotStore } from "@/stores/dotStore";
import { api } from "@/utils/api";
import { notifications } from "@mantine/notifications";
import { mostDecode, mostEncode } from "@/utils/MostWallet";
import Link from "next/link";
import { modals } from "@mantine/modals";

const PageContent = () => {
  const params = useSearchParams();
  const wallet = useUserStore((state) => state.wallet);
  const dotCID = useDotStore((state) => state.dotCID);

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const markdown = useMarkdown();

  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [inited, setInited] = useState(false);

  const [noteName, setNoteName] = useState("");

  const updateUrl = (cid: string, uid?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("cid", cid);
    if (uid) {
      url.searchParams.set("uid", uid);
    }
    window.history.replaceState(null, "", url.href);
  };

  const fetchNote = (cid: string) => {
    fetch(`${dotCID}/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((content) => {
        setInited(true);
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

  useEffect(() => {
    if (!inited) return;
    if (wallet && content.startsWith("mp://2")) {
      // 尝试解密
      const decrypted = mostDecode(
        content,
        wallet.public_key,
        wallet.private_key,
      );
      if (decrypted) {
        // 解密成功
        queueMicrotask(() => setIsSecret(true));
      }
    }
  }, [inited, wallet, content]);

  const updateNote = async (name: string, newContent: string) => {
    // 加密
    if (wallet && isSecret) {
      newContent = mostEncode(
        newContent,
        wallet.public_key,
        wallet.private_key,
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
        updateUrl(cid, wallet?.address);
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
      const name = params?.get("name");
      if (name) {
        updateNote(name, newContent);
      } else {
        // https://mantine.dev/x/modals
        modals.openConfirmModal({
          centered: true,
          title: "保存笔记",
          children: (
            <TextInput
              placeholder="请输入笔记名称"
              value={noteName}
              onChange={(event) => setNoteName(event.currentTarget.value)}
            />
          ),
          labels: { confirm: "保存", cancel: "取消" },
          onConfirm: () => {
            console.log(noteName);
          },
        });
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
    const uid = params?.get("uid");
    const name = params?.get("name");
    // 获取最新 CID
    if (uid && name) {
      try {
        const res = await api.get(`/files.cid/${uid}/.note/${name}`);
        const cid = res.data;
        if (cid) {
          updateUrl(cid);
          fetchNote(cid);
          return;
        }
      } catch (error) {
        console.info(error);
      }
    }
    const cid = params?.get("cid");
    if (cid) {
      fetchNote(cid);
    }
  };

  // 使用 useMemo 缓存标题提取结果
  const title = useMemo(() => {
    let t = "笔记";
    const name = params?.get("name");
    if (name) {
      t = name;
    }
    if (isSecret) {
      t = "🔒 " + t;
    }
    return t;
  }, [isSecret, params]);

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
    if (!inited) return;
    viewer?.setMarkdown(content);
    editor?.setMarkdown(content);
  }, [inited, content, viewer, editor]);

  const viewerElement = useRef<HTMLDivElement>(null);
  const editorElement = useRef<HTMLDivElement>(null);

  const nodeDark = useUserStore((state) => state.nodeDark);

  useEffect(() => {
    initToastUI();
  }, []);

  useEffect(() => {
    if (dotCID) {
      init();
    }
  }, [dotCID]);

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
