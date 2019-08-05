// https://github.com/mullr/micrologic

const LVar = class {
  constructor(id) {
    this.id = id;
  }
};

const Cons = class {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
};

const State = class {
  constructor(map = {}, nextId = 0) {
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
  [Symbol.toStringTag]() {
    return '_.' + n;
  }
};

const raise = x => { throw new Error(x); };
const withMap = (state, map) => new State(map, state.nextId);
const withNextId = (state, nextId) => new State(state.map, nextId);
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
const eq = (x, y) =>
  x === y ||
  isLVar(x) && isLVar(y) && x.id === y.id ||
  isCons(x) && isCons(y) && eq(x.head, y.head) && eq(x.tail, y.tail);
const add = (map, key, value) => map && { ...map, [key]: value };
const walk = (x, map) => isLVar(x) && map.hasOwnProperty(x) ? walk(map[x]) : x;
const unifyWalked = (x, y, map) =>
  eq(x, y) ? map :
  isLVar(x) ? add(map, x, y) :
  isLVar(y) ? add(map, y, x) :
  unifyTerms(x, y, map);
const unify = (x, y, map) => unifyWalked(walk(x, map), walk(y, map), map);
const unifyTerms = (x, y, map) =>
  isCons(x) ? (
    !isList(x.tail) ? unify(x.tail, y, map) :
    isCons(y) && !isList(y.tail) ? unify(x, y.tail, map) :
    isCons(y) ? unify(x.tail, y.tail, unify(x.head, y.head, map)) :
    null
  ) : null;
const mergeStreams = (x, y) =>
  isLazy(x) ? mergeStreams(x.f(), y) :
  x === null ? y :
  isNode(x) ? new Node(s.head, mergeStreams(s.next, y)) :
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
      result.push(s);
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
  isLVar(v) ? add(map, v, new Reified(Object.keys(map).length)) :
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
const reifyStateFirstVar = state => {
  const v = deepWalk(new LVar(0), state.map);
  return deepWalk(v, reify(v, {}));
};
const callEmptyState = goal => goal(new State());
const delayGoal = goal => state => () => goal(state);
const disjs = (...goals) => {
  const result = delayGoal(goals[goals.length - 1]);
  for (let i = goals.length - 2; i >= 0; --i) {
    result = disj(delayGoal(goals[i]), result);
  }
  return result;
};
const conjs = (...goals) => {
  const result = delayGoal(goals[goals.length - 1]);
  for (let i = goals.length - 2; i >= 0; --i) {
    result = conj(delayGoal(goals[i]), result);
  }
  return result;
};
const conde = (...clauses) => disjs(...clauses.map(c => conjs(...c)));
const callFresh = f => state => f(new LVar(state.nextId))(withNextId(state, state.nextId + 1));

// callFresh(x => callFresh(y => callFresh(z => conjs(...clauses))))

// (defmacro fresh
//   [var-vec & clauses]
//   (if (empty? var-vec)
//     `(lconj+ ~@clauses)
//     `(call-fresh (fn [~(first var-vec)]
//                    (fresh [~@(rest var-vec)]
//                      ~@clauses)))))

const conso = (first, rest, out) =>
  isLVar(rest) ? equiv(new Cons(first, rest), out) : equiv(new Cons(first, rest), out);
const firsto = (first, out) => callFresh(rest => conso(first, rest, out));
const resto = (rest, out) => callFresh(first => conso(first, rest, out));
const emptyo = s => equiv(null, s);
const appendo = (seq1, seq2, out) =>
  conde(
    [emptyo(seq1), equiv(seq2, out)],
    [callFresh(first => callFresh(rest => callFresh(rec =>
      conjs(
        conso(first, rest, seq1),
        conso(first, rec, out),
        appendo(rest, seq2, rec)))))]);
const run = (n, g) => seqToArray(n, streamToSeq(callEmptyState(g))).map(reifyStateFirstVar);

// (defmacro run* [fresh-var-vec & goals]
//   `(->> (fresh [~@fresh-var-vec] ~@goals)
//      call-empty-state
//      stream-to-seq
//      (map reify-state-first-var)))
