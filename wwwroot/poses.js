// Strekfigur-illustrasjoner (sideprofil). Koordinater i et 120x100 rutenett, bakken er y=90.
const L = (K, F) => [K, F];
const stand = { H: [60, 15], N: [60, 27], P: [60, 56], legs: [L([60, 74], [60, 89]), L([63, 74], [64, 89])], arms: [L([60, 42], [62, 56]), L([63, 42], [65, 56])] };
const lieLegs = [L([82, 62], [92, 88]), L([86, 64], [96, 88])];
const lieBase = { H: [14, 82], N: [26, 84], P: [62, 84], legs: lieLegs, arms: [L([44, 86], [58, 86]), L([44, 86], [58, 86])] };
const plankLegs = [L([30, 76], [10, 89]), L([32, 76], [12, 89])];
const plankHigh = { H: [100, 42], N: [90, 48], P: [50, 66], legs: plankLegs, arms: [L([90, 68], [90, 89]), L([92, 68], [92, 89])] };
const hinge = { H: [82, 40], N: [72, 42], P: [38, 52], legs: [L([44, 72], [48, 89]), L([48, 72], [52, 89])], arms: [L([74, 62], [74, 80]), L([76, 62], [76, 80])] };
const squat = { H: [58, 22], N: [56, 33], P: [38, 64], legs: [L([66, 62], [58, 89]), L([68, 63], [62, 89])], arms: [L([72, 40], [88, 40]), L([70, 40], [86, 42])] };
const lungeDown = { H: [58, 26], N: [58, 37], P: [58, 66], legs: [L([86, 66], [86, 89]), L([38, 86], [20, 89])], arms: [L([50, 52], [58, 66]), L([52, 52], [60, 66])] };
const sitV = { H: [28, 52], N: [34, 62], P: [50, 86], legs: [L([74, 68], [90, 80]), L([76, 70], [92, 82])], arms: [L([56, 64], [72, 60]), L([56, 64], [72, 60])] };
const lying = { H: [14, 82], N: [26, 84], P: [62, 84] };
const HIPS = [L([50, 44], [58, 56]), L([52, 44], [60, 56])];
const CLASP = [L([60, 42], [68, 40]), L([62, 42], [70, 40])];
const gobletStandPose = { ...stand, arms: [L([64, 44], [68, 34]), L([64, 44], [68, 34])], kb: [72, 38] };
const gobletPose = { ...squat, arms: [L([68, 46], [70, 38]), L([68, 46], [70, 38])], kb: [74, 42] };

