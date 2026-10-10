/* The POSE button on the glass (pose_random.js says where it is; this draws it): a small plate bottom right, the key on it, lit for a moment after it is used. */
import { text } from './font.js';
import { px } from './draw.js';
import { btnRect } from './pose_random.js';

export function drawPoseBtn(g, W, H, flash) {
  const r = btnRect(W, H);
  px(g, r.x - 1, r.y - 1, r.w + 2, r.h + 2, '#05060C');
  px(g, r.x, r.y, r.w, r.h, flash > 0 ? '#FFE86A' : '#1B2240');
  px(g, r.x, r.y, r.w, 1, flash > 0 ? '#FFFFFF' : '#5A6AA8'); px(g, r.x, r.y + r.h - 1, r.w, 1, '#05060C');
  text(g, 'POSE  P', r.x + r.w / 2, r.y + 5, { scale: 1, align: 'center', color: flash > 0 ? '#05060C' : '#C8D0F0' });
}
