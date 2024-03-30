import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { handleGenerateCommand } from "./handlers.js";
import { userModel, eventModel } from "./models/index.js";

const bot = new Telegraf(process.env.TELEGRAM_BOT_API);

export async function launchBot() {
    // Bot setup
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

    bot.command('summary', handleGenerateCommand);

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

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    // Launch the bot
    bot.launch();
}
