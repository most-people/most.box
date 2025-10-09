"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { Container } from "@mantine/core";
import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./cid.scss";

export default function PageDemo() {
  const shareUrl =
    "https://most.box/ipfs/bafybeied7xalprkqtzq3leeyo3jfvt6qqeljtstv6alsjue3eiu5a5tprq?filename=HEU_KMS_Activator_v63.2.0.exe";

  return (
    <Container py={20}>
      <AppHeader title="CID 二维码" />
      <div className="cid-qrcode">
        <QRCodeSVG
          className="qrcode"
          value={shareUrl}
          size={150}
          bgColor="transparent"
          fgColor="#FFF"
          level="M"
        />
        <div className="line"></div>
        <div className="info">
          <div className="name">node-v24.8.0-x64.msi</div>

          <div className="website">www.most-people.com</div>
          <div className="address">
            /ipfs/bafybeied7xalprkqtzq3leeyo3jfvt6qqeljtstv6alsjue3eiu5a5tprq
          </div>
        </div>
      </div>
    </Container>
  );
}
