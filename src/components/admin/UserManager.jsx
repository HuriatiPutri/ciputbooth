import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, UserX, UserCheck, Trash2, RefreshCw } from 'lucide-react';
import { Button, GlassCard, Badge, Modal } from '../common';
import { useAuth } from '../../context/AuthContext';

const INPUT_CLASS = "w-full bg-slate-900 border border-white/10 text-white px-4 py-3 rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50";

export default function UserManager() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stats, setStats] = useState({ activeUsers: 0, totalSessions: 0 });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/users/stats')
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const newUser = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      setUsers([newUser, ...users]);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
      
      // Update stats count optimistically
      setStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + 1 // New users are active by default
      }));
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const updatedUser = await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive })
      });
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + (updatedUser.isActive ? 1 : -1)
      }));
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const userToDelete = users.find(u => u.id === userId);
      await authFetch(`/api/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== userId));
      
      if (userToDelete && userToDelete.isActive) {
        setStats(prev => ({
          ...prev,
          activeUsers: Math.max(0, prev.activeUsers - 1)
        }));
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-violet-400" />
            User Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage vendor accounts, roles, and subscriptions</p>
        </div>
        
        <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={UserPlus}>
          Add New User
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <GlassCard className="p-6 flex items-center justify-between bg-violet-500/10 border-violet-500/20">
          <div>
            <p className="text-slate-400 text-sm font-semibold">Active Vendors</p>
            <p className="text-3xl font-bold font-display text-white mt-1">{stats.activeUsers}</p>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/20 text-violet-400">
            <Users className="w-8 h-8" />
          </div>
        </GlassCard>
        
        <GlassCard className="p-6 flex items-center justify-between bg-pink-500/10 border-pink-500/20">
          <div>
            <p className="text-slate-400 text-sm font-semibold">Total Sessions</p>
            <p className="text-3xl font-bold font-display text-white mt-1">{stats.totalSessions}</p>
          </div>
          <div className="p-4 rounded-xl bg-pink-500/20 text-pink-400">
            <Shield className="w-8 h-8" />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-white/10 text-slate-300 text-sm">
                  <th className="p-4 font-semibold">Name & Email</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-sm text-slate-400">{user.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === 'admin' ? 'violet' : 'blue'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          user.isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {user.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User"
        subtitle="Add a new vendor or admin to the platform"
        icon={UserPlus}
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className={INPUT_CLASS}
            >
              <option value="user">Vendor / User</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>
          
          {submitError && <div className="text-rose-400 text-sm">{submitError}</div>}
          
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
