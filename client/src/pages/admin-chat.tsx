import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle, Send, Bot, User, Headphones, PhoneCall,
  UserCircle, BarChart3, Clock, Circle, CalendarCheck, Link2,
  TrendingUp, LogOut,
} from "lucide-react";

interface ChatMsg {
  id: number;
  role: "user" | "ai" | "agent";
  content: string;
  agentName?: string;
  createdAt: string;
}

interface ConversationItem {
  id: number;
  sessionId: string;
  userId: number | null;
  status: "ai" | "human" | "closed";
  assignedAgent: string | null;
  inviteStatus: "none" | "early" | "late";
  invitedBy: string | null;
  quizSummary: { traderType?: string; avgScore?: number; rankName?: string } | null;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
}

interface AgentStats {
  today: { invites: number; earlyInvites: number; lateInvites: number; takeovers: number; inviteRate: string };
  week: { invites: number; earlyInvites: number; lateInvites: number; takeovers: number; inviteRate: string };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function AdminChatPage() {
  const [agentName, setAgentName] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [transferAlert, setTransferAlert] = useState<number | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 检查 session
  useEffect(() => {
    fetch("/api/agent/session", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.agentName) setAgentName(d.agentName); });
  }, []);

  // 加载个人统计
  const loadStats = useCallback(() => {
    fetch("/api/agent/dashboard", { credentials: "include" })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (agentName) {
      loadStats();
      const t = setInterval(loadStats, 60000);
      return () => clearInterval(t);
    }
  }, [agentName, loadStats]);

  const handleLogin = async () => {
    setLoginError("");
    const res = await fetch("/api/agent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setAgentName(data.name);
    } else {
      setLoginError(data.message || "登录失败");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/agent/logout", { method: "POST", credentials: "include" });
    setAgentName(null);
    wsRef.current?.close();
  };

  // 连接 WebSocket
  const connectWs = useCallback(() => {
    if (!agentName || wsRef.current?.readyState === WebSocket.OPEN) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/chat?role=agent&agentName=${encodeURIComponent(agentName)}`);

    ws.onopen = () => {
      // 加载会话列表
      fetch("/api/agent/conversations", { credentials: "include" })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setConversations(d); });
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case "conversations":
          setConversations(data.conversations);
          break;
        case "conversation_detail":
          setMessages(data.messages || []);
          setSelectedConv(prev => prev ? { ...prev, status: data.status } : prev);
          break;
        case "message":
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setConversations(prev =>
            prev.map(c =>
              c.id === data.conversationId
                ? { ...c, lastMessage: data.message.content, lastMessageAt: data.message.createdAt }
                : c
            )
          );
          break;
        case "status_changed":
          setConversations(prev =>
            prev.map(c =>
              c.id === data.conversationId
                ? { ...c, status: data.status, assignedAgent: data.assignedAgent ?? c.assignedAgent }
                : c
            )
          );
          setSelectedConv(prev =>
            prev?.id === data.conversationId ? { ...prev, status: data.status } as ConversationItem : prev
          );
          break;
        case "ai_suggestion":
          setAiSuggestion(data.suggestion);
          break;
        case "transfer_request":
          setTransferAlert(data.conversationId);
          break;
        case "conversation_closed":
          setConversations(prev => prev.filter(c => c.id !== data.conversationId));
          if (selectedId === data.conversationId) {
            setSelectedId(null);
            setSelectedConv(null);
            setMessages([]);
          }
          break;
      }
    };

    ws.onclose = () => { setTimeout(connectWs, 3000); };
    wsRef.current = ws;
  }, [agentName, selectedId]);

  useEffect(() => {
    if (agentName) {
      connectWs();
      return () => { wsRef.current?.close(); };
    }
  }, [agentName, connectWs]);

  const selectConversation = (conv: ConversationItem) => {
    setSelectedId(conv.id);
    setSelectedConv(conv);
    setMessages([]);
    setAiSuggestion(null);
    setTransferAlert(null);
    wsRef.current?.send(JSON.stringify({ type: "watch", conversationId: conv.id }));
  };

  const takeover = () => {
    if (!selectedId) return;
    wsRef.current?.send(JSON.stringify({ type: "takeover", conversationId: selectedId }));
  };

  const release = () => {
    if (!selectedId) return;
    wsRef.current?.send(JSON.stringify({ type: "release", conversationId: selectedId }));
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || !selectedId) return;
    wsRef.current?.send(JSON.stringify({ type: "message", conversationId: selectedId, content: text }));
    setInput("");
  };

  const markInvite = async (status: "early" | "late") => {
    if (!selectedId) return;
    await fetch(`/api/agent/conversations/${selectedId}/invite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    });
    setConversations(prev =>
      prev.map(c => c.id === selectedId ? { ...c, inviteStatus: status, invitedBy: agentName } : c)
    );
    setSelectedConv(prev => prev ? { ...prev, inviteStatus: status } as ConversationItem : prev);
    loadStats();
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // 登录界面
  if (!agentName) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0E17" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-80 p-6 rounded-2xl"
          style={{ background: "#0F1620", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Headphones className="w-5 h-5" style={{ color: "#667eea" }} />
            <h2 className="text-lg font-bold" style={{ color: "#E8E6E1" }}>客服后台</h2>
          </div>
          <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>德湃交易工具 · 销售顾问系统</p>
          <input
            type="text"
            value={loginUsername}
            onChange={e => setLoginUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="账号（如 sera）"
            className="w-full px-3 py-2 rounded-lg mb-2 text-sm bg-transparent outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#E8E6E1" }}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="密码"
            className="w-full px-3 py-2 rounded-lg mb-3 text-sm bg-transparent outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#E8E6E1" }}
          />
          {loginError && (
            <p className="text-xs mb-2 text-center" style={{ color: "#F87171" }}>{loginError}</p>
          )}
          <button
            onClick={handleLogin}
            className="w-full py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}
          >
            登录
          </button>
        </motion.div>
      </div>
    );
  }

  const inviteBadge = (status: "none" | "early" | "late") => {
    if (status === "early") return <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}>提前邀约</span>;
    if (status === "late") return <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.15)", color: "#FB923C" }}>会后发链</span>;
    return null;
  };

  return (
    <div className="h-screen flex" style={{ background: "#0A0E17" }}>
      {/* 左侧：会话列表 + 个人数据 */}
      <div className="w-80 shrink-0 flex flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.06)", background: "#0D1118" }}>

        {/* 头部：客服信息 + 数据看板 */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4" style={{ color: "#667eea" }} />
              <span className="text-sm font-semibold" style={{ color: "#E8E6E1" }}>{agentName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(102,126,234,0.15)", color: "#667eea" }}>客服</span>
            </div>
            <button onClick={handleLogout} title="退出">
              <LogOut className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.25)" }} />
            </button>
          </div>

          {/* 数据看板 */}
          {stats && (
            <div className="space-y-2">
              {/* 今日 */}
              <div className="text-[10px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>今日数据</div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-sm font-bold" style={{ color: "#667eea" }}>{stats.today.takeovers}</div>
                  <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>接管</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: "rgba(34,197,94,0.05)" }}>
                  <div className="text-sm font-bold" style={{ color: "#22C55E" }}>{stats.today.earlyInvites}</div>
                  <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>提前邀</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: "rgba(251,146,60,0.05)" }}>
                  <div className="text-sm font-bold" style={{ color: "#FB923C" }}>{stats.today.lateInvites}</div>
                  <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>会后发</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>邀约率</span>
                </div>
                <span className="text-xs font-bold" style={{ color: "#E8E6E1" }}>{stats.today.inviteRate}</span>
                <div className="h-3 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>本周</span>
                <span className="text-xs font-bold" style={{ color: "#E8E6E1" }}>{stats.week.inviteRate}</span>
              </div>
            </div>
          )}
          <div className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
            {conversations.length} 个活跃会话
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>暂无活跃会话</p>
            </div>
          )}
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className="w-full px-4 py-3 text-left transition-colors"
              style={{
                background: selectedId === conv.id ? "rgba(102,126,234,0.08)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-xs font-medium" style={{ color: "#E8E6E1" }}>
                    {conv.userId ? `用户 #${conv.userId}` : `访客`}
                  </span>
                  {inviteBadge(conv.inviteStatus)}
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="w-2 h-2" fill={conv.status === "human" ? "#F59E0B" : "#07C160"} style={{ color: conv.status === "human" ? "#F59E0B" : "#07C160" }} />
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {conv.status === "human" ? "人工" : "AI"}
                  </span>
                </div>
              </div>
              {conv.quizSummary && (
                <div className="flex items-center gap-1 mb-1">
                  <BarChart3 className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {conv.quizSummary.rankName} · {conv.quizSummary.avgScore}分
                  </span>
                </div>
              )}
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                {conv.lastMessage || "暂无消息"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.2)" }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：聊天详情 */}
      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.08)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>选择一个会话开始沟通</p>
            </div>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <div className="shrink-0 px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: "#E8E6E1" }}>
                  会话 #{selectedId}
                </span>
                {selectedConv?.quizSummary && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(102,126,234,0.15)", color: "#667eea" }}>
                    {selectedConv.quizSummary.traderType} · {selectedConv.quizSummary.rankName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* 邀约按钮 */}
                {selectedConv?.inviteStatus === "none" ? (
                  <>
                    <button
                      onClick={() => markInvite("early")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
                      title="9:30直播前已邀约"
                    >
                      <CalendarCheck className="w-3 h-3" />
                      提前邀约
                    </button>
                    <button
                      onClick={() => markInvite("late")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(251,146,60,0.12)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}
                      title="直播开始后才发链接"
                    >
                      <Link2 className="w-3 h-3" />
                      会后发链接
                    </button>
                  </>
                ) : (
                  <span className="text-xs px-2.5 py-1.5 rounded-lg" style={{
                    background: selectedConv?.inviteStatus === "early" ? "rgba(34,197,94,0.1)" : "rgba(251,146,60,0.1)",
                    color: selectedConv?.inviteStatus === "early" ? "#22C55E" : "#FB923C",
                  }}>
                    {selectedConv?.inviteStatus === "early" ? "✓ 提前邀约" : "✓ 会后发链"}
                  </span>
                )}

                {/* 接管/释放 */}
                {selectedConv?.status === "ai" ? (
                  <button
                    onClick={takeover}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ background: "#F59E0B" }}
                  >
                    <PhoneCall className="w-3 h-3" />
                    接管
                  </button>
                ) : selectedConv?.status === "human" ? (
                  <button
                    onClick={release}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                  >
                    <Bot className="w-3 h-3" />
                    交回 AI
                  </button>
                ) : null}
              </div>
            </div>

            {/* 消息区 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: "smooth" }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`flex items-end gap-1.5 max-w-[70%] ${msg.role === "user" ? "" : "flex-row-reverse"}`}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: msg.role === "user" ? "rgba(102,126,234,0.2)" : msg.role === "agent" ? "rgba(245,158,11,0.2)" : "rgba(7,193,96,0.2)",
                      }}
                    >
                      {msg.role === "user" ? (
                        <User className="w-3 h-3" style={{ color: "#667eea" }} />
                      ) : msg.role === "agent" ? (
                        <Headphones className="w-3 h-3" style={{ color: "#F59E0B" }} />
                      ) : (
                        <Bot className="w-3 h-3" style={{ color: "#07C160" }} />
                      )}
                    </div>
                    <div>
                      {msg.agentName && (
                        <div className="text-[10px] mb-0.5 text-right" style={{ color: "#F59E0B" }}>{msg.agentName}</div>
                      )}
                      <div
                        className="px-3 py-2 rounded-xl text-sm leading-relaxed"
                        style={{
                          background: msg.role === "user" ? "rgba(102,126,234,0.1)" : msg.role === "agent" ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.06)",
                          color: "#E8E6E1",
                        }}
                      >
                        {msg.content}
                      </div>
                      <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>
                        {new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 转接提醒 */}
            {transferAlert === selectedId && (
              <div className="shrink-0 px-4 py-2" style={{ background: "rgba(245,158,11,0.1)", borderTop: "1px solid rgba(245,158,11,0.3)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4" style={{ color: "#F59E0B" }} />
                    <span className="text-xs font-medium" style={{ color: "#F59E0B" }}>AI 请求转接真人客服</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { takeover(); setTransferAlert(null); }} className="px-3 py-1 rounded-lg text-xs font-medium text-white" style={{ background: "#F59E0B" }}>接管</button>
                    <button onClick={() => setTransferAlert(null)} className="px-3 py-1 rounded-lg text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>忽略</button>
                  </div>
                </div>
              </div>
            )}

            {/* AI 话术建议 */}
            {aiSuggestion && selectedConv?.status === "human" && (
              <div className="shrink-0 px-4 py-2" style={{ borderTop: "1px solid rgba(7,193,96,0.15)", background: "rgba(7,193,96,0.05)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="w-3 h-3" style={{ color: "#07C160" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#07C160" }}>AI 建议话术</span>
                </div>
                <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>{aiSuggestion}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setInput(aiSuggestion); setAiSuggestion(null); }} className="px-3 py-1 rounded-lg text-xs font-medium text-white" style={{ background: "#07C160" }}>采纳</button>
                  <button onClick={() => setAiSuggestion(null)} className="px-3 py-1 rounded-lg text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>忽略</button>
                </div>
              </div>
            )}

            {/* 输入框 */}
            <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {selectedConv?.status !== "human" ? (
                <div className="text-center py-2">
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                    当前由 AI 处理 · 点击「接管」后可手动回复
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="回复客户..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "#E8E6E1" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                    style={{ background: input.trim() ? "#F59E0B" : "rgba(255,255,255,0.04)", color: input.trim() ? "#fff" : "rgba(255,255,255,0.2)" }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
