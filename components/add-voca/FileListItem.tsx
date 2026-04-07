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
  secondaryLabel?: string;
  hasData: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export default function FileListItem({
  label,
  dayName,
  secondaryLabel,
  hasData,
  onClick,
  onDelete,
}: FileListItemProps) {
  return (
    <ListItem
      disablePadding
      sx={{ mb: 1, '&:last-of-type': { mb: 0 } }}
      secondaryAction={
        <IconButton edge="end" aria-label="delete" onClick={onDelete} size="small" sx={{ mr: 0.5 }}>
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemButton
        onClick={onClick}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          py: 1.1,
          pr: 7,
          transition: 'border-color 120ms ease, background-color 120ms ease',
          '&:hover': {
            borderColor: 'text.disabled',
            bgcolor: 'action.hover',
          },
        }}
      >
        {hasData && <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />}
        <ListItemText
          primary={label}
          secondary={secondaryLabel}
          primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
          secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary', noWrap: true }}
        />
        {dayName && (
          <Chip
            label={dayName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 4.5, height: 24, borderRadius: 1.5 }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
}
