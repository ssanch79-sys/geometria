import React, { useState, useEffect } from 'react';
import ShapeCanvas from './components/ShapeCanvas';
import Controls from './components/Controls';
import Explanation from './components/Explanation';
import Quiz from './components/Quiz';
import StoryPlayer from './components/StoryPlayer';
import Chatbot from './components/Chatbot';
import { ShapeType, Mode, Unit, Difficulty, Dimensions, Story } from './types';
import { loadState, saveState } from './utils/localStorage';

const APP_STATE_KEY = 'app-state';
const STORY_STATE_KEY = 'story-state';

const App: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>(ShapeType.Rectangle);
  const [mode, setMode] = useState<Mode>(Mode.Area);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 10, height: 8 });
  const [unit, setUnit] = useState<Unit>(Unit.CM);
  
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  // Load state from localStorage after component mounts
  useEffect(() => {
    try {
      const savedSettings = loadState<{ shape: ShapeType; mode: Mode; dimensions: Dimensions; unit: Unit; difficulty: Difficulty }>(APP_STATE_KEY);
      if (savedSettings) {
        setShape(savedSettings.shape);
        setMode(savedSettings.mode);
        setDifficulty(savedSettings.difficulty);
        setDimensions(savedSettings.dimensions);
        setUnit(savedSettings.unit);
      }
      
      const savedStory = loadState<Story>(STORY_STATE_KEY);
      if (savedStory) {
        setCurrentStory(savedStory);
      }
    } catch (err) {
      console.error('Error loading initial state:', err);
    }
  }, []);

  useEffect(() => {
    try {
      saveState(APP_STATE_KEY, { shape, mode, dimensions, unit, difficulty });
    } catch (err) {
      console.error('Error saving state:', err);
    }
  }, [shape, mode, dimensions, unit, difficulty]);

  useEffect(() => {
    if (currentStory) {
      try {
        saveState(STORY_STATE_KEY, currentStory);
      } catch (err) {
        console.error('Error saving story:', err);
      }
    }
  }, [currentStory]);

  const handleGenerateStory = async () => {
    setIsGeneratingStory(true);
    setStoryError(null);
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shape, dimensions, unit, difficulty }),
      });
      
      if (!response.ok) throw new Error('Error generating story');
      
      const story: Story = await response.json();
      setCurrentStory(story);
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : 'Error desconegut');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b-4 border-purple-400">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-shapes text-4xl text-purple-600"></i>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Aprèn Geometria!
              </h1>
              <p className="text-slate-600 text-sm">Descobreix àrees i perímetres jugant</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-purple-200 animate-fade-in">
              <Controls
                shape={shape}
                setShape={setShape}
                mode={mode}
                setMode={setMode}
                dimensions={dimensions}
                setDimensions={setDimensions}
                unit={unit}
                setUnit={setUnit}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
              />
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-pink-200 animate-fade-in">
              {currentStory && <StoryPlayer story={currentStory} />}
              <button
                onClick={handleGenerateStory}
                disabled={isGeneratingStory}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
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
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-blue-200 animate-fade-in">
              <div className="space-y-4">
                <ShapeCanvas shape={shape} mode={mode} dimensions={dimensions} unit={unit} />
                <Explanation shape={shape} mode={mode} dimensions={dimensions} unit={unit} />
              </div>
            </div>
          </div>
          <div className="lg:mt-0">
            <Quiz currentStory={currentStory} difficulty={difficulty} />
          </div>
        </div>
      </div>
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
