import { db, type TweetItem } from "../db/db";

interface ImportEntry {
  // Twitter Web Exporter (TWE) Keys
  id?: string;
  created_at?: string;
  full_text?: string;
  screen_name?: string;
  name?: string;
  profile_image_url?: string;
  bookmarked?: boolean;
  favorited?: boolean;
  media?: {
    type: "photo" | "video" | "animated_gif";
    url: string;
    thumbnail: string; // jpg thumbnail
    original: string; // original quality images (including videos)
  }[];

  // Twillot Keys
  tweet_id?: string;
  username?: string;
  avatar_url?: string;
  media_items?: any[];
  extended_entities?: { media?: any[] };

  // Internal Backup Keys
  tweetId?: string;
  fullText?: string;
  createdAt?: string | Date;
  authorHandle?: string;
  authorName?: string;
  avatarUrl?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  videoUrl?: string;
  type?: "bookmark" | "like";

  [key: string]: any;
}

// Extract MP4 from Twillot data
const findBestVideo = (mediaItem: any) => {
  const info =
    mediaItem.video_info || (mediaItem.type === "video" ? mediaItem : null);
  if (info && info.variants) {
    const best = info.variants
      .filter((v: any) => v.content_type === "video/mp4")
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return best ? best.url : undefined;
  }
  return undefined;
};

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
    let rawId = entry.id || entry.tweet_id || entry.tweetId || "unknown_id";
    if (String(rawId).startsWith("bookmark_")) {
      const parts = rawId.split("_");
      rawId = parts[parts.length - 1];
    }

    const id = String(rawId);
    const fullText = entry.fullText || entry.full_text || entry.text || "";
    // DATE
    let createdAt = new Date();
    if (entry.createdAt) {
      createdAt = new Date(entry.createdAt);
    } else if (entry.created_at) {
      if (typeof entry.created_at === "number") {
        const ts = entry.created_at;
        createdAt = new Date(ts < 10000000000 ? ts * 1000 : ts);
      } else {
        createdAt = new Date(entry.created_at);
      }
    }
    // AUTHOR
    const authorHandle = entry.authorHandle || entry.screen_name || "Unknown";
    const authorName =
      entry.authorName || entry.name || entry.username || "Twitter User";
    const avatarUrl =
      entry.avatarUrl || entry.profile_image_url || entry.avatar_url;
    // TYPE
    let type: "bookmark" | "like" | "tweet" = "bookmark";
    if (entry.type && (entry.type === "bookmark" || entry.type === "like")) {
      type = entry.type;
    } else {
      if (entry.bookmarked) type = "bookmark";
      else if (entry.favorited) type = "like";
    }

    // MEDIA LOGIC
    let mediaUrls: string[] = [];
    let mediaUrl: string | undefined = undefined;
    let videoUrl: string | undefined = undefined;

    // Check Internal Backup First
    if (entry.mediaUrls && Array.isArray(entry.mediaUrls)) {
      mediaUrls = entry.mediaUrls;
      mediaUrl = entry.mediaUrl;
      videoUrl = entry.videoUrl;
    }
    // Check Twitter Web Exporter Format
    else if (
      entry.media &&
      Array.isArray(entry.media) &&
      entry.media.length > 0
    ) {
      mediaUrls = entry.media.map((m) => {
        return m.type === "video" || m.type === "animated_gif"
          ? m.thumbnail
          : m.original || m.url;
      });

      // Set Main Thumbnail (First Item)
      mediaUrl = mediaUrls[0];

      // Extract Video URL
      const videoEntry = entry.media.find(
        (m) => m.type === "video" || m.type === "animated_gif",
      );
      if (videoEntry) videoUrl = videoEntry.original;
    } else if (entry.extended_entities || entry.media_items) {
      const rawMedia =
        entry.extended_entities?.media || entry.media_items || [];
      if (rawMedia.length > 0) {
        mediaUrls = rawMedia.map((m: any) => m.media_url_https);
        mediaUrl = mediaUrls[0];
        const videoEntry = rawMedia.find(
          (m: any) =>
            m.type === "video" || m.type === "animated_gif" || m.video_info,
        );
        if (videoEntry) {
          videoUrl = findBestVideo(videoEntry);
        }
      }
    }

    return {
      id,
      fullText,
      createdAt,
      authorHandle,
      authorName,
      avatarUrl,
      mediaUrl,
      mediaUrls,
      videoUrl,
      type,
      isDeleted: 0,
      jsonBlob: entry,
    };
  });

  if (itemsToSave.length > 0) {
    await db.items.bulkPut(itemsToSave);
  }

  return itemsToSave.length;
};
