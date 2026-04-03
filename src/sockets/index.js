const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { User } = require("../models/User");
const { Form } = require("../models/Form");
const { createPresenceStore } = require("../services/presenceStore");

const presenceStore = createPresenceStore();

// In-memory room tracker (userId -> { formId, name, color })
const roomMembers = new Map();

function attachSocketServer(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", async (socket) => {
    let authenticatedUser = null;

    // Authenticate
    try {
      const token = socket.handshake?.auth?.token;
      if (token) {
        const payload = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(payload.sub).select("-passwordHash").lean();
        if (user) {
          authenticatedUser = {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            color: user.cursorColor || "#2563eb",
          };
        }
      }
    } catch (_err) {
      // Anonymous connection allowed for public forms
    }

    /* ───── form:join ───── */
    socket.on("form:join", async (data) => {
      const formId = data?.formId;
      if (!formId) return;

      socket.join(formId);

      if (authenticatedUser) {
        roomMembers.set(socket.id, { ...authenticatedUser, formId });

        // Notify others in the room
        socket.to(formId).emit("presence:joined", {
          userId: authenticatedUser.userId,
          name: authenticatedUser.name,
          color: authenticatedUser.color,
        });

        // Send current presence snapshot to the joining user
        const members = [];
        roomMembers.forEach((member) => {
          if (member.formId === formId) {
            members.push({
              userId: member.userId,
              name: member.name,
              color: member.color,
            });
          }
        });
        socket.emit("presence:snapshot", { presence: members });
      }
    });

    /* ───── cursor:move ───── */
    socket.on("cursor:move", async (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;

      const cursorData = {
        userId: member.userId,
        name: member.name,
        color: data?.color || member.color,
        x: data?.x || 0,
        y: data?.y || 0,
      };

      // Store in Redis (with 5s TTL)
      await presenceStore.setCursor(member.formId, member.userId, cursorData).catch(() => {});

      // Broadcast to room
      socket.to(member.formId).emit("cursor:moved", cursorData);
    });

    /* ───── field:add ───── */
    socket.on("field:add", (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;
      socket.to(member.formId).emit("form:patched", {
        type: "field:add",
        actorId: member.userId,
        ...data,
      });
    });

    /* ───── field:update ───── */
    socket.on("field:update", (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;
      socket.to(member.formId).emit("form:patched", {
        type: "field:update",
        actorId: member.userId,
        ...data,
      });
    });

    /* ───── field:delete ───── */
    socket.on("field:delete", (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;
      socket.to(member.formId).emit("form:patched", {
        type: "field:delete",
        actorId: member.userId,
        ...data,
      });
    });

    /* ───── field:reorder ───── */
    socket.on("field:reorder", (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;
      socket.to(member.formId).emit("form:patched", {
        type: "field:reorder",
        actorId: member.userId,
        ...data,
      });
    });

    /* ───── form:patch (title, theme, etc.) ───── */
    socket.on("form:patch", (data) => {
      const member = roomMembers.get(socket.id);
      if (!member) return;
      socket.to(member.formId).emit("form:patched", {
        type: "form:patch",
        actorId: member.userId,
        ...data,
      });
    });

    /* ───── disconnect ───── */
    socket.on("disconnect", async () => {
      const member = roomMembers.get(socket.id);
      if (member) {
        // Notify others
        socket.to(member.formId).emit("presence:left", {
          userId: member.userId,
          name: member.name,
        });

        // Clean up presence
        await presenceStore.removePresence(member.formId, member.userId).catch(() => {});
        roomMembers.delete(socket.id);
      }
    });
  });
}

module.exports = { attachSocketServer };
