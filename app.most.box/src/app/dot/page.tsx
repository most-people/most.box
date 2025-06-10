"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Box } from "@mantine/core";
import { api } from "@/constants/api";
import "./dot.scss";
import Link from "next/link";

export default function PageDot() {
  const [ipv6Data, setIpv6Data] = useState({ url: "" });

  const fetchIpv6 = async () => {
    try {
      const res = await api("/ipv6");
      setIpv6Data(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchIpv6();
  }, []);

  return (
    <Box id="page-dot">
      <AppHeader title="DOT.MOST.BOX" />
      <div className="container">
        <div className="emoji">🎉</div>
        <h1>DOT.MOST.BOX</h1>
        <p>节点已成功运行</p>
        {ipv6Data.url && (
          <a href={ipv6Data.url} target="_blank" rel="noopener noreferrer">
            {ipv6Data.url}
          </a>
        )}
        <p>為 全 人 類 徹 底 解 放 奮 鬥 終 身</p>
        <Link href="/dot/files">查看文件</Link>
      </div>
    </Box>
  );
}
