import { organizerApi } from "@/lib/api";
import type { OrganizerDashboardData } from "@/types/organizer";

type DashboardResponse = {
  success?: boolean;
  data?: OrganizerDashboardData;
};

/** GET /organizer/dashboard */
export async function getOrganizerDashboard(): Promise<OrganizerDashboardData> {
  const { data } = await organizerApi.get<DashboardResponse>("/organizer/dashboard");
  if (!data.data) {
    throw new Error("Dashboard response was empty.");
  }
  return data.data;
}
