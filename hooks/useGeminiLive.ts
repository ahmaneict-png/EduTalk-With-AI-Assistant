import { useState, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, type Blob, type LiveSession } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../utils/audio';
import { ConversationStatus, type TranscriptionEntry } from '../types';

type Subject = 'marathi' | 'hindi' | 'english' | 'math';

const useGeminiLive = (setTranscriptionHistory: Dispatch<SetStateAction<TranscriptionEntry[]>>) => {
  const [status, setStatus] = useState<ConversationStatus>(ConversationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
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
        // Use a simple, non-conversational token to signal silence
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
    cleanup();
  }, [cleanup]);

  const startSession = useCallback(async (userName: string, isQuizMode: boolean, subject: Subject) => {
    if (!navigator.onLine) {
      setError("तुम्ही ऑफलाइन आहात. कृपया तुमचे इंटरनेट कनेक्शन तपासा.");
      setStatus(ConversationStatus.ERROR);
      return;
    }
    
    setStatus(ConversationStatus.CONNECTING);
    setError(null);
    setCurrentTranscription({ user: '', model: '' });
    hasConversationStartedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // FIX: Per guidelines, initialize with process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      let systemInstruction = '';
      let speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } };

      // --- Updated System Instructions ---
      switch(subject) {
        case 'marathi': {
          const base = `तुम्ही '${userName}' या विद्यार्थ्यासाठी एक प्रेमळ मराठी शिक्षण सहाय्यक आहात. विद्यार्थ्याला नेहमी 'तू' असे संबोधून बोला. तुमची भाषा सोपी आणि उत्साहवर्धक असावी. संभाषण फक्त मराठीतच करा. अत्यंत महत्त्वाचे: विद्यार्थी मराठीत बोलेल. त्याचे बोलणे देवनागरी लिपीतच transcribe करा, खराब नेटवर्कमध्येही. जर तुला 'USER_IS_SILENT_CHECK' असा संदेश मिळाला, तर '${userName}, तू आहेस का?' असे विचार. जर विचित्र आवाज आला किंवा शिक्षणाशी संबंधित नसलेला प्रश्न विचारला गेला, तर म्हणा, 'तेथे थोडा गोंधळ दिसतोय, कृपया शिक्षण व अभ्यास सोडून इतर विषयावर प्रश्न विचारु नका'.`;
          const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. विचारा आपला प्रश्न'.`;
          const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. प्रश्नमंजुषा सुरु करू या का ?'.`;
          systemInstruction = isQuizMode 
            ? `${base} ${welcomeQuiz} एका वेळी एकच प्रश्न विचारा.`
            : `${base} ${welcomeConv}`;
          break;
        }
        case 'hindi': {
          const base = `आप '${userName}' नामक छात्र के लिए एक स्नेही हिंदी शिक्षण सहायक हैं। छात्र से हमेशा 'तुम' कहकर बात करें। आपकी भाषा सरल और उत्साहजनक होनी चाहिए। बातचीत केवल हिंदी में करें। अत्यंत महत्वपूर्ण: छात्र हिंदी में बोलेगा। उसकी बोली को देवनागरी लिपि में ही transcribe करें, खराब नेटवर्क पर भी। यदि आपको 'USER_IS_SILENT_CHECK' संदेश मिले, तो पूछें '${userName}, तुम वहाँ हो?'। यदि कोई अजीब शोर हो या शिक्षा से असंबंधित प्रश्न पूछा जाए, तो कहें, 'वहाँ कुछ भ्रम लग रहा है, कृपया शिक्षा और अध्ययन के अलावा अन्य विषयों पर प्रश्न न पूछें।'`;
          const welcomeConv = `आपका पहला वाक्य होगा: '${userName}, मैं हूँ आपका शिक्षण सहायक, मुझे आपके शिक्षक श्री. अनिल माने ने बनाया है। पूछो अपना सवाल!'.`;
          const welcomeQuiz = `आपका पहला वाक्य होगा: '${userName}, मैं हूँ आपका शिक्षण सहायक, मुझे आपके शिक्षक श्री. अनिल माने ने बनाया है। क्या हम प्रश्नोत्तरी शुरू करें?'.`;
          systemInstruction = isQuizMode
            ? `${base} ${welcomeQuiz} एक बार में केवल एक ही प्रश्न पूछें।`
            : `${base} ${welcomeConv}`;
          break;
        }
        case 'english': {
          speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }; // Male voice
          const base = `You are an English conversation teacher for a student named '${userName}'. Your personality is that of a clear, understanding Indian English teacher. Conduct the conversation in a bilingual format (simple Marathi for explanations, English for examples/practice). Address the student using the Marathi pronoun 'तू'. CRITICAL: The student will speak in Marathi. You MUST transcribe their speech into Devanagari script, not Roman, even on a poor network. If you receive the text 'USER_IS_SILENT_CHECK', you MUST ask in Marathi, '${userName}, तू आहेस का?'. If there is strange noise or a question unrelated to education is asked, say in Marathi, 'तेथे थोडा गोंधळ दिसतोय, कृपया शिक्षण व अभ्यास सोडून इतर विषयावर प्रश्न विचारु नका'.`;
          const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. आपण इंग्रजी संभाषणाला सुरुवात करूया का?'.`;
          const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. इंग्रजी प्रश्नमंजुषा सुरु करू या का ?'.`;
          systemInstruction = isQuizMode ? `${base} ${welcomeQuiz}` : `${base} ${welcomeConv}`;
          break;
        }
        case 'math': {
           const base = `तुम्ही '${userName}' या विद्यार्थ्यासाठी एक प्रेमळ गणित शिक्षण सहाय्यक आहात. विद्यार्थ्याला नेहमी 'तू' असे संबोधून बोला. तुमची भाषा सोपी आणि उत्साहवर्धक असावी. संभाषण फक्त मराठीतच करा. अत्यंत महत्त्वाचे: विद्यार्थी मराठीत बोलेल. त्याचे बोलणे देवनागरी लिपीतच transcribe करा, खराब नेटवर्कमध्येही. विद्यार्थ्यांना थेट उत्तर देऊ नका, त्यांना प्रश्न सोडवण्यासाठी पायरी-पायरीने मार्गदर्शन करा. जर तुला 'USER_IS_SILENT_CHECK' असा संदेश मिळाला, तर '${userName}, तू आहेस का?' असे विचार. जर विचित्र आवाज आला किंवा शिक्षणाशी संबंधित नसलेला प्रश्न विचारला गेला, तर म्हणा, 'तेथे थोडा गोंधळ दिसतोय, कृपया शिक्षण व अभ्यास सोडून इतर विषयावर प्रश्न विचारु नका'.`;
           const welcomeConv = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. विचारा आपला गणिताचा प्रश्न'.`;
           const welcomeQuiz = `तुमचे पहिले वाक्य असेल: '${userName}, मी आहे आपला शिक्षण सहाय्यक, मला आपले शिक्षक श्री. अनिल माने यांनी तयार केले आहे. गणिताची प्रश्नमंजुषा सुरु करू या का ?'.`;
           systemInstruction = isQuizMode
            ? `${base} ${welcomeQuiz} एका वेळी एकच प्रश्न विचारा.`
            : `${base} ${welcomeConv}`;
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
                
                // This will be true for the initial "Start" prompt that gets an empty response.
                const isInitialEmptyTurn = !hasConversationStartedRef.current && fullOutput.trim() === '';

                // Update history only for meaningful turns
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

                // Only transition to LISTENING if it wasn't the initial empty turn.
                // This prevents the "LISTENING" state from showing up before the AI's welcome message.
                if (!isInitialEmptyTurn) {
                    setStatus(ConversationStatus.LISTENING);
                    startInactivityTimer();
                }
             }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              clearSpeechEndTimer();
              for (const source of playingAudioSourcesRef.current) {
                source.stop();
                playingAudioSourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
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
                source.onended = () => {
                    playingAudioSourcesRef.current.delete(source);
                };
            }
          },
          onclose: () => {
            setStatus(ConversationStatus.IDLE);
            cleanup();
          },
          // FIX: Removed local environment logic and sessionStorage usage from error handling
          // to align with API key guidelines. Error messages are simplified.
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            if (!navigator.onLine) {
                setError("तुम्ही ऑफलाइन आहात. कृपया तुमचे इंटरनेट कनेक्शन तपासा.");
            } else {
                let userMessage = "कनेक्शनमध्ये अडचण येत आहे. कृपया तुमचे इंटरनेट व्यवस्थित चालू आहे का ते तपासा आणि थोड्या वेळाने पुन्हा प्रयत्न करा.";
                if (e.message) {
                    const message = e.message.toLowerCase();
                    if (message.includes('requested entity was not found')) {
                        userMessage = "निवडलेली API की सापडली नाही. कृपया पेज रिफ्रेश करून दुसरी की निवडा.";
                    } else if (message.includes('network error')) {
                         userMessage = "नेटवर्कमध्ये समस्या आहे. कृपया तुमचे इंटरनेट कनेक्शन तपासा आणि पेज रिफ्रेश करून पुन्हा प्रयत्न करा.";
                    } else if (message.includes('service is currently unavailable')) {
                        userMessage = "सेवा तात्पुरती अनुपलब्ध आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.";
                    } else if (message.includes('invalid argument')) {
                        userMessage = "चुकीची विनंती पाठवली गेली. कृपया पुन्हा प्रयत्न करा.";
                    } else if (message.includes('api key not valid')) {
                        userMessage = "तुमची API की चुकीची आहे. कृपया पेज रिफ्रेश करून योग्य की निवडा.";
                    } else if (message.includes('does not have permission')) {
                        userMessage = "API की वापरण्याची परवानगी नाही. कृपया खात्री करा की तुमची API की योग्य आहे आणि आवश्यक परवानग्या सक्षम केल्या आहेत.";
                    }
                }
                setError(userMessage);
            }
            setStatus(ConversationStatus.ERROR);
            cleanup();
          },
        },
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      let errorMessage = "संभाषण सुरू करता आले नाही.";
      if (error instanceof Error && error.name === 'NotAllowedError') {
        errorMessage = "मायक्रोफोन वापरण्याची परवानगी आवश्यक आहे.";
      }
      setError(errorMessage);
      setStatus(ConversationStatus.ERROR);
      cleanup();
    }
  }, [cleanup, setTranscriptionHistory, clearSpeechEndTimer, startInactivityTimer, clearInactivityTimer]);

  return { status, error, startSession, closeSession, currentTranscription };
};

export default useGeminiLive;