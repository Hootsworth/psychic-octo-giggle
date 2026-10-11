import { useState, useMemo, useEffect, useRef } from "react";
import type { CrosswordData, CrosswordClue } from "./types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, CLASSIC_7X7_CROSSWORD } from "./presets";

interface CrosswordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CrosswordData) => void;
  initialData?: CrosswordData;
}

// Built-in smart clue suggestions for common collegiate words
const SMART_CLUES: Record<string, string> = {
  HEART: "Passionate spirit at the core of university life",
  ENTER: "Step into the 9 AM lecture hall",
  ATONE: "Make amends for turning in an essay late",
  RENEW: "Extend a library book loan for finals week",
  TENET: "Foundational principle taught in Ethics 101",
  CAMPUS: "Historic brick walkways and academic halls",
  FINALS: "December and May academic gauntlets",
  ESSAYS: "Midterm paper submissions",
  STUDY: "Late night in the library basement",
  COFFEE: "Fuel from the Student Union cafe before 9 AM",
  MINDSET: "Scholarly intellect cultivated in seminar halls",
  ARTIST: "Campus gallery creator",
  AYE: "Student senate approval vote",
  EXAMS: "Midterm tests",
  PAPERS: "Term research projects",
  LECTURE: "Professor's Monday presentation",
  THESIS: "Culmination of senior year",
  DEGREE: "Diploma earned at commencement",
  DEAN: "Head of faculty",
  TUTOR: "Peer helper at the writing center",
  DORM: "Residence hall living",
  QUAD: "Open grassy lawn between campus halls",
};

