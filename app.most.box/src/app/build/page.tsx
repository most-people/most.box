"use client";

import { useMarkdown } from "@/hooks/useMarkdown";
import { useUserStore } from "@/stores/userStore";
import { Box, Container, Divider, SegmentedControl } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import Linux from "./linux.md";
import Windows from "./windows.md";
import { AppHeader } from "@/components/AppHeader";

export default function PageBuild() {
  const linuxElement = useRef<HTMLDivElement>(null);
  const windowsElement = useRef<HTMLDivElement>(null);
  const nodeDark = useUserStore((state) => state.nodeDark);
  const markdown = useMarkdown();
  const [os, setOs] = useState("linux"); // 'linux' or 'windows'

  const init = async () => {
    if (linuxElement.current) {
      const viewer = await markdown.initViewer(linuxElement.current);
      viewer.setMarkdown(Linux);
    }
    if (windowsElement.current) {
      const viewer = await markdown.initViewer(windowsElement.current);
      viewer.setMarkdown(Windows);
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <Container w="100%">
      <AppHeader title="部署教程" />
      <Divider my="md" />
      <SegmentedControl
        value={os}
        onChange={setOs}
        data={[
          { label: "Linux", value: "linux" },
          { label: "Windows", value: "windows" },
        ]}
      />
      <Divider my="md" />
      <Box hidden={os !== "linux"} className={nodeDark} ref={linuxElement} />
      <Box
        hidden={os !== "windows"}
        className={nodeDark}
        ref={windowsElement}
      />
    </Container>
  );
}
