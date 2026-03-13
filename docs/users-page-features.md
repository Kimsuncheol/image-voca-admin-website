# `app/users/page.tsx` Implemented Features

## Overview

`app/users/page.tsx` implements the admin-facing `/users` page for managing registered users. It acts as the orchestration layer for authentication, data loading, mutation requests, feedback handling, and rendering the user management UI.

## Implemented Features

### 1. Admin-only access control

- Uses `useAdminGuard()` to protect the page.
- Redirects regular users with role `user` away from `/users`.
- Prevents UI flash during redirect by returning `null` when a non-admin user is detected after auth resolves.

## 2. User data loading

- Fetches all users from `GET /api/admin/users` on initial page load.
- Stores the result in local React state.
- Shows a loading skeleton while authentication or data fetching is still in progress.
- Displays a non-blocking error alert if fetching fails.

## 3. Mutation handling for user management

The page defines and wires these server actions:

- Role change via `PATCH /api/admin/users` with `{ uid, role }`
- Plan change via `PATCH /api/admin/users` with `{ uid, plan }`
- Admin permission change via `PATCH /api/admin/users` with `{ uid, adminPermissions }`
- User deletion via `DELETE /api/admin/users` with `{ uid }`

After successful updates:

- The updated user is merged back into local state without a full refetch.
- Deleted users are removed from local state immediately.
- Success and error feedback messages are shown with dismissible alerts.

## 4. Permission-aware user management

- Computes the current operator's effective admin permissions with `getEffectiveAdminPermissions(user)`.
- Passes those permissions into the user UI so controls can be enabled or disabled based on role and permission flags.
- Supports granular admin permission updates in addition to role and plan changes.

## 5. Page states and feedback

- Loading state: renders `UsersPageSkeleton`
- Unauthorized redirect state: renders `null`
- Error state: shows an error `Alert`
- Mutation result state: shows dismissible success or error `Alert`
- Empty state: shows `users.noUsers`
- Ready state: renders the full `UserList`

## 6. User list features delegated from this page

`page.tsx` renders `UserList`, which provides the actual user-management interface:

- Summary stat cards for total users, unlimited-plan users, and free-plan users
- Search by display name or email
- Filter by plan: `all`, `free`, `voca_unlimited`
- Filter by role: `all`, `admin`
- Clickable user table with avatar, email, role, plan, and permission summary
- Detail modal for each user
- Confirmation dialog before destructive or sensitive changes

## 7. Detail modal actions available through this page

Through the handlers defined in `page.tsx`, the detail modal supports:

- Changing a user role between `user` and `admin`
- Changing a subscription plan between `free` and `voca_unlimited`
- Toggling admin permission flags for admin users
- Deleting a user account
- Viewing joined date, plan, role, and effective permission status

## 8. Backend rules enforced by the connected API

The page is connected to `app/api/admin/users/route.ts`, which enforces:

- Only `admin` and `super-admin` can fetch users
- Only `super-admin` can change roles
- Only users with `planModification` permission can change plans
- Only `super-admin` can change admin permissions
- Admin permissions can only be changed for users with role `admin`
- Admins can only delete users whose role is `user`
- Only one mutation type is allowed per PATCH request

## Summary

`app/users/page.tsx` is the controller for the user administration screen. It does not render every feature directly, but it implements the page-level behavior that makes the user management system work: admin guarding, user fetching, state management, success/error feedback, and mutation wiring for role, plan, permission, and deletion flows.

## SRS: Registered Device Management

### Purpose

This section specifies a new admin website capability for managing registered user devices. The feature allows authenticated admin users to inspect device registrations stored for each user and remove stale registrations when support action is needed.

### Actors and Permissions

- Actor: Authenticated admin user
- Non-admin users are denied access
- Unauthenticated users are redirected to authentication
- Device removal permissions should follow the same admin authorization model as other user-management mutations

### Screen Scope

- The feature is added to the admin website user-management flow
- Admins can open a registered-device view from the `/users` experience
- The view can be implemented as either:
  - a per-user detail section inside the existing user modal, or
  - a dedicated device-management page linked from the user list

### Functional Requirements

