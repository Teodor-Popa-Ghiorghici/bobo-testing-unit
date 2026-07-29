import { Snd } from './snd.js';

export let godSeed = 0x2545F491;

export function godStir() {
  const t = (typeof performance !== 'undefined' && performance.now)
    ? Math.floor(performance.now() * 1000) : Date.now();
  godSeed ^= (t >>> 0) ^ ((Date.now() & 0xFFFF) << 13);
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      godSeed ^= a[0];
    }
  } catch (e) {}
  godSeed >>>= 0;
}

export function godNext() {
  let x = godSeed || 1;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  godSeed = x;
  return x;
}

export function godRand(n) {
  godStir();
  return godNext() % n;
}

export function godPick(list) {
  return list[godRand(list.length)];
}

const GOD_WORDS = ("abide able above abram acre adam adorn afar agree aisle alarm alien alive alloy " +
"almond alpha altar amber amen amend angel anger anvil apple arbor arch archer ark armor ash ashes " +
"aspen atlas atom august awake axis babel badge balm banner barley basin beacon beam bear beast bell " +
"bench beryl bind birch bird bishop blade blaze bless blood bloom board bone book border bough bound " +
"bow bowl brace brand brass bread breath brick bride bridge bright bronze brook brother buckle build " +
"bull burn bush cable cage cain calf call camel candle cane canvas cape carve cast cattle cedar cell " +
"censer chain chair chalk chamber chariot cheek chest child chisel choir chord cistern citadel city " +
"clay cleave cliff cloak clock cloud coal coat coin column comb comet compass copper cord corn corner " +
"court covenant cow craft crane creed crest crown crumb crust cube cubit cup curtain cymbal dagger dam " +
"dawn day debt deep deer den depth desert dew dial diamond dig disc ditch dome donkey door dove down " +
"dragon dream drift drum dust eagle ear earth east ebony echo eden edge egg elder elm ember engine " +
"ephod ewe eye fable face fall fallow famine fang fast fat father fawn feast feather fence fern field " +
"fig file fire firm fish flag flame flax fleece flint flock flood floor flour flute foam fold font " +
"forest forge fork form fortress fountain fowl fox frame friend fringe frost fruit furnace gable gain " +
"gale gall garden garment gate gem ghost giant gift gild glass glean globe glory glove gnat goat gold " +
"gopher gourd grain granite grape grass grave gravel green grid grief grove guard gull gum hail hair " +
"hall hammer hand harbor hare harp harvest hatch haven hawk hay hazel head hearth heaven hedge heel " +
"heir helm hem herb herd hermit hew hill hinge hive hold hollow holy honey hood hoof hook horn horse " +
"host hound hour house hull hymn ice idol image incense ink inlet iron island ivory ivy jar jasper " +
"javelin jaw jewel join joy judge jug juniper keel keep kernel kettle key kid kiln kin king kite knee " +
"knife knot lamb lamp lance land lantern lark latch lattice laurel lead leaf league leather ledge " +
"leaven ledger lens lentil letter level lever light lily lime linen lintel lion lip loaf lock locust " +
"lodge loft log loom lord lot lyre mallet mane manna mantle map marble mark marrow marsh mason mast " +
"master mat meal measure meat medal melon mercy mesh metal meter midst milk mill mint mire mirror mist " +
"mite moat model mold mole monument moon moor morning mortar moss moth mother mount mouse mouth mule " +
"myrrh nail name nation nave neck needle nest net nettle new night nine noon north note number oak oar " +
"oath oats ochre offering oil olive omen onion onyx opal orb orchard order organ ornament ostrich oven " +
"owl ox pace pail palace pale palm pan panel paper parch pardon partridge pasture path pattern peace " +
"peak pearl pebble peg pen pillar pilot pin pine pipe pitch pith plague plain plane plank plant plaster " +
"plate plow plumb pod pool porch post pot pottery pouch pound praise prayer press priest prism prophet " +
"prow psalm pulse pump purple quail quarry quart quartz queen quiet quill quiver rack radiant raft rag " +
"rail rain ram rampart ransom raven ray razor reed reef reel refuge reign rein relic rest ridge rim ring " +
"river road robe rock rod roof room root rope rose rot round rudder rug ruin rule rush rust sabbath sack " +
"saddle safe saffron sage sail saint salt sand sap sapphire sash satchel scale scarlet scent sceptre " +
"scribe scroll sea seal seam season seat cedar seed servant shade shaft shale share sheaf shear sheep " +
"shelf shell shepherd shield ship shore shrine shuttle sickle sieve sign silk silver sinew skiff sky " +
"slab slate sledge sling smoke snare snow soap sod soil sole song soot soul sound south sow spade span " +
"spark sparrow spear speck spice spike spindle spire spirit spoke sponge spool spoon spring sprout spur " +
"stable staff stag stair stake stall stamp star statue stave steel stem step stern stick still stitch " +
"stock stone stool storm stove straight strand straw stream street string strong stubble stump sulphur " +
"summer sun swallow swarm sweep swine sword sycamore table tabernacle tackle tail talent tallow tank " +
"tar target tassel temple tent tenth thatch thicket thistle thorn thread threshold throne thunder tide " +
"tile timber tin tomb tongs tongue tool tooth torch tower town trace track trade trail train trap tray " +
"tread treasure tree trench tribe tribute trough trowel trumpet trunk truth tune tunic turret twig " +
"twilight twine urn vale valley vane vapour vault veil vein vellum vessel vine vinegar vision voice " +
"volume vow wafer wagon wall walnut ward warp wash watch water wave wax weave web wedge weight well " +
"west wheat wheel whip white wick widow width willow wind window wine wing winter wire wisdom wolf wood " +
"wool word work workshop worm wormwood worship wrath wreath wrist yard yarn year yeast yoke zeal zenith " +
"zinc zion").split(/\s+/).filter(Boolean);

