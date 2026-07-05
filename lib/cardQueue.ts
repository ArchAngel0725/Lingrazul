// ALark-Claude_Review@MEGADATA
// cardQueue.ts - Manages the active flashcard queue, rest logic, and decoy generation
// Supports both FlashCard (words) and LetterCard (letters/kana)
// Word cards pull decoys from wordPool, letter cards pull from letterPool

import { FlashCard, LetterCard } from './cards';

// Union type for any card that can appear in the queue
type AnyCard = FlashCard | LetterCard;

// Wraps any card with session tracking metadata
interface QueuedCard {
  card: AnyCard;
  seenCount: number;       // number of times answered correctly this session
  lastSeen: number | null; // timestamp of last correct answer, null if unseen
}

// --- Tuning knobs ---
const MAX_QUEUE_SIZE = 10;      // max cards in active queue at once
const REST_THRESHOLD = 3;       // correct answers before a card is rested
const REFILL_THRESHOLD = 0.5;   // refill when queue drops to this fraction of max

// --- Module-level state (cleared on tab exit via clearQueue) ---
let activeQueue: QueuedCard[] = [];  // cards currently in play
let restedCards: string[] = [];      // IDs of cards that have hit REST_THRESHOLD
let wordPool: string[] = [];         // decoy words for word card wrong answers
let letterPool: string[] = [];       // decoy letters for letter card wrong answers

// Called once on tab load - sets up the queue and both decoy pools
export function initQueue(cards: AnyCard[], decoys: string[], letterDecoys: string[] = []) {
  activeQueue = cards.map(card => ({
    card,
    seenCount: 0,
    lastSeen: null,
  }));
  wordPool = decoys;
  letterPool = letterDecoys;
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

// Read-only access to rested card IDs
export function getRestedIds(): string[] {
  return restedCards;
}

// Read-only access to active queue
export function getActiveCards(): QueuedCard[] {
  return activeQueue;
}

// Adds new cards to the queue, filtering out duplicates and rested cards
export function addCards(newCards: AnyCard[]): void {
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
  restedCards = [];
  wordPool = [];
  letterPool = [];
}

// Returns 3 random decoys from the correct pool based on card type
// Letter cards get letter decoys, word cards get word decoys
export function getDecoys(correctAnswer: string, cardType: string): string[] {
  const pool = cardType === 'letter' ? letterPool : wordPool;
  const filtered = pool.filter(w => w !== correctAnswer);
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}