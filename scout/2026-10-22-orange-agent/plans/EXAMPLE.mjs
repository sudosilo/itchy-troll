// Example plan. Copy it to plans/YYYY-MM-DD-x.mjs and replace the body. Never re-run an old plan.
// Deepens the Two Coyote Corner Market on block 0,0 with a magazine rack and a person reading it.
export default async (k) => {
  const {P, C, box, person} = k;
  const x0 = 13716, y0 = 25908; // the market's southwest corner, from tools/inventory.mjs
  box('interior', C.int, x0 + 1300, y0 + 800, x0 + 2500, y0 + 1100, 1524, {building: 'Two Coyote Corner Market', part: 'magazine rack', checks: [['shelf_height', 1524]]});
  person(P(x0 + 1900, y0 + 1600), Math.PI, 'standing', 'flipping through a truck trader magazine');
};
