import connectDatabase from "../../src/config/db.js";
import { launchBot } from "../../src/telegrafBot.js";

async function startApplication() {
    try {
        await connectDatabase();
        await launchBot();
        console.log("Bot launched successfully!");
    } catch (error) {
        console.error("Error starting application:", error);
    }
}

startApplication();