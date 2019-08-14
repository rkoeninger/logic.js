// https://github.com/mullr/micrologic

const LVar = class {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  toString() {
    return (this.name || '') + '#' + this.id;
  }
};

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
  toString() {
    return Cons.isProper(this) ? `list(${toArray(this).map(show).join(', ')})` : `cons(${this.head}, ${this.tail})`;
  }
  static isProper(x) {
    return x === null || isCons(x) && Cons.isProper(x.tail);
  }
};

const Hash = class {
  constructor(entries = []) {
    this.entries = entries;
  }
  has(key) {
    return this.entries.some(([k, _]) => eq(k, key));
  }
  get size() {
    return this.entries.length;
  }
  get(key) {
    if (this.has(key)) {
      return this.entries.find(([k, _]) => eq(k, key))[1];
    }
    raise('key not found');
  }
  set(key, value) {
    const next = this.copy();
    const entry = next.entries.find(([k, _]) => eq(k, key));
    if (entry) {
      entry[1] = value;
    } else {
      next.entries.push([key, value]);
    }
    return next;
  }
  copy() {
    const next = new Hash();
    next.entries = this.entries.map(([k, v]) => [k, v]);
    return next;
  }
  keys() {
    return this.entries.map(([k, _]) => k);
  }
  static eq(x, y) {
    const xkeys = x.keys();
    const ykeys = y.keys();
    return xkeys.length === ykeys.length &&
      xkeys.every(xk => ykeys.some(yk => eq(xk, yk) && eq(x.get(xk), y.get(yk))));
  }
  static eqRespectIgnore(x, y) {
    const xkeys = x.keys();
    const ykeys = y.keys();
    return xkeys.length === ykeys.length &&
      xkeys.every(xk => ykeys.some(yk => eqRespectIgnore(xk, yk) && eqRespectIgnore(x.get(xk), y.get(yk))));
  }
};

const Node = class {
  constructor(head, next = null) {
    this.head = head;
    this.next = next;
  }
};

const Lazy = class {
  constructor(f = (() => null)) {
    this.f = f;
  }
};

const Zero = class {
  get succ() {
    return new Succ(this);
  }
  get numeral() {
    return 0;
  }
  toString() {
    return '0';
  }
};

const Succ = class {
  constructor(pred) {
    this.pred = pred;
  }
  get numeral() {
    return 1 + this.pred.numeral;
  }
  get succ() {
    return new Succ(this);
  }
  toString() {
    return '' + this.numeral;
  }
};

let nextId = 0;
const lvar = name => new LVar(nextId++, name);
const isZero = x => x instanceof Zero;
const isSucc = x => x instanceof Succ;
const isPeano = x => isZero(x) || isSucc(x);
const zero = new Zero();
const one = zero.succ;
const two = one.succ;
const three = two.succ;
const four = three.succ;
const five = four.succ;
const six = five.succ;
const seven = six.succ;
const eight = seven.succ;
const nine = eight.succ;
const peano = n => n === 0 ? zero : new Succ(peano(n - 1));
const _ = new LVar(-1, '_');
const isIgnore = x => isLVar(x) && x.id === -1 && x.name === '_';
const raise = x => { throw new Error(x); };
const isArray = x => Array.isArray(x);
const isNumber = x => typeof x === 'number';
const isHash = x => x instanceof Hash;
const isLazy = x => x instanceof Lazy;
const isNode = x => x instanceof Node;
const isLVar = x => x instanceof LVar;
const isCons = x => x instanceof Cons;
const isList = x => x === null || isCons(x);
const isFunction = x => typeof x === 'function';
const trampoline = f => {
  while (isFunction(f)) {
    f = f();
  }
  return f;
};
const list = (...xs) => {
  let result = null;
  for (let i = xs.length - 1; i >= 0; --i) {
    result = new Cons(xs[i], result);
  }
  return result;
};
const toArray = x => {
  const result = [];
  while (isCons(x)) {
    result.push(x.head);
    x = x.tail;
  }
  return result;
};
const range = max => {
  const result = [];
  for (let i = 0; i < max; ++i) {
    result.push(i);
  }
  return result;
};
const show = x =>
  x === null ? 'null' :
  x === undefined ? 'undefined' :
  typeof x === 'symbol' ? `Symbol(${Symbol.keyFor(x)})` :
  isIgnore(x) ? '_' :
  x.toString();
