"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";

const PageJoin = () => {
  const markdown = useMarkdown();

  const init = async () => {
    if (viewerElement.current) {
      const viewer = await markdown.initViewer(viewerElement.current);
      fetch("/docs/join.md")
        .then((res) => res.text())
        .then((text) => {
          viewer.setMarkdown(text);
        });
    }
  };

  const viewerElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, []);

  return (
    <Container py="md">
      <AppHeader title="Internationale" />
      <Box ref={viewerElement} />
    </Container>
  );
};

export default PageJoin;
