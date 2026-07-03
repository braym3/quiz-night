// Stable ordering for rounds/questions stored as keyed objects.
// Sorts by an optional numeric `order` field, falling back to natural key
// order (so q2 comes before q10).

export const orderedEntries = (obj) => Object.entries(obj || {}).sort((a, b) => {
  const ao = a[1]?.order;
  const bo = b[1]?.order;
  if (typeof ao === 'number' || typeof bo === 'number') {
    return (ao ?? Infinity) - (bo ?? Infinity) || a[0].localeCompare(b[0], undefined, { numeric: true });
  }
  return a[0].localeCompare(b[0], undefined, { numeric: true });
});

export const orderedKeys = (obj) => orderedEntries(obj).map(([k]) => k);
