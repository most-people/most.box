"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";
import content from "./join.md";
import { useUserStore } from "@/stores/userStore";

const PageJoin = () => {
  const notesDark = useUserStore((state) => state.notesDark);
  const markdown = useMarkdown();

  const init = async () => {
    if (viewerElement.current) {
      const viewer = await markdown.initViewer(viewerElement.current);
      viewer.setMarkdown(content);
    }
  };

  const viewerElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, []);

  return (
    <Container py="md">
      <AppHeader title="Internationale" />
      <Box className={notesDark} ref={viewerElement} />
    </Container>
  );
};

export default PageJoin;
