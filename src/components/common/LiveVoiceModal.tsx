import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Phone,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Radio,
  Send,
  Sliders,
  ChevronDown,
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  time: string;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const { company, language } = useStore();

  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'>('Zephyr');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [textInput, setTextInput] = useState('');
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [modelAudioLevel, setModelAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Suggested starter prompts
  const samplePrompts = [
    {
      en: 'Tell me about non-stick cookware sets & blender pricing',
      bn: 'রান্নাঘরের কড়াই ও ব্লেন্ডারের দাম সম্পর্কে বলুন',
    },
    {
      en: 'How does all-India B2B wholesale order delivery work?',
      bn: 'সারা ভারতে পাইকারি অর্ডার ও ডেলিভারি কীভাবে হয়?',
    },
    {
      en: 'Can I get an invoice for my order?',
      bn: 'GST ইনভয়েস এবং পেমেন্ট সংক্রান্ত তথ্য দিন',
    },
    {
      en: 'What sports equipment and yoga mats do you have in stock?',
      bn: 'স্পোর্টস আইটেম ও ডাম্বেলের স্টক সম্পর্কে বলুন',
    },
  ];

  // Clean stop audio playback
  const stopAllAudioPlayback = () => {
    try {
      scheduledSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {
          // Ignore
        }
      });
      scheduledSourcesRef.current = [];
      if (outputAudioCtxRef.current) {
        nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
      }
    } catch (e) {
      console.warn('Error clearing audio sources:', e);
    }
  };

  // Convert Float32Array to 16-bit linear PCM base64 string
  const floatTo16BitPcmBase64 = (input: Float32Array): string => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk))
      );
    }
    return window.btoa(binary);
  };

  // Play audio chunk at 24kHz
  const playAudioChunk = (base64Data: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        outputAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      const audioCtx = outputAudioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const binary = window.atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      let sumSquares = 0;
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
        sumSquares += float32[i] * float32[i];
      }

      const rms = Math.sqrt(sumSquares / int16.length);
      setModelAudioLevel(Math.min(1, rms * 5));
      setStatus('speaking');

      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;

      source.onended = () => {
        const idx = scheduledSourcesRef.current.indexOf(source);
        if (idx !== -1) {
          scheduledSourcesRef.current.splice(idx, 1);
        }
        if (scheduledSourcesRef.current.length === 0) {
          setStatus('listening');
          setModelAudioLevel(0);
        }
      };

      scheduledSourcesRef.current.push(source);
    } catch (err) {
      console.error('Audio chunk playback failed:', err);
    }
  };

  // Start the Live API Voice Session
  const startVoiceSession = async () => {
    try {
      setStatus('connecting');
      setErrorMessage(null);

      // Clean existing resources
      stopVoiceSession(false);

      // 1. Audio Contexts
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      inputAudioCtxRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });

      // 2. Request Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Setup WebSocket connection to server /live endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Voice Modal] Connected to Live WebSocket server');
        setStatus('connected');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'model',
            text:
              language === 'bn'
                ? 'নমস্কার! UNICK DIGITAL (UDECS) লাইভ ভয়েস অ্যাসিস্ট্যান্ট সংযুক্ত হয়েছে। আপনি সরাসরি বাংলায় কথা বলতে পারেন।'
                : 'Hello! UDECS Live Voice Assistant (powered by Gemini 3.8 Live) is ready. Ask anything about cookware, orders, or wholesale!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        // Start capturing microphone audio
        if (inputAudioCtxRef.current && mediaStreamRef.current) {
          const ctx = inputAudioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume();
          }

          const source = ctx.createMediaStreamSource(mediaStreamRef.current);
          const processor = ctx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (isMuted) {
              setUserAudioLevel(0);
              return;
            }

            const inputData = e.inputBuffer.getChannelData(0);

            // Compute volume for visualizer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            setUserAudioLevel(Math.min(1, rms * 6));

            // Only stream if WebSocket is open
            if (ws.readyState === WebSocket.OPEN) {
              const base64Audio = floatTo16BitPcmBase64(inputData);
              ws.send(JSON.stringify({ audio: base64Audio }));
            }
          };

          source.connect(processor);
          processor.connect(ctx.destination);
          setStatus('listening');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'error' || data.error) {
            console.error('[Voice Modal] Server reported error:', data.error);
            setErrorMessage(data.error || 'Live API connection error');
            setStatus('error');
            return;
          }

          if (data.type === 'audio' && data.audio) {
            playAudioChunk(data.audio);
          }

          if (data.type === 'interrupted' || data.interrupted) {
            console.log('[Voice Modal] User interrupted model');
            stopAllAudioPlayback();
            setStatus('listening');
          }

          if (data.type === 'text' && data.text) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'model') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + data.text },
                ];
              }
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  sender: 'model',
                  text: data.text,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          }

          if (data.type === 'turnComplete') {
            // Model finished turn
          }
        } catch (msgErr) {
          console.error('[Voice Modal] Error parsing server message:', msgErr);
        }
      };

      ws.onerror = (e) => {
        console.error('[Voice Modal] WebSocket error:', e);
        setErrorMessage('Could not establish WebSocket connection to Live API.');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('[Voice Modal] WebSocket closed');
        if (status !== 'error') {
          setStatus('idle');
        }
      };
    } catch (err: any) {
      console.error('[Voice Modal] Failed to start voice session:', err);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access to use voice conversation.'
          : err?.message || 'Failed to start Live Voice session'
      );
      setStatus('error');
    }
  };

  // Stop session
  const stopVoiceSession = (setIdleState = true) => {
    stopAllAudioPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // Ignore
      }
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {
        // Ignore
      }
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {
        // Ignore
      }
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore
      }
      wsRef.current = null;
    }

    setUserAudioLevel(0);
    setModelAudioLevel(0);
    if (setIdleState) {
      setStatus('idle');
    }
  };

  // Send typed prompt to live session
  const handleSendTextPrompt = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : textInput).trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (textToSend === undefined) {
      setTextInput('');
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
      setStatus('listening');
    } else {
      // If not connected, automatically start session then send
      startVoiceSession().then(() => {
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ text }));
          }
        }, 800);
      });
    }
  };

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Connect on modal open
  useEffect(() => {
    if (isOpen) {
      startVoiceSession();
    } else {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#182620] border border-[#2D3E35] text-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#2D3E35] flex items-center justify-between bg-[#121D18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8730A]/20 border border-[#E8730A]/50 flex items-center justify-center relative">
              <Sparkles className="w-5 h-5 text-[#E8730A] animate-pulse" />
              {status === 'speaking' && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
              )}
              {status === 'listening' && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  UDECS Live Voice AI
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold uppercase tracking-wider">
                  Gemini 3.8 Live
                </span>
              </div>
              <p className="text-xs text-[#9CA48A]">
                {language === 'bn'
                  ? 'লাইভ ভয়েস কথোপকথন (বাংলা / English / Hindi)'
                  : 'Real-time conversational voice assistant for UDECS'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopVoiceSession();
                onClose();
              }}
              className="p-2 text-[#9CA48A] hover:text-white hover:bg-[#23352C] rounded-lg transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Voice Visualizer & Status Area */}
        <div className="p-6 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#121D18] to-[#182620] border-b border-[#2D3E35]">
          {/* Status Badge */}
          <div className="mb-4">
            {status === 'connecting' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700/60 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Connecting to Gemini 3.8 Live API...
              </span>
            )}
            {status === 'connected' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/60">
                <Radio className="w-3 h-3" />
                Live Session Established
              </span>
            )}
            {status === 'listening' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Listening... Speak naturally anytime
              </span>
            )}
            {status === 'speaking' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-950/60 text-orange-300 border border-orange-700/60">
                <Volume2 className="w-3 h-3 animate-bounce" />
                UDECS AI is speaking... (Interrupt anytime)
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-950/60 text-red-300 border border-red-700/60">
                <AlertCircle className="w-3 h-3" />
                Session Interrupted
              </span>
            )}
            {status === 'idle' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                Ready to talk
              </span>
            )}
          </div>

          {/* Central Pulsing Animated Orb & Visualizer */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            {/* Outer sound rings */}
            <div
              className={`absolute inset-0 rounded-full transition-transform duration-100 ease-out border border-emerald-500/20 ${
                userAudioLevel > 0.05 ? 'scale-125 opacity-80' : 'scale-100 opacity-20'
              }`}
              style={{
                transform: `scale(${1 + userAudioLevel * 0.4})`,
                borderColor: userAudioLevel > 0.1 ? '#10B981' : '#2D3E35',
              }}
            ></div>
            <div
              className={`absolute inset-0 rounded-full transition-transform duration-100 ease-out border border-[#E8730A]/30 ${
                modelAudioLevel > 0.05 ? 'scale-150 opacity-90' : 'scale-100 opacity-20'
              }`}
              style={{
                transform: `scale(${1 + modelAudioLevel * 0.5})`,
                borderColor: modelAudioLevel > 0.1 ? '#E8730A' : '#2D3E35',
              }}
            ></div>

            {/* Glowing Core Sphere */}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-150 shadow-xl ${
                status === 'speaking'
                  ? 'bg-gradient-to-tr from-[#E8730A] to-amber-500 shadow-orange-500/40'
                  : status === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/40'
                  : status === 'connecting'
                  ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 animate-pulse'
                  : 'bg-gradient-to-tr from-[#23352C] to-[#2D3E35]'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-8 h-8 text-red-200" />
              ) : status === 'speaking' ? (
                <Volume2 className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          {/* Sound Wave Bars */}
          <div className="flex items-center gap-1.5 h-8 mt-3">
            {[40, 70, 90, 60, 100, 75, 45, 85, 95, 65, 35].map((baseHeight, i) => {
              const activeLevel = Math.max(userAudioLevel, modelAudioLevel);
              const height = Math.max(
                4,
                Math.round((baseHeight / 100) * (activeLevel > 0.05 ? activeLevel * 32 : 6))
              );
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    modelAudioLevel > 0.05
                      ? 'bg-[#E8730A]'
                      : userAudioLevel > 0.05
                      ? 'bg-emerald-400'
                      : 'bg-[#2D3E35]'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>

          {/* Error Message with Reconnect Option */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-lg max-w-md text-center flex flex-col items-center gap-2">
              <span>{errorMessage}</span>
              <button
                onClick={startVoiceSession}
                className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Retry Voice Connection
              </button>
            </div>
          )}

          {/* Quick Voice Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? 'bg-red-800 hover:bg-red-700 text-white'
                  : 'bg-[#23352C] hover:bg-[#2D3E35] text-[#FBFAF5]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Mic Muted' : 'Mute Mic'}</span>
            </button>

            <button
              onClick={() => {
                if (status === 'speaking') {
                  stopAllAudioPlayback();
                  setStatus('listening');
                }
              }}
              disabled={status !== 'speaking'}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#23352C] hover:bg-[#2D3E35] text-[#FBFAF5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              title="Interrupt AI speaking"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Interrupt AI</span>
            </button>

            <button
              onClick={startVoiceSession}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#23352C] hover:bg-[#2D3E35] text-[#9CA48A] hover:text-white flex items-center gap-1.5 transition-colors"
              title="Restart session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Live Conversation Transcript History */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[140px] max-h-[220px] bg-[#14201B]/80 text-xs"
        >
          {messages.length === 0 ? (
            <div className="text-center py-6 text-[#9CA48A]">
              <p className="font-medium text-white mb-1">
                {language === 'bn'
                  ? 'মাইক্রোফোনে কথা বলুন অথবা নিচের প্রশ্নগুলোতে ট্যাপ করুন'
                  : 'Start speaking or tap a quick question below'}
              </p>
              <p className="text-[11px]">
                {language === 'bn'
                  ? 'রান্নাঘর, বাসনপত্র, পাইকারি রেট, জিএসটি ইনভয়েস বা ট্র্যাকিং বিষয়ে সরাসরি আলোচনা করুন।'
                  : 'Ask about cookware, wholesale pallet rates, Delhivery logistics, or GST tax invoices.'}
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-[#9CA48A]">
                  <span>{m.sender === 'user' ? 'You' : 'UDECS Voice AI'}</span>
                  <span>·</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#1B3A63] text-white rounded-tr-none'
                      : 'bg-[#23352C] border border-[#2D3E35] text-[#FBFAF5] rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[#2D3E35] bg-[#121D18] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendTextPrompt(language === 'bn' ? p.bn : p.en)}
              className="text-[11px] whitespace-nowrap bg-[#1E2E26] hover:bg-[#283C32] text-[#CBCFB9] hover:text-white px-2.5 py-1 rounded-full border border-[#2D3E35] transition-colors flex-shrink-0"
            >
              {language === 'bn' ? p.bn : p.en}
            </button>
          ))}
        </div>

        {/* Hybrid Text & Voice Input Bar */}
        <div className="p-3 border-t border-[#2D3E35] bg-[#121D18] flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendTextPrompt();
              }
            }}
            placeholder={
              language === 'bn'
                ? 'বাণী বা বার্তা লিখুন (Type or speak in Bengali / English)...'
                : 'Type a question or speak into your microphone...'
            }
            className="flex-1 bg-[#182620] border border-[#2D3E35] rounded-xl px-3 py-2 text-xs text-white placeholder-[#9CA48A] focus:outline-none focus:border-[#E8730A]"
          />
          <button
            onClick={() => handleSendTextPrompt()}
            disabled={!textInput.trim()}
            className="p-2 bg-[#E8730A] hover:bg-[#D06505] disabled:opacity-40 text-white rounded-xl transition-colors"
            title="Send text prompt"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Footer with Human WhatsApp Hotline */}
        <div className="px-4 py-2 bg-[#0F1913] border-t border-[#23352C] flex items-center justify-between text-[11px] text-[#9CA48A]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Pratappur, Panskura</span>
          </span>
          <a
            href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <MessageCircle className="w-3 h-3" /> WhatsApp Human Support
          </a>
        </div>
      </div>
    </div>
  );
};
