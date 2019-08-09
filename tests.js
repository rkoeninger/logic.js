let testsPassed = 0;
let testsFailed = 0;
const test = (name, f, exptected) => {
  const actual = runResolve(f);
  if (exptected.success === actual.success && sameElements(exptected.results, actual.results)) {
    testsPassed++;
  } else {
    console.error(name);
    console.log('expected: ');
    console.log(exptected);
    console.log('actual: ');
    console.log(actual);
    testsFailed++;
  }
};

test('conso tautology',
  () => conso(1, list(2, 3), list(1, 2, 3)),
  tautology);
test('conso build whole from first and rest',
  x => conso(1, list(2, 3), x),
  successful({ x: list(1, 2, 3) }));
test('conso pick first',
  x => conso(x, list(2, 3), list(1, 2, 3)),
  successful({ x: 1 }));
test('conso pick first ignore rest elements and rest of whole',
  x => conso(x, list(_, _), list(1, _, _)),
  successful({ x: 1 }));
test('conso pick first ignore rest',
  x => conso(x, _, list(1, 2, 3)),
  successful({ x: 1 }));
test('conso pick first ignore rest and rest of whole',
  x => conso(x, _, list(1, _, _)),
  successful({ x: 1 }));
test('conso pick rest',
  x => conso(1, x, list(1, 2, 3)),
  successful({ x: list(2, 3) }));
test('conso pick rest ignore first',
  x => conso(_, x, list(1, 2, 3)),
  successful({ x: list(2, 3) }));
test('conso pick rest ignore first and first in whole',
  x => conso(_, x, list(_, 2, 3)),
  successful({ x: list(2, 3) }));
test('conso destructure whole',
  (x, y) => conso(x, y, list(1, 2, 3)),
  successful({ x: 1, y: list(2, 3) }));
test('conso ignore all',
  () => conso(_, _, _),
  tautology);
test('conso list lengths ignore elements',
  () => conso(_, list(_, _), list(_, _, _)),
  tautology);
test('conso ignore whole',
  () => conso(1, list(2, 3), _),
  tautology);
test('conso cross-infer',
  (x, y, z) => conso(x, list(2, z), list(1, y, 3)),
  successful({ x: 1, y: 2, z: 3 }));
test('conso ignore first and rest, whole is non-list',
  () => conso(_, _, 3),
  contradiction);
test('conso non-matching values',
  () => conso(5, list(9), list(8, 6)),
  contradiction);
test('conso non-matching values ignore first',
  () => conso(_, list(9), list(_, 6)),
  contradiction);
test('conso non-matching values ignore rest',
  () => conso(9, _, list(6, _)),
  contradiction);
test('conso non-matching list lengths',
  () => conso(1, list(2, 3), list(1, 2, 3, 4)),
  contradiction);
test('conso non-matching list lengths ignore some values',
  () => conso(_, list(2, 3), list(1, _, 3, _)),
  contradiction);
test('conso non-matching list lengths ignore all values',
  () => conso(_, list(_, _), list(_, _, _, _)),
  contradiction);
test('firsto tautology',
  () => firsto(1, list(1, 2, 3)),
  tautology);
test('firsto tautology ignore rest',
  () => firsto(1, list(1, _, _)),
  tautology);
test('firsto tautology ignore all whole values',
  () => firsto(_, list(_, _, _)),
  tautology);
test('firsto tautology ignore all',
  () => firsto(_, _),
  tautology);
test('firsto tautology first and first of whole',
  x => firsto(x, list(x, 2, 3)),
  tautology);
test('firsto infer first',
  x => firsto(x, list(1, 2, 3)),
  successful({ x: 1 }));
test('firsto infer first ignore rest values',
  x => firsto(x, list(1, _, _)),
  successful({ x: 1 }));
test('firsto infer first of whole',
  x => firsto(1, list(x, 2, 3)),
  successful({ x: 1 }));
test('resto tautology',
  () => resto(list(2, 3), list(1, 2, 3)),
  tautology);
test('resto tautology ignore first',
  () => resto(list(2, 3), list(_, 2, 3)),
  tautology);
test('resto tautology ignore all list values',
  () => resto(list(_, _), list(_, _, _)),
  tautology);
test('resto tautology ignore all',
  () => resto(_, _),
  tautology);
test('resto tautology rest and rest of whole',
  x => resto(x, new Cons(1, x)),
  tautology);
test('resto infer rest',
  x => resto(x, list(1, 2, 3)),
  successful({ x: list(2, 3) }));
test('resto infer rest ignore first',
  x => resto(x, list(_, 2, 3)),
  successful({ x: list(2, 3) }));
test('resto infer rest of whole',
  x => resto(list(2, 3), new Cons(1, x)),
  successful({ x: list(2, 3) }));
test('appendo tautology',
  () => appendo(list(1, 2), list(3, 4), list(1, 2, 3, 4)),
  tautology);
test('appendo explicit contradiction',
  () => appendo(list(1, 2), list(8, 9), list(1, 2, 3, 4)),
  contradiction);
test('appendo ignore list length',
  () => appendo(list(_, _, _), list(_, _), list(_, _, _, _, _)),
  tautology);
test('appendo ignore all',
  () => appendo(_, _, _),
  tautology);
test('appendo check prefix',
  () => appendo(list(1, 2), _, list(1, 2, 3, 4)),
  tautology);
test('appendo check suffix',
  () => appendo(_, list(3, 4), list(1, 2, 3, 4)),
  tautology);
test('appendo infer prefix ignore suffix values',
  x => appendo(x, list(_, _), list(1, 2, 3, 4)),
  successful({ x: list(1, 2) }));
