export interface Message {
  text: string;
  address: string;
  timestamp: number;
  type?: "text" | "image" | "audio" | "video" | "file";
}

export interface Friend {
  address: string;
  username: string;
  public_key: string;
  timestamp: number;
}
