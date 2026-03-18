import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  FlatList as FlatListType,
  useColorScheme,
} from "react-native";
import {
  useSocketStatus,
  useChatRoom,
  useSocketErrors,
  useChatMessages,
} from "../hooks/use-socket";
import { useTRPC } from "../utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as socketService from "../services/socket-service";
import { ChatMessagePayload } from "@repo/websockets";

export function ChatDemo() {
  const trpc = useTRPC();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [message, setMessage] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const messageListRef = useRef<FlatListType<ChatMessagePayload>>(null);

  const { isConnected } = useSocketStatus();
  const { currentRoomId, roomInfo, joinRoom, leaveRoom, sendMessage } =
    useChatRoom();
  const { lastError } = useSocketErrors();
  const { messages, clearMessages } = useChatMessages();

  const {
    data: rooms,
    isLoading: isLoadingRooms,
    refetch: refetchRooms,
  } = useQuery(trpc.chatroom.getRooms.queryOptions());

  const { mutate: createRoom } = useMutation(
    trpc.chatroom.createRoom.mutationOptions({
      onSuccess: () => {
        setRoomName("");
        setIsCreating(false);
        refetchRooms();
      },
    })
  );

  const handleLeaveRoom = () => {
    leaveRoom();
    clearMessages();
  };

  const handleSendMessage = () => {
    if (message.trim() && currentRoomId) {
      sendMessage(message);
      setMessage("");
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const isMyMessage = (senderId: string) => {
    const socketId = socketService.getSocket()?.id;
    return senderId === socketId;
  };

  const bg = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#f4f4f5";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";
  const textColor = isDark ? "#fafafa" : "#09090b";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";

  // ── Room list ──────────────────────────────────────────────────────────────
  if (!currentRoomId) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.row, styles.spaceBetween, styles.mb12]}>
          <Text style={[styles.heading, { color: textColor }]}>Chat Rooms</Text>
          <Text style={{ fontSize: 13, color: isConnected ? "#22c55e" : "#ef4444" }}>
            ● {isConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>

        {/* Room list */}
        {isLoadingRooms ? (
          <ActivityIndicator size="small" style={styles.mb12} />
        ) : (
          <View style={[styles.roomList]}>
            {rooms?.length && rooms.length > 0 ? (
              <FlatList
                data={rooms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => joinRoom(item.id)}
                    style={({ pressed }) => [
                      styles.roomCard,
                      { backgroundColor: cardBg, borderColor },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text style={[styles.roomName, { color: textColor }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.roomMeta, { color: mutedColor }]}>
                      {item.userCount} {item.userCount === 1 ? "user" : "users"}
                    </Text>
                  </Pressable>
                )}
              />
            ) : (
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                No rooms available
              </Text>
            )}
          </View>
        )}

        {/* Create room */}
        {isCreating ? (
          <View style={styles.mb12}>
            <TextInput
              style={[styles.input, { backgroundColor: bg, borderColor, color: textColor }]}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Room name"
              placeholderTextColor={mutedColor}
            />
            <View style={[styles.row, styles.gap8, { marginTop: 8 }]}>
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnPrimary, { flex: 1, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => createRoom({ name: roomName })}
              >
                <Text style={styles.btnPrimaryText}>Create</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnSecondary, { flex: 1, borderColor, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setIsCreating(false)}
              >
                <Text style={[styles.btnSecondaryText, { color: textColor }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnSecondary, { borderColor, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setIsCreating(true)}
          >
            <Text style={[styles.btnSecondaryText, { color: textColor }]}>+ New Room</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Chat room ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.flex, { backgroundColor: bg }]}>
      {/* Room header */}
      <View style={[styles.row, styles.spaceBetween, styles.roomHeader, { borderColor, backgroundColor: cardBg }]}>
        <Text style={[styles.heading, { color: textColor }]}>
          {roomInfo?.name || currentRoomId}
        </Text>
        <Text style={{ fontSize: 13, color: isConnected ? "#22c55e" : "#ef4444" }}>
          ● {isConnected ? "Connected" : "Disconnected"}
        </Text>
      </View>

      {/* Messages */}
      <View style={[styles.flex, styles.messagesContainer, { backgroundColor: cardBg }]}>
        {messages.length === 0 ? (
          <Text style={[styles.emptyText, { color: mutedColor }]}>
            No messages yet. Start chatting!
          </Text>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => {
              messageListRef.current?.scrollToEnd({ animated: true });
            }}
            ref={messageListRef}
            renderItem={({ item }) => {
              const isMine = isMyMessage(item.senderId);
              return (
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  <Text style={styles.bubbleSender}>{item.senderName}</Text>
                  <Text style={[styles.bubbleText, { color: isMine ? "#fafafa" : textColor }]}>
                    {item.content}
                  </Text>
                  <Text style={styles.bubbleTime}>
                    {formatMessageTime(item.timestamp)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

      {lastError && (
        <Text style={styles.errorText}>Error: {lastError.message}</Text>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { borderColor, backgroundColor: bg }]}>
        <TextInput
          style={[styles.messageInput, { flex: 1, backgroundColor: cardBg, borderColor, color: textColor }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message…"
          placeholderTextColor={mutedColor}
        />
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            { marginLeft: 8, opacity: !message.trim() || pressed ? 0.5 : 1 },
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim()}
        >
          <Text style={styles.btnPrimaryText}>Send</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.btn, styles.btnDestructive, { margin: 8, opacity: pressed ? 0.8 : 1 }]}
        onPress={handleLeaveRoom}
      >
        <Text style={styles.btnPrimaryText}>Leave Room</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  spaceBetween: { justifyContent: "space-between" },
  gap8: { gap: 8 },
  mb12: { marginBottom: 12 },
  heading: { fontSize: 17, fontWeight: "600" },

  // Room list
  roomList: { height: 200, marginBottom: 12 },
  roomCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  roomName: { fontSize: 15, fontWeight: "500", marginBottom: 2 },
  roomMeta: { fontSize: 13 },
  emptyText: { textAlign: "center", padding: 16, fontSize: 14 },

  // Room header
  roomHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },

  // Messages
  messagesContainer: {
    borderRadius: 8,
    margin: 8,
    padding: 8,
  },
  messagesContent: { paddingBottom: 16 },
  bubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  myBubble: {
    backgroundColor: "#09090b",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    backgroundColor: "#e4e4e7",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  bubbleSender: { fontSize: 11, fontWeight: "600", color: "#a1a1aa", marginBottom: 2 },
  bubbleText: { fontSize: 14 },
  bubbleTime: { fontSize: 10, color: "#a1a1aa", alignSelf: "flex-end", marginTop: 4 },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },

  // Buttons
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#09090b" },
  btnPrimaryText: { color: "#fafafa", fontWeight: "500", fontSize: 14 },
  btnSecondary: { backgroundColor: "transparent", borderWidth: 1 },
  btnSecondaryText: { fontWeight: "500", fontSize: 14 },
  btnDestructive: { backgroundColor: "#ef4444" },

  errorText: { color: "#ef4444", fontSize: 12, marginHorizontal: 8 },
});

const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo < 7) {
    return `${date.toLocaleDateString([], { weekday: "short" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};