test('appendo infer suffix ignore prefix values',
  x => appendo(list(_, _), x, list(1, 2, 3, 4)),
  successful({ x: list(3, 4) }));
test('appendo cross-infer',
  (x, y, z, w, v) => appendo(list(1, x, 3), list(y, 5, 6, z), list(1, 2, w, 4, v, 6, 7)),
  successful({ x: 2, y: 4, z: 7, w: 3, v: 5 }));
test('appendo split every way',
  (x, y) => appendo(x, y, list(1, 2)),
  successful([
    { x: list(),     y: list(1, 2) },
    { x: list(1),    y: list(2) },
    { x: list(1, 2), y: list() }]));
test('reverseo tautology',
  () => reverseo(list(1, 2, 3), list(3, 2, 1)),
  tautology);
test('reverseo tautology empty lists',
  () => reverseo(list(), list()),
  tautology);
test('reverseo contradiction',
  () => reverseo(list(5, 7, 8), list(3, 2, 1)),
  contradiction);
test('reverseo tautology ignore values',
  () => reverseo(list(_, _, _), list(_, _, _)),
  tautology);
test('reverseo contradiction ignore values different list lengths',
  () => reverseo(list(_, _, _), list(_, _, _, _)),
  contradiction);
test('reverseo cross-infer',
  (x, y, z) => reverseo(list(x, 2, z), list(3, y, 1)),
  successful({ x: 1, y: 2, z: 3 }));
test('rotateo reversal',
  (xs, ys) => conj(rotateo(list(1, 2, 3), xs), rotateo(ys, xs)),
  successful({ xs: list(2, 3, 1), ys: list(1, 2, 3) }));
test('membero tautology',
  () => membero(1, list(1, 2, 3)),
  tautology);
test('membero explicit contradiction',
  () => membero(6, list(1, 2, 3)),
  contradiction);
test('membero iterate values',
  x => membero(x, list(1, 2, 3)),
  successful([
    { x: 1 },
    { x: 2 },
    { x: 3 }]));
test('membero single value against all variable list',
  (x, y, z) => membero(1, list(x, y, z)),
  successful([
    { x: 1 },
    { y: 1 },
    { z: 1 }]));
test('membero infer single value in list',
  x => membero(2, list(1, x, 3)),
  successful({ x: 2 }));
test('predo tautology',
  () => predo(five, four),
  tautology);
test('predo-succo tautology',
  (x, y) => conj(predo(x, y), succo(y, x)),
  tautology);
test('succo tautology',
  () => succo(four, five),
  tautology);
test('addo tautology',
  () => addo(three, four, seven),
  tautology);
test('addo compute sum',
  x => addo(two, six, x),
  successful({ x: eight }));
test('addo compute difference',
  x => addo(two, x, five),
  successful({ x: three }));
test('addo compute difference other way',
  x => addo(x, two, five),
  successful({ x: three }));
test('addo impossible difference',
  x => addo(five, x, three),
  contradiction);
test('addo all addends',
  (x, y) => addo(x, y, three),
  successful([
    { x: zero, y: three },
    { x: one,   y: two },
    { x: two,   y: one },
    { x: three, y: zero }]));
test('gteo tautology',
  () => gteo(five, two),
  tautology);
test('gteo equality',
  () => gteo(four, four),
  tautology);
test('gteo contradiction',
  () => gteo(one, three),
  contradiction);
test('lteo tautology',
  () => lteo(two, five),
  tautology);
test('lteo equality',
  () => lteo(four, four),
  tautology);
test('lteo contradiction',
  () => lteo(three, one),
  contradiction);
test('gto tautology',
  () => gto(five, two),
  tautology);
test('gto equality',
  () => gto(four, four),
  contradiction);
test('gto contradiction',
  () => gto(one, three),
  contradiction);
test('lto tautology',
  () => lto(two, five),
  tautology);
test('lto equality',
  () => lto(four, four),
  contradiction);
test('lto contradiction',
  () => lto(three, one),
  contradiction);
test('ato tautology',
  () => ato(list(1, 2, 3), zero, 1),
  tautology);
test('ato access at index',
  x => ato(list(1, 2, 3), one, x),
  successful({ x: 2 }));
test('ato infer index',
  x => ato(list(1, 2, 3), x, 2),
  successful({ x: one }));
test('ato infer index multiple',
  x => ato(list(1, 2, 3, 2, 4, 1, 5, 2, 4, 2), x, 2),
  successful([
    { x: one },
    { x: three },
    { x: seven },
    { x: nine }]));
test('ato infer index not found',
  x => ato(list(1, 2, 3, 2, 4, 1, 5, 2, 4, 2), x, 9),
  contradiction);
test('ato access index out of bounds',
  x => ato(list(1, 2, 3, 4), seven, x),
  contradiction);
// TODO: fresh(xs => conj(ato(xs, zero, 1), ato(xs, one, 2), ato(xs, two, 3)))
//       should return
//       xs = [1 2 3 | _]
test('everyg tautology',
  () => everyg(x => gteo(x, one), list(one, two, three)),
  tautology);
test('everyg tautology multiple conditions',
  () => conj(everyg(x => gteo(x, one), list(one, two, three)), everyg(x => lteo(x, three), list(one, two, three))),
  tautology);
test('everyg all but one hold',
  () => everyg(x => gteo(x, two), list(one, two, three)),
  contradiction);
test('someg match one of multiple values',
  () => someg(x => equiv(x, 2), list(1, 2, 3)),
  tautology);
test('someg fail to match one of multiple values',
  () => someg(x => equiv(x, 8), list(1, 2, 3)),
  contradiction);

if (testsFailed === 0) {
  console.log(`${testsPassed} tests passed`);
} else {
  console.error(`${testsPassed} tests passed, ${testsFailed} tests failed`);
}
