"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/userStore";

export default function PageAboutThesis() {
  const markdown = useMarkdown();
  const noteReady = useUserStore((state) => state.noteReady);

  const init = async () => {
    if (viewerElement.current) {
      const Editor = (window as any).toastui?.Editor;
      const viewer = markdown.initViewer(viewerElement.current, Editor);
      fetch("/docs/about/thesis.md")
        .then((res) => res.text())
        .then((text) => {
          viewer.setMarkdown(text);
        });
    }
  };

  const viewerElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noteReady) init();
  }, [noteReady]);

  return (
    <Container py="md">
      <AppHeader title="论文" />
      <Box ref={viewerElement} />
    </Container>
  );
}
