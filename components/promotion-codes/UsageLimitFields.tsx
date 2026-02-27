import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

interface UsageLimitFieldsProps {
  maxUses: string;
  maxUsesPerUser: string;
  onMaxUsesChange: (val: string) => void;
  onMaxUsesPerUserChange: (val: string) => void;
}

/** Max total uses and max uses per user numeric inputs. */
export default function UsageLimitFields({
  maxUses,
  maxUsesPerUser,
  onMaxUsesChange,
  onMaxUsesPerUserChange,
}: UsageLimitFieldsProps) {
  const { t } = useTranslation();

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        label={t("promotionCodes.maxUses")}
        type="number"
        value={maxUses}
        onChange={(e) => onMaxUsesChange(e.target.value)}
        inputProps={{ min: 0 }}
        fullWidth
      />
      <TextField
        label={t("promotionCodes.maxUsesPerUser")}
        type="number"
        value={maxUsesPerUser}
        onChange={(e) => onMaxUsesPerUserChange(e.target.value)}
        inputProps={{ min: 1 }}
        fullWidth
      />
    </Stack>
  );
}
