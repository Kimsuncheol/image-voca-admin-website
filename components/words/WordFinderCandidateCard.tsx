"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ImageIcon from "@mui/icons-material/Image";

import type { WordFinderActionField, WordFinderResult } from "@/types/wordFinder";
import { formatWordFinderLocation } from "@/lib/wordFinderMissingFieldActions";
import WordFinderRadioIndicator from "./WordFinderRadioIndicator";

interface WordFinderCandidateCardProps {
  candidate: WordFinderResult;
  field: WordFinderActionField;
  isSelected: boolean;
  noDayLabel: string;
  onSelect: () => void;
}

export default function WordFinderCandidateCard({
  candidate,
  isSelected,
  noDayLabel,
  onSelect,
}: WordFinderCandidateCardProps) {
  const location = formatWordFinderLocation(candidate, noDayLabel);

  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      sx={{
        p: 1.5,
        cursor: "pointer",
        borderColor: isSelected ? "primary.main" : "divider",
        backgroundColor: isSelected ? "action.selected" : "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <WordFinderRadioIndicator isSelected={isSelected} />

        {/* Image thumbnail */}
        {candidate.imageUrl ? (
          <Box
            component="img"
            src={candidate.imageUrl}
            alt={candidate.primaryText}
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1,
              flexShrink: 0,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImageIcon fontSize="small" color="disabled" />
          </Box>
        )}

        {/* Text info */}
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {location}
          </Typography>
          <Typography variant="body2" fontWeight={600} noWrap>
            {candidate.primaryText}
          </Typography>
          {candidate.meaning && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {candidate.meaning}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
