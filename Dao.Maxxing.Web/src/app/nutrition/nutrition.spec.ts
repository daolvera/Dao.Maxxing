import {
  dateInZone,
  fromKilograms,
  isValidDate,
  isValidTimeZone,
  macroCalories,
  offsetDate,
  portion,
  scale,
  sum,
  toKilograms,
} from './nutrition';

describe('nutrition helpers', () => {
  const oats = { calories: 150, protein: 5, carbs: 27, fat: 3, grams: 40 };

  it('scales and sums nutrition', () => {
    expect(scale(oats, 2).calories).toBe(300);
    expect(sum([scale(oats, 0.5), scale(oats, 0.5)]).protein).toBe(5);
    expect(sum([]).calories).toBe(0);
  });

  it('converts a gram portion through the serving weight', () => {
    expect(portion(oats, 20, 'g').calories).toBe(75);
    expect(portion(oats, 2, 'serving').carbs).toBe(54);
  });

  it('derives calories from macros', () => {
    expect(macroCalories({ protein: 10, carbs: 10, fat: 10 })).toBe(170);
  });

  it('round-trips weights between units', () => {
    expect(toKilograms(fromKilograms(80, 'lb'), 'lb')).toBeCloseTo(80);
    expect(toKilograms(80, 'kg')).toBe(80);
  });

  it('moves and validates calendar dates', () => {
    expect(offsetDate('2026-02-28', 1)).toBe('2026-03-01');
    expect(offsetDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('not a date')).toBe(false);
  });

  it('reads the calendar date in a time zone', () => {
    const instant = new Date('2026-03-15T02:00:00Z');
    expect(dateInZone('UTC', instant)).toBe('2026-03-15');
    expect(dateInZone('America/Los_Angeles', instant)).toBe('2026-03-14');
    expect(isValidTimeZone('America/Los_Angeles')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
