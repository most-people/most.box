"use client";

import { AppHeader } from "@/components/AppHeader";

import { Container } from "@mantine/core";

import { QRCodeSVG } from "qrcode.react";
import "./cid.scss";

export default function PageDemo() {
  const shareUrl =
    "https://most.box/ipns/k51qzi5uqu5dmdudfnx05uaaehyo5yceivmvhjehy2isy7o3nj5coyw9ycy2qv";

  return (
    <Container py={20}>
      <AppHeader title="CID 二维码" />
      <div className="cid-qrcode">
        <div className="qrcode-frame">
          <QRCodeSVG
            className="qrcode"
            value={shareUrl}
            size={138}
            bgColor="transparent"
            fgColor="#ffffff"
            level="M"
          />
        </div>
        <div className="line"></div>
        <div className="info">
          <div className="name">HEU KMS Activator</div>

          <div className="website">most.box</div>
          <div className="address">
            /ipns/k51qzi5uqu5dmdudfnx05uaaehyo5yceivmvhjehy2isy7o3nj5coyw9ycy2qv
          </div>
        </div>
      </div>
    </Container>
  );
}
