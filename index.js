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
};

const State = class {
  constructor(map = new Hash(), nextId = 0) {
    this.map = map;
    this.nextId = nextId;
  }
};

const Node = class {
  constructor(head, next = null) {
    this.head = head;
    this.next = next;
  }
}

const Lazy = class {
  constructor(f = (() => null)) {
    this.f = f;
  }
};

const Reified = class {
  constructor(n) {
    this.n = n;
  }
  toString() {
    return '%' + this.n;
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
const isZero = x => x instanceof Zero;
const isSucc = x => x instanceof Succ;
const isPeano = x => isZero(x) || isSucc(x);
const Peano = class {
  static eq(x, y) {
    return isZero(x) && isZero(y) ||
           isSucc(x) && isSucc(y) && Peano.eq(x.pred, y.pred);
  }
};

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
const isReified = x =>
  x instanceof Reified ||
  isCons(x) && (isReified(x.head) || isReified(x.tail)) ||
  isSucc(x) && isReified(x.pred);
const raise = x => { throw new Error(x); };
const withMap = (state, map) => new State(map, state.nextId);
const incNextId = (state, n = 1) => new State(state.map, state.nextId + n);
const isArray = x => Array.isArray(x);
const isNumber = x => typeof x === 'number';
const isHash = x => x instanceof Hash;
const isLazy = x => x instanceof Lazy;
const isNode = x => x instanceof Node;
const isLVar = x => x instanceof LVar;
const isCons = x => x instanceof Cons;
const isList = x => x === null || isCons(x);
const isState = x => x instanceof State;
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
  x.toString();
const isObject = x => x && x.constructor === Object;
const sameElements = (xs, ys) => xs.length === ys.length && xs.every(x => ys.some(y => eq(x, y)));
const eq = (x, y) =>
  !isIgnore(x) && !isIgnore(y) && (
    x === y ||
    isLVar(x) && isLVar(y) && x.id === y.id ||
    isPeano(x) && isPeano(y) && Peano.eq(x, y) ||
    isCons(x) && isCons(y) && eq(x.head, y.head) && eq(x.tail, y.tail) ||
    isArray(x) && isArray(y) && x.length === y.length && x.every((xi, i) => eq(xi, y[i])) ||
    isHash(x) && isHash(y) && Hash.eq(x, y)) ||
    isObject(x) && isObject(y) && sameElements(Object.keys(x), Object.keys(y)) && Object.keys(x).every(k => eq(x[k], y[k]));
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
  isState(x) ? new Node(x, isState(y) ? new Node(y) : y) :
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
  const newMap = unify(u, v, state.map);
  // TODO: check if the map is unchanged?
  return newMap ? new Node(withMap(state, newMap)) : null;
};
const deepWalkValue = (v, map) =>
  isLazy(v) ? deepWalk(v.f(), map) :
  isNode(v) ? new Node(deepWalk(v.head, map), deepWalk(v.next, map)) :
  isCons(v) ? new Cons(deepWalk(v.head, map), deepWalk(v.tail, map)) :
  isSucc(v) ? new Succ(deepWalk(v.pred, map)) :
  isFunction(v) ? deepWalk(trampoline(v), map) :
  v;
const deepWalk = (v, map) => deepWalkValue(walk(v, map), map);
const reifyState = (v, map) =>
  isLVar(v) ? add(map, v, new Reified(map.size)) :
  isLazy(v) ? reify(v.f(), map) :
  isNode(v) ? reify(realize(v.next), reify(realize(v.head), map)) :
  isCons(v) ? reify(v.tail, reify(v.head, map)) :
  isSucc(v) ? reify(v.pred, map) :
  isFunction(v) ? reify(trampoline(v), map) :
  map;
const reify = (v, map) => reifyState(walk(v, map), map);
const resolveVars = (vars, map) => new Hash(vars.map(v => {
  const v2 = deepWalk(v, map);
  return [v, deepWalk(v2, reify(v2, new Hash()))];
}));
const delayGoal = goal => state => () => goal(state);
const fresh = f => state => {
  const args = paramsOf(f);
  const arity = args.length;
  const vars = range(arity).map(n => new LVar(state.nextId + n, args[n]));
  return f(...vars)(incNextId(state, arity));
};
const run = (n, g) => seqToArray(n, streamToSeq(g(new State()))).map(x => x.map);
const runAll = g => run(32, g);
const paramsOf = fn => acorn.Parser.parseExpressionAt(fn.toString(), 0).params.map(p => p.name);
const nub = xs => {
  const ys = [];
  for (const x of xs) {
    if (!ys.some(y => eq(x, y))) {
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
  const maps = nub(runAll(fresh(f)).map(m => resolveVars(params.map((n, i) => new LVar(i, n)), m)));
  if (maps && maps.length > 0) {
    const kvss = maps
      .map(m => m.entries.filter(([k, v]) => params.includes(k.name) && !isIgnore(v) && !isReified(v)))
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

const disj = (...goals) => {
  switch (goals.length) {
    case 0: return failg;
    case 1: return goals[0];
    case 2:
      const g0 = goals[0];
      const g1 = goals[1];
      return state =>
        mergeStreams(
          isFunction(g0) ? g0(state) : new Node(state),
          isFunction(g1) ? g1(state) : new Node(state));
  }
  let result = delayGoal(goals[0]);
  for (let i = 1; i < goals.length; ++i) {
    result = disj(result, delayGoal(goals[i]));
  }
  return result;
};
const conj = (...goals) => {
  switch (goals.length) {
    case 0: return succeedg;
    case 1: goals[0];
    case 2:
      const g0 = goals[0];
      const g1 = goals[1];
      return state =>
        isFunction(g0) ? flatMapStream(g0(state), g1) :
        isFunction(g1) ? flatMapStream(g1(state), g0) :
        new Node(state);
  }
  let result = delayGoal(goals[0]);
  for (let i = 1; i < goals.length; ++i) {
    result = conj(result, delayGoal(goals[i]));
  }
  return result;
};
const conde = (...clauses) => disj(...clauses.map(c => conj(...c)));
const conso = (first, rest, out) => equiv(new Cons(first, rest), out);
const firsto = (first, out) => fresh(rest => conso(first, rest, out));
const resto = (rest, out) => fresh(first => conso(first, rest, out));
const singleo = (x, xs) => cons(x, null, xs);
const emptyo = s => equiv(null, s);
const nonemptyo = x => conso(_, _, x);
const appendo = (xs, ys, zs) =>
  conde(
    [emptyo(xs), equiv(ys, zs)],
    [emptyo(ys), equiv(xs, zs)],
    [fresh((f, xr, zr) =>
      conj(
        conso(f, xr, xs),
        conso(f, zr, zs),
        appendo(xr, ys, zr)))]);
const rotateo = (xs, ys) =>
  conde(
    [emptyo(xs), emptyo(ys)],
    [fresh((x, xr) =>
      conj(
        conso(x, xr, xs),
        appendo(xr, list(x), ys)))]);
const membero = (x, xs) =>
  conde(
    [firsto(x, xs)],
    [fresh(ys =>
      conj(
        resto(ys, xs),
        membero(x, ys)))]);
const reverseo = (xs, ys) =>
  conde(
    [emptyo(xs), emptyo(ys)],
    [fresh((xf, xr, yl) =>
      conj(
        conso(xf, xr, xs),
        reverseo(xr, yl),
        appendo(yl, list(xf), ys)))]);
const lengtho = (n, xs) =>
  conde(
    [zeroo(n), emptyo(xs)],
    [fresh((m, xr) =>
      conj(
        predo(n, m),
        resto(xr, xs),
        lengtho(m, xr)))]);
const rangeo = (x, xs) =>
  conde(
    [zeroo(x), emptyo(xs)],
    [fresh((xp, xr) =>
      conj(
        predo(x, xp),
        conso(x, xr, xs),
        rangeo(xp, xr)))]);
const ato = (xs, i, x) =>
  conde(
    [zeroo(i), firsto(x, xs)],
    [fresh((xr, j) =>
      conj(
        resto(xr, xs),
        predo(i, j),
        ato(xr, j, x)))]);
const squareo = xss =>
  fresh((xs, n) =>
    conj(
      lengtho(n, xss),
      everyg(xs => lengtho(n, xs), xss)));
const firstso = (xss, ys) =>
  conde(
    [emptyo(xss), emptyo(ys)],
    [fresh((x, xs, xrs, yr) =>
      conj(
        conso(xs, xrs, xss),
        firsto(x, xs),
        conso(x, yr, ys),
        firstso(xrs, yr)))]);
const atso = (i, xss, ys) =>
  conde(
    [emptyo(xss), emptyo(ys)],
    [fresh((x, xs, xrs, yr) =>
      conj(
        conso(xs, xrs, xss),
        ato(xs, i, x),
        conso(x, yr, ys),
        atso(i, xrs, yr)))]);
const ato2d = (xss, i, j, x) =>
  fresh(xs =>
    conj(
      ato(xss, i, xs),
      ato(xs, j, x)));
const crossCuto3o = (rows, cols) =>
  fresh((col0, col1, col2) =>
    conj(
      lengtho(three, rows),
      equiv(cols, list(col0, col1, col2)),
      atso(zero, rows, col0),
      atso(one, rows, col1),
      atso(two, rows, col2)));
const crossCuto9o = (rows, cols) =>
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
      atso(eight, rows, col8)));
const transposeo = (rows, cols) =>
  conde(
    [emptyo(rows), emptyo(cols)],
    [fresh(r =>
      conj(
        firsto(r, rows),
        _transposeo_3(r, rows, cols)))]);
const _transposeo_3 = (rows, middles, cols) =>
  conde(
    [emptyo(rows), emptyo(cols)],
    [fresh((rr, fc, rc, mo) =>
      conj(
        resto(rr, rows),
        conso(fc, rc, cols),
        _lists_firsts_rests(middles, fc, mo),
        _transposeo_3(rr, mo, rc)))]);
const _lists_firsts_rests = (xs, ys, zs) =>
  conde(
    [emptyo(xs), emptyo(ys), emptyo(zs)],
    [fresh((fos, f, os, rest, fs, oss) =>
      conj(
        conso(fos, rest, xs),
        conso(f, os, fos),
        conso(f, fs, ys),
        conso(os, oss, zs),
        _lists_firsts_rests(rest, fs, oss)))]);
const blockso = (rows, blocks) =>
  fresh((r0, r1, r2, r3, r4, r5, r6, r7, r8, b0, b1, b2, b01) =>
    conj(
      equiv(rows, list(r0, r1, r2, r3, r4, r5, r6, r7, r8)),
      blockso_help(r0, r1, r2, b0),
      blockso_help(r3, r4, r5, b1),
      blockso_help(r6, r7, r8, b2),
      appendo(b0, b1, b01),
      appendo(b01, b2, blocks)));
const blockso_help = (xs, ys, zs, bs) =>
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
        blockso_help(xr, yr, zr, br)))]);
