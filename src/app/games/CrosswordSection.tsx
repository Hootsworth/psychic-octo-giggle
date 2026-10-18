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
    data.clues?.across?.forEach((item) => {
      map[`${item.row}-${item.col}`] = item.number;
    });
    data.clues?.down?.forEach((item) => {
      map[`${item.row}-${item.col}`] = item.number;
    });
    return map;
  }, [data]);

  // Compute active word cells and active clue based on selection & direction
  const { activeClue, activeWordCells } = useMemo(() => {
    if (!selectedCell || !data.grid || data.grid[selectedCell.r]?.[selectedCell.c] === "#") {
      return { activeClue: null, activeWordCells: new Set<string>() };
    }

    const { r, c } = selectedCell;
    const cells = new Set<string>();

    if (direction === "across") {
      let startC = c;
      while (startC > 0 && data.grid[r]?.[startC - 1] !== "#") startC--;
      let endC = c;
      while (endC < (data.size || 5) - 1 && data.grid[r]?.[endC + 1] !== "#") endC++;

      for (let ci = startC; ci <= endC; ci++) cells.add(`${r}-${ci}`);
      const clue = data.clues?.across?.find((x) => x.row === r && x.col === startC) || null;
      return { activeClue: clue, activeWordCells: cells };
    } else {
      let startR = r;
      while (startR > 0 && data.grid[startR - 1]?.[c] !== "#") startR--;
      let endR = r;
      while (endR < (data.size || 5) - 1 && data.grid[endR + 1]?.[c] !== "#") endR++;

      for (let ri = startR; ri <= endR; ri++) cells.add(`${ri}-${c}`);
      const clue = data.clues?.down?.find((x) => x.row === startR && x.col === c) || null;
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
    <div className="relative flex h-full flex-col overflow-hidden border border-[#302b25]/20 bg-[#f7f3e9] p-4 text-[#26231f] shadow-[0_14px_40px_rgba(39,32,20,0.10)] sm:p-7 print:shadow-none">
      <div aria-hidden="true" className="pointer-events-none absolute inset-2 border border-[#302b25]/[0.07]" />
      {/* Editorial Header */}
      <div>
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[#302b25]/25 pb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#645b4f]">
          <span className="flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#a24b35]" />The Campus Gazette <span className="text-[#a24b35]">/</span> Games</span>
          <span className="font-mono tracking-[0.12em]">No. 08 <span className="mx-1 text-black/25">·</span> {data.size} × {data.size}</span>
        </div>

        <div className="relative flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-double border-[#302b25]/70 py-4 sm:py-5">
          <div>
            <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.24em] text-[#a24b35]">The weekly mini · No. 08</p>
            <h3 className="font-serif text-4xl font-black leading-[0.9] tracking-[-0.055em] sm:text-6xl">Crossword</h3>
            <p className="mt-2 font-serif text-xs italic text-[#645b4f]">{data.title || "A little wordplay for your week"}</p>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <span className="hidden text-right text-[8px] uppercase leading-relaxed tracking-[0.14em] text-[#756b5e] sm:block">A campus mini<br />by {data.author || "The Puzzle Desk"}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {isEditor && onEdit && <button className="rounded-sm bg-[#a24b35] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#813b2a]" onClick={onEdit} type="button">Edit puzzle</button>}
            <button
              className="rounded-sm border border-[#302b25]/25 bg-white/60 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition hover:border-[#a24b35] hover:text-[#a24b35]"
              onClick={checkCurrentWord}
              type="button"
            >
              Check Word
            </button>
            <button
              className="rounded-sm border border-[#302b25]/25 bg-white/60 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition hover:border-[#a24b35] hover:text-[#a24b35]"
              onClick={() => setShowSolution(!showSolution)}
              type="button"
            >
              {showSolution ? "Hide Solution" : "Reveal Solution"}
            </button>
            <button
              className="rounded-sm border border-[#302b25]/25 bg-white/60 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.08em] transition hover:border-[#a24b35] hover:text-[#a24b35]"
              onClick={clearGrid}
              title="Clear all entries"
              type="button"
            >
              Clear
            </button>
          </div>
          </div>
        </div>

        <div className="relative mt-2 flex items-center justify-between text-[8px] uppercase tracking-[0.14em] text-[#756b5e]">
          <span>{((data.clues?.across || []).length + (data.clues?.down || []).length)} clues · {isEditor ? "Editor preview" : "Interactive puzzle"}</span>
          <span>Tap a square to begin</span>
        </div>

        {isSolved && (
          <div className="my-3 flex items-center justify-between border border-[#315b4b]/20 bg-[#e4ebdf] p-3 text-xs font-bold text-[#315b4b]">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>Puzzle Solved! Superb work, editor!</span>
            </div>
            <span className="text-[10px] font-normal uppercase tracking-wider">100% Accurate</span>
          </div>
        )}
      </div>

      {/* Active Clue Bar (NYT style live focus banner) */}
      <div className="relative my-3 flex items-center justify-between border-y border-[#302b25]/15 bg-[#eee8db] px-3 py-2.5 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="shrink-0 bg-[#a24b35] px-2 py-1 font-mono text-[9px] font-bold tracking-wide text-white">
            {activeClue ? `${activeClue.number}-${direction.toUpperCase()}` : "SELECT CELL"}
          </span>
          <span className="truncate font-serif text-sm font-semibold text-[#302b25]">
            {activeClue?.clue || "Click any square to view clue and start typing"}
          </span>
        </div>
        <button
          className="shrink-0 border-l border-[#302b25]/15 pl-3 text-[8px] font-bold uppercase tracking-wider text-[#645b4f] hover:text-[#a24b35]"
          onClick={() => setDirection((d) => (d === "across" ? "down" : "across"))}
          type="button"
        >
          {direction === "across" ? "Across →" : "Down ↓"}
        </button>
      </div>

      {/* Main puzzle layout */}
      <div className="relative grid items-start gap-5 lg:grid-cols-[minmax(245px,0.9fr)_minmax(260px,1.1fr)] xl:gap-8">
        {/* The Crossword Grid */}
        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center">
          <div
            className="grid w-full border-[5px] border-[#25231f] bg-[#25231f] shadow-[0_8px_20px_rgba(37,35,31,0.18)]"
            style={{
              gridTemplateColumns: `repeat(${data.size}, minmax(0, 1fr))`,
              gap: "2px",
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
                      className="aspect-square bg-[#25231f]"
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
                    className={`relative flex aspect-square cursor-pointer items-center justify-center font-serif text-xl font-semibold select-none transition sm:text-2xl ${
                      isSelected
                        ? "z-10 bg-[#e7b187] ring-2 ring-inset ring-[#a24b35]"
                        : isInActiveWord
                          ? "bg-[#efe3c8]"
                          : "bg-[#fbf8f0] hover:bg-[#f0e7d5]"
                    } ${isIncorrect ? "text-[#a24b35] underline decoration-wavy" : "text-[#25231f]"}`}
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onKeyDown={(e) => handleKeyDown(e, r, c)}
                    tabIndex={0}
                  >
                    {clueNum && (
                      <span className="absolute left-1 top-0.5 font-sans text-[8px] font-bold leading-none text-[#71685b]">
                        {clueNum}
                      </span>
                    )}
                    <span className="mt-1">{displayedLetter}</span>
                  </div>
                );
              })
            )}
          </div>

          <p className="mt-3 text-center text-[8px] uppercase tracking-[0.13em] text-[#756b5e]">
            Type to fill <span className="mx-1 text-[#a24b35]">·</span> Space to switch <span className="mx-1 text-[#a24b35]">·</span> Arrows to move
          </p>
        </div>

        {/* Clues (Across & Down) */}
        <div className="grid grid-cols-2 gap-5 text-left">
          {/* Across */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#302b25]/70 pb-2">
              <h4 className="font-serif text-lg font-bold tracking-tight">
                Across
              </h4>
              <span className="font-mono text-[9px] text-black/40">
                {(data.clues?.across || []).length}
              </span>
            </div>
            <div className="mt-2.5 max-h-[320px] space-y-1 overflow-auto text-[11px] leading-relaxed">
              {(data.clues?.across || []).map((item) => {
                const isActive = activeClue?.number === item.number && direction === "across";
                return (
                  <div
                    className={`cursor-pointer border-b border-[#302b25]/[0.08] px-2 py-1.5 transition ${
                      isActive
                        ? "bg-[#ead7c8] font-semibold text-[#8d3f2c]"
                        : "text-[#51483e] hover:bg-[#eee8db] hover:text-[#25231f]"
                    }`}
                    key={item.number}
                    onClick={() => selectClue(item, "across")}
                  >
                    <span className="mr-2 font-mono text-[9px] font-bold text-[#a24b35]">{String(item.number).padStart(2, "0")}</span>
                    {item.clue || item.answer}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Down */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#302b25]/70 pb-2">
              <h4 className="font-serif text-lg font-bold tracking-tight">
                Down
              </h4>
              <span className="font-mono text-[9px] text-black/40">
                {(data.clues?.down || []).length}
              </span>
            </div>
            <div className="mt-2.5 max-h-[320px] space-y-1 overflow-auto text-[11px] leading-relaxed">
              {(data.clues?.down || []).map((item) => {
                const isActive = activeClue?.number === item.number && direction === "down";
                return (
                  <div
                    className={`cursor-pointer border-b border-[#302b25]/[0.08] px-2 py-1.5 transition ${
                      isActive
                        ? "bg-[#ead7c8] font-semibold text-[#8d3f2c]"
                        : "text-[#51483e] hover:bg-[#eee8db] hover:text-[#25231f]"
                    }`}
                    key={item.number}
                    onClick={() => selectClue(item, "down")}
                  >
                    <span className="mr-2 font-mono text-[9px] font-bold text-[#a24b35]">{String(item.number).padStart(2, "0")}</span>
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
