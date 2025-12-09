import { useState, useMemo, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type TweetItem } from "./db/db";
import { processTwillotJson } from "./utils/importer";
import { exportData } from "./utils/exporter";
import { ActivityGraph } from "./components/ActivityGraph";
import { TweetModal } from "./components/TweetModal";
import { ConfirmModal, type ModalType } from "./components/ConfirmModal";
import {
  Search,
  Trash2,
  Upload,
  ExternalLink,
  RotateCcw,
  Loader2,
  Users,
  LayoutGrid,
  ArrowLeft,
  ChevronDown,
  List,
  Image as ImageIcon,
  X,
  SquareStack,
  Download,
  Github,
  House,
} from "lucide-react";
import { format, isValid } from "date-fns";

// --- Constants ---
const ITEMS_PER_PAGE = 24;
const LOAD_MORE_STEP = 24;

// --- Helpers ---
const safeFormat = (date: Date | undefined, str: string) => {
  if (!date || !isValid(date)) return "Unknown Date";
  return format(date, str);
};

function App() {
  // --- Global UI State ---
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Navigation & Filter State ---
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"bookmark" | "like">("bookmark");
  const [viewMode, setViewMode] = useState<"feed" | "authors">("feed");
  const [layout, setLayout] = useState<"grid" | "list" | "gallery">("grid");

  // --- Drill Down State ---
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [visibleFeedCount, setVisibleFeedCount] = useState(ITEMS_PER_PAGE);
  const [visibleAuthorsCount, setVisibleAuthorsCount] =
    useState(ITEMS_PER_PAGE);
  const [selectedTweet, setSelectedTweet] = useState<TweetItem | null>(null);

  // --- Layout Helper State ---
  const [numColumns, setNumColumns] = useState(3);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // --- Dialog/Modal State ---
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeDialog = () => setDialog((prev) => ({ ...prev, isOpen: false }));

  // --- Effects ---

  // 1. Handle Browser Back Button
  useEffect(() => {
    const handlePopState = () => {
      // If we are currently viewing an author, go back to authors list
      if (selectedAuthor) {
        setSelectedAuthor(null);
        setViewMode("authors");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedAuthor]);

  // 2. Click Outside Export Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Responsive Column Listener
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 640) setNumColumns(1);
      else if (w < 768) setNumColumns(2);
      else if (w < 1024) setNumColumns(3);
      else setNumColumns(4);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  // 4. Reset everything during filter or search
  useEffect(() => {
    setVisibleFeedCount(ITEMS_PER_PAGE);
    setVisibleAuthorsCount(ITEMS_PER_PAGE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [search, filterType]);

  // Preserving loaded authors list
  useEffect(() => {
    if (selectedAuthor) {
      setVisibleFeedCount(ITEMS_PER_PAGE);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedAuthor]);

  // --- Data Logic ---
  const allItems = useLiveQuery(async () => {
    try {
      const all = await db.items.toArray();
      return all
        .filter((i) => i.isDeleted === 0)
        .filter((i) => i.type === filterType)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      console.error(err);
      return [];
    }
  }, [filterType]);

  const { filteredItems, authorGroups } = useMemo(() => {
    if (!allItems) return { filteredItems: [], authorGroups: [] };

    let result = allItems;

    if (selectedAuthor) {
      result = result.filter((i) => i.authorHandle === selectedAuthor);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.fullText.toLowerCase().includes(q) ||
          i.authorHandle.toLowerCase().includes(q) ||
          i.authorName.toLowerCase().includes(q)
      );
    }

    let groups: any[] = [];
    if (viewMode === "authors") {
      const groupMap: Record<string, any> = {};
      const listToAggregate = selectedAuthor ? allItems : result;

      listToAggregate.forEach((item) => {
        if (!groupMap[item.authorHandle]) {
          groupMap[item.authorHandle] = {
            handle: item.authorHandle,
            name: item.authorName,
            count: 0,
            avatar:
              item.avatarUrl ||
              `https://unavatar.io/twitter/${item.authorHandle}`,
          };
        }
        if (
          item.avatarUrl &&
          groupMap[item.authorHandle].avatar.includes("unavatar")
        ) {
          groupMap[item.authorHandle].avatar = item.avatarUrl;
        }
        groupMap[item.authorHandle].count++;
      });
      groups = Object.values(groupMap).sort(
        (a: any, b: any) => b.count - a.count
      );
    }

    return { filteredItems: result, authorGroups: groups };
  }, [allItems, search, selectedAuthor, viewMode]);

  const galleryColumns = useMemo(() => {
    if (layout !== "gallery") return [];

    const cols = Array.from({ length: numColumns }, () => [] as TweetItem[]);
    const mediaItems = filteredItems
      .slice(0, visibleFeedCount)
      .filter((i) => i.mediaUrl);

    mediaItems.forEach((item, idx) => {
      cols[idx % numColumns].push(item);
    });

    return cols;
  }, [filteredItems, visibleFeedCount, layout, numColumns]);

  const visibleFeed = filteredItems.slice(0, visibleFeedCount);
  const visibleAuthors = authorGroups.slice(0, visibleAuthorsCount);

  // --- Handlers ---
  const handleLoadMore = () => {
    if (viewMode === "authors" && !selectedAuthor) {
      setVisibleAuthorsCount((prev) => prev + LOAD_MORE_STEP);
    } else {
      setVisibleFeedCount((prev) => prev + LOAD_MORE_STEP);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setIsProcessing(true);
      setTimeout(async () => {
        try {
          // @ts-ignore
          const count = await processTwillotJson(e.target.files[0]);
          setDialog({
            isOpen: true,
            type: "success",
            title: "Import Successful",
            message: `Successfully added ${count} items to your vault.`,
            onConfirm: () => {
              closeDialog();
            },
          });
        } catch (error: any) {
          console.error(error);
          setDialog({
            isOpen: true,
            type: "info",
            title: "Import Failed",
            message:
              error.message ||
              "Could not parse the file. Please check the format.",
            onConfirm: closeDialog,
          });
        } finally {
          setIsProcessing(false);
        }
      }, 100);
    }
  };

  const handleDelete = (id: string) => {
    db.items.update(id, { isDeleted: 1 });
  };

  const handleReset = () => {
    setDialog({
      isOpen: true,
      type: "danger",
      title: "Reset Database?",
      message:
        "Are you sure you want to delete ALL data? This action cannot be undone.",
      onConfirm: async () => {
        await db.delete();
        window.location.reload();
      },
    });
  };

  // Navigation Handler to push history state
  const handleAuthorClick = (handle: string) => {
    window.history.pushState(null, "", ""); // Add entry to browser history
    setSelectedAuthor(handle);
    setViewMode("feed");
    setSearch("");
    // scroll to top when entering a profile
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* HEADER */}
      <header className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur z-20">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            {selectedAuthor ? (
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-slate-800 rounded-full transition"
              >
                <ArrowLeft size={24} />
              </button>
            ) : (
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-10 h-10 drop-shadow-lg hover:scale-110 transition duration-300"
              />
            )}

            <div className="hidden sm:inline">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
                {selectedAuthor ? `@${selectedAuthor}` : "Twitter Vault"}
              </h1>
              <p className="text-slate-500 text-xs font-medium">
                {selectedAuthor
                  ? `${filteredItems.length} tweets from this user`
                  : `${allItems?.length || 0} ${filterType}s stored`}
              </p>
            </div>
          </div>

          <div className="grid grid-row gap-1">
            <div className="flex gap-2 items-center">
              {/* Export */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-2 border border-transparent hover:border-slate-700"
                  title="Export Data"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline text-sm font-medium">
                    Export
                  </span>
                </button>

                {showExportMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-950/50">
                      Export Format
                    </div>
                    <button
                      onClick={() => {
                        exportData("json");
                        setShowExportMenu(false);
                      }}
                      className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between group"
                    >
                      JSON{" "}
                      <span className="text-xs text-slate-500 group-hover:text-blue-200">
                        Backup
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        exportData("jsonl");
                        setShowExportMenu(false);
                      }}
                      className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between group"
                    >
                      JSONL{" "}
                      <span className="text-xs text-slate-500 group-hover:text-blue-200">
                        Line Data
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        exportData("csv");
                        setShowExportMenu(false);
                      }}
                      className="px-4 py-3 text-left text-sm text-slate-200 hover:bg-blue-600 hover:text-white transition flex items-center justify-between group"
                    >
                      CSV{" "}
                      <span className="text-xs text-slate-500 group-hover:text-blue-200">
                        Spreadsheet
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Import */}
              <label
                className={`p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-2 border border-transparent hover:border-slate-700 cursor-pointer ${
                  isProcessing ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {isProcessing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                <span className="hidden sm:inline text-sm font-medium">
                  {isProcessing ? "Processing..." : "Import"}
                </span>
                <input
                  type="file"
                  accept=".json,.jsonl"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>

              <div className="h-6 w-px bg-slate-800 mx-1"></div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="p-2 text-slate-600 hover:text-red-400 transition"
                title="Reset Database"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="flex sm:hidden justify-end">
              <p className="text-slate-500 text-xs font-medium">
                {selectedAuthor
                  ? `${filteredItems.length} tweets from this user`
                  : `${allItems?.length || 0} ${filterType}s stored`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8 flex-1 w-full">
        {!selectedAuthor && viewMode === "feed" && (
          <ActivityGraph type={filterType} />
        )}

        {/* CONTROLS BAR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative flex-1 w-full md:w-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={20}
            />
            <input
              type="text"
              placeholder={
                viewMode === "authors" ? "Search authors..." : "Search"
              }
              className="w-full h-10 bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition text-white placeholder:text-slate-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 justify-center">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 h-10 items-center shrink-0">
              {["bookmark", "like"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`h-8 px-3 rounded-md capitalize text-xs font-medium transition flex items-center ${
                    filterType === t
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>

            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 h-10 items-center shrink-0">
              <button
                onClick={() => {
                  setViewMode("feed");
                  setSelectedAuthor(null);
                }}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition ${
                  viewMode === "feed" && !selectedAuthor
                    ? "bg-slate-800 text-blue-400 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Feed"
              >
                <House size={18} />
              </button>
              <button
                onClick={() => {
                  setViewMode("authors");
                  setSelectedAuthor(null);
                }}
                className={`h-8 w-8 flex items-center justify-center rounded-md transition ${
                  viewMode === "authors"
                    ? "bg-slate-800 text-blue-400 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Authors"
              >
                <Users size={18} />
              </button>
            </div>

            {(viewMode === "feed" || selectedAuthor) && (
              <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 h-10 items-center shrink-0">
                <button
                  onClick={() => setLayout("grid")}
                  className={`h-8 w-8 flex items-center justify-center rounded-md transition ${
                    layout === "grid"
                      ? "bg-slate-800 text-blue-400 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`hidden h-8 w-8 sm:flex items-center justify-center rounded-md transition ${
                    layout === "list"
                      ? "bg-slate-800 text-blue-400 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="List View"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setLayout("gallery")}
                  className={`h-8 w-8 flex items-center justify-center rounded-md transition ${
                    layout === "gallery"
                      ? "bg-slate-800 text-blue-400 shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Gallery View"
                >
                  <ImageIcon size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- VIEW: AUTHORS --- */}
        {viewMode === "authors" && !selectedAuthor && (
          <>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleAuthors.map((group) => (
                <button
                  key={group.handle}
                  onClick={() => handleAuthorClick(group.handle)}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 transition p-4 rounded-xl flex items-center gap-4 text-left group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    <img
                      src={group.avatar}
                      alt={group.handle}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                      onError={(e) =>
                        (e.currentTarget.src =
                          "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png")
                      }
                    />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-white truncate">
                      {group.name}
                    </div>
                    <div className="text-slate-500 text-xs truncate">
                      @{group.handle}
                    </div>
                    <div className="mt-2 text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full w-fit">
                      {group.count}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* NEW: Load More Button for Authors */}
            {visibleAuthorsCount < authorGroups.length && (
              <div className="flex justify-center mt-8 pb-10">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-full font-medium transition shadow-lg hover:shadow-xl"
                >
                  Load More <ChevronDown size={16} />
                </button>
              </div>
            )}

            {authorGroups.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <h3 className="text-lg text-slate-300 font-medium">
                  No authors found
                </h3>
              </div>
            )}
          </>
        )}

        {/* --- VIEW: FEED --- */}
        {(viewMode === "feed" || selectedAuthor) && (
          <>
            {/* GALLERY */}
            {layout === "gallery" && (
              <div className="flex gap-4 items-start">
                {galleryColumns.map((col, colIndex) => (
                  <div key={colIndex} className="flex flex-col gap-4 flex-1">
                    {col.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedTweet(item)}
                        className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer"
                      >
                        <img
                          src={item.mediaUrl}
                          alt="Gallery"
                          className="w-full h-auto object-cover hover:scale-105 transition duration-500"
                          loading="lazy"
                        />
                        {(item.mediaUrls?.length || 0) > 1 && (
                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm pointer-events-none z-10">
                            <SquareStack size={12} /> {item.mediaUrls?.length}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          <div className="text-white text-sm font-bold truncate">
                            {item.authorName}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <a
                              href={`https://twitter.com/${item.authorHandle}/status/${item.id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="absolute top-2 left-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-md"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* LIST */}
            {layout === "list" && (
              <div className="flex flex-col gap-2">
                {visibleFeed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTweet(item)}
                    className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-3 rounded-lg hover:border-slate-700 transition group h-24 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                      <img
                        src={
                          item.avatarUrl ||
                          `https://unavatar.io/twitter/${item.authorHandle}`
                        }
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white truncate text-sm">
                          {item.authorName}
                        </span>
                        <span className="text-slate-500 text-xs">
                          @{item.authorHandle}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm truncate pr-4">
                        {item.fullText}
                      </p>
                    </div>
                    {item.mediaUrl ? (
                      <div className="w-16 h-16 shrink-0 rounded-md border border-slate-700 bg-slate-800 overflow-hidden hover:opacity-80 transition relative">
                        <img
                          src={item.mediaUrl}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {(item.mediaUrls?.length || 0) > 1 && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1 rounded flex items-center gap-0.5 pointer-events-none">
                            <SquareStack size={10} /> {item.mediaUrls?.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0" />
                    )}
                    <div className="w-24 shrink-0 flex flex-col items-end justify-center gap-1">
                      <span className="text-slate-600 text-xs font-mono">
                        {safeFormat(item.createdAt, "MMM d, yy")}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <a
                          href={`https://twitter.com/${item.authorHandle}/status/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GRID */}
            {layout === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleFeed.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTweet(item)}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition group flex flex-col shadow-sm cursor-pointer"
                  >
                    {item.mediaUrl && (
                      <div className="h-48 overflow-hidden bg-slate-800 relative">
                        <img
                          src={item.mediaUrl}
                          alt="Media"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {(item.mediaUrls?.length || 0) > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                            <SquareStack size={12} /> {item.mediaUrls?.length}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700 shrink-0">
                          <img
                            src={
                              item.avatarUrl ||
                              `https://unavatar.io/twitter/${item.authorHandle}`
                            }
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
                            }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 flex flex-col overflow-hidden">
                          <span className="text-white font-bold truncate">
                            {item.authorName}
                          </span>
                          <span className="truncate">@{item.authorHandle}</span>
                        </div>
                        <span className="ml-auto text-xs text-slate-600 font-mono shrink-0">
                          {safeFormat(item.createdAt, "MMM d, yy")}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed flex-1 whitespace-pre-wrap wrap-break-word">
                        {item.fullText}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center opacity-60 group-hover:opacity-100 transition">
                        <a
                          href={`https://twitter.com/${item.authorHandle}/status/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-medium"
                        >
                          View on X <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-md transition"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {visibleFeedCount < filteredItems.length && (
              <div className="flex justify-center mt-8 pb-10">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-full font-medium transition shadow-lg hover:shadow-xl"
                >
                  Load More <ChevronDown size={16} />
                </button>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                <h3 className="text-lg text-slate-300 font-medium">
                  No {filterType}s found
                </h3>
              </div>
            )}
          </>
        )}

        {/* MODALS */}
        {selectedTweet && (
          <TweetModal
            tweet={selectedTweet}
            onClose={() => setSelectedTweet(null)}
          />
        )}

        <ConfirmModal
          isOpen={dialog.isOpen}
          type={dialog.type}
          title={dialog.title}
          message={dialog.message}
          onConfirm={dialog.onConfirm}
          onCancel={closeDialog}
          confirmText={dialog.type === "danger" ? "Yes, Delete All" : "Okay"}
        />
      </main>

      {/* FOOTER */}
      <footer className="py-8 text-center text-slate-500 text-sm border-t border-slate-900 mt-auto bg-slate-950">
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* <ShieldCheck size={16} className="text-green-500" />
          <span className="font-semibold text-slate-400">Local & Private</span> */}
          <a
            href="https://github.com/keneji404/Twitter-Vault"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-400 hover:text-white transition flex gap-2 items-center"
          >
            <Github size={16} />
            <span className="font-semibold"> View on GitHub</span>
          </a>
        </div>
        <p className="max-w-md mx-auto px-4 leading-relaxed">
          Your data is processed entirely in your browser using IndexedDB. No
          files are uploaded to any server. Your privacy is guaranteed by
          design.
        </p>
      </footer>
    </div>
  );
}

export default App;
