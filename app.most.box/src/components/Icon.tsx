// https://www.flaticon.com/free-icon-font/message-star_16866110?page=1&position=3&term=message-star&origin=search&related_id=16866110
import File from "@/assets/icons/file.svg";
import FileActive from "@/assets/icons/file-active.svg";
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

// https://www.flaticon.com/free-icon-font/earth-americas_9585915?page=1&position=2&term=earth&origin=search&related_id=9585915
import Earth from "@/assets/icons/earth.svg";

// https://supabase.com/dashboard/project/vibeseycqiisftkweeat/auth/providers
import Google from "@/assets/icons/google.svg";
import X from "@/assets/icons/x.svg";
import Discord from "@/assets/icons/discord.svg";
import Github from "@/assets/icons/github.svg";
import Mail from "@/assets/icons/mail.svg";
import Telegram from "@/assets/icons/telegram.svg";

// https://www.flaticon.com/free-icon-font/meeting-alt_13085451?term=talk&related_id=13085451
import Chat from "@/assets/icons/chat.svg";

const icons = {
  File,
  FileActive,
  Note,
  NoteActive,
  Explore,
  ExploreActive,
  Mine,
  MineActive,
  Add,
  Arrow,
  Camera,
  Back,
  More,
  QRCode,
  Chat,
  // complex
  Exit,
  Web3,
  About,
  Join,
  Setting,
  Earth,
  Google,
  X,
  Discord,
  Github,
  Mail,
  Telegram,
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
