"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";

export default function PageJoin() {
  const markdown = useMarkdown();
  const initToastUI = async () => {
    const { Editor, codeSyntaxHighlight } = await markdown.loadModules();

    if (viewerElement.current) {
      const viewer = markdown.initViewer(
        viewerElement.current,
        Editor,
        codeSyntaxHighlight
      );
      fetch("/docs/join.md")
        .then((res) => res.text())
        .then((text) => {
          viewer.setMarkdown(text);
        });
    }
  };

  const viewerElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initToastUI();
  }, []);

  return (
    <Container py="md">
      <AppHeader title="Internationale" />
      <Box ref={viewerElement} />
    </Container>
  );
}
