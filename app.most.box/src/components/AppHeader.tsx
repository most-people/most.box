"use client";
import { Text, Group, ActionIcon } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";

interface AppHeaderProps {
  title: string | string[];
  right?: React.ReactNode;
}
export const AppHeader = ({ title, right }: AppHeaderProps) => {
  const back = useBack();

  return (
    <Group className="app-header">
      <ActionIcon variant="transparent" onClick={back} color="--text-color">
        <Icon name="back" size={24} />
      </ActionIcon>
      <Text lineClamp={2} variant="gradient">
        {title}
      </Text>
      {right ? (
        right
      ) : (
        <ActionIcon variant="transparent" color="--text-color">
          <Icon name="more" size={24} />
        </ActionIcon>
      )}
    </Group>
  );
};
