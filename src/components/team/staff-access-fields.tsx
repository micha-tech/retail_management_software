"use client";

import { useState } from "react";

import type { BusinessRole } from "@/db/schema";
import { defaultPermissionsForRole, permissionDefinitions, type Permission } from "@/modules/auth/permissions";

type StaffRole = Exclude<BusinessRole, "OWNER">;

export function StaffAccessFields({ branches, roles, initialRole, initialPermissions, initialBranchIds = [] }: {
  branches: { id: string; name: string }[];
  roles: { value: StaffRole; label: string }[];
  initialRole: StaffRole;
  initialPermissions: Permission[];
  initialBranchIds?: string[];
}) {
  const [role, setRole] = useState<StaffRole>(initialRole);
  const [selected, setSelected] = useState<Permission[]>(initialPermissions);

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    setSelected(defaultPermissionsForRole(nextRole));
  }

  function toggle(permission: Permission, checked: boolean) {
    setSelected((current) => checked ? [...new Set([...current, permission])] : current.filter((value) => value !== permission));
  }

  return <>
    <label>Role<select name="role" value={role} onChange={(event) => changeRole(event.target.value as StaffRole)}>{roles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Changing the role applies its recommended access preset. You can then customise it below.</small></label>
    <fieldset><legend>Feature access</legend><div className="permission-list">{permissionDefinitions.map((definition) => <label className="permission-option" key={definition.value}><input type="checkbox" name="permissions" value={definition.value} checked={selected.includes(definition.value)} onChange={(event) => toggle(definition.value, event.target.checked)}/><span><strong>{definition.label}</strong><small>{definition.description}</small></span></label>)}</div><small>Only selected features appear in navigation, and every protected page and action is checked on the server.</small></fieldset>
    <fieldset><legend>Branch assignments</legend><div className="checkbox-list">{branches.map((branch) => <label key={branch.id}><input type="checkbox" name="branchIds" value={branch.id} defaultChecked={initialBranchIds.includes(branch.id)}/><span>{branch.name}</span></label>)}</div><small>Required for branch manager, cashier, and inventory manager roles. Administrators have business-wide branch access.</small></fieldset>
  </>;
}
