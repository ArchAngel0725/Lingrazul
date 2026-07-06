// random.ts - a real Fisher-Yates shuffle, shared by anything that needs an
// unbiased random ordering (card pulls, decoy pools, tag suggestions).
//
// The codebase previously used `array.sort(() => Math.random() - 0.5)` in
// a few places - that pattern is a well-known source of biased shuffles
// (the comparator isn't a valid/transitive one, so certain orderings come
// out more often than others depending on the sort algorithm's internal
// comparisons). Doesn't matter much for a 5-item tag-suggestion list, but
// it does matter for "pick a fair random sample of cards," which is
// exactly what was going wrong with category selection - so this is the
// one shuffle implementation everything should use going forward.
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
