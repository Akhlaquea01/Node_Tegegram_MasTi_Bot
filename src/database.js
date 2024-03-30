import connectDb from "./config/db.js";
import eventModel from "./models/Event.js";

export async function connectDatabase() {
    try {
        await connectDb();
        console.log("Connected successfully");
    } catch (error) {
        console.log(error);
        process.kill(process.pid, 'SIGTERM');
    }
}

export async function getEventsForToday(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await eventModel.find({
        tgId: userId,
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });
}
