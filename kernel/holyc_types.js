/* HolyC's types, as plain data (pure). A type is { b, p, dims, fnp }: `b` the base (a built-in like 'I64' or the name of a class), `p` the stars after it,
   `dims` the array sizes after the name (`I64 a[3][4]` is dims [3, 4]; the parser leaves them as expressions and the evaluator makes them numbers), `fnp` a pointer to a function.
   A class is { name, size, fields: { name: { off, ty } }, order, union, base }: laid out packed, in order, as TempleOS lays them out (no padding), a union's members all at 0. */
export const SIZES = { U0: 1, I8: 1, U8: 1, Bool: 1, I16: 2, U16: 2, I32: 4, U32: 4, I64: 8, U64: 8, F64: 8 };
export const BUILTIN_TYPES = Object.keys(SIZES);
export const INT = { I8: 1, U8: 1, I16: 1, U16: 1, I32: 1, U32: 1, I64: 1, U64: 1, Bool: 1 };
export const UNSIGNED = { U8: 1, U16: 1, U32: 1, U64: 1, Bool: 1 };
export const PTR_SIZE = 8;

export const T = (b, p, dims) => { const t = { b: b, p: p || 0 }; if (dims && dims.length) t.dims = dims; return t; };
export const ptrTo = t => Object.assign({}, t, { p: t.p + 1 });
export const isArr = t => !!(t && t.dims && t.dims.length);
export const isPtr = t => !!(t && !isArr(t) && (t.p > 0 || t.fnp));
export const isFloat = t => !!(t && !isArr(t) && t.p === 0 && t.b === 'F64');
export const isInt = t => !!(t && !isArr(t) && t.p === 0 && !!INT[t.b]);
export const isClass = (t, classes) => !!(t && !isArr(t) && t.p === 0 && !t.fnp && !(t.b in SIZES) && classes && classes[t.b]);
export const typeName = t => !t ? '?' : t.b + '*'.repeat(t.p) + (isArr(t) ? t.dims.map(d => '[' + (d == null ? '' : d) + ']').join('') : '');

export function sizeOf(t, classes) {
  if (!t) return 8;
  if (isArr(t)) return t.dims.reduce((a, d) => a * (d || 0), 1) * sizeOf(Object.assign({}, t, { dims: undefined }), classes);
  if (t.p > 0 || t.fnp) return PTR_SIZE;
  if (t.b in SIZES) return SIZES[t.b];
  const c = classes && classes[t.b];
  if (!c) throw new Error('the type ' + t.b + ' is not known');
  return c.size;
}

/* what `*p` or `p[i]` is: the pointee, or one row of an array */
export function elemOf(t) {
  if (!t) return null;
  if (isArr(t)) return t.dims.length > 1 ? Object.assign({}, t, { dims: t.dims.slice(1) }) : T(t.b, t.p);
  if (t.p > 0) return T(t.b, t.p - 1);
  return null;
}
/* an array used as a value is the address of its first element: a pointer to what it holds */
export const decay = t => (isArr(t) ? (t.dims.length > 1 ? t : ptrTo(T(t.b, t.p))) : t);

/* lay a class out. `members` is [{ name, ty }] with `ty` already made of numbers; `base` is another class's name or null. */
export function layout(name, members, union, base, classes) {
  const c = { name: name, size: 0, fields: Object.create(null), order: [], union: !!union, base: base || null };
  if (base) {
    const b = classes[base];
    if (!b) throw new Error('the class ' + base + ' is not known');
    b.order.forEach(n => { c.fields[n] = b.fields[n]; c.order.push(n); });
    c.size = b.size;
  }
  members.forEach(m => {
    if (m.name in c.fields) throw new Error('the class ' + name + ' has two members called ' + m.name);
    const sz = sizeOf(m.ty, classes);
    c.fields[m.name] = { off: union ? 0 : c.size, ty: m.ty };
    c.order.push(m.name);
    if (union) c.size = Math.max(c.size, sz); else c.size += sz;
  });
  return c;
}
