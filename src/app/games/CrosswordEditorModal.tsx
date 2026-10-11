import { useState, useEffect } from "react";
import type { CrosswordData, CrosswordClue } from "./types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, CLASSIC_7X7_CROSSWORD } from "./presets";

interface CrosswordEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CrosswordData) => void;
  initialData?: CrosswordData;
}

export default function CrosswordEditorModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: CrosswordEditorModalProps) {
  const [data, setData] = useState<CrosswordData>(() => initialData ?? DEFAULT_CAMPUS_MINI_CROSSWORD);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>({ r: 0, c: 0 });
  const [direction, setDirection] = useState<"across" | "down">("across");

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const size = data.size;

  const handleCellClick = (r: number, c: number) => {
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      updateCell(r, c, "");
      moveCursor(r, c, -1);
    } else if (e.key === " " || e.key === "#") {
      e.preventDefault();
      toggleBlackCell(r, c);
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      updateCell(r, c, e.key.toUpperCase());
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

  const moveCursor = (r: number, c: number, delta: number) => {
    if (direction === "across") {
      const nextC = c + delta;
      if (nextC >= 0 && nextC < size) setSelectedCell({ r, c: nextC });
    } else {
      const nextR = r + delta;
      if (nextR >= 0 && nextR < size) setSelectedCell({ r: nextR, c });
    }
  };

  const updateCell = (r: number, c: number, char: string) => {
    const nextGrid = data.grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? char : val))
    );
    setData((prev) => ({ ...prev, grid: nextGrid }));
  };

  const toggleBlackCell = (r: number, c: number) => {
    const current = data.grid[r][c];
    const nextVal = current === "#" ? "" : "#";
    updateCell(r, c, nextVal);
  };

  const setGridSize = (newSize: number) => {
    const newGrid: string[][] = Array(newSize)
      .fill("")
      .map(() => Array(newSize).fill(""));
    setData({
      ...data,
      size: newSize,
      grid: newGrid,
      clues: { across: [], down: [] },
    });
    setSelectedCell({ r: 0, c: 0 });
  };

  const loadPreset = (presetName: string) => {
    if (presetName === "mini5") {
      setData(DEFAULT_CAMPUS_MINI_CROSSWORD);
    } else if (presetName === "quad7") {
      setData(CLASSIC_7X7_CROSSWORD);
    } else if (presetName === "blank5") {
      setGridSize(5);
    } else if (presetName === "blank7") {
      setGridSize(7);
    }
  };

  // Auto-detect numbers & words from the grid
  const autoDetectClues = () => {
    let clueNum = 1;
    const newAcross: CrosswordClue[] = [];
    const newDown: CrosswordClue[] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data.grid[r][c] === "#") continue;

        const isStartOfAcross =
          (c === 0 || data.grid[r][c - 1] === "#") &&
          c + 1 < size &&
          data.grid[r][c + 1] !== "#";

        const isStartOfDown =
          (r === 0 || data.grid[r - 1][c] === "#") &&
          r + 1 < size &&
          data.grid[r + 1][c] !== "#";

        if (isStartOfAcross || isStartOfDown) {
          const num = clueNum++;

          if (isStartOfAcross) {
            let answer = "";
            let ci = c;
            while (ci < size && data.grid[r][ci] !== "#") {
              answer += data.grid[r][ci] || "_";
              ci++;
            }
            const existingClue = data.clues.across.find((x) => x.number === num)?.clue || "";
            newAcross.push({ number: num, clue: existingClue, row: r, col: c, answer });
          }

          if (isStartOfDown) {
            let answer = "";
            let ri = r;
            while (ri < size && data.grid[ri][c] !== "#") {
              answer += data.grid[ri][c] || "_";
              ri++;
            }
            const existingClue = data.clues.down.find((x) => x.number === num)?.clue || "";
            newDown.push({ number: num, clue: existingClue, row: r, col: c, answer });
          }
        }
      }
    }

    setData((prev) => ({
      ...prev,
      clues: { across: newAcross, down: newDown },
    }));
  };

  const updateClueText = (type: "across" | "down", index: number, text: string) => {
    setData((prev) => {
      const list = [...prev.clues[type]];
      list[index] = { ...list[index], clue: text };
      return {
        ...prev,
        clues: { ...prev.clues, [type]: list },
      };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-black/15 bg-[#f8f5ed] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
                Crossword Builder
              </span>
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-semibold text-black/50">
                {size}×{size} Grid
              </span>
            </div>
            <h2 className="mt-1 font-serif text-3xl font-normal">Design your campus puzzle</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-black/15 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] hover:bg-black/5"
              onClick={autoDetectClues}
              type="button"
            >
              Auto-generate clue numbers ↺
            </button>
            <button
              className="rounded-full bg-[#171714] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]"
              onClick={() => {
                onSave(data);
                onClose();
              }}
              type="button"
            >
              Save & Insert
            </button>
            <button
              className="ml-2 grid h-8 w-8 place-items-center rounded-full text-black/45 hover:bg-black/10 hover:text-black"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Body content */}
        <div className="grid flex-1 overflow-y-auto p-6 md:grid-cols-[1.1fr_1.3fr] md:gap-8">
          {/* Left column: Grid & interactive keyboard */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/50">Presets:</span>
                <button
                  className="rounded border border-black/15 px-2 py-1 text-[9px] font-semibold hover:border-[#ef5a35]"
                  onClick={() => loadPreset("mini5")}
                  type="button"
                >
                  Campus Mini (5×5)
                </button>
                <button
                  className="rounded border border-black/15 px-2 py-1 text-[9px] font-semibold hover:border-[#ef5a35]"
                  onClick={() => loadPreset("quad7")}
                  type="button"
                >
                  Quad Classic (7×7)
                </button>
                <button
                  className="rounded border border-black/15 px-2 py-1 text-[9px] font-semibold hover:border-[#ef5a35]"
                  onClick={() => loadPreset("blank5")}
                  type="button"
                >
                  Blank 5×5
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase ${direction === "across" ? "bg-[#171714] text-white" : "border border-black/15"}`}
                  onClick={() => setDirection("across")}
                  type="button"
                >
                  Across →
                </button>
                <button
                  className={`rounded px-2.5 py-1 text-[9px] font-bold uppercase ${direction === "down" ? "bg-[#171714] text-white" : "border border-black/15"}`}
                  onClick={() => setDirection("down")}
                  type="button"
                >
                  Down ↓
                </button>
              </div>
            </div>

            {/* Title & Author Inputs */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <input
                className="rounded border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#ef5a35]"
                onChange={(e) => setData({ ...data, title: e.target.value })}
                placeholder="Puzzle Title"
                value={data.title || ""}
              />
              <input
                className="rounded border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#ef5a35]"
                onChange={(e) => setData({ ...data, author: e.target.value })}
                placeholder="Author / Credit"
                value={data.author || ""}
              />
            </div>

            {/* Crossword Interactive Canvas Grid */}
            <div className="flex justify-center border border-black/15 bg-white p-5 shadow-inner">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${size}, minmax(0, 48px))`,
                }}
              >
                {data.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const isBlack = cell === "#";

                    return (
                      <div
                        className={`relative flex h-11 w-11 cursor-pointer items-center justify-center border font-serif text-lg font-bold select-none transition ${
                          isBlack
                            ? "border-black bg-[#171714] text-transparent"
                            : isSelected
                              ? "border-[#ef5a35] bg-[#ef5a35]/15 ring-2 ring-[#ef5a35]"
                              : "border-black/30 bg-[#fbf9f4] hover:bg-black/5"
                        }`}
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        tabIndex={0}
                      >
                        {!isBlack && cell}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick tips & controls */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-black/5 p-3 text-[10px] text-black/60">
              <span>
                💡 <strong>Tip:</strong> Click to type letters. Press <strong>Space</strong> or <strong>#</strong> to toggle black blocks.
              </span>
              {selectedCell && (
                <button
                  className="rounded border border-black/20 bg-white px-2.5 py-1 text-[9px] font-bold uppercase hover:bg-[#ef5a35] hover:text-white"
                  onClick={() => toggleBlackCell(selectedCell.r, selectedCell.c)}
                  type="button"
                >
                  Toggle Block (■)
                </button>
              )}
            </div>
          </div>

          {/* Right column: Clue Editor */}
          <div className="flex flex-col border-t border-black/10 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">
                Clues & Definitions
              </span>
              <span className="text-[9px] text-black/45">
                {data.clues.across.length} Across · {data.clues.down.length} Down
              </span>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              {/* Across Clues */}
              <div>
                <h4 className="mb-2 font-serif text-base font-bold text-black/80">Across</h4>
                {data.clues.across.length === 0 ? (
                  <p className="rounded border border-dashed border-black/15 p-3 text-xs text-black/40">
                    No Across clues yet. Click &quot;Auto-generate clue numbers ↺&quot; above to scan your grid!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.clues.across.map((item, idx) => (
                      <div className="flex items-center gap-2" key={item.number}>
                        <span className="w-6 shrink-0 font-mono text-xs font-bold text-[#ef5a35]">
                          {item.number}.
                        </span>
                        <input
                          className="flex-1 rounded border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#ef5a35]"
                          onChange={(e) => updateClueText("across", idx, e.target.value)}
                          placeholder={`Clue for ${item.answer || "word"}`}
                          value={item.clue}
                        />
                        {item.answer && (
                          <span className="rounded bg-black/5 px-2 py-1 font-mono text-[9px] font-bold text-black/50">
                            {item.answer}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Down Clues */}
              <div>
                <h4 className="mb-2 font-serif text-base font-bold text-black/80">Down</h4>
                {data.clues.down.length === 0 ? (
                  <p className="rounded border border-dashed border-black/15 p-3 text-xs text-black/40">
                    No Down clues yet. Click &quot;Auto-generate clue numbers ↺&quot; above to scan your grid!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.clues.down.map((item, idx) => (
                      <div className="flex items-center gap-2" key={item.number}>
                        <span className="w-6 shrink-0 font-mono text-xs font-bold text-[#ef5a35]">
                          {item.number}.
                        </span>
                        <input
                          className="flex-1 rounded border border-black/15 bg-white px-3 py-1.5 text-xs outline-none focus:border-[#ef5a35]"
                          onChange={(e) => updateClueText("down", idx, e.target.value)}
                          placeholder={`Clue for ${item.answer || "word"}`}
                          value={item.clue}
                        />
                        {item.answer && (
                          <span className="rounded bg-black/5 px-2 py-1 font-mono text-[9px] font-bold text-black/50">
                            {item.answer}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
