"use client";

import Box from "@mui/material/Box";

interface WordFinderRadioIndicatorProps {
  isSelected: boolean;
}

export default function WordFinderRadioIndicator({ isSelected }: WordFinderRadioIndicatorProps) {
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "2px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        mt: 0.25,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {isSelected && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </Box>
  );
}
