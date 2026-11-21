/* Shared navigation and presentation behavior for the investigation interface. */
const menuButton = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector(".main-nav");

if (document.title.includes("URL Redirect")) document.body.classList.add("lab1-case");
if (document.title.includes("postMessage")) document.body.classList.add("lab2-case");
if (document.title.includes("ReDoS")) document.body.classList.add("lab3-case");

if (menuButton && mainNavigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = mainNavigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  mainNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNavigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

function installCodeReveals() {
  document.documentElement.classList.add("js-enhanced");
  document.querySelectorAll(".code-panel").forEach((panel, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "casefile-toggle";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span>OPEN CODE EVIDENCE ${String(index + 1).padStart(2, "0")}</span><i aria-hidden="true">+</i>`;
    panel.before(button);
    panel.querySelectorAll(".code-line").forEach((line, lineIndex) => {
      line.style.setProperty("--line-delay", `${lineIndex * 70}ms`);
    });
    button.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("is-revealed");
      button.setAttribute("aria-expanded", String(isOpen));
      button.innerHTML = isOpen ? '<span>CLOSE CODE EVIDENCE</span><i aria-hidden="true">−</i>' : `<span>OPEN CODE EVIDENCE ${String(index + 1).padStart(2, "0")}</span><i aria-hidden="true">+</i>`;
      if (isOpen) panel.querySelector(".code-lines")?.focus({ preventScroll: true });
    });
  });
}

function installStoryProgress() {
  document.querySelectorAll(".scenario-flow").forEach((flow) => {
    flow.dataset.activeStep = "1";
    flow.querySelectorAll("[data-payload]").forEach((button) => {
      button.addEventListener("click", () => {
        flow.dataset.activeStep = "1";
        flow.classList.remove("scenario-complete");
        flow.classList.add("scenario-armed");
      });
    });
    flow.querySelectorAll("#victim-open-link, #send-message, #run-regex").forEach((button) => {
      button.addEventListener("click", () => {
        flow.dataset.activeStep = "2";
        window.setTimeout(() => {
          flow.dataset.activeStep = "3";
          flow.classList.add("scenario-complete");
        }, 120);
      });
    });
  });
}

function installPixelAtmosphere() {
  const atmosphere = document.createElement("div");
  atmosphere.className = "pixel-atmosphere";
  atmosphere.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 26; index += 1) {
    const pixel = document.createElement("i");
    pixel.style.setProperty("--x", `${(index * 37) % 100}%`);
    pixel.style.setProperty("--delay", `${-((index * 19) % 24)}s`);
    pixel.style.setProperty("--duration", `${4 + ((index * 7) % 5)}s`);
    pixel.style.setProperty("--size", `${2 + (index % 4)}px`);
    atmosphere.append(pixel);
  }
  document.body.prepend(atmosphere);
  document.querySelectorAll("button, .button").forEach((control) => {
    control.addEventListener("click", () => {
      control.classList.remove("pixel-impact");
      requestAnimationFrame(() => control.classList.add("pixel-impact"));
      setTimeout(() => control.classList.remove("pixel-impact"), 180);
    });
  });
}

function installRoleSymbols() {
  const roles = [
    [".attacker-card", "⚠", "Attacker"],
    [".victim-card", "◉", "Victim or target"],
    [".target-card", "▣", "System result"]
  ];
  roles.forEach(([selector, symbol, label]) => {
    document.querySelectorAll(selector).forEach((card) => {
      const marker = document.createElement("span");
      marker.className = "role-symbol";
      marker.setAttribute("aria-label", label);
      marker.textContent = symbol;
      card.prepend(marker);
    });
  });
}

installCodeReveals();
installStoryProgress();
installPixelAtmosphere();
installRoleSymbols();
