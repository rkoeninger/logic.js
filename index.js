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
    let result = '(' + this.head;
    let more = this.tail;
    while (isCons(more)) {
      result += ' ' + more.head;
      more = more.tail;
    }
    if (more) {
      result += ' . ' + more;
    }
    return result + ')';
  }
};

const Hash = class {
  constructor(entries = []) {
    this.entries = entries;
  }
  has(key) {
    return this.entries.some(([k, _]) => eq(k, key));
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
}

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

const raise = x => { throw new Error(x); };
const withMap = (state, map) => new State(map, state.nextId);
const incNextId = (state, n = 1) => new State(state.map, state.nextId + n);
const isArray = x => Array.isArray(x);
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
const toList = x => {
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
const eq = (x, y) =>
  x === y ||
  isLVar(x) && isLVar(y) && x.id === y.id ||
  isCons(x) && isCons(y) && eq(x.head, y.head) && eq(x.tail, y.tail) ||
  isArray(x) && isArray(y) && x.length === y.length && x.every((xi, i) => eq(xi, y[i])) ||
  isHash(x) && isHash(y) && Hash.eq(x, y);
const add = (map, key, value) => map ? map.set(key, value) : map;
const walk = (x, map) => isLVar(x) && map && map.has(x) ? walk(map.get(x), map) : x;
const unifyWalked = (x, y, map) =>
  eq(x, y) ? map :
  isLVar(x) ? add(map, x, y) :
  isLVar(y) ? add(map, y, x) :
  unifyTerms(x, y, map);
const unify = (x, y, map) => unifyWalked(walk(x, map), walk(y, map), map);
const unifyTerms = (x, y, map) => isCons(x) && isCons(y) ? unify(x.tail, y.tail, unify(x.head, y.head, map)) : null;
const mergeStreams = (x, y) =>
  isLazy(x) ? mergeStreams(x.f(), y) :
  x === null ? y :
  isNode(x) ? new Node(x.head, mergeStreams(x.next, y)) :
  isFunction(x) ? (() => mergeStreams(y, x())) :
  raise('unrecognized element type in stream: ' + x);
const flatMapStream = (s, g) =>
  isLazy(s) ? flatMapStream(s.f(), g) :
  isNode(s) ? mergeStreams(g(s.head), flatMapStream(s.next, g)) :
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
const singleStream = x => new Node(x, null);

// in Clojure, lazy-seq eval's expressions when the first one is requested and then caches the results

const equiv = (u, v) => state => {
  const newMap = unify(u, v, state.map);
  return newMap ? new Node(withMap(state, newMap)) : null;
};
const deepWalkValue = (v, map) =>
  isLazy(v) ? deepWalk(v.f(), map) :
  isNode(v) ? new Node(deepWalk(v.head, map), deepWalk(v.next, map)) :
  isCons(v) ? new Cons(deepWalk(v.head, map), deepWalk(v.tail, map)) :
  isFunction(v) ? deepWalk(trampoline(v), map) :
  v;
const deepWalk = (v, map) => deepWalkValue(walk(v, map), map);
const reifyState = (v, map) =>
  isLVar(v) ? add(map, v, new Reified(map.size)) :
  isLazy(v) ? reify(v.f(), map) :
  isNode(v) ? reify(realize(v.next), reify(realize(v.head), map)) :
  isCons(v) ? reify(v.tail, reify(v.head, map)) :
  isFunction(v) ? reify(trampoline(v), map) :
  map;
const reify = (v, map) => reifyState(walk(v, map), map);
const resolveVars = (vars, map) => new Hash(vars.map(v => {
  const v2 = deepWalk(v, map);
  return [v, deepWalk(v2, reify(v2, new Hash()))];
}));
const callEmptyState = goal => goal(new State());
const delayGoal = goal => state => () => goal(state);
const disj = (g1, g2) => state => mergeStreams(g1(state), g2(state));
const disjs = (...goals) => {
  let result = delayGoal(goals[0]);
  for (let i = 1; i < goals.length; ++i) {
    result = disj(result, delayGoal(goals[i]));
  }
  return result;
};
const conj = (g1, g2) => state => flatMapStream(g1(state), g2);
const conjs = (...goals) => {
  let result = delayGoal(goals[0]);
  for (let i = 1; i < goals.length; ++i) {
    result = conj(result, delayGoal(goals[i]));
  }
  return result;
};
const conde = (...clauses) => disjs(...clauses.map(c => conjs(...c)));
const fresh = f => state => {
  const args = paramsOf(f);
  const arity = args.length;
  const vars = range(arity).map(n => new LVar(state.nextId + n, args[n]));
  return f(...vars)(incNextId(state, arity));
};
const conso = (first, rest, out) => equiv(new Cons(first, rest), out);
const firsto = (first, out) => fresh(rest => conso(first, rest, out));
const resto = (rest, out) => fresh(first => conso(first, rest, out));
const emptyo = s => equiv(null, s);
const appendo = (xs, ys, zs) =>
  conde(
    [emptyo(xs), equiv(ys, zs)],
    [emptyo(ys), equiv(xs, zs)],
    [fresh((f, xr, zr) =>
      conjs(
        conso(f, xr, xs),
        conso(f, zr, zs),
        appendo(xr, ys, zr)))]);
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
      conjs(
        conso(xf, xr, xs),
        reverseo(xr, yl),
        appendo(yl, list(xf), ys)))]);
const run = (n, g) => seqToArray(n, streamToSeq(callEmptyState(g))).map(x => x.map);
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
const play = f => {
  const params = paramsOf(f);
  const maps = nub(runAll(fresh(f)).map(m => resolveVars(params.map((n, i) => new LVar(i, n)), m)));
  if (maps && maps.length > 0) {
    const kvss = maps
      .map(m => m.entries.filter(([k, _]) => params.includes(k.name)))
      .filter(kvs => kvs.length > 0);
    if (kvss.length > 0) {
      console.log(kvss
        .map(kvs => kvs
          .map(([k, v]) => k + ' = ' + v)
          .join('\n'))
        .join('\n\n...\n\n'));
    }
    return true;
  }
  return false;
};
