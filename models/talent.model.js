import { Schema } from "mongoose";

const talentSchema = new Schema({
    jobTitle: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    setBudget:{
        type: Number,
    },
    date:{
        type: Date,
    },
    time:{
        type: String,
    },
    location:{
        type: String,
    },
    setRole:{
        type: String,
    },
    paymentStatus:{
        type: String,
        default: "pending",
        enum:{ values: ["pending", "completed"],}
    }
},{ timestamps: true });

export const Talent = mongoose.model("Talent", talentSchema);