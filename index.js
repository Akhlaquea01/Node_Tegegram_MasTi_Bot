import connectDatabase from "./src/config/db.js";
import { launchBot } from "./src/telegrafBot.js";

(async () => {
    await connectDatabase();
    await launchBot();
})();
