// ALark-Claude_Review@MEGADATA
// cardQueue.ts - Manages the active flashcard queue, rest logic, and decoy generation
// Supports both FlashCard (words) and LetterCard (letters/kana)
// Word cards pull decoys from wordPool, letter cards pull from letterPool

import { FlashCard, LetterCard } from './cards';
import { shuffle } from './random';

// Union type for any card that can appear in the queue
type AnyCard = FlashCard | LetterCard;

// Wraps any card with session tracking metadata
interface QueuedCard {
  card: AnyCard;
  seenCount: number;       // number of times answered correctly this session
  lastSeen: number | null; // timestamp of last correct answer, null if unseen
}

// A candidate decoy answer, tagged with the id of the row it came from.
// The id is required so getDecoys() can refuse to pull a decoy from the
// same row as the card currently being answered - without it, a letter
// row's hiragana/katakana/romaji forms can all look "correct" for the
// same question even though only one script was asked for.
export interface DecoyEntry {
  id: string;
  text: string;
}

// --- Tuning knobs ---
const MAX_QUEUE_SIZE = 10;      // max cards in active queue at once
const REST_THRESHOLD = 3;       // correct answers before a card is rested
const REFILL_THRESHOLD = 0.5;   // refill when queue drops to this fraction of max

// --- Module-level state (cleared on tab exit via clearQueue) ---
let activeQueue: QueuedCard[] = [];  // cards currently in play
// Cards that hit REST_THRESHOLD this session - deprioritized (not pulled
// back into rotation just because a refetch happens to include them again)
// so the queue favors less-practiced material first. They are NOT
// discarded, though: recycleRestedCards() brings them back once there's
// nothing fresh left. Without keeping the actual card data around, a small
// category (e.g. one difficulty tier of kanji) would get every row
// "rested" and then have nothing left to show - see showNextCard's use of
// recycleRestedCards in offline.tsx for where that recovery happens.
let restedQueue: QueuedCard[] = [];
let wordPool: DecoyEntry[] = [];     // decoy words for word card wrong answers
let letterPool: DecoyEntry[] = [];   // decoy letters for letter card wrong answers

// Called once on tab load - sets up the queue and both decoy pools
export function initQueue(cards: AnyCard[], decoys: DecoyEntry[], letterDecoys: DecoyEntry[] = []) {
  activeQueue = cards.map(card => ({
    card,
    seenCount: 0,
    lastSeen: null,
  }));
  wordPool = decoys;
  letterPool = letterDecoys;
  restedQueue = [];
}

// Called when user selects the correct answer
// Increments seenCount and rests the card if threshold is reached
export function markCorrect(cardId: string): void {
  const idx = activeQueue.findIndex(q => q.card.id === cardId);
  if (idx === -1) return;

  const queued = activeQueue[idx];
  queued.seenCount += 1;
  queued.lastSeen = Date.now();

  if (queued.seenCount >= REST_THRESHOLD) {
    activeQueue.splice(idx, 1);
    restedQueue.push(queued);
  }
}

// Returns true when queue has dropped to 50% or below - triggers background refill
export function needsRefill(): boolean {
  return activeQueue.length <= MAX_QUEUE_SIZE * REFILL_THRESHOLD;
}

// Read-only access to rested card IDs (cards that have been answered
// correctly REST_THRESHOLD times this session and are waiting to be
// recycled back in)
export function getRestedIds(): string[] {
  return restedQueue.map(q => q.card.id);
}

// True when there's at least one rested card available to recycle
export function hasRestedCards(): boolean {
  return restedQueue.length > 0;
}

// Read-only access to active queue
export function getActiveCards(): QueuedCard[] {
  return activeQueue;
}

// Adds new cards to the queue, filtering out anything already active or
// currently resting (a resting card only comes back via recycleRestedCards,
// not by incidentally showing up in a refetch).
export function addCards(newCards: AnyCard[]): void {
  const existingIds = new Set([
    ...activeQueue.map(q => q.card.id),
    ...restedQueue.map(q => q.card.id),
  ]);
  const fresh = newCards.filter(c => !existingIds.has(c.id));

  fresh.forEach(card => {
    activeQueue.push({
      card,
      seenCount: 0,
      lastSeen: null,
    });
  });
}

// Brings every currently-rested card back into active rotation, resetting
// seenCount so it can be quizzed (and potentially re-rested) again. This is
// the escape hatch for small filter combos: once every matching card has
// been mastered this session, refetching the same handful of rows would
// otherwise never add anything new (they're all still "rested"), leaving
// the queue permanently empty. Recycling means the session keeps reviewing
// already-known material instead of hard-stopping or silently hanging.
export function recycleRestedCards(): void {
  restedQueue.forEach(q => {
    activeQueue.push({ card: q.card, seenCount: 0, lastSeen: q.lastSeen });
  });
  restedQueue = [];
}

// Moves current card from front to a random position - prevents same card repeating
export function shuffleCurrentToBack(): void {
  if (activeQueue.length <= 1) return;
  const current = activeQueue.shift();
  if (!current) return;
  const randomIndex = Math.floor(Math.random() * activeQueue.length) + 1;
  activeQueue.splice(randomIndex, 0, current);
}

// Wipes all session state - called when user navigates away from flash cards tab
export function clearQueue(): void {
  activeQueue = [];
  restedQueue = [];
  wordPool = [];
  letterPool = [];
}

// Returns 3 random decoys from the correct pool based on card type
// Letter cards get letter decoys, word cards get word decoys
//
// excludeId must be the id of the card currently being answered. This is
// required (not just a text match) because a single letter row has three
// readings (hiragana/katakana/romaji) - if the decoy pool independently
// re-fetched that same row under a different question/answer mode, its
// text won't match correctAnswer as a string but it is still "correct" for
// that row, so it has to be excluded by row id rather than by text alone.
export function getDecoys(correctAnswer: string, cardType: string, excludeId: string): string[] {
  const pool = cardType === 'letter' ? letterPool : wordPool;
  const filtered = pool.filter(entry => entry.text !== correctAnswer && entry.id !== excludeId);
  const shuffled = shuffle(filtered);

  // Belt-and-suspenders: also dedupe by text. Some kana rows legitimately
  // share a reading (e.g. じ and ぢ both romanize to "ji"), which would
  // otherwise let two different decoy rows show the same answer text.
  const seen = new Set<string>();
  const unique: DecoyEntry[] = [];
  for (const entry of shuffled) {
    if (!seen.has(entry.text)) {
      seen.add(entry.text);
      unique.push(entry);
    }
  }

  return unique.slice(0, 3).map(entry => entry.text);
}