"use client";

import { useMarkdown } from "@/hooks/useMarkdown";
import { useUserStore } from "@/stores/userStore";
import { Box, Container, Divider, SegmentedControl } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import Linux from "@/assets/docs/build/linux.md";
import Windows from "@/assets/docs/build/windows.md";
import { AppHeader } from "@/components/AppHeader";

export default function PageBuild() {
  const linuxElement = useRef<HTMLDivElement>(null);
  const windowsElement = useRef<HTMLDivElement>(null);
  const notesDark = useUserStore((state) => state.notesDark);
  const markdown = useMarkdown();
  const [system, setSystem] = useState("windows"); // 'linux' or 'windows'

  const init = async () => {
    if (linuxElement.current) {
      const viewer = await markdown.initViewer(linuxElement.current);
      viewer.setMarkdown(Linux);
    }
    if (windowsElement.current) {
      const viewer = await markdown.initViewer(windowsElement.current);
      viewer.setMarkdown(Windows);
    }

    const params = new URLSearchParams(window.location.search);
    setSystem(params.get("system") === "linux" ? "linux" : "windows");
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("system", system);
    window.history.replaceState(null, "", url.href);
  }, [system]);

  return (
    <Container w="100%">
      <AppHeader title="部署教程" />
      <Divider my="md" />
      <SegmentedControl
        value={system}
        onChange={setSystem}
        data={[
          { label: "Linux", value: "linux" },
          { label: "Windows", value: "windows" },
        ]}
      />
      <Divider my="md" />
      <Box
        hidden={system !== "linux"}
        className={notesDark}
        ref={linuxElement}
      />
      <Box
        hidden={system !== "windows"}
        className={notesDark}
        ref={windowsElement}
      />
    </Container>
  );
}
