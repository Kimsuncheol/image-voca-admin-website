"use client";

import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { getWordFinderResultKey } from "@/lib/wordFinderMissingFieldActions";
import type { WordFinderActionField, WordFinderResult } from "@/types/wordFinder";
import WordFinderCandidateCard from "./WordFinderCandidateCard";

interface WordFinderSharedCandidatesSectionProps {
  field: WordFinderActionField;
  fieldLabel: string;
  sharedCandidates: WordFinderResult[];
  sharedLoading: boolean;
  sharedLookupError: string;
  selectedSharedKey: string;
  noDayLabel: string;
  onSelectCandidate: (key: string) => void;
}

export default function WordFinderSharedCandidatesSection({
  field,
  fieldLabel,
  sharedCandidates,
  sharedLoading,
  sharedLookupError,
  selectedSharedKey,
  noDayLabel,
  onSelectCandidate,
}: WordFinderSharedCandidatesSectionProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t("words.sharedSectionTitle")}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t("words.sharedSectionDescription", { field: fieldLabel })}
      </Typography>

      {sharedLookupError && <Alert severity="warning">{sharedLookupError}</Alert>}

      {sharedLoading ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : sharedCandidates.length === 0 ? (
        <Alert severity="info">{t("words.noSharedMatches")}</Alert>
      ) : (
        <Stack spacing={1}>
          {sharedCandidates.map((candidate) => {
            const candidateKey = getWordFinderResultKey(candidate);
            return (
              <WordFinderCandidateCard
                key={candidateKey}
                candidate={candidate}
                field={field}
                isSelected={candidateKey === selectedSharedKey}
                noDayLabel={noDayLabel}
                onSelect={() => onSelectCandidate(candidateKey)}
              />
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
