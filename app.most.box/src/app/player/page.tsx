"use client";

import { useSearchParams } from "next/navigation";
import {
  LivepeerConfig,
  createReactClient,
  studioProvider,
  Player,
} from "@livepeer/react";
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

// Initialize the Livepeer client
// Note: You should replace the apiKey with your own Livepeer Studio API Key
const client = createReactClient({
  provider: studioProvider({
    apiKey: "c666c547-596f-4796-9d66-7b8956973656", // Placeholder or env var
  }),
});

export default function PlayerPage() {
  const searchParams = useSearchParams();
  const cid = searchParams.get("cid");
  const filename = searchParams.get("filename") || "Video";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = useMemo(() => {
    if (cid) {
      // Construct IPFS URL
      // Livepeer Player can handle ipfs:// protocol if configured or standard gateways
      return `ipfs://${cid}`;
    }
    return null;
  }, [cid]);

  if (!mounted) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <LivepeerConfig client={client}>
      <Box>
        <AppHeader title={filename} />
        <Container size="md" py="xl">
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
                <Player
                  title={filename}
                  src={src}
                  showPipButton
                  objectFit="contain"
                  autoPlay
                  controls={{
                    autohide: 3000,
                  }}
                  theme={{
                    borderStyles: { containerBorderStyle: "solid" },
                    radii: { containerBorderRadius: "10px" },
                  }}
                />
                <Text size="xs" c="dimmed" mt="xs" ta="center">
                  CID: {cid}
                </Text>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </LivepeerConfig>
  );
}