const isObject = x => x && x.constructor === Object;
const sameElements = (xs, ys) => xs.length === ys.length && xs.every(x => ys.some(y => eq(x, y)));
const sameElementsRespectIgnore = (xs, ys) => xs.length === ys.length && xs.every(x => ys.some(y => eqRespectIgnore(x, y)));
const eq = (x, y) =>
  !isIgnore(x) && !isIgnore(y) && (
    x === y ||
    isLVar(x) && isLVar(y) && x.id === y.id ||
    isZero(x) && isZero(y) ||
    isSucc(x) && isSucc(y) && eq(x.pred, y.pred) ||
    isCons(x) && isCons(y) && eq(x.head, y.head) && eq(x.tail, y.tail) ||
    isArray(x) && isArray(y) && x.length === y.length && x.every((xi, i) => eq(xi, y[i])) ||
    isHash(x) && isHash(y) && Hash.eq(x, y) ||
    isObject(x) && isObject(y) && sameElements(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => eq(x[k], y[k])));
const eqRespectIgnore = (x, y) =>
    x === y ||
    isLVar(x) && isLVar(y) && x.id === y.id ||
    isZero(x) && isZero(y) ||
    isSucc(x) && isSucc(y) && eqRespectIgnore(x.pred, y.pred) ||
    isCons(x) && isCons(y) && eqRespectIgnore(x.head, y.head) && eqRespectIgnore(x.tail, y.tail) ||
    isArray(x) && isArray(y) && x.length === y.length && x.every((xi, i) => eqRespectIgnore(xi, y[i])) ||
    isHash(x) && isHash(y) && Hash.eqRespectIgnore(x, y) ||
    isObject(x) && isObject(y) && sameElementsRespectIgnore(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => eqRespectIgnore(x[k], y[k]));
const add = (map, key, value) => map ? map.set(key, value) : map;
const walk = (x, map) => isLVar(x) && map && map.has(x) ? walk(map.get(x), map) : x;
const unifyWalked = (x, y, map) =>
  eq(x, y) ? map :
  isLVar(x) ? add(map, x, y) :
  isLVar(y) ? add(map, y, x) :
  unifyTerms(x, y, map);
const unify = (x, y, map) => unifyWalked(walk(x, map), walk(y, map), map);
const unifyTerms = (x, y, map) =>
  isCons(x) && isCons(y) ? unify(x.tail, y.tail, unify(x.head, y.head, map)) :
  isSucc(x) && isSucc(y) ? unify(x.pred, y.pred, map) :
  null;
const mergeStreams = (x, y) =>
  isLazy(x) ? mergeStreams(x.f(), y) :
  x === null ? y :
  isNode(x) ? new Node(x.head, mergeStreams(x.next, y)) :
  isFunction(x) ? (() => mergeStreams(y, x())) :
  isHash(x) ? new Node(x, isHash(y) ? new Node(y) : y) :
  raise('unrecognized element in stream: ' + show(x));
const flatMapStream = (s, g) =>
  isLazy(s) ? flatMapStream(s.f(), g) :
  isNode(s) ? (isFunction(g) ? mergeStreams(g(s.head), flatMapStream(s.next, g)) : s) :
  isFunction(s) ? (() => flatMapStream(s(), g)) :
  s;
const realize = s =>
  isLazy(s) ? realize(s.f()) :
  isNode(s) ? s :
  isFunction(s) ? trampoline(s) :
  s;