const POSES = {
  stand,
  standUp: { ...stand, arms: [L([68, 14], [70, 0]), L([66, 14], [68, 1])] },
  starJump: { ...stand, legs: [L([48, 74], [38, 89]), L([72, 74], [82, 89])], arms: [L([78, 16], [88, 4]), L([78, 18], [90, 8])] },
  squat,
  lungeUp: { ...stand, legs: [L([70, 74], [78, 89]), L([50, 74], [42, 89])], arms: [L([52, 42], [60, 56]), L([54, 42], [60, 56])] },
  lungeDown,
  lungeKb: { ...lungeDown, arms: [L([66, 50], [72, 42]), L([66, 50], [72, 42])], kb: [74, 44] },
  calf: { H: [60, 13], N: [60, 25], P: [60, 54], legs: [L([60, 72], [60, 86]), L([63, 72], [63, 86])], arms: stand.arms },
  kneeUp: { ...stand, legs: [L([82, 58], [80, 76]), L([60, 74], [60, 89])], arms: [L([50, 44], [62, 36]), L([70, 44], [78, 52])] },
  hinge,
  row: { ...hinge, arms: [L([62, 56], [72, 64]), L([74, 62], [74, 80])] },
  plankHigh,
  pushDown: { H: [100, 70], N: [90, 72], P: [50, 78], legs: [L([30, 83], [10, 89]), L([32, 83], [12, 89])], arms: [L([76, 80], [90, 89]), L([78, 80], [92, 89])] },
  pike: { H: [93, 68], N: [84, 60], P: [54, 34], legs: [L([37, 62], [20, 89]), L([40, 62], [23, 89])], arms: [L([86, 75], [88, 89]), L([88, 75], [90, 89])] },
  pikeDown: { H: [97, 82], N: [86, 78], P: [54, 34], legs: [L([37, 62], [20, 89]), L([40, 62], [23, 89])], arms: [L([74, 84], [88, 89]), L([76, 84], [90, 89])] },
  plankLow: { H: [96, 60], N: [86, 64], P: [50, 74], legs: [L([30, 81], [10, 89]), L([32, 81], [12, 89])], arms: [L([86, 88], [102, 88]), L([86, 88], [102, 88])] },
  lieBack: lieBase,
  crunchUp: { ...lieBase, H: [38, 54], N: [44, 62], arms: [L([46, 52], [38, 56]), L([46, 52], [38, 56])] },
  bridge: { ...lieBase, P: [62, 62], legs: [L([86, 62], [88, 88]), L([90, 64], [92, 88])] },
  legsDown: { ...lieBase, legs: [L([84, 84], [104, 84]), L([84, 86], [104, 86])] },
  legsUp: { ...lieBase, legs: [L([62, 62], [62, 40]), L([64, 62], [64, 40])] },
  hollow: { H: [26, 68], N: [34, 74], P: [60, 84], legs: [L([80, 76], [100, 68]), L([82, 78], [102, 70])], arms: [L([24, 62], [12, 58]), L([26, 64], [14, 60])] },
  wallSit: { H: [44, 26], N: [44, 38], P: [44, 66], legs: [L([72, 66], [72, 89]), L([74, 66], [74, 89])], arms: [L([56, 52], [70, 52]), L([56, 52], [70, 52])], wall: 36 },
  supDown: { H: [100, 83], N: [88, 85], P: [48, 86], legs: [L([28, 87], [10, 88]), L([28, 87], [10, 88])], arms: [L([100, 86], [114, 88]), L([100, 86], [114, 88])] },
  supUp: { H: [98, 72], N: [86, 78], P: [48, 84], legs: [L([28, 78], [10, 70]), L([28, 80], [10, 72])], arms: [L([100, 72], [114, 66]), L([100, 74], [114, 68])] },
  sitV,
  sitTwist: { ...sitV, arms: [L([44, 72], [56, 82]), L([44, 72], [56, 82])] },
  sitKb: { ...sitV, kb: [74, 66] },
  sitKbTwist: { ...sitV, arms: [L([40, 70], [46, 82]), L([40, 70], [46, 82])], kb: [46, 88] },
  deadA: { ...lying, legs: [L([62, 62], [84, 62]), L([64, 62], [86, 62])], arms: [L([26, 66], [26, 50]), L([28, 66], [28, 50])] },
  deadB: { ...lying, legs: [L([84, 78], [104, 86]), L([64, 62], [86, 62])], arms: [L([14, 87], [2, 87]), L([28, 66], [28, 50])] },
  birdA: { H: [88, 46], N: [78, 52], P: [38, 54], legs: [L([38, 74], [22, 89]), L([40, 74], [24, 89])], arms: [L([78, 70], [78, 89]), L([80, 70], [80, 89])] },
  birdB: { H: [88, 46], N: [78, 52], P: [38, 54], legs: [L([22, 54], [6, 54]), L([40, 74], [24, 89])], arms: [L([96, 50], [112, 48]), L([80, 70], [80, 89])] },
  mtnA: { ...plankHigh, legs: [L([66, 68], [56, 84]), L([32, 76], [12, 89])] },
  mtnB: { ...plankHigh, legs: [L([30, 76], [10, 89]), L([66, 68], [56, 84])] },
  swingBottom: { ...hinge, arms: [L([62, 60], [52, 76]), L([62, 60], [52, 76])] },
  swingTop: { ...stand, arms: [L([76, 28], [92, 28]), L([76, 28], [92, 28])], kb: [96, 30] },
  gobletStand: { ...stand, arms: [L([64, 44], [68, 34]), L([64, 44], [68, 34])], kb: [72, 38] },
  goblet: { ...squat, arms: [L([68, 46], [70, 38]), L([68, 46], [70, 38])], kb: [74, 42] },
  rack: { ...stand, arms: [L([64, 42], [66, 28]), L([64, 42], [66, 28])], kb: [70, 32] },
  carry: { ...stand, arms: [L([60, 42], [62, 58]), L([63, 42], [65, 56])], kb: [62, 66] },
  frontRaise: { ...stand, arms: [L([76, 42], [92, 40]), L([76, 42], [92, 40])] },
  curl: { ...stand, arms: [L([62, 56], [74, 44]), L([62, 56], [74, 44])] },
  kickback: { ...hinge, arms: [L([60, 58], [42, 60]), L([60, 58], [42, 60])] },
  floorDown: { ...lying, legs: lieLegs, arms: [L([36, 88], [32, 72]), L([36, 88], [32, 72])], kb: [30, 66] },
  floorUp: { ...lying, legs: lieLegs, arms: [L([26, 68], [26, 52]), L([26, 68], [26, 52])], kb: [26, 46] },

  // --- Egne poser per øvelse ---
  revA: { ...stand, arms: HIPS },
  revB: { ...lungeDown, arms: [L([48, 50], [56, 64]), L([50, 50], [58, 64])] },
  sbA: { ...lieBase, legs: [L([82, 62], [92, 88]), L([84, 62], [106, 46])] },
  sbB: { ...lieBase, P: [62, 62], legs: [L([86, 62], [88, 88]), L([84, 48], [106, 34])] },
  jumpAir: { H: [60, 10], N: [60, 22], P: [60, 50], legs: [L([58, 66], [52, 78]), L([62, 66], [66, 78])], arms: [L([66, 14], [70, 0]), L([64, 14], [68, 0])] },
  crouchBack: { ...squat, arms: [L([46, 44], [32, 50]), L([48, 44], [34, 52])] },
  tuckAir: { H: [60, 10], N: [60, 22], P: [60, 48], legs: [L([78, 48], [70, 64]), L([80, 52], [72, 68])], arms: [L([66, 34], [76, 40]), L([64, 34], [74, 42])] },
  crouchHands: { H: [78, 50], N: [70, 52], P: [40, 70], legs: [L([62, 62], [56, 89]), L([64, 64], [58, 89])], arms: [L([78, 72], [80, 89]), L([76, 72], [78, 89])] },
  ddBottom: { H: [80, 50], N: [70, 50], P: [36, 60], legs: [L([50, 74], [50, 89]), L([52, 74], [52, 89])], arms: [L([70, 68], [54, 80]), L([70, 68], [56, 80])], kb: [54, 83] },
  walkA: { ...stand, legs: [L([70, 72], [78, 89]), L([52, 72], [44, 89])], arms: [L([60, 42], [62, 58]), L([58, 42], [56, 56])] },
  walkB: { ...stand, legs: [L([52, 72], [44, 89]), L([70, 72], [78, 89])], arms: [L([60, 42], [62, 58]), L([62, 42], [68, 56])] },
  sumoStand: { ...stand, legs: [L([46, 74], [34, 89]), L([74, 74], [86, 89])], arms: CLASP },
  sumoSquat: { H: [60, 30], N: [60, 41], P: [60, 66], legs: [L([42, 70], [34, 89]), L([78, 70], [86, 89])], arms: [L([60, 54], [68, 52]), L([62, 54], [70, 52])] },
  sideLungeA: { ...stand, arms: CLASP },
  sideLungeB: { H: [52, 28], N: [52, 39], P: [52, 66], legs: [L([72, 72], [80, 89]), L([36, 78], [24, 89])], arms: [L([58, 52], [66, 50]), L([60, 52], [68, 50])] },
  skateA: { H: [58, 18], N: [56, 30], P: [52, 56], legs: [L([54, 72], [56, 89]), L([40, 72], [26, 80])], arms: [L([62, 40], [72, 46]), L([46, 40], [36, 38])] },
  skateB: { H: [66, 18], N: [64, 30], P: [68, 56], legs: [L([70, 72], [74, 89]), L([84, 72], [98, 80])], arms: [L([58, 40], [48, 46]), L([70, 40], [80, 38])] },
  gmStand: { ...stand, arms: [L([50, 28], [58, 18]), L([52, 26], [60, 16])] },
  gmHinge: { ...hinge, arms: [L([68, 34], [78, 36]), L([70, 36], [80, 38])] },
  donkeyA: { H: [88, 46], N: [78, 52], P: [38, 54], legs: [L([50, 68], [38, 76]), L([40, 74], [24, 89])], arms: [L([78, 70], [78, 89]), L([80, 70], [80, 89])] },
  donkeyB: { H: [88, 46], N: [78, 52], P: [38, 54], legs: [L([16, 56], [14, 40]), L([40, 74], [24, 89])], arms: [L([78, 70], [78, 89]), L([80, 70], [80, 89])] },
  kneePushA: { H: [100, 42], N: [90, 48], P: [52, 66], legs: [L([36, 86], [16, 87]), L([38, 86], [18, 88])], arms: [L([90, 68], [90, 89]), L([92, 68], [92, 89])] },
  kneePushB: { H: [100, 70], N: [90, 72], P: [56, 80], legs: [L([40, 86], [20, 87]), L([42, 86], [22, 88])], arms: [L([76, 80], [90, 89]), L([78, 80], [92, 89])] },
  diamondA: { ...plankHigh, H: [96, 42], N: [86, 48], arms: [L([86, 68], [86, 89]), L([88, 68], [88, 89])], diamond: [87, 90] },
  diamondB: { H: [96, 70], N: [86, 72], P: [50, 78], legs: [L([30, 83], [10, 89]), L([32, 83], [12, 89])], arms: [L([74, 82], [86, 89]), L([76, 82], [88, 89])], diamond: [87, 90] },
  tapA: { ...plankHigh, arms: [L([98, 60], [88, 52]), L([92, 68], [92, 89])] },
  tapB: { ...plankHigh, arms: [L([90, 68], [90, 89]), L([98, 60], [88, 52])] },
  iwFold: { H: [70, 72], N: [64, 64], P: [34, 40], legs: [L([34, 64], [32, 89]), L([36, 64], [34, 89])], arms: [L([68, 78], [72, 89]), L([70, 78], [74, 89])] },
  bikeA: { H: [26, 70], N: [32, 76], P: [62, 84], legs: [L([80, 66], [90, 80]), L([84, 80], [104, 72])], arms: [L([30, 62], [40, 66]), L([30, 62], [40, 66])] },
  bikeB: { H: [26, 70], N: [32, 76], P: [62, 84], legs: [L([84, 80], [104, 72]), L([80, 66], [90, 80])], arms: [L([30, 62], [40, 66]), L([30, 62], [40, 66])] },
  flutA: { ...lieBase, legs: [L([84, 78], [106, 68]), L([84, 82], [106, 82])] },
  flutB: { ...lieBase, legs: [L([84, 82], [106, 82]), L([84, 78], [106, 68])] },
  sidePlank: { H: [34, 46], N: [42, 56], P: [72, 72], legs: [L([88, 79], [104, 87]), L([90, 80], [106, 88])], arms: [L([42, 86], [56, 87]), L([48, 42], [54, 28])] },
  swing1Bottom: { ...hinge, arms: [L([62, 60], [52, 76]), L([46, 50], [30, 48])] },
  swing1Top: { ...stand, arms: [L([76, 28], [92, 28]), L([48, 34], [34, 40])], kb: [96, 30] },
  rdlA: { ...stand, arms: [L([62, 42], [68, 58]), L([62, 42], [68, 58])], kb: [68, 66] },
  rdlB: { ...hinge, legs: [L([46, 72], [50, 89]), L([50, 72], [54, 89])], arms: [L([74, 62], [72, 80]), L([74, 62], [72, 80])], kb: [72, 88] },
  haloA: { ...stand, arms: [L([64, 42], [68, 30]), L([64, 42], [68, 30])], kb: [70, 26] },
  haloB: { ...stand, arms: [L([48, 32], [46, 18]), L([48, 32], [46, 18])], kb: [44, 12] },
  thrusterTop: { ...stand, arms: [L([66, 16], [68, 4]), L([64, 16], [66, 4])], kb: [68, 0] },
  sumoBottom: { H: [66, 40], N: [58, 44], P: [40, 60], legs: [L([28, 76], [24, 89]), L([54, 76], [62, 89])], arms: [L([58, 66], [48, 80]), L([60, 66], [50, 80])], kb: [48, 83] },
  sumoTop: { ...stand, legs: [L([46, 74], [34, 89]), L([74, 74], [86, 89])], arms: [L([60, 42], [58, 58]), L([62, 42], [60, 58])], kb: [59, 66] },
  dbRack: { ...stand, arms: [L([64, 42], [66, 28]), L([62, 42], [64, 28])] },
  dbPressTop: { ...stand, arms: [L([66, 14], [68, 2]), L([64, 14], [66, 2])] },
  ohTriA: { ...stand, arms: [L([60, 10], [48, 20]), L([60, 10], [48, 20])], kb: [48, 22] },
  ohTriB: { ...stand, arms: [L([62, 14], [64, 2]), L([62, 14], [64, 2])], kb: [64, 2] },
  dbRowB: { ...hinge, arms: [L([60, 56], [70, 64]), L([62, 56], [72, 66])] },
  dbGobletA: { ...gobletStandPose, dbv: true },
  dbGobletB: { ...gobletPose, dbv: true },
  dbFloorDown: { ...lying, legs: lieLegs, arms: [L([36, 88], [32, 72]), L([36, 88], [32, 72])] },
  dbFloorUp: { ...lying, legs: lieLegs, arms: [L([26, 68], [26, 52]), L([26, 68], [26, 52])] },
  dbBridgeA: { ...lieBase, kb: [62, 78] },
  dbBridgeB: { ...lieBase, P: [62, 62], legs: [L([86, 62], [88, 88]), L([90, 64], [92, 88])], kb: [62, 54] },
};

