"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  ActionIcon,
  Group,
  useMantineColorScheme,
  Anchor,
  Avatar,
  Badge,
  Button,
  TextInput,
  Text,
  Container,
  Stack,
} from "@mantine/core";
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconAt,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import Link from "next/link";
import mp from "@/utils/mp";
import { Icon } from "@/components/Icon";
import { useUserStore } from "@/stores/userStore";
import { useDotStore } from "@/stores/dotStore";
import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  type Address,
  formatEther,
} from "viem";
import { useWalletClient } from "wagmi";
import { mnemonicToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/utils/dot";
import { openDotManager } from "@/components/DotManager/open";

const UserName = () => {
  const { data: walletClientFromWagmi } = useWalletClient();
  const wallet = useUserStore((state) => state.wallet);
  const RPC = useDotStore((state) => state.RPC);
  const network = useDotStore((state) => state.network);
  const chain = network === "mainnet" ? base : baseSepolia;

  const [currentName, setCurrentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingSet, setLoadingSet] = useState(false);

  const fetchName = async () => {
    if (!wallet) return;
    try {
      setLoadingGet(true);
      const client = createPublicClient({
        chain,
        transport: http(RPC),
      });
      const contract = getContract({
        address: CONTRACT_ADDRESS_NAME as Address,
        abi: CONTRACT_ABI_NAME,
        client,
      });
      const name = (await contract.read.getName([wallet.address])) as string;
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

  const onSetName = async () => {
    if (!wallet)
      return notifications.show({ message: "请先登录", color: "red" });
    const value = nameInput.trim();
    if (!value)
      return notifications.show({ message: "请输入用户名", color: "yellow" });
    if (value.length < 1)
      return notifications.show({
        message: "用户名太短（至少1个字符）",
        color: "yellow",
      });
    if (value.length > 32)
      return notifications.show({
        message: "用户名太长（最多32个字符）",
        color: "yellow",
      });

    let account: any;
    let walletClient: any;

    const client = createPublicClient({
      chain,
      transport: http(RPC),
    });

    if (wallet.mnemonic) {
      account = mnemonicToAccount(wallet.mnemonic);
      walletClient = createWalletClient({
        account,
        chain,
        transport: http(RPC),
      });
    } else {
      if (!walletClientFromWagmi) {
        return notifications.show({ message: "请连接钱包", color: "red" });
      }
      account = wallet.address as Address;
      walletClient = walletClientFromWagmi;
    }

    try {
      setLoadingSet(true);
      // 交易前检查余额是否足够支付 Gas（运行时估算）
      const balance = await client.getBalance({
        address: wallet.address as Address,
      });
      const gasPrice = await client.getGasPrice();

      if (gasPrice) {
        let gas: bigint = 0n;
        try {
          gas = await client.estimateContractGas({
            address: CONTRACT_ADDRESS_NAME as Address,
            abi: CONTRACT_ABI_NAME,
            functionName: "setName",
            args: [value],
            account,
          });
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

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS_NAME as Address,
        abi: CONTRACT_ABI_NAME,
        functionName: "setName",
        args: [value],
        account,
      });
      notifications.show({ message: "交易已提交，等待确认…", color: "blue" });
      await client.waitForTransactionReceipt({ hash });
      notifications.show({ message: "设置成功", color: "green" });
      setCurrentName(value);
      // fetchName();
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

  const uid = currentName + "-" + wallet?.address?.slice(-3).toUpperCase();

  return (
    <Stack>
      <Text>地址 {wallet?.address || mp.zeroAddress}</Text>
      <Avatar
        size={100}
        radius="lg"
        src={mp.avatar(wallet?.address)}
        alt="头像"
        style={{
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
      />

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
        leftSection={<IconAt size={16} />}
        variant="filled"
        placeholder="请输入新用户名"
        value={nameInput}
        onChange={(e) => setNameInput(e.currentTarget.value)}
        maxLength={32}
        disabled={loadingSet}
      />

      <Group>
        <Button
          loading={loadingSet}
          onClick={confirmSetName}
          disabled={!nameInput || !wallet || currentName === nameInput}
          size="sm"
        >
          上链
        </Button>
      </Group>
      {currentName && (
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href={`https://most.box/@${uid}/`}
          target="_blank"
        >
          主页 most.box/@{uid}
        </Anchor>
      )}
    </Stack>
  );
};

const UserDot = () => {
  const { data: walletClientFromWagmi } = useWalletClient();
  const wallet = useUserStore((state) => state.wallet);
  const RPC = useDotStore((state) => state.RPC);
  const dotAPI = useDotStore((state) => state.dotAPI);
  const network = useDotStore((state) => state.network);
  const chain = network === "mainnet" ? base : baseSepolia;

  const [loadingSetData, setLoadingSetData] = useState(false);
  const [currentDot, setCurrentDot] = useState("");

  // 读取链上数据
  const fetchData = async () => {
    if (!wallet) return;
    try {
      const client = createPublicClient({
        chain,
        transport: http(RPC),
      });
      const contract = getContract({
        address: CONTRACT_ADDRESS_NAME as Address,
        abi: CONTRACT_ABI_NAME,
        client,
      });
      const str = (await contract.read.getDot([wallet.address])) as string;
      setCurrentDot(str || "");
    } catch (err) {
      console.warn("获取用户数据失败", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [wallet]);

  const onSetDot = async () => {
    if (!wallet) {
      return notifications.show({ message: "请先登录", color: "red" });
    }

    let account: any;
    let walletClient: any;

    const client = createPublicClient({
      chain,
      transport: http(RPC),
    });

    if (wallet.mnemonic) {
      account = mnemonicToAccount(wallet.mnemonic);
      walletClient = createWalletClient({
        account,
        chain,
        transport: http(RPC),
      });
    } else {
      if (!walletClientFromWagmi) {
        return notifications.show({ message: "请连接钱包", color: "red" });
      }
      account = wallet.address as Address;
      walletClient = walletClientFromWagmi;
    }

    try {
      setLoadingSetData(true);
      // 交易前检查余额是否足够支付 Gas（运行时估算）
      const balance = await client.getBalance({
        address: wallet.address as Address,
      });
      const gasPrice = await client.getGasPrice();

      if (gasPrice) {
        let gas: bigint = 0n;
        try {
          gas = await client.estimateContractGas({
            address: CONTRACT_ADDRESS_NAME as Address,
            abi: CONTRACT_ABI_NAME,
            functionName: "setDot",
            args: [dotAPI],
            account,
          });
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

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS_NAME as Address,
        abi: CONTRACT_ABI_NAME,
        functionName: "setDot",
        args: [dotAPI],
        account,
      });
      notifications.show({
        message: "交易已提交，等待确认…",
        color: "blue",
      });
      await client.waitForTransactionReceipt({ hash });
      notifications.show({ message: "设置成功", color: "green" });
      setCurrentDot(dotAPI);
    } catch (err: any) {
      console.warn(err);
      notifications.show({
        message: err?.shortMessage || err?.message || "设置失败",
        color: "red",
      });
    } finally {
      setLoadingSetData(false);
    }
  };

  return (
    <Stack>
      <Text>用户数据</Text>

      <TextInput
        description="我的节点"
        leftSection={<Icon name="Earth" size={16} />}
        variant="filled"
        placeholder="请设置我的节点"
        value={currentDot}
        disabled
      />

      <Group align="flex-end">
        <TextInput
          flex={1}
          description="当前节点"
          leftSection={<Icon name="Earth" size={16} />}
          variant="filled"
          value={dotAPI}
          readOnly
        />

        <Button onClick={openDotManager}>选择节点</Button>
      </Group>

      <Group>
        <Button
          size="sm"
          loading={loadingSetData}
          onClick={onSetDot}
          disabled={!wallet || !dotAPI || currentDot === dotAPI}
        >
          设为我的节点
        </Button>
      </Group>
    </Stack>
  );
};

const ThemeSwitcher = () => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

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

export default function PageSetting() {
  const Explorer = useDotStore((state) => state.Explorer);
  return (
    <Container py={20} w="100%">
      <AppHeader title="设置" />
      <Stack>
        <ThemeSwitcher />
        <UserName />
        <UserDot />
        <Group>
          <Anchor
            size="sm"
            c="blue"
            component={Link}
            href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
            target="_blank"
          >
            合约地址 {mp.formatAddress(CONTRACT_ADDRESS_NAME)}
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
