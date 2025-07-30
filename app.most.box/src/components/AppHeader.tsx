"use client";
import { Text, Group, ActionIcon } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";

interface AppHeaderProps {
  title: string | string[];
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export const AppHeader = ({ title, right, left }: AppHeaderProps) => {
  const back = useBack();

  return (
    <Group className="app-header">
      {left ? (
        left
      ) : (
        <ActionIcon variant="transparent" onClick={back} color="--text-color">
          <Icon name="Back" size={24} />
        </ActionIcon>
      )}
      <Text lineClamp={2} variant="gradient">
        {title}
      </Text>
      {right ? (
        right
      ) : (
        <ActionIcon variant="transparent" color="--text-color">
          <Icon name="More" size={24} />
        </ActionIcon>
      )}
    </Group>
  );
};
