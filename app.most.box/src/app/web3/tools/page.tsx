"use client";
import { useEffect, useState } from "react";
import {
  Container,
  Button,
  Text,
  Paper,
  Stack,
  Table,
  Avatar,
  Input,
  Switch,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { mostWallet } from "@/constants/MostWallet";
import { HDNodeWallet } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import mp from "@/constants/mp";

interface DeriveAddress {
  index: number;
  address: string;
  privateKey: string;
}

export default function Web3ToolPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState(mp.ZeroAddress);
  const [mnemonic, setMnemonic] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // 新增状态：模式切换和直接输入助记词
  const [useMnemonicMode, setUseMnemonicMode] = useState(false);
  const [inputMnemonic, setInputMnemonic] = useState("");
  const [validatedMnemonic, setValidatedMnemonic] = useState(""); // 用于存储验证过的助记词

  const [deriveAddressList, setDeriveAddressList] = useState<DeriveAddress[]>(
    []
  );
  const [deriveIndex, setDeriveIndex] = useState(0);
  const [deriveShowIndex, setDeriveShowIndex] = useState(true);
  const [deriveShowAddress, setDeriveShowAddress] = useState(true);
  const [deriveShowPrivateKey, setDeriveShowPrivateKey] = useState(false);

  // 验证助记词的函数
  const validateMnemonic = (mnemonicText: string) => {
    if (mnemonicText.trim()) {
      try {
        const wallet = HDNodeWallet.fromPhrase(mnemonicText.trim());
        setAddress(wallet.address);
        setMnemonic(mnemonicText.trim());
        setValidatedMnemonic(mnemonicText.trim());
      } catch (error) {
        console.error("无效助记词：", error);
        notifications.show({
          message: "无效助记词",
          color: "red",
        });
        setAddress(mp.ZeroAddress);
        setMnemonic("");
        setValidatedMnemonic("");
      }
    } else {
      setAddress(mp.ZeroAddress);
      setMnemonic("");
      setValidatedMnemonic("");
    }
  };

  useEffect(() => {
    if (useMnemonicMode) {
      // 助记词模式 - 使用已验证的助记词
      if (validatedMnemonic) {
        setAddress(HDNodeWallet.fromPhrase(validatedMnemonic).address);
        setMnemonic(validatedMnemonic);
      } else {
        setAddress(mp.ZeroAddress);
        setMnemonic("");
      }
    } else {
      // 用户名密码模式
      if (username) {
        const danger = mostWallet(
          username,
          password,
          "I know loss mnemonic will lose my wallet."
        );
        setAddress(danger.address);
        setMnemonic(danger.mnemonic);
      } else {
        setAddress(mp.ZeroAddress);
        setMnemonic("");
      }
    }
    setDeriveAddressList([]);
    setDeriveIndex(0);
    setDeriveShowAddress(true);
    setDeriveShowAddress(true);
    setDeriveShowPrivateKey(false);
  }, [username, password, useMnemonicMode, validatedMnemonic]);

  const deriveNumber = 10;

  const deriveAddress = () => {
    const list: DeriveAddress[] = [];
    for (let i = deriveIndex; i < deriveIndex + deriveNumber; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, path);
      list.push({
        index: i,
        address: wallet.address,
        privateKey: wallet.privateKey,
      });
    }
    setDeriveAddressList((prev) => [...prev, ...list]);
    const newIndex = deriveIndex + deriveNumber;
    setDeriveIndex(newIndex);
    notifications.show({ message: `已派生 ${newIndex} 个地址` });
  };

  // 判断是否有有效的钱包信息
  const hasValidWallet = useMnemonicMode
    ? validatedMnemonic && address !== mp.ZeroAddress
    : username;

  return (
    <Container maw={1200} w="100%" mt={64} p={20}>
      <AppHeader title="工具集" />
      <Stack gap="md">
        <Avatar
          size={100}
          radius="sm"
          src={hasValidWallet ? mp.avatar(address) : "/icons/pwa-512x512.png"}
          alt="it's me"
        />

        <Text size="xl">Most Wallet 账户查询</Text>

        <Text c="dimmed">
          开源代码：https://www.npmjs.com/package/@/constants/MostWallet?activeTab=code
        </Text>

        {/* 模式切换开关 */}
        <Switch
          label={useMnemonicMode ? "直接输入助记词" : "用户名+密码生成账户"}
          size="md"
          checked={useMnemonicMode}
          onChange={(event) => {
            setUseMnemonicMode(event.currentTarget.checked);
            // 切换模式时清空相关状态
            setUsername("");
            setPassword("");
            setInputMnemonic("");
            setValidatedMnemonic("");
            setShowAddress(false);
            setShowMnemonic(false);
          }}
        />

        {/* 条件渲染：用户名密码输入或助记词输入 */}
        {!useMnemonicMode ? (
          // 用户名密码模式
          <>
            <Input
              placeholder="请输入用户名"
              maxLength={36}
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              rightSectionPointerEvents="auto"
              rightSection={
                username ? (
                  <Input.ClearButton onClick={() => setUsername("")} />
                ) : undefined
              }
            />

            <Input
              placeholder="请输入密码"
              maxLength={100}
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              rightSectionPointerEvents="auto"
              rightSection={
                password ? (
                  <Input.ClearButton onClick={() => setPassword("")} />
                ) : undefined
              }
            />
          </>
        ) : (
          // 助记词模式
          <>
            <Text c="var(--red)">
              请确保在安全环境中输入助记词，任何拥有您助记词的人都可以控制您的钱包！
            </Text>
            <Textarea
              placeholder="请输入助记词（12或24个单词，用空格分隔）"
              value={inputMnemonic}
              onChange={(e) => setInputMnemonic(e.currentTarget.value)}
              onBlur={(e) => validateMnemonic(e.currentTarget.value)}
              minRows={3}
              maxRows={5}
              autosize
            />
          </>
        )}

        <Button
          color="gray"
          variant="light"
          disabled={!hasValidWallet}
          onClick={() => setShowAddress(!showAddress)}
        >
          {showAddress ? "隐藏二维码" : "显示二维码"}
        </Button>

        {showAddress && (
          <Paper
            p={10}
            withBorder
            style={{
              display: "flex",
              alignSelf: "center",
              backgroundColor: "white",
            }}
          >
            <QRCodeCanvas value={address} size={200} />
          </Paper>
        )}

        <Text size="lg">ETH 地址：{address}</Text>

        <Button
          color="gray"
          onClick={() => setShowMnemonic(!showMnemonic)}
          disabled={!hasValidWallet}
        >
          {showMnemonic ? "隐藏助记词" : "显示助记词"}
        </Button>

        <Paper p="md" bg="red.1" c="var(--red)">
          {showMnemonic
            ? mnemonic ||
              (useMnemonicMode ? "请输入有效的助记词" : "请输入用户名")
            : "任何拥有您助记词的人都可以窃取您账户中的任何资产，切勿泄露！！！"}
        </Paper>

        {showMnemonic && (
          <Paper
            p={10}
            withBorder
            style={{
              display: "flex",
              alignSelf: "center",
              backgroundColor: "white",
            }}
          >
            <QRCodeCanvas value={mnemonic || " "} size={260} />
          </Paper>
        )}

        {showMnemonic && mnemonic && (
          <Stack gap="md" w="100%">
            <Button color="gray" variant="light" onClick={deriveAddress}>
              派生 {deriveNumber} 个地址
            </Button>

            <Text c="var(--red)">
              任何拥有您私钥的人都可以窃取您地址中的任何资产，切勿泄露！！！
            </Text>

            <Table withColumnBorders highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th
                    onClick={() => setDeriveShowIndex(!deriveShowIndex)}
                    style={{ cursor: "pointer" }}
                    w="10%"
                    miw={50}
                  >
                    账户
                  </Table.Th>
                  <Table.Th
                    onClick={() => setDeriveShowAddress(!deriveShowAddress)}
                    style={{ cursor: "pointer" }}
                    w="40%"
                  >
                    地址
                  </Table.Th>
                  <Table.Th
                    onClick={() =>
                      setDeriveShowPrivateKey(!deriveShowPrivateKey)
                    }
                    style={{ cursor: "pointer", color: "var(--red)" }}
                    w="50%"
                  >
                    私钥（点击{deriveShowPrivateKey ? "隐藏" : "显示"}）
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {deriveAddressList.map((item) => (
                  <Table.Tr key={item.index}>
                    <Table.Td>{deriveShowIndex ? item.index + 1 : ""}</Table.Td>
                    <Table.Td>{deriveShowAddress ? item.address : ""}</Table.Td>
                    <Table.Td style={{ color: "var(--red)" }}>
                      {deriveShowPrivateKey ? item.privateKey : ""}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
