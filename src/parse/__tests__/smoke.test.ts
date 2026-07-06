// Trivial smoke test — establishes the jest-expo test pattern for the parse layer.
// Real markdown-it/KaTeX parsing tests land with issue #4.

describe('parse layer smoke', () => {
  it('runs the test harness', () => {
    expect(1 + 1).toBe(2);
  });
});
