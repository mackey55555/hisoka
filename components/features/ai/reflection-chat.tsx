'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ReflectionChatProps {
  teamSlug: string;
  goalContent: string;
  activityContent: string;
  reflectionDraft: string;
  onClose: () => void;
}

export function ReflectionChat({
  teamSlug,
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
          teamSlug,
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          goalContent,
          activityContent,
          reflectionDraft,
        }),
      });

      if (!res.ok || !res.body) {
        // プランゲート等のエラーメッセージを拾って表示する
        let msg = 'エラーが発生しました。もう一度お試しください。';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* noop */
        }
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: msg },
        ]);
        return;
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

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    e?.preventDefault();
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
        <span className="text-base font-medium text-primary">振り返りサポート</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{userTurnCount}/3ターン</span>
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

      {/* メッセージ一覧: まずこの中でスクロール。端まで来たら親モーダルへスクロールを繋げる
          （overscroll-auto）。背面へは親モーダル側の overscroll-contain＋ロックで漏れない。 */}
      <div
        ref={scrollRef}
        className="space-y-3 mb-3 max-h-[50vh] min-h-[10rem] overflow-y-auto overscroll-auto pr-1"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-base leading-relaxed whitespace-pre-wrap break-words ${
              m.role === 'assistant'
                ? 'text-text-primary bg-surface p-3 rounded-lg'
                : 'text-text-primary bg-primary/5 p-3 rounded-lg ml-6'
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

      {/* 入力エリア（textarea で広く・Enter送信 / Shift+Enter改行） */}
      {!isMaxTurns ? (
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="回答を入力…（Enterで送信 / Shift+Enterで改行）"
            disabled={isLoading}
            rows={3}
            className="flex-1 px-3 py-2 text-base bg-surface border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <Button
            type="button"
            variant="primary"
            disabled={isLoading || !input.trim()}
            className="text-base px-4 self-stretch"
            onClick={handleSubmit}
          >
            送信
          </Button>
        </div>
      ) : (
        <p className="text-sm text-text-secondary text-center py-2">
          対話が完了しました。上の内容を参考に振り返りを書いてみてください。
        </p>
      )}
    </div>
  );
}
