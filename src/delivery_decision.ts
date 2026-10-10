export type DispatchStatus = "queued" | "sent" | "delivered" | "failed";
export type WorkOrder = { id: string; technicianPhone: string; dispatchStatus: DispatchStatus; photoUrls: string[]; followUp: string };

export function needsTechnicianFollowUp(status: DispatchStatus): boolean {
  return status === "failed";
}

export function summarizeDelivery(order: WorkOrder, event: { status?: string }) {
  const delivered = event.status === "delivered";
  return { workOrderId: order.id, delivered, nextAction: delivered ? "close dispatch" : "call technician" };
}
