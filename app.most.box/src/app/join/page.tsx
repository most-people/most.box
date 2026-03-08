"use client";
import { AppHeader } from "@/components/AppHeader";
import { Container, Box, Loader, Center } from "@mantine/core";
import content from "./join.md";
import dynamic from "next/dynamic";

const MilkdownEditor = dynamic(
  () => import("@/components/MilkdownEditor").then((mod) => mod.MilkdownEditor),
  {
    ssr: false,
    loading: () => (
      <Center h={400}>
        <Loader size="xl" type="dots" />
      </Center>
    ),
  },
);

const PageJoin = () => {
  return (
    <Container py="md">
      <AppHeader title="Internationale" />
      <Box>
        <MilkdownEditor
          content={content}
          readOnly={true}
          className="viewer-mode"
        />
      </Box>
    </Container>
  );
};

export default PageJoin;
