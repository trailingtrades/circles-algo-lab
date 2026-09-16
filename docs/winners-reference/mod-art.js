var MOD_ART = {
  m01: ['bank', '#38bdf8'], m14: ['receipt', '#34d399'], m03: ['candle', '#f5a524'], m12: ['shapes', '#22d3ee'],
  m04: ['chart', '#4caf50'], m06: ['wave', '#22b8f5'], m07: ['briefcase', '#a78bfa'], m10: ['bookopen', '#2dd4bf'],
  m05: ['target', '#818cf8'], m08: ['strategy', '#f472b6'], m09: ['scroll', '#fb923c'], m11: ['cog', '#60a5fa'], m13: ['shield', '#f59e0b']
};
function modArt(m) {
  var a = MOD_ART[m.id];
  if (a) return a;
  var cs = ['#22d3ee', '#2dd4bf', '#38bdf8', '#818cf8', '#f5a524'];
  return ['book', cs[(m.num || 0) % cs.length]];
}
function modPct(m) {
  var total = countItems(m), done = countDone(m, mp(m.id));
  return total ? Math.round(done / total * 100) : 0;
}
/* Decorative five-ring art used behind the gate. */
function ringsArt() {
  var c = ['#22d3ee', '#22b8f5', '#38bdf8', '#818cf8', '#f5a524'], out = '';
  for (var i = 0; i < 5; i++) {
    var r = 60 + i * 38, len = r * 6.283;
    out += '<circle cx="250" cy="250" r="' + r + '" fill="none" stroke="' + c[i] + '" stroke-opacity="' + (0.5 - i * 0.07) +
      '" stroke-width="' + (10 - i) + '" stroke-dasharray="' + (len * (0.35 + i * 0.12)) + ' ' + len +
      '" transform="rotate(' + (-90 + i * 37) + ' 250 250)"/>';
  }
  return '<svg viewBox="0 0 500 500" aria-hidden="true"><defs><radialGradient id="gglow" cx="50%" cy="50%">' +
    '<stop offset="0" stop-color="#00aeef" stop-opacity=".2"/><stop offset="1" stop-color="#00aeef" stop-opacity="0"/>' +
    '</radialGradient></defs><circle cx="250" cy="250" r="245" fill="url(#gglow)"/>' + out + '</svg>';
}
