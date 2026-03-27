import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";

export const derivativeDialogContentScrollbarSx: SystemStyleObject<Theme> = {
  "&::-webkit-scrollbar": {
    width: 0,
  },
  "&::-webkit-scrollbar-track": {
    borderRadius: 999,
    bgcolor: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: 999,
    bgcolor: "transparent",
    transition: "background-color 0.2s ease",
  },
  '&[data-scrollbar-active="true"]::-webkit-scrollbar': {
    width: 8,
  },
  '&[data-scrollbar-active="true"]::-webkit-scrollbar-thumb': {
    bgcolor: "text.disabled",
  },
  '&[data-scrollbar-active="true"]::-webkit-scrollbar-thumb:hover': {
    bgcolor: "text.secondary",
  },
  scrollbarWidth: "none",
  scrollbarColor: "transparent transparent",
  '&[data-scrollbar-active="true"]': {
    scrollbarWidth: "thin",
    scrollbarColor: (theme) => `${theme.palette.text.disabled} transparent`,
  },
};
