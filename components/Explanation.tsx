import React, { useState, useRef } from 'react';
import { ShapeType, Mode, Dimensions, Unit } from '../types';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audio';

interface ExplanationProps {
  shape: ShapeType;
  mode: Mode;
  dimensions: Dimensions;
  unit: Unit;
}

const Explanation: React.FC<ExplanationProps> = ({ shape, mode, dimensions, unit }) => {
  const { width, height } = dimensions;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const calculations = {
    [ShapeType.Square]: {
      [Mode.Perimeter]: {
        formula: '4 × costat',
        calculation: `4 × ${width}`,
        result: 4 * width,
        units: unit,
      },
      [Mode.Area]: {
        formula: 'costat × costat',
        calculation: `${width} × ${width}`,
        result: width * width,
        units: `${unit}²`,
      },
    },
    [ShapeType.Rectangle]: {
      [Mode.Perimeter]: {
        formula: '2 × (amplada + alçada)',
        calculation: `2 × (${width} + ${height})`,
        result: 2 * (width + height),
        units: unit,
      },
      [Mode.Area]: {
        formula: 'amplada × alçada',
        calculation: `${width} × ${height}`,
        result: width * height,
        units: `${unit}²`,
      },
    },
    [ShapeType.Triangle]: {
      [Mode.Perimeter]: {
        formula: 'costat1 + costat2 + base',
        calculation: `${Math.sqrt(Math.pow(width/2, 2) + Math.pow(height, 2)).toFixed(1)} + ${Math.sqrt(Math.pow(width/2, 2) + Math.pow(height, 2)).toFixed(1)} + ${width}`,
        result: parseFloat((2 * Math.sqrt(Math.pow(width/2, 2) + Math.pow(height, 2)) + width).toFixed(1)),
        units: unit,
      },
      [Mode.Area]: {
        formula: '(base × alçada) / 2',
        calculation: `(${width} × ${height}) / 2`,
        result: (width * height) / 2,
        units: `${unit}²`,
      },
    },
  };

  const current = calculations[shape][mode];
  
  const descriptions = {
      [Mode.Perimeter]: `El perímetre és la distància total al voltant de la vora d'una figura. És com si caminessis per tot el contorn.`,
      [Mode.Area]: `L'àrea és la quantitat d'espai dins d'una figura. Es mesura en unitats quadrades.`
  }

  const handleSpeak = async () => {
    if (isSpeaking) return;
    
    const textToSpeak = `
        Càlcul del ${mode} d'un ${shape}.
        ${descriptions[mode]}.
        La fórmula és ${current.formula}.
        El càlcul és ${current.calculation}.
        El resultat final és ${current.result} ${current.units}.
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


  return (
    <div className="bg-violet-600 text-white p-6 rounded-2xl shadow-lg space-y-4">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-xl font-bold">{mode} d'un {shape}</h3>
                <p className="text-violet-200 text-sm mt-1">{descriptions[mode]}</p>
            </div>
             <button onClick={handleSpeak} disabled={isSpeaking} className="text-violet-200 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait">
                <i className={`fa-solid ${isSpeaking ? 'fa-spinner fa-spin' : 'fa-volume-high'}`}></i>
             </button>
        </div>
      <div className="bg-violet-700 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold text-violet-300">Fórmula</span>
          <code className="font-mono text-violet-100">{current.formula}</code>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="font-semibold text-violet-300">Càlcul</span>
          <code className="font-mono text-violet-100">{current.calculation}</code>
        </div>
      </div>
      <div className="text-center bg-white text-violet-900 rounded-lg py-4">
        <p className="text-sm font-bold uppercase tracking-wider">Resultat</p>
        <p className="text-4xl font-extrabold">
          {current.result} <span className="text-2xl font-semibold text-violet-500">{current.units}</span>
        </p>
      </div>
    </div>
  );
};

export default Explanation;