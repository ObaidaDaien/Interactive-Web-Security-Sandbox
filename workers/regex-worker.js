const MAX_INPUT_LENGTH = 28;
const vulnerablePattern = /^(a+)+$/;
const safePattern = /^a+$/;

self.addEventListener("message", (event) => {
  const { mode, input } = event.data;
  const startedAt = performance.now();
  if (typeof input !== "string" || input.length > MAX_INPUT_LENGTH) {
    self.postMessage({ valid: false, elapsed: performance.now() - startedAt });
    return;
  }
  const pattern = mode === "fixed" ? safePattern : vulnerablePattern;
  const valid = pattern.test(input);
  self.postMessage({ valid, elapsed: performance.now() - startedAt });
});
