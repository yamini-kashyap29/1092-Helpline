const { Notification, Alert, Officer } = require("../../Database");

class NotificationController {
  async list(req, res) {
    try {
      const notifs = await Notification.findAll({
        include: [
          { model: Alert, as: "alert" },
          { model: Officer, as: "officer" },
        ],
        order: [["sent_at", "DESC"]],
        limit: 100,
      });

      const mapped = notifs.map((n) => ({
        id: n.id,
        type: n.alert ? n.alert.alert_type || "system" : "system",
        title: n.subject || (n.alert ? n.alert.title : "Notification"),
        message: n.body,
        timestamp: n.sent_at || n.createdAt,
        read: n.status === "read",
      }));

      res.json(mapped);
    } catch (err) {
      console.error("[Notifications Error]:", err);
      res.status(500).json({ error: err.message });
    }
  }

  async markRead(req, res) {
    try {
      const id = req.params.id;
      const notif = await Notification.findByPk(id);
      if (!notif)
        return res.status(404).json({ error: "Notification not found" });

      notif.status = "read";
      notif.read_at = new Date();
      await notif.save();

      res.json({ success: true });
    } catch (err) {
      console.error("[Notification Mark Read Error]:", err);
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const id = req.params.id;
      const notif = await Notification.findByPk(id);
      if (!notif)
        return res.status(404).json({ error: "Notification not found" });

      await notif.destroy();
      res.json({ success: true });
    } catch (err) {
      console.error("[Notification Delete Error]:", err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new NotificationController();
