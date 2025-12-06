import { useState, useMemo } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import type { Activity } from "react-activity-calendar";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import {
  format,
  getYear,
  parseISO,
  differenceInDays,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
} from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";

interface Props {
  type: "bookmark" | "like";
}

export const ActivityGraph = ({ type }: Props) => {
  // 1. Get all dates from DB specific to the current type
  const items = useLiveQuery(async () => {
    const all = await db.items.where("type").equals(type).toArray();
    return all.filter((i) => i.isDeleted === 0);
  }, [type]);

  // State for selected year
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  // 2. Process Data & Calculate Stats
  const { calendarData, availableYears, stats } = useMemo(() => {
    if (!items) return { calendarData: [], availableYears: [], stats: null };

    // A. Extract all years and counts
    const counts: Record<string, number> = {};
    const yearsSet = new Set<number>();

    items.forEach((item) => {
      if (!item.createdAt) return;
      const dateStr = format(item.createdAt, "yyyy-MM-dd");
      const year = getYear(item.createdAt);

      counts[dateStr] = (counts[dateStr] || 0) + 1;
      yearsSet.add(year);
    });

    const availableYears = Array.from(yearsSet).sort((a, b) => b - a); // Descending
    // If current year not in data, add it so graph isn't empty initially
    if (!availableYears.includes(new Date().getFullYear())) {
      availableYears.unshift(new Date().getFullYear());
    }

    // B. Generate Full Year Data for the Selected Year (Jan 1 - Dec 31)
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));
    const daysInYear = eachDayOfInterval({ start, end });

    const yearData: Activity[] = daysInYear.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const count = counts[dateStr] || 0;
      return {
        date: dateStr,
        count: count,
        level: Math.min(4, Math.ceil(count / 2)) as 0 | 1 | 2 | 3 | 4,
      };
    });

    // C. Calculate Statistics for Selected Year
    const itemsInYear = items.filter(
      (i) => getYear(i.createdAt) === selectedYear
    );
    const activeDates = Object.keys(counts)
      .filter((d) => getYear(parseISO(d)) === selectedYear)
      .sort();

    // 1. Total
    const totalCount = itemsInYear.length;

    // 2. Active Days
    const activeDays = activeDates.length;

    // 3. Longest Streak
    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;

    activeDates.forEach((dateStr) => {
      const d = parseISO(dateStr);
      if (!prevDate) {
        currentStreak = 1;
      } else {
        const diff = differenceInDays(d, prevDate);
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
      prevDate = d;
    });

    // 4. Longest Gap
    let maxGap = 0;
    if (activeDates.length > 1) {
      for (let i = 1; i < activeDates.length; i++) {
        const diff = differenceInDays(
          parseISO(activeDates[i]),
          parseISO(activeDates[i - 1])
        );
        if (diff > maxGap) maxGap = diff;
      }
    }
    maxGap = maxGap > 0 ? maxGap - 1 : 0;

    return {
      calendarData: yearData,
      availableYears,
      stats: {
        total: totalCount,
        activeDays,
        maxStreak,
        maxGap,
      },
    };
  }, [items, selectedYear]);

  if (!items || !stats)
    return <div className="h-48 bg-slate-900 rounded-xl animate-pulse"></div>;

  return (
    <div className="space-y-6">
      {/* Header & Year Selector */}
      <div className="flex items-center gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="text-blue-500" />
          Activity Calendar
        </h3>

        <div className="relative group">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="appearance-none bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition font-mono"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={14}
          />
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <span className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">
            Total
          </span>
          <span className="text-3xl font-black text-white">{stats.total}</span>
        </div>

        {/* Active Days */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="mb-2 relative w-10 h-10 flex items-center justify-center">
            <svg
              className="absolute w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-800"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-green-500"
                strokeDasharray={`${Math.min(
                  100,
                  (stats.activeDays / 365) * 100
                )}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <span className="text-xs font-bold text-white">
              {stats.activeDays}
            </span>
          </div>
          <span className="text-slate-500 text-xs font-medium">
            Active Days
          </span>
        </div>

        {/* Streak */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="mb-2 relative w-10 h-10 flex items-center justify-center">
            <svg
              className="absolute w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-800"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-orange-500"
                strokeDasharray={`${Math.min(
                  100,
                  (stats.maxStreak / 365) * 100
                )}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <span className="text-xs font-bold text-white">
              {stats.maxStreak}
            </span>
          </div>
          <span className="text-slate-500 text-xs">Longest Streak</span>
        </div>

        {/* Gap */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="mb-2 relative w-10 h-10 flex items-center justify-center">
            <svg
              className="absolute w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-800"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-red-500"
                strokeDasharray={`${Math.min(
                  100,
                  (stats.maxGap / 365) * 100
                )}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
            <span className="text-xs font-bold text-white">{stats.maxGap}</span>
          </div>
          <span className="text-slate-500 text-xs">Longest Gap</span>
        </div>
      </div>

      {/* Calendar Graph */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 overflow-x-auto">
        <div className="min-w-[800px] flex justify-center">
          <ActivityCalendar
            data={calendarData}
            theme={{
              dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
            }}
            labels={{
              totalCount: `{{count}} ${type}s in ${selectedYear}`,
            }}
            showWeekdayLabels={true}
            blockSize={12}
            blockMargin={4}
            fontSize={12}
          />
        </div>
      </div>
    </div>
  );
};
