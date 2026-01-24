"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import {
  Container,
  FileInput,
  Button,
  Stack,
  Text,
  Code,
  Switch,
  PasswordInput,
  Group,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  uploadToCrust,
  uploadWithAuthHeader,
  createCrustAuthHeader,
  uploadToIpfsGateway,
  placeStorageOrder,
} from "@/utils/crust";
import { notifications } from "@mantine/notifications";
import { useAccount, useSignMessage } from "wagmi";
import { mnemonicToAccount } from "viem/accounts";

export default function PageDemo() {
  const wallet = useUserStore((state) => state.wallet);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cid, setCid] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  // CRU 支付状态
  const [useCru, setUseCru] = useState(false);
  const [cruSeed, setCruSeed] = useState("");

  useEffect(() => {
    if (wallet) {
      console.log(wallet);
    }
  }, [wallet]);

  const handleUpload = async () => {
    if (!file) {
      notifications.show({
        message: "请选择一个文件",
        color: "red",
      });
      return;
    }

    try {
      setUploading(true);
      setCid("");
      setTxHash("");
      let resultCid = "";

      // ---------------------------------------------------------
      // 场景 A: 使用 CRU 支付 (链上订单)
      // ---------------------------------------------------------
      if (useCru) {
        // 1. 确定用于 CRU 交易的种子
        const seedToUse = cruSeed || wallet?.mnemonic;
        if (!seedToUse) {
          notifications.show({
            message:
              "要使用 CRU 支付，您必须提供 Crust/Polkadot 种子或拥有本地钱包助记词。",
            color: "red",
          });
          setUploading(false);
          return;
        }

        // 2. 向 IPFS 网关认证 (先上传文件)
        let authHeader = "";
        if (wallet?.mnemonic) {
          const account = mnemonicToAccount(wallet.mnemonic);
          const sig = await account.signMessage({ message: account.address });
          authHeader = createCrustAuthHeader(account.address, sig);
        } else if (isConnected && address) {
          const sig = await signMessageAsync({ message: address });
          authHeader = createCrustAuthHeader(address, sig);
        } else {
          // 如果没有连接钱包，甚至无法上传到网关获取 CID。
          // (除非我们使用公共网关，为了可靠性我们坚持使用认证网关)
          notifications.show({
            message: "请连接钱包（本地或 EVM）以授权 IPFS 上传。",
            color: "red",
          });
          setUploading(false);
          return;
        }

        // 3. 上传到 IPFS 网关 (暂不 Pin)
        const uploadResult = await uploadToIpfsGateway(file, authHeader);
        resultCid = uploadResult.cid;
        setCid(resultCid);

        notifications.show({
          message: "文件已上传至 IPFS。正在下存储订单...",
          color: "blue",
        });

        // 4. 在 Crust 网络上下存储订单
        const tx = await placeStorageOrder(
          resultCid,
          uploadResult.size,
          seedToUse,
        );
        setTxHash(tx);
        notifications.show({
          message: "存储订单下单成功！",
          color: "green",
        });
      }
      // ---------------------------------------------------------
      // 场景 B: 标准网关 Pinning (免费 / 赞助)
      // ---------------------------------------------------------
      else {
        let result;
        // 情况 1: 如果可用，使用本地助记词
        if (wallet?.mnemonic) {
          result = await uploadToCrust(file, wallet.mnemonic);
        }
        // 情况 2: 使用 Reown/Web3Model 连接的钱包
        else if (isConnected && address) {
          // 使用连接的钱包签名消息
          const signature = await signMessageAsync({ message: address });
          // 创建认证头
          const authHeader = createCrustAuthHeader(address, signature);
          // 使用预计算的头上传
          result = await uploadWithAuthHeader(file, authHeader);
        } else {
          notifications.show({
            message: "请登录（恢复助记词）或连接钱包以上传",
            color: "red",
          });
          setUploading(false);
          return;
        }

        resultCid = result.cid;
        setCid(resultCid);
        notifications.show({
          message: "上传并 Pin 成功！",
          color: "green",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "上传失败: " + (error as Error).message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const canUpload = !!file && (!!wallet?.mnemonic || isConnected);

  return (
    <Container py={20}>
      <AppHeader title="demo" />
      <Stack mt="xl">
        <Text fw={700}>Crust 文件上传演示</Text>
        <FileInput
          placeholder="选择文件"
          label="上传的文件"
          value={file}
          onChange={setFile}
        />

        <Stack
          gap="xs"
          p="md"
          style={{
            borderRadius: 8,
            border: "1px solid var(--red)",
          }}
        >
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              存储选项
            </Text>
            <Switch
              label="使用 CRU 支付 (链上订单)"
              checked={useCru}
              onChange={(event) => setUseCru(event.currentTarget.checked)}
            />
          </Group>

          {useCru && (
            <PasswordInput
              label="Crust/Polkadot 种子 (可选)"
              placeholder={
                wallet?.mnemonic ? "使用本地钱包助记词" : "输入种子/助记词"
              }
              value={cruSeed}
              onChange={(e) => setCruSeed(e.currentTarget.value)}
              description="如果可用，留空以使用本地钱包助记词。"
            />
          )}
        </Stack>

        <Button
          onClick={handleUpload}
          loading={uploading}
          disabled={!canUpload && !cruSeed}
        >
          {useCru
            ? "上传并下单 (CRU)"
            : wallet?.mnemonic
              ? "使用本地钱包上传"
              : isConnected
                ? "使用连接的钱包上传"
                : "连接钱包以上传"}
        </Button>

        {cid && (
          <Stack gap="xs">
            <Text size="sm">上传 CID:</Text>
            <Code block>{cid}</Code>
            {txHash ? (
              <>
                <Text size="sm">存储订单交易:</Text>
                <Code block>{txHash}</Code>
                <Text size="sm" c="green">
                  文件已在 Crust 网络下单！
                </Text>
              </>
            ) : (
              <Text size="sm" c="dimmed">
                文件现已 Pin 在 Crust 网络上。
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
