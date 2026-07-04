import useAuth from './useAuth';

/**
 * Convenience hook for permission checks in components.
 *
 * Permissions are strings of the form "module:action:scope" (e.g.
 * "leads:read:all"). A check passes if the user has the action at EITHER
 * scope; data-level self/all restriction is enforced by the backend.
 */
export function usePermissions() {
  const permissions = useAuth((s) => s.permissions);
  const hasPermission = useAuth((s) => s.hasPermission);
  const canViewModule = useAuth((s) => s.canViewModule);

  return { permissions, hasPermission, canViewModule };
}

export default usePermissions;
