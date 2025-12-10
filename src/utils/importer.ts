import { db, type TweetItem } from "../db/db";

interface ImportEntry {
  // Twillot keys
  tweet_id?: string;
  full_text?: string;
  text?: string;
  created_at?: number | string;
  username?: string;
  screen_name?: string;
  avatar_url?: string;
  media_items?: { media_url_https: string; type: string }[];

  // Internal Backup keys
  id?: string;
  fullText?: string;
  createdAt?: string | Date;
  authorHandle?: string;
  authorName?: string;
  avatarUrl?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  type?: "bookmark" | "like";

  [key: string]: any;
}

export const processTwillotJson = async (file: File) => {
  if (!file.name.match(/\.jsonl?$/i)) {
    throw new Error("Please upload a .json or .jsonl file.");
  }

  const text = await file.text();
  let dataArray: ImportEntry[] = [];

  try {
    const rawData = JSON.parse(text);
    dataArray = Array.isArray(rawData) ? rawData : [rawData];
  } catch (e) {
    console.log("Switching to Line-by-Line parsing...");
    const lines = text.split("\n");
    dataArray = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          return null;
        }
      })
      .filter((item): item is ImportEntry => item !== null);
  }

  if (dataArray.length === 0) {
    throw new Error("No valid data found in file.");
  }

  const itemsToSave: TweetItem[] = dataArray.map((entry) => {
    // --- ID Logic ---
    let rawId = entry.tweet_id || entry.id || "unknown_id";
    if (rawId.startsWith("bookmark_")) {
      const parts = rawId.split("_");
      rawId = parts[parts.length - 1];
    }
    const id = rawId;

    // --- Text Logic ---
    const fullText = entry.fullText || entry.full_text || entry.text || "";

    // --- Date Logic ---
    let createdAt = new Date();
    if (entry.createdAt) {
      createdAt = new Date(entry.createdAt);
    } else if (entry.created_at) {
      const ts = Number(entry.created_at);
      createdAt = new Date(ts < 10000000000 ? ts * 1000 : ts);
    }

    // --- Author Logic ---
    const authorHandle = entry.authorHandle || entry.screen_name || "Unknown";
    const authorName = entry.authorName || entry.username || "Twitter User";
    const avatarUrl = entry.avatarUrl || entry.avatar_url;

    // --- Media Logic ---
    let mediaUrls: string[] = [];
    if (entry.mediaUrls && Array.isArray(entry.mediaUrls)) {
      mediaUrls = entry.mediaUrls;
    } else if (entry.media_items && Array.isArray(entry.media_items)) {
      mediaUrls = entry.media_items.map((m: any) => m.media_url_https);
    }
    const mediaUrl = entry.mediaUrl || mediaUrls[0];

    return {
      id,
      fullText,
      createdAt,
      authorHandle,
      authorName,
      avatarUrl,
      mediaUrl,
      mediaUrls,
      type: (entry.type as "bookmark" | "like") || "bookmark",
      isDeleted: 0,
      jsonBlob: entry,
    };
  });

  if (itemsToSave.length > 0) {
    await db.items.bulkPut(itemsToSave);
  }

  return itemsToSave.length;
};
