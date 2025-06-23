import { useState, useEffect } from "react";
import wordsData from "@/assets/json/in-a-word.json";
import { Text } from "@mantine/core";
import "./disk.scss";

export default function HomeDisk() {
  const [randomWord, setRandomWord] = useState("");

  useEffect(() => {
    // 随机选择一句话
    const randomIndex = Math.floor(Math.random() * wordsData.length);
    setRandomWord(wordsData[randomIndex]);
  }, []);

  return <Text>{randomWord}</Text>;
}
