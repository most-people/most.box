import { useState, useEffect } from "react";
import wordsData from "@/assets/json/in-a-word.json";
import { Text, Container } from "@mantine/core";
import "./explore.scss";

export default function HomeExplore() {
  const [randomWord, setRandomWord] = useState("");

  useEffect(() => {
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * wordsData.length);
    setRandomWord(wordsData[randomIndex]);
  }, []);

  return (
    <Container>
      <Text mt={20}>{randomWord}</Text>
    </Container>
  );
}
