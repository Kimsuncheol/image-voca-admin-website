'use client';

import { useState, useEffect, useCallback } from 'react';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import PageLayout from '@/components/layout/PageLayout';
import type { AppUser } from '@/types/user';
import UserList from '@/components/users/UserList';

export default function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError(t('courses.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (uid: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });

      if (!res.ok) throw new Error();

      setMessage({ type: 'success', text: t('users.deleteSuccess') });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch {
      setMessage({ type: 'error', text: t('users.deleteError') });
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t('users.title')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {users.length === 0 && !error ? (
        <Typography color="text.secondary">{t('users.noUsers')}</Typography>
      ) : (
        <UserList
          users={users}
          currentUserRole={user?.role || 'user'}
          currentUserUid={user?.uid || ''}
          onDelete={handleDelete}
        />
      )}
    </PageLayout>
  );
}
