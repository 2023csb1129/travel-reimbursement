"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { decryptAES, encryptAES } from "@/lib/encryption-client";
import { Send, MessageCircle, User, Search, MessageSquare, Shield, KeyRound } from "lucide-react";
import { DiffieHellman } from "@/lib/diffie-hellman";
import { OfflineGuard } from "@/components/OfflineGuard";

interface DMUser {
  id: string;
  name: string;
  username: string;
  email: string;
  unreadCount?: number;
}

const avatarColors = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-orange-500 to-amber-600",
  "from-teal-500 to-cyan-600",
  "from-emerald-500 to-green-600",
];

function getAvatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MessagesPage() {
  return (
    <OfflineGuard featureName="Messaging">
      <MessagesContent />
    </OfflineGuard>
  );
}

function MessagesContent() {
  const aesKey = "default-aes-key-256bit"; // Fixed per requirements for direct messages
  const { data: session } = useSession();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DMUser[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Previous conversants (recent chats) could be fetched here, but for simplicity we'll just keep selected users in a local list
  const [recentUsers, setRecentUsers] = useState<DMUser[]>([]);

  const [selectedUser, setSelectedUser] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch recent users
  const fetchRecentUsers = async () => {
    try {
      const res = await fetch("/api/direct-messages");
      if (res.ok) {
        const data = await res.json();
        setRecentUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecentUsers();
    const interval = setInterval(fetchRecentUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Polling for messages
  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!selectedUser?.id) return;
    try {
      const response = await fetch(
        `/api/direct-messages?otherId=${selectedUser.id}`
      );
      if (response.ok) {
        setMessages(await response.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    try {
      setSending(true);
      const response = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          plaintext: newMessage,
          aesKey,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const handleSelectUser = (user: DMUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
    
    // Add to recent if not there
    if (!recentUsers.find(u => u.id === user.id)) {
      setRecentUsers(prev => [user, ...prev]);
    }
  };

  const decryptMessage = (encrypted: string) => {
    try {
      return decryptAES(encrypted, aesKey);
    } catch {
      return "[Error decrypting]";
    }
  };

  const handleApproveDHRequest = async (msg: any, payload: any) => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (!data.groups || data.groups.length === 0) {
        alert("You do not manage any groups to share.");
        return;
      }
      
      const group = data.groups[0];
      
      const dh = new DiffieHellman();
      dh.p = BigInt("0x" + payload.p);
      dh.g = BigInt("0x" + payload.g);
      const sharedSecretHex = dh.computeSecret(payload.publicKey);
      
      const responsePayload = JSON.stringify({
        type: "DH_JOIN_RESPONSE",
        publicKey: dh.getPublicKeyHex(),
        encryptedData: encryptAES(JSON.stringify({
          groupId: group.groupId,
          secretKey: group.secretKey
        }), sharedSecretHex.substring(0, 64))
      });

      await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: msg.senderId,
          plaintext: responsePayload,
          aesKey
        })
      });

      fetchMessages();
    } catch (err) {
      console.error(err);
      alert("Failed to approve request.");
    }
  };

  const handleDecryptDHResponse = (payload: any) => {
    try {
      const stateStr = localStorage.getItem(`dh_request_${selectedUser?.id}`);
      if (!stateStr) {
        alert("Cannot decrypt. Private key state not found.");
        return;
      }
      
      const state = JSON.parse(stateStr);
      const dh = new DiffieHellman();
      dh.p = BigInt("0x" + state.p);
      dh.g = BigInt("0x" + state.g);
      (dh as any).privateKey = BigInt("0x" + state.privateKey);
      
      const sharedSecretHex = dh.computeSecret(payload.publicKey);
      const decryptedStr = decryptAES(payload.encryptedData, sharedSecretHex.substring(0, 64));
      
      const credentials = JSON.parse(decryptedStr);
      alert(`Group Credentials Received Securely!\n\nGroup ID: ${credentials.groupId}\nSecret Key: ${credentials.secretKey}\n\nYou can now go to Groups > Join to enter these.`);
      
    } catch (err) {
      console.error(err);
      alert("Failed to decrypt the credentials. The exchange might be invalid.");
    }
  };

  const renderMessageContent = (decryptedText: string, msg: any, isMine: boolean) => {
    try {
      if (decryptedText.includes("DH_JOIN_REQUEST")) {
        const payload = JSON.parse(decryptedText);
        if (payload.type === "DH_JOIN_REQUEST") {
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span className="font-bold">Group Access Request</span>
              </div>
              <p>{payload.message}</p>
              {!isMine && (
                <button 
                  onClick={() => handleApproveDHRequest(msg, payload)}
                  className="mt-2 bg-white text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold w-fit shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Approve & Share Key
                </button>
              )}
            </div>
          );
        }
      } else if (decryptedText.includes("DH_JOIN_RESPONSE")) {
        const payload = JSON.parse(decryptedText);
        if (payload.type === "DH_JOIN_RESPONSE") {
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <KeyRound size={16} />
                <span className="font-bold">Group Credentials Received</span>
              </div>
              <p>The group head has securely shared the credentials.</p>
              {isMine ? (
                <span className="text-xs opacity-70">You shared the credentials.</span>
              ) : (
                <button 
                  onClick={() => handleDecryptDHResponse(payload)}
                  className="mt-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-fit shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  Decrypt & Show Credentials
                </button>
              )}
            </div>
          );
        }
      }
    } catch (e) {
      // Not a JSON DH payload, fall through
    }
    
    return <p className="break-words leading-relaxed">{decryptedText}</p>;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-64px)] flex flex-col">


      <div className="flex-1 flex min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Left Sidebar - Search & Users */}
        <div className="w-80 border-r border-gray-100 flex flex-col shrink-0 bg-gray-50/30">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-lightest)] rounded-xl text-sm transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {searchQuery ? (
              <div className="p-2">
                <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Search Results</h3>
                {searching ? (
                  <div className="text-center text-gray-400 text-sm py-4">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">No users found</div>
                ) : (
                  searchResults.map(user => (
                    <UserRow 
                      key={user.id} 
                      user={user} 
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => handleSelectUser(user)} 
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="p-2">
                <h3 className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Recent</h3>
                {recentUsers.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8 px-4">
                    Search for a username above to start chatting!
                  </div>
                ) : (
                  recentUsers.map(user => (
                    <UserRow 
                      key={user.id} 
                      user={user} 
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        if (user.unreadCount) {
                          setRecentUsers(prev => prev.map(u => u.id === user.id ? { ...u, unreadCount: 0 } : u));
                        }
                      }} 
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Area - Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${getAvatarColor(selectedUser.id)}`}>
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-xs text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-[var(--primary-lightest)] text-[var(--primary)] rounded-full flex items-center justify-center mb-4">
                      <MessageCircle size={32} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Start the conversation</h3>
                    <p className="text-sm text-gray-500 max-w-sm">Send a secure, AES-encrypted direct message to @{selectedUser.username}.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === session?.user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                          isMine
                            ? "bg-gradient-to-br from-[var(--primary)] to-[#2d7d5a] text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}>
                          <div className="break-words leading-relaxed">
                            {renderMessageContent(decryptMessage(msg.encryptedContent), msg, isMine)}
                          </div>
                          <p className={`text-[10px] mt-1.5 text-right ${isMine ? "text-white/70" : "text-gray-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary-lightest)] transition-all">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-2 text-sm"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="p-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[#134d32] disabled:opacity-50 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <MessageSquare size={32} className="text-gray-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h2>
              <p className="text-gray-500 max-w-sm">Search for a user by their unique username on the left to start a secure conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, isSelected, onClick }: { user: DMUser; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
        isSelected
          ? "bg-[var(--primary-lightest)] shadow-sm border border-[var(--border-subtle)]"
          : "hover:bg-gray-100 border border-transparent"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br ${getAvatarColor(user.id)} relative`}>
        {getInitials(user.name)}
        {user.unreadCount ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {user.unreadCount > 9 ? "9+" : user.unreadCount}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm truncate ${isSelected ? "text-[var(--primary)]" : "text-gray-900"}`}>
          {user.name}
        </p>
        <p className="text-[11px] text-gray-500 truncate">@{user.username}</p>
      </div>
    </button>
  );
}
