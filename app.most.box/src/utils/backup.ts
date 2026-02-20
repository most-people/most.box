import { most25519, mostDecode, mostEncode } from "@/utils/MostWallet";
import mp from "@/utils/mp";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/stores/userStore";
import { api } from "@/utils/api";
import dayjs from "dayjs";

// 冲突
let conflicts = true;

export const encryptBackup = (data: any, danger: string): string => {
  const { public_key, private_key } = most25519(danger);
  const encrypted = mostEncode(JSON.stringify(data), public_key, private_key);

  if (!encrypted) {
    throw new Error("数据加密失败");
  }

  return encrypted;
};
export const decryptBackup = (content: string, danger: string): any => {
  if (!content.startsWith("mp://2")) {
    throw new Error("无效的备份数据格式");
  }

  const { public_key, private_key } = most25519(danger);
  const decrypted = mostDecode(content, public_key, private_key);

  if (!decrypted) {
    throw new Error("解密失败，请确保使用正确的钱包账户");
  }

  try {
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error("数据解析失败");
  }
};

// 云端备份数据
export const cloudSave = async () => {
  const { wallet, exportData } = useUserStore.getState();
  if (!wallet) {
    // notifications.show({ message: "请先登录", color: "red" });
    return;
  }

  if (conflicts) {
    if (
      !window.confirm(
        "本地数据与云端不一致，本地修改将会覆盖云端数据，是否继续？",
      )
    ) {
      return;
    }
    conflicts = false;
  }

  try {
    const data = exportData();
    const content = JSON.stringify(data);
    const cid = await mp.calculateCID(content);
    const encrypted = encryptBackup(data, wallet.danger);

    await api.put("backup", {
      body: encrypted,
      headers: {
        "Content-Type": "text/plain",
        "x-backup-cid": cid,
      },
    });

    // notifications.show({
    //   title: "云端备份成功",
    //   message: "数据已成功备份到云端",
    //   color: "green",
    // });
  } catch (error: any) {
    console.info(error.message || "上传失败");
    // notifications.show({
    //   title: "云端备份失败",
    //   message: error.message || "上传失败",
    //   color: "red",
    // });
  }
};
export const cloudLoad = async () => {
  const { wallet, exportData, importData, notes, files } =
    useUserStore.getState();
  if (!wallet) {
    // notifications.show({ message: "请先登录", color: "red" });
    return;
  }

  try {
    const response = await api.get("backup");

    const cloudTime = parseInt(response.headers.get("x-backup-time") || "0");
    const cloudCID = response.headers.get("x-backup-cid") || "";

    if (notes.length > 0 || files.length > 0) {
      const localData = exportData();
      const localContent = JSON.stringify(localData);
      const localCID = await mp.calculateCID(localContent);
      if (localCID === cloudCID) {
        // 本地数据与云端数据一致，无需恢复
        conflicts = false;
        return;
      } else {
        const timeDiff = dayjs(cloudTime).fromNow();
        if (
          !window.confirm(
            `云端数据（${timeDiff}）与本地数据不一致，恢复将覆盖本地更改，是否继续？`,
          )
        ) {
          conflicts = true;
          return;
        }
      }
    }

    const content = await response.text();
    if (!content) {
      throw new Error("云端无备份数据");
    }

    const data = decryptBackup(content, wallet.danger);

    if (data.notes || data.files) {
      importData(data);
      conflicts = false;
      // notifications.show({
      //   title: "云端恢复成功",
      //   message: "数据已从云端恢复",
      //   color: "green",
      // });
    } else {
      throw new Error("无效的备份数据");
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      // notifications.show({
      //   title: "无云端备份",
      //   message: "您还没有在云端备份过数据",
      //   color: "yellow",
      // });
      conflicts = false;
      return;
    }

    conflicts = true;
    // notifications.show({
    //   title: "云端恢复失败",
    //   message: error.message || "下载或解析失败",
    //   color: "red",
    // });
  }
};

// 本地备份数据
export const handleExport = () => {
  const { wallet, exportData } = useUserStore.getState();
  if (!wallet) {
    notifications.show({ message: "请先登录", color: "red" });
    return;
  }
  const data = exportData();

  try {
    const encrypted = encryptBackup(data, wallet.danger);

    const blob = new Blob([encrypted], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wallet?.address.slice(-4)}-most-box-${dayjs().format("YYYY-MM-DD")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({
      title: "导出成功",
      message: "数据已加密备份到本地",
      color: "green",
    });
  } catch (error: any) {
    notifications.show({
      title: "导出失败",
      message: error.message || "数据加密失败",
      color: "red",
    });
  }
};

export const handleImport = () => {
  const { wallet, importData } = useUserStore.getState();
  if (!wallet) {
    notifications.show({ message: "请先登录", color: "red" });
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = decryptBackup(content, wallet.danger);

        if (data.notes || data.files) {
          importData(data);
          notifications.show({
            title: "导入成功",
            message: "数据已成功恢复",
            color: "green",
          });
          cloudSave();
        } else {
          throw new Error("无效的备份文件数据");
        }
      } catch (error: any) {
        notifications.show({
          title: "导入失败",
          message: error.message || "文件解析失败或格式不正确",
          color: "red",
        });
      }
    };
    reader.readAsText(file);
  };
  input.click();
};
