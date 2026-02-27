import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

interface DurationFieldsProps {
  isPermanent: boolean;
  durationDays: string;
  onIsPermanentChange: (val: boolean) => void;
  onDurationDaysChange: (val: string) => void;
}

/**
 * Permanent toggle switch.
 * When not permanent, shows a numeric input for the number of duration days.
 */
export default function DurationFields({
  isPermanent,
  durationDays,
  onIsPermanentChange,
  onDurationDaysChange,
}: DurationFieldsProps) {
  const { t } = useTranslation();

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={isPermanent}
            onChange={(e) => onIsPermanentChange(e.target.checked)}
          />
        }
        label={t("promotionCodes.permanent")}
      />
      {!isPermanent && (
        <TextField
          label={t("promotionCodes.durationDays")}
          type="number"
          value={durationDays}
          onChange={(e) => onDurationDaysChange(e.target.value)}
          inputProps={{ min: 1 }}
          fullWidth
          sx={{ mt: 2 }}
        />
      )}
    </Box>
  );
}
