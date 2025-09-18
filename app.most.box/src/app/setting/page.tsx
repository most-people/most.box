"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  ActionIcon,
  Anchor,
  Group,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconAt,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  Text,
  Container,
  Space,
  TextInput,
  Button,
  Stack,
  Badge,
} from "@mantine/core";

import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { useUserStore } from "@/stores/userStore";
import { Contract, JsonRpcProvider, HDNodeWallet } from "ethers";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import Link from "next/link";
import mp from "@/constants/mp";

const ThemeSwitcher = () => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  const [mounted, setMounted] = useState(false);
  // 只在客户端渲染后显示组件
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在服务器端或客户端首次渲染时返回null，避免hydration不匹配
  if (!mounted) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Text>主题</Text>
      <Group gap="xs">
        <ActionIcon
          onClick={() => setColorScheme("auto")}
          variant={colorScheme === "auto" ? "filled" : "default"}
          size="lg"
          aria-label="跟随系统"
        >
          <IconDeviceDesktop size={18} />
        </ActionIcon>

        <ActionIcon
          onClick={() => setColorScheme("light")}
          variant={colorScheme === "light" ? "filled" : "default"}
          size="lg"
          aria-label="亮色主题"
          color={colorScheme === "light" ? "yellow" : "gray"}
        >
          <IconSun size={18} />
        </ActionIcon>

        <ActionIcon
          onClick={() => setColorScheme("dark")}
          variant={colorScheme === "dark" ? "filled" : "default"}
          size="lg"
          aria-label="暗色主题"
          color={colorScheme === "dark" ? "blue" : "gray"}
        >
          <IconMoon size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
};

