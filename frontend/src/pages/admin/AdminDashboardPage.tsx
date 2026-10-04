import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import { AdminStats } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import {
  Users,
  BookOpen,
  Globe,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
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
      .catch((err) => console.error('Failed to load admin stats', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Loading administrative intelligence..." fullPage />;
  }

  const statItems = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-stone-800' },
    { label: 'Total Books', value: stats?.totalBooks || 0, icon: BookOpen, color: 'text-stone-900' },
    { label: 'Public Books', value: stats?.publicBooks || 0, icon: Globe, color: 'text-amber-800' },
    { label: 'Private Books', value: stats?.privateBooks || 0, icon: Lock, color: 'text-stone-600' },
    { label: 'Pending Reviews', value: stats?.pendingUploads || 0, icon: Clock, color: 'text-amber-600' },
    { label: 'Approved Books', value: stats?.approvedBooks || 0, icon: CheckCircle2, color: 'text-emerald-700' },
    { label: 'Rejected Books', value: stats?.rejectedBooks || 0, icon: AlertCircle, color: 'text-red-700' },
    { label: 'AI Requests Served', value: stats?.totalAIRequests || 0, icon: Sparkles, color: 'text-indigo-700' },
    { label: 'Active Readers', value: stats?.activeReaders || 0, icon: TrendingUp, color: 'text-blue-700' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        {/* Header */}
        <div className="border-b border-[#E8DFD3] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
              Command Center
            </div>
            <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
              Administrative Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
              Live statistics and editorial oversight over the Elunè repository.
            </p>
          </div>

          {(stats?.pendingUploads || 0) > 0 && (
            <Link
              to="/admin/books/pending"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
            >
              <Clock className="w-4 h-4" />
              Review {stats?.pendingUploads} Pending Books
            </Link>
          )}
        </div>

        {/* Live Metrics Grid */}
        <section className="space-y-4">
          <h2 className="font-serif-literata text-xl font-bold text-[#2C2421]">
            Real-Time System Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-5">
            {statItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E8DFD3] rounded-2xl p-5 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-medium text-[#8C7355] block mb-1">
                      {item.label}
                    </span>
                    <span className="font-serif-literata font-bold text-2xl sm:text-3xl text-[#2C2421]">
                      {item.value}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E8DFD3] flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Shortcuts */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <Link
            to="/admin/books/pending"
            className="p-5 bg-white border border-[#E8DFD3] rounded-2xl shadow-2xs hover:border-[#8C7355] transition-all flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-xs text-[#2C2421]">Editorial Review</h3>
              <p className="text-[11px] text-[#8C7355] mt-0.5">Evaluate pending public submissions</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8C7355]" />
          </Link>

          <Link
            to="/admin/users"
            className="p-5 bg-white border border-[#E8DFD3] rounded-2xl shadow-2xs hover:border-[#8C7355] transition-all flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-xs text-[#2C2421]">User Directory</h3>
              <p className="text-[11px] text-[#8C7355] mt-0.5">Manage accounts and permissions</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8C7355]" />
          </Link>

          <Link
            to="/admin/categories"
            className="p-5 bg-white border border-[#E8DFD3] rounded-2xl shadow-2xs hover:border-[#8C7355] transition-all flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-xs text-[#2C2421]">Taxonomy & Categories</h3>
              <p className="text-[11px] text-[#8C7355] mt-0.5">Organize genre classification</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8C7355]" />
          </Link>
        </section>
      </main>
    </div>
  );
};
