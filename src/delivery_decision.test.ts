import assert from "node:assert/strict";
import { needsTechnicianFollowUp, summarizeDelivery } from "./delivery_decision.js";

assert.equal(needsTechnicianFollowUp("failed"), true);
assert.equal(needsTechnicianFollowUp("delivered"), false);
assert.deepEqual(summarizeDelivery({ id: "WO-7", technicianPhone: "+15551234567", dispatchStatus: "sent", photoUrls: [], followUp: "bring a replacement valve" }, { status: "failed" }), { workOrderId: "WO-7", delivered: false, nextAction: "call technician" });
console.log("delivery decision test passed");
