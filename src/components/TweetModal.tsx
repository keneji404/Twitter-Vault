import { useEffect, useState } from "react";
import type { TweetItem } from "../db/db";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  tweet: TweetItem;
  onClose: () => void;
}

export const TweetModal = ({ tweet, onClose }: Props) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Combine single mediaUrl (legacy) with new mediaUrls array
  const images =
    tweet.mediaUrls && tweet.mediaUrls.length > 0
      ? tweet.mediaUrls
      : tweet.mediaUrl
      ? [tweet.mediaUrl]
      : [];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex]); // Re-bind for index updates

  const nextImage = () => {
    if (currentImageIndex < images.length - 1)
      setCurrentImageIndex((c) => c + 1);
  };

  const prevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex((c) => c - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
      >
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-red-500/80 text-white p-2 rounded-full transition backdrop-blur-md"
        >
          <X size={20} />
        </button>

        {/* LEFT SIDE: IMAGE GALLERY */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group">
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]}
                alt="Post Media"
                className="max-h-full max-w-full object-contain"
              />

              {/* Navigation Arrows (Only if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    disabled={currentImageIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-white/20 text-white p-2 rounded-full disabled:opacity-0 transition"
                  >
                    <ChevronLeft size={32} />
                  </button>
                  <button
                    onClick={nextImage}
                    disabled={currentImageIndex === images.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-white/20 text-white p-2 rounded-full disabled:opacity-0 transition"
                  >
                    <ChevronRight size={32} />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-slate-500 flex flex-col items-center">
              <span className="text-4xl mb-2">📄</span>
              <span className="text-sm">Text Only Post</span>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: TWEET INFO */}
        <div className="w-full md:w-[400px] flex flex-col bg-slate-950 border-l border-slate-800">
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Author */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                <img
                  src={
                    tweet.avatarUrl ||
                    `https://unavatar.io/twitter/${tweet.authorHandle}`
                  }
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
                  }}
                />
              </div>
              <div>
                <div className="font-bold text-white text-lg">
                  {tweet.authorName}
                </div>
                <a
                  href={`https://twitter.com/${tweet.authorHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-blue-400 transition"
                >
                  @{tweet.authorHandle}
                </a>
              </div>
            </div>

            {/* Content */}
            <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap mb-6">
              {tweet.fullText}
            </p>

            {/* Date */}
            <div className="flex items-center gap-2 text-slate-500 text-sm font-mono border-t border-slate-900 pt-4">
              <Calendar size={14} />
              {format(tweet.createdAt, "h:mm a · MMM d, yyyy")}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-900 bg-slate-900/50">
            <a
              href={`https://twitter.com/i/web/status/${tweet.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition"
            >
              Open on X <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
