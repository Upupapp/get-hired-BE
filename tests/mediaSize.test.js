/**
 * helpers/mediaSize.js — the byte count Recruitment Storage bills on.
 *
 * Storage is metered per employer from stored_media.size_bytes, and nothing later
 * contradicts a wrong size (reconciliation re-sums link rows, never the bucket). So
 * the size must be measured from the bytes the server received, never taken from
 * the client.
 *
 * Pure module: no DB, no network.
 */

import { decodedByteLength, measureDataUrlBytes, resolveMediaSizeBytes } from '../helpers/mediaSize';

function dataUrl(mime, bytes, fill) {
  return 'data:' + mime + ';base64,' + Buffer.alloc(bytes, fill || 1).toString('base64');
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('decodedByteLength recovers the exact byte count across every padding case', () => {
  it.each([1, 2, 3, 4, 5, 255, 1024, 1048576, 3 * 1048576 + 1])('%i bytes', (n) => {
    expect(decodedByteLength(Buffer.alloc(n, 7).toString('base64'))).toBe(n);
  });

  it('reports a truncated payload as unknown rather than guessing', () => {
    expect(decodedByteLength('QUJDRA')).toBeNull();
  });
});

describe('measureDataUrlBytes', () => {
  it('measures a video data URL exactly', () => {
    expect(measureDataUrlBytes(dataUrl('video/mp4', 5 * 1048576 + 3))).toBe(5 * 1048576 + 3);
  });

  it('measures a PDF data URL', () => {
    expect(measureDataUrlBytes(dataUrl('application/pdf', 1234))).toBe(1234);
  });

  it('tolerates line breaks inside a long payload', () => {
    const wrapped = 'data:image/png;base64,' + Buffer.alloc(900).toString('base64').replace(/(.{40})/g, '$1\n');
    expect(measureDataUrlBytes(wrapped)).toBe(900);
  });

  it.each([
    ['an https URL being re-attached', 'https://cdn.example.com/a.pdf'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['a non-base64 data URL', 'data:text/plain,hello'],
  ])('returns null, never 0, for %s', (_label, input) => {
    expect(measureDataUrlBytes(input)).toBeNull();
  });
});

describe('resolveMediaSizeBytes — the server measurement wins', () => {
  const fiveMb = dataUrl('video/mp4', 5 * 1048576, 9);

  it('overrides a client claiming 1 byte for a 5 MB video', () => {
    expect(resolveMediaSizeBytes(fiveMb, 1, 'test')).toBe(5 * 1048576);
    expect(console.warn).toHaveBeenCalled();
  });

  it('overrides over-reporting too', () => {
    expect(resolveMediaSizeBytes(fiveMb, 999999999, 'test')).toBe(5 * 1048576);
  });

  it('uses the caller-supplied size only when there are no bytes to measure (re-attach), and logs it', () => {
    expect(resolveMediaSizeBytes(null, 4096, 'reattach')).toBe(4096);
    expect(console.log).toHaveBeenCalled();
  });

  it.each([
    ['no claim', undefined],
    ['a non-numeric claim', 'abc'],
    ['a negative claim', -5],
  ])('with no bytes and %s, returns null (unknown), never 0', (_label, claim) => {
    expect(resolveMediaSizeBytes(null, claim, 'reattach')).toBeNull();
  });
});
