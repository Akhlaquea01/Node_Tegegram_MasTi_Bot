import { getEventsForToday } from "./database.js";

export async function handleGenerateCommand(ctx) {
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
