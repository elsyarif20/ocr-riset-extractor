import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Activity, Radio } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { clsx } from 'clsx';

const LiveSection: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<{role: 'user'|'model', text: string}[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Animation ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      
      // Setup Analyser for visualizer
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: { model: "gemini-2.5-flash-lite" }, // Enable transcription
          outputAudioTranscription: { model: "gemini-2.5-flash-lite" },
        },
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setIsConnected(true);
            
            // Setup input streaming
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; // Don't send if muted
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
            
            // Visualizer
            startVisualizer();
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcriptions
             if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                if (text) addLog('model', text);
             }
             if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                if (text) addLog('user', text);
             }
             
             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                
                // Sync timing
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  ctx,
                  24000,
                  1
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                
                // Connect to analyser for visualization then destination
                if (analyserRef.current) {
                  source.connect(analyserRef.current);
                  analyserRef.current.connect(ctx.destination);
                } else {
                  source.connect(ctx.destination);
                }
                
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }
             
             // Handle interruption
             if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            console.log('Live session closed');
            disconnect();
          },
          onerror: (err) => {
            console.error('Live session error', err);
            disconnect();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;
      
    } catch (err) {
      console.error("Failed to connect live", err);
      alert("Failed to start Live session. Please check permissions and API key.");
      disconnect();
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setLogs([]);
    
    // Cleanup Audio Contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // Stop Media Stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close Session (Not explicitly available on session object in this SDK version usually, rely on cleanup)
    // If the SDK provided a close method on the session object, we would call it here.
    // However, usually just dropping the reference and closing websocket (handled by SDK internals or close event) works.
    sessionRef.current = null;
    
    // Stop Animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const addLog = (role: 'user'|'model', text: string) => {
    setLogs(prev => {
        // Simple heuristic to append if it looks like a continuation or new
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.text.endsWith('.') && !last.text.endsWith('?') && !last.text.endsWith('!')) {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].text += text;
            return newLogs;
        }
        return [...prev, {role, text}];
    });
  };

  // Helper functions
  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };
  
  const encode = (bytes: Uint8Array) => {
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const startVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = '#f9fafb'; // bg-gray-50
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in flex flex-col h-[600px]">
       {/* Header */}
       <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Radio className={clsx("w-6 h-6", isConnected ? "text-red-500 animate-pulse" : "text-gray-400")} />
                Gemini Live
            </h2>
            <p className="text-sm text-gray-500">Real-time conversational AI</p>
         </div>
         
         <div className="flex items-center gap-2">
            {isConnected ? (
                <button 
                  onClick={disconnect}
                  className="px-6 py-2 bg-red-100 text-red-600 rounded-full font-semibold hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                    <Activity className="w-4 h-4" />
                    End Session
                </button>
            ) : (
                <button 
                  onClick={connect}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <Mic className="w-4 h-4" />
                    Start Conversation
                </button>
            )}
         </div>
       </div>
       
       {/* Visualizer Area */}
       <div className="relative h-48 bg-gray-50 rounded-xl mb-6 overflow-hidden border border-gray-100 flex items-center justify-center">
          {!isConnected && (
            <div className="text-gray-400 flex flex-col items-center">
                <Volume2 className="w-12 h-12 mb-2 opacity-20" />
                <p>Click "Start Conversation" to begin</p>
            </div>
          )}
          <canvas ref={canvasRef} width={800} height={200} className="w-full h-full absolute inset-0" />
       </div>
       
       {/* Transcript / Logs */}
       <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-y-auto border border-gray-100 font-mono text-sm" ref={logsRef}>
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
                {isConnected ? "Listening..." : "Conversation logs will appear here"}
            </div>
          ) : (
            <div className="space-y-3">
                {logs.map((log, idx) => (
                    <div key={idx} className={clsx("p-2 rounded-lg", log.role === 'user' ? "bg-blue-50 text-blue-900 border border-blue-100 ml-8" : "bg-white text-gray-900 border border-gray-200 mr-8")}>
                        <span className="text-xs font-bold uppercase opacity-50 block mb-1">{log.role}</span>
                        {log.text}
                    </div>
                ))}
            </div>
          )}
       </div>
       
       {/* Controls */}
       {isConnected && (
          <div className="mt-4 flex justify-center">
             <button 
               onClick={() => setIsMuted(!isMuted)}
               className={clsx(
                 "p-4 rounded-full transition-colors shadow-lg",
                 isMuted ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
               )}
             >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>
          </div>
       )}
    </div>
  );
};

export default LiveSection;
