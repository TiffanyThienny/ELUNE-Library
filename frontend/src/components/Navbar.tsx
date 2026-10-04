import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Compass,
  Bookmark,
  FileText,
  UploadCloud,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Library as LibraryIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-[#FAF7F2] border-b border-[#E8DFD3] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to={isAuthenticated ? '/home' : '/'} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#2C2421] text-[#FAF7F2] flex items-center justify-center font-serif-literata font-bold text-xl shadow-sm transition-transform group-hover:scale-105">
              É
            </div>
            <div>
              <span className="font-serif-literata text-2xl font-bold tracking-tight text-[#2C2421]">
                ELUNÈ
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-widest text-[#8C7355] font-medium">
                Library
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/explore"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/explore')
                  ? 'bg-[#EBDDC8] text-[#2C2421]'
                  : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
              }`}
            >
              <Compass className="w-4 h-4" />
              Explore
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/home"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/home')
                      ? 'bg-[#EBDDC8] text-[#2C2421]'
                      : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>

                <Link
                  to="/library"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/library')
                      ? 'bg-[#EBDDC8] text-[#2C2421]'
                      : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <LibraryIcon className="w-4 h-4" />
                  My Library
                </Link>

                <Link
                  to="/bookmarks"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/bookmarks')
                      ? 'bg-[#EBDDC8] text-[#2C2421]'
                      : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Bookmarks
                </Link>

                <Link
                  to="/notes"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/notes')
                      ? 'bg-[#EBDDC8] text-[#2C2421]'
                      : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Notes
                </Link>

                <Link
                  to="/upload"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive('/upload')
                      ? 'bg-[#EBDDC8] text-[#2C2421]'
                      : 'text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1]'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-[#2C2421] text-[#FAF7F2]'
                    : 'text-[#8C7355] hover:bg-[#EBDDC8] hover:text-[#2C2421]'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* User Auth controls */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-[#F2ECE1] transition-colors border border-[#E8DFD3]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8C7355] text-white flex items-center justify-center font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-[#2C2421] max-w-[120px] truncate">
                    {user?.name}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E8DFD3] py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF7F2] text-[#8C7355] border border-[#E8DFD3]">
                        {user?.role}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-[#FAF7F2] hover:text-[#2C2421]"
                    >
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      Profile
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-amber-900 hover:bg-amber-50"
                      >
                        <Shield className="w-4 h-4 mr-2 text-amber-700" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-[#2C2421] hover:text-[#8C7355] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#2C2421] hover:bg-[#433832] rounded-xl shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#665A4F] hover:bg-[#EBDDC8] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8DFD3] bg-[#FAF7F2] px-4 pt-3 pb-6 space-y-2">
          <Link
            to="/explore"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
          >
            Explore
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                Home
              </Link>
              <Link
                to="/library"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                My Library
              </Link>
              <Link
                to="/bookmarks"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                Bookmarks
              </Link>
              <Link
                to="/notes"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                Notes
              </Link>
              <Link
                to="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                Upload Book
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-[#2C2421] hover:bg-[#EBDDC8]"
              >
                Profile ({user?.name})
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-base font-semibold text-amber-900 bg-amber-100"
                >
                  Admin Dashboard
                </Link>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 border border-[#8C7355] text-[#2C2421] rounded-xl font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2 bg-[#2C2421] text-white rounded-xl font-medium"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
