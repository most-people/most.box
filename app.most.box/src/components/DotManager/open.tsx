import { modals } from "@mantine/modals";
import { DotManager } from "./DotManager";

export const openDotManager = () => {
  const id = modals.open({
    title: "我的节点",
    fullScreen: true,
    children: <DotManager isModal onClose={() => modals.close(id)} />,
  });
};
