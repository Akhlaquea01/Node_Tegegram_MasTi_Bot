import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import userModel from './src/models/User.js';
import eventModel from './src/models/Event.js';
import connectDb from "./src/config/db.js";
import OpenAI from 'openai';

const bot = new Telegraf(process.env.TELEGRAM_BOT_API);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function connectDatabase() {
    try {
        await connectDb();
        console.log("Connected successfully");
    } catch (error) {
        console.log(error);
        process.kill(process.pid, 'SIGTERM');
    }
}

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

async function aiChatCompletion(userEvents) {
    try {
        return await openai.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'as a copywriter write message reply'
                },
                {
                    role: 'user',
                    content: `user ka prompt ${userEvents.map((ev) => ev.text).join(', ')}`
                }
            ],
            model: process.env.OPRNAI_MODEL
        });
    } catch (error) {
        throw error;
    }
}

async function handleGenerateCommand(ctx) {
    const from = ctx.update.message.from;
    const waitingMessage = await ctx.reply(`Hey! Please wait for response...`);
    try {
        const events = await getEventsForToday(from.id);
        if (!events.length) {
            await ctx.reply("No events for the day");
            return;
        }
        // Call AI for chat completion
        // const chatCompletion = await aiChatCompletion(events);
        // Update user model with AI tokens
        // await userModel.findOneAndUpdate({ tgId: from.id }, {
        //     $inc: {
        //         promptToken: chatCompletion.usages.prompt_tokens,
        //         completionTokens: chatCompletion.usages.completion_token
        //     }
        // });
        // Send response
        await ctx.deleteMessage(waitingMessage.message_id);
        // await ctx.reply(chatCompletion.choices[0].message.content);
        await ctx.reply(events);
    } catch (error) {
        await ctx.deleteMessage(waitingMessage.message_id);
        console.log(error);
        await ctx.reply("Something went wrong while generating response.");
    }
}

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
        console.log(error);
        await ctx.reply(`Some issue there`);
    }
});

bot.command('generate', handleGenerateCommand);

bot.on(message('text'), async (ctx) => {
    const from = ctx.update.message.from;
    const message = ctx.update.message.text;
    try {
        await eventModel.create({ text: message, tgId: from.id });
        await ctx.reply("Thanks for using this bot");
    } catch (error) {
        console.log(error);
        await ctx.reply(`Some issue there`);
    }
});

async function launchBot() {
    bot.launch();
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

(async () => {
    await connectDatabase();
    await launchBot();
})();
