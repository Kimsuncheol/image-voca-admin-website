"use client";

import { useCallback, useRef } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";

interface CellContextMenuProps {
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  onCopy: () => void;
  onEdit: (() => void) | null;
  onGenerate: (() => void) | null;
}

export default function CellContextMenu({
  anchorPosition,
  onClose,
  onCopy,
  onEdit,
  onGenerate,
}: CellContextMenuProps) {
  const { t } = useTranslation();
  const deferredActionRef = useRef<(() => void) | null>(null);

  const handleCopy = useCallback(() => {
    deferredActionRef.current = null;
    onCopy();
    onClose();
  }, [onClose, onCopy]);

  const handleEdit = useCallback(() => {
    if (!onEdit) return;
    deferredActionRef.current = onEdit;
    onClose();
  }, [onClose, onEdit]);

  const handleGenerate = useCallback(() => {
    if (!onGenerate) return;
    deferredActionRef.current = null;
    onGenerate();
    onClose();
  }, [onClose, onGenerate]);

  const handleExited = useCallback(() => {
    const deferredAction = deferredActionRef.current;
    deferredActionRef.current = null;
    deferredAction?.();
  }, []);

  return (
    <Menu
      open={Boolean(anchorPosition)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition ?? undefined}
      disableRestoreFocus
      TransitionProps={{ onExited: handleExited }}
    >
      <MenuItem onClick={handleCopy}>
        {t("words.contextMenuCopy")}
      </MenuItem>
      <MenuItem disabled={onEdit === null} onClick={onEdit ? handleEdit : undefined}>
        {t("words.contextMenuEdit")}
      </MenuItem>
      <MenuItem
        disabled={onGenerate === null}
        onClick={onGenerate ? handleGenerate : undefined}
      >
        {t("words.contextMenuGenerate")}
      </MenuItem>
    </Menu>
  );
}
