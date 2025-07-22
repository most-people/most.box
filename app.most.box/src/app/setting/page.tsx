import { AppHeader } from "@/components/AppHeader";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Text, Container } from "@mantine/core";
import "./setting.scss";

export default function PageSetting() {
  return (
    <Container id="page-setting" py={20}>
      <AppHeader title="设置" />

      <Text>主题</Text>
      <ThemeSwitcher />
    </Container>
  );
}
