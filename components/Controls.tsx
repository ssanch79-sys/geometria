import React from 'react';
import { ShapeType, Mode, Dimensions, Unit, Difficulty } from '../types';

interface ControlsProps {
  shape: ShapeType;
  setShape: (shape: ShapeType) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  difficulty: Difficulty;
  setDifficulty: (difficulty: Difficulty) => void;
  dimensions: Dimensions;
  setDimensions: (dims: Dimensions) => void;
  unit: Unit;
  setUnit: (unit: Unit) => void;
}

const ControlButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  icon?: string;
}> = ({ onClick, isActive, children, icon }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 ${
      isActive ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100'
    }`}
  >
    {icon && <i className={`fa-solid ${icon}`}></i>}
    {children}
  </button>
);

const ModeToggle: React.FC<{
    mode: Mode;
    setMode: (mode: Mode) => void;
}> = ({ mode, setMode }) => (
    <div className="relative flex w-full p-1 bg-slate-200 rounded-xl">
        <span
            className="absolute top-1 bottom-1 bg-white rounded-lg shadow-md transition-all duration-300 ease-in-out"
            style={{
                width: 'calc(50% - 4px)',
                left: mode === Mode.Perimeter ? '4px' : 'calc(50% + 4px)',
            }}
        ></span>
        <button onClick={() => setMode(Mode.Perimeter)} className="relative z-10 w-1/2 py-2 text-center text-sm font-bold text-slate-700 transition-colors duration-300">
            Perímetre
        </button>
        <button onClick={() => setMode(Mode.Area)} className="relative z-10 w-1/2 py-2 text-center text-sm font-bold text-slate-700 transition-colors duration-300">
            Àrea
        </button>
    </div>
);


const Controls: React.FC<ControlsProps> = ({ shape, setShape, mode, setMode, difficulty, setDifficulty, dimensions, setDimensions, unit, setUnit }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);
    if (shape === ShapeType.Square) {
      setDimensions({ width: numValue, height: numValue });
    } else {
      setDimensions({ ...dimensions, [name]: numValue });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">1. Tria una forma</h3>
        <div className="flex gap-2">
          <ControlButton onClick={() => setShape(ShapeType.Square)} isActive={shape === ShapeType.Square} icon="fa-square">Quadrat</ControlButton>
          <ControlButton onClick={() => setShape(ShapeType.Rectangle)} isActive={shape === ShapeType.Rectangle} icon="fa-rectangle-list">Rectangle</ControlButton>
          <ControlButton onClick={() => setShape(ShapeType.Triangle)} isActive={shape === ShapeType.Triangle} icon="fa-triangle-exclamation">Triangle</ControlButton>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">2. Tria la dificultat</h3>
        <div className="flex gap-2">
          <ControlButton onClick={() => setDifficulty(Difficulty.Easy)} isActive={difficulty === Difficulty.Easy} icon="fa-child">Fàcil</ControlButton>
          <ControlButton onClick={() => setDifficulty(Difficulty.Medium)} isActive={difficulty === Difficulty.Medium} icon="fa-graduation-cap">Mitjà</ControlButton>
          <ControlButton onClick={() => setDifficulty(Difficulty.Hard)} isActive={difficulty === Difficulty.Hard} icon="fa-brain">Difícil</ControlButton>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">3. Tria un càlcul</h3>
        <ModeToggle mode={mode} setMode={setMode}/>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">4. Tria les unitats</h3>
        <div className="flex gap-2">
          <ControlButton onClick={() => setUnit(Unit.MM)} isActive={unit === Unit.MM}>{Unit.MM}</ControlButton>
          <ControlButton onClick={() => setUnit(Unit.CM)} isActive={unit === Unit.CM}>{Unit.CM}</ControlButton>
          <ControlButton onClick={() => setUnit(Unit.M)} isActive={unit === Unit.M}>{Unit.M}</ControlButton>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">5. Ajusta les mides</h3>
        <div className="space-y-4">
          <div className="text-sm">
            <label htmlFor="width" className="font-semibold text-slate-600 flex justify-between">
              <span>{shape === ShapeType.Square ? 'Costat' : (shape === ShapeType.Triangle ? 'Base' : 'Amplada')}</span>
              <span>{dimensions.width} {unit}</span>
            </label>
            <input
              type="range"
              id="width"
              name="width"
              min="1"
              max="20"
              value={dimensions.width}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>

          {shape !== ShapeType.Square && (
            <div className="text-sm">
              <label htmlFor="height" className="font-semibold text-slate-600 flex justify-between">
                <span>{shape === ShapeType.Triangle ? 'Alçada' : 'Alçada'}</span>
                <span>{dimensions.height} {unit}</span>
              </label>
              <input
                type="range"
                id="height"
                name="height"
                min="1"
                max="20"
                value={dimensions.height}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Controls;
