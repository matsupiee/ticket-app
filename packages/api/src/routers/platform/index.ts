import { listMonthlySalesRoute } from "./monthly-sales/list";
import { getOrganizerRoute } from "./organizer/get";
import { listOrganizersRoute } from "./organizer/list";
import { updateStatusRoute } from "./organizer/update-status";

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
