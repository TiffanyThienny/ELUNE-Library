import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/home';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser?.role === 'ADMIN' && (from === '/home' || from === '/')) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#FAF7F2]">
      <div className="w-full max-w-md bg-white border border-[#E8DFD3] rounded-3xl p-8 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#2C2421] text-[#FAF7F2] font-serif-literata font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
            É
          </div>
          <h2 className="font-serif-literata font-bold text-2xl text-[#2C2421]">Welcome Back</h2>
          <p className="text-xs text-[#8C7355] mt-1">Sign in to continue reading.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#8C7355] hover:text-[#2C2421] transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              'Signing In...'
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#665A4F]">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-[#2C2421] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
