'use client';

import { Loader, PhoneOff, Mic, Car } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import EmptyBoxState from './EmptyBoxState';
import FinalUi from './FinalUi';
import FloodResponsePanel from './FloodResponsePanel';
import { useVapiVoice } from '@/hooks/useVapiVoice';
import { toast } from 'sonner';
import type { FloodResponsePlan } from './types';

// ── Household context for personalized survival coaching ──
interface HouseholdContext {
  floor_level: 'ground' | '1st' | '2nd_plus';
  vulnerable_members: ('elderly' | 'children' | 'disabled' | 'pregnant')[];
  has_vehicle: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SCROLL_DELAY_MS = 60;

interface VoiceChatProps {
  onPlanGenerated?: (plan: FloodResponsePlan) => void;
  /** Location detected via GeolocationPrompt, saved in DB, passed down from page */
  userLocation?: { lat: number; lng: number; city: string } | null;
}

/**
 * VoiceChat orchestrates the conversation flow:
 *
 * VOICE PATH:
 *   1. User clicks "Start Voice Report" → VAPI call starts
 *   2. VAPI transcribes in real-time → messages appear in chat
 *   3. Call ends → "Generate Response Plan" button appears
 *   4. User clicks → entire conversation sent to Perplexity with isFinal=true
 *   5. Perplexity returns flood_response → map renders markers/heatmap/routes
 *
 * TEXT PATH:
 *   1. User types message → sent via /api/ai-agent (isFinal=false)
 *   2. Perplexity responds conversationally
 *   3. When Perplexity returns ui:"final", Generate button appears
 *   4. Same step 4-5 as above
 */
function VoiceChat({ onPlanGenerated, userLocation }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<FloodResponsePlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isPostPlan, setIsPostPlan] = useState(false);
  // Show the Generate button after voice call ends or when n8n says "final"
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Household context state ──
  const [household, setHousehold] = useState<HouseholdContext>({
    floor_level: 'ground',
    vulnerable_members: [],
    has_vehicle: false,
  });

  const toggleVulnerable = useCallback((tag: HouseholdContext['vulnerable_members'][number]) => {
    setHousehold(prev => ({
      ...prev,
      vulnerable_members: prev.vulnerable_members.includes(tag)
        ? prev.vulnerable_members.filter(t => t !== tag)
        : [...prev.vulnerable_members, tag],
    }));
  }, []);

