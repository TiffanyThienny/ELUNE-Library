import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ReaderProvider } from './context/ReaderContext';
import { Navbar } from './components/Navbar';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ExplorePage } from './pages/ExplorePage';
import { BookDetailPage } from './pages/BookDetailPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { PersonalLibraryPage } from './pages/PersonalLibraryPage';
import { UploadBookPage } from './pages/UploadBookPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { NotesPage } from './pages/NotesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReaderPage } from './pages/ReaderPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminBooksPage } from './pages/admin/AdminBooksPage';
import { AdminPendingReviewsPage } from './pages/admin/AdminPendingReviewsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminStatisticsPage } from './pages/admin/AdminStatisticsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="w-10 h-10 rounded-full border-2 border-[#E8DFD3] border-t-[#8C7355] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="w-10 h-10 rounded-full border-2 border-[#E8DFD3] border-t-[#8C7355] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2]">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReaderProvider>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/book/:bookId" element={<BookDetailPage />} />

              {/* Authenticated User Routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <UserDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <PersonalLibraryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadBookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookmarks"
                element={
                  <ProtectedRoute>
                    <BookmarksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notes"
                element={
                  <ProtectedRoute>
                    <NotesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/read/:bookId"
                element={
                  <ProtectedRoute>
                    <ReaderPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/books"
                element={
                  <AdminRoute>
                    <AdminBooksPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/books/pending"
                element={
                  <AdminRoute>
                    <AdminPendingReviewsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <AdminRoute>
                    <AdminCategoriesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/statistics"
                element={
                  <AdminRoute>
                    <AdminStatisticsPage />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ReaderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
