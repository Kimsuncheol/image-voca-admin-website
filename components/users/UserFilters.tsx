import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import Chip from "@mui/material/Chip";
import { useTranslation } from "react-i18next";
import type { UserPlan } from "@/types/user";

interface UserFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  planFilter: UserPlan | "all";
  onPlanFilterChange: (filter: UserPlan | "all") => void;
  roleFilter: "all" | "admin" | "super-admin";
  onRoleFilterChange: (filter: "all" | "admin" | "super-admin") => void;
}

export default function UserFilters({
  search,
  onSearchChange,
  planFilter,
  onPlanFilterChange,
  roleFilter,
  onRoleFilterChange,
}: UserFiltersProps) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <TextField
        size="small"
        placeholder={t("users.search")}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          maxWidth: 360,
          "& .MuiOutlinedInput-root": {
            borderRadius: "10px",
          },
        }}
      />
      <Stack
        direction="row"
        spacing={3}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
        {/* plan filter */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={t("users.allPlans")}
            onClick={() => onPlanFilterChange("all")}
            color={planFilter === "all" ? "primary" : "default"}
            variant={planFilter === "all" ? "filled" : "outlined"}
          />
          <Chip
            size="small"
            label={t("users.planFree")}
            onClick={() => onPlanFilterChange("free")}
            color={planFilter === "free" ? "primary" : "default"}
            variant={planFilter === "free" ? "filled" : "outlined"}
          />
          <Chip
            size="small"
            label={t("users.planVocaUnlimited")}
            onClick={() => onPlanFilterChange("voca_unlimited")}
            color={planFilter === "voca_unlimited" ? "primary" : "default"}
            variant={planFilter === "voca_unlimited" ? "filled" : "outlined"}
          />
        </Stack>
        {/* role filter */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={t("users.allRoles")}
            onClick={() => onRoleFilterChange("all")}
            color={roleFilter === "all" ? "secondary" : "default"}
            variant={roleFilter === "all" ? "filled" : "outlined"}
          />
          <Chip
            size="small"
            label={t("users.adminOnly")}
            onClick={() => onRoleFilterChange("admin")}
            color={roleFilter === "admin" ? "secondary" : "default"}
            variant={roleFilter === "admin" ? "filled" : "outlined"}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