const streamToSeq = s =>
  isLazy(s) ? streamToSeq(s.f()) :
  isNode(s) ? new Lazy(() => new Cons(s.head, streamToSeq(s.next))) :
  isFunction(s) ? streamToSeq(realize(s)) :
  s;
const seqToArray = (n, s) => {
  const result = [];
  for (let i = 0; i < n; ++i) {
    s = realize(s);
    if (isCons(s)) {
      result.push(s.head);
      s = s.tail;
    } else if (isNode(s)) {
      result.push(s.head);
      s = s.next;
    } else {
      return result;
    }
  }
  return result;
};
const equiv = (u, v) => state => {
  const unified = unify(u, v, state);
  // TODO: check if the map is unchanged?
  return unified ? new Node(unified) : null;
};
const deepWalkValue = (v, state) =>
  isLazy(v) ? deepWalk(v.f(), state) :
  isNode(v) ? new Node(deepWalk(v.head, state), deepWalk(v.next, state)) :
  isCons(v) ? new Cons(deepWalk(v.head, state), deepWalk(v.tail, state)) :
  isSucc(v) ? new Succ(deepWalk(v.pred, state)) :
  isFunction(v) ? deepWalk(trampoline(v), state) :
  v;
const deepWalk = (v, state) => deepWalkValue(walk(v, state), state);
const reifyState = (v, state) =>
  isLVar(v) ? add(state, v, _) :
  isLazy(v) ? reify(v.f(), state) :
  isNode(v) ? reify(realize(v.next), reify(realize(v.head), state)) :
  isCons(v) ? reify(v.tail, reify(v.head, state)) :
  isSucc(v) ? reify(v.pred, state) :
  isFunction(v) ? reify(trampoline(v), state) :
  state;
const reify = (v, state) => reifyState(walk(v, state), state);
const resolveVars = (vars, state) => new Hash(vars.map(v => {
  const v2 = deepWalk(v, state);
  return [v, deepWalk(v2, reify(v2, new Hash()))];
}));
const delay = g => state => () => g(state);
const fresh = f => state => {
  const args = paramsOf(f);
  return f(...range(args.length).map(n => lvar(args[n])))(state);
};
const goal = g => Object.assign(g, { isGoal: true });
const isGoal = x => x && x.isGoal;
// const metagoal = mg => (...lvals) => {
//   const prereqs = lvals.filter(x => x.isPartial).map(x => x.goal);
//   const args = lvals.map(x => x.isPartial ? x.lval : x);
//   return conj(...prereqs, delayGoal(mg)(...args));
// };
// const lengthom = metagoal((n, xs) =>
//   conde(
//     [zeroo(n), emptyo(xs)],
//     [lengthom(predv(n), restv(xs))]));
// const restv = xs => {
//   const lval = genvar('y');
//   return { lval, goal: resto(lval, xs), isPartial: true };
// };
// const predv = n => {
//   const lval = genvar('rest');
//   return { lval, goal: predo(n, lval), isPartial: true };
// };
// const genvar = name => new LVar(Math.random(), name);

// Goal = List LVal -> Stream State
// MetaGoal = List (LVal | Goal) -> Stream State
// Generator = State -> Stream State
// Composer = List Generator -> Generator
// GoalConstructor = List (LVal | Goal) -> (Goal | MetaGoal)
// predv :: LVal -> (LVar, Goal)
// m :: LVar
// predo :: (LVal, LVal) -> Generator
// Partial = Goal (specialized)
// predv :: LVal -> LVal -> Generator

