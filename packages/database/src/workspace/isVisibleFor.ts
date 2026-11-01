import type { Role } from './_types';
import { cache } from 'react';
import { createClient } from '@/supabase/server';

type OrganizationRoles =
  | {
      organization_id: string;
      role: Exclude<Role, 'admin'>;
    }[]
  | 'admin';

export const isVisibleFor = cache(
  async (role: Role, organizationId?: string) => {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();

    if (claims && claims.claims && 'organization_roles' in claims.claims) {
      const roles = claims.claims.organization_roles as OrganizationRoles;

      if (roles === 'admin') {
        return true;
      }

      const eligibleRoles = organizationId
        ? roles.filter((role) => role.organization_id === organizationId)
        : roles;

      return eligibleRoles.some((eligibleRole) => {
        if (role === 'user') return true;
        if (role === 'editor' && eligibleRole.role === 'editor') return true;
        return false;
      });
    }

    return false;
  },
);
