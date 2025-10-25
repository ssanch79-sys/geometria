import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShapeType, Mode, QuizQuestion, Dimensions, Unit, Story } from '../types';
import { GoogleGenAI, Modality } from "@google/genai";
import QuizShapeDisplay from './QuizShapeDisplay';
import { decode, decodeAudioData } from '../utils/audio';

interface QuizProps {
  currentStory: Story | null;
}

function shuffleArray<T,>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

const Quiz: React.FC<QuizProps> = ({ currentStory }) => {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);
  const [answered, setAnswered] = useState<boolean>(false);
  const [shapeIconUrl, setShapeIconUrl] = useState<string | null>(null);
  const [isIconLoading, setIsIconLoading] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const generateQuestion = useCallback((forceShape?: ShapeType, forceMode?: Mode) => {
    setIsIconLoading(true);
    setShapeIconUrl(null);

    const shapes = [ShapeType.Square, ShapeType.Rectangle, ShapeType.Triangle];
    const modes = [Mode.Perimeter, Mode.Area];
    const units = [Unit.MM, Unit.CM, Unit.M];

    const shape = forceShape || shapes[Math.floor(Math.random() * shapes.length)];
    const mode = forceMode || modes[Math.floor(Math.random() * modes.length)];
    const unit = units[Math.floor(Math.random() * units.length)];
    const width = Math.floor(Math.random() * 10) + 1;
    const height = Math.floor(Math.random() * 10) + 1;
    const dims: Dimensions = { width: shape === ShapeType.Square ? width : width, height: shape === ShapeType.Square ? width : height };

    let correctAnswer: number;
    if (shape === ShapeType.Square) {
      correctAnswer = mode === Mode.Area ? dims.width * dims.width : 4 * dims.width;
    } else if (shape === ShapeType.Rectangle) {
      correctAnswer = mode === Mode.Area ? dims.width * dims.height : 2 * (dims.width + dims.height);
    } else { // Triangle
      if(mode === Mode.Area) {
          correctAnswer = (dims.width * dims.height) / 2;
      } else {
          const side = Math.sqrt(Math.pow(dims.width/2, 2) + Math.pow(dims.height, 2));
          correctAnswer = parseFloat((2 * side + dims.width).toFixed(1));
      }
    }

    const options = new Set<number>([correctAnswer]);
    while (options.size < 4) {
      const wrongAnswer = correctAnswer + (Math.floor(Math.random() * 10) + 1) * (Math.random() > 0.5 ? 1 : -1);
      if (wrongAnswer > 0 && wrongAnswer !== correctAnswer) {
        options.add(parseFloat(wrongAnswer.toFixed(1)));
      }
    }

    setQuestion({
      shape,
      dims,
      mode,
      unit,
      correctAnswer,
      options: shuffleArray(Array.from(options)),
    });
    setFeedback(null);
    setAnswered(false);
  }, []);

  useEffect(() => {
    if (currentStory) {
      generateQuestion(currentStory.shape, currentStory.mode);
    } else {
      generateQuestion();
    }
  }, [currentStory, generateQuestion]);

  useEffect(() => {
    if (!question) return;

    const generateIcon = async () => {
      setIsIconLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `A simple, flat, 2D icon of a ${question.shape.toLowerCase()}, with a friendly cartoon style, vibrant colors, on a clean white background, suitable for a kids math app.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            responseModalities: [Modality.IMAGE],
          },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
              setShapeIconUrl(imageUrl);
              break;
            }
        }
      } catch (error) {
        console.error("Error generating image:", error);
      } finally {
        setIsIconLoading(false);
      }
    };

    generateIcon();
  }, [question]);

  const handleAnswer = (answer: number) => {
    if(answered) return;
    if (answer === question?.correctAnswer) {
      setFeedback({ message: 'Molt bé! Resposta correcta!', isCorrect: true });
    } else {
      setFeedback({ message: `Gairebé! La resposta correcta era ${question?.correctAnswer}.`, isCorrect: false });
    }
    setAnswered(true);
  };

    const handleSpeak = async () => {
    if (isSpeaking || !question) return;

    let dimensionsText = '';
    if (question.shape === ShapeType.Square) {
      dimensionsText = `El costat fa ${question.dims.width} ${question.unit}.`;
    } else if (question.shape === ShapeType.Rectangle) {
      dimensionsText = `L'amplada és de ${question.dims.width} ${question.unit} i l'alçada és de ${question.dims.height} ${question.unit}.`;
    } else {
      dimensionsText = `La base és de ${question.dims.width} ${question.unit} i l'alçada és de ${question.dims.height} ${question.unit}.`;
    }
    
    const textToSpeak = `
        Quin és el ${question.mode.toLowerCase()} de la figura?
        ${dimensionsText}
    `;

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
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.start();
            source.onended = () => {
                setIsSpeaking(false);
            };
        } else {
            setIsSpeaking(false);
        }
    } catch (error) {
        console.error("Error generating speech:", error);
        setIsSpeaking(false);
    }
  };

  if (!question) {
    return <div>Carregant pregunta...</div>;
  }

  const title = currentStory 
    ? `Repte: ${currentStory.shape}`
    : "Posa't a prova!";
  
  const titleIcon = currentStory ? "fa-trophy" : "fa-puzzle-piece";

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">
            <i className={`fa-solid ${titleIcon} text-violet-500 mr-2`}></i>
            {title}
        </h2>
        <button onClick={() => generateQuestion(currentStory?.shape, currentStory?.mode)} className="px-4 py-2 text-sm font-semibold text-violet-600 bg-violet-100 rounded-lg hover:bg-violet-200 transition-colors">
            Nova Pregunta
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4 items-center">
          {/* Left side: Question and details */}
          <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {isIconLoading ? (
                        <i className="fa-solid fa-spinner fa-spin text-violet-500 text-xl"></i>
                    ) : (
                        shapeIconUrl && <img src={shapeIconUrl} alt={`${question.shape} icon`} className="w-full h-full object-contain rounded-lg p-1" />
                    )}
                </div>
                <p className="text-slate-600 flex-grow">
                    Quin és el <strong className="text-violet-700">{question.mode.toLowerCase()}</strong> de la figura?
                </p>
                <button onClick={handleSpeak} disabled={isSpeaking} className="text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-50 disabled:cursor-wait">
                    <i className={`fa-solid ${isSpeaking ? 'fa-spinner fa-spin' : 'fa-volume-high'}`}></i>
                </button>
              </div>
              <div className="text-center bg-slate-100 p-3 rounded-lg">
                <p className="font-semibold text-slate-700">Mides:</p>
                {question.shape === ShapeType.Square && <p className="text-sm text-slate-600">Costat: {question.dims.width} {question.unit}</p>}
                {question.shape === ShapeType.Rectangle && <p className="text-sm text-slate-600">Amplada: {question.dims.width} {question.unit}, Alçada: {question.dims.height} {question.unit}</p>}
                {question.shape === ShapeType.Triangle && <p className="text-sm text-slate-600">Base: {question.dims.width} {question.unit}, Alçada: {question.dims.height} {question.unit}</p>}
              </div>
          </div>
          {/* Right side: Shape Display */}
          <div className="w-full max-w-[150px] mx-auto">
             <QuizShapeDisplay shape={question.shape} dims={question.dims} />
          </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            disabled={answered}
            className={`p-4 rounded-lg font-bold text-center transition-all duration-200 disabled:cursor-not-allowed ${
                answered && option === question.correctAnswer ? 'bg-green-500 text-white' : ''
            } ${
                answered && option !== question.correctAnswer ? 'bg-red-500 text-white' : ''
            } ${
                !answered ? 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-violet-100 hover:border-violet-300' : ''
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg text-center font-semibold text-sm ${feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default Quiz;