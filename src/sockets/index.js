const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { Form } = require("../models/Form");
const { FormHistory } = require("../models/FormHistory");
const { User } = require("../models/User");
const { createPresenceStore } = require("../services/presenceStore");
const { canAccessForm } = require("../services/formService");

const presenceStore = createPresenceStore();

function buildRoomName(formId) {
  return `form:${formId}`;
}

async function authenticateSocket(socket) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return User.findById(payload.sub).select("-passwordHash");
  } catch (_error) {
    return null;
  }
}

function attachSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.user = user;
    return next();
  });

  io.on("connection", (socket) => {
    socket.on("form:join", async ({ formId }) => {
      try {
        const form = await Form.findById(formId);
        if (!form || !canAccessForm(form, socket.user._id)) {
          socket.emit("form:error", { message: "Form not found or unauthorized" });
          return;
        }

        socket.data.formId = formId;
        await socket.join(buildRoomName(formId));

        const presence = await presenceStore.getPresence(formId);
        socket.emit("presence:snapshot", { presence });
        socket.to(buildRoomName(formId)).emit("presence:joined", {
          userId: socket.user._id.toString(),
          name: socket.user.name
        });
      } catch (error) {
        socket.emit("form:error", { message: error.message });
      }
    });

    socket.on("cursor:move", async (payload) => {
      const formId = socket.data.formId;
      if (!formId) {
        return;
      }

      const cursorPayload = {
        userId: socket.user._id.toString(),
        name: socket.user.name,
        x: payload.x,
        y: payload.y,
        color: payload.color || "#2563eb"
      };

      await presenceStore.setCursor(formId, socket.user._id, cursorPayload);
      socket.to(buildRoomName(formId)).emit("cursor:moved", cursorPayload);
    });

    async function handlePatch(eventType, payload) {
      const formId = socket.data.formId;
      if (!formId) {
        return;
      }

      const form = await Form.findById(formId);
      if (!form || !canAccessForm(form, socket.user._id)) {
        socket.emit("form:error", { message: "Form not found or unauthorized" });
        return;
      }

      if (payload.version && payload.version < form.version) {
        socket.emit("form:error", {
          message: "Version conflict",
          latestVersion: form.version
        });
        return;
      }

      await FormHistory.create({
        formId: form._id,
        version: form.version,
        snapshot: form.toObject(),
        actorId: socket.user._id
      });

      form.version += 1;
      form.updatedAt = new Date();

      if (eventType === "field:add" && payload.field) {
        form.fields.push(payload.field);
      }

      if (eventType === "field:update" && payload.fieldId) {
        const target = form.fields.find((field) => field.id === payload.fieldId);
        if (target) {
          Object.assign(target, payload.patch || {});
        }
      }

      if (eventType === "field:delete" && payload.fieldId) {
        form.fields = form.fields.filter((field) => field.id !== payload.fieldId);
      }

      if (eventType === "field:reorder" && Array.isArray(payload.fieldOrder)) {
        const orderMap = new Map(payload.fieldOrder.map((fieldId, index) => [fieldId, index + 1]));
        form.fields = form.fields
          .map((field) => ({
            ...field.toObject(),
            order: orderMap.get(field.id) || field.order
          }))
          .sort((a, b) => a.order - b.order);
      }

      if (eventType === "form:patch" && payload.formPatch) {
        if (payload.formPatch.title !== undefined) {
          form.title = payload.formPatch.title;
        }
        if (payload.formPatch.theme !== undefined) {
          form.theme = payload.formPatch.theme;
        }
      }

      await form.save();

      io.to(buildRoomName(formId)).emit("form:patched", {
        actorId: socket.user._id.toString(),
        type: eventType,
        payload,
        version: form.version,
        updatedAt: form.updatedAt
      });
    }

    socket.on("field:add", (payload) => handlePatch("field:add", payload));
    socket.on("field:update", (payload) => handlePatch("field:update", payload));
    socket.on("field:delete", (payload) => handlePatch("field:delete", payload));
    socket.on("field:reorder", (payload) => handlePatch("field:reorder", payload));
    socket.on("form:patch", (payload) => handlePatch("form:patch", payload));
    socket.on("form:undo", (payload) => handlePatch(payload?.inverse?.type || "form:patch", payload?.inverse || {}));

    socket.on("disconnect", async () => {
      const formId = socket.data.formId;
      if (!formId) {
        return;
      }

      await presenceStore.removePresence(formId, socket.user._id);
      socket.to(buildRoomName(formId)).emit("presence:left", {
        userId: socket.user._id.toString()
      });
    });
  });

  return io;
}

module.exports = { attachSocketServer };
