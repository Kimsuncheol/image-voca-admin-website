import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";

interface GenerateSubmitButtonProps {
  loading: boolean;
  onClick: () => void;
}

/** Submit button for the Generate tab — shows a loading spinner while generating. */
export default function GenerateSubmitButton({
  loading,
  onClick,
}: GenerateSubmitButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="contained"
      size="large"
      onClick={onClick}
      disabled={loading}
      startIcon={
        loading ? <CircularProgress size={18} color="inherit" /> : undefined
      }
    >
      {loading
        ? t("promotionCodes.generating")
        : t("promotionCodes.generateCodes")}
    </Button>
  );
}
