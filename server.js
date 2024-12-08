import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import userModel from './src/models/User.js';
import eventModel from './src/models/Event.js';
import connectDb from "./src/config/db.js";
import ollama from 'ollama';
import pTimeout from 'p-timeout'; // Import the p-timeout library

// Define a longer timeout value (e.g., 3 minutes)
const customTimeout = 180000;  // Timeout set to 3 minutes
const bot = new Telegraf(process.env.TELEGRAM_BOT_API);

// Retry count for temporary errors (e.g., network issues)
const MAX_RETRIES = 3;

// Function to connect to the database
async function connectDatabase() {
    try {
        await connectDb();
        console.log("Connected to the database successfully");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1); // Exit the process if the database connection fails
    }
}

// Function to get events for today
async function getEventsForToday(userId) {
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

// Function to handle summary command
async function handleSummaryCommand(ctx) {
    const from = ctx.update.message.from;
    const waitingMessage = await ctx.reply(`Hey! Please wait for response...`);
    try {
        const events = await getEventsForToday(from.id);
        if (!events.length) {
            await ctx.reply("No events for the day");
            return;
        }

        // Create the summary prompt with first-person perspective
        const allDayEvents = events.map((el, index) => `Message ${index + 1}: ${el.text}`).join("\n");

        // Create a prompt for Ollama to generate a first-person post for social media
        const summaryPrompt = `
        ${process.env.PROMPT}

        ${allDayEvents}
        `;

        // Handle Ollama API call with timeout
        const response = await pTimeout(
            ollama.chat({
                model: 'llama3.2-vision',
                messages: [
                    { role: 'user', content: summaryPrompt }
                ],
            }),
            customTimeout, // Timeout set to 3 minutes
            'The Ollama API request timed out after 3 minutes.' // Custom timeout message
        );

        await ctx.deleteMessage(waitingMessage.message_id);
        await ctx.reply(response.message.content);

    } catch (error) {
        await ctx.deleteMessage(waitingMessage.message_id);

        if (error instanceof pTimeout.TimeoutError) {
            // Handle timeout error
            console.error("Timeout error:", error);
            await ctx.reply("Sorry, the request took too long to process. Please try again later.");
        } else if (error.message.includes("network")) {
            // Handle network errors (e.g., Ollama API not reachable)
            console.error("Network error:", error);
            await ctx.reply("Network issue occurred. Please try again later.");
        } else {
            // Handle all other errors
            console.error("Unexpected error:", error);
            await ctx.reply("Something went wrong while generating response. Please try again later.");
        }
    }
}

// Handle user start command
bot.start(async (ctx) => {
    const from = ctx.update.message.from;
    try {
        await userModel.findOneAndUpdate({ tgId: from.id }, {
            $setOnInsert: {
                firstName: from.first_name,
                lastName: from.last_name,
                isBot: from.is_bot,
                username: from.username,
            }
        }, { upsert: true, new: true });
        await ctx.reply(`Welcome ${from.first_name} to my bot`);
    } catch (error) {
        console.error("Error during start command:", error);
        await ctx.reply(`An error occurred. Please try again later.`);
    }
});

// Handle summary command
bot.command('summary', handleSummaryCommand);

// Handle text messages from users
bot.on(message('text'), async (ctx) => {
    const from = ctx.update.message.from;
    const message = ctx.update.message.text;
    const waitingMessage = await ctx.reply(`Hey! Please wait for response...`);
    try {
        // Save user message to the database
        await eventModel.create({
            text: message,
            tgId: from.id,
            createdAt: new Date()  // Store timestamp of the message
        });

        // Retry mechanism for Ollama API
        let retries = 0;
        let response;
        while (retries < MAX_RETRIES) {
            try {
                // Send the message to Ollama to generate a response
                response = await ollama.chat({
                    model: process.env.AI_MODEL,
                    messages: [{ role: 'user', content: message }],
                });
                break; // Exit retry loop if successful
            } catch (error) {
                retries++;
                if (retries >= MAX_RETRIES) {
                    console.error("Max retries reached:", error);
                    await ctx.deleteMessage(waitingMessage.message_id);
                    await ctx.reply("The request failed multiple times. Please try again later.");
                    return;
                }
                console.log(`Retrying... Attempt ${retries}`);
            }
        }

        await ctx.deleteMessage(waitingMessage.message_id);
        await ctx.reply(response.message.content);
    } catch (error) {
        console.error("Error during text processing:", error);
        await ctx.deleteMessage(waitingMessage.message_id);
        await ctx.reply(`An unexpected error occurred. Please try again later.`);
    }
});

// Launch the bot
async function launchBot() {
    try {
        await bot.launch();
        // Enable graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error("Error launching the bot:", error);
        process.exit(1); // Exit the process if the bot fails to launch
    }
}

// Start the application
(async () => {
    await connectDatabase();
    await launchBot();
})();
