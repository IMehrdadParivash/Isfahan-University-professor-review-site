/* Twenty-four loading storyboard frames. Each frame is held for 100 ms (~2.4 s total). */
(() => {
  const loader = document.getElementById("storyLoader");
  const avatar = loader?.querySelector(".story-avatar");
  if (!loader || !avatar) return;

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fallback = "assets/avatar/loader-avatar.webp";
  const poses = {
    walk: "assets/avatar/pose-walk.webp",
    think: "assets/avatar/pose-think.webp",
    work: "assets/avatar/pose-work.webp",
    success: "assets/avatar/pose-success.webp"
  };

  const terminal = loader.querySelector(".story-terminal");
  const prompt = loader.querySelector(".story-prompt");
  const caption = loader.querySelector(".story-ai span");
  const code = loader.querySelector(".story-code");

  const frames = [
    { pose: "walk", x: 26, y: 3, opacity: .15, prompt: "> built by Mehrdad", caption: "Professor Scout", progress: 3 },
    { pose: "walk", x: 21, y: 2, opacity: .45, prompt: "> built by Mehrdad", caption: "Initializing", progress: 7 },
    { pose: "walk", x: 17, y: 1, opacity: .68, prompt: "> initialize", caption: "Professor Scout", progress: 11 },
    { pose: "walk", x: 12, y: 0, opacity: .86, prompt: "> initialize", caption: "Preparing workspace", progress: 15 },
    { pose: "think", x: 8, y: -1, opacity: 1, prompt: "> scan student reviews", caption: "Reading signals", progress: 19 },
    { pose: "think", x: 5, y: -2, opacity: 1, prompt: "> scan student reviews", caption: "Reading signals", progress: 23 },
    { pose: "think", x: 3, y: -3, opacity: 1, prompt: "> collect data", caption: "Collecting", progress: 27 },
    { pose: "think", x: 1, y: -2, opacity: 1, prompt: "> collect data", caption: "Collecting more", progress: 31 },
    { pose: "think", x: 0, y: -1, opacity: 1, prompt: "> analyze", caption: "Quick check", progress: 35 },
    { pose: "think", x: 0, y: -3, opacity: 1, prompt: "> analyze", caption: "Analyzing", progress: 39 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> filtering signals", caption: "Filtering", progress: 44 },
    { pose: "work", x: 0, y: 0, opacity: 1, prompt: "> filtering complete ✓", caption: "Data ready", progress: 48 },
    { pose: "work", x: -1, y: -1, opacity: 1, prompt: "> deep dive", caption: "Deep dive", progress: 53 },
    { pose: "work", x: -1, y: -2, opacity: 1, prompt: "> extract patterns", caption: "Extracting patterns", progress: 58 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> processing", caption: "Processing", progress: 63 },
    { pose: "work", x: 1, y: 0, opacity: 1, prompt: "> build comparisons", caption: "Building comparisons", progress: 68 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> aggregate data", caption: "Aggregating", progress: 73 },
    { pose: "work", x: 1, y: -2, opacity: 1, prompt: "> check quality", caption: "Quality check", progress: 78 },
    { pose: "work", x: 0, y: 0, opacity: 1, prompt: "> final analysis", caption: "Almost there", progress: 82 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> preparing results", caption: "Preparing results", progress: 86 },
    { pose: "think", x: 0, y: -1, opacity: 1, prompt: "> final check", caption: "Final check", progress: 90 },
    { pose: "success", x: 0, y: -3, opacity: 1, prompt: "> ready ✓", caption: "Ready", progress: 94 },
    { pose: "success", x: 0, y: -2, opacity: 1, prompt: "> Professor Scout ready ✓", caption: "Ready to choose", progress: 98 },
    { pose: "success", x: 0, y: 0, opacity: 1, prompt: "> let's go!", caption: "Professor Scout", progress: 100 }
  ];

  const frameDuration = 100;
  const storyboardDuration = frames.length * frameDuration;
  const failSafe = 5000;
  const started = performance.now();
  let ready = document.documentElement.dataset.appReady === "true" ||
    document.documentElement.classList.contains("data-load-failed");
  let finished = false;
  let lastFrame = -1;

  function renderFrame(frame) {
    const source = poses[frame.pose] || fallback;
    if (avatar.getAttribute("src") !== source) {
      avatar.onerror = () => {
        avatar.onerror = null;
        avatar.src = fallback;
      };
      avatar.src = source;
    }

    avatar.style.opacity = String(frame.opacity);
    avatar.style.transform = `translate(${frame.x}px, ${frame.y}px)`;
    loader.style.setProperty("--ps-progress", `${frame.progress}%`);

    if (prompt) prompt.textContent = frame.prompt;
    if (caption) caption.textContent = frame.caption;
    if (terminal) terminal.style.transform = frame.pose === "work" ? "translateY(-1px)" : "none";

    if (code) {
      code.querySelectorAll("i").forEach((line, index) => {
        line.style.opacity = String(Math.max(.25, Math.min(1, frame.progress / 100 - index * .04)));
      });
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    renderFrame(frames[frames.length - 1]);
    loader.style.setProperty("--ps-progress", "100%");
    loader.classList.add("ready");
    window.setTimeout(() => loader.classList.add("hide"), reduced ? 0 : 260);
  }

  function markReady() {
    ready = true;
  }

  document.addEventListener("ui:data-ready", markReady, { once: true });
  document.addEventListener("ui:data-failed", markReady, { once: true });

  if (reduced) {
    renderFrame(frames[frames.length - 1]);
    window.setTimeout(finish, ready ? 120 : 900);
    return;
  }

  Object.values(poses).forEach(source => {
    const image = new Image();
    image.src = source;
  });

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
