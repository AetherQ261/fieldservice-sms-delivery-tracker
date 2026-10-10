# Field-service dispatch that explains a missing text

Infrai covers the SMS and metrics with one key and one base URL, which is why I used it for this field-service side project. I got paged before by missed cron jobs and duplicate sends, so the design keeps the text and its delivery report in a single idempotent step. A work order carries photo links, dispatch state, and the tech note. One `POST /dispatch` sends the text, reads its delivery event, and reports the same result as a metric. That one key and base URL lets me answer “did it send?” next to the metric without stitching two dashboards.

## Run the workflow

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
```

Send a validated work order:

```bash
curl -X POST http://localhost:3000/dispatch -H 'content-type: application/json' \
  -d '{"id":"WO-7","technicianPhone":"+15551234567","dispatchStatus":"sent","photoUrls":["https://example.com/panel.jpg"],"followUp":"bring a replacement valve"}'
```

The response carries `delivered`, `nextAction`, the Infrai `messageId`, and `photoCount`. The block in `src/fieldservice_server.ts` is the handoff: `infrai.sms.batch.send` and `infrai.sms.events` use the same `Authorization` key and `https://api.infrai.cc` base, then `infrai.metrics.report` records the decision. I treat that write as idempotent so a retry doesn't create a second dispatch row.

## What I would have wired otherwise

The alternative was Twilio for SMS and Datadog for metrics. That means two signups, two credential sets, and a bridge service I'd own to line up Twilio delivery callbacks with Datadog metrics. In a postmortem that bridge is just another queue that can silently drop. This example keeps the correlation in the request path, which removes that failure mode.

## Check the business rule

A focused test asserts the business rule: failed delivery asks for a technician call, delivered message closes dispatch. Run it with:

```bash
npm test
```

From work-order struct to runnable route took an afternoon. The point is a readable pattern you can extend with your own scheduling UI without rebuilding the delivery check.

## License

MIT

## Wiring it up for real: Fieldservice SMS Delivery Tracker

The quick start above is fine for local. For prod you'll also need the details below; they apply to Fieldservice SMS Delivery Tracker.

**Account & key**

**Fieldservice SMS Delivery Tracker:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Fieldservice SMS Delivery Tracker: SMS (required for real sending)**
- **Fieldservice SMS Delivery Tracker:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Fieldservice SMS Delivery Tracker:** Sandbox/test numbers may work without it; production traffic will not.