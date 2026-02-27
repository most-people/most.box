"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Box,
  Container,
  Stack,
  Text,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from "@vidstack/react/player/layouts/default";
import { useUserStore } from "@/stores/userStore";

export default function PlayerPage() {
  const searchParams = useSearchParams();
  const cid = searchParams.get("cid");
  const filename = searchParams.get("filename") || "Video";
  const [mounted, setMounted] = useState(false);
  const dotCID = useUserStore((state) => state.dotCID);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = useMemo(() => {
    if (cid) {
      // Convert IPFS CID to a public gateway URL
      return `${dotCID}/ipfs/${cid}`;
    }
    return "";
  }, [cid]);

  if (!mounted) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Box>
      <AppHeader title={filename} />
      <Container size="md" py="md">
        <Stack gap="md">
          {!cid ? (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error"
              color="red"
            >
              Missing CID parameter.
            </Alert>
          ) : (
            <Box>
              <MediaPlayer src={src} autoPlay>
                <MediaProvider />
                <DefaultVideoLayout icons={defaultLayoutIcons} noAudioGain />
              </MediaPlayer>
              <Text c="dimmed" mt="xs" ta="center">
                {src}
              </Text>
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
