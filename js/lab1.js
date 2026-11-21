const APP_ORIGIN = window.location.origin;
const PORTAL_ORIGIN = "https://portal.example.invalid"; // fixed origin of the demo portal, used to resolve protocol-relative links in Vulnerable mode
const allowedPaths = ["/home", "/profile"];
const campaignDestination = document.querySelector("#campaign-destination");
const craftedLink = document.querySelector("#crafted-link");
const runButton = document.querySelector("#victim-open-link");
const resultBox = document.querySelector("#app-result");
const previewBox = document.querySelector("#redirect-preview");
const miniPage = document.querySelector("#redirect-mini-page");
const storyStatus = document.querySelector("#story-status");
const targetStep = document.querySelector("#target-step");
const stepThreeCard = document.querySelector(".target-card");
const sampleDestinations = {
  external: "https://account-check.example.invalid/sign-in",
  protocol: "//verify.example.invalid/session",
  internal: "/profile"
};

function getDestination(value) {
  try { return new URL(value, APP_ORIGIN).href; } catch { return null; }
}

/* Vulnerable mode only: every destination is resolved against the fixed portal origin. A protocol-relative link
   (//host/path) inherits the portal's https scheme, and a relative path such as /profile becomes
   https://portal.example.invalid/profile. This gives the same result in every environment (file://, localhost, hosted). */
function getVulnerableDestination(value) {
  try { return new URL(value, PORTAL_ORIGIN).href; } catch { return null; }
}

function getSafePath(value) {
  try {
    const target = new URL(value, APP_ORIGIN);
    if (target.origin !== APP_ORIGIN) return "/home";
    if (!allowedPaths.includes(target.pathname)) return "/home";
    return target.pathname;
  } catch { return "/home"; }
}

function updateCampaign(destination) {
  campaignDestination.textContent = destination;
  craftedLink.textContent = `https://portal.example.invalid/continue?next=${encodeURIComponent(destination)}`;
  storyStatus.textContent = "Step 1 complete: the attacker has prepared a link that appears to use the trusted portal.";
  targetStep.textContent = "Waiting for the victim to open the trusted-looking link.";
  previewBox.classList.remove("visible");
  miniPage.hidden = true;
  clearAppResult(resultBox);
}

function showDestination(destination, isExternal) {
  previewBox.classList.add("visible");
  miniPage.hidden = false;
  document.querySelector("#redirect-title").textContent = isExternal ? "External destination preview" : "Internal destination preview";
  document.querySelector("#redirect-address").textContent = destination;
  document.querySelector("#redirect-icon").textContent = isExternal ? "!" : "✓";
  document.querySelector("#mini-brand").textContent = isExternal ? "Untrusted example page" : "Example Account Portal";
  document.querySelector("#mini-warning").textContent = isExternal ? "External destination" : "Approved page";
  document.querySelector("#mini-title").textContent = isExternal ? (new URL(destination).hostname === "verify.example.invalid" ? "Session verification required" : "Sign-in required") : new URL(destination, APP_ORIGIN).pathname === "/profile" ? "Your profile" : "Portal home";
  document.querySelector("#mini-copy").textContent = isExternal ? "This is a local preview of where a real victim could be sent. No external page was opened." : "The portal kept the visitor on an approved internal page.";
}

function runRedirectTest() {
  const input = campaignDestination.textContent;
  const mode = document.querySelector("#workbench").dataset.mode;
  const parsed = mode === "vulnerable" ? getVulnerableDestination(input) : getDestination(input);
  if (!parsed) {
    showAppResult(resultBox, "Invalid destination", "The portal could not parse the destination.", "risk");
    return;
  }
  if (mode === "vulnerable") {
    const isExternal = new URL(parsed).origin !== PORTAL_ORIGIN;
    showDestination(parsed, isExternal);
    targetStep.textContent = isExternal ? "The portal accepted the attacker-controlled destination before checking trust." : "The selected internal destination was accepted.";
    storyStatus.textContent = isExternal ? "Step 3: vulnerable portal accepted the external destination. The local preview shows the phishing outcome safely." : "Step 3: the control destination is internal and safe.";
    showAppResult(resultBox, isExternal ? "External redirect accepted" : "Internal destination accepted", isExternal ? "The vulnerable flow reached the navigation sink with attacker-controlled data." : "This is the legitimate control case.", isExternal ? "risk" : "safe");
    return;
  }
  const safePath = getSafePath(input);
  const blocked = new URL(parsed).origin !== APP_ORIGIN || !allowedPaths.includes(new URL(parsed).pathname);
  showDestination(safePath, false);
  targetStep.textContent = blocked ? "The portal compared the origin and path with its allowlist before navigation." : "The portal accepted the approved internal path.";
  storyStatus.textContent = blocked ? "Step 3: the fixed portal blocked the untrusted destination and retained a safe route." : "Step 3: the fixed portal allowed the legitimate route.";
  showAppResult(resultBox, blocked ? "Untrusted destination blocked" : "Approved destination accepted", blocked ? "The allowlist prevented attacker-controlled navigation." : "The destination matches the portal allowlist.", "safe");
}

function clearRedirectResult() {
  previewBox.classList.remove("visible");
  miniPage.hidden = true;
  clearAppResult(resultBox);
  storyStatus.textContent = `Mode changed to ${document.querySelector("#workbench").dataset.mode}. Open the link again to run the same payload.`;
  targetStep.textContent = "Waiting for the victim to open the trusted-looking link.";
}

setupWorkbench(clearRedirectResult);
setupPayloadButtons((payloadName) => updateCampaign(sampleDestinations[payloadName]));
runButton.addEventListener("click", () => {
  runRedirectTest();
  scrollToStep(stepThreeCard); // after the preview is drawn, so the final position is known
});
updateCampaign(sampleDestinations.external);
document.querySelectorAll("[data-payload]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.payload === "external")));
