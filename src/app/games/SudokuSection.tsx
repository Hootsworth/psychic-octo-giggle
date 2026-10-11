import { useState } from "react";
import type { SudokuData } from "./types";
import { DEFAULT_SUDOKU } from "./presets";

interface SudokuSectionProps {
  data?: SudokuData;
  isEditor?: boolean;
}

export default function SudokuSection({
  data = DEFAULT_SUDOKU,
}: SudokuSectionProps) {
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    data.initial.map((row) => [...row])
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  const isInitial = (r: number, c: number) => data.initial[r]?.[c] !== null;

  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c });
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (isInitial(r, c)) return;

    if (e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      setNumber(r, c, parseInt(e.key, 10));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      e.preventDefault();
      setNumber(r, c, null);
    } else if (e.key === "ArrowRight") {
      setSelectedCell({ r, c: Math.min(8, c + 1) });
    } else if (e.key === "ArrowLeft") {
      setSelectedCell({ r, c: Math.max(0, c - 1) });
    } else if (e.key === "ArrowDown") {
      setSelectedCell({ r: Math.min(8, r + 1), c });
    } else if (e.key === "ArrowUp") {
      setSelectedCell({ r: Math.max(0, r - 1), c });
    }
  };

  const setNumber = (r: number, c: number, num: number | null) => {
    const next = grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? num : val))
    );
    setGrid(next);

    // Check solution
    if (data.solution) {
      let correct = true;
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          const val = i === r && j === c ? num : next[i][j];
          if (val !== data.solution[i][j]) correct = false;
        }
      }
      if (correct) setIsSolved(true);
    }
  };

  const resetGrid = () => {
    setGrid(data.initial.map((row) => [...row]));
    setIsSolved(false);
  };

  return (
    <div className="flex h-full flex-col justify-between border border-black/15 bg-[#f8f5ed] p-6 sm:p-8">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            Campus Games · Sudoku
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-black/60">
              {data.difficulty || "Medium"}
            </span>
            <button
              className="rounded-full border border-black/15 px-2.5 py-1 text-[8px] font-bold uppercase hover:bg-black/5"
              onClick={() => setShowSolution(!showSolution)}
              type="button"
            >
              {showSolution ? "Hide Solution" : "Reveal Solution"}
            </button>
            <button
              className="rounded-full border border-black/15 px-2.5 py-1 text-[8px] font-bold uppercase hover:bg-black/5"
              onClick={resetGrid}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        <h3 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
          {data.title || "Campus Daily Sudoku"}
        </h3>
        <p className="mt-1 text-xs text-black/55">
          Fill each row, column, and 3×3 square with numbers 1 to 9.
        </p>

        {isSolved && (
          <div className="my-2 rounded-lg bg-[#dce9e1] p-2 text-center text-xs font-bold text-[#315b4b]">
            🎉 Sudoku Solved! Brilliant work!
          </div>
        )}
      </div>

      {/* 9x9 Sudoku Grid */}
      <div className="my-4 flex flex-col items-center justify-center">
        <div className="inline-grid border-2 border-black bg-black p-0.5 shadow-md">
          {Array(9)
            .fill(0)
            .map((_, r) => (
              <div className="flex" key={r}>
                {Array(9)
                  .fill(0)
                  .map((_, c) => {
                    const initial = isInitial(r, c);
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const val = showSolution && data.solution ? data.solution[r][c] : grid[r][c];

                    const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "border-b-2 border-b-black" : "border-b border-b-black/30";
                    const borderRight = (c + 1) % 3 === 0 && c !== 8 ? "border-r-2 border-r-black" : "border-r border-r-black/30";

                    return (
                      <div
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center font-serif text-base select-none sm:h-9 sm:w-9 ${borderBottom} ${borderRight} ${
                          initial
                            ? "bg-[#ede8dc] font-bold text-black"
                            : isSelected
                              ? "bg-[#ef5a35]/25 font-semibold text-[#ef5a35] ring-2 ring-inset ring-[#ef5a35]"
                              : "bg-[#fbf9f4] font-medium text-black/80 hover:bg-black/5"
                        }`}
                        key={c}
                        onClick={() => handleCellClick(r, c)}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        tabIndex={0}
                      >
                        {val || ""}
                      </div>
                    );
                  })}
              </div>
            ))}
        </div>

        {/* Numeric quick-tap buttons */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              className="grid h-8 w-8 place-items-center rounded border border-black/20 bg-white font-serif text-sm font-bold shadow-sm hover:border-[#ef5a35] hover:bg-[#ef5a35] hover:text-white"
              key={n}
              onClick={() => {
                if (selectedCell && !isInitial(selectedCell.r, selectedCell.c)) {
                  setNumber(selectedCell.r, selectedCell.c, n);
                }
              }}
              type="button"
            >
              {n}
            </button>
          ))}
          <button
            className="rounded border border-black/20 bg-white px-2.5 py-1 text-[9px] font-bold uppercase hover:bg-black/10"
            onClick={() => {
              if (selectedCell && !isInitial(selectedCell.r, selectedCell.c)) {
                setNumber(selectedCell.r, selectedCell.c, null);
              }
            }}
            type="button"
          >
            Erase
          </button>
        </div>
      </div>
    </div>
  );
}
