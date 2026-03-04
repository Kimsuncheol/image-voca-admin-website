'use client';

import { useState } from 'react';
import ListItem from '@mui/material/ListItem';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

interface QuoteListItemProps {
  quote: string;
  author: string;
  translation: string;
  onClick: () => void;
  onDelete: () => void;
}

export default function QuoteListItem({
  quote,
  author,
  translation,
  onClick,
  onDelete,
}: QuoteListItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <ListItem
      disablePadding
      sx={{ mb: 1, '&:last-of-type': { mb: 0 } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      secondaryAction={
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={onDelete}
          size="small"
          sx={{
            mr: 0.5,
            color: hovered ? 'error.main' : 'action.disabled',
            transition: 'color 150ms ease',
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      }
    >
      <ButtonBase
        onClick={onClick}
        sx={{
          width: '100%',
          textAlign: 'left',
          display: 'block',
          border: '1px solid',
          borderColor: hovered ? 'text.disabled' : 'divider',
          borderRadius: 2.5,
          px: 2,
          py: 1.25,
          pr: 7,
          bgcolor: hovered ? 'action.hover' : 'transparent',
          transition: 'background-color 150ms ease, border-color 150ms ease',
        }}
      >
        {/* Row 1 — quote */}
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          sx={{
            color: hovered ? 'primary.main' : 'text.primary',
            transition: 'color 150ms ease',
          }}
        >
          {quote}
        </Typography>

        {/* Row 2 — author */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: hovered ? 'primary.light' : 'text.secondary',
            transition: 'color 150ms ease',
          }}
        >
          {author}
        </Typography>

        {/* Row 3 — translation */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            fontStyle: 'italic',
            color: hovered ? 'primary.light' : 'text.disabled',
            transition: 'color 150ms ease',
          }}
        >
          {translation}
        </Typography>
      </ButtonBase>
    </ListItem>
  );
}
