import { useState, useEffect, useCallback } from 'react';

export function useStats(refreshInterval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { api } = await import('../lib/api');
      const stats = await api.getStats();
      setData(stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  return { data, loading, error, refresh: fetchStats };
}

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { api } = await import('../lib/api');
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refresh: fetchUsers };
}

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      const { api } = await import('../lib/api');
      const data = await api.getServices();
      setServices(data);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, refresh: fetchServices };
}

export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socket = io();
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      return () => socket.disconnect();
    });
  }, []);

  return connected;
}
