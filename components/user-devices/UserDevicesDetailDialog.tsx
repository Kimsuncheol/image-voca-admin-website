import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";

import type {
  AdminManagedDeviceListItem,
  DeviceRegistrationRecord,
} from "@/types/device";

import {
  formatDeviceTimestamp,
  formatDeviceValue,
  getDeviceTitle,
} from "./utils";

interface UserDevicesDetailDialogProps {
  user: AdminManagedDeviceListItem;
  canDeleteDevices: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onRequestDelete: (device: DeviceRegistrationRecord) => void;
}

interface DeviceMetaRowProps {
  label: string;
  value: string;
}

function DeviceMetaRow({ label, value }: DeviceMetaRowProps) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export default function UserDevicesDetailDialog({
  user,
  canDeleteDevices,
  isDeleting,
  onClose,
  onRequestDelete,
}: UserDevicesDetailDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open
      onClose={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{t("users.devices.detailTitle")}</DialogTitle>
      <DialogContent sx={{ overflowX: "hidden" }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography fontWeight={600}>
                {user.displayName || user.email}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {user.email}
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Chip label={user.role} size="small" />
              <Chip
                label={t("users.devices.deviceCount", {
                  count: user.registeredDeviceCount,
                  max: user.maxRegisteredDevices,
                })}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Stack>

          <Divider />

          {user.devices.length === 0 ? (
            <Typography color="text.secondary">
              {t("users.devices.noDevices")}
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {user.devices.map((device) => (
                <Paper key={device.deviceId} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          fontWeight={600}
                          sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                        >
                          {getDeviceTitle(device)}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                        >
                          {device.deviceId}
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={device.platform} size="small" />
                        <Chip
                          label={device.notificationPermissionStatus}
                          size="small"
                          variant="outlined"
                        />
                        {canDeleteDevices && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => onRequestDelete(device)}
                            disabled={isDeleting}
                          >
                            {t("users.devices.removeDevice")}
                          </Button>
                        )}
                      </Stack>
                    </Stack>

                    <Stack
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          md: "repeat(3, minmax(0, 1fr))",
                        },
                      }}
                    >
                      <DeviceMetaRow
                        label={t("users.devices.platform")}
                        value={device.platform}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.brand")}
                        value={formatDeviceValue(device.brand)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.manufacturer")}
                        value={formatDeviceValue(device.manufacturer)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.modelName")}
                        value={formatDeviceValue(device.modelName)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.deviceType")}
                        value={formatDeviceValue(device.deviceType)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.osName")}
                        value={formatDeviceValue(device.osName)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.osVersion")}
                        value={formatDeviceValue(device.osVersion)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.appVersion")}
                        value={formatDeviceValue(device.appVersion)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.appBuild")}
                        value={formatDeviceValue(device.appBuild)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.authProvider")}
                        value={device.authProvider}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.notificationPermissionStatus")}
                        value={device.notificationPermissionStatus}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.expoPushToken")}
                        value={formatDeviceValue(device.expoPushToken)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.createdAt")}
                        value={formatDeviceTimestamp(device.createdAt)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.updatedAt")}
                        value={formatDeviceTimestamp(device.updatedAt)}
                      />
                      <DeviceMetaRow
                        label={t("users.devices.lastSeenAt")}
                        value={formatDeviceTimestamp(device.lastSeenAt)}
                      />
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (!isDeleting) {
              onClose();
            }
          }}
        >
          {t("common.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
