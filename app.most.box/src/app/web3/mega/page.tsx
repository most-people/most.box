"use client";

import { AppHeader } from "@/components/AppHeader";
import { Box, Button } from "@mantine/core";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { notifications } from "@mantine/notifications";
import "./mega.scss";
import { useUserStore } from "@/stores/userStore";

// 定义网络类型
type NetworkType = "mega" | "monad";

export default function Web3MegaPage() {
  const wallet = useUserStore((state) => state.wallet);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkType>("mega");

  // 网络配置
  const networkConfig = {
    mega: {
      rpc: "https://carrot.megaeth.com/rpc",
      explorer: "https://www.megaexplorer.xyz",
      faucet: "https://testnet.megaeth.com/#2",
      name: "Mega ETH",
    },
    monad: {
      rpc: "https://testnet-rpc.monad.xyz",
      explorer: "https://testnet.monadexplorer.com",
      faucet: "https://faucet.monad.xyz",
      name: "Monad",
    },
  };

  // 监听键盘事件
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        setPressedKey(event.key);
        // 防止页面滚动
        event.preventDefault();
      }
    };

    const handleKeyUp = () => {
      setPressedKey(null);
    };

    // 添加事件监听
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 添加鼠标按下事件处理
  const handleMouseDown = (key: string) => {
    setPressedKey(key);
  };

  // 添加鼠标松开事件处理
  const handleMouseUp = () => {
    setPressedKey(null);
  };

  // 分别为两个网络创建 provider
  const [megaProvider] = useState<ethers.JsonRpcProvider>(
    new ethers.JsonRpcProvider(networkConfig.mega.rpc)
  );
  const [monadProvider] = useState<ethers.JsonRpcProvider>(
    new ethers.JsonRpcProvider(networkConfig.monad.rpc)
  );

  const [megaSigner, setMegaSigner] = useState<ethers.HDNodeWallet | null>(
    null
  );
  const [monadSigner, setMonadSigner] = useState<ethers.HDNodeWallet | null>(
    null
  );
  const [megaNonce, setMegaNonce] = useState<number | null>(null);
  const [monadNonce, setMonadNonce] = useState<number | null>(null);

  // 获取各网络 nonce
  const fetchNonces = async (address: string) => {
    try {
      // 获取 Mega ETH nonce
      const megaNonce = await megaProvider.getTransactionCount(address);
      setMegaNonce(megaNonce);
      console.log(`${networkConfig.mega.name} 网络 nonce:`, megaNonce);

      // 获取 Monad nonce
      const monadNonce = await monadProvider.getTransactionCount(address);
      setMonadNonce(monadNonce);
      console.log(`${networkConfig.monad.name} 网络 nonce:`, monadNonce);
    } catch (error) {
      console.error("获取 nonce 失败:", error);
    }
  };
  // 当 wallet 变化时更新 signer
  useEffect(() => {
    if (wallet) {
      // 创建钱包实例
      const w = ethers.Wallet.fromPhrase(wallet.mnemonic);

      // 连接到 Mega ETH 网络
      const megaWalletSigner = w.connect(megaProvider);
      setMegaSigner(megaWalletSigner);

      // 连接到 Monad 网络
      const monadWalletSigner = w.connect(monadProvider);
      setMonadSigner(monadWalletSigner);

      fetchNonces(w.address);
    }
  }, [wallet]);

  const sendTransaction = async () => {
    const currentSigner = network === "mega" ? megaSigner : monadSigner;
    const currentNonce = network === "mega" ? megaNonce : monadNonce;

    if (currentSigner === null || currentNonce === null) {
      return;
    }

    try {
      // 先将对应网络的 nonce 加 1，为下一笔交易做准备
      if (network === "mega") {
        setMegaNonce(currentNonce + 1);
      } else {
        setMonadNonce(currentNonce + 1);
      }

      // 发送一笔交易，指定 nonce
      const tx = await currentSigner.sendTransaction({
        to: currentSigner.address,
        value: ethers.parseEther("0"),
        nonce: currentNonce,
      });

      console.log(
        "交易哈希:",
        networkConfig[network].explorer + "/tx/" + tx.hash
      );
      notifications.show({
        color: "green",
        title: `${networkConfig[network].name} 交易哈希`,
        message: tx.hash,
      });
    } catch (error) {
      console.error("交易失败:", error);
      notifications.show({
        color: "red",
        title: "交易失败",
        message: (error as Error).message,
      });
    }
  };

  useEffect(() => {
    if (pressedKey) {
      console.log("按下按键:", pressedKey);
      notifications.show({
        title: "按下按键",
        message: pressedKey,
      });
      // 发送一笔交易
      sendTransaction();
    }
  }, [pressedKey]);

  // 获取当前网络的 signer
  const getCurrentSigner = () => {
    return network === "mega" ? megaSigner : monadSigner;
  };

  return (
    <Box id="page-mega">
      <AppHeader title={`${networkConfig[network].name} 测试网`} />

      {!wallet ? (
        <Button variant="gradient" component={Link} href="/login">
          请先登录
        </Button>
      ) : (
        <>
          <div style={{ marginBottom: "15px" }}>
            <Button.Group>
              <Button
                variant={network === "mega" ? "filled" : "outline"}
                onClick={() => setNetwork("mega")}
              >
                Mega ETH
              </Button>
              <Button
                variant={network === "monad" ? "filled" : "outline"}
                onClick={() => setNetwork("monad")}
              >
                Monad
              </Button>
            </Button.Group>
          </div>

          {getCurrentSigner() && (
            <p>
              {networkConfig[network].explorer}/address/
              {getCurrentSigner()?.address}
            </p>
          )}
          <p>{networkConfig[network].rpc}</p>
          <p>
            <Link href={networkConfig[network].faucet} target="_blank">
              {networkConfig[network].name} 水龙头
            </Link>
          </p>

          <p>Nonce: {network === "mega" ? megaNonce : monadNonce}</p>

          <div className="keyboard-container">
            {/* 上下左右按键 */}
            <div className="key-pad">
              {/* 上键 */}
              <Button
                className={`direction-key up ${
                  pressedKey === "ArrowUp" ? "pressed" : ""
                }`}
                onMouseDown={() => handleMouseDown("ArrowUp")}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp} // 添加鼠标离开事件，防止鼠标拖出按钮时按钮仍保持按下状态
              >
                ↑
              </Button>

              {/* 左键 */}
              <Button
                className={`direction-key left ${
                  pressedKey === "ArrowLeft" ? "pressed" : ""
                }`}
                onMouseDown={() => handleMouseDown("ArrowLeft")}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                ←
              </Button>

              {/* 下键 */}
              <Button
                className={`direction-key down ${
                  pressedKey === "ArrowDown" ? "pressed" : ""
                }`}
                onMouseDown={() => handleMouseDown("ArrowDown")}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                ↓
              </Button>

              {/* 右键 */}
              <Button
                className={`direction-key right ${
                  pressedKey === "ArrowRight" ? "pressed" : ""
                }`}
                onMouseDown={() => handleMouseDown("ArrowRight")}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                →
              </Button>
            </div>
          </div>
        </>
      )}
    </Box>
  );
}
