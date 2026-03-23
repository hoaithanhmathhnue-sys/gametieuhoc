export type Topic = { id: string; name: string };
export type Subject = { id: string; name: string; color: string; topics: Topic[] };
export type Difficulty = 'easy' | 'medium' | 'hard' | 'super_hard';
export type Question = {
  id: string;
  subjectId: string;
  topicId: string;
  text: string;
  options: string[];
  answer: number;
  difficulty: Difficulty;
  image: string | null;
  createdAt: number;
};
export type Student = {
  id: string;
  name: string;
  dob: string;
  className: string;
};
export type Classroom = {
  id: string;
  name: string;
  students: Student[];
};
export type CrosswordEntry = {
  answer: string; // max 9 ký tự
  hint?: string;
  secretIndex?: number; // vị trí chữ cái bí mật (0-based)
};
export type CrosswordConfig = {
  entries: CrosswordEntry[];
  secretWord: string;
  questionCount: number;
};
export type GameTimeConfig = {
  timePerQuestion: number; // giây
};
export type GameSettings = {
  millionaire: GameTimeConfig;
  flipCard: GameTimeConfig;
  obstacle: GameTimeConfig;
  goldenBell: GameTimeConfig;
  crossword: GameTimeConfig & { config?: CrosswordConfig };
  flower: GameTimeConfig;
};
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  millionaire: { timePerQuestion: 30 },
  flipCard: { timePerQuestion: 0 },
  obstacle: { timePerQuestion: 0 },
  goldenBell: { timePerQuestion: 0 },
  crossword: { timePerQuestion: 15 },
  flower: { timePerQuestion: 0 },
};
export type AppData = {
  subjects: Subject[];
  questions: Question[];
  classrooms: Classroom[];
  selectedQuestionIds: string[];
  gameSettings: GameSettings;
  settings: { lastUpdated: number; version: string; geminiApiKey?: string };
};
export type Team = { id: string; name: string; score: number; color: string; position?: number };

