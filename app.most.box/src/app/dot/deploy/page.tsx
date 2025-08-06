"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Anchor, Blockquote, Button, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BrowserProvider, getAddress } from "ethers";
import { useRouter } from "next/navigation";
import { IconInfoCircle } from "@tabler/icons-react";
import axios from "axios";
import Link from "next/link";

const SignMessage = ({ dotApi }: { dotApi: string }) => {
  const router = useRouter();
  const [signLoading, setSignLoading] = useState(false);

  const deploy = async (token: string) => {
    try {
      const res = await axios({
        method: "put",
        url: dotApi + "/api.deploy",
        headers: {
          Authorization: token,
        },
      });
      if (res.data?.ok) {
        notifications.show({
          color: "green",
          title: "提示",
          message: "部署成功",
        });
        router.back();
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        color: "red",
        title: "提示",
        message: "部署失败",
      });
    }
  };
  const sign = async () => {
    const message = Date.now().toString();

    // @ts-expect-error window.ethereum
    const ethereum = window.ethereum;
    if (ethereum) {
      try {
        setSignLoading(true);
        const ethersProvider = new BrowserProvider(ethereum);
        const signer = await ethersProvider.getSigner();
        const signature = await signer.signMessage(message);
        const token = [signer.address, message, signature].join(".");
        await deploy(token);
      } catch {
        notifications.show({
          color: "red",
          title: "提示",
          message: "签名失败",
        });
      } finally {
        setSignLoading(false);
      }
    }
  };
  return (
    <>
      <Button
        variant="gradient"
        loading={signLoading}
        loaderProps={{ type: "dots" }}
        onClick={sign}
      >
        签名部署
      </Button>
    </>
  );
};

export default function PageDeploy() {
  const router = useRouter();
  const [connectLoading, setConnectLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [dotAddress, setDotAddress] = useState("");
  const [dotApi, setDotApi] = useState("");
  const [dotDeploy, setDotDeploy] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const address = query.get("address");
    const api = query.get("api");
    if (address && api) {
      setDotAddress(address);
      setDotApi(api);
      setDotDeploy(api + window.location.pathname + window.location.search);
    } else {
      router.back();
    }
  }, []);

  const disconnect = () => {
    notifications.show({
      title: "提示",
      message: "请在钱包插件中切换账号",
    });
  };

  // 连接钱包地址
  const connect = async () => {
    // @ts-expect-error window.ethereum
    const ethereum = window.ethereum;
    if (ethereum) {
      try {
        setConnectLoading(true);
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        if (accounts && accounts.length > 0) {
          const account = getAddress(accounts[0]);
          setAddress(account);
        }
      } catch (error) {
        notifications.show({
          title: "提示",
          message: (error as Error).message || "连接失败",
        });
      } finally {
        setConnectLoading(false);
      }
    } else {
      notifications.show({ title: "提示", message: "请先安装 OKX Wallet" });
    }
    return null;
  };

  // 监听钱包地址变化
  const initAccount = async () => {
    // @ts-expect-error window.ethereum
    const ethereum = window?.ethereum;
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const account = getAddress(accounts[0]);
          setAddress(account);
        } else {
          setAddress("");
        }
      });
    }
  };

  useEffect(() => {
    initAccount();
  }, []);
  return (
    <Stack>
      <AppHeader title="更新节点代码" />
      <Blockquote icon={<IconInfoCircle />} mt="xl">
        节点地址：
        <Anchor component={Link} href={dotDeploy} target="_blank">
          {dotApi}
        </Anchor>
      </Blockquote>

      {address ? (
        <Button variant="default" onClick={disconnect}>
          {address}
        </Button>
      ) : (
        <Button
          variant="default"
          loading={connectLoading}
          loaderProps={{ type: "dots" }}
          onClick={connect}
        >
          连接钱包
        </Button>
      )}
      {address && (
        <>
          {dotApi && dotAddress === address ? (
            <SignMessage dotApi={dotApi} />
          ) : (
            <Blockquote
              color="gray"
              cite="most-people.com"
              icon={<IconInfoCircle />}
              mt="xl"
            >
              请连接钱包：{dotAddress}
            </Blockquote>
          )}
        </>
      )}
    </Stack>
  );
}
