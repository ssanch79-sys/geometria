import React, { useState, useEffect, useRef } from 'react';
import { Story, Mode } from '../types';
import QuizShapeDisplay from './QuizShapeDisplay';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audio';

interface StoryPlayerProps {
  story: Story;
  onProgress: (newStepIndex: number) => void;
  onExit: () => void;
}

const StoryPlayer: React.FC<StoryPlayerProps> = ({ story, onProgress, onExit }) => {
  const { title, steps, currentStepIndex, shape, mode } = story;
  const currentStep = steps[currentStepIndex];

  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);
  const [answered, setAnswered] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);


  const stopSpeaking = () => {
    if (audioSourceRef.current) {
        audioSourceRef.current.onended = null;
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    // Reset feedback and stop audio when moving to a new step
    setFeedback(null);
    setAnswered(false);
    stopSpeaking();

    // Cleanup when the component unmounts (user exits story)
    return () => {
        stopSpeaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  const handleSpeak = async () => {
    if (isSpeaking) return;
    
    const textToSpeak = `${currentStep.title}. ${currentStep.text}`;

    setIsSpeaking(true);
    try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToSpeak }] }],
            config: {
                responseModalities: [Modality.AUDIO],
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioContextRef.current,
                24000,
                1
            );
            const source = audioContextRef.current.createBufferSource();
            audioSourceRef.current = source;
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            source.onended = () => {
                setIsSpeaking(false);
                audioSourceRef.current = null;
            };
        } else {
            setIsSpeaking(false);
        }
    } catch (error) {
        console.error("Error generating speech:", error);
        setIsSpeaking(false);
    }
  };


  const handleAnswer = (answer: number) => {
    if (answered) return;
    if (answer === currentStep.correctAnswer) {
      setFeedback({ message: 'Excel·lent! Resposta correcta!', isCorrect: true });
    } else {
      setFeedback({ message: `Gairebé! La resposta correcta era ${currentStep.correctAnswer}.`, isCorrect: false });
    }
    setAnswered(true);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      onProgress(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      onProgress(currentStepIndex - 1);
    }
  };
  
  const isExerciseCorrectlyAnswered = currentStep.type === 'exercise' && feedback?.isCorrect;
  const canProceed = currentStep.type !== 'exercise' || isExerciseCorrectlyAnswered;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-book-open text-amber-500"></i>
              Mode Història
            </h2>
            <button onClick={onExit} className="px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-door-open"></i>
                Sortir de la Història
            </button>
        </div>
        <p className="text-sm text-slate-500 mt-1">{title}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Step Content */}
      <div className="flex-grow space-y-4">
          <div className="flex justify-between items-start">
             <h3 className="text-lg font-bold text-violet-700 flex-grow">{currentStep.title}</h3>
             <button onClick={handleSpeak} disabled={isSpeaking} className="text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-50 disabled:cursor-wait ml-3 flex-shrink-0">
                <i className={`fa-solid ${isSpeaking ? 'fa-spinner fa-spin' : 'fa-volume-high'}`}></i>
             </button>
          </div>
          <p className="text-slate-600 leading-relaxed">{currentStep.text}</p>
          
          {currentStep.type === 'exercise' && currentStep.dims && currentStep.unit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                <div className="w-full max-w-[150px] mx-auto">
                    <QuizShapeDisplay shape={shape} dims={currentStep.dims} unit={currentStep.unit} />
                </div>
                 <div className="grid grid-cols-2 gap-2">
                    {currentStep.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(option)}
                        disabled={answered}
                        className={`p-3 rounded-lg font-bold text-center transition-all duration-200 disabled:cursor-not-allowed ${
                            answered && option === currentStep.correctAnswer ? 'bg-green-500 text-white' : ''
                        } ${
                            answered && option !== currentStep.correctAnswer ? 'bg-red-500 text-white' : ''
                        } ${
                            !answered ? 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-violet-100 hover:border-violet-300' : ''
                        }`}
                      >
                        {option} {currentStep.unit}{mode === Mode.Area ? '²' : ''}
                      </button>
                    ))}
                </div>
            </div>
          )}
          
          {feedback && (
            <div className={`mt-4 p-3 rounded-lg text-center font-semibold text-sm ${feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {feedback.message}
            </div>
          )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
        <button 
          onClick={handlePrevious} 
          disabled={currentStepIndex === 0}
          className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
        >
          Anterior
        </button>
        <p className="text-sm text-slate-500">Pas {currentStepIndex + 1} de {steps.length}</p>
        {currentStepIndex < steps.length - 1 ? (
             <button 
                onClick={handleNext}
                disabled={!canProceed}
                className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:bg-slate-300"
            >
             Següent
            </button>
        ) : (
            <button 
                onClick={onExit}
                disabled={!canProceed}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300"
            >
             Finalitzar
            </button>
        )}
      </div>
    </div>
  );
};

export default StoryPlayer;