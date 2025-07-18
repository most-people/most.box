import { AppHeader } from "@/components/AppHeader";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Text, Box } from "@mantine/core";
import "./setting.scss";

export default function PageSetting() {
  return (
    <Box id="page-setting" py={64} px={20}>
      <AppHeader title="设置" />

      <Text>主题</Text>
      <ThemeSwitcher />
    </Box>
  );
}
