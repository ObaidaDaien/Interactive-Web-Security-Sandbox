/* Shared controls keep the same workbench behavior in every lab. */
function setupWorkbench(onModeChange) {
  const workbench = document.querySelector(".workbench");
  if (!workbench) return;

  const modeButtons = workbench.querySelectorAll("[data-mode]");
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      workbench.dataset.mode = button.dataset.mode;
      modeButtons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      if (onModeChange) onModeChange(button.dataset.mode);
    });
  });
}

function setupPayloadButtons(onSelect) {
  const buttons = document.querySelectorAll("[data-payload]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      onSelect(button.dataset.payload, button);
    });
  });
}

function showAppResult(box, title, message, state) {
  box.hidden = false;
  box.classList.add("visible");
  box.dataset.state = state;
  box.querySelector(".app-result-heading").textContent = title;
  box.querySelector(".app-result-message").textContent = message;
}

function clearAppResult(box) {
  box.hidden = true;
  box.classList.remove("visible");
  box.dataset.state = "idle";
  box.querySelector(".app-result-heading").textContent = "";
  box.querySelector(".app-result-message").textContent = "";
}

/* Smoothly brings a card (for example "Step 3") into view after a button press.
   - The sticky header is respected through html { scroll-padding-top } in style.css.
   - Nothing moves if the card is already fully visible, so the page never jitters.
   - scrollIntoView replaces any smooth scroll already running, so quick repeated clicks do not stack animations.
   - "Reduce motion" users get an instant jump instead of an animation.
   Call it only AFTER the card's content has been updated, so its final position is measured. */
function scrollToStep(element) {
  if (!element) return;
  const header = document.querySelector(".site-header");
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  const rect = element.getBoundingClientRect();
  if (rect.top >= headerBottom && rect.bottom <= window.innerHeight) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
