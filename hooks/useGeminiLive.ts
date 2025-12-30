
import { useState, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, type Blob, type LiveSession } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../utils/audio';
import { ConversationStatus, type TranscriptionEntry } from '../types';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

const useGeminiLive = (setTranscriptionHistory: Dispatch<SetStateAction<TranscriptionEntry[]>>) => {
  const [status, setStatus] = useState<ConversationStatus>(ConversationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: '' });

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const speechEndTimerRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const hasConversationStartedRef = useRef(false);

  const clearSpeechEndTimer = useCallback(() => {
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
  }, []);
  
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);
  
  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      sessionPromiseRef.current?.then((session) => {
        session.sendRealtimeInput({ text: 'USER_IS_SILENT_CHECK' }); 
      });
    }, 20000); // 20 seconds
  }, [clearInactivityTimer]);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    sessionPromiseRef.current = null;
    clearSpeechEndTimer();
    clearInactivityTimer();
    if (status !== ConversationStatus.ERROR) {
      setStatus(ConversationStatus.IDLE);
    }
    setCurrentTranscription({ user: '', model: '' });
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
  }, [status, clearSpeechEndTimer, clearInactivityTimer]);

  const closeSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }
    setError(null);
    setRawError(null);
    cleanup();
  }, [cleanup]);

  const startSession = useCallback(async (userName: string, isQuizMode: boolean, subject: Subject) => {
    if (!navigator.onLine) {
      setError("तुमची सिस्टिम ऑफलाइन आहे. कृपया इंटरनेट कनेक्शन तपासा.");
      setStatus(ConversationStatus.ERROR);
      return;
    }

    // Checking specifically for the API Key in the execution environment
    const keyToUse = process.env.API_KEY;
    
    if (!keyToUse) {
        setError("त्रुटी: 'API_KEY' सापडली नाही. उपाय: Vercel डॅशबोर्डवर Settings > Environment Variables मध्ये 'API_KEY' नाव आणि तुमची की जोडा, मग 'Redeploy' करा.");
        setStatus(ConversationStatus.ERROR);
        return;
    }
    
    setStatus(ConversationStatus.CONNECTING);
    setError(null);
    setRawError(null);
    setCurrentTranscription({ user: '', model: '' });
    hasConversationStartedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: keyToUse });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      let systemInstruction = '';
      let speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } };

      switch(subject) {
        case 'marathi': {
          const base = `तुम्ही '${userName}' या विद्यार्थ्यासाठी एक प्रेमळ मराठी शिक्षण सहाय्यक आहात. विद्यार्थ्याला नेहमी 'तू' असे संबोधून बोला. तुमची भाषा सोपी आणि उत्साहवर्धक असावी. संभाषण फक्त मराठीतच करा. अत्यंत महत्त्वाचे: विद्यार्थी मराठीत बोलेल. त्याचे बोलणे देवनागरी लिपीतच transcribe करा. जर तुला 'USER_IS_SILENT_CHECK' असा संदेश मिळाला, तर '${userName}, तू आहेस का?' असे विचार.`;
          const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. विचारा आपला प्रश्न'.`;
          const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. प्रश्नमंजुषा सुरु करू या का ?'.`;
          systemInstruction = isQuizMode ? `${base} ${welcomeQuiz} एका वेळी एकच प्रश्न विचारा.` : `${base} ${welcomeConv}`;
          break;
        }
        case 'hindi': {
          const base = `आप '${userName}' नामक छात्र के लिए एक स्नेही हिंदी शिक्षण सहायक हैं। छात्र से हमेशा 'तुम' कहकर बात करें। बातचीत केवल हिंदी में करें। विद्यार्थी की बोली देवनागरी में लिखें।`;
          const welcomeConv = `आपका पहला वाक्य होगा: '${userName}, मैं हूँ आपका शिक्षण सहायक, मुझे आपके शिक्षक श्री. अनिल माने ने बनाया है। पूछो अपना सवाल!'.`;
          const welcomeQuiz = `आपका पहला वाक्य होगा: '${userName}, मैं हूँ आपका शिक्षण सहायक, मुझे आपके शिक्षक श्री. अनिल माने ने बनाया है। क्या हम प्रश्नोत्तरी शुरू करें?'.`;
          systemInstruction = isQuizMode ? `${base} ${welcomeQuiz} एक बार में केवल एक ही प्रश्न पूछें।` : `${base} ${welcomeConv}`;
          break;
        }
        case 'english': {
          speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } };
          const base = `You are an English conversation teacher for '${userName}'. Personality: Clear Indian English teacher. Use Marathi for explanations. Address student as 'तू'. Transcribe Marathi speech in Devanagari.`;
          const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. आपण इंग्रजी संभाषणाला सुरुवात करूया का?'.`;
          const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. इंग्रजी प्रश्नमंजुषा सुरु करू या का ?'.`;
          systemInstruction = isQuizMode ? `${base} ${welcomeQuiz}` : `${base} ${welcomeConv}`;
          break;
        }
        case 'math': {
           const base = `तुम्ही '${userName}' या विद्यार्थ्यासाठी गणित शिक्षण सहाय्यक आहात. पायरी-पायरीने मार्गदर्शन करा.`;
           const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. विचारा आपला गणिताचा प्रश्न'.`;
           const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. गणिताची प्रश्नमंजुषा सुरु करू या का ?'.`;
           systemInstruction = isQuizMode ? `${base} ${welcomeQuiz}` : `${base} ${welcomeConv}`;
           break;
        }
      }

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
          speechConfig: speechConfig,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            if (!audioContextRef.current) return;
            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);
            
            sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ text: 'Start' });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.serverContent?.inputTranscription) {
                clearInactivityTimer();
                clearSpeechEndTimer();
                speechEndTimerRef.current = window.setTimeout(() => {
                  if (currentInputTranscriptionRef.current.trim().length > 0) {
                    setStatus(ConversationStatus.THINKING);
                  }
                }, 1200);

                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptionRef.current += text;
                setCurrentTranscription(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
             }

             if (message.serverContent?.outputTranscription) {
                clearSpeechEndTimer();
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                setCurrentTranscription(prev => ({...prev, model: currentOutputTranscriptionRef.current }));
                setStatus(ConversationStatus.SPEAKING);
             }
             
             if (message.serverContent?.turnComplete) {
                clearSpeechEndTimer();
                const fullInput = currentInputTranscriptionRef.current;
                const fullOutput = currentOutputTranscriptionRef.current;
                const isInitialEmptyTurn = !hasConversationStartedRef.current && fullOutput.trim() === '';

                if (fullInput.trim() && fullInput.trim().toLowerCase() !== 'start' && fullInput.trim() !== 'USER_IS_SILENT_CHECK') {
                    setTranscriptionHistory(prev => [...prev, { speaker: 'user', text: fullInput }]);
                    hasConversationStartedRef.current = true;
                }
                if (fullOutput.trim()) {
                    setTranscriptionHistory(prev => [...prev, { speaker: 'model', text: fullOutput }]);
                    hasConversationStartedRef.current = true;
                }

                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setCurrentTranscription({ user: '', model: '' });

                if (!isInitialEmptyTurn) {
                    setStatus(ConversationStatus.LISTENING);
                    startInactivityTimer();
                }
             }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
                const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                const currentTime = outputAudioContextRef.current.currentTime;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                playingAudioSourcesRef.current.add(source);
                source.onended = () => playingAudioSourcesRef.current.delete(source);
            }
          },
          onclose: () => {
            console.log("Gemini Live Session Closed");
            setStatus(ConversationStatus.IDLE);
            cleanup();
          },
          onerror: (e: any) => {
            console.error("Gemini Live Session Error Object:", e);
            const errorMessage = e?.message || "अज्ञात त्रुटी";
            setRawError(errorMessage);
            
            if (!navigator.onLine) {
                setError("तुमची सिस्टिम ऑफलाइन आहे. इंटरनेट तपासा.");
            } else if (errorMessage.toLowerCase().includes('api key not valid') || errorMessage.toLowerCase().includes('forbidden')) {
                setError("तुमची API की अवैध आहे किंवा तिला परवानग्या नाहीत. कृपया नवीन की तपासा.");
            } else if (errorMessage.toLowerCase().includes('requested entity was not found')) {
                setError("हे मॉडेल सध्या उपलब्ध नाही. कृपया काही वेळाने प्रयत्न करा.");
            } else {
                setError("कनेक्शनमध्ये अडचण आली. हे API की नसल्यामुळे किंवा सर्वर डाऊन असल्यामुळे असू शकते.");
            }
            setStatus(ConversationStatus.ERROR);
            cleanup();
          },
        },
      });
    } catch (error: any) {
      console.error("Failed to start session:", error);
      setRawError(error?.message || "Catch block error");
      let errorMessage = "संभाषण सुरू करता आले नाही. इंटरनेट आणि मायक्रोफोन तपासा.";
      if (error?.name === 'NotAllowedError') errorMessage = "मायक्रोफोन वापरण्याची परवानगी नाकारली गेली आहे.";
      setError(errorMessage);
      setStatus(ConversationStatus.ERROR);
      cleanup();
    }
  }, [cleanup, setTranscriptionHistory, clearSpeechEndTimer, startInactivityTimer, clearInactivityTimer]);

  return { status, error, rawError, startSession, closeSession, currentTranscription };
};

export default useGeminiLive;
