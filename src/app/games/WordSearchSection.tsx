import { useState } from "react";
import type { WordSearchData } from "./types";
import { DEFAULT_WORD_SEARCH } from "./presets";

interface WordSearchSectionProps {
  data?: WordSearchData;
}

export default function WordSearchSection({
  data = DEFAULT_WORD_SEARCH,
}: WordSearchSectionProps) {
  const [selectedLetters, setSelectedLetters] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());

  const toggleLetter = (r: number, c: number) => {
    const key = `${r}-${c}`;
    setSelectedLetters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFoundWord = (word: string) => {
    setFoundWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const revealAllWords = () => {
    setFoundWords(new Set(data.words));
  };

  const clearWords = () => {
    setFoundWords(new Set());
    setSelectedLetters(new Set());
  };

  return (
    <div className="flex h-full flex-col justify-between border border-black/15 bg-[#f8f5ed] p-6 sm:p-8">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            Campus Games · Word Search
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-black/60">
              {foundWords.size} / {data.words.length} Found
            </span>
            <button
              className="rounded-full border border-black/15 px-2.5 py-1 text-[8px] font-bold uppercase hover:bg-black/5 transition"
              onClick={foundWords.size === data.words.length ? clearWords : revealAllWords}
              type="button"
            >
              {foundWords.size === data.words.length ? "Clear" : "Reveal All"}
            </button>
          </div>
        </div>

        <h3 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
          {data.title || "University Word Search"}
        </h3>
        <p className="mt-1 text-xs text-black/55">
          Find all {data.words.length} words hidden in the grid below.
        </p>
      </div>

      {/* Grid */}
      <div className="my-4 flex justify-center">
        <div className="inline-grid border border-black/25 bg-white p-3 shadow-inner">
          {data.grid.map((row, r) => (
            <div className="flex gap-1 py-0.5" key={r}>
              {row.map((letter, c) => {
                const key = `${r}-${c}`;
                const isSelected = selectedLetters.has(key);

                return (
                  <button
                    className={`flex h-7 w-7 items-center justify-center rounded font-mono text-xs font-bold transition select-none sm:h-8 sm:w-8 sm:text-sm ${
                      isSelected
                        ? "bg-[#ef5a35] text-white shadow-sm"
                        : "bg-[#fbf9f4] text-black/80 hover:bg-black/10"
                    }`}
                    key={c}
                    onClick={() => toggleLetter(r, c)}
                    type="button"
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Words Checklist */}
      <div>
        <h4 className="border-b border-black/20 pb-1 font-serif text-xs font-bold uppercase tracking-[0.1em]">
          Words to find
        </h4>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {data.words.map((word) => {
            const isFound = foundWords.has(word);
            return (
              <button
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider transition ${
                  isFound
                    ? "bg-[#dce9e1] text-[#315b4b] line-through"
                    : "border border-black/15 bg-white text-black/80 hover:border-[#ef5a35]"
                }`}
                key={word}
                onClick={() => toggleFoundWord(word)}
                type="button"
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
