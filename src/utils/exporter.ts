import { db } from "../db/db";
import { format } from "date-fns";

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
        escape((item.mediaUrls || []).join("; ")), // Join multiple images with semicolon
        escape(`https://twitter.com/i/web/status/${item.id}`),
      ].join(",");
    });

    const content = [headers.join(","), ...rows].join("\n");
    downloadFile(content, `${filename}.csv`, "text/csv");
  }
};
