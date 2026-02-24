"use client";

import { useState, useMemo } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";
import type { AppUser, UserRole, UserPlan } from "@/types/user";

interface UserListProps {
  users: AppUser[];
  currentUserRole: UserRole;
  currentUserUid: string;
  onDelete: (uid: string) => Promise<void>;
  onRoleChange: (uid: string, role: "user" | "admin") => Promise<void>;
  onPlanChange: (uid: string, plan: UserPlan) => Promise<void>;
}

type PendingConfirmAction =
  | { type: "delete"; uid: string }
  | { type: "roleChange"; uid: string; nextRole: "user" | "admin" }
  | { type: "planChange"; uid: string; nextPlan: UserPlan };

const roleColors: Record<UserRole, "error" | "warning" | "default"> = {
  "super-admin": "error",
  admin: "warning",
  user: "default",
};

function planChipColor(
  plan: UserPlan | undefined
): "default" | "primary" | "success" {
  if (plan === "voca_unlimited") return "primary";
  if (plan === "voca_speaking") return "success";
  return "default";
}

function getPlanLabel(plan: UserPlan | undefined, t: (k: string) => string) {
  if (plan === "voca_unlimited") return t("users.planVocaUnlimited");
  if (plan === "voca_speaking") return t("users.planVocaSpeaking");
  return t("users.planFree");
}

