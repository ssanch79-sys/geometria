import React from 'react';
import { ShapeType, Mode, Dimensions, Unit } from '../types';

interface ShapeCanvasProps {
  shape: ShapeType;
  mode: Mode;
  dimensions: Dimensions;
  unit: Unit;
}

const SVG_VIEWBOX_SIZE = 120;
const PADDING = 10;
const MAX_SIZE = SVG_VIEWBOX_SIZE - 2 * PADDING;

const ShapeCanvas: React.FC<ShapeCanvasProps> = ({ shape, mode, dimensions, unit }) => {
  const scale = MAX_SIZE / 20; // Max dimension is 20
  const w = dimensions.width * scale;
  const h = (shape === ShapeType.Square) ? w : (dimensions.height * scale);
  const x = (SVG_VIEWBOX_SIZE - w) / 2;
  const y = (SVG_VIEWBOX_SIZE - h) / 2;

  const renderShape = () => {
    const commonProps = {
      fill: mode === Mode.Area ? 'url(#grid)' : 'rgba(139, 92, 246, 0.1)',
      stroke: 'rgb(109, 40, 217)',
      strokeWidth: mode === Mode.Perimeter ? 3 : 1.5,
      strokeLinejoin: 'round' as const,
      className: 'transition-all duration-300'
    };

    switch (shape) {
      case ShapeType.Square:
        return <rect x={x} y={y} width={w} height={w} {...commonProps} />;
      case ShapeType.Rectangle:
        return <rect x={x} y={y} width={w} height={h} {...commonProps} />;
      case ShapeType.Triangle:
        const points = `${x},${y + h} ${x + w},${y + h} ${x + w / 2},${y}`;
        return <polygon points={points} {...commonProps} />;
      default:
        return null;
    }
  };
  
  const hypotenuse = Math.sqrt(Math.pow(dimensions.width/2, 2) + Math.pow(dimensions.height, 2));

  const Label: React.FC<{children: React.ReactNode, style: React.CSSProperties}> = ({ children, style }) => (
    <span className="absolute text-violet-700 font-semibold text-sm pointer-events-none" style={style}>
      {children}
    </span>
  );

  const renderLabels = () => {
    // Use percentages for positioning to be responsive
    const top = (val: number) => `${val / SVG_VIEWBOX_SIZE * 100}%`;
    const left = (val: number) => `${val / SVG_VIEWBOX_SIZE * 100}%`;

    switch (shape) {
      case ShapeType.Square:
        return (
          <>
            {/* Top */}
            <Label style={{ top: top(y), left: left(x + w / 2), transform: 'translate(-50%, -120%)' }}>
              {dimensions.width} {unit}
            </Label>
             {/* Right */}
            <Label style={{ top: top(y + h / 2), left: left(x + w), transform: 'translate(20%, -50%) rotate(90deg)' }}>
              {dimensions.width} {unit}
            </Label>
          </>
        );
      case ShapeType.Rectangle:
        return (
          <>
            {/* Top */}
            <Label style={{ top: top(y), left: left(x + w / 2), transform: 'translate(-50%, -120%)' }}>
              {dimensions.width} {unit}
            </Label>
            {/* Right */}
            <Label style={{ top: top(y + h / 2), left: left(x + w), transform: 'translate(20%, -50%) rotate(90deg)' }}>
              {dimensions.height} {unit}
            </Label>
          </>
        );
      case ShapeType.Triangle:
        const angleDeg = Math.atan2(h, w / 2) * (180 / Math.PI);
        return (
            <>
              {/* Base */}
              <Label style={{ top: top(y + h), left: left(x + w / 2), transform: 'translate(-50%, 50%)' }}>
                {dimensions.width} {unit}
              </Label>
              {/* Left Side */}
              <Label style={{ top: top(y + h / 2), left: left(x + w / 4), transform: `translate(-50%, -50%) rotate(-${angleDeg}deg) translateY(-15px)` }}>
                 {hypotenuse.toFixed(1)} {unit}
              </Label>
              {/* Right Side */}
              <Label style={{ top: top(y + h / 2), left: left(x + (w * 3) / 4), transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(-15px)` }}>
                 {hypotenuse.toFixed(1)} {unit}
              </Label>
            </>
        );
        default: return null;
    }
  };

  return (
    <div className="relative w-full aspect-square flex items-center justify-center bg-white rounded-2xl shadow-inner border border-slate-200 p-4">
      <svg viewBox={`0 0 ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`} className="w-full h-full" overflow="visible">
        <defs>
          <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="rgba(167, 139, 250, 0.5)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        {renderShape()}
      </svg>
      {/* Dimension Labels */}
      <div className="absolute inset-0">
        {renderLabels()}
      </div>
    </div>
  );
};

export default ShapeCanvas;