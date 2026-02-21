'use client';

import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Chip from '@mui/material/Chip';

interface FileListItemProps {
  label: string;
  dayName?: string;
  hasData: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export default function FileListItem({ label, dayName, hasData, onClick, onDelete }: FileListItemProps) {
  return (
    <ListItem
      disablePadding
      secondaryAction={
        <IconButton edge="end" aria-label="delete" onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemButton onClick={onClick}>
        {hasData && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
        <ListItemText
          primary={label}
          secondary={dayName || undefined}
        />
        {dayName && <Chip label={dayName} size="small" sx={{ mr: 4 }} />}
      </ListItemButton>
    </ListItem>
  );
}
