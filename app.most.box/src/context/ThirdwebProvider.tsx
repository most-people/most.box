"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { ReactNode } from "react";

export default function ThirdwebProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