- FR-1: The system shall load registered device data from Firestore path `users/{uid}/devices/{deviceId}`.
- FR-2: The system shall join each device registration with the parent user record so the admin can identify the owner by `displayName`, `email`, and `role`.
- FR-3: The system shall display each user's registered device count against the maximum allowed count of `3`.
- FR-4: The system shall show the stored device metadata for each registration:
  - `deviceId`
  - `platform`
  - `brand`
  - `manufacturer`
  - `modelName`
  - `deviceType`
  - `osName`
  - `osVersion`
  - `appVersion`
  - `appBuild`
  - `authProvider`
  - `notificationPermissionStatus`
  - `expoPushToken`
  - `createdAt`
  - `updatedAt`
  - `lastSeenAt`
- FR-5: The system shall support search by user name, email, device model name, and device ID.
- FR-6: The system shall support filtering by `platform` and `notificationPermissionStatus`.
- FR-7: The system shall support sorting by `lastSeenAt`, `createdAt`, and registered device count.
- FR-8: The system shall show loading, empty, success, and error states for device-management operations.
- FR-9: The system shall allow an admin to remove a selected device registration.
- FR-10: The system shall require explicit confirmation before deleting a device registration.
- FR-11: After successful deletion, the system shall refresh the affected user row and registered-device count without requiring a full page reload.
- FR-12: The system shall preserve the current application rule that a user can have at most `3` registered devices, and admin removal shall immediately free one slot for future registration.

### Data Contracts

- `DevicePlatform`: `ios | android`
- `DeviceRegistrationRecord`:
  - `deviceId: string`
  - `platform: "ios" | "android"`
  - `brand: string | null`
  - `manufacturer: string | null`
  - `modelName: string | null`
  - `deviceType: string | null`
  - `osName: string | null`
  - `osVersion: string | null`
  - `appVersion: string | null`
  - `appBuild: string | null`
  - `authProvider: string`
  - `notificationPermissionStatus: string`
  - `expoPushToken: string | null`
  - `createdAt: string`
  - `updatedAt: string`
  - `lastSeenAt: string`
- `AdminManagedDeviceListItem`:
  - `uid: string`
  - `displayName: string`
  - `email: string`
  - `role: string`
  - `registeredDeviceCount: number`
  - `maxRegisteredDevices: number`
  - `devices: DeviceRegistrationRecord[]`

### API / Backend Requirements

- Add an admin-capable read path for device registrations associated with users
- Add an admin-capable delete path for `users/{uid}/devices/{deviceId}`
- The backend shall validate admin authorization before serving or mutating device-registration data
- The backend should keep device-management mutations separate from unrelated role/plan mutations for clearer auditability

### Firestore Dependencies

- Parent collection: `users`
- Child subcollection: `users/{uid}/devices`
- Reads:
  - current operator permission from `users/{currentUid}`
  - user data from `users`
  - device registrations from `users/{uid}/devices`
- Writes:
  - delete selected device document from `users/{uid}/devices/{deviceId}`

### Error Handling

- Permission failures shall return an authorization error and show no protected device data
- Device list load failures shall show an error alert and preserve the rest of the user-management page where possible
- Device deletion failures shall show a non-destructive error alert and keep the current UI state intact
- Empty device lists shall show an explicit empty-state message instead of an empty table

### Non-Functional Requirements

- Localization via admin translation keys for device-management labels and messages
- Responsive admin UI with desktop-first layout
- Consistent confirmation-dialog pattern for destructive actions
- Efficient client-side filtering and sorting for moderate user and device counts

### Known Limitations

- Device registrations are currently enforced by the client application, not by Firestore security rules or a backend validator
- `expoPushToken` may be `null` for valid registrations when notification permission is denied or token lookup previously failed
- The admin website can inspect stored registration metadata but cannot directly determine a live session state
- No dedicated audit log exists yet for admin-triggered device removals

### Out of Scope

- Automatic replacement of old devices when a fourth device attempts registration
- Pre-auth self-service device recovery for blocked users
- Forced remote logout or session invalidation after device deletion
- Push-delivery diagnostics beyond the stored registration fields
