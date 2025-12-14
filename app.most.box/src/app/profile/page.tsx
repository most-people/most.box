"use client";

import { AppHeader } from "@/components/AppHeader";
import { Anchor, Avatar, Group } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import {
  Text,
  Container,
  TextInput,
  Button,
  Stack,
  Badge,
} from "@mantine/core";

import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/constants/dot";
import { useUserStore } from "@/stores/userStore";
import { Contract, JsonRpcProvider, HDNodeWallet } from "ethers";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import Link from "next/link";
import mp from "@/constants/mp";
import { Icon } from "@/components/Icon";
import { IconAbc, IconAt } from "@tabler/icons-react";
import { useDotStore } from "@/stores/dotStore";
import { mostEncode } from "@/constants/MostWallet";
import { api } from "@/constants/api";
import { CID } from "multiformats";

const UserName = () => {
  const wallet = useUserStore((state) => state.wallet);
  const RPC = useDotStore((state) => state.RPC);

  const [currentName, setCurrentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loadingGet, setLoadingGet] = useState(false);
  const [loadingSet, setLoadingSet] = useState(false);

  const fetchName = async () => {
    if (!wallet) return;
    try {
      setLoadingGet(true);
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );
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

    const provider = new JsonRpcProvider(RPC);
    const signer = HDNodeWallet.fromPhrase(wallet.mnemonic).connect(provider);
    const contract = new Contract(
      CONTRACT_ADDRESS_NAME,
      CONTRACT_ABI_NAME,
      signer
    );

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
          gas = await contract.setName.estimateGas(value);
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

      const tx = await contract.setName(value);
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

  return (
    <Stack>
      <Avatar
        size={100}
        radius="lg"
        src={mp.avatar(wallet?.address)}
        alt="头像"
        style={{
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
      />
      <Text>{wallet?.address || mp.ZeroAddress}</Text>

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
          href={`https://most.box/@${currentName}/`}
          target="_blank"
        >
          个人主页 most.box/@{currentName}
        </Anchor>
      )}
    </Stack>
  );
};

const UserRootCID = () => {
  const setItem = useUserStore((state) => state.setItem);
  const wallet = useUserStore((state) => state.wallet);
  const rootCID = useUserStore((state) => state.rootCID);
  const [customCID, setCustomCID] = useState("");
  const [loading, setLoading] = useState(false);

  // 校验 CID 是否有效（支持 v0/v1），使用 multiformats 解析
  const isValidCID = (cid: string): boolean => {
    try {
      CID.parse(cid.trim().split("?")[0]);
      return true;
    } catch {
      return false;
    }
  };

  // 设置根目录 CID
  const setRootCID = async () => {
    if (!isValidCID(customCID)) {
      return notifications.show({
        message: "无效的 CID",
        color: "red",
      });
    }
    if (wallet) {
      try {
        setLoading(true);
        const { RPC } = useDotStore.getState();
        const provider = new JsonRpcProvider(RPC);
        const signer = HDNodeWallet.fromPhrase(wallet.mnemonic).connect(
          provider
        );
        const contract = new Contract(
          CONTRACT_ADDRESS_NAME,
          CONTRACT_ABI_NAME,
          signer
        );
        const encodeCID = mostEncode(
          customCID,
          wallet.public_key,
          wallet.private_key
        );
        const tx = await contract.setCID(encodeCID);
        notifications.show({ message: "交易已提交，等待确认…", color: "blue" });
        await tx.wait();
        notifications.show({ message: "设置成功", color: "green" });
        setItem("rootCID", encodeCID);
      } catch (err: any) {
        console.warn(err);
        notifications.show({
          message: err?.shortMessage || err?.message || "设置失败",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const getRootCID = async () => {
    const res = await api.post("/files.root.cid");
    const cid = res.data;
    if (cid) {
      setCustomCID(cid);
    }
  };

  return (
    <Stack>
      <Text>根目录 CID「自动加密」</Text>

      <TextInput
        description="链上 CID"
        leftSection={<IconAbc size={16} />}
        variant="filled"
        placeholder="请设置"
        disabled
        value={rootCID}
      />
      <Group align="flex-start">
        <TextInput
          flex={1}
          description="当前 CID"
          leftSection={<IconAbc size={16} />}
          variant="filled"
          placeholder="自定义"
          value={customCID}
          onChange={(e) => setCustomCID(e.currentTarget.value)}
          error={
            customCID && !isValidCID(customCID) ? "请输入有效的 CID" : undefined
          }
        />
        <Button mt="21.8px" onClick={getRootCID}>
          获取当前
        </Button>
      </Group>
      <Group>
        <Button
          size="sm"
          loading={loading}
          onClick={setRootCID}
          disabled={!wallet || !isValidCID(customCID) || rootCID === customCID}
        >
          设为根目录 CID
        </Button>
      </Group>
    </Stack>
  );
};

const UserData = () => {
  const wallet = useUserStore((state) => state.wallet);
  const RPC = useDotStore((state) => state.RPC);
  const dotAPI = useDotStore((state) => state.dotAPI);
  const [loadingSetData, setLoadingSetData] = useState(false);
  const [currentData, setCurrentData] = useState("");

  // 读取链上数据
  const fetchData = async () => {
    if (!wallet) return;
    try {
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );
      const str = await contract.getData(wallet.address);
      setCurrentData(str || "");
    } catch (err) {
      console.warn("获取用户数据失败", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [wallet]);

  // 解析链上 JSON 的 dot 地址
  const currentDot = useMemo(() => {
    if (!currentData) return "";
    try {
      const data = JSON.parse(currentData);
      if (data?.dot) {
        return data.dot;
      }
    } catch {}
    return "";
  }, [currentData]);

  const onSetData = async () => {
    if (!wallet) {
      return notifications.show({ message: "请先登录", color: "red" });
    }

    const provider = new JsonRpcProvider(RPC);
    const signer = HDNodeWallet.fromPhrase(wallet.mnemonic).connect(provider);
    const contract = new Contract(
      CONTRACT_ADDRESS_NAME,
      CONTRACT_ABI_NAME,
      signer
    );

    const data = JSON.stringify({ dot: dotAPI });

    try {
      setLoadingSetData(true);
      // 交易前检查余额是否足够支付 Gas（运行时估算）
      const [balance, fee] = await Promise.all([
        provider.getBalance(wallet.address),
        provider.getFeeData(),
      ]);
      const gasPrice = fee.maxFeePerGas ?? fee.gasPrice;
      if (gasPrice) {
        let gas: bigint = 0n;
        try {
          gas = await contract.setData.estimateGas(data);
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

      const tx = await contract.setData(data);
      notifications.show({
        message: "交易已提交，等待确认…",
        color: "blue",
      });
      await tx.wait();
      notifications.show({ message: "设置成功", color: "green" });
      setCurrentData(data);
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
        description="推荐节点"
        leftSection={<Icon name="Earth" size={16} />}
        variant="filled"
        placeholder="请设置推荐节点"
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

        <Button component={Link} href={"/dot/?back"}>
          切换节点
        </Button>
      </Group>

      <Group>
        <Button
          size="sm"
          loading={loadingSetData}
          onClick={onSetData}
          disabled={!wallet || !dotAPI || currentDot === dotAPI}
        >
          设为推荐节点
        </Button>
      </Group>
    </Stack>
  );
};

export default function PageProfile() {
  const Explorer = useDotStore((state) => state.Explorer);
  return (
    <Container p="md" w="100%">
      <AppHeader title="个人资料" />
      <Stack>
        <UserName />
        <UserData />
        <UserRootCID />
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
