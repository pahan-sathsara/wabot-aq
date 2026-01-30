import { SessionModel } from "#lib/database/models/multiSessions";

export default {
  name: "sessions",
  command: ["sessions"],
  category: "owner",
  owner: true,
  async execute(m) {
    const list = await SessionModel.find({});
    if (!list.length) return m.reply("No active sessions");

    let text = "📱 Active Sessions\n\n";
    list.forEach(s => {
      text += `• ${s.phone}\n`;
    });

    m.reply(text);
  },
};
