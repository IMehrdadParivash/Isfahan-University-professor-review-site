/* Loading animation without avatar assets. */
(() => {
  const loader = document.getElementById("storyLoader");
  if (!loader) return;

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const terminal = loader.querySelector(".story-terminal");
  const prompt = loader.querySelector(".story-prompt");
  const caption = loader.querySelector(".story-ai span");
  const code = loader.querySelector(".story-code");
  const frames = [
    ["> initialize", "Professor Scout", 4],
    ["> load data", "Loading data", 8],
    ["> normalize", "Preparing", 12],
    ["> scan reviews", "Reading signals", 16],
    ["> scan reviews", "Reading signals", 20],
    ["> collect", "Collecting", 24],
    ["> collect", "Collecting", 28],
    ["> analyze", "Analyzing", 32],
    ["> analyze", "Analyzing", 36],
    ["> filter", "Filtering", 40],
    ["> filter", "Filtering", 44],
    ["> validate", "Quality check", 48],
    ["> extract patterns", "Extracting patterns", 52],
    ["> process", "Processing", 56],
    ["> aggregate", "Aggregating", 60],
    ["> build results", "Building results", 64],
    ["> verify", "Verifying", 68],
    ["> verify", "Verifying", 72],
    ["> final analysis", "Almost there", 76],
    ["> prepare results", "Preparing results", 80],
    ["> final check", "Final check", 85],
    ["> ready", "Ready", 90],
    ["> Professor Scout ready", "Ready to choose", 96],
    ["> start", "Professor Scout", 100]
  ];

  const frameDuration = 100;
  const storyboardDuration = frames.length * frameDuration;
  const failSafe = 5000;
  const started = performance.now();
  let ready = document.documentElement.dataset.appReady === "true" || document.documentElement.classList.contains("data-load-failed");
  let finished = false;
  let lastFrame = -1;

  function renderFrame(frame) {
    const [promptText, captionText, progress] = frame;
    loader.style.setProperty("--ps-progress", `${progress}%`);
    if (prompt) prompt.textContent = promptText;
    if (caption) caption.textContent = captionText;
    if (terminal) terminal.style.transform = progress > 50 ? "translateY(-1px)" : "none";
    if (code) {
      code.querySelectorAll("i").forEach((line, index) => {
        line.style.opacity = String(Math.max(.25, Math.min(1, progress / 100 - index * .04)));
      });
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    renderFrame(frames[frames.length - 1]);
    loader.classList.add("ready");
    window.setTimeout(() => loader.classList.add("hide"), reduced ? 0 : 260);
  }

  const markReady = () => { ready = true; };
  document.addEventListener("ui:data-ready", markReady, { once: true });
  document.addEventListener("ui:data-failed", markReady, { once: true });

  if (reduced) {
    renderFrame(frames[frames.length - 1]);
    window.setTimeout(finish, ready ? 120 : 900);
    return;
  }

  function animate(timestamp) {
    if (finished) return;
    const elapsed = timestamp - started;
    const index = Math.min(frames.length - 1, Math.floor(elapsed / frameDuration));
    if (index !== lastFrame) {
      lastFrame = index;
      renderFrame(frames[index]);
    }
    if ((ready && elapsed >= storyboardDuration) || elapsed >= failSafe) {
      finish();
      return;
    }
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
})();
