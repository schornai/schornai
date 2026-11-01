import type { OrganizationRole, Role } from "./_types";
import { cache } from "react";
import { createClient } from "@/supabase/server";
import { getOrganizations } from "@/model/organization/getOrganizations";
import { omitNullish } from "@/lib/omitNullish";

type OrganizationRolesClaim =
  | {
      organization_id: string;
      role: Exclude<Role, "admin">;
    }[]
  | "admin";

export const getOrganizationsWithRole = cache(
  async (): Promise<OrganizationRole[]> => {
    const supabase = await createClient();
    const [organizations, { data: claims }] = await Promise.all([
      getOrganizations(),
      supabase.auth.getClaims(),
    ]);

    if (claims && claims.claims && "organization_roles" in claims.claims) {
      const roles = claims.claims.organization_roles as OrganizationRolesClaim;

      if (roles === "admin") {
        return organizations.map((organization) => ({
          organization,
          role: "admin",
        }));
      }

      return organizations
        .map((organization) => {
          const role = roles.find((role) => role.organization_id)?.role;
          if (!role) {
            return undefined;
          }
          return {
            organization,
            role,
          };
        })
        .filter(omitNullish);
    }

    return [];
  },
);
