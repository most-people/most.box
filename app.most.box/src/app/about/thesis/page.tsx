"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";
import content from "@/assets/docs/thesis.md";
import { useUserStore } from "@/stores/userStore";

const PageAboutThesis = () => {
  const markdown = useMarkdown();
  const notesDark = useUserStore((state) => state.notesDark);

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
      <AppHeader title="论文" />
      <Box className={notesDark} ref={viewerElement} />
    </Container>
  );
};

export default PageAboutThesis;
