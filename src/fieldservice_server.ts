import { createServer } from "node:http";
import { z } from "zod";
import { infrai } from "./infrai_client.js";
import { summarizeDelivery, type WorkOrder } from "./delivery_decision.js";

const WorkOrderBody = z.object({ id: z.string().min(1), technicianPhone: z.string().min(7), dispatchStatus: z.enum(["queued", "sent", "delivered", "failed"]), photoUrls: z.array(z.string().url()), followUp: z.string().min(1) });

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/dispatch") { res.writeHead(404); res.end("not found"); return; }
  try {
    const raw = await new Promise<string>((resolve) => { let data = ""; req.on("data", (chunk) => data += chunk); req.on("end", () => resolve(data)); });
    const order = WorkOrderBody.parse(JSON.parse(raw)) as WorkOrder;
    const sent = await infrai.sms.batch.send({ messages: [{ to: order.technicianPhone, body: `Work order ${order.id}: ${order.followUp}` }], idempotency_key: order.id });
    const event = await infrai.sms.events(sent.message_id) as { status?: string };
    const summary = summarizeDelivery(order, event);
    await infrai.metrics.report({ name: "fieldservice_sms_delivery", value: summary.delivered ? 1 : 0, type: "gauge", tags: { work_order_id: order.id, dispatch_status: order.dispatchStatus } });
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ...summary, messageId: sent.message_id, photoCount: order.photoUrls.length }));
  } catch (error) { const message = error instanceof z.ZodError ? "invalid work order" : String(error); res.writeHead(error instanceof z.ZodError ? 400 : 502, { "content-type": "application/json" }); res.end(JSON.stringify({ error: message })); }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("field-service dispatcher listening on http://localhost:3000"));
