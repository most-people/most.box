export type Attachment = {
  id: string;
  name: string;
  size: number;
  mime?: string;
  url?: string;
};

export type MessageKind = "text" | "file";

export type Message = {
  id: string;
  from: "me" | "them";
  kind: MessageKind;
  text?: string;
  file?: Attachment;
  ts: number;
};

export type Conversation = {
  id: string;
  name: string;
  isGroup?: boolean;
  avatar?: string;
  lastMessage: string;
  lastTs: number;
  unread: number;
  messages: Message[];
};

export const minutes = (n: number) => n * 60 * 1000;
export const hours = (n: number) => n * 60 * 60 * 1000;
export const days = (n: number) => n * 24 * 60 * 60 * 1000;