const UserName = () => {
  const wallet = useUserStore((state) => state.wallet);

  const [currentName, setCurrentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingSet, setLoadingSet] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const RPC = NETWORK_CONFIG["mainnet"].rpc;
  const Explorer = NETWORK_CONFIG["mainnet"].explorer;

  const provider = useMemo(() => new JsonRpcProvider(RPC), [RPC]);
  const contract = useMemo(
    () => new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, provider),
    [provider]
  );

  const fetchName = async () => {
    if (!wallet) return;
    try {
      setLoadingGet(true);
      const name: string = await contract.getName(wallet.address);
      setCurrentName(name);
      if (!nameInput && name) setNameInput(name);
    } catch (err) {
      console.warn("获取用户名失败", err);
    } finally {
      setLoadingGet(false);
    }
  };

  useEffect(() => {
    fetchName();
  }, [wallet]);

  // 获取可用的 Signer
  const getSigner = () => {
    try {
      if (wallet?.mnemonic) {
        const signer = HDNodeWallet.fromPhrase(wallet.mnemonic).connect(
          provider
        );
        return new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, signer);
      }
      return null;
    } catch (err) {
      console.warn("获取签名器失败", err);
      return null;
    }
  };

  const onSetName = async () => {
    if (!wallet)
      return notifications.show({ message: "请先登录", color: "red" });
    const value = nameInput.trim();
    if (!value)
      return notifications.show({ message: "请输入用户名", color: "yellow" });
    if (value.length < 1)
      return notifications.show({
        message: "用户名太短（至少3个字符）",
        color: "yellow",
      });
    if (value.length > 32)
      return notifications.show({
        message: "用户名太长（最多36个字符）",
        color: "yellow",
      });

    const signer = getSigner();
    if (!signer) {
      notifications.show({
        message: "未检测到可用钱包，无法发起交易。请安装钱包或使用助记词登录。",
        color: "red",
      });
      return;
    }
    try {
      setLoadingSet(true);
      // 交易前检查余额是否足够支付 Gas（运行时估算）
      const [balance, fee] = await Promise.all([
        provider.getBalance(wallet.address),
        provider.getFeeData(),
      ]);
      const gasPrice = fee.maxFeePerGas ?? fee.gasPrice;
      if (gasPrice) {
        let gas: bigint = 0n;
        try {
          gas = await (signer as any).estimateGas.setName(value);
        } catch {
          // 无法估算时，继续交由链上处理
        }
        if (gas > 0n) {
          const cost = gas * gasPrice;
          if (balance < cost) {
            notifications.show({
              message: "余额不足以支付 Gas，请先充值",
              color: "red",
            });
            throw new Error("余额不足以支付 Gas，请先充值");
          }
        }
      }

      const tx = await (signer as any).setName(value);
      notifications.show({ message: "交易已提交，等待确认…", color: "blue" });
      await tx.wait();
      notifications.show({ message: "设置成功", color: "green" });
      setCurrentName(value);
      fetchName();
    } catch (err: any) {
      console.warn(err);
      notifications.show({
        message: err?.shortMessage || err?.message || "设置失败",
        color: "red",
      });
    } finally {
      setLoadingSet(false);
    }
  };

  const onDeleteName = async () => {
    if (!wallet)
      return notifications.show({ message: "请先登录", color: "red" });
    if (!currentName)
      return notifications.show({
        message: "当前未设置用户名",
        color: "yellow",
      });

    const signer = getSigner();
    if (!signer) {
      notifications.show({
        message: "未检测到可用钱包，无法发起交易。请安装钱包或使用助记词登录。",
        color: "red",
      });
      return;
    }

    try {
      setLoadingDelete(true);
      // 交易前检查余额是否足够支付 Gas（运行时估算）
      const [balance, fee] = await Promise.all([
        provider.getBalance(wallet.address),
        provider.getFeeData(),
      ]);
      const gasPrice = fee.maxFeePerGas ?? fee.gasPrice;
      if (gasPrice) {
        let gas: bigint = 0n;
        try {
          gas = await (signer as any).estimateGas.deleteName();
        } catch {
          // 无法估算时，继续交由链上处理
        }
        if (gas > 0n) {
          const cost = gas * gasPrice;
          if (balance < cost) {
            notifications.show({
              message: "余额不足以支付 Gas，请先充值",
              color: "red",
            });
            throw new Error("余额不足以支付 Gas，请先充值");
          }
        }
      }

      const tx = await (signer as any).deleteName();
      notifications.show({ message: "交易已提交，等待确认…", color: "blue" });
      await tx.wait();
      notifications.show({ message: "删除成功", color: "green" });
      setCurrentName("");
      setNameInput("");
      fetchName();
    } catch (err: any) {
      console.warn(err);
      notifications.show({
        message: err?.shortMessage || err?.message || "删除失败",
        color: "red",
      });
    } finally {
      setLoadingDelete(false);
    }
  };

  // 二次确认：保存用户名
  const confirmSetName = () => {
    modals.openConfirmModal({
      centered: true,
      title: "确认操作",
      children: <Text c="dimmed">是否继续保存用户名？</Text>,
      labels: { confirm: "继续", cancel: "取消" },
      onConfirm: onSetName,
    });
  };

  // 二次确认：删除用户名
  const confirmDeleteName = () => {
    modals.openConfirmModal({
      centered: true,
      title: "确认操作",
      children: <Text c="dimmed">是否继续删除用户名？</Text>,
      labels: { confirm: "继续", cancel: "取消" },
      onConfirm: onDeleteName,
    });
  };
  return (
    <Stack>
      <Group align="center" gap="xs">
        <Text>用户名</Text>
        {loadingGet ? (
          <Badge variant="light" color="gray">
            加载中
          </Badge>
        ) : currentName ? (
          <Badge style={{ cursor: "pointer" }} variant="light" color="blue">
            {currentName}
          </Badge>
        ) : (
          <Badge variant="light" color="gray">
            {"未设置"}
          </Badge>
        )}
      </Group>

      <TextInput
        description="链上唯一，可修改或删除"
        leftSection={<IconAt size={16} />}
        variant="filled"
        placeholder="请输入新用户名"
        value={nameInput}
        onChange={(e) => setNameInput(e.currentTarget.value)}
        maxLength={32}
        disabled={loadingSet || loadingDelete}
      />

      <Group>
        <Button
          loading={loadingSet}
          onClick={confirmSetName}
          disabled={!wallet || currentName === nameInput}
          size="sm"
        >
          上链
        </Button>
        <Button
          variant="light"
          loading={loadingDelete}
          onClick={confirmDeleteName}
          disabled={!wallet || !currentName}
          size="sm"
        >
          删除
        </Button>
      </Group>

      <Anchor
        size="sm"
        c="blue"
        component={Link}
        href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
        target="_blank"
      >
        合约地址 {mp.formatAddress(CONTRACT_ADDRESS_NAME)}
      </Anchor>
      <Anchor
        size="sm"
        c="blue"
        component={Link}
        href={"/@" + currentName}
        target="_blank"
      >
        个人主页 {location.host}/@{currentName}
      </Anchor>
    </Stack>
  );
};

export default function PageSetting() {
  return (
    <Container py={20}>
      <AppHeader title="设置" />
      <Stack gap={20}>
        <ThemeSwitcher />
        <UserName />
      </Stack>
    </Container>
  );
}
