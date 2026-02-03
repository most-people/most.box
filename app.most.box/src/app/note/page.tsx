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

import "@/app/note/page.scss";

import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/stores/userStore";
import { notifications } from "@mantine/notifications";
import { most25519, mostDecode, mostEncode } from "@/utils/MostWallet";
import Link from "next/link";
import { modals } from "@mantine/modals";

const PageContent = () => {
  const params = useSearchParams();
  const wallet = useUserStore((state) => state.wallet);
  const dotCID = useUserStore((state) => state.dotCID);
  const notes = useUserStore((state) => state.notes);

  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markdown = useMarkdown();

  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSecret, setIsSecret] = useState(false);
  const [inited, setInited] = useState(false);

  const [noteName, setNoteName] = useState("");

  const updateUrl = (cid?: string, uid?: string) => {
    const url = new URL(window.location.href);
    if (cid) {
      url.searchParams.set("cid", cid);
    } else {
      url.searchParams.delete("cid");
    }
    if (uid) {
      url.searchParams.set("uid", uid);
    }
    window.history.replaceState(null, "", url.href);
  };

  const fetchNote = (cid?: string) => {
    if (!cid) {
      setInited(true);
      setIsSecret(false);
      setContent("");
      setLoading(false);
      return;
    }

    // 优先从本地 Store 获取
    const localNote = notes.find((n) => n.cid === cid);
    if (localNote && localNote.content !== undefined) {
      setInited(true);
      setIsSecret(false);
      setContent(localNote.content);
      setLoading(false);
      return;
    }

    // 如果本地没有，直接结束加载
    setInited(true);
    setIsSecret(false);
    setContent("");
    setLoading(false);
  };

  useEffect(() => {
    if (!inited) return;
    if (wallet && content.startsWith("mp://2")) {
      const { public_key, private_key } = most25519(wallet.danger);
      // 尝试解密
      const decrypted = mostDecode(content, public_key, private_key);
      if (decrypted) {
        // 解密成功
        queueMicrotask(() => setIsSecret(true));
      }
    }
  }, [inited, wallet, content]);

  const updateNote = async (name: string, newContent: string) => {
    if (!wallet) return;

    // 加密
    if (wallet && isSecret) {
      const { public_key, private_key } = most25519(wallet.danger);
      newContent = mostEncode(newContent, public_key, private_key);
    }

    try {
      const blob = new Blob([newContent], { type: "text/markdown" });

      // 保存到本地 Store 实现离线可用
      const localCid = await useUserStore.getState().addNote({
        name: name,
        size: blob.size,
        type: "file",
        path: "",
        content: newContent,
      });

      updateUrl(localCid, wallet?.address);
      notifications.show({
        message: `${name} 已保存至本地`,
        color: "blue",
      });
    } catch (error: any) {
      let message = error?.message || "文件保存失败，请重试";
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
            updateNote(noteName, newContent);
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

  const init = async () => {
    const mode = params?.get("mode");
    if (mode === "edit") {
      setIsEditing(true);
    }

    const uid = params?.get("uid");
    const name = params?.get("name");
    // 获取最新 CID
    if (uid && name) {
      const notesList = notes;
      const note = notesList.find((file) => file.name === name);
      if (note) {
        const cid = note.cid;
        updateUrl(cid);
        fetchNote(cid);
        return;
      }
    }
    const cid = params?.get("cid");
    if (cid) {
      fetchNote(cid);
    } else {
      fetchNote();
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
    if (isEditing && editor) {
      focusTimeoutRef.current = setTimeout(() => {
        editor.focus();
      }, 100);
    }
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isEditing, editor]);

  useEffect(() => {
    if (!inited) return;
    viewer?.setMarkdown(content);
    editor?.setMarkdown(content);
  }, [inited, content, viewer, editor]);

  const viewerElement = useRef<HTMLDivElement>(null);
  const editorElement = useRef<HTMLDivElement>(null);

  const notesDark = useUserStore((state) => state.notesDark);

  useEffect(() => {
    let viewerInstance: any;
    let editorInstance: any;

    const initUI = async () => {
      if (viewerElement.current) {
        viewerInstance = await markdown.initViewer(viewerElement.current);
        setViewer(viewerInstance);
      }
      if (editorElement.current) {
        editorInstance = await markdown.initEditor(editorElement.current);
        setEditor(editorInstance);
      }
    };

    initUI();

    return () => {
      if (viewerInstance) viewerInstance.destroy();
      if (editorInstance) editorInstance.destroy();
    };
  }, []);

  useEffect(() => {
    init();
  }, [dotCID]);

  return (
    <Container id="page-note">
      <AppHeader title={title} variant="text" right={renderHeaderButtons()} />

      <Box
        id="viewer-box"
        className={notesDark}
        ref={viewerElement}
        style={{ display: isEditing ? "none" : "block" }}
      />
      <Box
        id="editor-box"
        className={notesDark}
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
