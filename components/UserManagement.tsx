
import React, { useState, useEffect } from 'react';
import { User, Language } from '../types';
import { t } from '../services/i18n';
import { cloudService } from '../services/cloudService';

const SUPABASE_URL = 'https://zagduqruhmihtdsbrhfo.supabase.co';

interface UserManagementProps {
  language: Language;
  onRefreshUsers: () => Promise<void>;
}

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  updated_at: string | null;
}

const UserManagement: React.FC<UserManagementProps> = ({ language, onRefreshUsers }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // 调用 Edge Function profile-access
      const response = await fetch(`${SUPABASE_URL}/functions/v1/profile-access`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result.data);

      if (result.data) {
        setUsers(result.data.map((p: ProfileData) => ({
          id: p.id,
          email: p.email || '',
          name: p.name || '',
          avatar: undefined,
          role: 0,
          dailyGoal: 20,
          streak: 0,
          createdAt: p.updated_at
        })));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      // 如果 Edge Function 调用失败，回退到 cloudService
      try {
        const users = await cloudService.getAllUsers();
        setUsers(users);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: number) => {
    try {
      await cloudService.updateUserRole(userId, role);
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
      setSelectedUser(null);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(language === 'zh' ? '确定要删除该用户吗？此操作不可恢复。' : 'Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await cloudService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setSelectedUser(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: number | undefined) => {
    if (role === 1) {
      return <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">ADMIN</span>;
    } else if (role === 2) {
      return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">VIP</span>;
    }
    return <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">USER</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">{t(language, 'userManagement.title')}</h1>
          <p className="text-gray-500">{t(language, 'userManagement.desc')}</p>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={language === 'zh' ? '搜索用户...' : 'Search users...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{language === 'zh' ? '用户' : 'User'}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{language === 'zh' ? '角色' : 'Role'}</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{language === 'zh' ? '注册时间' : 'Joined'}</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{language === 'zh' ? '操作' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=random`} 
                          alt={user.name} 
                          className="w-10 h-10 rounded-xl bg-gray-100 object-cover"
                        />
                        <span className="font-bold text-gray-900">{user.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedUser(user); setEditRole(user.role || 0); setIsEditing(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title={language === 'zh' ? '编辑' : 'Edit'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title={language === 'zh' ? '删除' : 'Delete'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-400">
          {language === 'zh' ? `共 ${filteredUsers.length} 位用户` : `${filteredUsers.length} users total`}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {isEditing && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => { setIsEditing(false); setSelectedUser(null); }}></div>
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{language === 'zh' ? '编辑用户' : 'Edit User'}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">{language === 'zh' ? '用户名' : 'Name'}</label>
                <div className="text-gray-900 font-medium">{selectedUser.name}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Email</label>
                <div className="text-gray-500 text-sm">{selectedUser.email}</div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">{language === 'zh' ? '角色' : 'Role'}</label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: language === 'zh' ? '普通用户' : 'User' },
                    { value: 1, label: language === 'zh' ? '管理员' : 'Admin' },
                    { value: 2, label: 'VIP' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setEditRole(option.value)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        editRole === option.value 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setIsEditing(false); setSelectedUser(null); }}
                className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                {language === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button 
                onClick={() => handleRoleChange(selectedUser.id, editRole)}
                className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                {language === 'zh' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
