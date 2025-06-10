"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Box } from "@mantine/core";
import { api } from "@/constants/api";
import "./files.scss";

export default function PageDotFiles() {
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
    <Box id="page-dot-files">
      <AppHeader title="文件列表" />
      <span>{ipv6Data.url}</span>
    </Box>
  );
}
