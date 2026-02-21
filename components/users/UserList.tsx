'use client';

import { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { AppUser, UserRole } from '@/types/user';

interface UserListProps {
  users: AppUser[];
  currentUserRole: UserRole;
  currentUserUid: string;
  onDelete: (uid: string) => void;
}

const roleColors: Record<UserRole, 'error' | 'warning' | 'default'> = {
  'super-admin': 'error',
  admin: 'warning',
  user: 'default',
};

export default function UserList({ users, currentUserRole, currentUserUid, onDelete }: UserListProps) {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const canDelete = (target: AppUser): boolean => {
    if (target.uid === currentUserUid) return false;
    if (currentUserRole === 'super-admin') return true;
    if (currentUserRole === 'admin' && target.role === 'user') return true;
    return false;
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.uid);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('users.username')}</TableCell>
              <TableCell>{t('users.role')}</TableCell>
              <TableCell align="right">{t('users.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.displayName || user.email}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={roleColors[user.role]} size="small" />
                </TableCell>
                <TableCell align="right">
                  {canDelete(user) && (
                    <IconButton
                      color="error"
                      onClick={() => setDeleteTarget(user)}
                      aria-label={t('users.delete')}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('users.delete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('users.deleteConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