const run = (n, g) => seqToArray(n, streamToSeq(g(new Hash())));
const runAll = g => run(32, g);
const parseFunction = fn => acorn.Parser.parseExpressionAt(fn.toString(), 0);
const paramsOf = fn => parseFunction(fn).params.map(p => p.name);
const overloaded = (...fs) => {
  const aritites = fs.map(fn => {
    const params = parseFunction(fn).params;
    return {
      arity: params.filter(p => p.type !== 'RestElement').length,
      rest: params.some(p => p.type === 'RestElement'),
      fn
    };
  });
  return (...args) => {
    const { fn } = aritites.find(({ arity, rest }) => rest ? args.length >= arity : args.length === arity);
    return fn ? fn(...args) : raise(`no match for arity: ${args.length}`);
  };
};
const nub = xs => {
  const ys = [];
  for (const x of xs) {
    if (!ys.some(y => eqRespectIgnore(x, y))) {
      ys.push(x);
    }
  }
  return ys;
};
const successful = x => ({ success: true, results: isArray(x) ? x : [x] });
const tautology = { success: true, results: [] };
const contradiction = { success: false, results: [] };
const runResolve = f => {
  const params = paramsOf(f);
  const initId = nextId;
  const maps = nub(runAll(fresh(f)).map(m => resolveVars(params.map((n, i) => new LVar(i + initId, n)), m)));
  if (maps && maps.length > 0) {
    const kvss = maps
      .map(m => m.entries.filter(([k, v]) => params.includes(k.name)))
      .filter(kvs => kvs.length > 0);
    if (kvss.length > 0) {
      return {
        success: true,
        results: kvss.map(kvs => Object.fromEntries(kvs.map(([k, v]) => [k.name, v])))
      };
    }
    return tautology;
  }
  return contradiction;
};
const play = f => {
  const actual = runResolve(f);
  if (actual.success && actual.results.length > 0) {
    console.log(actual.results
      .map(r =>
        Object.entries(r)
          .map(([k, v]) => k + ' = ' + show(v))
          .join(' | '))
      .join('\n'));
  }
  return actual.success;
};

const disj = overloaded(
  () => fails,
  g => g,
  (g0, g1) => state =>
    mergeStreams(
      isFunction(g0) ? g0(state) : new Node(state),
      isFunction(g1) ? g1(state) : new Node(state)),
  (g0, ...gs) =>
    gs.reduce((result, g) =>
      disj(result, delay(g)), delay(g0)));
const conj = overloaded(
  () => succeeds,
  g => g,
  (g0, g1) => state =>
    isFunction(g0) ? flatMapStream(g0(state), g1) :
    isFunction(g1) ? flatMapStream(g1(state), g0) :
    new Node(state),
  (g0, ...gs) =>
    gs.reduce((result, g) =>
      conj(result, delay(g)), delay(g0)));
const conde = (...clauses) => disj(...clauses.map(c => conj(...c)));
const conso = goal((first, rest, out) => equiv(new Cons(first, rest), out));
const firsto = goal((first, out) => fresh(rest => conso(first, rest, out)));
const resto = goal((rest, out) => fresh(first => conso(first, rest, out)));
const singleo = goal((x, xs) => cons(x, null, xs));
const emptyo = goal(s => equiv(null, s));
const nonemptyo = goal(x => conso(_, _, x));
const appendo = goal((xs, ys, zs) =>
  conde(
    [emptyo(xs), equiv(ys, zs)],
    [emptyo(ys), equiv(xs, zs)],
    [fresh((f, xr, zr) =>
      conj(
        conso(f, xr, xs),
        conso(f, zr, zs),
        appendo(xr, ys, zr)))]));
const rotateo = goal((xs, ys) =>
  conde(
    [emptyo(xs), emptyo(ys)],
    [fresh((x, xr) =>
      conj(
        conso(x, xr, xs),
        appendo(xr, list(x), ys)))]));
const membero = goal((x, xs) =>
  conde(
    [firsto(x, xs)],
    [fresh(ys =>
      conj(
        resto(ys, xs),
        membero(x, ys)))]));
const reverseo = goal((xs, ys) =>
  conde(
    [emptyo(xs), emptyo(ys)],
    [fresh((xf, xr, yl) =>
      conj(
        conso(xf, xr, xs),
        reverseo(xr, yl),
        appendo(yl, list(xf), ys)))]));
