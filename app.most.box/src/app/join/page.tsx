"use client";
import { AppHeader } from "@/components/AppHeader";
import { Container, Box } from "@mantine/core";
import content from "./join.md";
import { MilkdownEditor } from "@/components/MilkdownEditor";

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
