import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function aiChatCompletion(userEvents) {
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
