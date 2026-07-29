function openShop() {
  if (shopWin && document.body.contains(shopWin.win)) { raise(shopWin.win); return; }
  let cat = 'frame';
  let bubbleEl = null, gridEl = null, footEl = null, daveCv = null;
  let bob = 0, raf = null, talkT = 0;

  const made = createWindow({
    kind: 'app', title: 'CRAZY DAVE\'S  --  EVERYTHING MUST GO SOMEWHERE', w: 640, h: 480,
    build: body => {
      const root = document.createElement('div');
      root.className = 'shoproot';

      const top = document.createElement('div');
      top.className = 'shoptop';
      const dv = document.createElement('div');
      dv.className = 'shopdave';
      daveCv = document.createElement('canvas');
      daveCv.width = 48; daveCv.height = 48;
      dv.appendChild(daveCv);
      bubbleEl = document.createElement('div');
      bubbleEl.className = 'shopbubble';
      top.appendChild(dv);
      top.appendChild(bubbleEl);

      const tabs = document.createElement('div');
      tabs.className = 'shoptabs';
      Object.keys(COS_CATS).forEach(k => {
        const t = document.createElement('div');
        t.className = 'shoptab' + (k === cat ? ' on' : '');
        t.textContent = COS_CATS[k].label;
        t.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          cat = k;
          Snd.click();
          tabs.querySelectorAll('.shoptab').forEach((n, i) =>
            n.classList.toggle('on', Object.keys(COS_CATS)[i] === k));
          fill();
        });
        tabs.appendChild(t);
      });

      gridEl = document.createElement('div');
      gridEl.className = 'shopgrid';
      footEl = document.createElement('div');
      footEl.className = 'shopfoot';

      root.appendChild(top);
      root.appendChild(tabs);
      root.appendChild(gridEl);
      root.appendChild(footEl);
      body.appendChild(root);
    }
  });
  made.win.classList.add('shopwin');
  shopWin = made;

  const say = txt => { if (bubbleEl) bubbleEl.textContent = txt; };
  say(DAVE_LINES[Math.floor(Math.random() * DAVE_LINES.length)]);

  function foot() {
    if (!footEl) return;
    footEl.innerHTML = '';
    const l = document.createElement('span');
    l.textContent = 'YOU HAVE ' + Economy.balance() + ' SUN';
    const r = document.createElement('span');
    r.className = 'r';
    const n = Object.keys(COS_CATS).reduce((a, k) => a + Cos.owned(k).length, 0);
    const tot = Object.keys(COS_CATS).reduce((a, k) => a + COS_CATS[k].list.length, 0);
    r.textContent = n + ' / ' + tot + ' OWNED';
    footEl.appendChild(l);
    footEl.appendChild(r);
  }

  function fill() {
    if (!gridEl) return;
    /* a card removed from under the pointer never fires mouseleave, and a
       preview left applied would look like a purchase nobody made */
    Cos.hover(null, null);
    gridEl.innerHTML = '';
    const list = COS_CATS[cat].list;
    list.forEach(it => {
      const owned = Cos.has(cat, it.id);
      const eq = Cos.equipped(cat) === it.id;
      const card = document.createElement('div');
      card.className = 'shopcard' + (eq ? ' eq' : owned ? ' owned' : '') +
        (!owned && Economy.balance() < it.price ? ' broke' : '');
      const cv = document.createElement('canvas');
      cv.width = 116; cv.height = 60;
      drawThumb(cv, cat, it);
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = it.name;
      const pr = document.createElement('div');
      pr.className = 'pr';
      pr.textContent = owned ? 'OWNED' : (it.price === 0 ? 'FREE' : it.price + ' SUN');
      const bt = document.createElement('div');
      bt.className = 'bt';
      bt.textContent = eq ? (cat === 'seed' ? 'IN STOCK' : 'EQUIPPED')
        : owned ? (cat === 'seed' || cat === 'pot' ? 'IN THE GARDEN' : 'EQUIP')
          : 'BUY';
      card.appendChild(cv); card.appendChild(nm); card.appendChild(pr); card.appendChild(bt);
      card.title = it.blurb || '';

      card.addEventListener('mouseenter', () => {
        say(it.blurb || it.name);
        if (cat === 'frame' || cat === 'cursor' || cat === 'scheme') Cos.hover(cat, it.id);
      });
      card.addEventListener('mouseleave', () => { Cos.hover(null, null); });
      card.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        if (!owned) {
          if (Economy.balance() < it.price) {
            say(DAVE_BROKE[Math.floor(Math.random() * DAVE_BROKE.length)]);
            Snd.deny();
            return;
          }
          if (Cos.buy(cat, it.id)) {
            Snd.purchase();
            say(daveThanks(cat, it));
            if (cat === 'frame' || cat === 'cursor' || cat === 'scheme' || cat === 'logo') Cos.equip(cat, it.id);
            if (cat === 'seed' || cat === 'pot') gardenRefreshStock();
            fill(); foot();
          }
          return;
        }
        if (cat === 'seed') { say('YOU\'VE GOT THOSE. PLANT THEM. THAT\'S THE NEXT BIT.'); Snd.click(); return; }
        Cos.equip(cat, it.id);
        Snd.click();
        say('THERE. LOOK AT YOU.');
        fill();
      });
      gridEl.appendChild(card);
    });
    foot();
  }

  function daveThanks(c, it) {
    if (it.joke) return 'YOU ACTUALLY BOUGHT IT. I HAVE TO CLOSE THE SHOP. I HAVE TO GO AND LIE DOWN.';
    if (c === 'seed') return 'SEEDS! IN A POT! I\'VE HEARD OF IT!';
    if (c === 'frame') return 'IT\'S ON THE MACHINE ALREADY. DON\'T ASK HOW. ASK LATER.';
    return 'SOLD. NO REFUNDS. NO RECEIPTS. GESTURES ONLY.';
  }

  fill();

  /* Dave, in a pot, bobbing. Drawn every frame because he cannot sit still. */
  const loop = () => {
    if (!document.body.contains(made.win)) {
      raf = null;
      Cos.hover(null, null);
      shopWin = null;
      return;
    }
    raf = requestAnimationFrame(loop);
    bob += 0.06;
    drawDave(daveCv, bob);
    talkT++;
    if (talkT > 900) { talkT = 0; say(DAVE_LINES[Math.floor(Math.random() * DAVE_LINES.length)]); }
  };
  raf = requestAnimationFrame(loop);
  Economy.onChange(() => { if (document.body.contains(made.win)) { fill(); } });
  lampDip();
}
