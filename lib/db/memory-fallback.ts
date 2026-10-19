import type { VisibilityType } from "@/components/chat/visibility-selector";
import { generateUUID } from "../utils";
import type { Chat, DBMessage, User } from "./schema";
import { generateHashedPassword } from "./utils";

const memUsers = new Map<string, User>();
const memChats = new Map<string, Chat>();
const memMessages = new Map<string, DBMessage[]>();

export const memoryStore = {
  getUser: async (email: string): Promise<User[]> => {
    const user = memUsers.get(email);
    return user ? [user] : [];
  },

  createUser: async (email: string, password: string) => {
    const hashedPassword = generateHashedPassword(password);
    const newUser = {
      id: generateUUID(),
      email,
      password: hashedPassword,
    } as unknown as User;
    memUsers.set(email, newUser);
    return [newUser];
  },

  createGuestUser: async () => {
    const email = `guest-${Date.now()}`;
    const password = generateHashedPassword(generateUUID());
    const id = generateUUID();
    const guestUser = { id, email, password } as unknown as User;
    memUsers.set(email, guestUser);
    return [{ email, id }];
  },

  saveChat: async ({
    id,
    userId,
    title,
    visibility,
  }: {
    id: string;
    userId: string;
    title: string;
    visibility: VisibilityType;
  }) => {
    const newChat = {
      id,
      userId,
      title,
      visibility,
      createdAt: new Date(),
    } as unknown as Chat;
    memChats.set(id, newChat);
    return [newChat];
  },

  deleteChatById: async ({ id }: { id: string }) => {
    const chat = memChats.get(id);
    memChats.delete(id);
    memMessages.delete(id);
    return chat;
  },

  deleteAllChatsByUserId: async ({ userId }: { userId: string }) => {
    let count = 0;
    for (const [id, chat] of memChats.entries()) {
      if (chat.userId === userId) {
        memChats.delete(id);
        memMessages.delete(id);
        count++;
      }
    }
    return { deletedCount: count };
  },

  getChatsByUserId: async ({
    id,
    limit = 20,
  }: {
    id: string;
    limit?: number;
    startingAfter?: string | null;
    endingBefore?: string | null;
  }) => {
    const chats = Array.from(memChats.values())
      .filter((c) => c.userId === id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return { chats: chats.slice(0, limit), hasMore: false };
  },

  getChatById: async ({ id }: { id: string }) => {
    return memChats.get(id) ?? null;
  },

  saveMessages: async ({ messages }: { messages: DBMessage[] }) => {
    for (const msg of messages) {
      const list = memMessages.get(msg.chatId) ?? [];
      list.push(msg);
      memMessages.set(msg.chatId, list);
    }
    return messages;
  },

  getMessagesByChatId: async ({ id }: { id: string }) => {
    return memMessages.get(id) ?? [];
  },

  updateMessage: async ({ id, content }: { id: string; content: any }) => {
    for (const [, list] of memMessages.entries()) {
      const found = list.find((m) => m.id === id);
      if (found) {
        found.parts = content;
        return [found];
      }
    }
    return [];
  },

  getMessageCountByUserId: async (_params?: {
    id: string;
    differenceInHours: number;
  }) => 0,

  createStreamId: async () => {},

  getStreamIdsByChatId: async (_params?: { chatId: string }) => [],

  updateChatTitleById: async ({
    chatId,
    title,
  }: {
    chatId: string;
    title: string;
  }) => {
    const c = memChats.get(chatId);
    if (c) c.title = title;
  },

  updateChatVisibilityById: async ({
    chatId,
    visibility,
  }: {
    chatId: string;
    visibility: VisibilityType;
  }) => {
    const c = memChats.get(chatId);
    if (c) c.visibility = visibility;
  },

  voteMessage: async () => [],
  getVotesByChatId: async () => [],
  saveDocument: async () => [],
  updateDocumentContent: async () => [],
  getDocumentsById: async () => [],
  getDocumentById: async () => null,
  deleteDocumentsByIdAfterTimestamp: async () => [],
  saveSuggestions: async () => [],
  getSuggestionsByDocumentId: async () => [],
  getMessageById: async () => [],
  deleteMessagesByChatIdAfterTimestamp: async () => [],
};
