"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, Link as LinkIcon, Send, Lock, LockKeyhole } from "lucide-react";
import { DiffieHellman, deriveAESKeyFromSecret } from "@/lib/diffie-hellman";

export default function JoinGroupPage() {
  const router = useRouter();
  
  // Standard Join state
  const [groupId, setGroupId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // DH Request state
  const [headUsername, setHeadUsername] = useState("");
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const handleStandardJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !secretKey) {
      setJoinError("Both Group ID and Secret Key are required.");
      return;
    }

    try {
      setJoining(true);
      setJoinError("");
      
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, secretKey })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      router.push("/trips");
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleDHRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headUsername) {
      setRequestError("Head username is required.");
      return;
    }

    try {
      setRequesting(true);
      setRequestError("");

      // 1. Find user by username
      const userRes = await fetch(`/api/users/search?q=${encodeURIComponent(headUsername)}`);
      const users = await userRes.json();
      
      const headUser = users.find((u: any) => u.username === headUsername);
      if (!headUser) {
        throw new Error("User with this username not found.");
      }

      // 2. Generate Diffie-Hellman Keypair for this request
      const dh = new DiffieHellman();
      const myPublicKey = dh.getPublicKeyHex();
      
      // Store our private state locally to complete the exchange later
      // We must store the private key (as hex) to reconstruct the DH object
      localStorage.setItem(`dh_request_${headUser.id}`, JSON.stringify({
        privateKey: (dh as any).privateKey.toString(16),
        p: dh.p.toString(16),
        g: dh.g.toString(16),
        publicKey: myPublicKey,
        timestamp: Date.now()
      }));

      // 3. Send DH Request via direct messages
      // We will encode a special JSON payload
      const dhPayload = JSON.stringify({
        type: "DH_JOIN_REQUEST",
        p: dh.p.toString(16),
        g: dh.g.toString(16),
        publicKey: myPublicKey,
        message: `I would like to request the Group ID and Key via secure Diffie-Hellman Exchange.`
      });

      const dmRes = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: headUser.id,
          plaintext: dhPayload,
          aesKey: "default-aes-key-256bit", // Standard DM channel key
          isDHRequest: true // We can use this to render it differently in DM UI
        })
      });

      if (!dmRes.ok) {
        throw new Error("Failed to send DH request.");
      }

      setRequestSuccess(true);
    } catch (err: any) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        
        {/* Direct Entry Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 border border-emerald-100">
            <Shield className="text-emerald-600" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Direct Entry</h2>
          <p className="text-gray-500 mb-8 flex-1">
            If you already have the Group ID and Secret Key, enter them below to join immediately.
          </p>

          <form onSubmit={handleStandardJoin} className="space-y-4">
            {joinError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {joinError}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Group ID</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  placeholder="e.g. GRP-123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secret Key</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter secret key"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joining}
              className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Group"}
            </button>
          </form>
        </div>

        {/* Diffie-Hellman Request Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-8 rounded-2xl shadow-lg border border-blue-800 flex flex-col text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <LockKeyhole size={120} />
          </div>

          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 border border-white/20">
            <Lock className="text-blue-200" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Request Access</h2>
          <p className="text-blue-200 mb-8 flex-1 text-sm leading-relaxed">
            Don't have the key? Request access from the group head. 
            This uses a secure <strong className="text-white">Diffie-Hellman Key Exchange</strong> to safely transmit the credentials to you via Direct Messages.
          </p>

          {requestSuccess ? (
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center">
              <div className="w-12 h-12 bg-green-500/20 text-green-300 rounded-full flex items-center justify-center mx-auto mb-3">
                <Send size={20} />
              </div>
              <h3 className="font-bold mb-1">Request Sent Securely</h3>
              <p className="text-sm text-blue-200">
                Check your Direct Messages. Once the head approves, you'll securely receive the credentials.
              </p>
              <button 
                onClick={() => router.push("/messages")}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
              >
                Go to Messages
              </button>
            </div>
          ) : (
            <form onSubmit={handleDHRequest} className="space-y-4">
              {requestError && (
                <div className="p-3 bg-red-500/20 text-red-200 text-sm rounded-lg border border-red-500/30">
                  {requestError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-blue-100 mb-1.5">Group Head Username</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 font-bold">@</div>
                  <input
                    type="text"
                    value={headUsername}
                    onChange={(e) => setHeadUsername(e.target.value)}
                    placeholder="head_username"
                    className="w-full pl-9 pr-4 py-2.5 bg-black/20 border border-white/20 focus:bg-black/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl text-white placeholder-blue-300/50 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={requesting}
                className="w-full py-2.5 mt-2 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Shield size={18} />
                {requesting ? "Initiating Exchange..." : "Start Key Exchange"}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