export default function CrosswordEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CrosswordEditorModalProps) {
  const [data, setData] = useState<CrosswordData>(() => initialData ?? DEFAULT_CAMPUS_MINI_CROSSWORD);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [toolMode, setToolMode] = useState<"letters" | "blocks">("letters");
  const [symmetricalBlocks, setSymmetricalBlocks] = useState(true);
  const [activeTab, setActiveTab] = useState<"across" | "down">("across");

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  const size = data.size;

  // Real-time automatic extraction of clue numbers and words from grid
  const { acrossClues, downClues, cellNumbers } = useMemo(() => {
    let clueNum = 1;
    const newAcross: CrosswordClue[] = [];
    const newDown: CrosswordClue[] = [];
    const numbers: Record<string, number> = {};

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data.grid[r]?.[c] === "#") continue;

        const isStartOfAcross =
          (c === 0 || data.grid[r][c - 1] === "#") &&
          c + 1 < size &&
          data.grid[r][c + 1] !== "#";

        const isStartOfDown =
          (r === 0 || data.grid[r - 1]?.[c] === "#") &&
          r + 1 < size &&
          data.grid[r + 1]?.[c] !== "#";

        if (isStartOfAcross || isStartOfDown) {
          const num = clueNum++;
          numbers[`${r}-${c}`] = num;

          if (isStartOfAcross) {
            let answer = "";
            let ci = c;
            while (ci < size && data.grid[r][ci] !== "#") {
              answer += data.grid[r][ci] || "_";
              ci++;
            }
            // Preserve existing author's clue
            const existingClue =
              data.clues.across.find((x) => x.row === r && x.col === c)?.clue ||
              data.clues.across.find((x) => x.number === num)?.clue ||
              "";
            newAcross.push({ number: num, clue: existingClue, row: r, col: c, answer });
          }

          if (isStartOfDown) {
            let answer = "";
            let ri = r;
            while (ri < size && data.grid[ri]?.[c] !== "#") {
              answer += data.grid[ri][c] || "_";
              ri++;
            }
            // Preserve existing author's clue
            const existingClue =
              data.clues.down.find((x) => x.row === r && x.col === c)?.clue ||
              data.clues.down.find((x) => x.number === num)?.clue ||
              "";
            newDown.push({ number: num, clue: existingClue, row: r, col: c, answer });
          }
        }
      }
    }

    return { acrossClues: newAcross, downClues: newDown, cellNumbers: numbers };
  }, [data.grid, data.clues, size]);

  // Keep clues in sync with data whenever grid changes
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      clues: { across: acrossClues, down: downClues },
    }));
  }, [acrossClues, downClues]);

  // Identify active word cells based on selection
  const activeWordInfo = useMemo(() => {
    const { r, c } = selectedCell;
    if (data.grid[r]?.[c] === "#") return null;

    if (direction === "across") {
      let startC = c;
      while (startC > 0 && data.grid[r][startC - 1] !== "#") startC--;
      let endC = c;
      while (endC < size - 1 && data.grid[r][endC + 1] !== "#") endC++;

      const cells = new Set<string>();
      let word = "";
      for (let ci = startC; ci <= endC; ci++) {
        cells.add(`${r}-${ci}`);
        word += data.grid[r][ci] || "_";
      }
      const clue = acrossClues.find((x) => x.row === r && x.col === startC);
      return { dir: "across" as const, clue, cells, word, length: endC - startC + 1 };
    } else {
      let startR = r;
      while (startR > 0 && data.grid[startR - 1]?.[c] !== "#") startR--;
      let endR = r;
      while (endR < size - 1 && data.grid[endR + 1]?.[c] !== "#") endR++;

      const cells = new Set<string>();
      let word = "";
      for (let ri = startR; ri <= endR; ri++) {
        cells.add(`${ri}-${c}`);
        word += data.grid[ri][c] || "_";
      }
      const clue = downClues.find((x) => x.row === startR && x.col === c);
      return { dir: "down" as const, clue, cells, word, length: endR - startR + 1 };
    }
  }, [selectedCell, direction, data.grid, size, acrossClues, downClues]);

  if (!isOpen) return null;

  const handleCellClick = (r: number, c: number) => {
    if (toolMode === "blocks") {
      toggleBlockCell(r, c);
      return;
    }

    if (data.grid[r]?.[c] === "#") {
      // If clicking a black cell in letters mode, select it but switch tool or clear
      setSelectedCell({ r, c });
      return;
    }

    if (selectedCell.r === r && selectedCell.c === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setSelectedCell({ r, c });
    }
  };

  const toggleBlockCell = (r: number, c: number) => {
    const isCurrentlyBlack = data.grid[r]?.[c] === "#";
    const nextVal = isCurrentlyBlack ? "" : "#";

    const nextGrid = data.grid.map((row, ri) =>
      row.map((val, ci) => {
        if (ri === r && ci === c) return nextVal;
        if (symmetricalBlocks && ri === size - 1 - r && ci === size - 1 - c) {
          return nextVal;
        }
        return val;
      })
    );

    setData((prev) => ({ ...prev, grid: nextGrid }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      updateCellLetter(r, c, "");
      moveCursor(r, c, -1);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else if (e.key === "#") {
      e.preventDefault();
      toggleBlockCell(r, c);
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      updateCellLetter(r, c, e.key.toUpperCase());
      moveCursor(r, c, 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedCell({ r, c: Math.min(size - 1, c + 1) });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedCell({ r, c: Math.max(0, c - 1) });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedCell({ r: Math.min(size - 1, r + 1), c });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedCell({ r: Math.max(0, r - 1), c });
    }
  };

  const updateCellLetter = (r: number, c: number, char: string) => {
    const nextGrid = data.grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? char : val))
    );
    setData((prev) => ({ ...prev, grid: nextGrid }));
  };

  const moveCursor = (r: number, c: number, delta: number) => {
    if (direction === "across") {
      const nextC = c + delta;
      if (nextC >= 0 && nextC < size) {
        setSelectedCell({ r, c: nextC });
      }
    } else {
      const nextR = r + delta;
      if (nextR >= 0 && nextR < size) {
        setSelectedCell({ r: nextR, c });
      }
    }
  };

  const handleClueChange = (type: "across" | "down", number: number, clueText: string) => {
    setData((prev) => {
      const list = prev.clues[type].map((item) =>
        item.number === number ? { ...item, clue: clueText } : item
      );
      return {
        ...prev,
        clues: { ...prev.clues, [type]: list },
      };
    });
  };

  const applySmartClue = (type: "across" | "down", number: number, answerWord: string) => {
    const cleanWord = answerWord.replace(/[^A-Z]/g, "");
    const suggestion =
      SMART_CLUES[cleanWord] ||
      `Collegiate clue for "${cleanWord}" (${cleanWord.length} letters)`;
    handleClueChange(type, number, suggestion);
  };

  const resizeGrid = (newSize: number) => {
    // Preserve overlapping cells
    const newGrid: string[][] = Array(newSize)
      .fill("")
      .map((_, ri) =>
        Array(newSize)
          .fill("")
          .map((_, ci) => data.grid[ri]?.[ci] || "")
      );

    setData((prev) => ({
      ...prev,
      size: newSize,
      grid: newGrid,
    }));
    setSelectedCell({ r: 0, c: 0 });
  };

  const loadPreset = (presetName: string) => {
    if (presetName === "mini5") {
      setData(DEFAULT_CAMPUS_MINI_CROSSWORD);
      setSelectedCell({ r: 0, c: 0 });
    } else if (presetName === "quad7") {
      setData(CLASSIC_7X7_CROSSWORD);
      setSelectedCell({ r: 0, c: 0 });
    } else if (presetName === "blank5") {
      const g = Array(5).fill("").map(() => Array(5).fill(""));
      setData({ ...data, size: 5, grid: g });
      setSelectedCell({ r: 0, c: 0 });
    } else if (presetName === "blank7") {
      const g = Array(7).fill("").map(() => Array(7).fill(""));
      setData({ ...data, size: 7, grid: g });
      setSelectedCell({ r: 0, c: 0 });
    } else if (presetName === "clearLetters") {
      // Retain black blocks, wipe out letters
      const g = data.grid.map((row) => row.map((cell) => (cell === "#" ? "#" : "")));
      setData({ ...data, grid: g });
    }
  };

  const focusClueOnGrid = (clue: CrosswordClue, dir: "across" | "down") => {
    setSelectedCell({ r: clue.row, c: clue.col });
    setDirection(dir);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-5"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-2xl border border-black/20 bg-[#f8f5ed] shadow-2xl dark:bg-[#1a1a17]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Studio Header */}
        <header className="flex flex-wrap items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
                Crossword Studio
              </span>
              <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-bold text-black/60 dark:bg-white/10 dark:text-[#f3f0e8]/80">
                {size}×{size} Canvas
              </span>
              <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-medium text-black/50 dark:bg-white/10">
                {acrossClues.length + downClues.length} Words Live
              </span>
            </div>
            <h2 className="mt-0.5 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
              Design your campus crossword
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[#ef5a35] px-5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white shadow hover:bg-[#d44826]"
              onClick={() => {
                onSave(data);
                onClose();
              }}
              type="button"
            >
              Save & Apply Puzzle ✓
            </button>
          </div>
        </header>

        {/* Studio Body (Left: Interactive Grid & Tools, Right: Clue Studio) */}
        <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1.1fr_1.3fr]">
          {/* LEFT: Grid Canvas & Construction Toolkit */}
          <div className="flex flex-col border-b border-black/10 p-6 lg:border-b-0 lg:border-r dark:border-white/10">
            {/* Construction Tool Mode Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/5 p-1.5 dark:bg-white/5">
              <div className="flex items-center gap-1">
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    toolMode === "letters"
                      ? "bg-white text-black shadow-sm dark:bg-[#2b2b27] dark:text-[#f3f0e8]"
                      : "text-black/60 hover:text-black dark:text-[#f3f0e8]/60"
                  }`}
                  onClick={() => setToolMode("letters")}
                  type="button"
                >
                  ✏️ Fill Letters
                </button>
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    toolMode === "blocks"
                      ? "bg-[#171714] text-white shadow-sm dark:bg-white dark:text-black"
                      : "text-black/60 hover:text-black dark:text-[#f3f0e8]/60"
                  }`}
                  onClick={() => setToolMode("blocks")}
                  type="button"
                >
                  ⬛ Place Blocks (■)
                </button>
              </div>

              {toolMode === "letters" ? (
                <button
                  className="rounded-md border border-black/15 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm hover:border-[#ef5a35] dark:bg-[#2b2b27] dark:text-[#f3f0e8]"
                  onClick={() => setDirection((d) => (d === "across" ? "down" : "across"))}
                  type="button"
                >
                  Typing: {direction === "across" ? "Across →" : "Down ↓"} (Space to flip)
                </button>
              ) : (
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-black/70 dark:text-[#f3f0e8]/80">
                  <input
                    checked={symmetricalBlocks}
                    className="accent-[#ef5a35]"
                    onChange={(e) => setSymmetricalBlocks(e.target.checked)}
                    type="checkbox"
                  />
                  180° Rotational Symmetry
                </label>
              )}
            </div>

            {/* Canvas Dimensions & Presets Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-black/45 dark:text-[#f3f0e8]/50">
                  Size:
                </span>
                {([5, 7, 9] as const).map((s) => (
                  <button
                    className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase transition ${
                      size === s
                        ? "bg-[#ef5a35] text-white"
                        : "border border-black/15 hover:border-black/30 dark:border-white/15"
                    }`}
                    key={s}
                    onClick={() => resizeGrid(s)}
                    type="button"
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="rounded border border-black/15 bg-white px-2 py-0.5 text-[9px] font-bold hover:border-[#ef5a35] dark:bg-[#2b2b27]"
                  onClick={() => loadPreset("mini5")}
                  title="Load 5x5 campus word square"
                  type="button"
                >
                  Campus 5×5
                </button>
                <button
                  className="rounded border border-black/15 bg-white px-2 py-0.5 text-[9px] font-bold hover:border-[#ef5a35] dark:bg-[#2b2b27]"
                  onClick={() => loadPreset("quad7")}
                  title="Load 7x7 classic campus puzzle"
                  type="button"
                >
                  Quad 7×7
                </button>
                <button
                  className="rounded border border-black/15 bg-white px-2 py-0.5 text-[9px] font-bold text-black/60 hover:text-black dark:bg-[#2b2b27]"
                  onClick={() => loadPreset("clearLetters")}
                  title="Clear letters but keep black squares"
                  type="button"
                >
                  Clear Letters
                </button>
              </div>
            </div>

            {/* Puzzle Metadata (Title & Author) */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <input
                className="rounded-lg border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#22221f]"
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="Puzzle Title (e.g. The Campus Mini)"
                value={data.title || ""}
              />
              <input
                className="rounded-lg border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#22221f]"
                onChange={(e) => setData({ ...data, author: e.target.value })}
                placeholder="Author / Credit (e.g. The Editorial Desk)"
                value={data.author || ""}
              />
            </div>

            {/* Interactive Crossword Grid */}
            <div className="flex flex-1 items-center justify-center rounded-xl border border-black/15 bg-white p-5 shadow-inner dark:border-white/10 dark:bg-[#151513]">
              <div
                className="grid border-2 border-black bg-black shadow-lg"
                style={{
                  gridTemplateColumns: `repeat(${size}, minmax(0, 48px))`,
                  gap: "1px",
                }}
              >
                {data.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isSelected = selectedCell.r === r && selectedCell.c === c;
                    const isBlack = cell === "#";
                    const isInActiveWord = activeWordInfo?.cells.has(`${r}-${c}`);
                    const clueNum = cellNumbers[`${r}-${c}`];

                    if (isBlack) {
                      return (
                        <div
                          className={`relative flex h-11 w-11 cursor-pointer items-center justify-center bg-[#171714] text-white transition sm:h-12 sm:w-12 ${
                            isSelected && toolMode === "blocks"
                              ? "ring-2 ring-[#ef5a35] ring-inset"
                              : ""
                          }`}
                          key={`${r}-${c}`}
                          onClick={() => handleCellClick(r, c)}
                          title="Black block (click to toggle)"
                        >
                          <span className="text-[10px] text-white/20">■</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        className={`relative flex h-11 w-11 cursor-pointer items-center justify-center font-serif text-xl font-bold select-none transition sm:h-12 sm:w-12 ${
                          isSelected
                            ? "bg-[#fed7aa] ring-2 ring-inset ring-[#ef5a35] dark:bg-[#b45309]/50"
                            : isInActiveWord
                              ? "bg-[#ffedd5] dark:bg-[#78350f]/30"
                              : "bg-[#fbf9f4] hover:bg-black/5 dark:bg-[#262622]"
                        }`}
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        tabIndex={0}
                      >
                        {clueNum && (
                          <span className="absolute left-1 top-0.5 font-sans text-[8.5px] font-bold leading-none text-black/60 dark:text-[#f3f0e8]/70">
                            {clueNum}
                          </span>
                        )}
                        <span className="mt-1 text-black dark:text-[#f3f0e8]">{cell}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Helper Footer */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-black/50 dark:text-[#f3f0e8]/50">
              <span>
                💡 Type letters freely · Space/Enter flips direction · # or block tool adds black squares
              </span>
              {activeWordInfo && (
                <span className="font-semibold text-[#ef5a35]">
                  Active: {activeWordInfo.dir.toUpperCase()} ({activeWordInfo.length} letters)
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: Live Synced Clues Studio */}
          <div className="flex flex-col p-6">
            {/* Active Word Focused Card */}
            {activeWordInfo ? (
              <div className="mb-5 rounded-xl border border-[#ef5a35]/30 bg-[#fff8f6] p-4 shadow-sm dark:bg-[#2b1f1c]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#ef5a35] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      {activeWordInfo.clue
                        ? `${activeWordInfo.clue.number}-${activeWordInfo.dir.toUpperCase()}`
                        : `${activeWordInfo.dir.toUpperCase()}`}
                    </span>
                    <span className="font-serif text-sm font-bold text-black dark:text-[#f3f0e8]">
                      Current Word: {activeWordInfo.word}
                    </span>
                    <span className="text-[10px] text-black/45 dark:text-[#f3f0e8]/50">
                      ({activeWordInfo.length} letters)
                    </span>
                  </div>

                  {activeWordInfo.clue && (
                    <button
                      className="rounded-full border border-[#ef5a35]/40 bg-white px-2.5 py-1 text-[9px] font-bold uppercase text-[#ef5a35] hover:bg-[#ef5a35] hover:text-white dark:bg-[#1a1a17]"
                      onClick={() =>
                        applySmartClue(
                          activeWordInfo.dir,
                          activeWordInfo.clue!.number,
                          activeWordInfo.word
                        )
                      }
                      title="Generate a smart campus clue suggestion for this word"
                      type="button"
                    >
                      🪄 Suggest Clue
                    </button>
                  )}
                </div>

                {activeWordInfo.clue ? (
                  <input
                    className="mt-3 w-full rounded-lg border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#1c1c19]"
                    onChange={(e) =>
                      handleClueChange(
                        activeWordInfo.dir,
                        activeWordInfo.clue!.number,
                        e.target.value
                      )
                    }
                    placeholder={`Write an engaging clue for "${activeWordInfo.word}"...`}
                    ref={(el) => {
                      if (activeWordInfo.clue) {
                        inputRefs.current[`${activeWordInfo.dir}-${activeWordInfo.clue.number}`] = el;
                      }
                    }}
                    value={activeWordInfo.clue.clue || ""}
                  />
                ) : (
                  <p className="mt-2 text-xs text-black/50">
                    Place letters in this line to automatically form a numbered clue.
                  </p>
                )}
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
                Click any cell on the grid to inspect and author its clue.
              </div>
            )}

            {/* Clue List Tabs (Across vs Down) */}
            <div className="mb-3 flex items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
              <div className="flex items-center gap-2">
                <button
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    activeTab === "across"
                      ? "bg-[#171714] text-white dark:bg-white dark:text-black"
                      : "text-black/60 hover:text-black dark:text-[#f3f0e8]/60"
                  }`}
                  onClick={() => setActiveTab("across")}
                  type="button"
                >
                  Across Clues ({acrossClues.length})
                </button>
                <button
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    activeTab === "down"
                      ? "bg-[#171714] text-white dark:bg-white dark:text-black"
                      : "text-black/60 hover:text-black dark:text-[#f3f0e8]/60"
                  }`}
                  onClick={() => setActiveTab("down")}
                  type="button"
                >
                  Down Clues ({downClues.length})
                </button>
              </div>

              <span className="text-[10px] text-black/45 dark:text-[#f3f0e8]/50">
                Auto-syncs live as you edit the grid
              </span>
            </div>

            {/* Clue Editor Entries */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {(activeTab === "across" ? acrossClues : downClues).length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-xs text-black/40">
                  No {activeTab} words found. Type letters in the grid to create {activeTab} entries!
                </div>
              ) : (
                (activeTab === "across" ? acrossClues : downClues).map((item) => {
                  const isCurrentlyActive =
                    activeWordInfo?.clue?.number === item.number &&
                    activeWordInfo.dir === activeTab;

                  return (
                    <div
                      className={`flex flex-col gap-1.5 rounded-xl border p-3 transition ${
                        isCurrentlyActive
                          ? "border-[#ef5a35] bg-[#fffaf8] shadow-sm dark:bg-[#251e1c]"
                          : "border-black/10 bg-white hover:border-black/25 dark:border-white/10 dark:bg-[#22221f]"
                      }`}
                      key={`${activeTab}-${item.number}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#ef5a35] font-mono text-[10px] font-bold text-white">
                            {item.number}
                          </span>
                          <span className="font-mono text-xs font-bold tracking-wider text-black dark:text-[#f3f0e8]">
                            {item.answer || "EMPTY"}
                          </span>
                          <span className="text-[9px] text-black/40">
                            ({item.answer?.length || 0} letters)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-[9px] font-bold uppercase text-[#ef5a35] hover:underline"
                            onClick={() =>
                              applySmartClue(activeTab, item.number, item.answer || "")
                            }
                            type="button"
                          >
                            🪄 Suggest
                          </button>
                          <button
                            className="rounded border border-black/10 px-2 py-0.5 text-[9px] font-bold uppercase text-black/60 hover:border-black hover:text-black dark:border-white/10 dark:text-[#f3f0e8]/60"
                            onClick={() => focusClueOnGrid(item, activeTab)}
                            type="button"
                          >
                            Highlight on Grid ↗
                          </button>
                        </div>
                      </div>

                      <input
                        className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-xs outline-none focus:border-[#ef5a35] dark:border-white/10"
                        onChange={(e) =>
                          handleClueChange(activeTab, item.number, e.target.value)
                        }
                        placeholder={`Clue for ${item.answer || "this word"}...`}
                        value={item.clue || ""}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
