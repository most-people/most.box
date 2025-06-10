"use client";
import { Container, Group, Input, Stack, Text } from "@mantine/core";
import { AppHeader } from "@/components/AppHeader";
import { useState, useEffect } from "react";
import "./trader.scss";
import { IconLockBitcoin } from "@tabler/icons-react";

export default function PageTrader() {
  // 存储占用金额
  const [priceOccupy, setPriceOccupy] = useState("50");
  const [firstOccupy, setFirstOccupy] = useState("");
  const [secondOccupy, setSecondOccupy] = useState("");
  const [thirdOccupy, setThirdOccupy] = useState("");
  const [fourthOccupy, setFourthOccupy] = useState("");
  const [fifthOccupy, setFifthOccupy] = useState("");
  const [activeField, setActiveField] = useState("price");

  // 根据当前修改的字段和值更新所有字段
  useEffect(() => {
    if (activeField === "price" && priceOccupy) {
      const basePrice = parseFloat(priceOccupy) || 0;

      // 计算金额
      const firstAdd = basePrice * 2;
      const firstOccupyValue = basePrice + firstAdd;

      const secondAdd = firstOccupyValue * 2;
      const secondOccupyValue = firstOccupyValue + secondAdd;

      const thirdAdd = secondOccupyValue * 2;
      const thirdOccupyValue = secondOccupyValue + thirdAdd;

      const fourthAdd = thirdOccupyValue * 2;
      const fourthOccupyValue = thirdOccupyValue + fourthAdd;

      const fifthAdd = fourthOccupyValue * 2;
      const fifthOccupyValue = fourthOccupyValue + fifthAdd;

      setFirstOccupy(firstOccupyValue.toString());
      setSecondOccupy(secondOccupyValue.toString());
      setThirdOccupy(thirdOccupyValue.toString());
      setFourthOccupy(fourthOccupyValue.toString());
      setFifthOccupy(fifthOccupyValue.toString());
    } else if (activeField === "first" && firstOccupy) {
      const firstOccupyValue = parseFloat(firstOccupy) || 0;
      // 反向计算基础价格和金额
      // 假设 firstOccupy = basePrice + firstAdd，且 firstAdd = basePrice * 2
      // 则 firstOccupy = basePrice + basePrice * 2 = basePrice * 3
      const basePrice = Math.round(firstOccupyValue / 3);

      const secondAdd = firstOccupyValue * 2;
      const secondOccupyValue = firstOccupyValue + secondAdd;

      const thirdAdd = secondOccupyValue * 2;
      const thirdOccupyValue = secondOccupyValue + thirdAdd;

      const fourthAdd = thirdOccupyValue * 2;
      const fourthOccupyValue = thirdOccupyValue + fourthAdd;

      const fifthAdd = fourthOccupyValue * 2;
      const fifthOccupyValue = fourthOccupyValue + fifthAdd;

      setPriceOccupy(basePrice.toString());
      setSecondOccupy(secondOccupyValue.toString());
      setThirdOccupy(thirdOccupyValue.toString());
      setFourthOccupy(fourthOccupyValue.toString());
      setFifthOccupy(fifthOccupyValue.toString());
    } else if (activeField === "second" && secondOccupy) {
      const secondOccupyValue = parseFloat(secondOccupy) || 0;
      // 反向计算第一次占用金额
      // 假设 secondOccupy = firstOccupy + secondAdd，且 secondAdd = firstOccupy * 2
      // 则 secondOccupy = firstOccupy + firstOccupy * 2 = firstOccupy * 3
      const firstOccupyValue = Math.round(secondOccupyValue / 3);
      // 继续反向计算基础价格
      const basePrice = Math.round(firstOccupyValue / 3);

      const thirdAdd = secondOccupyValue * 2;
      const thirdOccupyValue = secondOccupyValue + thirdAdd;

      const fourthAdd = thirdOccupyValue * 2;
      const fourthOccupyValue = thirdOccupyValue + fourthAdd;

      const fifthAdd = fourthOccupyValue * 2;
      const fifthOccupyValue = fourthOccupyValue + fifthAdd;

      setPriceOccupy(basePrice.toString());
      setFirstOccupy(firstOccupyValue.toString());
      setThirdOccupy(thirdOccupyValue.toString());
      setFourthOccupy(fourthOccupyValue.toString());
      setFifthOccupy(fifthOccupyValue.toString());
    } else if (activeField === "third" && thirdOccupy) {
      const thirdOccupyValue = parseFloat(thirdOccupy) || 0;
      const secondOccupyValue = Math.round(thirdOccupyValue / 3);
      const firstOccupyValue = Math.round(secondOccupyValue / 3);
      const basePrice = Math.round(firstOccupyValue / 3);

      const fourthAdd = thirdOccupyValue * 2;
      const fourthOccupyValue = thirdOccupyValue + fourthAdd;

      const fifthAdd = fourthOccupyValue * 2;
      const fifthOccupyValue = fourthOccupyValue + fifthAdd;

      setPriceOccupy(basePrice.toString());
      setFirstOccupy(firstOccupyValue.toString());
      setSecondOccupy(secondOccupyValue.toString());
      setFourthOccupy(fourthOccupyValue.toString());
      setFifthOccupy(fifthOccupyValue.toString());
    } else if (activeField === "fourth" && fourthOccupy) {
      const fourthOccupyValue = parseFloat(fourthOccupy) || 0;
      const thirdOccupyValue = Math.round(fourthOccupyValue / 3);
      const secondOccupyValue = Math.round(thirdOccupyValue / 3);
      const firstOccupyValue = Math.round(secondOccupyValue / 3);
      const basePrice = Math.round(firstOccupyValue / 3);

      const fifthAdd = fourthOccupyValue * 2;
      const fifthOccupyValue = fourthOccupyValue + fifthAdd;

      setPriceOccupy(basePrice.toString());
      setFirstOccupy(firstOccupyValue.toString());
      setSecondOccupy(secondOccupyValue.toString());
      setThirdOccupy(thirdOccupyValue.toString());
      setFifthOccupy(fifthOccupyValue.toString());
    } else if (activeField === "fifth" && fifthOccupy) {
      const fifthOccupyValue = parseFloat(fifthOccupy) || 0;
      const fourthOccupyValue = Math.round(fifthOccupyValue / 3);
      const thirdOccupyValue = Math.round(fourthOccupyValue / 3);
      const secondOccupyValue = Math.round(thirdOccupyValue / 3);
      const firstOccupyValue = Math.round(secondOccupyValue / 3);
      const basePrice = Math.round(firstOccupyValue / 3);

      setPriceOccupy(basePrice.toString());
      setFirstOccupy(firstOccupyValue.toString());
      setSecondOccupy(secondOccupyValue.toString());
      setThirdOccupy(thirdOccupyValue.toString());
      setFourthOccupy(fourthOccupyValue.toString());
    }
  }, [
    priceOccupy,
    firstOccupy,
    secondOccupy,
    thirdOccupy,
    fourthOccupy,
    fifthOccupy,
    activeField,
  ]);

  // 处理输入变化并设置当前活动字段
  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>, field: string) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.currentTarget.value);
      setActiveField(field);
    };

  // 计算各级别的金额（用于显示在rightSection）
  const basePrice = parseFloat(priceOccupy) || 0;
  const firstOccupyValue = parseFloat(firstOccupy) || 0;
  const secondOccupyValue = parseFloat(secondOccupy) || 0;
  const thirdOccupyValue = parseFloat(thirdOccupy) || 0;
  const fourthOccupyValue = parseFloat(fourthOccupy) || 0;

  // 计算金额
  const firstAdd = basePrice * 2;
  const secondAdd = firstOccupyValue * 2;
  const thirdAdd = secondOccupyValue * 2;
  const fourthAdd = thirdOccupyValue * 2;
  const fifthAdd = fourthOccupyValue * 2;

  const RightSection = (text: number) => {
    return <Text>{text}</Text>;
  };

  return (
    <Container id="page-jy">
      <AppHeader title="交易 - 三大纪律，八项注意" />

      <Stack gap="md" w={300}>
        <Input.Wrapper label="开仓保证金">
          <Input
            autoFocus
            placeholder="50"
            leftSection={<IconLockBitcoin />}
            value={priceOccupy}
            onChange={handleInputChange(setPriceOccupy, "price")}
          />
        </Input.Wrapper>
        <Input.Wrapper
          label={
            <Group justify="space-between" w={300}>
              <span>第一次</span>
              <span>加仓</span>
            </Group>
          }
        >
          <Input
            placeholder="150"
            leftSection={<IconLockBitcoin />}
            rightSection={RightSection(firstAdd)}
            value={firstOccupy}
            onChange={handleInputChange(setFirstOccupy, "first")}
          />
        </Input.Wrapper>
        <Input.Wrapper label="第二次">
          <Input
            placeholder="450"
            value={secondOccupy}
            leftSection={<IconLockBitcoin />}
            rightSection={RightSection(secondAdd)}
            onChange={handleInputChange(setSecondOccupy, "second")}
          />
        </Input.Wrapper>
        <Input.Wrapper label="第三次">
          <Input
            placeholder="1350"
            value={thirdOccupy}
            leftSection={<IconLockBitcoin />}
            rightSection={RightSection(thirdAdd)}
            onChange={handleInputChange(setThirdOccupy, "third")}
          />
        </Input.Wrapper>
        <Input.Wrapper label="第四次">
          <Input
            placeholder="4050"
            value={fourthOccupy}
            leftSection={<IconLockBitcoin />}
            rightSection={RightSection(fourthAdd)}
            onChange={handleInputChange(setFourthOccupy, "fourth")}
          />
        </Input.Wrapper>
        <Input.Wrapper label="第五次">
          <Input
            placeholder="12150"
            value={fifthOccupy}
            leftSection={<IconLockBitcoin />}
            rightSection={RightSection(fifthAdd)}
            onChange={handleInputChange(setFifthOccupy, "fifth")}
          />
        </Input.Wrapper>
      </Stack>
    </Container>
  );
}
