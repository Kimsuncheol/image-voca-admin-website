"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
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
  const [copied, setCopied] = useState(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (clickTimerRef.current) {
      // Second click within 250ms → double-click → activate edit
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onActivate();
    } else {
      // First click — wait to see if a second follows
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        if (value) {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }, 250);
    }
  }, [onActivate, value]);

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

  const tooltipTitle = copied
    ? "Copied!"
    : value
      ? "Click to copy · Double-click to edit"
      : "Double-click to edit";

  return (
    <Tooltip title={tooltipTitle} placement="top" arrow>
      <Typography
        variant={textVariant}
        fontWeight={fontWeight}
        onClick={handleClick}
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
    </Tooltip>
  );
}
