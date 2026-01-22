import type { TweetItem } from "../db/db";
import { Play, SquareStack } from "lucide-react";

interface Props {
  item: TweetItem;
}

export const MediaMosaic = ({ item }: Props) => {
  // Gather all images
  const images =
    item.mediaUrls && item.mediaUrls.length > 0
      ? item.mediaUrls
      : item.mediaUrl
        ? [item.mediaUrl]
        : [];

  if (images.length === 0) return null;

  // Limit to 4 slices for display
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length - 4;

  return (
    <div className="w-full h-full flex bg-slate-950 relative group">
      {displayImages.map((url, index) => {

        const isLast = index === displayImages.length - 1;

        return (
          <div
            key={index}
            className={`
              relative h-full flex-1 overflow-hidden
              ${!isLast ? "border-r-5 border-black/50" : ""} 
            `}
          >
            <img
              src={url}
              alt={`Media ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* VIDEO INDICATOR (First slice only) */}
            {index === 0 && item.videoUrl && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-3 backdrop-blur-sm pointer-events-none group-hover:scale-110 group-hover:bg-blue-600/80 transition">
                <Play
                  size={32}
                  className="text-white drop-shadow-lg"
                  fill="rgba(0,0,0,0.5)"
                />
              </div>
            )}

            {/* OVERFLOW INDICATOR (Last slice) */}
            {index === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                <span className="text-white font-bold text-lg">
                  +{remainingCount}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* MULTI-IMAGE BADGE */}
      {images.length > 1 && remainingCount <= 0 && (
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm pointer-events-none z-10">
          <SquareStack size={12} /> {images.length}
        </div>
      )}
    </div>
  );
};
