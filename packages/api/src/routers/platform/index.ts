import { listMonthlySalesRoute } from "./monthly-sales/list/route";
import { getOrganizerRoute } from "./organizer/get/route";
import { listOrganizersRoute } from "./organizer/list/route";
import { updateStatusRoute } from "./organizer/update-status/route";

export const platformRouter = {
  monthlySales: {
    list: listMonthlySalesRoute,
  },
  organizer: {
    get: getOrganizerRoute,
    list: listOrganizersRoute,
    updateStatus: updateStatusRoute,
  },
};