export function godWords(n) {
  const out = [];
  for (let i = 0; i < (n || 1); i++) out.push(godPick(GOD_WORDS));
  return out;
}

/* ---- GodSong: a melody chosen the same way ------------------------------ */
const GOD_SCALE = [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16, 523.25,
                   587.33, 622.25, 698.46, 783.99];
export function godSong() {
  let t = 0;
  const n = 10 + godRand(8);
  for (let i = 0; i < n; i++) {
    const f = GOD_SCALE[godRand(GOD_SCALE.length)];
    const len = [90, 130, 180, 260][godRand(4)];
    Snd.tone(f, len, { delay: t, type: godRand(3) ? 'square' : 'triangle', vol: 0.05 });
    if (godRand(5) === 0) Snd.tone(f * 1.5, len, { delay: t, type: 'triangle', vol: 0.02 });
    t += len / 1000 * 0.9;
  }
  return n;
}

export const VGA16 = [
  [0,0,0],      [0,0,170],    [0,170,0],    [0,170,170],
  [170,0,0],    [170,0,170],  [170,85,0],   [170,170,170],
  [85,85,85],   [85,85,255],  [85,255,85],  [85,255,255],
  [255,85,85],  [255,85,255], [255,255,85], [255,255,255]
];

export function godDoodle(cv) {
  const g = cv.getContext('2d');
  if (!g) return;
  const W = cv.width, H = cv.height;
  const C = i => {
    const p = VGA16[i & 15];
    return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
  };
  g.fillStyle = '#000000';
  g.fillRect(0, 0, W, H);
  const shapes = 12 + godRand(26);
  for (let i = 0; i < shapes; i++) {
    g.fillStyle = C(1 + godRand(15));
    const kind = godRand(6);
    const x = godRand(W), y = godRand(H);
    const w = 4 + godRand(Math.max(6, W >> 2));
    const h = 4 + godRand(Math.max(6, H >> 2));
    if (kind < 2) {
      g.fillRect(x, y, w, h);
    } else if (kind < 3) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h / 2); g.lineTo(x - w / 2, y + h);
      g.closePath(); g.fill();
    } else if (kind < 4) {
      g.beginPath(); g.arc(x, y, 3 + godRand(20), 0, Math.PI * 2); g.fill();
    } else if (kind < 5) {
      g.fillRect(x, y, w, 2);
      g.fillRect(x + (w >> 1) - 1, y - (h >> 1), 2, h);
    } else {
      for (let s = 0; s < 5; s++) g.fillRect(x - s * 4, y + s * 3, w + s * 8, 3);
    }
  }
  if (godRand(4) === 0) {
    const bx = W / 2, by = H * 0.72, u = Math.max(2, W / 44);
    g.fillStyle = C(14);
    for (let s = 0; s < 5; s++) g.fillRect(bx - (s + 1) * u * 2, by - (5 - s) * u * 2, (s + 1) * u * 4, u * 2);
    g.fillRect(bx - u, by - 14 * u, u * 2, u * 5);
    g.fillRect(bx - u * 3, by - 12 * u, u * 6, u * 2);
    g.fillStyle = C(7);
    for (let c = -2; c <= 2; c++) g.fillRect(bx + c * u * 4 - u, by, u * 2, u * 6);
    g.fillStyle = C(8);
    g.fillRect(bx - W / 3, by + u * 6, (W / 3) * 2, u * 3);
  }
}
