const WORKER_LIMIT_MS = 350;
const INPUT_LIMIT = 28;
const EXPENSIVE_MS = 40;
const NOTICEABLE_MS = 3;
const sampleLengths = { short: 12, medium: 20, long: 26 };
const inputBox = document.querySelector("#regex-input");
const requestPreview = document.querySelector("#request-preview");
const runButton = document.querySelector("#run-regex");
const meter = document.querySelector("#regex-meter");
const statusText = document.querySelector("#regex-status");
const timeText = document.querySelector("#regex-time");
const progressFill = document.querySelector("#regex-fill");
const meterCopy = document.querySelector("#regex-copy");
const resultBox = document.querySelector("#app-result");
const storyStatus = document.querySelector("#story-status");
const targetStep = document.querySelector("#target-step");
const workbench = document.querySelector("#workbench");
const stepThreeCard = document.querySelector(".target-card");
let activeWorker = null;
let activeTimer = null;
let runId = 0;          // identifies the current test so late results from an old test are ignored
let hasRunTest = false; // true once the current payload has been tested at least once

/* Same code as workers/regex-worker.js. It is only used when the browser refuses to load the
   worker file directly (for example when the page is opened from file:// instead of a server). */
const INLINE_WORKER_SOURCE = `
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
});`;

function createRegexWorker(useInline) {
  if (useInline) {
    const url = URL.createObjectURL(new Blob([INLINE_WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(url);
    worker.inlineUrl = url;
    return worker;
  }
  return new Worker("../workers/regex-worker.js");
}

function stopCurrentTest() {
  runId += 1; // any result still on its way from an older test is now stale
  if (activeTimer) clearTimeout(activeTimer);
  if (activeWorker) {
    activeWorker.terminate();
    if (activeWorker.inlineUrl) URL.revokeObjectURL(activeWorker.inlineUrl);
  }
  activeTimer = null;
  activeWorker = null;
  runButton.disabled = false;
}

/* Puts Step 3 back to its first, empty state. */
function resetObservableResult() {
  meter.classList.remove("visible");
  meter.dataset.state = "idle";
  statusText.textContent = "Waiting for a test";
  timeText.textContent = "—";
  progressFill.style.width = "0%";
  meterCopy.textContent = "Measured worker time appears here.";
  clearAppResult(resultBox);
}

function isAllowedPayload(value) {
  return Object.values(sampleLengths).some((length) => value === `${"a".repeat(length)}!`);
}

function setAttackInput(length) {
  stopCurrentTest();
  resetObservableResult();
  hasRunTest = false;
  const payload = `${"a".repeat(length)}!`;
  inputBox.value = payload;
  requestPreview.textContent = `POST /reference-check\n{ "reference": "${payload}" }`;
  storyStatus.textContent = "Step 1 complete: the attacker has submitted a near-match that fails at the final character.";
  targetStep.textContent = "Waiting for the target validator to process the crafted request.";
}

function describeVulnerable(elapsed, displayTime) {
  if (elapsed > EXPENSIVE_MS) {
    return { title: "Expensive match observed", message: `Measured processing time: ${displayTime}. Longer near-matches can grow sharply.`, state: "risk" };
  }
  if (elapsed >= NOTICEABLE_MS) {
    return { title: "Slowdown observed", message: `Measured processing time: ${displayTime}. The cost is already growing; try the longer payload to see it climb.`, state: "info" };
  }
  return { title: "Vulnerable pattern completed", message: `Measured processing time: ${displayTime}. This short input is still cheap; longer near-matches can grow sharply.`, state: "info" };
}

function showWorkerResult(result, mode) {
  const elapsed = Number(result.elapsed) || 0;
  const displayTime = elapsed < 1 ? "Under 1 ms" : `${elapsed.toFixed(1)} ms`;
  const outcome = mode === "vulnerable"
    ? describeVulnerable(elapsed, displayTime)
    : { title: "Fixed pattern completed", message: `The safer pattern handled the same input in ${displayTime}.`, state: "safe" };
  meter.classList.add("visible");
  meter.dataset.state = mode === "fixed" ? "safe" : outcome.state === "risk" ? "risk" : "info";
  if (mode === "vulnerable") {
    statusText.textContent = elapsed > EXPENSIVE_MS ? "Expensive match observed" : elapsed >= NOTICEABLE_MS ? "Slowdown observed" : "Low cost observed";
  } else {
    statusText.textContent = result.valid ? "Input accepted" : "Input rejected";
  }
  timeText.textContent = displayTime;
  progressFill.style.width = `${Math.max(2, Math.min(100, (elapsed / WORKER_LIMIT_MS) * 100))}%`;
  targetStep.textContent = mode === "vulnerable" ? "The target ran the nested pattern on attacker-controlled input." : "The target ran the predictable fixed pattern on the same attacker-controlled input.";
  meterCopy.textContent = mode === "vulnerable" ? "This is the measured worker time for the vulnerable pattern. Hardware changes the exact number." : "This is the measured worker time for the fixed pattern using the same text.";
  storyStatus.textContent = mode === "vulnerable" ? "Step 3: the target spent real worker CPU time processing the crafted input." : "Step 3: the fixed validator rejected the same input without nested backtracking.";
  showAppResult(resultBox, outcome.title, outcome.message, outcome.state);
}

function showWorkerTimeout(mode) {
  meter.classList.add("visible");
  if (mode === "fixed") {
    /* The fixed pattern is not slow. Reaching the limit here means the worker was still loading. */
    meter.dataset.state = "info";
    statusText.textContent = "Test did not finish";
    timeText.textContent = `${WORKER_LIMIT_MS} ms limit`;
    progressFill.style.width = "2%";
    targetStep.textContent = "The validator did not answer in time, so the sandbox stopped waiting.";
    meterCopy.textContent = "The fixed pattern is not slow. The worker most likely loaded slowly. Run the validation again.";
    storyStatus.textContent = "Step 3: no result arrived in time. This is not a vulnerability; run the validation again.";
    showAppResult(resultBox, "Test did not finish", "The fixed pattern cannot cause this delay. The worker file probably loaded slowly. Press Run target validation again.", "info");
    return;
  }
  meter.dataset.state = "risk";
  statusText.textContent = "Worker stopped at safety limit";
  timeText.textContent = `${WORKER_LIMIT_MS} ms limit`;
  progressFill.style.width = "100%";
  targetStep.textContent = "The vulnerable pattern was still processing; the sandbox terminated its isolated worker.";
  meterCopy.textContent = "The timeout protects this teaching page. It is not the production fix; the fixed pattern is the fix.";
  storyStatus.textContent = "Step 3: the crafted request consumed too much worker time, so the sandbox stopped it safely.";
  showAppResult(resultBox, "Expensive match stopped", "The vulnerable pattern exceeded the safe demonstration limit. The page remained responsive because the worker was isolated.", "risk");
}

function showWorkerFailure() {
  meter.classList.remove("visible");
  statusText.textContent = "Waiting for a test";
  showAppResult(resultBox, "Worker error", "The worker could not run. Use a static server or deployed site so the worker file can load.", "risk");
}

function startWorker(input, mode, currentRun, useInline) {
  let worker;
  try {
    worker = createRegexWorker(useInline);
  } catch (error) {
    // Some browsers refuse to build a worker from a file:// page; try the inline copy once.
    if (!useInline) return startWorker(input, mode, currentRun, true);
    stopCurrentTest();
    showWorkerFailure();
    return;
  }
  activeWorker = worker;
  worker.addEventListener("message", (event) => {
    if (currentRun !== runId) return; // result of an older test: ignore it
    stopCurrentTest();
    showWorkerResult(event.data, mode);
  });
  worker.addEventListener("error", () => {
    if (currentRun !== runId) return;
    if (!useInline) {
      worker.terminate();
      if (activeTimer) clearTimeout(activeTimer);
      startWorker(input, mode, currentRun, true);
      return;
    }
    stopCurrentTest();
    showWorkerFailure();
  });
  worker.postMessage({ mode, input });
  activeTimer = setTimeout(() => {
    if (currentRun !== runId) return;
    stopCurrentTest();
    showWorkerTimeout(mode);
  }, WORKER_LIMIT_MS);
}

function runRegexTest() {
  const input = inputBox.value;
  const mode = workbench.dataset.mode;
  if (!input || input.length > INPUT_LIMIT || !isAllowedPayload(input)) {
    showAppResult(resultBox, "Invalid test input", "Choose one of the attacker payloads in Step 1 first.", "risk");
    return false;
  }
  stopCurrentTest();
  const currentRun = runId;
  hasRunTest = true;
  runButton.disabled = true;
  meter.classList.add("visible");
  meter.dataset.state = "idle";
  statusText.textContent = "Target validator is processing…";
  timeText.textContent = "Measuring";
  progressFill.style.width = "12%";
  meterCopy.textContent = "The real regex runs in an isolated worker to keep this page safe.";
  clearAppResult(resultBox);
  startWorker(input, mode, currentRun, false);
  return true;
}

/* Switching Vulnerable/Fixed: discard the old result; if this payload was already tested, test it again in the new mode. */
function handleModeChange() {
  const hadRun = hasRunTest;
  stopCurrentTest();
  resetObservableResult();
  targetStep.textContent = "Waiting for the target validator to process the crafted request.";
  storyStatus.textContent = `Mode changed to ${workbench.dataset.mode}. Run the validation to see the result.`;
  if (hadRun && isAllowedPayload(inputBox.value)) runRegexTest();
}

function handlePayloadSelected(payloadName) {
  setAttackInput(sampleLengths[payloadName]);
}

/* The field is read-only: it can only be filled by choosing a payload. These guards cover paste, drop and typing. */
["beforeinput", "paste", "drop", "cut"].forEach((type) => inputBox.addEventListener(type, (event) => event.preventDefault()));

setupWorkbench(handleModeChange);
setupPayloadButtons(handlePayloadSelected);
/* Scroll once, when the test starts. The meter is already visible at this point, so the card's top position will not
   change when the worker answers later; switching modes calls runRegexTest() directly and therefore never scrolls. */
runButton.addEventListener("click", () => {
  if (runRegexTest()) scrollToStep(stepThreeCard);
});
window.addEventListener("beforeunload", stopCurrentTest);
setAttackInput(sampleLengths.short);
document.querySelector('[data-payload="short"]').setAttribute("aria-pressed", "true");
