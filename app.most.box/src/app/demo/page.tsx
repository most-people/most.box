"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { Container, Text, Code, Stack, Button, Textarea } from "@mantine/core";
import { getBytes } from "ethers";
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
  const [privateKeyPEM, setPrivateKeyPEM] = useState<string>("");
  const [publicKeyPEM, setPublicKeyPEM] = useState<string>("");
  const [keyPair, setKeyPair] = useState<nacl.SignKeyPair | null>(null);

  useEffect(() => {
    if (wallet) {
      // 从十六进制私钥字符串转换为 Uint8Array
      const secretKey = new Uint8Array(getBytes(wallet.ed_private_key));
      // 使用私钥重新构建密钥对
      const EdKeyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
      setKeyPair(EdKeyPair);
    }
  }, [wallet]);

  const convertToPEM = () => {
    if (keyPair) {
      const privatePEM = ed25519ToPKCS8PEM(keyPair.secretKey);
      const publicPEM = ed25519PublicKeyToPEM(keyPair.publicKey);
      setPrivateKeyPEM(privatePEM);
      setPublicKeyPEM(publicPEM);
    }
  };

  return (
    <Container py={20}>
      <AppHeader title="Ed25519 密钥转换为 PKCS#8 PEM 格式" />

      <Stack gap="md" mt="xl">
        {wallet && keyPair && (
          <>
            <Text size="sm" c="dimmed">
              检测到 Ed25519 密钥对，点击下方按钮转换为 PKCS#8 PEM 格式
            </Text>

            <Button onClick={convertToPEM} variant="filled">
              转换为 PEM 格式
            </Button>

            {privateKeyPEM && (
              <Stack gap="sm">
                <Text fw={500}>私钥 (PKCS#8 PEM 格式):</Text>
                <Textarea
                  value={privateKeyPEM}
                  readOnly
                  autosize
                  minRows={8}
                  maxRows={12}
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: "12px",
                    },
                  }}
                />
              </Stack>
            )}

            {publicKeyPEM && (
              <Stack gap="sm">
                <Text fw={500}>公钥 (PEM 格式):</Text>
                <Textarea
                  value={publicKeyPEM}
                  readOnly
                  autosize
                  minRows={6}
                  maxRows={10}
                  styles={{
                    input: {
                      fontFamily: "monospace",
                      fontSize: "12px",
                    },
                  }}
                />
              </Stack>
            )}

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                原始密钥信息:
              </Text>
              <Code block>
                私钥长度: {keyPair.secretKey.length} 字节{"\n"}
                公钥长度: {keyPair.publicKey.length} 字节{"\n"}
                私钥 (hex):{" "}
                {Array.from(keyPair.secretKey.slice(0, 32))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")}
                {"\n"}
                公钥 (hex):{" "}
                {Array.from(keyPair.publicKey)
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")}
              </Code>
            </Stack>
          </>
        )}

        {!wallet && <Text c="dimmed">请先连接钱包以获取 Ed25519 密钥</Text>}
      </Stack>
    </Container>
  );
}
