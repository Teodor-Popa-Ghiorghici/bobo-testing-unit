/* What the RATES tooltip says. Bought with CHESHBON (the ledger), shown over the "per second" plaque.
   PURE: it is handed numbers and gives back HTML; apps/magen/auto_check.js holds it. */
const f2 = (fmt, n) => fmt(n);
export function ratesHtml(m, fmt) {
  const row = (k, v, hint) => '<div class="mgrt"><span>' + k + '</span><b>' + v + '</b>' + (hint ? '<i>' + hint + '</i>' : '') + '</div>';
  let h = '<b>YOUR RATES</b> <u>CHESHBON</u>';
  h += '<p class="mgrts">';
  h += row('per second', f2(fmt, m.mps), m.resting ? 'resting for Shabbat' : '');
  h += row('per minute', f2(fmt, m.mps * 60));
  h += row('per hour', f2(fmt, m.mps * 3600));
  h += '</p>';
  if (m.resting) h += '<p class="mgmech">Rested, it would be ' + fmt(m.raw) + ' a second.</p>';
  h += '<p class="mgrts">';
  h += row('each press', f2(fmt, m.perPress), 'a crit pays x7, ' + Math.round(m.crit * 100) + '% of the time');
  if (m.autoLvl > 0) {
    h += row('auto-press', m.autoPerSec.toFixed(1) + ' / s', 'level ' + m.autoLvl + ', held on the star');
    h += row('held on the star', '+' + f2(fmt, m.autoPerSec * m.perPress) + ' / s', 'on top of the above');
  } else if (m.autoOpen) h += row('auto-press', 'not bought', 'see UPGRADES');
  else h += row('auto-press', 'locked', m.clicks + ' / ' + m.autoNeed + ' presses by hand');
  h += '</p>';
  if (m.top.length) {
    h += '<p class="mgrts"><span class="mgrth">WHAT MAKES IT</span>';
    m.top.forEach(t => { h += row(t.n, f2(fmt, t.v) + ' / s &middot; ' + t.pct.toFixed(1) + '%'); });
    h += '</p>';
  }
  h += '<p class="mgrts"><span class="mgrth">WHAT MULTIPLIES IT</span>';
  h += row('kavanah', 'x' + m.kav.toFixed(3));
  h += row('zechut', 'x' + m.zech.toFixed(3));
  h += row('community, rules, buffs', 'x' + m.other.toFixed(3));
  if (m.blessing) h += row('a blessing from elsewhere', '-6.000.000%', 'that is 6%, written differently: x1.06');
  h += row('everything together', 'x' + m.global.toFixed(3));
  h += '</p>';
  h += '<p class="mgmech">Away from the window it earns ' + Math.round(m.offline * 100) + '% of this.</p>';
  return h;
}
