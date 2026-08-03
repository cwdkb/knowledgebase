// Knowledge Base — sticky page header behaviour. Shared across every KB page; the
// compact ".scrolled" styling itself lives in search-widget.css, which already governs
// .sticky-head layout everywhere.
(function () {
  var head = document.querySelector('.sticky-head');
  if (!head) return;

  // Shrink-on-scroll is DISABLED.
  //
  // Toggling .scrolled changes the page's layout, which changes the scrollable range,
  // which moves scrollY, which re-triggers the toggle — the header oscillated visibly
  // ("shaking"). Measured live on the CRM Playbook, the scroll range swung between 131px
  // (expanded) and 471px (collapsed): the collapse was driving ~340px of layout change on
  // a page with only ~131px of scroll room, so the state could never settle. Hysteresis
  // isn't enough against a swing that large — the two states have to stop changing the
  // document's height, or the behaviour has to go.
  //
  // A static header costs a little vertical room and has no failure mode. Flip this to
  // true to restore the old behaviour, but fix the height swing first: find what grows by
  // ~340px between the two states (the collapse is supposed to make the page shorter, not
  // longer) and make the collapse layout-neutral.
  var ENABLE_SHRINK = false;

  if (!ENABLE_SHRINK) {
    // Clear it in case a previous page state left the class on.
    head.classList.remove('scrolled');
    return;
  }

  // Separate add/remove thresholds (hysteresis) so a small layout nudge can't flip the
  // state straight back, plus a floor on scrollable room — collapsing wins back no
  // viewport on a page that barely scrolls.
  var ON = 24;
  var OFF = 8;
  var MIN_SCROLLABLE = 160;

  var ticking = false;
  function update() {
    ticking = false;
    var doc = document.scrollingElement || document.documentElement;
    var collapsed = head.classList.contains('scrolled');
    var scrollable = doc.scrollHeight - window.innerHeight;
    var y = window.scrollY;

    if (collapsed) {
      if (y < OFF) head.classList.remove('scrolled');
    } else if (y > ON && scrollable >= MIN_SCROLLABLE) {
      head.classList.add('scrolled');
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();
