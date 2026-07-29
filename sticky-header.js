// Knowledge Base — shrinks the pinned sticky-head once the page scrolls (smaller
// logo, tighter padding), so it takes up less room once you're past the top of
// the page. Shared across every KB page; shrink styling lives in search-widget.css
// since that file already governs .sticky-head layout on every page.
(function () {
  var head = document.querySelector('.sticky-head');
  if (!head) return;

  var ticking = false;
  function update() {
    head.classList.toggle('scrolled', window.scrollY > 24);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();
