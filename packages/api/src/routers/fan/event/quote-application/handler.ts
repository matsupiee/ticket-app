import { quoteTicketSelection } from "../../../../shared/ticketing";

export async function quoteApplicationHandler({
  input,
}: {
  input: {
    eventId: string;
    saleWindowId: string;
    performanceId: string;
    offerId: string;
    rateTypeId: string;
    quantity: number;
  };
}) {
  const quote = await quoteTicketSelection(input);

  return {
    unitPrice: quote.unitPrice,
    quantity: quote.quantity,
    subtotalAmount: quote.subtotalAmount,
    buyerFeeLines: quote.buyerFeeLines,
    organizerFeeLines: quote.organizerFeeLines,
    buyerFeeAmount: quote.buyerFeeAmount,
    organizerFeeAmount: quote.organizerFeeAmount,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
  };
}
