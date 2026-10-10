/* node apps/elephant/eat_check.js: how the big elephant eats (trunk.js, eat_seq.js, pure Node).
   THE TRUNK   solved from where its tip must be: it gets there, it never jumps as the target moves, and what is out of reach is pointed at
   THE EATING  for every size of pile: the trunk can reach the wedge it takes, the piece is in the tip between the take and his mouth, there are six chews, the sounds fall in order, and
               it begins and ends as the idle elephant (nothing moved, nothing held) */
import { solveTrunk, LEN, N } from './trunk.js';
import { poseAt, events, eventsBetween, EAT_TOTAL, T, CHEWS, wedgeSpot, BODY_X, PILE, crumbsAt } from './eat_seq.js';
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const root = { x: 240, y: 190 };

console.log('-- the trunk --');
{
  let worst = 0, n = 0, nan = 0;
  for (let ang = 0; ang < 360; ang += 15) for (let d = 14; d <= LEN; d += 8) {
    const tip = { x: root.x + Math.cos(ang * Math.PI / 180) * d, y: root.y + Math.sin(ang * Math.PI / 180) * d };
    for (const side of [-1, 1]) {
      const t = solveTrunk(root, LEN, tip, side);
      if (t.pts.some(p => !isFinite(p.x) || !isFinite(p.y))) nan++;
      worst = Math.max(worst, dist(t.tip, tip)); n++;
    }
  }
  ok(nan === 0, `${n} targets, no point is ever not a number`);
  ok(worst < 1.2, `a tip within reach lands on its target (the worst of ${n} misses by ${worst.toFixed(2)} px)`);
  const far = solveTrunk(root, LEN, { x: 400, y: 190 }, -1);
  ok(Math.abs(far.tip.y - 190) < 1 && Math.abs(dist(far.tip, root) - LEN) < 0.5, 'a tip out of reach is pointed at: the trunk goes straight, a trunk long');
  const hang = solveTrunk(root, LEN, { x: 240, y: 190 + LEN }, -1);
  ok(hang.pts.every(p => Math.abs(p.x - 240) < 0.01) && hang.pts.length === N + 1, 'hanging, it is a straight line down');
  /* the target moves a pixel and the trunk moves a pixel or two, however it is curled */
  let jump = 0;
  for (let x = 200; x < 320; x++) {
    const a = solveTrunk(root, 60, { x: x, y: 230 }, -1), b = solveTrunk(root, 60, { x: x + 1, y: 230 }, -1);
    for (let i = 0; i <= N; i++) jump = Math.max(jump, dist(a.pts[i], b.pts[i]));
  }
  ok(jump < 4, `a pixel of target is never more than ${jump.toFixed(2)} px of trunk`);
  const rr = hang.rad; ok(rr[0] > rr[N] && rr.every((r, i) => i === 0 || r <= rr[i - 1] + 1e-9), 'it narrows from the root to the tip');
}

console.log('\n-- the eating --');
for (let n = 1; n <= 6; n++) {
  const W = wedgeSpot(n), ev = events(n), take = ev.find(e => e.ev === 'take').at;
  ok(W.x >= PILE.x && W.x <= PILE.x + 42 * PILE.s && W.y >= PILE.y && W.y <= PILE.y + 28 * PILE.s, `${n} on the pile: the wedge taken is inside the pile`);
  let maxStretch = 0, jump = 0, prev = null;
  for (let t = 0; t <= EAT_TOTAL; t += 1 / 60) {
    const p = poseAt(t, n), r = { x: BODY_X + p.dx, y: 190 + p.bob + p.dip }, len = LEN * (1 + (p.fore - 1) * p.w);      /* what index.js solves with */
    if (p.w > 0.999) maxStretch = Math.max(maxStretch, dist(r, p.tip) / len);
    if (prev) jump = Math.max(jump, dist(prev.tip, p.tip), Math.abs(p.dx - prev.dx) * 3);
    prev = p;
  }
  ok(maxStretch < 1.06, `${n}: the trunk can reach everywhere it is asked to (at the most ${(maxStretch * 100).toFixed(0)} % of its length)`);
  ok(jump < 6, `${n}: the tip never jumps (${jump.toFixed(1)} px the most in a sixtieth of a second)`);
  const at = poseAt(take, n), touch = poseAt(T.touch, n);
  ok(dist(at.tip, W) < 6 && dist(touch.tip, W) < 6, `${n}: the tip is on the wedge when it is touched and when it is taken`);
  ok(!poseAt(take - 0.05, n).held && poseAt(take + 0.05, n).held && poseAt(T.mouth, n).held && !poseAt(T.nom + 0.2, n).held, `${n}: the piece is in the trunk from the take to his mouth, and nowhere else`);
  const first = poseAt(0, n), last = poseAt(EAT_TOTAL, n);
  ok([first, last].every(p => p.dx === 0 && p.bob === 0 && p.dip === 0 && p.w < 0.001 + (p === first ? 0 : 0) && !p.held && p.mouth === 0 && !p.happy), `${n}: it begins and ends as the idle elephant`);
}
{
  const ev = events(3), chews = ev.filter(e => e.ev === 'chew');
  ok(chews.length === CHEWS && CHEWS === 6, 'six chews');
  ok(ev.every((e, i) => i === 0 || e.at >= ev[i - 1].at) && ev[ev.length - 1].at <= EAT_TOTAL, 'the sounds fall in order and inside the eight seconds');
  const order = ['sniff', 'touch', 'take', 'whoosh', 'nom', 'chew', 'swallow', 'ahh'];
  ok(order.every((n, i) => i === 0 || ev.findIndex(e => e.ev === n) > ev.findIndex(e => e.ev === order[i - 1])), 'sniff, touch, take, whoosh, nom, chew, swallow, ahh: in that order');
  ok(ev.filter(e => e.ev === 'take').length === 1, 'the pile loses exactly one wedge a go');
  const seen = []; for (let t = 0; t < EAT_TOTAL; t += 0.016) eventsBetween(ev, t, t + 0.016).forEach(e => seen.push(e));
  ok(seen.length === ev.length - 1 || seen.length === ev.length, `stepping through time hears every sound once (${seen.length} of ${ev.length})`);
  const mid = poseAt(T.chew + 0.9, 3);
  ok(mid.chewing && mid.mouth > 0 && mid.happy === 1, 'while he chews the jaw moves and his eyes are shut');
  ok(crumbsAt(5, 0).length > 0 && JSON.stringify(crumbsAt(5, 0)) === JSON.stringify(crumbsAt(5, 0)) && crumbsAt(1, 0).length === 0, 'crumbs fall while he chews, the same ones whenever you look, and none before');
  ok(poseAt(T.chew + 1, 2).bend === -poseAt(T.chew + 1, 2).mirror, 'the trunk curls the way the mirror says');
  ok(wedgeSpot(2).x < BODY_X && poseAt(1.6, 2).mirror === -1 && wedgeSpot(3).x > BODY_X && poseAt(1.6, 3).mirror === 1, 'a wedge on his left is eaten with the mirror image of it');
}
console.log(bad ? bad + ' FAILED' : 'all good');
process.exit(bad ? 1 : 0);
