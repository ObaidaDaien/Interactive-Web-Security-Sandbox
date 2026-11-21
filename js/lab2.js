const TRUSTED_ORIGIN = "https://trusted.example";
const senderOrigin = document.querySelector("#sender-origin");
const payloadPreview = document.querySelector("#message-payload");
const sendButton = document.querySelector("#send-message");
const resultBox = document.querySelector("#app-result");
const receiverOrigin = document.querySelector("#receiver-origin");
const receiverActivity = document.querySelector("#receiver-activity");
const memberPreview = document.querySelector("#member-preview");
const memberName = document.querySelector("#member-name");
const memberRole = document.querySelector("#member-role");
const storyStatus = document.querySelector("#story-status");
const validationStep = document.querySelector("#validation-step");
const stepThreeCard = document.querySelector(".target-card");
const sampleOrigins = {
  attacker: "https://attacker.example",
  lookalike: "https://trusted.example.attacker.invalid",
  trusted: TRUSTED_ORIGIN
};

function showMemberCard(name, role) {
  memberPreview.hidden = false;
  memberName.textContent = name;
  memberRole.textContent = `Role: ${role}`;
  receiverActivity.textContent = "The portal opened the member card.";
}

function receiveVulnerableMessage(event) {
  const message = event.data;
  if (!message || typeof message !== "object" || message.type !== "SHOW_MEMBER") return false;
  showMemberCard(message.name, message.role);
  return true;
}

function receiveFixedMessage(event) {
  if (event.origin !== TRUSTED_ORIGIN) return false;
  const message = event.data;
  if (!message || typeof message !== "object" || message.type !== "SHOW_MEMBER") return false;
  if (typeof message.name !== "string" || typeof message.role !== "string") return false;
  showMemberCard(message.name, message.role);
  return true;
}

function selectSender(origin) {
  senderOrigin.textContent = origin;
  payloadPreview.textContent = '{ type: "SHOW_MEMBER", name: "Demo Member", role: "Example Viewer" }';
  storyStatus.textContent = "Step 1 complete: the sender page has prepared a message for the victim's trusted portal.";
  validationStep.textContent = "Waiting for the attacker page to send its message.";
  memberPreview.hidden = true;
  clearAppResult(resultBox);
}

function sendTestMessage() {
  const origin = senderOrigin.textContent;
  const message = { type: "SHOW_MEMBER", name: "Demo Member", role: "Example Viewer" };
  const mode = document.querySelector("#workbench").dataset.mode;
  receiverOrigin.textContent = `Incoming origin: ${origin}`;
  memberPreview.hidden = true;
  receiverActivity.textContent = "The receiver is checking the incoming message…";
  const testEvent = new MessageEvent("message", { origin, data: message });
  const accepted = mode === "fixed" ? receiveFixedMessage(testEvent) : receiveVulnerableMessage(testEvent);
  if (accepted) {
    const isUntrusted = origin !== TRUSTED_ORIGIN;
    validationStep.textContent = mode === "vulnerable" ? "Receiver checked only the message type; event.origin was never compared." : "Receiver matched the exact trusted origin and validated the data.";
    storyStatus.textContent = isUntrusted && mode === "vulnerable" ? "Step 3: an untrusted sender changed the trusted portal's local member card." : "Step 3: the expected trusted message was accepted.";
    showAppResult(resultBox, isUntrusted && mode === "vulnerable" ? "Untrusted message accepted" : "Trusted message accepted", isUntrusted && mode === "vulnerable" ? "The action ran because the vulnerable receiver skipped origin validation." : "The sender met the receiver's security checks.", isUntrusted && mode === "vulnerable" ? "risk" : "safe");
  } else {
    receiverActivity.textContent = "The receiver did not open the member card.";
    validationStep.textContent = `Rejected: ${origin} does not equal ${TRUSTED_ORIGIN}.`;
    storyStatus.textContent = "Step 3: the fixed receiver blocked the untrusted or lookalike sender.";
    showAppResult(resultBox, "Message rejected", "The receiver refused the message before performing the action.", "safe");
  }
}

function clearMessageResult() {
  receiverOrigin.textContent = "Trusted portal is waiting for a message.";
  receiverActivity.textContent = "The member panel is closed.";
  validationStep.textContent = "Waiting for the attacker page to send its message.";
  storyStatus.textContent = `Mode changed to ${document.querySelector("#workbench").dataset.mode}. Send the message again to run the same payload.`;
  memberPreview.hidden = true;
  clearAppResult(resultBox);
}

setupWorkbench(clearMessageResult);
setupPayloadButtons((payloadName) => selectSender(sampleOrigins[payloadName]));
sendButton.addEventListener("click", () => {
  sendTestMessage();
  scrollToStep(stepThreeCard); // after the receiver result is drawn, so the final position is known
});
selectSender(sampleOrigins.attacker);
document.querySelectorAll("[data-payload]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.payload === "attacker")));
