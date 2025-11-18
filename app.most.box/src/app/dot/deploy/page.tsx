"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Anchor, Blockquote, Button, Text, Stack, Center } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BrowserProvider, getAddress } from "ethers";
import { useRouter } from "next/navigation";
import { IconInfoCircle, IconSignature } from "@tabler/icons-react";
import axios from "axios";
import Link from "next/link";
import { modals } from "@mantine/modals";

export default function PageDeploy() {
  const router = useRouter();
  const [connectLoading, setConnectLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [dotAddress, setDotAddress] = useState("");
  const [dotApi, setDotApi] = useState("");
  const [dotGit, setDotGit] = useState("");
  const [dotDeploy, setDotDeploy] = useState("");
  const [version, setVersion] = useState<string>("");
  const [latestVersion, setLatestVersion] = useState<string>("");
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");
  const [updateRestartLoading, setUpdateRestartLoading] =
    useState<boolean>(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const address = query.get("address");
    const api = query.get("api");
    if (address && api) {
      setDotAddress(address);
      setDotApi(api);
      setDotDeploy(api + window.location.pathname + window.location.search);
      setVersionLoading(true);
      fetch(api + "/app.version")
        .then((res) => res.json())
        .then((data) => {
          try {
            setVersion(data?.version || "");
            setLatestVersion(data?.latest_version || "");
            setUpdateAvailable(Boolean(data?.update_available));
          } catch {}
        })
        .finally(() => setVersionLoading(false));
      fetch(api + "/api.git")
        .then((res) => res.text())
        .then((text) => {
          // 截取 origin 和 (fetch) 之间的内容
          const match = text.match(/origin\s+(.+?)\s+\(fetch\)/);
          if (match) {
            try {
              setDotGit(match[1]);
            } catch {}
          }
        });
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
    const ethereum = window.okexchain || window.ethereum;
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
    const ethereum = window.okexchain || window.ethereum;
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
  const doSignUpdateAndRestart = async () => {
    if (!dotApi) return;

    let text = "更新完成";
    try {
      setUpdateRestartLoading(true);
      const message = Date.now().toString();
      // @ts-expect-error window.ethereum
      const ethereum = window.okexchain || window.ethereum;
      if (!ethereum) {
        notifications.show({ title: "提示", message: "请先安装 OKX Wallet" });
        return;
      }
      const ethersProvider = new BrowserProvider(ethereum);
      const signer = await ethersProvider.getSigner();
      const signature = await signer.signMessage(message);
      const tokenLocal = [signer.address, message, signature].join(".");
      const updateRes = await axios({
        method: "put",
        url: dotApi + "/app.update",
        headers: { Authorization: tokenLocal },
      });
      if (updateRes.data?.ok) {
        const restartRes = await axios({
          method: "post",
          url: dotApi + "/app.restart",
          headers: { Authorization: tokenLocal },
        });
        if (restartRes.data?.ok) {
          text = "更新完成，服务已重启";
        } else {
          text = "更新成功，但重启未确认";
        }
        setUpdateAvailable(false);
      } else {
        text = "当前已是最新";
      }
    } catch (error) {
      text = "更新失败";
    } finally {
      // setUpdateRestartLoading(false);
      modals.open({
        centered: true,
        children: (
          <Center>
            <Text c="green">{text}</Text>
          </Center>
        ),
        withCloseButton: false,
        onClose: () => location.reload(),
      });
    }
  };
  return (
    <Stack px="md">
      <AppHeader title="更新节点代码" />
      <Blockquote icon={<IconInfoCircle />} mt="xl">
        <Text>
          节点地址：
          <Anchor component={Link} href={dotDeploy} target="_blank">
            {dotApi}
          </Anchor>
        </Text>
        <Text mt="md" c="dimmed">
          开源代码：{dotGit}
        </Text>
        <Text mt="md">
          {versionLoading
            ? "版本信息加载中..."
            : `当前版本：${version || "未知"}`}
        </Text>
        <Text c="dimmed">{`最新版本：${latestVersion || "未知"}`}</Text>
        <Text c="dimmed">
          {updateAvailable ? "有可用更新" : "当前已是最新"}
        </Text>
      </Blockquote>

      {address ? (
        <Text
          fw={700}
          variant="gradient"
          gradient={{ from: "blue", to: "cyan", deg: 90 }}
          onClick={disconnect}
        >
          {address}
        </Text>
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
            <Stack>
              <Center>
                <Button
                  leftSection={<IconSignature />}
                  variant="gradient"
                  loading={updateRestartLoading}
                  loaderProps={{ type: "dots" }}
                  onClick={doSignUpdateAndRestart}
                  disabled={!updateAvailable}
                >
                  签名更新并重启
                </Button>
              </Center>
            </Stack>
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
