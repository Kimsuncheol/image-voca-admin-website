'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { Day } from '@/types/course';

interface DayCardProps {
  day: Day;
  courseId: string;
  onRemove?: () => void;
  onUpdate?: () => void;
}

export default function DayCard({ day, courseId, onRemove, onUpdate }: DayCardProps) {
  const router = useRouter();
  const [contextMenu, setContextMenu] = useState<{ top: number; left: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ top: e.clientY, left: e.clientX });
  };

  const handleClose = () => setContextMenu(null);

  return (
    <>
      <Card
        sx={{ height: "100%", aspectRatio: "1 / 1" }}
        onContextMenu={handleContextMenu}
      >
        <CardActionArea
          onClick={() => router.push(`/courses/${courseId}/${day.id}`)}
          sx={{ height: "100%" }}
        >
          <CardContent
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="h6"
                noWrap
                title={day.name}
                sx={{ minWidth: 0, flex: 1 }}
              >
                {day.name}
              </Typography>
              {day.wordCount !== undefined && (
                <Chip
                  label={`${day.wordCount} words`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ?? undefined}
      >
        {onUpdate && (
          <MenuItem
            onClick={() => {
              handleClose();
              onUpdate();
            }}
          >
            Update
          </MenuItem>
        )}
        {onRemove && (
          <MenuItem
            onClick={() => {
              handleClose();
              onRemove();
            }}
            sx={{ color: "error.main" }}
          >
            Remove
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
