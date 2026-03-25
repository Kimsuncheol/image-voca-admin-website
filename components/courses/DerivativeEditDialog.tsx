"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

interface DerivativeItem {
  word: string;
  meaning: string;
}

interface DerivativeEditDialogProps {
  open: boolean;
  initial: DerivativeItem[];
  onClose: () => void;
  onSave: (items: DerivativeItem[]) => void;
}

export default function DerivativeEditDialog({
  open,
  initial,
  onClose,
  onSave,
}: DerivativeEditDialogProps) {
  const [items, setItems] = useState<DerivativeItem[]>(() =>
    initial.map((i) => ({ ...i }))
  );

  const handleChange = (index: number, field: keyof DerivativeItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, { word: "", meaning: "" }]);
  };

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(items.filter((i) => i.word.trim() || i.meaning.trim()));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Derivatives</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
          {items.map((item, index) => (
            <Box key={index} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Word"
                size="small"
                value={item.word}
                onChange={(e) => handleChange(index, "word", e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Meaning"
                size="small"
                value={item.meaning}
                onChange={(e) => handleChange(index, "meaning", e.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={() => handleDelete(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAdd} size="small" sx={{ alignSelf: "flex-start" }}>
            Add
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
}
