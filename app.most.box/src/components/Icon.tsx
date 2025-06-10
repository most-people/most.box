// https://www.flaticon.com/free-icon-font/message-star_16866110?page=1&position=3&term=message-star&origin=search&related_id=16866110
import Chat from "@/assets/icons/chat.svg";
import ChatActive from "@/assets/icons/chat-active.svg";
// https://www.flaticon.com/free-icon-font/pencil_16861405?term=pencil&related_id=16861405
import Note from "@/assets/icons/note.svg";
import NoteActive from "@/assets/icons/note-active.svg";
// https://www.flaticon.com/free-icon-font/flag-alt_7661413?page=1&position=2&term=flag&origin=search&related_id=7661413
import Explore from "@/assets/icons/explore.svg";
import ExploreActive from "@/assets/icons/explore-active.svg";
// https://www.flaticon.com/free-icon-font/user_3917711?page=1&position=1&term=user&origin=search&related_id=3917711
import Mine from "@/assets/icons/mine.svg";
import MineActive from "@/assets/icons/mine-active.svg";
// https://www.flaticon.com/free-icon-font/add_15861077?page=1&position=1&term=add&origin=search&related_id=15861077
import Add from "@/assets/icons/add.svg";
import Arrow from "@/assets/icons/arrow.svg";
import Camera from "@/assets/icons/camera.svg";
// https://www.flaticon.com/free-icon-font/arrow-small-left_3916837?term=back&related_id=3916837
import Back from "@/assets/icons/back.svg";
// https://www.flaticon.com/free-icon-font/menu-dots_3917230?page=1&position=5&term=more&origin=search&related_id=3917230
import More from "@/assets/icons/more.svg";
import QRCode from "@/assets/icons/qr-code.svg";

// https://www.flaticon.com/free-icon-font/leave_13087974?page=1&position=12&term=exit&origin=search&related_id=13087974
import Exit from "@/assets/icons/exit.svg";
import Web3 from "@/assets/icons/web3.svg";
import About from "@/assets/icons/about.svg";
import Join from "@/assets/icons/join.svg";
import Setting from "@/assets/icons/setting.svg";

// https://www.flaticon.com/free-icon-font/cloud-download-alt_7434817?page=1&position=2&term=download&origin=search&related_id=7434817
import Download from "@/assets/icons/download.svg";

const icons = {
  chat: Chat,
  "chat-active": ChatActive,
  note: Note,
  "note-active": NoteActive,
  explore: Explore,
  "explore-active": ExploreActive,
  mine: Mine,
  "mine-active": MineActive,
  add: Add,
  arrow: Arrow,
  camera: Camera,
  back: Back,
  more: More,
  "qr-code": QRCode,
  // complex
  exit: Exit,
  web3: Web3,
  about: About,
  join: Join,
  setting: Setting,
  download: Download,
} as const;

export type IconName = keyof typeof icons;
interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export const Icon = ({ name, size = 24, className }: IconProps) => {
  const Svg = icons[name];
  return <Svg width={size} height={size} className={className} />;
};
