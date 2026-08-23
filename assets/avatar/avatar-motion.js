/* Twenty-four storyboard poses, rendered at 24 fps only while the static roster loads. */
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
    { pose: "walk", x: 26, y: 3, opacity: .15, prompt: "> Built by Mehrdad", caption: "Professor Scout", progress: 3 },
    { pose: "walk", x: 21, y: 2, opacity: .45, prompt: "> Built by Mehrdad", caption: "Opening local roster", progress: 7 },
    { pose: "walk", x: 17, y: 1, opacity: .68, prompt: "> initialize", caption: "Opening local roster", progress: 11 },
    { pose: "walk", x: 12, y: 0, opacity: .86, prompt: "> initialize", caption: "Preparing workspace", progress: 15 },
    { pose: "think", x: 8, y: -1, opacity: 1, prompt: "> read verified roster", caption: "Verified faculty roster", progress: 19 },
    { pose: "think", x: 5, y: -2, opacity: 1, prompt: "> read verified roster", caption: "Verified faculty roster", progress: 23 },
    { pose: "think", x: 3, y: -3, opacity: 1, prompt: "> check public data", caption: "Privacy-safe evidence", progress: 27 },
    { pose: "think", x: 1, y: -2, opacity: 1, prompt: "> check public data", caption: "Privacy-safe evidence", progress: 31 },
    { pose: "think", x: 0, y: -1, opacity: 1, prompt: "> validate samples", caption: "Checking sample sizes", progress: 35 },
    { pose: "think", x: 0, y: -3, opacity: 1, prompt: "> validate samples", caption: "Checking sample sizes", progress: 39 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> prepare filters", caption: "Faculty and course filters", progress: 44 },
    { pose: "work", x: 0, y: 0, opacity: 1, prompt: "> prepare filters", caption: "Faculty and course filters", progress: 48 },
    { pose: "work", x: -1, y: -1, opacity: 1, prompt: "> organize courses", caption: "Verified course evidence", progress: 53 },
    { pose: "work", x: -1, y: -2, opacity: 1, prompt: "> organize courses", caption: "Verified course evidence", progress: 58 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> check dimensions", caption: "Course-level indicators", progress: 63 },
    { pose: "work", x: 1, y: 0, opacity: 1, prompt: "> check dimensions", caption: "Course-level indicators", progress: 68 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> prepare comparison", caption: "Shared courses only", progress: 73 },
    { pose: "work", x: 1, y: -2, opacity: 1, prompt: "> prepare comparison", caption: "Shared courses only", progress: 78 },
    { pose: "work", x: 0, y: 0, opacity: 1, prompt: "> build professor cards", caption: "Preparing results", progress: 82 },
    { pose: "work", x: 0, y: -1, opacity: 1, prompt: "> build professor cards", caption: "Preparing results", progress: 86 },
    { pose: "think", x: 0, y: -1, opacity: 1, prompt: "> final privacy check", caption: "One last check", progress: 90 },
    { pose: "success", x: 0, y: -3, opacity: 1, prompt: "> ready", caption: "Ready to choose", progress: 94 },
    { pose: "success", x: 0, y: -2, opacity: 1, prompt: "> Professor Scout ready", caption: "Verified and ready", progress: 98 },
    { pose: "success", x: 0, y: 0, opacity: 1, prompt: "> choose smarter", caption: "Built by Mehrdad", progress: 100 }
  ];
  const frameDuration = 1000 / 24;
  const minimumVisible = 600;
  const failSafe = 4500;
  const started = performance.now();
  let ready = document.documentElement.dataset.appReady === "true" ||
    document.documentElement.classList.contains("data-load-failed");
  let finished = false;
  let lastFrame = -1;

  function renderFrame(frame) {
    const source = poses[frame.pose] || fallback;
    if (avatar.getAttribute("src") !== source) {
      avatar.onerror = () => { avatar.onerror = null; avatar.src = fallback; };
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
    loader.style.setProperty("--ps-progress", "100%");
    loader.classList.add("ready");
    window.setTimeout(() => loader.classList.add("hide"), reduced ? 0 : 180);
  }

  function markReady() {
    ready = true;
    if (reduced) finish();
  }

  document.addEventListener("ui:data-ready", markReady, { once: true });
  document.addEventListener("ui:data-failed", markReady, { once: true });

  if (reduced) {
    renderFrame(frames.at(-1));
    if (ready) finish();
    else window.setTimeout(finish, 900);
    return;
  }

  for (const source of Object.values(poses)) {
    const image = new Image();
    image.src = source;
  }

  function animate(timestamp) {
    if (finished) return;
    const elapsed = timestamp - started;
    const index = Math.min(frames.length - 1, Math.floor(elapsed / frameDuration));
    if (index !== lastFrame) {
      lastFrame = index;
      renderFrame(frames[index]);
    }
    if ((ready && elapsed >= minimumVisible) || elapsed >= failSafe) {
      finish();
      return;
    }
    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
})();
