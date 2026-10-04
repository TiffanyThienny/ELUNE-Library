import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Clock,
  Tag,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Pending Reviews', path: '/admin/books/pending', icon: Clock },
    { label: 'All Books', path: '/admin/books', icon: BookOpen },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Categories', path: '/admin/categories', icon: Tag },
    { label: 'Statistics', path: '/admin/statistics', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E8DFD3] min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#8C7355] px-3 mb-2">
            Admin Console
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#2C2421] text-white shadow-2xs'
                      : 'text-[#665A4F] hover:bg-[#FAF7F2] hover:text-[#2C2421]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="pt-4 border-t border-[#F2ECE1]">
        <Link
          to="/home"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#8C7355] hover:bg-[#FAF7F2] hover:text-[#2C2421] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>
    </aside>
  );
};
