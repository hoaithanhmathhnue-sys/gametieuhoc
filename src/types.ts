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
export type AppData = {
  subjects: Subject[];
  questions: Question[];
  classrooms: Classroom[];
  selectedQuestionIds: string[];
  settings: { lastUpdated: number; version: string; geminiApiKey?: string };
};
export type Team = { id: string; name: string; score: number; color: string; position?: number };

