import mongoose from "mongoose";

const eventSchema = mongoose.Schema({
    tgId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
});

export default mongoose.model("Event", eventSchema);