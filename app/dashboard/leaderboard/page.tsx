/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Medal, Trophy, Clock, Star, Target, Crown } from "lucide-react";
import { endpoints } from "@/lib/endpoints";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { LoadingBlock, ErrorState } from "@/components/ui/StateBlocks";

export default function LeaderboardPage() {
  const [duration, setDuration] = useState("month");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["study-leaderboard", duration, "", ""],
    queryFn: () => endpoints.studyLeaderboard(duration, "", ""),
  });

  if (isLoading) return <LoadingBlock label="Loading leaderboard..." />;
  if (isError) return <ErrorState message="Failed to load leaderboard." onRetry={refetch} />;

  const leaderboardData = data || [];
  
  // Ensure we have at least 3 items for the podium by padding with null if necessary
  const top3 = [
    leaderboardData[1] || null, // Rank 2
    leaderboardData[0] || null, // Rank 1
    leaderboardData[2] || null, // Rank 3
  ];
  
  const others = leaderboardData.slice(3);
  
  const totalOthers = others.length;
  const totalPages = Math.ceil(totalOthers / limit);
  const paginatedOthers = others.slice((page - 1) * limit, page * limit);

  const getTitle = () => {
    switch (duration) {
      case "today": return "Daily Competition";
      case "week": return "Weekly Competition";
      case "month": return "Monthly Competition";
      case "year": return "Yearly Competition";
      default: return "Leaderboard";
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] rounded-3xl bg-background border border-border text-foreground p-6 sm:p-10 font-sans relative overflow-hidden">
      {/* Background visual effects */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none"></div>
      
      {/* Header & Filters */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Leaderboard</h1>
          <p className="text-muted text-sm mt-1">Top students ranked by their total study hours.</p>
        </div>
        
        <div className="flex bg-panel-strong p-1 rounded-xl backdrop-blur-sm border border-border">
          {["today", "week", "month", "year"].map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setDuration(opt);
                setPage(1);
              }}
              className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                duration === opt 
                  ? "bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.3)]" 
                  : "text-muted hover:text-foreground hover:bg-hover"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Podium Section */}
      {leaderboardData.length > 0 && (
        <div className="relative z-10 flex flex-col items-center mt-8 mb-12">
          <div className="flex items-end justify-center gap-2 sm:gap-8 w-full max-w-4xl px-2">
            
            {/* Rank 2 (Left) */}
            <div className="flex flex-col items-center w-1/3 justify-end">
              {top3[0] && (
                <>
                  <div className="flex flex-col items-center w-full animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both z-20" style={{ animationDelay: '200ms' }}>
                    <img src="/images/crowns/silver_crown.png" alt="Rank 2" className="w-12 h-12 sm:w-16 sm:h-16 mb-1 sm:mb-2 object-contain mix-blend-screen contrast-125 brightness-110 [mask-image:radial-gradient(circle,white_40%,transparent_70%)]" />
                    <div className="rounded-full bg-emerald-900 p-1 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] -mt-2">
                      <ProfileAvatar 
                        src={top3[0].student.profile_image} 
                        name={top3[0].student.first_name || top3[0].student.username} 
                        size="md" 
                        className="sm:!h-16 sm:!w-16 sm:!text-base"
                      />
                    </div>
                    <span className="font-bold text-foreground mt-2 sm:mt-3 text-sm sm:text-base text-center truncate w-full px-1 pb-2 sm:pb-3">
                      {top3[0].student.first_name || top3[0].student.username}
                    </span>
                  </div>
                  
                  <div className="w-full max-w-[120px] rounded-t-2xl sm:rounded-t-3xl bg-panel-strong border-t border-border flex flex-col items-center justify-end h-28 sm:h-36 overflow-hidden shadow-xl relative z-10">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-emerald-950 font-black flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10">
                      2
                    </div>
                    <div className="w-full py-2 sm:py-3 bg-emerald-600 text-center z-10">
                      <span className="font-bold text-emerald-50 tracking-wider text-xs sm:text-sm">{top3[0].hours_formatted}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rank 1 (Center) */}
            <div className="flex flex-col items-center w-1/3 justify-end z-20">
              {top3[1] && (
                <>
                  <div className="flex flex-col items-center w-full animate-in slide-in-from-bottom-12 duration-700 fade-in fill-mode-both z-20">
                    <img src="/images/crowns/gold_crown.png" alt="Rank 1" className="w-16 h-16 sm:w-24 sm:h-24 mb-1 sm:mb-2 object-contain mix-blend-screen contrast-125 brightness-110 [mask-image:radial-gradient(circle,white_50%,transparent_75%)]" />
                    <div className="rounded-full bg-yellow-900 p-1 border-2 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.6)] -mt-4">
                      <ProfileAvatar 
                        src={top3[1].student.profile_image} 
                        name={top3[1].student.first_name || top3[1].student.username} 
                        size="lg" 
                        className="sm:!h-24 sm:!w-24 sm:!text-2xl"
                      />
                    </div>
                    <span className="font-bold text-foreground mt-2 sm:mt-4 text-base sm:text-xl text-center truncate w-full px-1 drop-shadow-md pb-2 sm:pb-4">
                      {top3[1].student.first_name || top3[1].student.username}
                    </span>
                  </div>
                  
                  <div className="w-full max-w-[140px] rounded-t-2xl sm:rounded-t-3xl bg-panel-strong border-t border-border flex flex-col items-center justify-end h-36 sm:h-48 overflow-hidden shadow-2xl relative z-10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-500 text-yellow-950 font-black text-base sm:text-lg flex items-center justify-center mb-5 sm:mb-8 shadow-[0_0_20px_rgba(234,179,8,0.6)] z-10">
                      1
                    </div>
                    <div className="w-full py-2.5 sm:py-4 bg-yellow-500 text-center z-10 shadow-[0_-5px_20px_rgba(234,179,8,0.3)]">
                      <span className="font-black text-yellow-950 tracking-wider text-sm sm:text-base">{top3[1].hours_formatted}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rank 3 (Right) */}
            <div className="flex flex-col items-center w-1/3 justify-end">
              {top3[2] && (
                <>
                  <div className="flex flex-col items-center w-full animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-both z-20" style={{ animationDelay: '400ms' }}>
                    <img src="/images/crowns/bronze_crown.png" alt="Rank 3" className="w-12 h-12 sm:w-16 sm:h-16 mb-1 sm:mb-2 object-contain mix-blend-screen contrast-125 brightness-110 [mask-image:radial-gradient(circle,white_40%,transparent_70%)]" />
                    <div className="rounded-full bg-emerald-900 p-1 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] -mt-2">
                      <ProfileAvatar 
                        src={top3[2].student.profile_image} 
                        name={top3[2].student.first_name || top3[2].student.username} 
                        size="md" 
                        className="sm:!h-16 sm:!w-16 sm:!text-base"
                      />
                    </div>
                    <span className="font-bold text-foreground mt-2 sm:mt-3 text-sm sm:text-base text-center truncate w-full px-1 pb-2 sm:pb-3">
                      {top3[2].student.first_name || top3[2].student.username}
                    </span>
                  </div>
                  
                  <div className="w-full max-w-[120px] rounded-t-2xl sm:rounded-t-3xl bg-panel-strong border-t border-border flex flex-col items-center justify-end h-24 sm:h-28 overflow-hidden shadow-xl relative z-10">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-foreground font-bold flex items-center justify-center mb-3 sm:mb-5 shadow-[0_0_15px_rgba(16,185,129,0.4)] z-10">
                      3
                    </div>
                    <div className="w-full py-2 sm:py-2.5 bg-emerald-700 text-center z-10">
                      <span className="font-bold text-emerald-50 tracking-wider text-xs sm:text-sm">{top3[2].hours_formatted}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* List Section */}
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
            <h3 className="text-xl font-bold text-foreground">{getTitle()}</h3>
          </div>
          <div className="bg-panel-strong border border-border rounded-lg px-4 py-1.5 text-xs font-semibold text-muted">
            Top {leaderboardData.length} Students
          </div>
        </div>

        <div className="bg-panel rounded-2xl border border-border overflow-hidden backdrop-blur-sm">
          <div className="grid grid-cols-[60px_1fr_120px_120px] sm:grid-cols-[80px_1fr_150px_150px] gap-4 p-4 border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
            <div className="text-center">#</div>
            <div>Player</div>
            <div className="text-right">Level</div>
            <div className="text-right">Study Time</div>
          </div>

          <div className="divide-y divide-border/50">
            {paginatedOthers.map((item: any, index: number) => (
              <div 
                key={item.student.id} 
                className={`grid grid-cols-[60px_1fr_120px_120px] sm:grid-cols-[80px_1fr_150px_150px] gap-4 p-4 items-center transition-colors hover:bg-hover ${item.is_current_user ? 'bg-primary-soft' : ''}`}
              >
                <div className="text-center font-black text-muted text-sm sm:text-base">
                  {item.rank}
                </div>
                
                <div className="flex items-center gap-3 min-w-0">
                  <ProfileAvatar 
                    src={item.student.profile_image} 
                    name={item.student.first_name || item.student.username} 
                    size="sm" 
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground truncate text-sm">
                      {item.student.first_name} {item.student.last_name}
                      {item.is_current_user && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-yellow-500/30">You</span>}
                    </span>
                    <span className="text-xs text-muted truncate">{item.student.student_id}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-center">
                  {item.level_info ? (
                    <>
                      <span className="text-xs font-bold" style={{ color: item.level_info.badge_color }}>
                        {item.level_info.title}
                      </span>
                      <span className="text-[10px] text-muted">Level {item.level_info.level}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted">-</span>
                  )}
                </div>

                <div className="text-right font-black text-emerald-400 text-sm sm:text-base tracking-wide">
                  {item.hours_formatted}
                </div>
              </div>
            ))}

            {others.length === 0 && leaderboardData.length > 0 && (
              <div className="p-8 text-center text-muted">
                Only the top 3 players are on the leaderboard right now!
              </div>
            )}
            
            {leaderboardData.length === 0 && (
              <div className="p-8 text-center text-muted">
                No study sessions recorded for this period.
              </div>
            )}
          </div>
          
          {totalOthers > limit && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-panel-strong">
              <span className="text-xs text-muted">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalOthers)} of {totalOthers} players
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md bg-panel-strong text-foreground text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-hover-strong transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-md bg-panel-strong text-foreground text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-hover-strong transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

