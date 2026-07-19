import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { TicketApplicationPage } from "@/features/event/detail/apply/page";
import { client } from "@/lib/orpc";

export const Route = createFileRoute("/events/$eventId/apply")({
  component: RouteComponent,
  loader: async ({ params }) => {
    try {
      const event = await client.fan.event.get({
        eventId: params.eventId,
      });

      return { event };
    } catch {
      throw notFound();
    }
  },
});

function RouteComponent() {
  const { event } = Route.useLoaderData();
  const { eventId } = Route.useParams();
  const navigate = useNavigate({ from: "/events/$eventId/apply" });

  return (
    <TicketApplicationPage
      event={event}
      onComplete={async (selection) => {
        const result = await client.fan.application.submit({
          eventId: selection.eventId,
          saleWindowId: selection.saleWindowId,
          preferences: [
            {
              preferenceRank: 1,
              performanceId: selection.performanceId,
              offerId: selection.offerId,
              items: [
                {
                  rateTypeId: selection.rateTypeId,
                  quantity: selection.quantity,
                },
              ],
            },
          ],
        });
        toast.success(result.status === "ORDER_CREATED" ? "購入が完了しました" : "申し込みました");
        navigate({
          to: "/events/$eventId/application-complete",
          params: { eventId },
          search: {
            ...selection,
            orderId: result.orderId,
          },
        });
      }}
    />
  );
}
