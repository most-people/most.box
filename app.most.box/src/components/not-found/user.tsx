import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Stack, Center } from "@mantine/core";
import { AppHeader } from "@/components/AppHeader";

export default function PageUser() {
  const pathname = usePathname();
  const [address, setAddress] = useState("");
  useEffect(() => {
    if (pathname) {
      setAddress(pathname.split("/")[1].slice(1));
    }
  }, [pathname]);
  return (
    <Stack>
      <AppHeader title={address} />
      <Center>个人主页</Center>
    </Stack>
  );
}
