import { db, type TweetItem } from "../db/db";
import { format } from "date-fns";
import JSZip from "jszip";

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportData = async (formatType: "json" | "jsonl" | "csv") => {
  // 1. Fetch all active items
  const items = await db.items.filter((i) => i.isDeleted === 0).toArray();
  const dateStr = format(new Date(), "yyyy-MM-dd");
  const filename = `twitter-vault-export-${dateStr}`;

  if (items.length === 0) {
    alert("No data to export!");
    return;
  }

  // 2. Handle Formats
  if (formatType === "json") {
    const content = JSON.stringify(items, null, 2);
    downloadFile(content, `${filename}.json`, "application/json");
  } else if (formatType === "jsonl") {
    const content = items.map((item) => JSON.stringify(item)).join("\n");
    downloadFile(content, `${filename}.jsonl`, "application/x-jsonlines");
  } else if (formatType === "csv") {
    // CSV Header
    const headers = [
      "ID",
      "Date",
      "Handle",
      "Name",
      "Text",
      "Media Count",
      "Media URLs",
      "Video URL",
      "Original Link",
    ];

    // CSV Rows
    const rows = items.map((item) => {
      // Escape quotes for CSV safety
      const escape = (txt: string) => `"${(txt || "").replace(/"/g, '""')}"`;

      return [
        escape(item.id),
        escape(item.createdAt.toISOString()),
        escape(item.authorHandle),
        escape(item.authorName),
        escape(item.fullText),
        item.mediaUrls?.length || 0,
        escape((item.mediaUrls || []).join("; ")),
        escape(item.videoUrl || ""),
        escape(`https://twitter.com/i/web/status/${item.id}`),
      ].join(",");
    });

    const content = [headers.join(","), ...rows].join("\n");
    downloadFile(content, `${filename}.csv`, "text/csv");
  }
};

export const downloadMediaZip = async (
  items: TweetItem[],
  authorHandle: string,
  onProgress: (current: number, total: number) => void
) => {
  const zip = new JSZip();
  const folderName = `${authorHandle}_media`;
  const folder = zip.folder(folderName);

  // Filter items that have ANY media
  const mediaItems = items.filter(
    (i) => i.videoUrl || i.mediaUrl || (i.mediaUrls && i.mediaUrls.length > 0)
  );

  let totalFiles = 0;
  mediaItems.forEach((item) => {
    if (item.videoUrl) {
      totalFiles += 1;
    } else {
      // Count of images
      const count =
        item.mediaUrls && item.mediaUrls.length > 0
          ? item.mediaUrls.length
          : item.mediaUrl
          ? 1
          : 0;
      totalFiles += count;
    }
  });

  if (totalFiles === 0) {
    alert("No media found for this user.");
    return 0;
  }

  let processedCount = 0;
  let successCount = 0;

  // Update initial UI
  onProgress(0, totalFiles);

  const batchSize = 3;

  for (let i = 0; i < mediaItems.length; i += batchSize) {
    const batch = mediaItems.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        // LOGIC: If Video exists, download ONLY the video. Else, download images.

        if (item.videoUrl) {
          // --- VIDEO DOWNLOAD ---
          try {
            const response = await fetch(item.videoUrl);
            if (!response.ok) throw new Error("Network error");
            const blob = await response.blob();

            // Filename: handle_date_tweetID.mp4
            const dateStr = format(item.createdAt, "yyyy-MM-dd");
            const filename = `${item.authorHandle}_${dateStr}_${item.id}.mp4`;

            folder?.file(filename, blob);
            successCount++;
          } catch (err) {
            console.error(`Failed to download video ${item.videoUrl}`, err);
          } finally {
            processedCount++;
            onProgress(processedCount, totalFiles);
          }
        } else {
          // --- IMAGE DOWNLOAD ---
          const urls =
            item.mediaUrls && item.mediaUrls.length > 0
              ? item.mediaUrls
              : item.mediaUrl
              ? [item.mediaUrl]
              : [];

          await Promise.all(
            urls.map(async (url, index) => {
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network error");
                const blob = await response.blob();

                let ext = "jpg";
                const type = blob.type.split("/")[1];
                if (type) ext = type;

                const dateStr = format(item.createdAt, "yyyy-MM-dd");
                const suffix = urls.length > 1 ? `_${index + 1}` : "";
                const filename = `${item.authorHandle}_${dateStr}_${item.id}${suffix}.${ext}`;

                folder?.file(filename, blob);
                successCount++;
              } catch (err) {
                console.error(`Failed to download image ${url}`, err);
              } finally {
                processedCount++;
                onProgress(processedCount, totalFiles);
              }
            })
          );
        }
      })
    );
  }

  if (successCount === 0) {
    throw new Error("Failed to download media.");
  }

  const content = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return successCount;
};
