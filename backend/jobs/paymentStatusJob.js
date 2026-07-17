import cron from "node-cron";
import Payment from "../models/Payment.js";

// Prevent overlapping runs
let isRunning = false;

// Tune according to DB size
const BATCH_SIZE = 500;

let cronJob = null;

async function updateExpiredPayments() {
    if (isRunning) return;  // prevent overlap
    isRunning = true;

    const now = new Date();
    const startedAt = Date.now();

    try {
        let totalUpdated = 0;
        let skip = 0;

        while (true) {
            // fetch a batch of expired + pending payments
            const batch = await Payment.find({
                status: "PENDING",
                expiry: { $lte: now }
            })
                .select("_id paymentId")
                .limit(BATCH_SIZE)
                .skip(skip)
                .lean();

            if (batch.length === 0) break;

            const ids = batch.map(p => p._id);

            const result = await Payment.updateMany(
                { _id: { $in: ids } },
                { 
                    $set: {
                        status: "FAILED",
                        providerStatus: "expired"
                    }
                }
            );

            totalUpdated += result.modifiedCount;

            if (batch.length < BATCH_SIZE) break;
            skip += BATCH_SIZE;
        }

        const duration = Date.now() - startedAt;

        if (totalUpdated > 0) {
            console.log(
                `[PaymentStatusJob] Marked ${totalUpdated} payment(s) as FAILED in ${duration}ms`
            );
        }
    } catch (err) {
        console.error("[PaymentStatusJob] Error:", err);
    } finally {
        isRunning = false;
    }
}

export function startPaymentStatusJob({
    cronPattern = "0 0 * * *",  // default: midnight every day
    runOnStart = true,
} = {}) {

    if (cronJob) return;
    if (!cron.validate(cronPattern)) {
        throw new Error(`Invalid cron pattern: ${cronPattern}`);
    }

    if (runOnStart) {
        updateExpiredPayments().catch(console.error);
    }

    cronJob = cron.schedule(
        cronPattern,
        () => updateExpiredPayments().catch(console.error),
        { scheduled: true, timezone: "UTC" }
    );

    console.log(`[PaymentStatusJob] Started with pattern: ${cronPattern}`);
}

export function stopPaymentStatusJob() {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        console.log("[PaymentStatusJob] Stopped");
    }
}

export function getPaymentJobStatus() {
    return {
        running: Boolean(cronJob),
        processing: isRunning,
    };
}