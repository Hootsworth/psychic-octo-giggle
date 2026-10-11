import type { CrosswordData, SudokuData, WordSearchData } from "./types";

export const DEFAULT_CAMPUS_MINI_CROSSWORD: CrosswordData = {
  title: "The Campus Mini",
  author: "Editorial Puzzle Desk",
  size: 5,
  grid: [
    ["H", "E", "A", "R", "T"],
    ["E", "N", "T", "E", "R"],
    ["A", "T", "O", "N", "E"],
    ["R", "E", "N", "E", "W"],
    ["T", "E", "N", "E", "T"],
  ],
  clues: {
    across: [
      { number: 1, clue: "Passionate spirit at the core of university life", row: 0, col: 0, answer: "HEART" },
      { number: 2, clue: "Step into the 9 AM lecture hall", row: 1, col: 0, answer: "ENTER" },
      { number: 3, clue: "Make amends for turning in an essay late", row: 2, col: 0, answer: "ATONE" },
      { number: 4, clue: "Extend a library book loan for finals week", row: 3, col: 0, answer: "RENEW" },
      { number: 5, clue: "Foundational principle taught in Ethics 101", row: 4, col: 0, answer: "TENET" },
    ],
    down: [
      { number: 1, clue: "Passionate spirit at the core of university life", row: 0, col: 0, answer: "HEART" },
      { number: 2, clue: "Step into the 9 AM lecture hall", row: 0, col: 1, answer: "ENTER" },
      { number: 3, clue: "Make amends for turning in an essay late", row: 0, col: 2, answer: "ATONE" },
      { number: 4, clue: "Extend a library book loan for finals week", row: 0, col: 3, answer: "RENEW" },
      { number: 5, clue: "Foundational principle taught in Ethics 101", row: 0, col: 4, answer: "TENET" },
    ],
  },
};

export const CLASSIC_7X7_CROSSWORD: CrosswordData = {
  title: "The Quad Classic",
  author: "The Editorial Guild",
  size: 7,
  grid: [
    ["C", "A", "M", "P", "U", "S", "#"],
    ["O", "#", "I", "#", "N", "#", "A"],
    ["F", "I", "N", "A", "L", "S", "R"],
    ["F", "#", "D", "#", "O", "#", "T"],
    ["E", "S", "S", "A", "Y", "S", "I"],
    ["E", "#", "E", "#", "E", "#", "S"],
    ["#", "S", "T", "U", "D", "Y", "T"],
  ],
  clues: {
    across: [
      { number: 1, clue: "University grounds and historic brick halls", row: 0, col: 0, answer: "CAMPUS" },
      { number: 4, clue: "December and May academic gauntlets", row: 2, col: 0, answer: "FINALS" },
      { number: 6, clue: "Midterm paper submissions", row: 4, col: 0, answer: "ESSAYS" },
      { number: 7, clue: "Late night in the library stacks", row: 6, col: 1, answer: "STUDY" },
    ],
    down: [
      { number: 1, clue: "Fuel from the Student Union cafe before 9 AM", row: 0, col: 0, answer: "COFFEE" },
      { number: 2, clue: "Scholarly intellect cultivated in seminar halls", row: 0, col: 2, answer: "MINDSET" },
      { number: 3, clue: "Campus art gallery exhibitionist", row: 1, col: 6, answer: "ARTIST" },
      { number: 5, clue: "Student council resolution vote", row: 2, col: 3, answer: "AYE" },
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
