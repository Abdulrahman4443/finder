import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  addMessage,
  getNetworkState,
  mergeMessages,
  patchConnection,
  markConnectionRecovered,
} from "./store";
import type { ChatMessage } from "./types";

type HelloPayload = { type: "hello"; userId: string; name: string };
type MessagePayload = { type: "message"; message: ChatMessage };
type SyncRequestPayload = { type: "sync_request"; fromUserId: string };
type SyncResponsePayload = {
  type: "sync_response";
  messages: ChatMessage[];
  recovered: boolean;
  peerId: string;
  peerName: string;
};
type RecoveredPayload = { type: "recovered" };

type ChatPayload =
  | HelloPayload
  | MessagePayload
  | SyncRequestPayload
  | SyncResponsePayload
  | RecoveredPayload;

const channels = new Map<string, RealtimeChannel>();

function topic(roomId: string) {
  return `findr-chat:${roomId}`;
}

async function send(roomId: string, payload: ChatPayload) {
  const channel = channels.get(roomId);
  if (!channel) return;
  await channel.send({ type: "broadcast", event: "chat", payload });
}

function handleIncoming(roomId: string, myUserId: string, payload: ChatPayload) {
  switch (payload.type) {
    case "hello": {
      if (payload.userId === myUserId) return;
      patchConnection(roomId, {
        peerId: payload.userId,
        otherReporter: {
          id: payload.userId,
          name: payload.name,
          trust: 50,
        },
      });
      break;
    }
    case "message": {
      if (payload.message.senderId === myUserId) return;
      addMessage(payload.message);
      break;
    }
    case "sync_request": {
      if (payload.fromUserId === myUserId) return;
      const s = getNetworkState();
      const conn = s.connections.find((c) => c.id === roomId);
      const msgs = s.messages.filter((m) => m.connectionId === roomId);
      void send(roomId, {
        type: "sync_response",
        messages: msgs,
        recovered: conn?.recovered ?? false,
        peerId: myUserId,
        peerName:
          s.connections.find((c) => c.id === roomId)?.otherReporter.name ||
          "FindrAI user",
      });
      // Prefer our display name from the hello we already sent; fix peer name via hello.
      break;
    }
    case "sync_response": {
      mergeMessages(payload.messages);
      if (payload.recovered) {
        markConnectionRecovered(roomId, { silent: true, skipBroadcast: true });
      }
      if (payload.peerId !== myUserId) {
        patchConnection(roomId, {
          peerId: payload.peerId,
          otherReporter: {
            id: payload.peerId,
            name: payload.peerName,
            trust: 50,
          },
        });
      }
      break;
    }
    case "recovered": {
      markConnectionRecovered(roomId, { silent: true, skipBroadcast: true });
      break;
    }
  }
}

/**
 * Join a live recovery channel. Both signed-in users must join the same room id.
 * Messages are broadcast over Supabase Realtime and mirrored into the local store.
 */
export async function joinLiveChat(
  roomId: string,
  me: { id: string; name: string },
): Promise<() => void> {
  await leaveLiveChat(roomId);

  // Ensure Realtime uses the current session JWT.
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    await supabase.realtime.setAuth(data.session.access_token);
  }

  const channel = supabase.channel(topic(roomId), {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "chat" }, ({ payload }) => {
    handleIncoming(roomId, me.id, payload as ChatPayload);
  });

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Chat connect timed out")), 12000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timer);
        resolve();
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        window.clearTimeout(timer);
        reject(new Error("Could not connect to live chat"));
      }
    });
  });

  channels.set(roomId, channel);

  await send(roomId, { type: "hello", userId: me.id, name: me.name });
  await send(roomId, { type: "sync_request", fromUserId: me.id });

  return () => {
    void leaveLiveChat(roomId);
  };
}

export async function leaveLiveChat(roomId: string) {
  const channel = channels.get(roomId);
  if (!channel) return;
  channels.delete(roomId);
  await supabase.removeChannel(channel);
}

export async function broadcastChatMessage(roomId: string, message: ChatMessage) {
  await send(roomId, { type: "message", message });
}

export async function broadcastRecovered(roomId: string) {
  await send(roomId, { type: "recovered" });
}

export function isLiveChatConnected(roomId: string) {
  return channels.has(roomId);
}
