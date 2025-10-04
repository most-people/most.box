"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import {
  Container,
  Text,
  Stack,
  Button,
  Textarea,
  Center,
} from "@mantine/core";
import { getBytes } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";
import nacl from "tweetnacl";

// Base64 编码函数
function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// 将 Ed25519 私钥转换为 PKCS#8 PEM 格式
function ed25519ToPKCS8PEM(privateKey: Uint8Array): string {
  // Ed25519 私钥的 ASN.1 DER 编码结构
  // PKCS#8 私钥信息结构:
  // SEQUENCE {
  //   version INTEGER,
  //   privateKeyAlgorithm AlgorithmIdentifier,
  //   privateKey OCTET STRING
  // }

  // Ed25519 算法标识符 OID: 1.3.101.112
  const ed25519AlgorithmIdentifier = new Uint8Array([
    0x30,
    0x05, // SEQUENCE, length 5
    0x06,
    0x03, // OBJECT IDENTIFIER, length 3
    0x2b,
    0x65,
    0x70, // OID 1.3.101.112 (Ed25519)
  ]);

  // 私钥部分 (OCTET STRING containing OCTET STRING)
  const privateKeyOctetString = new Uint8Array([
    0x04,
    0x22, // OCTET STRING, length 34
    0x04,
    0x20, // OCTET STRING, length 32
    ...privateKey.slice(0, 32), // 只取前32字节作为私钥
  ]);

  // 构建完整的 PKCS#8 结构
  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0

  const totalLength =
    version.length +
    ed25519AlgorithmIdentifier.length +
    privateKeyOctetString.length;
  const pkcs8 = new Uint8Array(2 + totalLength);

  pkcs8[0] = 0x30; // SEQUENCE
  pkcs8[1] = totalLength; // length

  let offset = 2;
  pkcs8.set(version, offset);
  offset += version.length;
  pkcs8.set(ed25519AlgorithmIdentifier, offset);
  offset += ed25519AlgorithmIdentifier.length;
  pkcs8.set(privateKeyOctetString, offset);

  // 转换为 Base64 并格式化为 PEM
  const base64 = base64Encode(pkcs8);
  const pem = `-----BEGIN PRIVATE KEY-----\n${base64
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END PRIVATE KEY-----`;

  return pem;
}

// 将 Ed25519 公钥转换为 PKCS#8 PEM 格式
function ed25519PublicKeyToPEM(publicKey: Uint8Array): string {
  // Ed25519 公钥的 ASN.1 DER 编码结构
  const ed25519AlgorithmIdentifier = new Uint8Array([
    0x30,
    0x05, // SEQUENCE, length 5
    0x06,
    0x03, // OBJECT IDENTIFIER, length 3
    0x2b,
    0x65,
    0x70, // OID 1.3.101.112 (Ed25519)
  ]);

  // 公钥部分 (BIT STRING)
  const publicKeyBitString = new Uint8Array([
    0x03,
    0x21, // BIT STRING, length 33
    0x00, // unused bits
    ...publicKey, // 32字节公钥
  ]);

  const totalLength =
    ed25519AlgorithmIdentifier.length + publicKeyBitString.length;
  const spki = new Uint8Array(2 + totalLength);

  spki[0] = 0x30; // SEQUENCE
  spki[1] = totalLength; // length

  let offset = 2;
  spki.set(ed25519AlgorithmIdentifier, offset);
  offset += ed25519AlgorithmIdentifier.length;
  spki.set(publicKeyBitString, offset);

  // 转换为 Base64 并格式化为 PEM
  const base64 = base64Encode(spki);
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END PUBLIC KEY-----`;

  return pem;
}

export default function PageDemo() {
  const wallet = useUserStore((state) => state.wallet);
  const [privateKeyPEM, setPrivateKeyPEM] = useState("");
  const [publicKeyPEM, setPublicKeyPEM] = useState("");

  useEffect(() => {
    if (wallet) {
      // 从十六进制私钥字符串转换为 Uint8Array
      const secretKey = new Uint8Array(
        getBytes(wallet.private_key + wallet.ed_public_key.slice(2))
      );
      // 使用私钥重新构建密钥对
      const EdKeyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
      convertToPEM(EdKeyPair);
    }
  }, [wallet]);

  const convertToPEM = (keyPair: nacl.SignKeyPair) => {
    if (keyPair) {
      const privatePEM = ed25519ToPKCS8PEM(keyPair.secretKey);
      const publicPEM = ed25519PublicKeyToPEM(keyPair.publicKey);
      setPrivateKeyPEM(privatePEM);
      setPublicKeyPEM(publicPEM);
    }
  };

  return (
    <Container py={20} w="100%" pt="xl">
      <AppHeader title="Ed25519 密钥转换为 PKCS#8 PEM 格式" />

      <Stack gap="md">
        <Stack gap="sm">
          <Text fw={500}>私钥 (PKCS#8 PEM 格式):</Text>
          <Textarea value={privateKeyPEM} readOnly autosize minRows={4} />
        </Stack>

        <Stack gap="sm">
          <Text fw={500}>公钥 (PEM 格式):</Text>
          <Textarea value={publicKeyPEM} readOnly autosize minRows={4} />
        </Stack>
      </Stack>

      {!wallet && (
        <Center mt="xl">
          <Button variant="gradient" component={Link} href="/login">
            去登录
          </Button>
        </Center>
      )}
    </Container>
  );
}
