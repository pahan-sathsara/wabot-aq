import { useMongoDbAuthState } from "#lib/auth/mongodb";
import { SessionModel } from "#lib/database/models/multiSessions";

export default {
  name: "stopsession",d
  command: ["stopsession"],
  category: "owner",
  owner: true,
  async execute(m, { args }) {
    const id = (args[0] || "").replace(/\D/g, "");
    if (!id) return m.reply("❌ Need number or session ID");

    const list = await SessionModel.find({});
    const target = list.find(
      s => s._id === id || s.phone?.endsWith(id)
    );

    if (!target) return m.reply("❌ Session not found");

    const { removeCreds } = await useMongoDbAuthState(
      process.env.MONGO_URI,
      { session: target._id }
    );

    await removeCreds();
    await SessionModel.deleteOne({ _id: target._id });

    m.reply(`✅ Session disconnected: +${target.phone}`);
  },
};
