import Dexie, { type Table } from "dexie";

export interface TweetItem {
  id: string;
  fullText: string;
  createdAt: Date;
  authorHandle: string;
  authorName: string;
  avatarUrl?: string;
  mediaUrl?: string; // Keep for thumbnails
  mediaUrls?: string[]; // <--- NEW: Store ALL image links
  type: "bookmark" | "like" | "tweet";
  isDeleted: number;
  jsonBlob: any;
}

export class TwitterVaultDB extends Dexie {
  items!: Table<TweetItem>;

  constructor() {
    super("TwitterVaultDB");
    this.version(1).stores({
      items: "id, type, createdAt, authorHandle, isDeleted, [type+isDeleted]",
    });
  }
}

export const db = new TwitterVaultDB();