grid9 = list(...[0,0,0,0,0,0,0,0,0].map(y => list(...range(9).map(x => x + 1)))) // TODO: remove
grid99 = list(...[range(9).map(x => x + 1), range(9).map(x => x + 10), range(9).map(x => x + 19), range(9).map(x => x + 28), range(9).map(x => x + 37), range(9).map(x => x + 46), range(9).map(x => x + 55), range(9).map(x => x + 64), range(9).map(x => x + 73)].map(xs => list(...xs)))
const crossCuto = (rows, cols) =>
  fresh((n, is, js) =>
    conj(
      lengtho(n, rows),
      lengtho(n, cols),
      rangeo(n, is),
      rangeo(n, js),
      everyg(i => everyg(j => fresh(x => conj(ato2d(rows, i, j, x), ato2d(cols, j, i, x))), js), is)));
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
const oneThruNineo = xs => everyg(x => membero(x, xs), list(...range(9).map(x => 1)));
const succeedg = state => new Node(state.map ? state : withMap(state, new Hash()), null);
const failg = state => null;
const assertg = (...assertions) => s => new Node(new State(new Hash(assertions)), s);
const everyg = (g, xs) => state => {
  xs = walk(xs, state.map);
  return function everygStep(g, xs, i) {
    return isCons(xs) ? conj(g(xs.head, i), everygStep(g, xs.tail, i.succ)) : succeedg;
  }(g, xs, zero)(state);
};
const someg = (g, xs) => state => {
  xs = walk(xs, state.map);
  return function somegStep(g, xs) {
    return isCons(xs) ? disj(g(xs.head), somegStep(g, xs.tail)) : failg;
  }(g, xs)(state);
};
const overlapo = (xs, ys) =>
  fresh((x, xr) =>
    conj(
      conso(x, xr, xs),
      disj(
        membero(x, ys),
        overlapo(xr, ys))));
