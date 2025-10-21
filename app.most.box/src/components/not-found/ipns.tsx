"use client";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Center } from "@mantine/core";
import { QRCodeSVG } from "qrcode.react";
import "./ipns.scss";

const PageContent = () => {
  const name = "HEU KMS Activator";
  const host = "https://most.box/ipns/";
  const ipns = "k51qzi5uqu5dmdudfnx05uaaehyo5yceivmvhjehy2isy7o3nj5coyw9ycy2qv";
  // const path = "/kubo/v0.38.1/kubo_v0.38.1_linux-amd64.tar.gz";
  const path = "";

  return (
    <Center id="page-ipns">
      <AppHeader title="IPNS 二维码" />
      <div className="ipns-qrcode">
        <div className="qrcode-frame">
          <QRCodeSVG
            className="qrcode"
            value={host + ipns + path}
            size={138}
            bgColor="transparent"
            fgColor="#ffffff"
          />
        </div>
        <div className="line"></div>
        <div className="info">
          <div className="name">{name}</div>
          <div className="host">{host}</div>
          <div className="ipns">{ipns}</div>
          <div className="path">{path}</div>
        </div>
      </div>
    </Center>
  );
};

export default function PageIPNS() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
