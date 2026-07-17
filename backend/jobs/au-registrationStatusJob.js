import cron from "node-cron";
import Auction from "../models/Auction.js";

let isRunning = false;
let cronJob = null;

const BATCH_SIZE = 500;

async function updateRegistrationWindows() {
    if (isRunning) return;
    isRunning = true;

    const now = new Date();
    const startedAt = Date.now();

    const before24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const before5min = new Date(now.getTime() + 5 * 60 * 1000);

    try {
        let totalUpdated = 0;
        let skip = 0;

        // FETCH IN BATCHES
        while (true) {
            const batch = await Auction.find({ verified: true })
                .select("_id startTime endTime isRegistrationOpen")
                .limit(BATCH_SIZE)
                .skip(skip)
                .lean();

            if (batch.length === 0) break;

            const updates = [];

            for (const a of batch) {
                const openFrom = new Date(a.startTime.getTime() - 24 * 60 * 60 * 1000);
                const closeAt = new Date(a.endTime.getTime() - 5 * 60 * 1000);

                const shouldBeOpen = now >= openFrom && now < closeAt;
                
                if (a.isRegistrationOpen !== shouldBeOpen) {
                    updates.push({
                        updateOne: {
                            filter: { _id: a._id },
                            update: { $set: { isRegistrationOpen: shouldBeOpen } }
                        }
                    });
                }
            }

            if (updates.length > 0) {
                const result = await Auction.bulkWrite(updates, { ordered: false });
                totalUpdated += result.modifiedCount;
            }

            if (batch.length < BATCH_SIZE) break;
            skip += BATCH_SIZE;
        }

        const ms = Date.now() - startedAt;
        if (totalUpdated > 0) {
            console.log(`[RegistrationJob] Updated ${totalUpdated} auctions in ${ms}ms`);
        }

    } catch (err) {
        console.error("[RegistrationJob] Error:", err);
    } finally {
        isRunning = false;
    }
}

export function startRegistrationStatusJob({
    cronPattern = "*/1 * * * *",  // every 1 minute
    runOnStart = true,
} = {}) {
    if (cronJob) return;

    if (!cron.validate(cronPattern)) {
        throw new Error(`Invalid cron pattern: ${cronPattern}`);
    }

    if (runOnStart) {
        updateRegistrationWindows().catch(console.error);
    }

    cronJob = cron.schedule(
        cronPattern,
        () => updateRegistrationWindows().catch(console.error),
        { scheduled: true, timezone: "UTC" }
    );

    console.log(`[RegistrationJob] Started with pattern: ${cronPattern}`);
}

export function stopRegistrationStatusJob() {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        console.log("[RegistrationJob] Stopped");
    }
}

export function getRegistrationJobStatus() {
    return {
        running: Boolean(cronJob),
        processing: isRunning
    };
}