"use client";
import { Text, Group, ActionIcon, TextVariant } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";
import { notifications } from "@mantine/notifications";

interface AppHeaderProps {
  title: string | string[];
  variant?: TextVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export const AppHeader = ({ title, variant, right, left }: AppHeaderProps) => {
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
      <Text lineClamp={2} variant={variant || "gradient"}>
        {title}
      </Text>
      {right ? (
        right
      ) : (
        <ActionIcon
          variant="transparent"
          color="--text-color"
          onClick={() => notifications.show({ message: "没有更多" })}
        >
          <Icon name="More" size={24} />
        </ActionIcon>
      )}
    </Group>
  );
};
