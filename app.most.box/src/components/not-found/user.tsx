import {
  CONTRACT_ABI_NAME,
  CONTRACT_ADDRESS_NAME,
  NETWORK_CONFIG,
} from "@/constants/dot";
import { Container, Text } from "@mantine/core";
import { Contract, JsonRpcProvider } from "ethers";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function PageNotFound() {
  const pathname = usePathname();
  const name = pathname.slice(2, -1);

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

  return (
    <Container p="md">
      <Text>用户地址： {owner}</Text>
    </Container>
  );
}
