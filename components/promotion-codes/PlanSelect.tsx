import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";
import type { PlanType } from "@/types/promotionCode";

interface PlanSelectProps {
  value: PlanType;
  onChange: (value: PlanType) => void;
}

/** Dropdown for selecting the subscription plan granted by the promotion code. */
export default function PlanSelect({ value, onChange }: PlanSelectProps) {
  const { t } = useTranslation();

  return (
    <FormControl fullWidth>
      <InputLabel>{t("promotionCodes.plan")}</InputLabel>
      <Select
        value={value}
        label={t("promotionCodes.plan")}
        onChange={(e) => onChange(e.target.value as PlanType)}
      >
        <MenuItem value="voca_unlimited">Voca Unlimited</MenuItem>
        <MenuItem value="voca_speaking">Voca Speaking</MenuItem>
      </Select>
    </FormControl>
  );
}
