import React from 'react';
import { ShapeType, Dimensions, Unit } from '../types';

interface QuizShapeDisplayProps {
  shape: ShapeType;
  dims: Dimensions;
  unit?: Unit;
}

const SVG_VIEWBOX_SIZE = 100;
const PADDING = 15;
const MAX_SIZE = SVG_VIEWBOX_SIZE - 2 * PADDING;

const QuizShapeDisplay: React.FC<QuizShapeDisplayProps> = ({ shape, dims, unit }) => {
  const maxDim = Math.max(dims.width, dims.height);
  const scale = MAX_SIZE / maxDim;

  const w = dims.width * scale;
  const h = (shape === ShapeType.Square) ? w : (dims.height * scale);
  
  const x = (SVG_VIEWBOX_SIZE - w) / 2;
  const y = (SVG_VIEWBOX_SIZE - h) / 2;

  const renderShape = () => {
    const commonProps = {
      fill: 'rgba(139, 92, 246, 0.1)',
      stroke: 'rgb(109, 40, 217)',
      strokeWidth: 2,
      strokeLinejoin: 'round' as const,
    };

    switch (shape) {
      case ShapeType.Square:
        return <rect x={x} y={y} width={w} height={w} {...commonProps} />;
      case ShapeType.Rectangle:
        return <rect x={x} y={y} width={w} height={h} {...commonProps} />;
      case ShapeType.Triangle:
        // Isosceles triangle for simplicity
        const points = `${x},${y + h} ${x + w},${y + h} ${x + w / 2},${y}`;
        return <polygon points={points} {...commonProps} />;
      default:
        return null;
    }
  };
  
  const Label: React.FC<{children: React.ReactNode, x: number, y: number, rotation?: number}> = ({ children, x, y, rotation=0 }) => (
     <text x={x} y={y} transform={`rotate(${rotation} ${x} ${y})`} fill="rgb(109, 40, 217)" fontSize="8" textAnchor="middle" dominantBaseline="middle">{children}</text>
  );

  const renderLabels = () => {
    if(!unit) return null;
    switch(shape) {
        case ShapeType.Square:
            return <Label x={x+w/2} y={y-5}>{dims.width} {unit}</Label>;
        case ShapeType.Rectangle:
             return (
                <>
                    <Label x={x+w/2} y={y-5}>{dims.width} {unit}</Label>
                    <Label x={x+w+5} y={y+h/2} rotation={90}>{dims.height} {unit}</Label>
                </>
             );
        case ShapeType.Triangle:
            return (
                <>
                    <Label x={x+w/2} y={y+h+5}>{dims.width} {unit}</Label>
                    <Label x={x+w/2-3} y={y+h/2} rotation={-90}>{dims.height} {unit}</Label>
                </>
            );
        default: return null;
    }
  }

  return (
    <div className="relative w-full aspect-square flex items-center justify-center bg-slate-100 rounded-lg p-2">
      <svg viewBox={`0 0 ${SVG_VIEWBOX_SIZE} ${SVG_VIEWBOX_SIZE}`} className="w-full h-full" overflow="visible">
        {renderShape()}
        {shape === ShapeType.Triangle && (
           <line 
            x1={x + w / 2} 
            y1={y} 
            x2={x + w / 2} 
            y2={y + h} 
            stroke="rgba(109, 40, 217, 0.5)" 
            strokeWidth="1" 
            strokeDasharray="2,2"
          />
        )}
        {renderLabels()}
      </svg>
    </div>
  );
};

export default QuizShapeDisplay;