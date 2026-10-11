import { useState, useMemo } from "react";
import type { CrosswordData, CrosswordClue } from "./types";
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
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>({ r: 0, c: 0 });
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [showSolution, setShowSolution] = useState(false);
  const [checkWordActive, setCheckWordActive] = useState(false);

  // Map cell numbers matching clues
  const cellNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    data.clues.across.forEach((item) => {
      map[`${item.row}-${item.col}`] = item.number;
    });
    data.clues.down.forEach((item) => {
      map[`${item.row}-${item.col}`] = item.number;
    });
    return map;
  }, [data]);

  // Compute active word cells and active clue based on selection & direction
  const { activeClue, activeWordCells } = useMemo(() => {
    if (!selectedCell || data.grid[selectedCell.r]?.[selectedCell.c] === "#") {
      return { activeClue: null, activeWordCells: new Set<string>() };
    }

    const { r, c } = selectedCell;
    const cells = new Set<string>();

    if (direction === "across") {
      let startC = c;
      while (startC > 0 && data.grid[r][startC - 1] !== "#") startC--;
      let endC = c;
      while (endC < data.size - 1 && data.grid[r][endC + 1] !== "#") endC++;

      for (let ci = startC; ci <= endC; ci++) cells.add(`${r}-${ci}`);
      const clue = data.clues.across.find((x) => x.row === r && x.col === startC) || null;
      return { activeClue: clue, activeWordCells: cells };
    } else {
      let startR = r;
      while (startR > 0 && data.grid[startR - 1][c] !== "#") startR--;
      let endR = r;
      while (endR < data.size - 1 && data.grid[endR + 1][c] !== "#") endR++;

      for (let ri = startR; ri <= endR; ri++) cells.add(`${ri}-${c}`);
      const clue = data.clues.down.find((x) => x.row === startR && x.col === c) || null;
      return { activeClue: clue, activeWordCells: cells };
    }
  }, [selectedCell, direction, data]);

  // Check solved state
  const isSolved = useMemo(() => {
    for (let r = 0; r < data.size; r++) {
      for (let c = 0; c < data.size; c++) {
        if (data.grid[r]?.[c] && data.grid[r][c] !== "#") {
          const expected = data.grid[r][c].toUpperCase();
          const current = (userGrid[r]?.[c] || "").toUpperCase();
          if (current !== expected) return false;
        }
      }
    }
    return true;
  }, [data, userGrid]);

  const handleCellClick = (r: number, c: number) => {
    if (data.grid[r]?.[c] === "#") return;
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const currentVal = userGrid[r]?.[c] || "";
      if (currentVal) {
        setUserGrid((prev) =>
          prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? "" : val)))
        );
      } else {
        // Move back and delete previous
        stepCursor(r, c, -1);
      }
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveNextCell(r, c + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveNextCell(r, c - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveNextCell(r + 1, c);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveNextCell(r - 1, c);
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const char = e.key.toUpperCase();
      setUserGrid((prev) =>
        prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? char : val)))
      );
      stepCursor(r, c, 1);
    }
  };

  const stepCursor = (r: number, c: number, delta: number) => {
    if (direction === "across") {
      const nextC = c + delta;
      if (nextC >= 0 && nextC < data.size && data.grid[r][nextC] !== "#") {
        setSelectedCell({ r, c: nextC });
      }
    } else {
      const nextR = r + delta;
      if (nextR >= 0 && nextR < data.size && data.grid[nextR][c] !== "#") {
        setSelectedCell({ r: nextR, c });
      }
    }
  };

  const moveNextCell = (targetR: number, targetC: number) => {
    if (
      targetR >= 0 &&
      targetR < data.size &&
      targetC >= 0 &&
      targetC < data.size &&
      data.grid[targetR][targetC] !== "#"
    ) {
      setSelectedCell({ r: targetR, c: targetC });
    }
  };

  const selectClue = (clue: CrosswordClue, dir: "across" | "down") => {
    setSelectedCell({ r: clue.row, c: clue.col });
    setDirection(dir);
  };

  const clearGrid = () => {
    setUserGrid(
      Array(data.size)
        .fill("")
        .map(() => Array(data.size).fill(""))
    );
    setCheckWordActive(false);
  };

  const checkCurrentWord = () => {
    setCheckWordActive(true);
    setTimeout(() => setCheckWordActive(false), 3000);
  };

  return (
    <div className="flex h-full flex-col justify-between border border-black/15 bg-[#f8f5ed] p-6 sm:p-8">
      {/* Editorial Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Campus Puzzle Desk · Daily Mini
            </span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[8px] font-bold tracking-wider text-black/50">
              {data.size}×{data.size}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isEditor && onEdit && (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ef5a35] px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-[#d44826]"
                onClick={onEdit}
                title="Launch the visual Crossword Studio modal to customize words, clues & grid structure"
                type="button"
              >
                <span>✏️ Open Crossword Studio</span>
              </button>
            )}
            <button
              className="rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] hover:bg-black/5"
              onClick={checkCurrentWord}
              type="button"
            >
              Check Word
            </button>
            <button
              className="rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em] hover:bg-black/5"
              onClick={() => setShowSolution(!showSolution)}
              type="button"
            >
              {showSolution ? "Hide Solution" : "Reveal Solution"}
            </button>
            <button
              className="rounded-full border border-black/15 bg-white/70 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] hover:bg-black/5"
              onClick={clearGrid}
              title="Clear all entries"
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between border-b border-black/10 pb-3">
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              {data.title || "The Campus Mini"}
            </h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-black/50">
              Edited by {data.author || "The Editorial Desk"} · {data.clues.across.length + data.clues.down.length} Clues
            </p>
          </div>
        </div>

        {isSolved && (
          <div className="my-3 flex items-center justify-between rounded-xl bg-[#dce9e1] p-3 text-xs font-bold text-[#315b4b] shadow-sm">
            <span>🎉 Puzzle Solved! Superb work, editor!</span>
            <span className="text-[10px] font-normal uppercase tracking-wider">100% Accurate</span>
          </div>
        )}
      </div>

      {/* Active Clue Bar (NYT style live focus banner) */}
      <div className="my-4 flex items-center justify-between rounded-lg border border-black/10 bg-[#f1ecdf] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="shrink-0 rounded bg-[#ef5a35] px-2 py-0.5 font-mono text-[9px] font-bold text-white">
            {activeClue ? `${activeClue.number}-${direction.toUpperCase()}` : "SELECT CELL"}
          </span>
          <span className="truncate font-serif text-sm font-semibold text-black">
            {activeClue?.clue || "Click any square to view clue and start typing"}
          </span>
        </div>
        <button
          className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-black/50 hover:text-[#ef5a35]"
          onClick={() => setDirection((d) => (d === "across" ? "down" : "across"))}
          type="button"
        >
          {direction === "across" ? "Across →" : "Down ↓"}
        </button>
      </div>

      {/* Main puzzle layout */}
      <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr]">
        {/* The Crossword Grid */}
        <div className="mx-auto flex flex-col items-center">
          <div
            className="grid border-2 border-black bg-black shadow-md"
            style={{
              gridTemplateColumns: `repeat(${data.size}, minmax(0, 42px))`,
              gap: "1px",
            }}
          >
            {data.grid.map((row, r) =>
              row.map((cell, c) => {
                const isBlack = cell === "#";
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isInActiveWord = activeWordCells.has(`${r}-${c}`);
                const clueNum = cellNumbers[`${r}-${c}`];
                const displayedLetter = showSolution ? cell : userGrid[r]?.[c] || "";

                if (isBlack) {
                  return (
                    <div
                      className="h-10 w-10 bg-[#171714] sm:h-11 sm:w-11"
                      key={`${r}-${c}`}
                    />
                  );
                }

                // Check word highlight
                const isIncorrect =
                  checkWordActive &&
                  displayedLetter &&
                  displayedLetter.toUpperCase() !== cell.toUpperCase();

                return (
                  <div
                    className={`relative flex h-10 w-10 cursor-pointer items-center justify-center font-serif text-lg font-bold select-none transition sm:h-11 sm:w-11 ${
                      isSelected
                        ? "bg-[#fed7aa] ring-2 ring-inset ring-[#ef5a35] dark:bg-[#b45309]/50"
                        : isInActiveWord
                          ? "bg-[#ffedd5] dark:bg-[#78350f]/30"
                          : "bg-[#fbf9f4] hover:bg-black/5"
                    } ${isIncorrect ? "text-[#ef5a35] underline decoration-wavy" : "text-black"}`}
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    tabIndex={0}
                  >
                    {clueNum && (
                      <span className="absolute left-1 top-0.5 font-sans text-[8.5px] font-bold leading-none text-black/60">
                        {clueNum}
                      </span>
                    )}
                    <span className="mt-1">{displayedLetter}</span>
                  </div>
                );
              })
            )}
          </div>

          <p className="mt-2 text-[9px] text-black/45">
            Space: flip direction · Arrows: navigate · Type letters
          </p>
        </div>

        {/* Clues (Across & Down) */}
        <div className="grid grid-cols-2 gap-5 text-left">
          {/* Across */}
          <div>
            <div className="flex items-center justify-between border-b border-black/20 pb-1">
              <h4 className="font-serif text-xs font-bold uppercase tracking-[0.1em]">
                Across
              </h4>
              <span className="font-mono text-[9px] text-black/40">
                {data.clues.across.length}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[11px] leading-tight">
              {data.clues.across.map((item) => {
                const isActive = activeClue?.number === item.number && direction === "across";
                return (
                  <div
                    className={`cursor-pointer rounded p-1 transition ${
                      isActive
                        ? "bg-[#ef5a35]/15 font-semibold text-[#ef5a35] ring-1 ring-[#ef5a35]/30"
                        : "text-black/80 hover:bg-black/5 hover:text-black"
                    }`}
                    key={item.number}
                    onClick={() => selectClue(item, "across")}
                  >
                    <span className="mr-1 font-mono font-bold text-black">{item.number}.</span>
                    {item.clue || item.answer}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Down */}
          <div>
            <div className="flex items-center justify-between border-b border-black/20 pb-1">
              <h4 className="font-serif text-xs font-bold uppercase tracking-[0.1em]">
                Down
              </h4>
              <span className="font-mono text-[9px] text-black/40">
                {data.clues.down.length}
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[11px] leading-tight">
              {data.clues.down.map((item) => {
                const isActive = activeClue?.number === item.number && direction === "down";
                return (
                  <div
                    className={`cursor-pointer rounded p-1 transition ${
                      isActive
                        ? "bg-[#ef5a35]/15 font-semibold text-[#ef5a35] ring-1 ring-[#ef5a35]/30"
                        : "text-black/80 hover:bg-black/5 hover:text-black"
                    }`}
                    key={item.number}
                    onClick={() => selectClue(item, "down")}
                  >
                    <span className="mr-1 font-mono font-bold text-black">{item.number}.</span>
                    {item.clue || item.answer}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
