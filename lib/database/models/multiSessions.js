import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  _id: String,
  phone: String,
  connected: Boolean,
  createdAt: { type: Date, default: Date.now },
});

export const SessionModel =
  mongoose.models.sessions || mongoose.model("sessions", sessionSchema);
