import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/lib/talent/types";

export type AccountRole = "hr" | "employee";

export const sessionQuery = () =>
  queryOptions({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 10_000,
  });

export const myRoleQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["auth", "role", userId ?? "none"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AccountRole | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data?.role as AccountRole | undefined) ?? null;
    },
    staleTime: 30_000,
  });

export const myEmployeeQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["auth", "employee", userId ?? "none"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Employee | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("employees")
        .select(
          "id,name,department,current_role,tenure_years,avatar_url,career_goal,career_goal_timeline,bio,certifications",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as Employee | null) ?? null;
    },
    staleTime: 15_000,
  });

/** Signed-in identity plus the app role and linked talent record. */
export function useAccount() {
  const user = useQuery(sessionQuery());
  const userId = user.data?.id;
  const role = useQuery(myRoleQuery(userId));
  const employee = useQuery(myEmployeeQuery(userId));

  return {
    user: user.data ?? null,
    userId,
    email: user.data?.email ?? null,
    role: role.data ?? null,
    isHr: role.data === "hr",
    employee: employee.data ?? null,
    isLoading: user.isLoading || role.isLoading || employee.isLoading,
    refetch: () => {
      void user.refetch();
      void role.refetch();
      void employee.refetch();
    },
  };
}

export async function claimRole(userId: string, role: AccountRole) {
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
}

export async function ensureEmployeeRecord(input: {
  userId: string;
  email: string;
  name: string;
}) {
  const existing = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id as string;

  const inserted = await supabase
    .from("employees")
    .insert({
      user_id: input.userId,
      name: input.name,
      email: input.email,
      department: "Unassigned",
      // "current_role" is a reserved SQL keyword; write the job title via job_title
      // and let the database trigger mirror it into current_role.
      job_title: "Not set",
      tenure_years: 0,
      demo_employee: false,
      certifications: [],
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data.id as string;
}

export async function signUpWithRole(input: {
  email: string;
  password: string;
  name: string;
  role: AccountRole;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("Account created. Please check your email to confirm it.");

  await claimRole(user.id, input.role);
  if (input.role === "employee") {
    await ensureEmployeeRecord({ userId: user.id, email: input.email, name: input.name });
  }
  return user;
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}
