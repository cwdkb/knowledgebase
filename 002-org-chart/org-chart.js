(function () {
  var scaleEl = document.getElementById('orgTreeScale');
  var label = document.getElementById('zoomLabel');
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomResetBtn = document.getElementById('zoomResetBtn');

  var scale = 1;
  var MIN = 0.4;
  var MAX = 1.6;
  var STEP = 0.1;

  function applyScale() {
    scaleEl.style.transform = 'scale(' + scale + ')';
    label.textContent = Math.round(scale * 100) + '%';
  }

  zoomInBtn.addEventListener('click', function () {
    scale = Math.min(MAX, +(scale + STEP).toFixed(2));
    applyScale();
  });
  zoomOutBtn.addEventListener('click', function () {
    scale = Math.max(MIN, +(scale - STEP).toFixed(2));
    applyScale();
  });
  zoomResetBtn.addEventListener('click', function () {
    scale = 1;
    applyScale();
  });
})();
