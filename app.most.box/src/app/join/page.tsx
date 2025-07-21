import { AppHeader } from "@/components/AppHeader";
import { Container, Title, Text } from "@mantine/core";

export default function PageJoin() {
  return (
    <Container>
      <AppHeader title="Internationale" />
      <Title>文明演化与宇宙尺度的社会发展</Title>
      <Text mt={20}>
        探讨文明如何跨越行星界限发展为「戴森球文明」或「卡尔达肖夫等级」中的高等级文明。
      </Text>
    </Container>
  );
}
