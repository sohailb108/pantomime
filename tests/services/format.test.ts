import { describe, expect, it } from 'vitest';
import { formatNumber, formatSigned } from '@/services/format';

describe('formatNumber', () => {
  it('uses Latin digits for English and Persian digits for Persian', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(45, 'fa')).toBe('۴۵');
  });
});

describe('formatSigned', () => {
  it('shows the sign except for zero', () => {
    expect(formatSigned(5, 'en')).toBe('+5');
    expect(formatSigned(-5, 'en')).toBe('-5');
    expect(formatSigned(0, 'en')).toBe('0');
  });

  it('uses Persian digits with a sign in Persian', () => {
    const out = formatSigned(12, 'fa');
    expect(out).toContain('۱۲');
    expect(out).toContain('+');
  });
});
