// Minimal preload. Context isolation is on and node integration is off; no
// privileged APIs are exposed to the renderer, which runs the standard web app.
window.addEventListener("DOMContentLoaded", () => {
  // Intentionally empty: the desktop shell exposes nothing extra to the page.
});