  // Build location payload for AI agent calls
  const aiLocationPayload = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lng, placeName: userLocation.city }
    : undefined;
  const {
    isCallActive,
    isConnecting,
    messages: vapiMessages,
    liveTranscript,
    toggleCall,
    clearMessages: clearVapiMessages,
  } = useVapiVoice();

  const [voiceMessageCount, setVoiceMessageCount] = useState(0);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), SCROLL_DELAY_MS);
  }, []);

  // Sync VAPI transcript messages into main chat in real-time
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

  // When VAPI call ends and there are messages → show Generate button
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (isCallActive) {
      wasActiveRef.current = true;
    } else if (wasActiveRef.current && !isCallActive) {
      wasActiveRef.current = false;
      // Call ended — show the Generate Response Plan button
      setTimeout(() => {
        setMessages(prev => {
          if (prev.length > 0 && !isPostPlan) {
            setShowGenerateButton(true);
            const endMsg: Message = {
              role: 'assistant',
              content: 'Voice report received! Click **Generate Response Plan** below to get your flood safety map with shelters, rescue teams, and evacuation routes.',
            };
            scrollToBottom();
            return [...prev, endMsg];
          }
          return prev;
        });
        clearVapiMessages();
      }, 600);
    }
  }, [isCallActive, isPostPlan, clearVapiMessages, scrollToBottom]);

  // Send text message → n8n webhook via /api/ai-agent
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setUserInput('');

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();

    try {
      const conversation = [...messages, userMsg].map(({ role, content }) => ({ role, content }));
      const res = await axios.post('/api/ai-agent', {
        messages: conversation,
        isFinal: false,
        isFollowUp: isPostPlan,
        user_location: aiLocationPayload,
        household,
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: res?.data?.resp || 'Processing...',
      };
      setMessages(prev => [...prev, assistantMsg]);

      // If n8n returns ui:"final", show the Generate button
      if (res?.data?.ui === 'final') {
        setShowGenerateButton(true);
      }

      // If follow-up returns an updated plan
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
  }, [loading, messages, scrollToBottom, isPostPlan, onPlanGenerated, aiLocationPayload]);

  const handleSend = useCallback(() => sendMessage(userInput), [sendMessage, userInput]);
  const handleSuggestionClick = useCallback((s: string) => sendMessage(s), [sendMessage]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // Generate flood response plan — sends ENTIRE conversation to Perplexity with isFinal=true
  const generatePlan = useCallback(async () => {
    if (generatingPlan) return;
    setGeneratingPlan(true);
    setShowGenerateButton(false);

    const conversation = messages.map(({ role, content }) => ({ role, content }));
    if (conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant') {
      conversation.push({ role: 'user', content: 'Generate the flood response plan now with all collected information.' });
    }

    try {
      const res = await axios.post('/api/ai-agent', {
        messages: conversation,
        isFinal: true,
        user_location: aiLocationPayload,
        household,
      });
      const data: FloodResponsePlan = res.data?.flood_response ?? res.data;

      if (data) {
        setPlan(data);
        setIsPostPlan(true);
        onPlanGenerated?.(data);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Flood response plan generated! The map is now showing flood zones, safe shelters, rescue teams, and evacuation routes. You can keep asking questions to refine the plan.',
          },
        ]);
        setTimeout(() => {
          document.getElementById('response-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    } catch (err: any) {
      console.error('[FloodNet] Plan generation failed:', err?.message || err);
      toast.error('Could not generate plan. Please try again.');
      setShowGenerateButton(true);
    } finally {
      setGeneratingPlan(false);
    }
  }, [messages, generatingPlan, onPlanGenerated, aiLocationPayload, household]);

  const handleVoiceButton = useCallback(async () => {
    if (isCallActive) {
      await toggleCall();
    } else {
      toggleCall();
    }
  }, [isCallActive, toggleCall]);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-1 border-2 border-black rounded-2xl bg-card shadow-md overflow-hidden">

        {isEmpty && <EmptyBoxState onSuggestionClick={handleSuggestionClick} />}

        {/* Messages */}
        <section ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
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

          {/* Generate Response Plan button — appears after voice call or n8n says "final" */}
          {showGenerateButton && !isPostPlan && (
            <div className="px-2 py-1">
              <FinalUi generatePlan={generatePlan} isLoading={generatingPlan} planGenerated={!!plan} />
            </div>
          )}

          {generatingPlan && (
            <div className="flex justify-center">
              <div className="bg-orange-500/10 text-orange-600 px-5 py-2.5 rounded-full text-xs font-head flex items-center gap-2 border-2 border-orange-500/30">
                <Loader className="animate-spin h-3.5 w-3.5" />
                AI agents coordinating response...
              </div>
            </div>
          )}
        </section>

        {/* ── Household Context Strip — ultra-compact inline row ────── */}
        <section className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Floor level */}
            <div className="flex items-center gap-1">
              {(['ground', '1st', '2nd_plus'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setHousehold(h => ({ ...h, floor_level: f }))}
                  title={f === 'ground' ? 'Ground floor' : f === '1st' ? '1st Floor' : '2nd floor+'}
                  className={`px-2 py-0.5 rounded text-[9px] font-head border transition-colors ${
                    household.floor_level === f
                      ? 'bg-primary text-primary-foreground border-black'
                      : 'bg-muted/50 border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {f === 'ground' ? 'G' : f === '1st' ? '1F' : '2F+'}
                </button>
              ))}
              <span className="text-[9px] text-muted-foreground ml-0.5">floor</span>
            </div>

            <div className="w-px h-3 bg-border" />

            {/* Vulnerable members */}
            <div className="flex items-center gap-1">
              {([
                { tag: 'elderly', emoji: '👴' },
                { tag: 'children', emoji: '👶' },
                { tag: 'disabled', emoji: '♿' },
                { tag: 'pregnant', emoji: '🤰' },
              ] as const).map(({ tag, emoji }) => (
                <button
                  key={tag}
                  onClick={() => toggleVulnerable(tag)}
                  title={tag.charAt(0).toUpperCase() + tag.slice(1)}
                  className={`w-6 h-6 rounded text-xs flex items-center justify-center border transition-all ${
                    household.vulnerable_members.includes(tag)
                      ? 'bg-red-500/20 border-red-500 scale-110'
                      : 'bg-muted/50 border-border hover:bg-muted opacity-50 hover:opacity-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="w-px h-3 bg-border" />

            {/* Vehicle toggle */}
            <button
              onClick={() => setHousehold(h => ({ ...h, has_vehicle: !h.has_vehicle }))}
              title="Vehicle available"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-head border transition-colors ${
                household.has_vehicle
                  ? 'bg-green-500/20 border-green-600 text-green-700 dark:text-green-400'
                  : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Car className="w-3 h-3" />
              {household.has_vehicle ? 'Car ✓' : 'No car'}
            </button>
          </div>
        </section>

        {/* ── Input Area ─────────────────────────────────────── */}
        <section className="p-3 border-t-2 border-border bg-card">
          {/* Voice button — large and prominent */}
          <button
            onClick={handleVoiceButton}
            disabled={loading || isConnecting || generatingPlan}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-head text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed border-2 mb-3 ${
              isCallActive
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-700 shadow-lg shadow-red-500/20'
                : 'bg-primary hover:bg-primary-hover text-primary-foreground border-black shadow-md hover:shadow-sm hover:translate-y-0.5 active:shadow-none active:translate-y-1'
            }`}
          >
            {isConnecting ? (
              <><Loader className="animate-spin h-5 w-5" /> Connecting to FloodNet...</>
            ) : isCallActive ? (
              <><PhoneOff className="h-5 w-5" /> End Call &amp; Prepare Report</>
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

const MessageBubble = React.memo(function MessageBubble({ message }: { message: Message }) {
  const { role, content } = message;
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
      </div>
    </div>
  );
});

export default VoiceChat;
