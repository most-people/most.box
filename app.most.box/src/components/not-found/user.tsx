import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { Anchor, Container, Group, Text } from "@mantine/core";
import { Contract, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import Link from "next/link";
import mp from "@/constants/mp";

export default function PageNotFound() {
  const pathname = usePathname();
  const name = pathname.split("/")[1].slice(1);
  const RPC = NETWORK_CONFIG["mainnet"].rpc;

  const provider = useMemo(() => new JsonRpcProvider(RPC), [RPC]);
  const contract = useMemo(
    () => new Contract(CONTRACT_ADDRESS_NAME, CONTRACT_ABI_NAME, provider),
    [provider]
  );

  const [owner, setOwner] = useState("");

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const owner = await contract.getOwner(name);
        setOwner(owner);
      } catch (err) {
        console.warn("获取用户所有者失败", err);
      }
    };
    fetchOwner();
  }, [contract, name]);

  const Explorer = NETWORK_CONFIG["mainnet"].explorer;

  return (
    <Container p="md">
      <AppHeader title={name} />
      <Text>用户地址： {owner}</Text>
      <Group>
        <Anchor
          size="sm"
          c="blue"
          component={Link}
          href={Explorer + "/address/" + CONTRACT_ADDRESS_NAME}
          target="_blank"
        >
          合约地址 {mp.formatAddress(CONTRACT_ADDRESS_NAME)}
        </Anchor>
      </Group>
    </Container>
  );
}
