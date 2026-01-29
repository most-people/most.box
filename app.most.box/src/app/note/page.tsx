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
import { api } from "@/utils/api";
import { notifications } from "@mantine/notifications";
import { most25519, mostDecode, mostEncode } from "@/utils/MostWallet";
import Link from "next/link";
import { modals } from "@mantine/modals";

import { createCrustAuthHeader, uploadToIpfsGateway } from "@/utils/crust";
import { mostMnemonic } from "@/utils/MostWallet";
import { Wallet } from "ethers";
import mp from "@/utils/mp";

const PageContent = () => {
  const params = useSearchParams();
  const wallet = useUserStore((state) => state.wallet);
  const dotCID = useUserStore((state) => state.dotCID);
  const files = useUserStore((state) => state.files);

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
      const mnemonic = mostMnemonic(wallet.danger);
      const account = Wallet.fromPhrase(mnemonic);
      const signature = await account.signMessage(account.address);
      const authHeader = createCrustAuthHeader(account.address, signature);

      const blob = new Blob([newContent], { type: "text/markdown" });
      const file = new File([blob], "index.md", { type: "text/markdown" });
      const ipfs = await uploadToIpfsGateway(file, authHeader);

      const cid = ipfs.cid;
      if (cid) {
        // 注册到本地
        useUserStore.getState().addLocalFile({
          cid: { "/": cid },
          name: name,
          size: blob.size,
          type: "file",
          path: "/.note",
        });

        updateUrl(cid, wallet?.address);
        notifications.show({
          message: `${name} 保存成功`,
          color: "green",
        });
      }
    } catch (error: any) {
      let message = error?.message || "文件上传失败，请重试";
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
      const note = files?.find(
        (file) => mp.normalizePath(file.path) === ".note" && file.name === name,
      );
      if (note) {
        const cid = note.cid["/"];
        updateUrl(cid);
        fetchNote(cid);
        return;
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
