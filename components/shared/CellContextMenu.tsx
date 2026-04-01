"use client";

import { useCallback, useRef } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";

interface CellContextMenuProps {
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  onCopy: () => void;
  onEdit?: (() => void) | null;
  onTranslate?: (() => void) | null;
  translateLabel?: string;
  onAddFurigana?: (() => void) | null;
  addFuriganaLabel?: string;
  onGenerate: (() => void) | null;
}

export default function CellContextMenu({
  anchorPosition,
  onClose,
  onCopy,
  onEdit,
  onTranslate = null,
  translateLabel,
  onAddFurigana = null,
  addFuriganaLabel,
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

  const handleTranslate = useCallback(() => {
    if (!onTranslate) return;
    deferredActionRef.current = onTranslate;
    onClose();
  }, [onClose, onTranslate]);

  const handleAddFurigana = useCallback(() => {
    if (!onAddFurigana) return;
    deferredActionRef.current = null;
    onAddFurigana();
    onClose();
  }, [onAddFurigana, onClose]);

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
      {onTranslate ? (
        <MenuItem onClick={handleTranslate}>
          {translateLabel || t("words.contextMenuTranslate", "Translate")}
        </MenuItem>
      ) : null}
      {onAddFurigana ? (
        <MenuItem onClick={handleAddFurigana}>
          {addFuriganaLabel || t("words.contextMenuAddFurigana")}
        </MenuItem>
      ) : null}
      {onGenerate !== null ? (
        <MenuItem onClick={handleGenerate}>
          {t("words.contextMenuGenerate")}
        </MenuItem>
      ) : null}
    </Menu>
  );
}
