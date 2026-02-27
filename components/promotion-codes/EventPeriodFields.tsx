import Stack from "@mui/material/Stack";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { type Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

interface EventPeriodFieldsProps {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  onStartDateChange: (val: Dayjs | null) => void;
  onEndDateChange: (val: Dayjs | null) => void;
}

/** Start date + end date pickers for the promotion code event period. */
export default function EventPeriodFields({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: EventPeriodFieldsProps) {
  const { t } = useTranslation();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <DatePicker
          label={t("promotionCodes.startDate")}
          value={startDate}
          onChange={onStartDateChange}
          maxDate={endDate ?? undefined}
          slotProps={{ textField: { fullWidth: true } }}
        />
        <DatePicker
          label={t("promotionCodes.endDate")}
          value={endDate}
          onChange={onEndDateChange}
          minDate={startDate ?? undefined}
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Stack>
    </LocalizationProvider>
  );
}
