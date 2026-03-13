import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useTranslation } from "react-i18next";

interface PendingDeviceDelete {
  uid: string;
  deviceId: string;
  deviceLabel: string;
}

interface UserDevicesConfirmDialogProps {
  pendingDelete: PendingDeviceDelete | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export type { PendingDeviceDelete };

export default function UserDevicesConfirmDialog({
  pendingDelete,
  isSubmitting,
  onConfirm,
  onCancel,
}: UserDevicesConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={!!pendingDelete}
      onClose={() => {
        if (!isSubmitting) {
          onCancel();
        }
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("users.confirmActionTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {pendingDelete
            ? t("users.devices.deleteConfirm", {
                device: pendingDelete.deviceLabel,
              })
            : ""}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isSubmitting}>
          {t("common.no")}
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isSubmitting}
        >
          {t("common.yes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
