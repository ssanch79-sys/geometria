import React, { useState, useEffect } from 'react';
import { ShapeType, Mode, Dimensions, Unit, Story, Difficulty } from './types';
import Controls from './components/Controls';
import ShapeCanvas from './components/ShapeCanvas';
import Explanation from './components/Explanation';
import Quiz from './components/Quiz';
import Chatbot from './components/Chatbot';
import StoryPlayer from './components/StoryPlayer';
import { GoogleGenAI, Type } from "@google/genai";

const APP_STATE_KEY = 'interactiveGeometryState';
const STORY_STATE_KEY = 'interactiveGeometryStoryState';

const loadState = <T,>(key: string): T | undefined => {
  try {
    const serializedState = localStorage.getItem(key);
    if (serializedState === null) return undefined;
    return JSON.parse(serializedState);
  } catch (err) {
    console.error(`No s'ha pogut carregar l'estat des de localStorage (clau: ${key}):`, err);
    return undefined;
  }
};

const savedSettings = loadState<{ shape: ShapeType; mode: Mode; dimensions: Dimensions; unit: Unit; difficulty: Difficulty }>(APP_STATE_KEY);
const savedStory = loadState<Story>(STORY_STATE_KEY);

// Helper function to clean the JSON response from markdown blocks
const cleanJsonString = (str: string): string => {
  return str.replace(/^```json\s*/, '').replace(/```$/, '').trim();
};


