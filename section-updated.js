// Knowledge Base — per-section "Updated" stamp, included on every KB content page.
// Reads data-updated="<ISO8601>" set on each <section id="..."> (currently populated from
// real git commit history) and renders it next to that section's heading (<h2> for the
// first "Overview" section, .group-label for the rest), formatted in the viewer's
// preferred timezone (see timezone.js). Right now every section shares the same date —
// they all entered git in one bulk import — but any section touched and committed from
// here on gets its own real, distinct date.
// Plain script (not type="module") on purpose — see search-widget.js for why.

(function () {
  var sections = document.querySelectorAll('section[data-updated]');
  if (!sections.length) return;

  var style = document.createElement('style');
  style.textContent =
    '.explainer h2, .explainer .group-label { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; }' +
    '.section-updated { font-family: "Archivo", sans-serif; font-size: 10.5px; letter-spacing: 0.3px; text-transform: none; font-weight: 500; color: #8A8A8A; white-space: nowrap; }';
  document.head.appendChild(style);

  function formatUpdated(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var tz = window.cwdTimezone ? window.cwdTimezone.get() : 'America/New_York';
    var dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
    var timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' };
    if (tz) {
      dateOpts.timeZone = tz;
      timeOpts.timeZone = tz;
    }
    return 'Updated ' + d.toLocaleDateString('en-US', dateOpts) + ' · ' + d.toLocaleTimeString('en-US', timeOpts);
  }

  Array.prototype.forEach.call(sections, function (section) {
    var heading = section.querySelector(':scope > h2, :scope > .group-label');
    if (!heading) return;
    var text = formatUpdated(section.getAttribute('data-updated'));
    if (!text) return;

    var textSpan = document.createElement('span');
    textSpan.className = 'group-label-text';
    while (heading.firstChild) textSpan.appendChild(heading.firstChild);

    var stamp = document.createElement('span');
    stamp.className = 'section-updated';
    stamp.textContent = text;

    heading.appendChild(textSpan);
    heading.appendChild(stamp);
  });
})();