// const predv = x => {
//   const y = new LVar(Math.random(), 'y'); // TODO: not good, very bad for you
//   return equiv(y, );
// };
const lengtho = goal((n, xs) =>
  conde(
    [zeroo(n), emptyo(xs)],
    [fresh((m, xr) =>
      conj(
        predo(n, m),
        resto(xr, xs),
        lengtho(m, xr)))]));
const rangeo = goal((x, xs) =>
  conde(
    [zeroo(x), emptyo(xs)],
    [fresh((xp, xr) =>
      conj(
        predo(x, xp),
        conso(x, xr, xs),
        rangeo(xp, xr)))]));
const ato = goal((xs, i, x) =>
  conde(
    [zeroo(i), firsto(x, xs)],
    [fresh((xr, j) =>
      conj(
        resto(xr, xs),
        predo(i, j),
        ato(xr, j, x)))]));
const squareo = goal(xss =>
  fresh((xs, n) =>
    conj(
      lengtho(n, xss),
      everyg(xs => lengtho(n, xs), xss))));
const firstso = goal((xss, ys) =>
  conde(
    [emptyo(xss), emptyo(ys)],
    [fresh((x, xs, xrs, yr) =>
      conj(
        conso(xs, xrs, xss),
        firsto(x, xs),
        conso(x, yr, ys),
        firstso(xrs, yr)))]));
const atso = goal((i, xss, ys) =>
  conde(
    [emptyo(xss), emptyo(ys)],
    [fresh((x, xs, xrs, yr) =>
      conj(
        conso(xs, xrs, xss),
        ato(xs, i, x),
        conso(x, yr, ys),
        atso(i, xrs, yr)))]));
const ato2d = goal((xss, i, j, x) =>
  fresh(xs =>
    conj(
      ato(xss, i, xs),
      ato(xs, j, x))));
const crossCuto3o = goal((rows, cols) =>
  fresh((col0, col1, col2) =>
    conj(
      lengtho(three, rows),
      equiv(cols, list(col0, col1, col2)),
      atso(zero, rows, col0),
      atso(one, rows, col1),
      atso(two, rows, col2))));
const crossCuto9o = goal((rows, cols) =>
  fresh((col0, col1, col2, col3, col4, col5, col6, col7, col8) =>
    conj(
      lengtho(nine, rows),
      equiv(cols, list(col0, col1, col2, col3, col4, col5, col6, col7, col8)),
      atso(zero, rows, col0),
      atso(one, rows, col1),
      atso(two, rows, col2),
      atso(three, rows, col3),
      atso(four, rows, col4),
      atso(five, rows, col5),
      atso(six, rows, col6),
      atso(seven, rows, col7),
      atso(eight, rows, col8))));
const transposeo = goal((rows, cols) =>
  conde(
    [emptyo(rows), emptyo(cols)],
    [fresh(r =>
      conj(
        firsto(r, rows),
        _transposeo_3(r, rows, cols)))]));
const _transposeo_3 = goal((rows, middles, cols) =>
  conde(
    [emptyo(rows), emptyo(cols)],
    [fresh((rr, fc, rc, mo) =>
      conj(
        resto(rr, rows),
        conso(fc, rc, cols),
        _lists_firsts_rests(middles, fc, mo),
        _transposeo_3(rr, mo, rc)))]));
const _lists_firsts_rests = goal((xs, ys, zs) =>
  conde(
    [emptyo(xs), emptyo(ys), emptyo(zs)],
    [fresh((fos, f, os, rest, fs, oss) =>
      conj(
        conso(fos, rest, xs),
        conso(f, os, fos),
        conso(f, fs, ys),
        conso(os, oss, zs),
        _lists_firsts_rests(rest, fs, oss)))]));
