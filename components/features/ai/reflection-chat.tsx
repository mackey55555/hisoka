'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ReflectionChatProps {
  goalContent: string;
  activityContent: string;
  reflectionDraft: string;
  onClose: () => void;
}

export function ReflectionChat({
  goalContent,
  activityContent,
  reflectionDraft,
  onClose,
}: ReflectionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const userTurnCount = messages.filter((m) => m.role === 'user').length;
  const isMaxTurns = userTurnCount >= 3;

  // 初回表示時にAIからの問いかけを取得
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    sendToApi([]);
  }, []);

  // スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendToApi = async (currentMessages: Message[]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/reflection-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          goalContent,
          activityContent,
          reflectionDraft,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('API error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = `msg-${Date.now()}`;
      let assistantContent = '';

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m))
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    sendToApi(updated);
  };

  return (
    <div className="border border-border rounded-lg bg-background p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-primary">振り返りサポート</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{userTurnCount}/3ターン</span>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div ref={scrollRef} className="space-y-3 mb-3 max-h-60 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm ${
              m.role === 'assistant'
                ? 'text-text-primary bg-surface p-3 rounded-lg'
                : 'text-text-primary bg-primary/5 p-3 rounded-lg ml-4'
            }`}
          >
            {m.content || (
              <div className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 入力エリア */}
      {!isMaxTurns ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="回答を入力..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !input.trim()}
            className="text-sm px-4"
          >
            送信
          </Button>
        </form>
      ) : (
        <p className="text-xs text-text-secondary text-center py-2">
          対話が完了しました。上の内容を参考に振り返りを書いてみてください。
        </p>
      )}
    </div>
  );
}
