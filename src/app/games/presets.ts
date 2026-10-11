import type { CrosswordData, SudokuData, WordSearchData } from "./types";

export const DEFAULT_CAMPUS_MINI_CROSSWORD: CrosswordData = {
  title: "The Campus Mini",
  author: "Editorial Puzzle Desk",
  size: 5,
  grid: [
    ["T", "E", "A", "M", "S"],
    ["E", "A", "R", "T", "H"],
    ["R", "E", "A", "D", "Y"],
    ["M", "A", "T", "E", "S"],
    ["S", "T", "E", "M", "S"],
  ],
  clues: {
    across: [
      { number: 1, clue: "Varsity club groups", row: 0, col: 0, answer: "TEAMS" },
      { number: 6, clue: "Where university grounds lie", row: 1, col: 0, answer: "EARTH" },
      { number: 7, clue: "Prepared for tomorrow's 9 AM lecture", row: 2, col: 0, answer: "READY" },
      { number: 8, clue: "Dorm floor companions", row: 3, col: 0, answer: "MATES" },
      { number: 9, clue: "Science, Tech, Eng, Math faculties", row: 4, col: 0, answer: "STEMS" },
    ],
    down: [
      { number: 1, clue: "Academic semester or period", row: 0, col: 0, answer: "TERMS" },
      { number: 2, clue: "Poem read at graduation", row: 0, col: 1, answer: "EARTE" },
      { number: 3, clue: "Open lawn between campus halls", row: 0, col: 2, answer: "ARATE" },
      { number: 4, clue: "Campus dining hall order", row: 0, col: 3, answer: "MTDEM" },
      { number: 5, clue: "Quiet study cubicles (archaic)", row: 0, col: 4, answer: "SHYSS" },
    ],
  },
};

export const CLASSIC_7X7_CROSSWORD: CrosswordData = {
  title: "The Quad Crossword",
  author: "The Editorial Guild",
  size: 7,
  grid: [
    ["C", "A", "M", "P", "U", "S", "#"],
    ["O", "#", "I", "#", "N", "#", "A"],
    ["F", "I", "N", "A", "L", "S", "R"],
    ["F", "#", "D", "#", "I", "#", "T"],
    ["E", "S", "S", "A", "Y", "S", "I"],
    ["E", "#", "E", "#", "E", "#", "S"],
    ["#", "Q", "T", "U", "D", "Y", "T"],
  ],
  clues: {
    across: [
      { number: 1, clue: "The university grounds and buildings", row: 0, col: 0, answer: "CAMPUS" },
      { number: 4, clue: "December and May dread", row: 2, col: 0, answer: "FINALS" },
      { number: 6, clue: "Midterm paper submissions", row: 4, col: 0, answer: "ESSAYS" },
      { number: 7, clue: "Late night in the library basement", row: 6, col: 1, answer: "STUDY" },
    ],
    down: [
      { number: 1, clue: "Student Union fuel before 9 AM", row: 0, col: 0, answer: "COFFEE" },
      { number: 2, clue: "Intellect cultivated in lecture halls", row: 0, col: 2, answer: "MINDSET" },
      { number: 3, clue: "Free from restrictions (academic freedom)", row: 0, col: 4, answer: "UNLOCKED" },
      { number: 5, clue: "Creative student exhibition", row: 1, col: 6, answer: "ARTIST" },
    ],
  },
};

export const DEFAULT_SUDOKU: SudokuData = {
  title: "Campus Daily Sudoku",
  difficulty: "Medium",
  initial: [
    [5, 3, null, null, 7, null, null, null, null],
    [6, null, null, 1, 9, 5, null, null, null],
    [null, 9, 8, null, null, null, null, 6, null],
    [8, null, null, null, 6, null, null, null, 3],
    [4, null, null, 8, null, 3, null, null, 1],
    [7, null, null, null, 2, null, null, null, 6],
    [null, 6, null, null, null, null, 2, 8, null],
    [null, null, null, 4, 1, 9, null, null, 5],
    [null, null, null, null, 8, null, null, 7, 9],
  ],
  solution: [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ],
};

export const DEFAULT_WORD_SEARCH: WordSearchData = {
  title: "University Word Search",
  words: ["CAMPUS", "LIBRARY", "COFFEE", "ESSAY", "POETRY", "LECTURE", "THESIS", "QUAD"],
  grid: [
    ["C", "A", "M", "P", "U", "S", "O", "P", "Q", "R"],
    ["L", "I", "B", "R", "A", "R", "Y", "T", "U", "V"],
    ["E", "F", "G", "C", "O", "F", "F", "E", "E", "W"],
    ["C", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
    ["T", "H", "E", "S", "I", "S", "A", "B", "C", "D"],
    ["U", "R", "E", "S", "S", "A", "Y", "Q", "R", "S"],
    ["R", "E", "P", "O", "E", "T", "R", "Y", "X", "Y"],
    ["E", "Z", "A", "B", "C", "D", "E", "F", "G", "H"],
    ["Q", "U", "A", "D", "I", "J", "K", "L", "M", "N"],
    ["S", "T", "U", "D", "E", "N", "T", "V", "W", "X"],
  ],
};
