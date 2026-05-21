import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Ban, Shield, Clock, Search } from 'lucide-react';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useUsers } from '../hooks/useData';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

export default function Users() {
  const { users, loading, refresh } = useUsers();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [muteModalOpen, setMuteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [muteDuration, setMuteDuration] = useState('1h');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const durations = ['1m', '5m', '30m', '1h', '5h', '10h', '24h', '7d'];

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search);
    if (filter === 'all') return matchesSearch;
    if (filter === 'banned') return matchesSearch && u.is_banned;
    if (filter === 'blacklisted') return matchesSearch && u.is_blacklisted;
    if (filter === 'muted') return matchesSearch && u.mute_until > Math.floor(Date.now() / 1000);
    return matchesSearch;
  });

  const handleAction = async (action, userId) => {
    setActionLoading(true);
    try {
      await api[action](userId, muteDuration);
      addToast('Action completed', 'success');
      refresh();
    } catch (err) {
      addToast(err.message, 'error');
    }
    setActionLoading(false);
    setMuteModalOpen(false);
  };

  const openMuteModal = (user) => {
    setSelectedUser(user);
    setMuteModalOpen(true);
  };

  const filters = [
    { key: 'all', label: 'All', icon: UsersIcon },
    { key: 'banned', label: 'Banned', icon: Ban },
    { key: 'blacklisted', label: 'Blacklisted', icon: Shield },
    { key: 'muted', label: 'Muted', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">{users.length} total users</p>
      </motion.div>

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {f.label}
              </motion.button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="h-16 bg-muted rounded shimmer"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {user.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.username || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {user.is_banned && <Badge variant="error">Banned</Badge>}
                        {user.is_blacklisted && <Badge variant="warning">Blacklisted</Badge>}
                        {user.mute_until > Math.floor(Date.now() / 1000) && (
                          <Badge variant="info">Muted</Badge>
                        )}
                        {!user.is_banned && !user.is_blacklisted && user.mute_until <= Math.floor(Date.now() / 1000) && (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.is_banned ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAction('unbanUser', user.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                          >
                            Unban
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAction('banUser', user.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-medium"
                          >
                            Ban
                          </motion.button>
                        )}
                        {user.is_blacklisted ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAction('unblacklistUser', user.id)}
                            className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent transition-colors text-xs font-medium"
                          >
                            Unblacklist
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAction('blacklistUser', user.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors text-xs font-medium"
                          >
                            Blacklist
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openMuteModal(user)}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                        >
                          Mute
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Mute Modal */}
      <Modal isOpen={muteModalOpen} onClose={() => setMuteModalOpen(false)} title={`Mute ${selectedUser?.username}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((d) => (
                <motion.button
                  key={d}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMuteDuration(d)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    muteDuration === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {d}
                </motion.button>
              ))}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleAction('muteUser', selectedUser?.id)}
            disabled={actionLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
          >
            Apply Mute
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
