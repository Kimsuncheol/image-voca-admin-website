"use client";

import { useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Link from "@mui/material/Link";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageIcon from "@mui/icons-material/Image";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useTranslation } from "react-i18next";
import type { Ad } from "@/types/ad";

interface AdListProps {
  ads: Ad[];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export default function AdList({ ads, onToggle, onDelete }: AdListProps) {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t("ads.adCount", { count: ads.length })}
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("ads.type")}</TableCell>
              <TableCell>{t("ads.adTitle")}</TableCell>
              <TableCell>{t("ads.description")}</TableCell>
              <TableCell>{t("ads.media")}</TableCell>
              <TableCell align="center">{t("ads.status")}</TableCell>
              <TableCell>{t("ads.createdAt")}</TableCell>
              <TableCell align="right">{t("users.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ads.map((ad) => (
              <TableRow key={ad.id}>
                {/* Type chip */}
                <TableCell>
                  <Chip
                    icon={
                      ad.type === "image" ? <ImageIcon /> : <VideocamIcon />
                    }
                    label={
                      ad.type === "image" ? t("ads.image") : t("ads.video")
                    }
                    size="small"
                    variant="outlined"
                  />
                </TableCell>

                {/* Title */}
                <TableCell>{ad.title}</TableCell>

                {/* Description */}
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 200 }}
                    noWrap
                  >
                    {ad.description || "—"}
                  </Typography>
                </TableCell>

                {/* Media preview */}
                <TableCell>
                  {ad.type === "image" && ad.imageUrl ? (
                    <Box
                      component="img"
                      src={ad.imageUrl}
                      alt={ad.title}
                      sx={{
                        maxHeight: 48,
                        maxWidth: 80,
                        objectFit: "cover",
                        borderRadius: 0.5,
                      }}
                    />
                  ) : ad.videoUrl ? (
                    <Link
                      href={ad.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ad.videoUrl.length > 40
                        ? `${ad.videoUrl.slice(0, 40)}…`
                        : ad.videoUrl}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Active toggle */}
                <TableCell align="center">
                  <Switch
                    checked={ad.active}
                    onChange={() => onToggle(ad.id, !ad.active)}
                    color="success"
                  />
                </TableCell>

                {/* Created date */}
                <TableCell>
                  {ad.createdAt?.toDate().toLocaleDateString()}
                </TableCell>

                {/* Delete */}
                <TableCell align="right">
                  <IconButton
                    color="error"
                    onClick={() => setDeleteTarget(ad.id)}
                    aria-label={t("ads.delete")}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t("ads.delete")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("ads.deleteConfirm")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
