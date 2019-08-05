// https://github.com/mullr/micrologic

const LVar = class {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
  toString() {
    return this.name || '#' + this.id;
  }
};

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
  toString() {
    let result = 'list(' + this.head;
    let more = this.tail;
    while (more) {
      result += ', ' + more.head;
      more = more.tail;
    }
    return result + ')';
  }
};

const State = class {
  constructor(map = new Map(), nextId = 0) {
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
  isCons(x) && isCons(y) && eq(x.head, y.head) && eq(x.tail, y.tail);
const add = (map, key, value) => {
  if (map) {
    const newMap = new Map(map);
    newMap.set(key, value);
    return newMap;
  }
  return map;
};
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
const disj = (g1, g2) => state => mergeStreams(g1(state), g2(state));
const conj = (g1, g2) => state => flatMapStream(g1(state), g2);
const reifyState = (v, map) =>
  isLVar(v) ? add(map, v, new Reified(map.size)) :
  isLazy(v) ? reify(v.f(), map) :
  isNode(v) ? reify(realize(v.next), reify(realize(v.head), map)) :
  isCons(v) ? reify(v.tail, reify(v.head, map)) :
  isFunction(v) ? reify(trampoline(v), map) :
  map;
const reify = (v, map) => reifyState(walk(v, map), map);
const deepWalkValue = (v, map) =>
  isLazy(v) ? deepWalk(v.f(), map) :
  isNode(v) ? new Node(deepWalk(v.head, map), deepWalk(v.next, map)) :
  isCons(v) ? new Cons(deepWalk(v.head, map), deepWalk(v.tail, map)) :
  isFunction(v) ? deepWalk(trampoline(v), map) :
  v;
const deepWalk = (v, map) => deepWalkValue(walk(v, map), map);
const callEmptyState = goal => goal(new State());
const delayGoal = goal => state => () => goal(state);
const disjs = (...goals) => {
  let result = delayGoal(goals[goals.length - 1]);
  for (let i = goals.length - 2; i >= 0; --i) {
    result = disj(delayGoal(goals[i]), result);
  }
  return result;
};
const conjs = (...goals) => {
  let result = delayGoal(goals[goals.length - 1]);
  for (let i = goals.length - 2; i >= 0; --i) {
    result = conj(delayGoal(goals[i]), result);
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
const appendo = (xs, ys, out) =>
  conde(
    [emptyo(xs), equiv(ys, out)],
    [fresh((first, rest, rec) =>
      conjs(
        conso(first, rest, xs),
        conso(first, rec, out),
        appendo(rest, ys, rec)))]);
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
const play = f => {
  const maps = runAll(fresh(f));
  if (maps && maps.length > 0) {
    const params = paramsOf(f);
    const kvss = maps
      .map(m => [...m]
        .filter(([k, _]) => params.includes(k.name)))
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

// Taken from Angular.js codebase
// http://docs.angularjs.org/tutorial/step_05

const trimParens = s => {
  const leftParen = s.length > 0 && s[0] === '(';
  const rightParen = s.length > 0 && s[s.length - 1] === ')';
  return s.substring(leftParen ? 1 : 0, s.length - (rightParen ? 1 : 0));
};
const upToArrow = s => {
  const arrowIndex = s.indexOf('=>');
  return (arrowIndex < 0 ? s : s.substring(0, arrowIndex)).trim();
};
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const FN_ARGS = /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m;
const FN_ARG_SPLIT = /,/;
const paramsOf = fn => 
  trimParens(fn.toString().replace(STRIP_COMMENTS, '').match(FN_ARGS)[0])
    .split(FN_ARG_SPLIT)
    .map(upToArrow);
