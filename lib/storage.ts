"use client";

import { SavedBracketState } from "@/lib/bracket/models";

const STORAGE_KEY = "bracket-factory-state";

export function saveState(state: SavedBracketState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): SavedBracketState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SavedBracketState;
  } catch {
    return null;
  }
}
