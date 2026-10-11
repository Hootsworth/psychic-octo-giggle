export interface CrosswordClue {
  number: number;
  clue: string;
  row: number;
  col: number;
  answer?: string;
}

export interface CrosswordData {
  title?: string;
  author?: string;
  size: number; // 5, 7, etc.
  grid: string[][]; // Upper-case letters, '#' for black cell, '' for empty
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
}

export interface SudokuData {
  title?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  initial: (number | null)[][];
  solution?: number[][];
}

export interface WordSearchData {
  title?: string;
  words: string[];
  grid: string[][];
}
