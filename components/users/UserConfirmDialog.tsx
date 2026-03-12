import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";
import type { ConfirmActionPayload } from "./UserDetailModal";

interface UserConfirmDialogProps {
  pendingAction: ConfirmActionPayload | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UserConfirmDialog({
  pendingAction,
  isSubmitting,
  onConfirm,
  onCancel,
}: UserConfirmDialogProps) {
  const { t } = useTranslation();

  const getConfirmMessage = (): string => {
    if (!pendingAction) return "";
    if (pendingAction.type === "delete") {
      return t("users.deleteConfirm");
    }
    if (pendingAction.type === "roleChange") {
      return t("users.confirmRoleChange");
    }
    if (pendingAction.type === "adminPermissionsChange") {
      return t("users.confirmAdminPermissionsChange");
    }
    return t("users.confirmPlanChange");
  };

  return (
    <Dialog open={!!pendingAction} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t("users.confirmActionTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>{getConfirmMessage()}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isSubmitting}>
          {t("common.no")}
        </Button>
        <Button
          onClick={onConfirm}
          color={pendingAction?.type === "delete" ? "error" : "primary"}
          variant="contained"
          disabled={isSubmitting}
        >
          {t("common.yes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