const pt = (p) => `${p[0]},${p[1]}`;

function figure(pose, equip) {
  const p = POSES[pose] || POSES.stand;
  const limb = (s, [k, f], cls) => `<polyline class="limb ${cls}" points="${pt(s)} ${pt(k)} ${pt(f)}"/>`;
  let g = '';
  if (p.wall) g += `<line class="wall" x1="${p.wall}" y1="10" x2="${p.wall}" y2="90"/>`;
  g += limb(p.N, p.arms[1], 'far') + limb(p.P, p.legs[1], 'far');
  g += `<line class="limb torso" x1="${p.N[0]}" y1="${p.N[1]}" x2="${p.P[0]}" y2="${p.P[1]}"/>`;
  g += limb(p.P, p.legs[0], 'near') + limb(p.N, p.arms[0], 'near');
  g += `<circle class="head" cx="${p.H[0]}" cy="${p.H[1]}" r="7.5"/>`;
  if (equip === 'Kettlebell') {
    const w = p.arms[0][1];
    const k = p.kb || [w[0], w[1] + 8];
    g += `<g class="kb" transform="translate(${k[0]} ${k[1]})"><path d="M-5 -4 C-5 -12 5 -12 5 -4" fill="none"/><circle r="7" cy="0"/></g>`;
  } else if (equip === 'Manual') {
    const dbAt = (k, rot) => `<g class="db" transform="translate(${k[0]} ${k[1]})${rot ? ' rotate(90)' : ''}"><line x1="-6" x2="6" y1="0" y2="0"/><rect x="-9" y="-5" width="4" height="10" rx="1.5"/><rect x="5" y="-5" width="4" height="10" rx="1.5"/></g>`;
    g += p.kb ? dbAt(p.kb, p.dbv) : dbAt(p.arms[1][1]) + dbAt(p.arms[0][1]);
  }
  if (p.diamond) g += `<polygon class="diamond" points="${p.diamond[0]},${p.diamond[1] - 4} ${p.diamond[0] + 4},${p.diamond[1]} ${p.diamond[0]},${p.diamond[1] + 4} ${p.diamond[0] - 4},${p.diamond[1]}"/>`;
  return g;
}

function panel(pose, kb, cls = '') {
  return `<g class="${cls}">${figure(pose, kb)}</g>`;
}

// mode: 'anim' (veksler mellom start/slutt) | 'both' (side om side)
function illustration(ex, mode = 'anim') {
  const kb = ex.equipment;
  const same = ex.poseA === ex.poseB;
  if (mode === 'both' && !same) {
    return `<svg class="illus" viewBox="0 -14 250 114" role="img" aria-label="Illustrasjon av ${ex.name}">
      <line class="ground" x1="0" y1="91" x2="250" y2="91"/>
      <g>${figure(ex.poseA, kb)}</g>
      <path class="arrow" d="M118 50 h14 m-5 -5 l5 5 l-5 5"/>
      <g transform="translate(130 0)">${figure(ex.poseB, kb)}</g>
    </svg>`;
  }
  return `<svg class="illus" viewBox="0 -14 120 114" role="img" aria-label="Illustrasjon av ${ex.name}">
    <line class="ground" x1="0" y1="91" x2="120" y2="91"/>
    ${panel(ex.poseA, kb, same ? '' : 'frame fa')}
    ${same ? '' : panel(ex.poseB, kb, 'frame fb')}
  </svg>`;
}

window.illustration = illustration;
