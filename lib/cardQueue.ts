// ALark-Claude_Review@MEGADATA
// cardQueue.ts - Manages the active flashcard queue, rest logic, and decoy generation

import { FlashCard } from './cards';

// Wraps a FlashCard with session tracking metadata
interface QueuedCard {
  card: FlashCard;
  seenCount: number;      // number of times answered correctly this session
  lastSeen: number | null; // timestamp of last correct answer, null if unseen
}

// --- Tuning knobs ---
const MAX_QUEUE_SIZE = 10;      // max cards in active queue at once
const REST_THRESHOLD = 3;       // correct answers before a card is rested
const REFILL_THRESHOLD = 0.5;   // refill when queue drops to this fraction of max

// --- Module-level state (cleared on tab exit via clearQueue) ---
let activeQueue: QueuedCard[] = [];  // cards currently in play
let restedCards: string[] = [];      // IDs of cards that have hit REST_THRESHOLD
let wordPool: string[] = [];         // decoy words for multiple choice wrong answers

// Called once on tab load - sets up the queue and word pool from Supabase fetch
export function initQueue(cards: FlashCard[], decoys: string[]) {
  activeQueue = cards.map(card => ({
    card,
    seenCount: 0,
    lastSeen: null,
  }));
  wordPool = decoys;
  restedCards = [];
}

// Called when user selects the correct answer
// Increments seenCount and rests the card if threshold is reached
export function markCorrect(cardId: string): void {
  const queued = activeQueue.find(q => q.card.id === cardId);
  if (!queued) return;

  queued.seenCount += 1;
  queued.lastSeen = Date.now();

  if (queued.seenCount >= REST_THRESHOLD) {
    restedCards.push(cardId);
    activeQueue = activeQueue.filter(q => q.card.id !== cardId);
  }
}

// Returns true when queue has dropped to 50% or below - triggers background refill
export function needsRefill(): boolean {
  return activeQueue.length <= MAX_QUEUE_SIZE * REFILL_THRESHOLD;
}

// Read-only access to rested card IDs - used by fetch to exclude already-learned cards
export function getRestedIds(): string[] {
  return restedCards;
}

// Read-only access to active queue - used by the offline screen to get current card
export function getActiveCards(): QueuedCard[] {
  return activeQueue;
}

// Adds new cards to the queue, filtering out duplicates and rested cards
export function addCards(newCards: FlashCard[]): void {
  const existingIds = activeQueue.map(q => q.card.id);
  const fresh = newCards.filter(c =>
    !existingIds.includes(c.id) &&
    !restedCards.includes(c.id)
  );

  fresh.forEach(card => {
    activeQueue.push({
      card,
      seenCount: 0,
      lastSeen: null,
    });
  });
}

// Wipes all session state - called when user navigates away from offline tab
export function clearQueue(): void {
  activeQueue = [];
  restedCards = [];
  wordPool = [];
}

// Returns 3 random decoy answers from the word pool, excluding the correct answer
export function getDecoys(correctAnswer: string): string[] {
  const pool = wordPool.filter(w => w !== correctAnswer);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}