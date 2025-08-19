"use client";
import { AppHeader } from "@/components/AppHeader";
import { useMarkdown } from "@/hooks/useMarkdown";
import { Container, Box } from "@mantine/core";
import { useEffect, useRef } from "react";
import content from "./thesis.md";
import { useUserStore } from "@/stores/userStore";

const PageAboutThesis = () => {
  const markdown = useMarkdown();
  const nodeDark = useUserStore((state) => state.nodeDark);

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
      <Box className={nodeDark} ref={viewerElement} />
    </Container>
  );
};

export default PageAboutThesis;
