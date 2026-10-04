import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Calendar, LogOut } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8DFD3] pb-6">
        <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
          Reader Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
          Your personal identity within the Elunè digital library ecosystem.
        </p>
      </div>

      <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#8C7355] text-white font-serif-literata font-bold text-2xl flex items-center justify-center shadow-xs">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="font-serif-literata font-bold text-xl text-[#2C2421]">{user?.name}</h2>
            <p className="text-xs text-[#8C7355]">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#F2ECE1] pt-6">
          <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD3] flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#8C7355]" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#8C7355]">
                Account Role
              </span>
              <span className="text-xs font-semibold text-[#2C2421]">{user?.role}</span>
            </div>
          </div>

          <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8DFD3] flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#8C7355]" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-[#8C7355]">
                Member Since
              </span>
              <span className="text-xs font-semibold text-[#2C2421]">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#F2ECE1] flex justify-end">
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
