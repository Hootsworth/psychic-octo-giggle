import { useState } from "react";
import type { CrosswordData } from "./types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD } from "./presets";

interface CrosswordSectionProps {
  data?: CrosswordData;
  onEdit?: () => void;
  isEditor?: boolean;
}

export default function CrosswordSection({
  data = DEFAULT_CAMPUS_MINI_CROSSWORD,
  onEdit,
  isEditor = false,
}: CrosswordSectionProps) {
  const [userGrid, setUserGrid] = useState<string[][]>(() =>
    Array(data.size)
      .fill("")
      .map(() => Array(data.size).fill(""))
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  // Compute cell numbers matching clues
  const cellNumbers: Record<string, number> = {};
  data.clues.across.forEach((item) => {
    cellNumbers[`${item.row}-${item.col}`] = item.number;
  });
  data.clues.down.forEach((item) => {
    cellNumbers[`${item.row}-${item.col}`] = item.number;
  });

  const handleCellClick = (r: number, c: number) => {
    if (data.grid[r]?.[c] === "#") return;
    setSelectedCell({ r, c });
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const next = userGrid.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? "" : val))
      );
      setUserGrid(next);
      // Move backwards
      if (c > 0 && data.grid[r][c - 1] !== "#") setSelectedCell({ r, c: c - 1 });
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const char = e.key.toUpperCase();
      const next = userGrid.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? char : val))
      );
      setUserGrid(next);

      // Check if solved
      let allCorrect = true;
      for (let i = 0; i < data.size; i++) {
        for (let j = 0; j < data.size; j++) {
          if (data.grid[i][j] !== "#") {
            const expected = data.grid[i][j].toUpperCase();
            const current = (i === r && j === c ? char : next[i][j]).toUpperCase();
            if (current !== expected) allCorrect = false;
          }
        }
      }
      if (allCorrect) setIsSolved(true);

      // Move forward
      if (c + 1 < data.size && data.grid[r][c + 1] !== "#") {
        setSelectedCell({ r, c: c + 1 });
      } else if (r + 1 < data.size) {
        setSelectedCell({ r: r + 1, c: 0 });
      }
    }
  };

  const clearGrid = () => {
    setUserGrid(
      Array(data.size)
        .fill("")
        .map(() => Array(data.size).fill(""))
    );
    setIsSolved(false);
  };

  return (
    <div className="flex h-full flex-col justify-between border border-black/15 bg-[#f8f5ed] p-6 sm:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            Campus Games · Crossword
          </span>
          <div className="flex items-center gap-2">
            {isEditor && onEdit && (
              <button
                className="rounded-full bg-[#171714] px-3 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow hover:bg-[#ef5a35]"
                onClick={onEdit}
                type="button"
              >
                Edit Crossword ✎
              </button>
            )}
            <button
              className="rounded-full border border-black/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] hover:bg-black/5"
              onClick={() => setShowSolution(!showSolution)}
              type="button"
            >
              {showSolution ? "Hide Solution" : "Reveal Solution"}
            </button>
            <button
              className="rounded-full border border-black/15 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] hover:bg-black/5"
              onClick={clearGrid}
              title="Clear all entries"
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <h3 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {data.title || "The Campus Mini"}
          </h3>
          {data.author && (
            <span className="text-[9px] uppercase tracking-[0.14em] text-black/50">
              By {data.author}
            </span>
          )}
        </div>

        {isSolved && (
          <div className="my-2 rounded-lg bg-[#dce9e1] p-2 text-center text-xs font-bold text-[#315b4b]">
            🎉 Solved! Excellent work, editor!
          </div>
        )}
      </div>

      {/* Main puzzle layout */}
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[auto_1fr]">
        {/* The Crossword Grid */}
        <div className="mx-auto flex justify-center">
          <div
            className="grid border-2 border-black bg-black"
            style={{
              gridTemplateColumns: `repeat(${data.size}, minmax(0, 38px))`,
              gap: "1px",
            }}
          >
            {data.grid.map((row, r) =>
              row.map((cell, c) => {
                const isBlack = cell === "#";
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const clueNum = cellNumbers[`${r}-${c}`];
                const displayedLetter = showSolution ? cell : userGrid[r]?.[c] || "";

                if (isBlack) {
                  return <div className="h-9 w-9 bg-[#171714] sm:h-10 sm:w-10" key={`${r}-${c}`} />;
                }

                return (
                  <div
                    className={`relative flex h-9 w-9 cursor-pointer items-center justify-center font-serif text-base font-bold select-none sm:h-10 sm:w-10 ${
                      isSelected
                        ? "bg-[#ef5a35]/25 ring-2 ring-inset ring-[#ef5a35]"
                        : "bg-[#fbf9f4] hover:bg-black/5"
                    }`}
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    tabIndex={0}
                  >
                    {clueNum && (
                      <span className="absolute left-0.5 top-0.5 text-[8px] font-sans font-semibold leading-none text-black/60">
                        {clueNum}
                      </span>
                    )}
                    <span className="mt-1">{displayedLetter}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clues (Across & Down) */}
        <div className="grid grid-cols-2 gap-4 text-left">
          {/* Across */}
          <div>
            <h4 className="border-b border-black/20 pb-1 font-serif text-xs font-bold uppercase tracking-[0.1em]">
              Across
            </h4>
            <div className="mt-2 space-y-1.5 text-[11px] leading-tight">
              {data.clues.across.map((item) => (
                <p className="text-black/80" key={item.number}>
                  <strong className="text-black">{item.number}.</strong> {item.clue || item.answer}
                </p>
              ))}
            </div>
          </div>

          {/* Down */}
          <div>
            <h4 className="border-b border-black/20 pb-1 font-serif text-xs font-bold uppercase tracking-[0.1em]">
              Down
            </h4>
            <div className="mt-2 space-y-1.5 text-[11px] leading-tight">
              {data.clues.down.map((item) => (
                <p className="text-black/80" key={item.number}>
                  <strong className="text-black">{item.number}.</strong> {item.clue || item.answer}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