const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>(savedSettings?.shape || ShapeType.Rectangle);
  const [mode, setMode] = useState<Mode>(savedSettings?.mode || Mode.Area);
  const [difficulty, setDifficulty] = useState<Difficulty>(savedSettings?.difficulty || Difficulty.Easy);
  const [dimensions, setDimensions] = useState<Dimensions>(savedSettings?.dimensions || { width: 10, height: 8 });
  const [unit, setUnit] = useState<Unit>(savedSettings?.unit || Unit.CM);
  
  const [currentStory, setCurrentStory] = useState<Story | null>(savedStory || null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stateToSave = { shape, mode, dimensions, unit, difficulty };
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error("No s'ha pogut desar la configuració a localStorage:", err);
    }
  }, [shape, mode, dimensions, unit, difficulty]);

  useEffect(() => {
    try {
      if (currentStory) {
        localStorage.setItem(STORY_STATE_KEY, JSON.stringify(currentStory));
      } else {
        localStorage.removeItem(STORY_STATE_KEY);
      }
    } catch (err) {
      console.error("No s'ha pogut desar la història a localStorage:", err);
    }
  }, [currentStory]);


  useEffect(() => {
    // When switching to Square, make dimensions equal
    if (shape === ShapeType.Square) {
      if(dimensions.width !== dimensions.height) {
        const side = Math.round((dimensions.width + dimensions.height) / 2);
        setDimensions({ width: side, height: side });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  const handleGenerateStory = async () => {
    setIsGeneratingStory(true);
    setStoryError(null);
    setCurrentStory(null);
    localStorage.removeItem(STORY_STATE_KEY);

    const difficultyDescriptions = {
        [Difficulty.Easy]: "Utilitza nombres enters petits (1-10) i principalment formes simples com quadrats i rectangles.",
        [Difficulty.Medium]: "Utilitza nombres enters una mica més grans (1-20) i assegura't d'incloure triangles.",
        [Difficulty.Hard]: "Utilitza nombres que poden incloure un decimal (p. ex., 8.5), escenaris més complexos, i problemes amb triangles que siguin un repte. La resposta correcta i les opcions també poden tenir decimals."
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Crea una història interactiva curta en català per a nens de primària sobre com calcular el ${mode.toLowerCase()} d'un ${shape.toLowerCase()}.
      La història ha de tenir un nivell de dificultat '${difficulty}'. ${difficultyDescriptions[difficulty]}
      La història ha de tenir exactament 4 passos: un títol, una introducció, DOS exercicis pràctics amb dificultat creixent, i una conclusió.
      Cada exercici ha d'incloure dimensions, unitat, una resposta correcta i tres opcions incorrectes plausibles.
      Genera la sortida estrictament en el format JSON sol·licitat.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un títol creatiu per a la història." },
            steps: {
                type: Type.ARRAY,
                description: "Una llista de 4 passos per a la història (introducció, 2 exercicis, conclusió).",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, description: "El tipus de pas: 'introduction', 'exercise', o 'conclusion'." },
                        title: { type: Type.STRING, description: "El títol d'aquest pas." },
                        text: { type: Type.STRING, description: "El text principal d'aquest pas." },
                        dims: {
                            type: Type.OBJECT,
                            properties: {
                                width: { type: Type.NUMBER },
                                height: { type: Type.NUMBER }
                            },
                            nullable: true
                        },
                        unit: { type: Type.STRING, nullable: true },
                        correctAnswer: { type: Type.NUMBER, nullable: true },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.NUMBER },
                            nullable: true
                        }
                    },
                    required: ["type", "title", "text"]
                }
            }
        },
        required: ["title", "steps"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
      
      const cleanedText = cleanJsonString(response.text);
      let storyData;
      
      try {
        storyData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Error en analitzar el JSON de la història. Resposta original:", response.text);
        throw new Error("La resposta de l'API no era un JSON vàlid.");
      }
      
      if (!storyData || !storyData.steps || storyData.steps.length !== 4) {
          throw new Error("Les dades de la història generada són invàlides o estan incompletes.");
      }

      setCurrentStory({ ...storyData, shape, mode, currentStepIndex: 0 });

    } catch (error) {
      console.error("Error en generar la història:", error);
      setStoryError("Hi ha hagut un error en crear la història. Si us plau, intenta-ho de nou.");
    } finally {
      setIsGeneratingStory(false);
    }
  };
  
  const handleStoryProgress = (newStepIndex: number) => {
    if(currentStory) {
        setCurrentStory({...currentStory, currentStepIndex: newStepIndex});
    }
  };

  const handleExitStory = () => {
    setCurrentStory(null);
    localStorage.removeItem(STORY_STATE_KEY);
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-ruler-combined text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Geometria Interactiva</h1>
            <p className="text-sm text-slate-500">Aprèn sobre perímetres i àrees!</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
             {currentStory ? (
                <div className="animate-fade-in">
                    <StoryPlayer 
                        story={currentStory} 
                        onProgress={handleStoryProgress}
                        onExit={handleExitStory}
                    />
                </div>
             ) : (
                <>
                    <h2 className="text-xl font-bold text-slate-800 mb-6">
                        <i className="fa-solid fa-hand-pointer text-violet-500 mr-2"></i>
                        Explora i Aprèn
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="space-y-6">
                        <Controls
                          shape={shape}
                          setShape={setShape}
                          mode={mode}
                          setMode={setMode}
                          difficulty={difficulty}
                          setDifficulty={setDifficulty}
                          dimensions={dimensions}
                          setDimensions={setDimensions}
                          unit={unit}
                          setUnit={setUnit}
                        />
                         <button onClick={handleGenerateStory} disabled={isGeneratingStory} className="w-full mt-4 px-4 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all disabled:bg-slate-300 flex items-center justify-center gap-2">
                            {isGeneratingStory ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    <span>Creant...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    <span>Crea una Història</span>
                                </>
                            )}
                        </button>
                        {storyError && <p className="text-sm text-red-600 text-center mt-2">{storyError}</p>}
                      </div>
                      <div className="space-y-4">
                        <ShapeCanvas shape={shape} mode={mode} dimensions={dimensions} unit={unit} />
                        <Explanation shape={shape} mode={mode} dimensions={dimensions} unit={unit} />
                      </div>
                    </div>
                </>
             )}
          </div>

          <div className="lg:mt-0">
             <Quiz currentStory={currentStory} difficulty={difficulty} />
          </div>

        </div>
      </main>
      <Chatbot />
      <footer className="text-center py-6 text-sm text-slate-500">
        <p>Creat amb <i className="fa-solid fa-heart text-red-500"></i> per a futurs matemàtics.</p>
      </footer>
       <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