const predo = (x, y) => equiv(x, new Succ(y));
const succo = (x, y) => equiv(new Succ(x), y);
const zeroo = x => equiv(x, zero);
const oneo = x => equiv(x, one);
const addo = (x, y, z) =>
  conde(
    [zeroo(x), equiv(y, z)],
    [zeroo(y), equiv(x, z)],
    [fresh((xp, zp) =>
      conj(
        predo(x, xp),
        predo(z, zp),
        addo(xp, y, zp)))]);
const gteo = (x, y) => addo(y, _, x);
const lteo = (x, y) => addo(x, _, y);
const gto = (x, y) => fresh(diff => conj(addo(y, diff, x), gteo(diff, one)));
const lto = (x, y) => fresh(diff => conj(addo(x, diff, y), gteo(diff, one)));
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
const sudoku = rows =>
  fresh((cols, boxes) =>
    conj(
      transposeo(rows, cols),
      blockso(rows, boxes),
      everyg(oneThruNineo, rows),
      everyg(oneThruNineo, cols),
      everyg(oneThruNineo, boxes)));
const oneThruThreeo = xs => everyg(x => membero(x, xs), list(1, 2, 3));
const miniku = rows =>
  fresh(cols =>
    conj(
      transposeo(rows, cols),
      everyg(oneThruThreeo, rows),
      everyg(oneThruThreeo, cols)));
const oneThruNg = n => xs => everyg(x => membero(x, xs), list(...range(n).map(x => x + 1)));
const varkug = n => rows =>
  fresh(cols =>
    conj(
      transposeo(rows, cols),
      everyg(oneThruNg(n), rows),
      everyg(oneThruNg(n), cols)));
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
