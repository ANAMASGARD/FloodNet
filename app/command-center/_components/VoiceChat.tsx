'use client';

import { Loader, PhoneOff, Mic } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import EmptyBoxState from './EmptyBoxState';
import FinalUi from './FinalUi';
import FloodResponsePanel from './FloodResponsePanel';
import { useVapiVoice } from '@/hooks/useVapiVoice';
import { toast } from 'sonner';
import type { FloodResponsePlan } from './types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ui?: string;
  uiCompleted?: boolean;
}

const SCROLL_DELAY_MS = 60;

interface VoiceChatProps {
  onPlanGenerated?: (plan: FloodResponsePlan) => void;
}

function VoiceChat({ onPlanGenerated }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FloodResponsePlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isPostPlan, setIsPostPlan] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isCallActive,
    isConnecting,
    messages: vapiMessages,
    liveTranscript,
    toggleCall,
    clearMessages: clearVapiMessages,
  } = useVapiVoice();

  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceMessageCount, setVoiceMessageCount] = useState(0);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), SCROLL_DELAY_MS);
  }, []);

  // Sync VAPI messages into main chat in real-time
  useEffect(() => {
    if (isCallActive && vapiMessages.length > voiceMessageCount) {
      const newMsgs = vapiMessages.slice(voiceMessageCount);
      setMessages(prev => [...prev, ...newMsgs.map(m => ({ role: m.role, content: m.content }))]);
      setVoiceMessageCount(vapiMessages.length);
      scrollToBottom();
    }
  }, [vapiMessages, isCallActive, voiceMessageCount, scrollToBottom]);

  useEffect(() => {
    if (!isCallActive) setVoiceMessageCount(0);
  }, [isCallActive]);

  // Send text message → n8n webhook via /api/ai-agent
  const sendMessage = useCallback(async (text: string, messageIndex?: number) => {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setUserInput('');

    if (typeof messageIndex === 'number') {
      setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, uiCompleted: true } : m));
    }

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();

    try {
      const conversation = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      const res = await axios.post('/api/ai-agent', {
        messages: conversation,
        isFinal: false,
        isFollowUp: isPostPlan,
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: res?.data?.resp || 'Processing...',
        ui: res?.data?.ui || 'none',
        uiCompleted: false,
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (isPostPlan && res?.data?.flood_response) {
        const updated: FloodResponsePlan = res.data.flood_response;
        setPlan(updated);
        onPlanGenerated?.(updated);
        toast.success('Response plan updated!');
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, scrollToBottom, isPostPlan, onPlanGenerated]);

  const handleSend = useCallback(() => sendMessage(userInput), [sendMessage, userInput]);
  const handleSuggestionClick = useCallback((s: string) => sendMessage(s), [sendMessage]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);
  const createUiSelectHandler = useCallback((idx: number) => (sel: string) => sendMessage(sel, idx), [sendMessage]);

  // Generate final flood response plan — sends entire conversation to n8n with isFinal=true
  const generatePlan = useCallback(async () => {
    if (generatingPlan) return;
    setGeneratingPlan(true);

    const conversation = messages.map(({ role, content }) => ({ role, content }));
    if (conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant') {
      conversation.push({ role: 'user', content: 'Generate the flood response plan now.' });
    }

    try {
      const res = await axios.post('/api/ai-agent', { messages: conversation, isFinal: true });
      const data: FloodResponsePlan = res.data?.flood_response ?? res.data;

      if (data) {
        setPlan(data);
        setIsPostPlan(true);
        onPlanGenerated?.(data);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Flood response plan generated! View it on the map and panel. You can keep asking questions to refine.',
            ui: 'none',
            uiCompleted: true,
          },
        ]);
        setTimeout(() => {
          document.getElementById('response-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err: any) {
      console.error('[FloodNet] Plan generation failed:', err?.message || err);
      toast.error('Could not generate plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [messages, generatingPlan, onPlanGenerated]);

  // When VAPI call ends → send entire transcript to n8n for processing
  const processVoiceConversation = useCallback(async (currentMessages: Message[]) => {
    if (isProcessingVoice) return;
    setIsProcessingVoice(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (currentMessages.length === 0) {
      clearVapiMessages();
      setIsProcessingVoice(false);
      return;
    }

    toast.info('Sending transcript to AI agent...');

    try {
      const conversation = currentMessages.map(({ role, content }) => ({ role, content }));
      const res = await axios.post('/api/ai-agent', { messages: conversation, isFinal: false });
      const assistantMsg: Message = {
        role: 'assistant',
        content: res?.data?.resp || 'Transcript received. How can I help further?',
        ui: res?.data?.ui || 'none',
        uiCompleted: false,
      };
      setMessages(prev => [...prev, assistantMsg]);
      scrollToBottom();
      toast.success('AI agent responded.');
    } catch {
      toast.error('Failed to reach AI agent. Please type instead.');
    } finally {
      clearVapiMessages();
      setIsProcessingVoice(false);
    }
  }, [isProcessingVoice, clearVapiMessages, scrollToBottom]);

  const handleVoiceButton = useCallback(async () => {
    if (isCallActive) {
      await toggleCall();
      processVoiceConversation(messages);
    } else {
      toggleCall();
    }
  }, [isCallActive, toggleCall, messages, processVoiceConversation]);

  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (isCallActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current && !isCallActive && !isProcessingVoice) {
      wasActiveRef.current = false;
      setTimeout(() => {
        setMessages(prev => { processVoiceConversation(prev); return prev; });
      }, 500);
    }
  }, [isCallActive, isProcessingVoice, processVoiceConversation]);

  // Render generative UI components on assistant messages
  const renderGenerativeUi = useCallback((ui: string | undefined, msgIndex: number, completed?: boolean) => {
    if (!ui || ui === 'none' || completed) return null;

    if (ui === 'final') {
      const lastFinalIndex = messages.map((m, i) => m.ui === 'final' ? i : -1).filter(i => i !== -1).pop();
      if (msgIndex !== lastFinalIndex) return null;
      if (isPostPlan) return null;
      return <FinalUi generatePlan={generatePlan} isLoading={generatingPlan} planGenerated={!!plan} />;
    }

    return null;
  }, [generatePlan, generatingPlan, plan, messages, isPostPlan]);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat container — fills entire available height */}
      <div className="flex flex-col flex-1 border-2 border-black rounded-2xl bg-card shadow-md overflow-hidden">

        {isEmpty && <EmptyBoxState onSuggestionClick={handleSuggestionClick} />}

        {/* Messages */}
        <section ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} index={i} renderGenerativeUi={renderGenerativeUi} />
          ))}

          {/* Live voice transcript */}
          {isCallActive && liveTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-2 rounded-2xl rounded-tr-none shadow-sm text-sm border-2 border-red-500/30 italic">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                {liveTranscript}
              </div>
            </div>
          )}

          {/* Listening indicator */}
          {isCallActive && !liveTranscript && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-full text-xs font-head flex items-center gap-2 border-2 border-red-500/30">
                <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                FloodNet is listening... Speak now!
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-tl-none border-2 shadow-sm">
                <Loader className="animate-spin h-4 w-4" />
              </div>
            </div>
          )}

          {isProcessingVoice && (
            <div className="flex justify-center">
              <div className="bg-orange-500/10 text-orange-600 px-5 py-2.5 rounded-full text-xs font-head flex items-center gap-2 border-2 border-orange-500/30">
                <Loader className="animate-spin h-3.5 w-3.5" />
                Sending to AI agent...
              </div>
            </div>
          )}
        </section>

        {/* ── Input Area ─────────────────────────────────────── */}
        <section className="p-3 border-t-2 border-border bg-card">
          {/* Voice button — large and prominent */}
          <button
            onClick={handleVoiceButton}
            disabled={loading || isConnecting || isProcessingVoice}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-head text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed border-2 mb-3 ${
              isCallActive
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-700 shadow-lg shadow-red-500/20'
                : 'bg-primary hover:bg-primary-hover text-primary-foreground border-black shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1'
            }`}
          >
            {isConnecting ? (
              <><Loader className="animate-spin h-5 w-5" /> Connecting to FloodNet...</>
            ) : isProcessingVoice ? (
              <><Loader className="animate-spin h-5 w-5" /> Processing transcript...</>
            ) : isCallActive ? (
              <><PhoneOff className="h-5 w-5" /> End Call &amp; Send to AI Agent</>
            ) : (
              <><Mic className="h-5 w-5" /> Start Voice Report</>
            )}
          </button>

          {/* Text input */}
          <div className="relative bg-muted/50 border-2 border-border rounded-xl overflow-hidden focus-within:border-red-500/50 transition-all">
            <textarea
              placeholder={isPostPlan ? 'Ask a follow-up question...' : 'Type your flood report here...'}
              className="w-full min-h-[40px] max-h-20 bg-transparent border-none focus:outline-none px-4 py-2.5 resize-none text-sm placeholder:text-muted-foreground font-sans"
              rows={1}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              value={userInput}
            />
            <div className="flex items-center justify-end px-3 pb-2">
              <button
                onClick={handleSend}
                disabled={loading || !userInput.trim()}
                className="px-5 py-1.5 rounded-lg text-sm font-head bg-foreground text-background hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 border-2 border-border"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile-only response panel */}
      {plan && (
        <div className="lg:hidden mt-4">
          <FloodResponsePanel plan={plan} />
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  renderGenerativeUi: (ui: string | undefined, msgIndex: number, completed?: boolean) => React.ReactNode;
}

const MessageBubble = React.memo(function MessageBubble({ message, index, renderGenerativeUi }: MessageBubbleProps) {
  const { role, content, ui, uiCompleted } = message;
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-tr-none shadow-sm text-sm border-2 border-black">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-muted/60 text-foreground px-4 py-2 rounded-2xl rounded-tl-none border-2 border-border shadow-sm text-sm leading-relaxed">
        {content}
        {renderGenerativeUi(ui, index, uiCompleted)}
      </div>
    </div>
  );
});

export default VoiceChat;
