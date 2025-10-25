export enum Unit {
  MM = 'mm',
  CM = 'cm',
  M = 'm',
}

export enum ShapeType {
  Square = 'Quadrat',
  Rectangle = 'Rectangle',
  Triangle = 'Triangle',
}

export enum Mode {
  Perimeter = 'Perímetre',
  Area = 'Àrea',
}

export enum Difficulty {
  Easy = 'Fàcil',
  Medium = 'Mitjà',
  Hard = 'Difícil',
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface QuizQuestion {
  shape: ShapeType;
  dims: Dimensions;
  mode: Mode;
  unit: Unit;
  correctAnswer: number;
  options: number[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface StoryStep {
  type: 'introduction' | 'exercise' | 'conclusion';
  title: string;
  text: string;
  dims?: Dimensions;
  unit?: Unit;
  correctAnswer?: number;
  options?: number[];
}

export interface Story {
  title: string;
  shape: ShapeType;
  mode: Mode;
  steps: StoryStep[];
  currentStepIndex: number;
}
