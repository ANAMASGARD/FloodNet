"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export interface VapiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseVapiVoiceReturn {
  isCallActive: boolean;
  isConnecting: boolean;
  messages: VapiMessage[];
  liveTranscript: string;
  toggleCall: () => Promise<VapiMessage[] | null>;
  startCall: () => void;
  endCall: () => Promise<VapiMessage[]>;
  clearMessages: () => void;
  isSpeaking: boolean;
  volumeLevel: number;
}

// Single VAPI client per app — avoids KrispSDK "duplicated" and double WebSocket/transport
let globalVapi: any = null;
let globalVapiInitPromise: Promise<any> | null = null;

function getOrCreateVapi(apiKey: string): Promise<any> {
  if (globalVapi) return Promise.resolve(globalVapi);
  if (globalVapiInitPromise) return globalVapiInitPromise;
  globalVapiInitPromise = (async () => {
    const Vapi = (await import('@vapi-ai/web')).default;
    globalVapi = new Vapi(apiKey);
    return globalVapi;
  })();
  return globalVapiInitPromise;
}

export function useVapiVoice(): UseVapiVoiceReturn {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<VapiMessage[]>([]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef<any>(null);
  const transportErrorShown = useRef(false);

  useEffect(() => {
    let mounted = true;
    let vapiInstance: any = null;

    const initVapi = async () => {
      if (typeof window === 'undefined') return;

      const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
      if (!VAPI_API_KEY) {
        console.warn('[VAPI] API Key not configured');
        return;
      }

      try {
        vapiInstance = await getOrCreateVapi(VAPI_API_KEY);
        if (!mounted) return;
        vapiRef.current = vapiInstance;

        vapiInstance.on('call-start', () => {
          if (!mounted) return;
          setIsCallActive(true);
          setIsConnecting(false);
          transportErrorShown.current = false;
          toast.success('Connected to FloodNet! Start speaking...');
        });

        vapiInstance.on('call-end', () => {
          if (!mounted) return;
          setIsCallActive(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setLiveTranscript('');
          setVolumeLevel(0);
        });

        vapiInstance.on('speech-start', () => mounted && setIsSpeaking(true));
        vapiInstance.on('speech-end', () => mounted && setIsSpeaking(false));
        vapiInstance.on('volume-level', (level: number) => mounted && setVolumeLevel(level));

        vapiInstance.on('message', (msg: any) => {
          if (!mounted) return;
          if (msg.type === 'transcript') {
            if (msg.transcriptType === 'partial' && msg.role === 'user') {
              setLiveTranscript(msg.transcript || '');
            } else if (msg.transcriptType === 'final' && msg.transcript) {
              setMessages(prev => [
                ...prev,
                { role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.transcript },
              ]);
              setLiveTranscript('');
            }
          }

          if (msg.type === 'conversation-update') {
            const msgs = msg.conversation || [];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.content) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.content === lastMsg.content) return prev;
                if (last?.role !== 'assistant') return [...prev, { role: 'assistant', content: lastMsg.content }];
                return prev;
              });
            }
          }
        });

        vapiInstance.on('error', (error: any) => {
          if (!mounted) return;
          let errorMessage = 'Connection failed';
          if (typeof error === 'string') errorMessage = error;
          else if (error?.errorMessage) errorMessage = String(error.errorMessage);
          else if (error?.message) errorMessage = String(error.message);
          else if (error?.type === 'daily-error' || error?.error?.type === 'ejected') {
            errorMessage = 'Call ended — check VAPI assistant config';
          } else if (error?.statusCode === 401) errorMessage = 'Invalid API Key';
          else if (error?.statusCode === 404) errorMessage = 'Assistant not found';

          const msg = String(errorMessage || '').toLowerCase();
          if (msg.includes('transport') || msg.includes('disconnected') || msg.includes('failed') || msg.includes('network') || msg.includes('name_not_resolved')) {
            if (!transportErrorShown.current) {
              transportErrorShown.current = true;
              toast.error('Voice unavailable. Check your network and that daily.co is not blocked.');
            }
          } else {
            toast.error(errorMessage);
          }
          setIsConnecting(false);
          setIsCallActive(false);
        });
      } catch (err) {
        if (mounted) console.error('[VAPI] Init failed:', err);
      }
    };

    initVapi();
    return () => {
      mounted = false;
      vapiRef.current = null;
      // Do not destroy globalVapi on unmount — other components may use it; only stop active call
      if (vapiInstance) {
        try { vapiInstance.stop(); } catch { /* */ }
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) { toast.error('Voice loading… wait.'); return; }
    const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_VOICE_ASSISTANT_ID;
    if (!VAPI_ASSISTANT_ID) { toast.error('VAPI Assistant ID missing'); return; }

    setIsConnecting(true);
    setMessages([]);
    setLiveTranscript('');

    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID, { metadata: { source: 'floodnet' } });
    } catch (err: any) {
      setIsConnecting(false);
      toast.error(err?.name === 'NotAllowedError' ? 'Microphone access denied.' : (err?.message || 'Could not start call'));
    }
  }, []);

  const endCall = useCallback(async (): Promise<VapiMessage[]> => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch { /* */ }
      setIsCallActive(false);
      setLiveTranscript('');
      return messages;
    }
    return [];
  }, [messages]);

  const toggleCall = useCallback(async (): Promise<VapiMessage[] | null> => {
    if (isCallActive) return await endCall();
    startCall();
    return null;
  }, [isCallActive, startCall, endCall]);

  const clearMessages = useCallback(() => { setMessages([]); setLiveTranscript(''); }, []);

  return { isCallActive, isConnecting, messages, liveTranscript, toggleCall, startCall, endCall, clearMessages, isSpeaking, volumeLevel };
}
