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
  Group,
} from "@mantine/core";
import { useState } from "react";
import {
  uploadToCrust,
  uploadWithAuthHeader,
  createCrustAuthHeader,
  uploadToIpfsGateway,
  placeStorageOrder,
} from "@/utils/crust";
import { notifications } from "@mantine/notifications";
import { useSignMessage } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { mnemonicToAccount } from "viem/accounts";

export default function PageDemo() {
  const wallet = useUserStore((state) => state.wallet);
  const { address, isConnected } = useAppKitAccount();
  const { mutateAsync: signMessageAsync } = useSignMessage();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cid, setCid] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [useCru, setUseCru] = useState(false);
  const balance = useUserStore((state) => state.balance);

  const handlePlaceOrder = async () => {
    if (!cid || !fileSize) {
      notifications.show({
        message: "没有可用的 CID 或文件大小信息",
        color: "red",
      });
      return;
    }

    try {
      setUploading(true);
      setTxHash("");

      // 1. 确定用于 CRU 交易的种子
      const crust_mnemonic = wallet?.crust_mnemonic;
      if (!crust_mnemonic) {
        notifications.show({
          message: "要使用 CRU 支付，您必须登录并拥有有效的 Crust 助记词。",
          color: "red",
        });
        setUploading(false);
        return;
      }

      notifications.show({
        message: "正在下存储订单...",
        color: "blue",
      });

      // 2. 在 Crust 网络上下存储订单
      const tx = await placeStorageOrder(cid, fileSize, crust_mnemonic);
      setTxHash(tx);
      notifications.show({
        message: "存储订单下单成功！",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      notifications.show({
        message: "下单失败: " + (error as Error).message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

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
      setFileSize(0);
      let resultCid = "";

      // ---------------------------------------------------------
      // 场景 A: 仅上传到 IPFS 网关 (为后续下单做准备)
      // ---------------------------------------------------------
      if (useCru) {
        // 1. 向 IPFS 网关认证
        let authHeader = "";
        if (wallet?.mnemonic) {
          const account = mnemonicToAccount(wallet.mnemonic);
          const sig = await account.signMessage({ message: account.address });
          authHeader = createCrustAuthHeader(account.address, sig);
        } else if (isConnected && address) {
          const sig = await signMessageAsync({ message: address });
          authHeader = createCrustAuthHeader(address, sig);
        } else {
          notifications.show({
            message: "请连接钱包（本地或 EVM）以授权 IPFS 上传。",
            color: "red",
          });
          setUploading(false);
          return;
        }

        // 2. 上传到 IPFS 网关 (暂不 Pin)
        const uploadResult = await uploadToIpfsGateway(file, authHeader);
        resultCid = uploadResult.cid;
        setCid(resultCid);
        setFileSize(uploadResult.size);

        notifications.show({
          message: "文件已上传至 IPFS。请点击“下单”按钮进行存储。",
          color: "blue",
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
          bg="var(--message-background)"
          style={{ borderRadius: 8 }}
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
            <Text size="xs" c={parseFloat(balance) < 0.001 ? "red" : "dimmed"}>
              当前余额: {balance}
              {parseFloat(balance) < 0.001 && "(余额不足，请充值)"}
            </Text>
          )}
        </Stack>

        <Button
          onClick={handleUpload}
          loading={uploading}
          disabled={!canUpload}
        >
          {useCru
            ? "上传到 IPFS"
            : wallet?.mnemonic
              ? "使用本地钱包上传"
              : isConnected
                ? "使用连接的钱包上传"
                : "连接钱包以上传"}
        </Button>

        {useCru && cid && (
          <Button onClick={handlePlaceOrder} loading={uploading} color="orange">
            下单存储 (支付 CRU)
          </Button>
        )}

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
