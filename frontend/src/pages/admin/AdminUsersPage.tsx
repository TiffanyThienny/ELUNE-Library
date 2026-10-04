import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import { User } from '../../types';
import { AdminSidebar } from '../../components/Sidebar';
import { LoadingState } from '../../components/LoadingState';
import { Users, Shield, Calendar, Mail } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getUsers()
      .then((res) => {
        if (res.success && res.data?.users) {
          setUsers(res.data.users);
        }
      })
      .catch((err) => console.error('Failed to load users', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#FAF7F2]">
      <AdminSidebar />

      <main className="flex-1 p-6 sm:p-10 space-y-8 max-w-6xl">
        <div className="border-b border-[#E8DFD3] pb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
              User Directory
            </div>
            <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
              Registered Members
            </h1>
            <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
              Active reader accounts, curators, and administrators.
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-3 py-1.5 bg-white border border-[#E8DFD3] rounded-xl text-[#8C7355]">
            Total: {users.length} Users
          </span>
        </div>

        {loading ? (
          <LoadingState message="Fetching member registry..." />
        ) : (
          <div className="bg-white border border-[#E8DFD3] rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E8DFD3] text-[#8C7355] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#2C2421] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#8C7355] text-white flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#665A4F]">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          <Shield className="w-2.5 h-2.5" />
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#8C7355]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
