"use client";
import { Popover, Box, Button, Group } from "@mantine/core";
import { useState } from "react";
import { IconMoodSmile } from "@tabler/icons-react";

const EMOJIS = ["😀", "😂", "😍", "👍", "🎉", "🙏", "😎", "🥳", "🤝", "💡", "🚀", "🔥"];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [opened, setOpened] = useState(false);
  return (
    <Popover opened={opened} onChange={setOpened} withArrow position="top" shadow="md">
      <Popover.Target>
        <Button variant="light" color="gray" onClick={() => setOpened((o) => !o)} px={8}>
          <IconMoodSmile size={18} />
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Box className="emoji-grid">
          <Group gap={6}>
            {EMOJIS.map((e) => (
              <Button key={e} variant="subtle" onClick={() => { onSelect(e); setOpened(false); }}>
                {e}
              </Button>
            ))}
          </Group>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}