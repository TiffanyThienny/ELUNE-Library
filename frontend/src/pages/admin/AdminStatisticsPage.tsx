import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { AdminStats } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import { BarChart3, TrendingUp, Sparkles, BookOpen, Users, Globe, Lock, ShieldCheck } from 'lucide-react';

export const AdminStatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getStatistics()
      .then((res) => {
        if (res.success && res.data?.statistics) {
          setStats(res.data.statistics);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        <div className="border-b border-[#E8DFD3] pb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
            Data & Telemetry
          </div>
          <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
            Library Intelligence & Usage
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
            Comprehensive breakdown of repository engagement and system activity.
          </p>
        </div>

        {loading ? (
          <LoadingState message="Aggregating metrics..." />
        ) : (
          <div className="space-y-6">
            {/* High-level stats banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-xs">
                <span className="text-xs font-semibold text-[#8C7355] block mb-1">
                  Active Reader Sessions
                </span>
                <span className="font-serif-literata font-bold text-4xl text-[#2C2421]">
                  {stats?.activeReaders}
                </span>
                <p className="text-[11px] text-[#A69888] mt-2">
                  Users currently tracking paragraph-level progress
                </p>
              </div>

              <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-xs">
                <span className="text-xs font-semibold text-[#8C7355] block mb-1">
                  AI Scholar Interactions
                </span>
                <span className="font-serif-literata font-bold text-4xl text-[#2C2421]">
                  {stats?.totalAIRequests}
                </span>
                <p className="text-[11px] text-[#A69888] mt-2">
                  Summaries, grounded Q&A, and study cards served
                </p>
              </div>

              <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-xs">
                <span className="text-xs font-semibold text-[#8C7355] block mb-1">
                  Catalog Volumes
                </span>
                <span className="font-serif-literata font-bold text-4xl text-[#2C2421]">
                  {stats?.totalBooks}
                </span>
                <p className="text-[11px] text-[#A69888] mt-2">
                  {stats?.publicBooks} public ({stats?.approvedBooks} approved) / {stats?.privateBooks} private
                </p>
              </div>
            </div>

            {/* Distribution bars */}
            <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <h3 className="font-serif-literata font-bold text-lg text-[#2C2421]">
                Catalog Visibility Breakdown
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#2C2421] mb-1">
                    <span>Public Catalog ({stats?.publicBooks})</span>
                    <span>
                      {stats?.totalBooks
                        ? Math.round(((stats.publicBooks || 0) / stats.totalBooks) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#E8DFD3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-800 rounded-full"
                      style={{
                        width: `${
                          stats?.totalBooks
                            ? ((stats.publicBooks || 0) / stats.totalBooks) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#2C2421] mb-1">
                    <span>Private Personal Libraries ({stats?.privateBooks})</span>
                    <span>
                      {stats?.totalBooks
                        ? Math.round(((stats.privateBooks || 0) / stats.totalBooks) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#E8DFD3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-700 rounded-full"
                      style={{
                        width: `${
                          stats?.totalBooks
                            ? ((stats.privateBooks || 0) / stats.totalBooks) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