const blockso = goal((rows, blocks) =>
  fresh((r0, r1, r2, r3, r4, r5, r6, r7, r8, b0, b1, b2, b01) =>
    conj(
      equiv(rows, list(r0, r1, r2, r3, r4, r5, r6, r7, r8)),
      blockso_help(r0, r1, r2, b0),
      blockso_help(r3, r4, r5, b1),
      blockso_help(r6, r7, r8, b2),
      appendo(b0, b1, b01),
      appendo(b01, b2, blocks))));
const blockso_help = goal((xs, ys, zs, bs) =>
  conde(
    [emptyo(xs), emptyo(ys), emptyo(zs), emptyo(bs)],
    [fresh((x0, x1, x2, xr,
            y0, y1, y2, yr,
            z0, z1, z2, zr,
            br) =>
      conj(
        appendo(list(x0, x1, x2), xr, xs),
        appendo(list(y0, y1, y2), yr, ys),
        appendo(list(z0, z1, z2), zr, zs),
        conso(list(x0, x1, x2, y0, y1, y2, z0, z1, z2), br, bs),
        blockso_help(xr, yr, zr, br)))]));
grid9 = list(...[0,0,0,0,0,0,0,0,0].map(y => list(...range(9).map(x => x + 1)))) // TODO: remove
grid99 = list(...[range(9).map(x => x + 1), range(9).map(x => x + 10), range(9).map(x => x + 19), range(9).map(x => x + 28), range(9).map(x => x + 37), range(9).map(x => x + 46), range(9).map(x => x + 55), range(9).map(x => x + 64), range(9).map(x => x + 73)].map(xs => list(...xs)))
const crossCuto = goal((rows, cols) =>
  fresh((n, is, js) =>
    conj(
      lengtho(n, rows),
      lengtho(n, cols),
      rangeo(n, is),
      rangeo(n, js),
      everyg(i => everyg(j => fresh(x => conj(ato2d(rows, i, j, x), ato2d(cols, j, i, x))), js), is))));
// const crossCuto = (rows, cols) => crossCuto_recur(zero, rows, cols);
// const crossCuto_recur = (i, rows, cols) =>
//   conde(
//     [emptyo(rows), emptyo(cols)],
//     [fresh((j, col, restCols) =>
//       conj(
//         atso(i, rows, col),
//         conso(col, restCols, cols),
//         succo(i, j),
//         crossCuto_recur(j, rows, restCols)))]);
const oneThruNineo = goal(xs => everyg(x => membero(x, xs), list(...range(9).map(x => 1))));
const succeeds = state => new Node(state);
const fails = state => null;
const assertg = (...assertions) => state => new Node(new Hash(assertions), state);
const everyg = (g, xs) => state => {
  xs = walk(xs, state);
  return function everygStep(g, xs, i) {
    return isCons(xs) ? conj(g(xs.head, i), everygStep(g, xs.tail, i.succ)) : succeeds;
  }(g, xs, zero)(state);
};
const someg = (g, xs) => state => {
  xs = walk(xs, state);
  return function somegStep(g, xs, i) {
    return isCons(xs) ? disj(g(xs.head, i), somegStep(g, xs.tail, i.succ)) : fails;
  }(g, xs, zero)(state);
};
const overlapo = goal((xs, ys) =>
  fresh((x, xr) =>
    conj(
      conso(x, xr, xs),
      disj(
        membero(x, ys),
        overlapo(xr, ys)))));
const predo = goal((x, y) => equiv(x, new Succ(y)));
const succo = goal((x, y) => equiv(new Succ(x), y));
const zeroo = goal(x => equiv(x, zero));
const oneo = goal(x => equiv(x, one));
const addo = goal((x, y, z) =>
  conde(
    [zeroo(x), equiv(y, z)],
    [zeroo(y), equiv(x, z)],
    [fresh((xp, zp) =>
      conj(
        predo(x, xp),
        predo(z, zp),
        addo(xp, y, zp)))]));
const eveno = x =>
  disj(
    zeroo(x),
    fresh(xp =>
      conj(
        predo(x, xp),
        oddo(xp))));
