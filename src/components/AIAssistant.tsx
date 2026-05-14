import React, { useState } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "bot";
  content: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "你好！您可以让我为您撰写文案，或是描述任何您想要的效果。" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || "Failed to fetch response from server");
      }

      setMessages(prev => [...prev, { role: "bot", content: data.result || "无法获取响应内容" }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "bot", content: "抱歉，请求大模型发生错误，请检查网络或 API Key 设置。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#C8855F] rounded-full flex items-center justify-center shadow-lg shadow-[#C8855F]/20 text-black hover:bg-[#B5754F] transition-colors z-50 hover:scale-105 active:scale-95"
      >
        <MessageSquare className="w-5 h-5 fill-current" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[360px] h-[500px] max-h-[80vh] bg-[#0F0F0F] rounded-2xl border border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#161616] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#C8855F]/20 flex items-center justify-center text-[#C8855F]">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">数字紫砂助手</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-zinc-800 text-white" : "bg-[#C8855F]/10 text-[#C8855F]"
                  )}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "rounded-xl px-4 py-2.5 text-sm max-w-[75%] whitespace-pre-wrap leading-relaxed",
                    msg.role === "user" ? "bg-[#C8855F] text-black rounded-tr-sm" : "bg-[#1A1A1A] text-zinc-300 border border-white/5 rounded-tl-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C8855F]/10 text-[#C8855F] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="rounded-xl px-4 py-3 bg-[#1A1A1A] border border-white/5 rounded-tl-sm flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C8855F]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-[#161616] shrink-0">
              <div className="relative flex items-center border border-white/10 rounded-full bg-[#0B0B0B] overflow-hidden focus-within:border-[#C8855F]/50 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="让大模型为您写几句文案..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2.5 text-white placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 mr-1 rounded-full text-zinc-500 hover:text-[#C8855F] hover:bg-white/5 transition-colors disabled:opacity-50 disabled:hover:text-zinc-500 disabled:hover:bg-transparent"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