function formatCreatedAt(val: unknown): string | null {
  if (!val) return null;
  try {
    if (typeof val === "object" && val !== null && "toDate" in val) {
      return (val as { toDate(): Date }).toDate().toLocaleDateString();
    }
    if (typeof val === "object" && val !== null && "_seconds" in val) {
      return new Date(
        (val as { _seconds: number })._seconds * 1000
      ).toLocaleDateString();
    }
    return new Date(val as string | number).toLocaleDateString();
  } catch {
    return null;
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 100 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function UserList({
  users,
  currentUserRole,
  currentUserUid,
  onDelete,
  onRoleChange,
  onPlanChange,
}: UserListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlan | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin">("all");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] =
    useState<PendingConfirmAction | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  // Aggregate counters from all users (not filtered)
  const total = users.length;
  const unlimitedCount = users.filter((u) => u.plan === "voca_unlimited").length;
  const speakingCount = users.filter((u) => u.plan === "voca_speaking").length;

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);
      const matchPlan =
        planFilter === "all" ||
        (planFilter === "free"
          ? !u.plan || u.plan === "free"
          : u.plan === planFilter);
      const matchRole = roleFilter === "all" || u.role === "admin";
      return matchSearch && matchPlan && matchRole;
    });
  }, [users, search, planFilter, roleFilter]);

  const canDelete = (target: AppUser): boolean => {
    if (target.uid === currentUserUid) return false;
    if (currentUserRole === "super-admin") return true;
    if (currentUserRole === "admin" && target.role === "user") return true;
    return false;
  };

  const canChangeRole = (target: AppUser): boolean => {
    if (target.uid === currentUserUid) return false;
    if (target.role === "super-admin") return false;
    return currentUserRole === "super-admin";
  };

  const canChangePlan = (): boolean =>
    currentUserRole === "admin" || currentUserRole === "super-admin";

  const getConfirmMessage = (): string => {
    if (!pendingConfirmAction) return "";
    if (pendingConfirmAction.type === "delete") {
      return t("users.deleteConfirm");
    }
    if (pendingConfirmAction.type === "roleChange") {
      return t("users.confirmRoleChange");
    }
    return t("users.confirmPlanChange");
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmAction || isConfirmSubmitting) return;

    const action = pendingConfirmAction;
    setPendingConfirmAction(null);
    setSelectedUser(null);
    setIsConfirmSubmitting(true);

    try {
      if (action.type === "delete") {
        await onDelete(action.uid);
        return;
      }
      if (action.type === "roleChange") {
        await onRoleChange(action.uid, action.nextRole);
        return;
      }
      await onPlanChange(action.uid, action.nextPlan);
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    if (isConfirmSubmitting) return;
    setPendingConfirmAction(null);
  };

  return (
    <>
      {/* Aggregate counters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <StatCard label={t("users.totalMembers")} value={total} />
        <StatCard label={t("users.unlimitedMembers")} value={unlimitedCount} />
        <StatCard label={t("users.speakingMembers")} value={speakingCount} />
      </Stack>

      {/* Search + Filters */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder={t("users.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: 360 }}
        />
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={planFilter}
            onChange={(_, v) => v !== null && setPlanFilter(v)}
          >
            <ToggleButton value="all">{t("users.allPlans")}</ToggleButton>
            <ToggleButton value="free">{t("users.planFree")}</ToggleButton>
            <ToggleButton value="voca_unlimited">
              {t("users.planVocaUnlimited")}
            </ToggleButton>
            <ToggleButton value="voca_speaking">
              {t("users.planVocaSpeaking")}
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={roleFilter}
            onChange={(_, v) => v !== null && setRoleFilter(v)}
          >
            <ToggleButton value="all">{t("users.allRoles")}</ToggleButton>
            <ToggleButton value="admin">{t("users.adminOnly")}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t("users.username")}</TableCell>
              <TableCell>{t("users.email")}</TableCell>
              <TableCell>{t("users.role")}</TableCell>
              <TableCell>{t("users.plan")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {t("users.noUsers")}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow
                  key={u.uid}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => setSelectedUser(u)}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={u.photoURL}
                        sx={{ width: 32, height: 32, fontSize: 14 }}
                      >
                        {(u.displayName || u.email || "?")[0].toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {u.displayName || u.email}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {u.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      color={roleColors[u.role]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPlanLabel(u.plan, t)}
                      color={planChipColor(u.plan)}
                      size="small"
                      variant={
                        u.plan && u.plan !== "free" ? "filled" : "outlined"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail Modal */}
      {selectedUser && (
        <Dialog
          open
          onClose={() => {
            if (isConfirmSubmitting) return;
            setPendingConfirmAction(null);
            setSelectedUser(null);
          }}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t("users.detailTitle")}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar
                  src={selectedUser.photoURL}
                  sx={{ width: 56, height: 56, fontSize: 22 }}
                >
                  {(
                    selectedUser.displayName ||
                    selectedUser.email ||
                    "?"
                  )[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>
                    {selectedUser.displayName || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email}
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
                {canChangeRole(selectedUser) ? (
                  <Select
                    size="small"
                    value={selectedUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value as "user" | "admin";
                      if (newRole === selectedUser.role) return;
                      setPendingConfirmAction({
                        type: "roleChange",
                        uid: selectedUser.uid,
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
                    label={selectedUser.role}
                    color={roleColors[selectedUser.role]}
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
                    value={selectedUser.plan || "free"}
                    onChange={(e) => {
                      const newPlan = e.target.value as UserPlan;
                      const currentPlan = selectedUser.plan || "free";
                      if (newPlan === currentPlan) return;
                      setPendingConfirmAction({
                        type: "planChange",
                        uid: selectedUser.uid,
                        nextPlan: newPlan,
                      });
                    }}
                    sx={{ minWidth: 170 }}
                  >
                    <MenuItem value="free">{t("users.planFree")}</MenuItem>
                    <MenuItem value="voca_unlimited">
                      {t("users.planVocaUnlimited")}
                    </MenuItem>
                    <MenuItem value="voca_speaking">
                      {t("users.planVocaSpeaking")}
                    </MenuItem>
                  </Select>
                ) : (
                  <Chip
                    label={getPlanLabel(selectedUser.plan, t)}
                    color={planChipColor(selectedUser.plan)}
                    size="small"
                  />
                )}
              </Stack>

              {/* Joined date */}
              {(() => {
                const dateStr = formatCreatedAt(selectedUser.createdAt);
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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 2 }}>
            {canDelete(selectedUser) ? (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() =>
                  setPendingConfirmAction({
                    type: "delete",
                    uid: selectedUser.uid,
                  })
                }
              >
                {t("users.delete")}
              </Button>
            ) : (
              <Box />
            )}
            <Button onClick={() => setSelectedUser(null)}>
              {t("common.cancel")}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Action Confirm Dialog */}
      <Dialog
        open={!!pendingConfirmAction}
        onClose={handleCancelConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("users.confirmActionTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{getConfirmMessage()}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} disabled={isConfirmSubmitting}>
            {t("common.no")}
          </Button>
          <Button
            onClick={handleConfirmAction}
            color={pendingConfirmAction?.type === "delete" ? "error" : "primary"}
            variant="contained"
            disabled={isConfirmSubmitting}
          >
            {t("common.yes")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
