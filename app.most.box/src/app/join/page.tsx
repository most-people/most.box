"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/userStore";

export default function PageJoin() {
  const markdown = useMarkdown();
  const noteReady = useUserStore((state) => state.noteReady);

  const init = async () => {
    if (viewerElement.current) {
      const viewer = markdown.initViewer(viewerElement.current);
      fetch("/docs/join.md")
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
      <AppHeader title="Internationale" />
      <Box ref={viewerElement} />
    </Container>
  );
}
