"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { Container, FileInput, Button, Stack, Text, Code } from "@mantine/core";
import { useEffect, useState } from "react";
import { uploadToCrust } from "@/utils/crust";
import { notifications } from "@mantine/notifications";

export default function PageDemo() {
  const wallet = useUserStore((state) => state.wallet);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cid, setCid] = useState<string>("");

  useEffect(() => {
    if (wallet) {
      console.log(wallet);
    }
  }, [wallet]);

  const handleUpload = async () => {
    if (!file || !wallet?.mnemonic) {
      notifications.show({
        message:
          "Please select a file and ensure wallet mnemonic is available (login with 'I know loss mnemonic...' option)",
        color: "red",
      });
      return;
    }

    try {
      setUploading(true);
      const result = await uploadToCrust(file, wallet.mnemonic);
      setCid(result.cid);
      notifications.show({
        message: "Upload successful!",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "Upload failed",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container py={20}>
      <AppHeader title="demo" />
      <Stack mt="xl">
        <Text fw={700}>Crust Files Upload Demo</Text>
        <FileInput
          placeholder="Select file"
          label="File to upload"
          value={file}
          onChange={setFile}
        />
        <Button
          onClick={handleUpload}
          loading={uploading}
          disabled={!file || !wallet?.mnemonic}
        >
          Upload to Crust
        </Button>
        {cid && (
          <Stack gap="xs">
            <Text size="sm">Upload CID:</Text>
            <Code block>{cid}</Code>
            <Text size="sm" c="dimmed">
              File is now pinned on Crust Network.
            </Text>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
