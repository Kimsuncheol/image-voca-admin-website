"use client";

import type { KeyboardEvent } from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

interface InlineEditableTextProps {
  value: string;
  emptyLabel?: string;
  isEditing: boolean;
  draft: string;
  saving: boolean;
  error?: string;
  onActivate: () => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  textVariant?: "body1" | "body2";
  fontWeight?: number;
  sx?: SxProps<Theme>;
}

export default function InlineEditableText({
  value,
  emptyLabel,
  isEditing,
  draft,
  saving,
  error = "",
  onActivate,
  onDraftChange,
  onCommit,
  onCancel,
  textVariant = "body1",
  fontWeight,
  sx,
}: InlineEditableTextProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <TextField
        autoFocus
        fullWidth
        size="small"
        value={draft}
        disabled={saving}
        error={Boolean(error)}
        helperText={error || undefined}
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <Typography
      variant={textVariant}
      fontWeight={fontWeight}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      sx={[
        {
          cursor: "pointer",
          "&:hover": {
            color: "primary.main",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {value || emptyLabel || ""}
    </Typography>
  );
}