const oddo = x =>
  disj(
    oneo(x),
    fresh(xp =>
      conj(
        predo(x, xp),
        eveno(xp))));
const gteo = (x, y) => goal(addo(y, _, x));
const lteo = (x, y) => goal(addo(x, _, y));
const gto = (x, y) => goal(fresh(diff => conj(addo(y, diff, x), gteo(diff, one))));
const lto = (x, y) => goal(fresh(diff => conj(addo(x, diff, y), gteo(diff, one))));
// TODO: only does forward multiplication, doesn't do division
// const mulo = (x, y, z) =>
//   conde(
//     [zeroo(x), zeroo(z)],
//     [zeroo(y), zeroo(z)],
//     [oneo(x), equiv(y, z)],
//     [oneo(y), equiv(x, z)],
//     [fresh((xp, w) =>
//       conj(
//         predo(x, xp),
//         mulo(xp, y, w),
//         addo(y, w, z)))]);

// TODO: predicates like is_numbero/1, is_listo/1, etc...
// TODO: negation like noto/1

/*
%% sudoku.pl
:- use_module(library(clpfd)).

sudoku(Puzzle) :-
    flatten(Puzzle, Tmp), Tmp ins 1..9,
    Rows = Puzzle,
    transpose(Rows, Columns),
    blocks(Rows, Blocks),
    maplist(all_distinct, Rows),
    maplist(all_distinct, Columns),
    maplist(all_distinct, Blocks),
    maplist(label, Rows).

blocks([A,B,C,D,E,F,G,H,I], Blocks) :-
    blocks(A,B,C,Block1), blocks(D,E,F,Block2), blocks(G,H,I,Block3),
    append([Block1, Block2, Block3], Blocks).

blocks([], [], [], []).
blocks([A,B,C|Bs1],[D,E,F|Bs2],[G,H,I|Bs3], [Block|Blocks]) :-
    Block = [A,B,C,D,E,F,G,H,I],
    blocks(Bs1, Bs2, Bs3, Blocks).
 */
const sudoku = goal(rows =>
  fresh((cols, boxes) =>
    conj(
      transposeo(rows, cols),
      blockso(rows, boxes),
      everyg(oneThruNineo, rows),
      everyg(oneThruNineo, cols),
      everyg(oneThruNineo, boxes))));
const oneThruThreeo = goal(xs => everyg(x => membero(x, xs), list(1, 2, 3)));
const miniku = goal(rows =>
  fresh(cols =>
    conj(
      transposeo(rows, cols),
      everyg(oneThruThreeo, rows),
      everyg(oneThruThreeo, cols))));
const oneThruNg = n => goal(xs => everyg(x => membero(x, xs), list(...range(n).map(x => x + 1))));
const varkug = n => goal(rows =>
  fresh(cols =>
    conj(
      transposeo(rows, cols),
      everyg(oneThruNg(n), rows),
      everyg(oneThruNg(n), cols))));
/*
play(rows => fresh((a, b, c, d, e, f, g, h, i) =>
  conj(
    equiv(rows, list(a, b, c, d, e, f, g, h, i)),
    equiv(a, list(8, 2, 7, 1, 5, 4, 3, 9, 6)),
    equiv(b, list(9, 6, 5, 3, 2, 7, 1, 4, 8)),
    equiv(c, list(3, 4, 1, 6, 8, 9, 7, 5, 2)),
    equiv(d, list(5, 9, 3, 4, 6, 8, 2, 7, 1)),
    equiv(e, list(4, 7, 2, 5, 1, 3, 6, 8, 9)),
    equiv(f, list(6, 1, 8, 9, 7, 2, 4, 3, 5)),
    equiv(g, list(7, 8, 6, 2, 3, 5, 9, 1, 4)),
    equiv(h, list(1, 5, 4, 7, 9, 6, 8, 2, 3)),
    equiv(i, list(2, 3, 9, 8, 4, 1, 5, 6, 7)),
    sudoku(rows))))
 */
