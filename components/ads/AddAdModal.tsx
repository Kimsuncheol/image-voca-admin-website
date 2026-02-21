"use client";

import { useState, useRef } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import type { AdFormData, AdType } from "@/types/ad";

interface AddAdModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: AdFormData) => void;
}

export default function AddAdModal({ open, onClose, onAdd }: AddAdModalProps) {
  const { t } = useTranslation();
  const [adType, setAdType] = useState<AdType>("video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setAdType("video");
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setImageFile(null);
  };

  const isValid = () => {
    if (!title.trim()) return false;
    if (adType === "video" && !videoUrl.trim().startsWith("http")) return false;
    if (adType === "image" && !imageFile) return false;
    return true;
  };

  const handleAdd = () => {
    if (!isValid()) return;
    onAdd({
      type: adType,
      title: title.trim(),
      description: description.trim(),
      videoUrl: adType === "video" ? videoUrl.trim() : undefined,
      imageFile: adType === "image" ? imageFile! : undefined,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onExited: handleReset }}
    >
      <DialogTitle>{t("ads.addAd")}</DialogTitle>
      <DialogContent>
        {/* Type selector */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, mb: 1 }}
        >
          {t("ads.type")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Chip
            icon={<VideocamIcon />}
            label={t("ads.video")}
            onClick={() => setAdType("video")}
            color={adType === "video" ? "primary" : "default"}
            variant={adType === "video" ? "filled" : "outlined"}
          />
          <Chip
            icon={<ImageIcon />}
            label={t("ads.image")}
            onClick={() => setAdType("image")}
            color={adType === "image" ? "primary" : "default"}
            variant={adType === "image" ? "filled" : "outlined"}
          />
        </Box>

        {/* Title */}
        <TextField
          label={t("ads.adTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          margin="normal"
          required
        />

        {/* Description */}
        <TextField
          label={t("ads.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          rows={2}
        />

        {/* Video URL or Image picker */}
        {adType === "video" ? (
          <TextField
            label={t("ads.videoUrl")}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            fullWidth
            margin="normal"
            placeholder={t("ads.urlPlaceholder")}
            required
          />
        ) : (
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) setImageFile(e.target.files[0]);
              }}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              fullWidth
            >
              {imageFile ? imageFile.name : t("ads.selectImage")}
            </Button>
            {imageFile && (
              <Box
                component="img"
                src={URL.createObjectURL(imageFile)}
                alt="preview"
                sx={{
                  mt: 1,
                  maxHeight: 200,
                  width: "100%",
                  objectFit: "contain",
                  borderRadius: 1,
                }}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!isValid()}>
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
