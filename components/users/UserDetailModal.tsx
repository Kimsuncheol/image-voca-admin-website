import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import DeleteIcon from "@mui/icons-material/Delete";
import DevicesIcon from "@mui/icons-material/Devices";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  ADMIN_PERMISSION_KEYS,
  getEffectiveAdminPermissions,
} from "@/lib/adminPermissions";
import type { AdminPermissions, AppUser, UserRole, UserPlan } from "@/types/user";
import {
  roleColors,
  planChipColor,
  getPlanLabel,
  formatCreatedAt,
  getPermissionLabel,
} from "./utils";

// The action type will be communicated back to UserList which holds the state
export type ConfirmActionPayload =
  | { type: "delete"; uid: string }
  | { type: "roleChange"; uid: string; nextRole: "user" | "admin" }
  | { type: "planChange"; uid: string; nextPlan: UserPlan }
  | {
      type: "adminPermissionsChange";
      uid: string;
      nextAdminPermissions: AdminPermissions;
    };

interface UserDetailModalProps {
  user: AppUser;
  currentUserRole: UserRole;
  currentUserUid: string;
  currentUserPermissions: AdminPermissions;
  isConfirmSubmitting: boolean;
  onClose: () => void;
  onActionSelect: (action: ConfirmActionPayload) => void;
}

export default function UserDetailModal({
  user,
  currentUserRole,
  currentUserUid,
  currentUserPermissions,
  isConfirmSubmitting,
  onClose,
  onActionSelect,
}: UserDetailModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const effectivePermissions = getEffectiveAdminPermissions(user);
  const navigationButtonSx = {
    borderRadius: 999,
    px: 2.5,
    py: 1,
    textTransform: "none",
    fontWeight: 600,
  } as const;

  const canDelete = (target: AppUser): boolean => {
    if (target.uid === currentUserUid) return false;
    if (currentUserRole === "super-admin") return true;
    if (currentUserRole === "admin" && target.role === "user") return true;
    return false;
  };

  const canChangeRole = (target: AppUser): boolean => {
    if (target.uid === currentUserUid) return false;
    if (target.role === "super-admin") return false;
    return currentUserRole === "super-admin" && currentUserPermissions.roleModification;
  };

  const canChangePlan = (): boolean =>
    currentUserPermissions.planModification;

  const canChangeAdminPermissions = (target: AppUser): boolean =>
    currentUserRole === "super-admin" &&
    target.role === "admin" &&
    target.uid !== currentUserUid;

  const handlePermissionToggle = (permission: keyof AdminPermissions) => {
    if (!canChangeAdminPermissions(user)) return;

    onActionSelect({
      type: "adminPermissionsChange",
      uid: user.uid,
      nextAdminPermissions: {
        ...effectivePermissions,
        [permission]: !effectivePermissions[permission],
      },
    });
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (isConfirmSubmitting) return;
        onClose();
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{t("users.detailTitle")}</DialogTitle>
      <DialogContent sx={{ overflowX: "hidden" }}>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={user.photoURL}
              sx={{ width: 56, height: 56, fontSize: 22 }}
            >
              {(user.displayName || user.email || "?")[0].toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                fontWeight={600}
                sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {user.displayName || "-"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
              >
                {user.email}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          {/* Role row */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              {t("users.role")}
            </Typography>
            {canChangeRole(user) ? (
              <Select
                size="small"
                value={user.role}
                onChange={(e) => {
                  const newRole = e.target.value as "user" | "admin";
                  if (newRole === user.role) return;
                  onActionSelect({
                    type: "roleChange",
                    uid: user.uid,
                    nextRole: newRole,
                  });
                }}
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="user">user</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </Select>
            ) : (
              <Chip
                label={user.role}
                color={roleColors[user.role]}
                size="small"
              />
            )}
          </Stack>

          {/* Plan row */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              {t("users.plan")}
            </Typography>
            {canChangePlan() ? (
              <Select
                size="small"
                value={user.plan || "free"}
                onChange={(e) => {
                  const newPlan = e.target.value as UserPlan;
                  const currentPlan = user.plan || "free";
                  if (newPlan === currentPlan) return;
                  onActionSelect({
                    type: "planChange",
                    uid: user.uid,
                    nextPlan: newPlan,
                  });
                }}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="free">{t("users.planFree")}</MenuItem>
                <MenuItem value="voca_unlimited">
                  {t("users.planVocaUnlimited")}
                </MenuItem>
              </Select>
            ) : (
              <Chip
                label={getPlanLabel(user.plan, t)}
                color={planChipColor(user.plan)}
                size="small"
              />
            )}
          </Stack>

          {/* Joined date */}
          {(() => {
            const dateStr = formatCreatedAt(user.createdAt);
            if (!dateStr) return null;
            return (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  {t("users.joinedAt")}
                </Typography>
                <Typography variant="body2">{dateStr}</Typography>
              </Stack>
            );
          })()}

          {user.role === "super-admin" && (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="body2" color="text.secondary">
                {t("users.permissions")}
              </Typography>
              <Chip
                label={t("users.fullAccess")}
                color="error"
                size="small"
                variant="outlined"
              />
            </Stack>
          )}

          {user.role === "admin" && (
            <>
              <Divider />
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  {t("users.permissions")}
                </Typography>

                {ADMIN_PERMISSION_KEYS.map((permission) => (
                  <Stack
                    key={permission}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {getPermissionLabel(permission, t)}
                    </Typography>

                    {canChangeAdminPermissions(user) ? (
                      <FormControlLabel
                        sx={{ mr: 0 }}
                        control={
                          <Switch
                            checked={effectivePermissions[permission]}
                            disabled={isConfirmSubmitting}
                            onChange={() => handlePermissionToggle(permission)}
                          />
                        }
                        label={
                          effectivePermissions[permission]
                            ? t("users.permissionEnabled")
                            : t("users.permissionDisabled")
                        }
                        labelPlacement="start"
                      />
                    ) : (
                      <Chip
                        label={
                          effectivePermissions[permission]
                            ? t("users.permissionEnabled")
                            : t("users.permissionDisabled")
                        }
                        color={
                          effectivePermissions[permission] ? "success" : "default"
                        }
                        size="small"
                        variant={
                          effectivePermissions[permission]
                            ? "filled"
                            : "outlined"
                        }
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DevicesIcon />}
            sx={navigationButtonSx}
            onClick={() => {
              if (isConfirmSubmitting) return;
              onClose();
              router.push(`/users/devices?uid=${encodeURIComponent(user.uid)}`);
            }}
          >
            {t("users.devices.manageAction")}
          </Button>
          {canDelete(user) ? (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() =>
                onActionSelect({
                  type: "delete",
                  uid: user.uid,
                })
              }
            >
              {t("users.delete")}
            </Button>
          ) : (
            <Box />
          )}
        </Stack>
        <Button
          onClick={() => {
            if (!isConfirmSubmitting) {
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
