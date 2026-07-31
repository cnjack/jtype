import * as e from "react";
import t, { Fragment as n, cloneElement as r, createContext as i, createElement as a, createRef as o, forwardRef as s, isValidElement as c, useCallback as l, useContext as u, useDebugValue as d, useEffect as f, useId as p, useId as m, useLayoutEffect as h, useMemo as g, useReducer as _, useRef as v, useState as y, useSyncExternalStore as b } from "react";
import { Fragment as x, jsx as S, jsxs as C } from "react/jsx-runtime";
import * as w from "react-dom";
import { createPortal as T, flushSync as E } from "react-dom";
//#region node_modules/@lingui/react/dist/shared/react.DZONiYSA.mjs
var D = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)\/>/, O = {
	area: !0,
	base: !0,
	br: !0,
	col: !0,
	embed: !0,
	hr: !0,
	img: !0,
	input: !0,
	keygen: !0,
	link: !0,
	meta: !0,
	param: !0,
	source: !0,
	track: !0,
	wbr: !0,
	menuitem: !0
};
function k(e, t = {}) {
	let n = e.split(D);
	if (n.length === 1) return e;
	let i = j(0, "$lingui$"), a = [], o = n.shift();
	o && a.push(o);
	for (let [e, o, s] of A(n)) {
		let n = e === void 0 ? void 0 : t[e];
		(!n || O[n.type] && o) && (console.error(n ? `${n.type} is a void element tag therefore it must have no children` : `Can't use element at index '${e}' as it is not declared in the original translation`), n = /* @__PURE__ */ S(x, {})), Array.isArray(n) && (n = /* @__PURE__ */ S(x, { children: n })), a.push(r(n, { key: i() }, o ? k(o, t) : n.props.children)), s && a.push(s);
	}
	return a.length === 1 ? a[0] : a;
}
function A(e) {
	if (!e.length) return [];
	let [t, n, r, i] = e.slice(0, 4);
	return [[
		t || r,
		n || "",
		i
	]].concat(A(e.slice(4, e.length)));
}
var j = (e = 0, t = "") => () => `${t}_${e++}`;
function M(e) {
	let { render: t, component: n, id: r, message: i, formats: a, lingui: { i18n: o, defaultComponent: s } } = e, { values: c, components: l } = P(e), u = o && typeof o._ == "function" ? o._(r, c, {
		message: i,
		formats: a
	}) : r, d = u ? k(u, l) : null;
	if (t === null || n === null) return d;
	let f = s || N, p = {
		id: r,
		message: i,
		translation: d,
		children: d
	};
	if (t && n) console.error("You can't use both `component` and `render` prop at the same time. `component` is ignored.");
	else if (t && typeof t != "function") console.error(`Invalid value supplied to prop \`render\`. It must be a function, provided ${t}`);
	else if (n && typeof n != "function") return console.error(`Invalid value supplied to prop \`component\`. It must be a React component, provided ${n}`), /* @__PURE__ */ S(f, {
		...p,
		children: d
	});
	return typeof t == "function" ? t(p) : /* @__PURE__ */ S(n || f, {
		...p,
		children: d
	});
}
var N = ({ children: e }) => e, P = (e) => {
	if (!e.values) return {
		values: void 0,
		components: e.components
	};
	let t = { ...e.values }, n = { ...e.components };
	return Object.entries(e.values).forEach(([e, r]) => {
		if (typeof r == "string" || typeof r == "number") return;
		let i = Object.keys(n).length;
		n[i] = /* @__PURE__ */ S(x, { children: r }), t[e] = `<${i}/>`;
	}), {
		values: t,
		components: n
	};
}, F = i(null), I = (e) => u(F), ee = ({ i18n: e, defaultComponent: t, children: n }) => {
	let r = v(e.locale || null), i = l(() => ({
		i18n: new Proxy(e, {}),
		defaultComponent: t,
		_: e.t.bind(e)
	}), [e, t]), [a, o] = y(i);
	return f(() => {
		let t = () => {
			r.current = e.locale || null, o(i());
		}, n = e.on("change", t);
		return r.current !== e.locale && t(), n;
	}, [e, i]), r.current === null ? null : /* @__PURE__ */ S(F.Provider, {
		value: a,
		children: n
	});
};
function L(e) {
	let t = I(void 0);
	return /* @__PURE__ */ S(M, {
		...e,
		lingui: t
	});
}
//#endregion
//#region node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
function R({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
	}));
}
var z = /*#__PURE__*/ e.forwardRef(R);
//#endregion
//#region node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function B({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6 18 18 6M6 6l12 12"
	}));
}
var te = /*#__PURE__*/ e.forwardRef(B), V = (e) => typeof e == "string", ne = (e) => typeof e == "function", re = /* @__PURE__ */ new Map(), ie = "en";
function ae(e) {
	return [...Array.isArray(e) ? e : [e], ie];
}
function H(e, t, n) {
	let r = ae(e);
	n ||= "default";
	let i;
	if (typeof n == "string") switch (i = {
		day: "numeric",
		month: "short",
		year: "numeric"
	}, n) {
		case "full": i.weekday = "long";
		case "long":
			i.month = "long";
			break;
		case "short":
			i.month = "numeric";
			break;
	}
	else i = n;
	return le(() => ue("date", r, n), () => new Intl.DateTimeFormat(r, i)).format(V(t) ? new Date(t) : t);
}
function oe(e, t, n) {
	let r;
	if (n ||= "default", typeof n == "string") switch (r = {
		second: "numeric",
		minute: "numeric",
		hour: "numeric"
	}, n) {
		case "full":
		case "long":
			r.timeZoneName = "short";
			break;
		case "short": delete r.second;
	}
	else r = n;
	return H(e, t, r);
}
function se(e, t, n) {
	let r = ae(e);
	return le(() => ue("number", r, n), () => new Intl.NumberFormat(r, n)).format(t);
}
function ce(e, t, n, { offset: r = 0, ...i }) {
	let a = ae(e), o = t ? le(() => ue("plural-ordinal", a), () => new Intl.PluralRules(a, { type: "ordinal" })) : le(() => ue("plural-cardinal", a), () => new Intl.PluralRules(a, { type: "cardinal" }));
	return i[n] ?? i[o.select(n - r)] ?? i.other;
}
function le(e, t) {
	let n = e(), r = re.get(n);
	return r || (r = t(), re.set(n, r)), r;
}
function ue(e, t, n) {
	return `${e}-${t.join("-")}-${JSON.stringify(n)}`;
}
var de = /\\u[a-fA-F0-9]{4}|\\x[a-fA-F0-9]{2}/, fe = (e) => e.replace(/\\u([a-fA-F0-9]{4})|\\x([a-fA-F0-9]{2})/g, (e, t, n) => {
	if (t) {
		let e = parseInt(t, 16);
		return String.fromCharCode(e);
	} else {
		let e = parseInt(n, 16);
		return String.fromCharCode(e);
	}
}), pe = "%__lingui_octothorpe__%", me = (e, t, n = {}) => {
	let r = t || e, i = (e) => typeof e == "object" ? e : n[e], a = (e, t) => {
		let a = Object.keys(n).length ? i("number") : void 0, o = se(r, e, a);
		return t.replace(new RegExp(pe, "g"), o);
	};
	return {
		plural: (e, t) => {
			let { offset: n = 0 } = t, i = ce(r, !1, e, t);
			return a(e - n, i);
		},
		selectordinal: (e, t) => {
			let { offset: n = 0 } = t, i = ce(r, !0, e, t);
			return a(e - n, i);
		},
		select: he,
		number: (e, t) => se(r, e, i(t) || { style: t }),
		date: (e, t) => H(r, e, i(t) || t),
		time: (e, t) => oe(r, e, i(t) || t)
	};
}, he = (e, t) => t[e] ?? t.other;
function ge(e, t, n) {
	return (r = {}, i) => {
		let a = me(t, n, i), o = (e, t = !1) => Array.isArray(e) ? e.reduce((e, n) => {
			if (n === "#" && t) return e + pe;
			if (V(n)) return e + n;
			let [i, s, c] = n, l = {};
			s === "plural" || s === "selectordinal" || s === "select" ? Object.entries(c).forEach(([e, t]) => {
				l[e] = o(t, s === "plural" || s === "selectordinal");
			}) : l = c;
			let u;
			if (s) {
				let e = a[s];
				u = e(r[i], l);
			} else u = r[i];
			return u == null ? e : e + u;
		}, "") : e, s = o(e);
		return V(s) && de.test(s) ? fe(s) : V(s) ? s : s ? String(s) : "";
	};
}
var _e = class {
	_events = {};
	on(e, t) {
		return this._events[e] ??= /* @__PURE__ */ new Set(), this._events[e].add(t), () => this.removeListener(e, t);
	}
	removeListener(e, t) {
		let n = this._events[e];
		n?.delete(t), n?.size === 0 && delete this._events[e];
	}
	emit(e, ...t) {
		let n = this._events[e];
		if (n) for (let e of [...n]) e.apply(this, t);
	}
}, ve = class extends _e {
	_locale = "";
	_locales;
	_messages = {};
	_missing;
	_messageCompiler;
	constructor(e) {
		super(), e.missing != null && (this._missing = e.missing), e.messages != null && this.load(e.messages), (typeof e.locale == "string" || e.locales) && this.activate(e.locale ?? ie, e.locales);
	}
	get locale() {
		return this._locale;
	}
	get locales() {
		return this._locales;
	}
	get messages() {
		return this._messages[this._locale] ?? {};
	}
	setMessagesCompiler(e) {
		return this._messageCompiler = e, this;
	}
	_load(e, t) {
		let n = this._messages[e];
		n ? Object.assign(n, t) : this._messages[e] = t;
	}
	load(e, t) {
		typeof e == "string" && typeof t == "object" ? this._load(e, t) : Object.entries(e).forEach(([e, t]) => this._load(e, t)), this.emit("change");
	}
	loadAndActivate({ locale: e, locales: t, messages: n }) {
		this._locale = e, this._locales = t || void 0, this._messages[this._locale] = n, this.emit("change");
	}
	activate(e, t) {
		this._locale = e, this._locales = t, this.emit("change");
	}
	_(e, t, n) {
		if (!this.locale) throw Error("Lingui: Attempted to call a translation function without setting a locale.\nMake sure to call `i18n.activate(locale)` before using Lingui functions.\nThis issue may also occur due to a race condition in your initialization logic.");
		let r = n?.message;
		e ||= "", V(e) || (t = e.values || t, r = e.message, e = e.id);
		let i = this.messages[e], a = i === void 0, o = this._missing;
		if (o && a) return ne(o) ? o(this._locale, e) : o;
		a && this.emit("missing", {
			id: e,
			locale: this._locale
		});
		let s = i || r || e;
		return V(s) && (this._messageCompiler ? s = this._messageCompiler(s) : console.warn(`Uncompiled message detected! Message:

> ${s}

That means you use raw catalog or your catalog doesn't have a translation for the message and fallback was used.
ICU features such as interpolation and plurals will not work properly for that message.

Please compile your catalog first.
`)), V(s) && de.test(s) ? fe(s) : V(s) ? s : ge(s, this._locale, this._locales)(t, n?.formats);
	}
	t = this._.bind(this);
	date(e, t) {
		return H(this._locales || this._locale, e, t);
	}
	number(e, t) {
		return se(this._locales || this._locale, e, t);
	}
};
function ye(e = {}) {
	return new ve(e);
}
var U = ye();
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/AdjustmentsHorizontalIcon.js
function be({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
	}));
}
var xe = /*#__PURE__*/ e.forwardRef(be);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowDownIcon.js
function Se({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
	}));
}
var Ce = /*#__PURE__*/ e.forwardRef(Se);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowLeftIcon.js
function we({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
	}));
}
var Te = /*#__PURE__*/ e.forwardRef(we);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowPathIcon.js
function Ee({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
	}));
}
var De = /*#__PURE__*/ e.forwardRef(Ee);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowRightIcon.js
function Oe({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
	}));
}
var ke = /*#__PURE__*/ e.forwardRef(Oe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowTopRightOnSquareIcon.js
function Ae({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
	}));
}
var je = /*#__PURE__*/ e.forwardRef(Ae);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUpTrayIcon.js
function Me({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
	}));
}
var Ne = /*#__PURE__*/ e.forwardRef(Me);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUpIcon.js
function Pe({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
	}));
}
var Fe = /*#__PURE__*/ e.forwardRef(Pe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUturnLeftIcon.js
function Ie({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
	}));
}
var Le = /*#__PURE__*/ e.forwardRef(Ie);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingInIcon.js
function Re({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
	}));
}
var ze = /*#__PURE__*/ e.forwardRef(Re);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingOutIcon.js
function Be({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
	}));
}
var Ve = /*#__PURE__*/ e.forwardRef(Be);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Bars3Icon.js
function He({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
	}));
}
var Ue = /*#__PURE__*/ e.forwardRef(He);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BarsArrowDownIcon.js
function We({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25"
	}));
}
var Ge = /*#__PURE__*/ e.forwardRef(We);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BookmarkIcon.js
function Ke({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
	}));
}
var qe = /*#__PURE__*/ e.forwardRef(Ke);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CalendarDaysIcon.js
function Je({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
	}));
}
var Ye = /*#__PURE__*/ e.forwardRef(Je);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChatBubbleLeftIcon.js
function Xe({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
	}));
}
var Ze = /*#__PURE__*/ e.forwardRef(Xe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckCircleIcon.js
function Qe({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
	}));
}
var $e = /*#__PURE__*/ e.forwardRef(Qe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckIcon.js
function et({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m4.5 12.75 6 6 9-13.5"
	}));
}
var tt = /*#__PURE__*/ e.forwardRef(et);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronDownIcon.js
function nt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m19.5 8.25-7.5 7.5-7.5-7.5"
	}));
}
var rt = /*#__PURE__*/ e.forwardRef(nt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronLeftIcon.js
function it({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15.75 19.5 8.25 12l7.5-7.5"
	}));
}
var at = /*#__PURE__*/ e.forwardRef(it);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronRightIcon.js
function ot({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m8.25 4.5 7.5 7.5-7.5 7.5"
	}));
}
var st = /*#__PURE__*/ e.forwardRef(ot);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronUpDownIcon.js
function ct({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
	}));
}
var lt = /*#__PURE__*/ e.forwardRef(ct);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClipboardDocumentIcon.js
function ut({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
	}));
}
var dt = /*#__PURE__*/ e.forwardRef(ut);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClockIcon.js
function ft({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
	}));
}
var pt = /*#__PURE__*/ e.forwardRef(ft);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Cog6ToothIcon.js
function mt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
	}), /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
	}));
}
var ht = /*#__PURE__*/ e.forwardRef(mt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/DocumentDuplicateIcon.js
function gt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
	}));
}
var _t = /*#__PURE__*/ e.forwardRef(gt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EllipsisHorizontalIcon.js
function vt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
	}));
}
var yt = /*#__PURE__*/ e.forwardRef(vt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
function bt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
	}));
}
var xt = /*#__PURE__*/ e.forwardRef(bt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EyeIcon.js
function St({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
	}), /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
	}));
}
var Ct = /*#__PURE__*/ e.forwardRef(St);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FaceSmileIcon.js
function wt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"
	}));
}
var Tt = /*#__PURE__*/ e.forwardRef(wt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FlagIcon.js
function Et({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
	}));
}
var Dt = /*#__PURE__*/ e.forwardRef(Et);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FunnelIcon.js
function Ot({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
	}));
}
var kt = /*#__PURE__*/ e.forwardRef(Ot);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/InformationCircleIcon.js
function At({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
	}));
}
var jt = /*#__PURE__*/ e.forwardRef(At);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LinkIcon.js
function Mt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
	}));
}
var Nt = /*#__PURE__*/ e.forwardRef(Mt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LockClosedIcon.js
function Pt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
	}));
}
var Ft = /*#__PURE__*/ e.forwardRef(Pt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/MagnifyingGlassIcon.js
function It({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
	}));
}
var Lt = /*#__PURE__*/ e.forwardRef(It);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PaperClipIcon.js
function Rt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
	}));
}
var zt = /*#__PURE__*/ e.forwardRef(Rt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilSquareIcon.js
function Bt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
	}));
}
var Vt = /*#__PURE__*/ e.forwardRef(Bt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilIcon.js
function Ht({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
	}));
}
var Ut = /*#__PURE__*/ e.forwardRef(Ht);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PlusIcon.js
function Wt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M12 4.5v15m7.5-7.5h-15"
	}));
}
var Gt = /*#__PURE__*/ e.forwardRef(Wt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleGroupIcon.js
function Kt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 0 1-1.125-1.125v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-2.25Z"
	}));
}
var qt = /*#__PURE__*/ e.forwardRef(Kt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleStackIcon.js
function Jt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
	}));
}
var Yt = /*#__PURE__*/ e.forwardRef(Jt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Squares2X2Icon.js
function Xt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
	}));
}
var Zt = /*#__PURE__*/ e.forwardRef(Xt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TableCellsIcon.js
function Qt({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"
	}));
}
var $t = /*#__PURE__*/ e.forwardRef(Qt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TagIcon.js
function en({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
	}), /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6 6h.008v.008H6V6Z"
	}));
}
var tn = /*#__PURE__*/ e.forwardRef(en);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TrashIcon.js
function nn({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
	}));
}
var rn = /*#__PURE__*/ e.forwardRef(nn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserCircleIcon.js
function an({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
	}));
}
var on = /*#__PURE__*/ e.forwardRef(an);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserIcon.js
function sn({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
	}));
}
var cn = /*#__PURE__*/ e.forwardRef(sn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ViewColumnsIcon.js
function ln({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"
	}));
}
var un = /*#__PURE__*/ e.forwardRef(ln);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function dn({ title: t, titleId: n, ...r }, i) {
	return /*#__PURE__*/ e.createElement("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		fill: "none",
		viewBox: "0 0 24 24",
		strokeWidth: 1.5,
		stroke: "currentColor",
		"aria-hidden": "true",
		"data-slot": "icon",
		ref: i,
		"aria-labelledby": n
	}, r), t ? /*#__PURE__*/ e.createElement("title", { id: n }, t) : null, /*#__PURE__*/ e.createElement("path", {
		strokeLinecap: "round",
		strokeLinejoin: "round",
		d: "M6 18 18 6M6 6l12 12"
	}));
}
var fn = /*#__PURE__*/ e.forwardRef(dn);
//#endregion
//#region ../../shared/lib/frontmatter.ts
function pn(e) {
	if (!e.startsWith("---\n") && !e.startsWith("---\r\n")) return {
		data: {},
		body: e,
		hasFrontmatter: !1
	};
	let t = e.replace(/\r\n/g, "\n"), n = t.indexOf("\n---", 4);
	if (n === -1) return {
		data: {},
		body: e,
		hasFrontmatter: !1
	};
	let r = t.slice(4, n).trim(), i = t.slice(n + 4).replace(/^\n/, ""), a = {};
	for (let e of r.split("\n")) {
		let t = e.indexOf(":");
		if (t > 0) {
			let n = e.slice(0, t).trim();
			a[n] = e.slice(t + 1).trim().replace(/^["']|["']$/g, "");
		}
	}
	return {
		data: a,
		body: i,
		hasFrontmatter: !0
	};
}
function mn(e, t) {
	let n = pn(e), r = {
		...n.data,
		...t
	};
	return `---\n${Object.entries(r).filter(([, e]) => e !== "").map(([e, t]) => `${e}: ${t}`).join("\n")}\n---\n\n${n.body.trimStart()}`;
}
//#endregion
//#region ../../shared/lib/board.ts
function hn(e) {
	return e.split(",").map((e) => e.trim()).filter(Boolean);
}
function gn(e) {
	return e.join(", ");
}
var _n = /* @__PURE__ */ new Set([
	"id",
	"relationKey",
	"board",
	"ticket",
	"title",
	"status",
	"columnKey",
	"position",
	"priority",
	"assignee",
	"swimlane",
	"swimlaneKey",
	"due",
	"icon",
	"tags",
	"attachments",
	"notes",
	"taskDone",
	"taskTotal",
	"excerpt",
	"blocked_by",
	"blockedBy",
	"blocks",
	"relates",
	"parent"
]);
function vn(e, t) {
	let { data: n, body: r } = pn(e), i = { ...n };
	if (t.title !== void 0 && (i.title = t.title), t.columnKey !== void 0 && (i.status = t.columnKey), t.priority !== void 0 && (i.priority = t.priority ?? ""), t.assignee !== void 0 && (i.assignee = t.assignee ?? ""), t.swimlaneKey !== void 0 && (i.swimlane = t.swimlaneKey ?? ""), t.due !== void 0 && (i.due = t.due ?? ""), t.icon !== void 0 && (i.icon = t.icon ?? ""), t.tags !== void 0 && (i.tags = t.tags.map((e) => e.label).join(", ")), t.attachments !== void 0 && (i.attachments = gn(t.attachments)), t.custom !== void 0) for (let [e, n] of Object.entries(t.custom)) _n.has(e) || (i[e] = n ?? "");
	return t.blockedBy !== void 0 && (i.blocked_by = Fn(t.blockedBy)), t.blocks !== void 0 && (i.blocks = Fn(t.blocks)), t.relates !== void 0 && (i.relates = Fn(t.relates)), t.parent !== void 0 && (i.parent = t.parent ? Fn([t.parent]) : ""), mn(t.notes === void 0 ? r : t.notes, i);
}
function yn(e) {
	let t = e.split(/[\\/]/).pop() || e;
	try {
		return decodeURIComponent(t.split("?")[0] || t);
	} catch {
		return t;
	}
}
function bn(e) {
	let t = e.trim();
	if (!t) return !1;
	let n = /^([a-z][a-z0-9+.-]*):/i.exec(t);
	if (!n) return !0;
	let r = n[1].toLowerCase();
	return r === "http" || r === "https";
}
function xn(e, t) {
	let n = {};
	if (!e || !t) return n;
	for (let r of t) {
		let t = e[r.key];
		t !== void 0 && t !== "" && (n[r.key] = t);
	}
	return n;
}
var Sn = [
	"none",
	"low",
	"medium",
	"high",
	"urgent"
], Cn = [
	"urgent",
	"high",
	"medium",
	"low",
	"none"
], wn = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4
}, Tn = {
	urgent: "bg-red-100 text-red-700",
	high: "bg-amber-100 text-amber-700",
	medium: "bg-sky-100 text-sky-700",
	low: "bg-stone-100 text-stone-500"
}, En = [
	"#ef4444",
	"#f59e0b",
	"#eab308",
	"#22c55e",
	"#0ea5e9",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#78716c"
], Dn = [
	"title",
	"relationKey",
	"board",
	"status",
	"position",
	"priority",
	"assignee",
	"swimlane",
	"due",
	"tags",
	"icon",
	"blocked_by",
	"blocks",
	"relates",
	"attachments",
	"parent"
];
function On(e) {
	let t = 0, n = 0;
	for (let r of e.split("\n")) {
		let e = r.replace(/^\s+/, "").match(/^[-*+] \[([ xX])\]/);
		e && (n += 1, e[1]?.toLowerCase() === "x" && (t += 1));
	}
	return {
		done: t,
		total: n
	};
}
function kn(e) {
	for (let t of e.split("\n")) {
		let e = t.trim().replace(/^[#>\-*+\s]+/, "").replace(/^\[[ xX]\]\s*/, "").trim();
		if (e) return e.length > 120 ? `${e.slice(0, 120)}…` : e;
	}
	return null;
}
function An(e) {
	return e.trim().replace(/^\[|\]$/g, "").split(",").map((e) => e.trim().replace(/^#/, "")).filter(Boolean);
}
var jn = [
	"#ef4444",
	"#f59e0b",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#0ea5e9",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#78716c"
];
function Mn(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = Math.imul(t, 31) + e.charCodeAt(n) >>> 0;
	return jn[t % jn.length];
}
function Nn(e, t) {
	return e.map((e) => ({
		label: e,
		color: t?.find((t) => t.label === e)?.color ?? Mn(e)
	}));
}
function Pn(e) {
	return e.split(",").map((e) => e.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim()).filter(Boolean);
}
function Fn(e) {
	return e.map((e) => `[[${e}]]`).join(", ");
}
function In(e) {
	return (e.relationKey ?? e.id).replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\.md$/i, "");
}
function Ln(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = In(i);
		t.set(e, i);
		let a = e.split("/").filter(Boolean), o = a[a.length - 1] ?? e, s = n.get(o);
		s ? s.push(i) : n.set(o, [i]);
		for (let e = 1; e < a.length - 1; e += 1) {
			let t = a.slice(e).join("/"), n = r.get(t);
			r.set(t, n === void 0 || n === i ? i : null);
		}
	}
	return (e) => {
		let i = e.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\.md$/i, ""), a = t.get(i);
		if (a) return a;
		if (i.includes("/")) return r.get(i) ?? void 0;
		let o = n.get(i) ?? [];
		return o.length === 1 ? o[0] : void 0;
	};
}
function Rn(e, t) {
	let n = t || "done", r = Ln(e), i = (e) => !!e && e.columnKey !== n, a = /* @__PURE__ */ new Map(), o = (e, t) => {
		let n = a.get(e);
		n || a.set(e, n = /* @__PURE__ */ new Set()), n.add(t.id);
	};
	for (let t of e) for (let e of t.blockedBy ?? []) {
		let n = r(e);
		i(n) && n.id !== t.id && o(t.id, n);
	}
	for (let t of e) if (i(t)) for (let e of t.blocks ?? []) {
		let n = r(e);
		n && n.id !== t.id && o(n.id, t);
	}
	let s = /* @__PURE__ */ new Map();
	for (let [e, t] of a) s.set(e, t.size);
	return s;
}
function zn(e) {
	let t = Ln(e), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		if (!r.parent) continue;
		let e = t(r.parent);
		if (!e || e.id === r.id) continue;
		let i = n.get(e.id);
		i ? i.push(r) : n.set(e.id, [r]);
	}
	return n;
}
function Bn(e, t) {
	let n = t || "done";
	return {
		done: e.filter((e) => e.columnKey === n).length,
		total: e.length
	};
}
function Vn() {
	let e = /* @__PURE__ */ new Date();
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Hn(e) {
	return e.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
var Un = /* @__PURE__ */ new Set([
	"status",
	"priority",
	"assignee"
]);
function Wn(e) {
	return typeof e == "string" && Un.has(e) ? e : "status";
}
function Gn(e) {
	return e === "custom" ? "custom" : typeof e == "string" && Un.has(e) ? e : void 0;
}
function Kn(e) {
	return Gn(e.swimlaneBy) ?? Wn(e.groupBy);
}
function qn(e, t) {
	return e === "status" ? { columnKey: t } : e === "priority" ? { priority: t === "none" ? null : t } : e === "assignee" ? { assignee: t || null } : { swimlaneKey: t || null };
}
function Jn(e, t, n = {}) {
	return e === "status" ? n.columnKey ?? t : e === "priority" ? Object.prototype.hasOwnProperty.call(n, "priority") ? n.priority || "none" : t : e === "assignee" ? Object.prototype.hasOwnProperty.call(n, "assignee") ? n.assignee || "" : t : Object.prototype.hasOwnProperty.call(n, "swimlaneKey") ? n.swimlaneKey || "" : t;
}
function Yn(e, t = []) {
	let n = new Set(t), r = `lane_${Hn(e).replace(/-/g, "_")}`;
	for (let e = 0; e < 20; e += 1) {
		let e = `${r}_${typeof globalThis.crypto?.randomUUID == "function" ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
		if (!n.has(e)) return e;
	}
	return `${r}_${Date.now().toString(36)}`;
}
function Xn(e, t, n) {
	let r = e.trim();
	return r ? r.length > 80 ? "Swimlane names can be at most 80 characters." : t.some((e) => e.key !== n && e.name.trim().toLocaleLowerCase() === r.toLocaleLowerCase()) ? "Swimlane names must be unique on this board." : null : "Swimlane name is required.";
}
function Zn(e) {
	return e.swimlaneKey || "";
}
function Qn(e, t) {
	let n = [], r = e.swimlanes ?? [], i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set();
	for (let e of r) {
		i.has(e.key) ? a.add(e.key) : i.add(e.key);
		let t = e.name.trim().toLocaleLowerCase();
		t && (o.has(t) ? s.add(t) : o.set(t, e.name.trim()));
	}
	for (let e of a) n.push({
		kind: "duplicate_swimlane_key",
		key: e
	});
	for (let e of s) n.push({
		kind: "duplicate_swimlane_name",
		name: o.get(e) ?? e
	});
	let c = /* @__PURE__ */ new Map();
	for (let e of t) {
		let t = Zn(e);
		t && !i.has(t) && c.set(t, (c.get(t) ?? 0) + 1);
	}
	for (let [e, t] of c) n.push({
		kind: "dangling_swimlane",
		key: e,
		cardCount: t
	});
	return n;
}
function $n(e, t) {
	return t === "custom" ? Zn(e) : t === "priority" ? e.priority || "none" : t === "assignee" ? e.assignee || "" : e.columnKey || "";
}
function er(e, t) {
	let n = Kn(t), r = $n(e, n);
	return n === "custom" && r && !(t.swimlanes ?? []).some((e) => e.key === r) ? "" : r;
}
function tr(e, t, n, r) {
	if (n === "status") return e.columns;
	if (n === "priority") return Cn.map((e) => ({
		key: e,
		name: e === "none" ? r : `${e.charAt(0).toUpperCase()}${e.slice(1)}`
	}));
	let i = /* @__PURE__ */ new Set([""]);
	for (let e of t) i.add($n(e, n));
	return [...i].sort((e, t) => e === "" ? 1 : t === "" ? -1 : e.localeCompare(t)).map((e) => ({
		key: e,
		name: e || r
	}));
}
function nr(e, t) {
	let n = e.swimlaneKey;
	return !!n && !(t ?? []).some((e) => e.key === n);
}
function rr(e, t, n, r) {
	if (n !== "custom") return tr(e, t, n, r);
	let i = /* @__PURE__ */ new Set();
	return [...(e.swimlanes ?? []).filter((e) => i.has(e.key) ? !1 : (i.add(e.key), !0)).map((e) => ({
		key: e.key,
		name: e.name,
		color: e.color
	})), {
		key: "",
		name: r
	}];
}
function ir(e) {
	return new Set((e ?? []).map((e) => e.trim().toLowerCase()));
}
function ar(e, t) {
	let [n, r, i] = e.split("-").map(Number);
	return pr(new Date(n, r - 1, i + t));
}
function or(e) {
	return !!(e.priorities?.length || e.assignees?.length || e.tags?.length || e.due || e.blocked || e.mine || e.missingRow);
}
function sr(e) {
	return [
		!!e.priorities?.length,
		!!e.assignees?.length,
		!!e.tags?.length,
		!!e.due,
		!!e.blocked,
		!!e.mine,
		!!e.missingRow
	].filter(Boolean).length;
}
function cr(e, t, n = {}) {
	let r = ir(t.priorities);
	if (r.size > 0 && !r.has((e.priority || "none").toLowerCase())) return !1;
	let i = ir(t.assignees);
	if (i.size > 0 && !i.has((e.assignee || "").trim().toLowerCase())) return !1;
	let a = ir(t.tags);
	if (a.size > 0 && !e.tags.some((e) => a.has(e.label.trim().toLowerCase()))) return !1;
	if (t.due) {
		let r = e.due && mr(e.due) ? e.due : null, i = n.today && mr(n.today) ? n.today : Vn();
		if (t.due === "none" && r || t.due !== "none" && !r || r && (t.due === "overdue" && r >= i || t.due === "today" && r !== i || t.due === "nextSevenDays" && (r < i || r > ar(i, 6)))) return !1;
	}
	if (t.blocked && !(n.blockedCardIds ? n.blockedCardIds.has(e.id) : (e.blockedBy?.length ?? 0) > 0)) return !1;
	if (t.mine) {
		let t = n.currentUser?.trim().toLowerCase();
		if (!t || e.assignee?.trim().toLowerCase() !== t) return !1;
	}
	return !(t.missingRow && !nr(e, n.config?.swimlanes));
}
function lr(e, t) {
	return !!(e.title.toLowerCase().includes(t) || e.ticket && e.ticket.toLowerCase().includes(t) || e.assignee && e.assignee.toLowerCase().includes(t) || e.tags.some((e) => e.label.toLowerCase().includes(t)) || e.notes && e.notes.toLowerCase().includes(t) || !e.notes && e.excerpt && e.excerpt.toLowerCase().includes(t));
}
function ur(e) {
	return e ? "prop" in e ? e.prop === "priority" ? { priorities: [e.value] } : e.prop === "assignee" ? { assignees: [e.value] } : e.prop === "tag" ? { tags: [e.value] } : { missingRow: !0 } : e : {};
}
function dr(e, t, n, r, i = {}) {
	let a = t.trim().toLowerCase(), o = ur(n);
	return e.filter((e) => a && !lr(e, a) ? !1 : cr(e, o, {
		...i,
		config: r
	}));
}
function fr(e, t) {
	let n = [...e];
	return t === "due" ? n.sort((e, t) => (e.due || "9999-99-99").localeCompare(t.due || "9999-99-99")) : t === "priority" ? n.sort((e, t) => (wn[e.priority || "none"] ?? 5) - (wn[t.priority || "none"] ?? 5)) : t === "title" ? n.sort((e, t) => e.title.localeCompare(t.title)) : n.sort((e, t) => e.position - t.position), n;
}
function pr(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function mr(e) {
	return !!e && /^\d{4}-\d{2}-\d{2}$/.test(e);
}
function hr() {
	return Vn().slice(0, 7);
}
function gr(e, t) {
	let [n, r] = e.split("-"), i = new Date(Number(n), Number(r) - 1 + t, 1);
	return `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}`;
}
function _r(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		if (!mr(n.due)) continue;
		let e = t.get(n.due);
		e ? e.push(n) : t.set(n.due, [n]);
	}
	return t;
}
function vr(e, t = 0) {
	let [n, r] = e.split("-"), i = Number(n), a = Number(r), o = (new Date(i, a - 1, 1).getDay() - t + 7) % 7, s = new Date(i, a - 1, 1 - o), c = [];
	for (let e = 0; e < 6; e++) {
		let t = [];
		for (let n = 0; n < 7; n++) t.push(pr(new Date(s.getFullYear(), s.getMonth(), s.getDate() + e * 7 + n)));
		c.push(t);
	}
	return c;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/domHelpers.mjs
var yr = (e) => e?.ownerDocument ?? document, br = (e) => e && "window" in e && e.window === e ? e : yr(e).defaultView || window;
function xr(e) {
	return typeof e == "object" && !!e && "nodeType" in e && typeof e.nodeType == "number";
}
function Sr(e) {
	return xr(e) && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in e;
}
//#endregion
//#region ../../node_modules/.pnpm/react-stately@3.47.0_react@19.2.7/node_modules/react-stately/dist/private/flags/flags.mjs
var Cr = !1;
function wr() {
	return Cr;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function Tr(e, t) {
	if (!wr()) return t && e ? e.contains(t) : !1;
	if (!e || !t) return !1;
	let n = t;
	for (; n !== null;) {
		if (n === e) return !0;
		n = n.tagName === "SLOT" && n.assignedSlot ? n.assignedSlot.parentNode : Sr(n) ? n.host : n.parentNode;
	}
	return !1;
}
var Er = (e = document) => {
	if (!wr()) return e.activeElement;
	let t = e.activeElement;
	for (; t && "shadowRoot" in t && t.shadowRoot?.activeElement;) t = t.shadowRoot.activeElement;
	return t;
};
function Dr(e) {
	if (wr() && e.target instanceof Element && e.target.shadowRoot) {
		if ("composedPath" in e) return e.composedPath()[0] ?? null;
		if ("composedPath" in e.nativeEvent) return e.nativeEvent.composedPath()[0] ?? null;
	}
	return e.target;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function Or(e) {
	if (Ar()) e.focus({ preventScroll: !0 });
	else {
		let t = jr(e);
		e.focus(), Mr(t);
	}
}
var kr = null;
function Ar() {
	if (kr == null) {
		kr = !1;
		try {
			document.createElement("div").focus({ get preventScroll() {
				return kr = !0, !0;
			} });
		} catch {}
	}
	return kr;
}
function jr(e) {
	let t = e.parentNode, n = [], r = document.scrollingElement || document.documentElement;
	for (; t instanceof HTMLElement && t !== r;) (t.offsetHeight < t.scrollHeight || t.offsetWidth < t.scrollWidth) && n.push({
		element: t,
		scrollTop: t.scrollTop,
		scrollLeft: t.scrollLeft
	}), t = t.parentNode;
	return r instanceof HTMLElement && n.push({
		element: r,
		scrollTop: r.scrollTop,
		scrollLeft: r.scrollLeft
	}), n;
}
function Mr(e) {
	for (let { element: t, scrollTop: n, scrollLeft: r } of e) t.scrollTop = n, t.scrollLeft = r;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var Nr = typeof document < "u" ? t.useLayoutEffect : () => {};
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/utils.mjs
function Pr(e) {
	let t = e;
	return t.nativeEvent = e, t.isDefaultPrevented = () => t.defaultPrevented, t.isPropagationStopped = () => t.cancelBubble, t.persist = () => {}, t;
}
function Fr(e, t) {
	Object.defineProperty(e, "target", { value: t }), Object.defineProperty(e, "currentTarget", { value: t });
}
function Ir(e) {
	let t = v({
		isFocused: !1,
		observer: null
	});
	return Nr(() => {
		let e = t.current;
		return () => {
			e.observer &&= (e.observer.disconnect(), null);
		};
	}, []), l((n) => {
		let r = Dr(n);
		if (r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) {
			t.current.isFocused = !0;
			let n = r;
			n.addEventListener("focusout", (r) => {
				if (t.current.isFocused = !1, n.disabled) {
					let t = Pr(r);
					e?.(t);
				}
				t.current.observer && (t.current.observer.disconnect(), t.current.observer = null);
			}, { once: !0 }), t.current.observer = new MutationObserver(() => {
				if (t.current.isFocused && n.disabled) {
					t.current.observer?.disconnect();
					let e = n === Er() ? null : Er();
					n.dispatchEvent(new FocusEvent("blur", { relatedTarget: e })), n.dispatchEvent(new FocusEvent("focusout", {
						bubbles: !0,
						relatedTarget: e
					}));
				}
			}), t.current.observer.observe(n, {
				attributes: !0,
				attributeFilter: ["disabled"]
			});
		}
	}, [e]);
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/platform.mjs
function Lr(e) {
	if (typeof window > "u" || window.navigator == null) return !1;
	let t = window.navigator.userAgentData?.brands;
	return Array.isArray(t) && t.some((t) => e.test(t.brand)) || e.test(window.navigator.userAgent);
}
function Rr(e) {
	return typeof window < "u" && window.navigator != null && e.test(window.navigator.userAgentData?.platform || window.navigator.platform);
}
function zr(e) {
	let t = null;
	return () => (t ??= e(), t);
}
var Br = zr(function() {
	return Rr(/^Mac/i);
}), Vr = zr(function() {
	return Rr(/^iPad/i) || Br() && navigator.maxTouchPoints > 1;
}), Hr = zr(function() {
	return Lr(/AppleWebKit/i) && !Ur();
}), Ur = zr(function() {
	return Lr(/Chrome/i);
}), Wr = zr(function() {
	return Lr(/Android/i);
}), Gr = zr(function() {
	return Lr(/Firefox/i);
});
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function Kr(e) {
	return e.pointerType === "" && e.isTrusted ? !0 : Wr() && e.pointerType ? e.type === "click" && e.buttons === 1 : e.detail === 0 && !e.pointerType;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/openLink.mjs
function qr(e, t, n = !0) {
	let { metaKey: r, ctrlKey: i, altKey: a, shiftKey: o } = t;
	Gr() && window.event?.type?.startsWith("key") && e.target === "_blank" && (Br() ? r = !0 : i = !0);
	let s = Hr() && Br() && !Vr() ? new KeyboardEvent("keydown", {
		keyIdentifier: "Enter",
		metaKey: r,
		ctrlKey: i,
		altKey: a,
		shiftKey: o
	}) : new MouseEvent("click", {
		metaKey: r,
		ctrlKey: i,
		altKey: a,
		shiftKey: o,
		detail: 1,
		bubbles: !0,
		cancelable: !0
	});
	qr.isOpening = n, Or(e), e.dispatchEvent(s), qr.isOpening = !1;
}
qr.isOpening = !1;
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var Jr = null, Yr = /* @__PURE__ */ new Set(), Xr = /* @__PURE__ */ new Map(), Zr = !1, Qr = !1, $r = {
	Tab: !0,
	Escape: !0
};
function ei(e, t) {
	for (let n of Yr) n(e, t);
}
function ti(e) {
	return !(e.metaKey || !Br() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function ni(e) {
	Zr = !0, !qr.isOpening && ti(e) && (Jr = "keyboard", ei("keyboard", e));
}
function ri(e) {
	Jr = "pointer", "pointerType" in e && e.pointerType, (e.type === "mousedown" || e.type === "pointerdown") && (Zr = !0, ei("pointer", e));
}
function ii(e) {
	!qr.isOpening && Kr(e) && (Zr = !0, Jr = "virtual");
}
function ai(e) {
	let t = br(Dr(e)), n = yr(Dr(e));
	Dr(e) === t || Dr(e) === n || !e.isTrusted || (!Zr && !Qr && (Jr = "virtual", ei("virtual", e)), Zr = !1, Qr = !1);
}
function oi() {
	Zr = !1, Qr = !0;
}
function si(e) {
	if (typeof window > "u" || typeof document > "u") return;
	let t = br(e), n = yr(e);
	if (Xr.get(t)) return;
	let r = t.HTMLElement.prototype.focus;
	t.HTMLElement.prototype.focus = function() {
		Zr = !0, r.apply(this, arguments);
	}, n.addEventListener("keydown", ni, !0), n.addEventListener("keyup", ni, !0), n.addEventListener("click", ii, !0), t.addEventListener("focus", ai, !0), t.addEventListener("blur", oi, !1), typeof PointerEvent < "u" && (n.addEventListener("pointerdown", ri, !0), n.addEventListener("pointermove", ri, !0), n.addEventListener("pointerup", ri, !0)), t.addEventListener("beforeunload", () => {
		ci(e);
	}, { once: !0 }), Xr.set(t, { focus: r });
}
var ci = (e, t) => {
	let n = br(e), r = yr(e);
	t && r.removeEventListener("DOMContentLoaded", t), Xr.has(n) && (n.HTMLElement.prototype.focus = Xr.get(n).focus, r.removeEventListener("keydown", ni, !0), r.removeEventListener("keyup", ni, !0), r.removeEventListener("click", ii, !0), n.removeEventListener("focus", ai, !0), n.removeEventListener("blur", oi, !1), typeof PointerEvent < "u" && (r.removeEventListener("pointerdown", ri, !0), r.removeEventListener("pointermove", ri, !0), r.removeEventListener("pointerup", ri, !0)), Xr.delete(n));
};
function li(e) {
	let t = yr(e), n;
	return t.readyState === "loading" ? (n = () => {
		si(e);
	}, t.addEventListener("DOMContentLoaded", n)) : si(e), () => ci(e, n);
}
typeof document < "u" && li();
function ui() {
	return Jr !== "pointer";
}
var di = /* @__PURE__ */ new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset"
]);
function fi(e, t, n) {
	let r = n ? Dr(n) : void 0, i = yr(r), a = br(r), o = a === void 0 ? HTMLInputElement : a.HTMLInputElement, s = a === void 0 ? HTMLTextAreaElement : a.HTMLTextAreaElement, c = a === void 0 ? HTMLElement : a.HTMLElement, l = a === void 0 ? KeyboardEvent : a.KeyboardEvent, u = Er(i);
	return e = e || u instanceof o && !di.has(u.type) || u instanceof s || u instanceof c && u.isContentEditable, !(e && t === "keyboard" && n instanceof l && !$r[n.key]);
}
function pi(e, t, n) {
	si(), f(() => {
		if (n?.enabled === !1) return;
		let t = (t, r) => {
			fi(!!n?.isTextInput, t, r) && e(ui());
		};
		return Yr.add(t), () => {
			Yr.delete(t);
		};
	}, t);
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocus.mjs
function mi(e) {
	let { isDisabled: t, onFocus: n, onBlur: r, onFocusChange: i } = e, a = l((e) => {
		if (Dr(e) === e.currentTarget) return r && r(e), i && i(!1), !0;
	}, [r, i]), o = Ir(a), s = l((e) => {
		let t = Dr(e), r = yr(t), a = r ? Er(r) : Er();
		t === e.currentTarget && t === a && (n && n(e), i && i(!0), o(e));
	}, [
		i,
		n,
		o
	]);
	return { focusProps: {
		onFocus: !t && (n || i || r) ? s : void 0,
		onBlur: !t && (r || i) ? a : void 0
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/useGlobalListeners.mjs
function hi() {
	let e = v(/* @__PURE__ */ new Map()), t = l((t, n, r, i) => {
		let a = i?.once ? (...t) => {
			e.current.delete(r), r(...t);
		} : r;
		e.current.set(r, {
			type: n,
			eventTarget: t,
			fn: a,
			options: i
		}), t.addEventListener(n, a, i);
	}, []), n = l((t, n, r, i) => {
		let a = e.current.get(r)?.fn || r;
		t.removeEventListener(n, a, i), e.current.delete(r);
	}, []), r = l(() => {
		e.current.forEach((e, t) => {
			n(e.eventTarget, e.type, t, e.options);
		});
	}, [n]);
	return f(() => r, [r]), {
		addGlobalListener: t,
		removeGlobalListener: n,
		removeAllGlobalListeners: r
	};
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusWithin.mjs
function gi(e) {
	let { isDisabled: t, onBlurWithin: n, onFocusWithin: r, onFocusWithinChange: i } = e, a = v({ isFocusWithin: !1 }), { addGlobalListener: o, removeAllGlobalListeners: s } = hi(), c = l((e) => {
		Tr(e.currentTarget, Dr(e)) && a.current.isFocusWithin && !Tr(e.currentTarget, e.relatedTarget) && (a.current.isFocusWithin = !1, s(), n && n(e), i && i(!1));
	}, [
		n,
		i,
		a,
		s
	]), u = Ir(c), d = l((e) => {
		if (!Tr(e.currentTarget, Dr(e))) return;
		let t = Dr(e), n = yr(t), s = Er(n);
		if (!a.current.isFocusWithin && s === t) {
			r && r(e), i && i(!0), a.current.isFocusWithin = !0, u(e);
			let t = e.currentTarget;
			o(n, "focus", (e) => {
				let r = Dr(e);
				if (a.current.isFocusWithin && !Tr(t, r)) {
					let e = new n.defaultView.FocusEvent("blur", { relatedTarget: r });
					Fr(e, t);
					let i = Pr(e);
					c(i);
				}
			}, { capture: !0 });
		}
	}, [
		r,
		i,
		u,
		o,
		c
	]);
	return t ? { focusWithinProps: {
		onFocus: void 0,
		onBlur: void 0
	} } : { focusWithinProps: {
		onFocus: d,
		onBlur: c
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/focus/useFocusRing.mjs
function _i(e = {}) {
	let { autoFocus: t = !1, isTextInput: n, within: r } = e, i = v({
		isFocused: !1,
		isFocusVisible: t || ui()
	}), [a, o] = y(!1), [s, c] = y(() => i.current.isFocused && i.current.isFocusVisible), u = l(() => c(i.current.isFocused && i.current.isFocusVisible), []), d = l((e) => {
		i.current.isFocused = e, i.current.isFocusVisible = ui(), o(e), u();
	}, [u]);
	pi((e) => {
		i.current.isFocusVisible = e, u();
	}, [n, a], {
		enabled: a,
		isTextInput: n
	});
	let { focusProps: f } = mi({
		isDisabled: r,
		onFocusChange: d
	}), { focusWithinProps: p } = gi({
		isDisabled: !r,
		onFocusWithinChange: d
	});
	return {
		isFocused: a,
		isFocusVisible: s,
		focusProps: r ? p : f
	};
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useHover.mjs
var vi = !1, yi = 0;
function bi() {
	vi = !0, setTimeout(() => {
		vi = !1;
	}, 500);
}
function xi(e) {
	e.pointerType === "touch" && bi();
}
function Si() {
	let e = yr(null);
	if (e !== void 0) return yi === 0 && typeof PointerEvent < "u" && e.addEventListener("pointerup", xi), yi++, () => {
		yi--, !(yi > 0) && typeof PointerEvent < "u" && e.removeEventListener("pointerup", xi);
	};
}
function Ci(e) {
	let { onHoverStart: t, onHoverChange: n, onHoverEnd: r, isDisabled: i } = e, [a, o] = y(!1), s = v({
		isHovered: !1,
		ignoreEmulatedMouseEvents: !1,
		pointerType: "",
		target: null
	}).current;
	f(Si, []);
	let { addGlobalListener: c, removeAllGlobalListeners: l } = hi(), { hoverProps: u, triggerHoverEnd: d } = g(() => {
		let e = (e, r) => {
			if (s.pointerType = r, i || r === "touch" || s.isHovered || !Tr(e.currentTarget, Dr(e))) return;
			s.isHovered = !0;
			let l = e.currentTarget;
			s.target = l, c(yr(Dr(e)), "pointerover", (e) => {
				s.isHovered && s.target && !Tr(s.target, Dr(e)) && a(e, e.pointerType);
			}, { capture: !0 }), t && t({
				type: "hoverstart",
				target: l,
				pointerType: r
			}), n && n(!0), o(!0);
		}, a = (e, t) => {
			let i = s.target;
			s.pointerType = "", s.target = null, !(t === "touch" || !s.isHovered || !i) && (s.isHovered = !1, l(), r && r({
				type: "hoverend",
				target: i,
				pointerType: t
			}), n && n(!1), o(!1));
		}, u = {};
		return typeof PointerEvent < "u" && (u.onPointerEnter = (t) => {
			vi && t.pointerType === "mouse" || e(t, t.pointerType);
		}, u.onPointerLeave = (e) => {
			!i && Tr(e.currentTarget, Dr(e)) && a(e, e.pointerType);
		}), {
			hoverProps: u,
			triggerHoverEnd: a
		};
	}, [
		t,
		n,
		r,
		i,
		s,
		c,
		l
	]);
	return f(() => {
		i && d({ currentTarget: s.target }, s.pointerType);
	}, [i]), {
		hoverProps: u,
		isHovered: a
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/env.js
var wi = Object.defineProperty, Ti = (e, t, n) => t in e ? wi(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Ei = (e, t, n) => (Ti(e, typeof t == "symbol" ? t : t + "", n), n), Di = new class {
	constructor() {
		Ei(this, "current", this.detect()), Ei(this, "handoffState", "pending"), Ei(this, "currentId", 0);
	}
	set(e) {
		this.current !== e && (this.handoffState = "pending", this.currentId = 0, this.current = e);
	}
	reset() {
		this.set(this.detect());
	}
	nextId() {
		return ++this.currentId;
	}
	get isServer() {
		return this.current === "server";
	}
	get isClient() {
		return this.current === "client";
	}
	detect() {
		return typeof window > "u" || typeof document > "u" ? "server" : "client";
	}
	handoff() {
		this.handoffState === "pending" && (this.handoffState = "complete");
	}
	get isHandoffComplete() {
		return this.handoffState === "complete";
	}
}();
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/owner.js
function Oi(e) {
	return Di.isServer ? null : e == null ? document : e?.ownerDocument ?? document;
}
function ki(e) {
	return Di.isServer ? null : e == null ? document : (e?.getRootNode)?.call(e) ?? document;
}
function Ai(e) {
	return ki(e)?.activeElement ?? null;
}
function ji(e) {
	return Ai(e) === e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/micro-task.js
function Mi(e) {
	typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((e) => setTimeout(() => {
		throw e;
	}));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/disposables.js
function Ni() {
	let e = [], t = {
		addEventListener(e, n, r, i) {
			return e.addEventListener(n, r, i), t.add(() => e.removeEventListener(n, r, i));
		},
		requestAnimationFrame(...e) {
			let n = requestAnimationFrame(...e);
			return t.add(() => cancelAnimationFrame(n));
		},
		nextFrame(...e) {
			return t.requestAnimationFrame(() => t.requestAnimationFrame(...e));
		},
		setTimeout(...e) {
			let n = setTimeout(...e);
			return t.add(() => clearTimeout(n));
		},
		microTask(...e) {
			let n = { current: !0 };
			return Mi(() => {
				n.current && e[0]();
			}), t.add(() => {
				n.current = !1;
			});
		},
		style(e, t, n) {
			let r = e.style.getPropertyValue(t);
			return Object.assign(e.style, { [t]: n }), this.add(() => {
				Object.assign(e.style, { [t]: r });
			});
		},
		group(e) {
			let t = Ni();
			return e(t), this.add(() => t.dispose());
		},
		add(t) {
			return e.includes(t) || e.push(t), () => {
				let n = e.indexOf(t);
				if (n >= 0) for (let t of e.splice(n, 1)) t();
			};
		},
		dispose() {
			for (let t of e.splice(0)) t();
		}
	};
	return t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-disposables.js
function Pi() {
	let [e] = y(Ni);
	return f(() => () => e.dispose(), [e]), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
var W = (e, t) => {
	Di.isServer ? f(e, t) : h(e, t);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-latest-value.js
function Fi(e) {
	let t = v(e);
	return W(() => {
		t.current = e;
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event.js
var G = function(e) {
	let n = Fi(e);
	return t.useCallback((...e) => n.current(...e), [n]);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-active-press.js
function Ii(e) {
	let t = e.width / 2, n = e.height / 2;
	return {
		top: e.clientY - n,
		right: e.clientX + t,
		bottom: e.clientY + n,
		left: e.clientX - t
	};
}
function Li(e, t) {
	return !(!e || !t || e.right < t.left || e.left > t.right || e.bottom < t.top || e.top > t.bottom);
}
function Ri({ disabled: e = !1 } = {}) {
	let t = v(null), [n, r] = y(!1), i = Pi(), a = G(() => {
		t.current = null, r(!1), i.dispose();
	}), o = G((e) => {
		if (i.dispose(), t.current === null) {
			t.current = e.currentTarget, r(!0);
			{
				let n = Oi(e.currentTarget);
				i.addEventListener(n, "pointerup", a, !1), i.addEventListener(n, "pointermove", (e) => {
					if (t.current) {
						let n = Ii(e);
						r(Li(n, t.current.getBoundingClientRect()));
					}
				}, !1), i.addEventListener(n, "pointercancel", a, !1);
			}
		}
	});
	return {
		pressed: n,
		pressProps: e ? {} : {
			onPointerDown: o,
			onPointerUp: a,
			onClick: a
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-slot.js
function zi(e) {
	return g(() => e, Object.values(e));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/disabled.js
var Bi = i(void 0);
function Vi() {
	return u(Bi);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/class-names.js
function Hi(...e) {
	return Array.from(new Set(e.flatMap((e) => typeof e == "string" ? e.split(" ") : []))).filter(Boolean).join(" ");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/match.js
function Ui(e, t, ...n) {
	if (e in t) {
		let r = t[e];
		return typeof r == "function" ? r(...n) : r;
	}
	let r = /* @__PURE__ */ Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((e) => `"${e}"`).join(", ")}.`);
	throw Error.captureStackTrace && Error.captureStackTrace(r, Ui), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/render.js
var Wi = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(Wi || {}), Gi = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(Gi || {});
function K() {
	let e = Ji();
	return l((t) => Ki({
		mergeRefs: e,
		...t
	}), [e]);
}
function Ki({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: a = !0, name: o, mergeRefs: s }) {
	s ??= Yi;
	let c = Xi(t, e);
	if (a) return qi(c, n, r, o, s);
	let l = i ?? 0;
	if (l & 2) {
		let { static: e = !1, ...t } = c;
		if (e) return qi(t, n, r, o, s);
	}
	if (l & 1) {
		let { unmount: e = !0, ...t } = c;
		return Ui(+!e, {
			0() {
				return null;
			},
			1() {
				return qi({
					...t,
					hidden: !0,
					style: { display: "none" }
				}, n, r, o, s);
			}
		});
	}
	return qi(c, n, r, o, s);
}
function qi(e, t = {}, n, i, o) {
	let { as: s = n, children: l, refName: u = "ref", ...d } = $i(e, ["unmount", "static"]), f = e.ref === void 0 ? {} : { [u]: e.ref }, p = typeof l == "function" ? l(t) : l;
	p = ta(p), "className" in d && d.className && typeof d.className == "function" && (d.className = d.className(t)), d["aria-labelledby"] && d["aria-labelledby"] === d.id && (d["aria-labelledby"] = void 0);
	let m = {};
	if (t) {
		let e = !1, n = [];
		for (let [r, i] of Object.entries(t)) typeof i == "boolean" && (e = !0), i === !0 && n.push(r.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`));
		if (e) {
			m["data-headlessui-state"] = n.join(" ");
			for (let e of n) m[`data-${e}`] = "";
		}
	}
	if (na(s) && (Object.keys(Qi(d)).length > 0 || Object.keys(Qi(m)).length > 0)) if (!c(p) || Array.isArray(p) && p.length > 1 || ra(p)) {
		if (Object.keys(Qi(d)).length > 0) throw Error([
			"Passing props on \"Fragment\"!",
			"",
			`The current component <${i} /> is rendering a "Fragment".`,
			"However we need to passthrough the following props:",
			Object.keys(Qi(d)).concat(Object.keys(Qi(m))).map((e) => `  - ${e}`).join("\n"),
			"",
			"You can apply a few solutions:",
			["Add an `as=\"...\"` prop, to ensure that we render an actual element instead of a \"Fragment\".", "Render a single element as the child so that we can forward the props onto that element."].map((e) => `  - ${e}`).join("\n")
		].join("\n"));
	} else {
		let e = p.props?.className, t = typeof e == "function" ? (...t) => Hi(e(...t), d.className) : Hi(e, d.className), n = t ? { className: t } : {}, i = Xi(p.props, Qi($i(d, ["ref"])));
		for (let e in m) e in i && delete m[e];
		return r(p, Object.assign({}, i, m, f, { ref: o(ea(p), f.ref) }, n));
	}
	return a(s, Object.assign({}, $i(d, ["ref"]), !na(s) && f, !na(s) && m), p);
}
function Ji() {
	let e = v([]), t = l((t) => {
		for (let n of e.current) n != null && (typeof n == "function" ? n(t) : n.current = t);
	}, []);
	return (...n) => {
		if (!n.every((e) => e == null)) return e.current = n, t;
	};
}
function Yi(...e) {
	return e.every((e) => e == null) ? void 0 : (t) => {
		for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
	};
}
function Xi(...e) {
	if (e.length === 0) return {};
	if (e.length === 1) return e[0];
	let t = {}, n = {};
	for (let r of e) for (let e in r) e.startsWith("on") && typeof r[e] == "function" ? (n[e] ?? (n[e] = []), n[e].push(r[e])) : t[e] = r[e];
	if (t.disabled || t["aria-disabled"]) for (let e in n) /^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(e) && (n[e] = [(e) => (e?.preventDefault)?.call(e)]);
	for (let e in n) Object.assign(t, { [e](t, ...r) {
		let i = n[e];
		for (let e of i) {
			if ((t instanceof Event || t?.nativeEvent instanceof Event) && t.defaultPrevented) return;
			e(t, ...r);
		}
	} });
	return t;
}
function Zi(...e) {
	if (e.length === 0) return {};
	if (e.length === 1) return e[0];
	let t = {}, n = {};
	for (let r of e) for (let e in r) e.startsWith("on") && typeof r[e] == "function" ? (n[e] ?? (n[e] = []), n[e].push(r[e])) : t[e] = r[e];
	for (let e in n) Object.assign(t, { [e](...t) {
		let r = n[e];
		for (let e of r) e?.(...t);
	} });
	return t;
}
function q(e) {
	return Object.assign(s(e), { displayName: e.displayName ?? e.name });
}
function Qi(e) {
	let t = Object.assign({}, e);
	for (let e in t) t[e] === void 0 && delete t[e];
	return t;
}
function $i(e, t = []) {
	let n = Object.assign({}, e);
	for (let e of t) e in n && delete n[e];
	return n;
}
function ea(e) {
	return t.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function ta(e) {
	if (e != null && e.$$typeof === Symbol.for("react.lazy")) {
		let t = e._payload;
		if (t != null && t.status === "fulfilled") return ta(t.value);
	}
	return e;
}
function na(e) {
	return e === n || e === Symbol.for("react.fragment");
}
function ra(e) {
	return na(e.type);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-controllable.js
function ia(e, t, n) {
	let [r, i] = y(n), a = e !== void 0, o = v(a), s = v(!1), c = v(!1);
	return a && !o.current && !s.current ? (s.current = !0, o.current = a, console.error("A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.")) : !a && o.current && !c.current && (c.current = !0, o.current = a, console.error("A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.")), [a ? e : r, G((e) => (a || E(() => i(e)), t?.(e)))];
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-default-value.js
function aa(e) {
	let [t] = y(e);
	return t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/form.js
function oa(e = {}, t = null, n = []) {
	for (let [r, i] of Object.entries(e)) ca(n, sa(t, r), i);
	return n;
}
function sa(e, t) {
	return e ? e + "[" + t + "]" : t;
}
function ca(e, t, n) {
	if (Array.isArray(n)) for (let [r, i] of n.entries()) ca(e, sa(t, r.toString()), i);
	else n instanceof Date ? e.push([t, n.toISOString()]) : typeof n == "boolean" ? e.push([t, n ? "1" : "0"]) : typeof n == "string" ? e.push([t, n]) : typeof n == "number" ? e.push([t, `${n}`]) : n == null ? e.push([t, ""]) : ua(n) && !c(n) && oa(n, t, e);
}
function la(e) {
	var t;
	let n = e?.form ?? e.closest("form");
	if (n) {
		for (let t of n.elements) if (t !== e && (t.tagName === "INPUT" && t.type === "submit" || t.tagName === "BUTTON" && t.type === "submit" || t.nodeName === "INPUT" && t.type === "image")) {
			t.click();
			return;
		}
		(t = n.requestSubmit) == null || t.call(n);
	}
}
function ua(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/hidden.js
var da = "span", fa = ((e) => (e[e.None = 1] = "None", e[e.Focusable = 2] = "Focusable", e[e.Hidden = 4] = "Hidden", e))(fa || {});
function pa(e, t) {
	let { features: n = 1, ...r } = e, i = {
		ref: t,
		"aria-hidden": (n & 2) == 2 ? !0 : r["aria-hidden"] ?? void 0,
		hidden: (n & 4) == 4 || void 0,
		style: {
			position: "fixed",
			top: 1,
			left: 1,
			width: 1,
			height: 0,
			padding: 0,
			margin: -1,
			overflow: "hidden",
			clip: "rect(0, 0, 0, 0)",
			whiteSpace: "nowrap",
			borderWidth: "0",
			...(n & 4) == 4 && (n & 2) != 2 && { display: "none" }
		}
	};
	return K()({
		ourProps: i,
		theirProps: r,
		slot: {},
		defaultTag: da,
		name: "Hidden"
	});
}
var ma = q(pa), ha = i(null);
function ga({ children: e }) {
	let n = u(ha);
	if (!n) return t.createElement(t.Fragment, null, e);
	let { target: r } = n;
	return r ? T(t.createElement(t.Fragment, null, e), r) : null;
}
function _a({ data: e, form: n, disabled: r, onReset: i, overrides: a }) {
	let [o, s] = y(null), c = Pi();
	return f(() => {
		if (i && o) return c.addEventListener(o, "reset", i);
	}, [
		o,
		n,
		i
	]), t.createElement(ga, null, t.createElement(va, {
		setForm: s,
		formId: n
	}), oa(e).map(([e, i]) => t.createElement(ma, {
		features: fa.Hidden,
		...Qi({
			key: e,
			as: "input",
			type: "hidden",
			hidden: !0,
			readOnly: !0,
			form: n,
			disabled: r,
			name: e,
			value: i,
			...a
		})
	})));
}
function va({ setForm: e, formId: n }) {
	return f(() => {
		if (n) {
			let t = document.getElementById(n);
			t && e(t);
		}
	}, [e, n]), n ? null : t.createElement(ma, {
		features: fa.Hidden,
		as: "input",
		type: "hidden",
		hidden: !0,
		readOnly: !0,
		ref: (t) => {
			if (!t) return;
			let n = t.closest("form");
			n && e(n);
		}
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/id.js
var ya = i(void 0);
function ba() {
	return u(ya);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/dom.js
function xa(e) {
	return typeof e != "object" || !e ? !1 : "nodeType" in e;
}
function Sa(e) {
	return xa(e) && "tagName" in e;
}
function Ca(e) {
	return Sa(e) && "accessKey" in e;
}
function wa(e) {
	return Sa(e) && "tabIndex" in e;
}
function Ta(e) {
	return Sa(e) && "style" in e;
}
function Ea(e) {
	return Ca(e) && e.nodeName === "IFRAME";
}
function Da(e) {
	return Ca(e) && e.nodeName === "INPUT";
}
function Oa(e) {
	return Ca(e) && e.nodeName === "LABEL";
}
function ka(e) {
	return Ca(e) && e.nodeName === "FIELDSET";
}
function Aa(e) {
	return Ca(e) && e.nodeName === "LEGEND";
}
function ja(e) {
	return Sa(e) ? e.matches("a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type=\"hidden\"]),label,select,textarea,video[controls]") : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/bugs.js
function Ma(e) {
	let t = e.parentElement, n = null;
	for (; t && !ka(t);) Aa(t) && (n = t), t = t.parentElement;
	let r = t?.getAttribute("disabled") === "";
	return r && Na(n) ? !1 : r;
}
function Na(e) {
	if (!e) return !1;
	let t = e.previousElementSibling;
	for (; t !== null;) {
		if (Aa(t)) return !1;
		t = t.previousElementSibling;
	}
	return !0;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
var Pa = Symbol();
function Fa(e, t = !0) {
	return Object.assign(e, { [Pa]: t });
}
function J(...e) {
	let t = v(e);
	f(() => {
		t.current = e;
	}, [e]);
	let n = G((e) => {
		for (let n of t.current) n != null && (typeof n == "function" ? n(e) : n.current = e);
	});
	return e.every((e) => e == null || e?.[Pa]) ? void 0 : n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/description/description.js
var Ia = i(null);
Ia.displayName = "DescriptionContext";
function La() {
	let e = u(Ia);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Description /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, La), e;
	}
	return e;
}
function Ra() {
	return u(Ia)?.value ?? void 0;
}
function za() {
	let [e, n] = y([]);
	return [e.length > 0 ? e.join(" ") : void 0, g(() => function(e) {
		let r = G((e) => (n((t) => [...t, e]), () => n((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), i = g(() => ({
			register: r,
			slot: e.slot,
			name: e.name,
			props: e.props,
			value: e.value
		}), [
			r,
			e.slot,
			e.name,
			e.props,
			e.value
		]);
		return t.createElement(Ia.Provider, { value: i }, e.children);
	}, [n])];
}
var Ba = "p";
function Va(e, t) {
	let n = m(), r = Vi(), { id: i = `headlessui-description-${n}`, ...a } = e, o = La(), s = J(t);
	W(() => o.register(i), [i, o.register]);
	let c = zi({
		...o.slot,
		disabled: r || !1
	}), l = {
		ref: s,
		...o.props,
		id: i
	};
	return K()({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: Ba,
		name: o.name || "Description"
	});
}
var Ha = q(Va), Ua = Object.assign(Ha, {}), Y = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(Y || {}), Wa = i(null);
Wa.displayName = "LabelContext";
function Ga() {
	let e = u(Wa);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Label /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, Ga), e;
	}
	return e;
}
function Ka(e) {
	let t = u(Wa)?.value ?? void 0;
	return (e?.length ?? 0) > 0 ? [t, ...e].filter(Boolean).join(" ") : t;
}
function qa({ inherit: e = !1 } = {}) {
	let n = Ka(), [r, i] = y([]), a = e ? [n, ...r].filter(Boolean) : r;
	return [a.length > 0 ? a.join(" ") : void 0, g(() => function(e) {
		let n = G((e) => (i((t) => [...t, e]), () => i((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), r = g(() => ({
			register: n,
			slot: e.slot,
			name: e.name,
			props: e.props,
			value: e.value
		}), [
			n,
			e.slot,
			e.name,
			e.props,
			e.value
		]);
		return t.createElement(Wa.Provider, { value: r }, e.children);
	}, [i])];
}
var Ja = "label";
function Ya(e, t) {
	let n = m(), r = Ga(), i = ba(), a = Vi(), { id: o = `headlessui-label-${n}`, htmlFor: s = i ?? r.props?.htmlFor, passive: c = !1, ...l } = e, u = J(t);
	W(() => r.register(o), [o, r.register]);
	let d = G((e) => {
		let t = e.currentTarget;
		if (!(e.target !== e.currentTarget && ja(e.target)) && (Oa(t) && e.preventDefault(), r.props && "onClick" in r.props && typeof r.props.onClick == "function" && r.props.onClick(e), Oa(t))) {
			let e = document.getElementById(t.htmlFor);
			if (e) {
				let t = e.getAttribute("disabled");
				if (t === "true" || t === "") return;
				let n = e.getAttribute("aria-disabled");
				if (n === "true" || n === "") return;
				(Da(e) && (e.type === "file" || e.type === "radio" || e.type === "checkbox") || e.role === "radio" || e.role === "checkbox" || e.role === "switch") && e.click(), e.focus({ preventScroll: !0 });
			}
		}
	}), f = zi({
		...r.slot,
		disabled: a || !1
	}), p = {
		ref: u,
		...r.props,
		id: o,
		htmlFor: s,
		onClick: d
	};
	return c && ("onClick" in p && (delete p.htmlFor, delete p.onClick), "onClick" in l && delete l.onClick), K()({
		ourProps: p,
		theirProps: l,
		slot: f,
		defaultTag: s ? Ja : "div",
		name: r.name || "Label"
	});
}
var Xa = q(Ya), Za = Object.assign(Xa, {}), Qa = i(() => {});
function $a({ value: e, children: n }) {
	return t.createElement(Qa.Provider, { value: e }, n);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-by-comparator.js
function eo(e, t) {
	return e !== null && t !== null && typeof e == "object" && typeof t == "object" && "id" in e && "id" in t ? e.id === t.id : e === t;
}
function to(e = eo) {
	return l((t, n) => {
		if (typeof e == "string") {
			let r = e;
			return t?.[r] === n?.[r];
		}
		return e(t, n);
	}, [e]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-element-size.js
function no(e) {
	if (e === null) return {
		width: 0,
		height: 0
	};
	let { width: t, height: n } = e.getBoundingClientRect();
	return {
		width: t,
		height: n
	};
}
function ro(e, t, n = !1) {
	let [r, i] = y(() => no(t));
	return W(() => {
		if (!t || !e) return;
		let n = Ni();
		return n.requestAnimationFrame(function e() {
			n.requestAnimationFrame(e), i((e) => {
				let n = no(t);
				return n.width === e.width && n.height === e.height ? e : n;
			});
		}), () => {
			n.dispose();
		};
	}, [t, e]), n ? {
		width: `${r.width}px`,
		height: `${r.height}px`
	} : r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/mouse.js
var io = ((e) => (e[e.Left = 0] = "Left", e[e.Right = 2] = "Right", e))(io || {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-handle-toggle.js
function ao(e) {
	let t = v(null);
	return {
		onPointerDown: G((n) => {
			t.current = n.pointerType, !Ma(n.currentTarget) && n.pointerType === "mouse" && n.button === io.Left && (n.preventDefault(), e(n));
		}),
		onClick: G((n) => {
			t.current !== "mouse" && (Ma(n.currentTarget) || e(n));
		})
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/default-map.js
var oo = class extends Map {
	constructor(e) {
		super(), this.factory = e;
	}
	get(e) {
		let t = super.get(e);
		return t === void 0 && (t = this.factory(e), this.set(e, t)), t;
	}
}, so = Object.defineProperty, co = (e, t, n) => t in e ? so(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, lo = (e, t, n) => (co(e, typeof t == "symbol" ? t : t + "", n), n), uo = (e, t, n) => {
	if (!t.has(e)) throw TypeError("Cannot " + n);
}, fo = (e, t, n) => (uo(e, t, "read from private field"), n ? n.call(e) : t.get(e)), po = (e, t, n) => {
	if (t.has(e)) throw TypeError("Cannot add the same private member more than once");
	t instanceof WeakSet ? t.add(e) : t.set(e, n);
}, mo = (e, t, n, r) => (uo(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), ho, go, _o, vo = class {
	constructor(e) {
		po(this, ho, {}), po(this, go, new oo(() => /* @__PURE__ */ new Set())), po(this, _o, /* @__PURE__ */ new Set()), lo(this, "disposables", Ni()), mo(this, ho, e), Di.isServer && this.disposables.microTask(() => {
			this.dispose();
		});
	}
	dispose() {
		this.disposables.dispose();
	}
	get state() {
		return fo(this, ho);
	}
	subscribe(e, t) {
		if (Di.isServer) return () => {};
		let n = {
			selector: e,
			callback: t,
			current: e(fo(this, ho))
		};
		return fo(this, _o).add(n), this.disposables.add(() => {
			fo(this, _o).delete(n);
		});
	}
	on(e, t) {
		return Di.isServer ? () => {} : (fo(this, go).get(e).add(t), this.disposables.add(() => {
			fo(this, go).get(e).delete(t);
		}));
	}
	send(e) {
		let t = this.reduce(fo(this, ho), e);
		if (t !== fo(this, ho)) {
			mo(this, ho, t);
			for (let e of fo(this, _o)) {
				let t = e.selector(fo(this, ho));
				yo(e.current, t) || (e.current = t, e.callback(t));
			}
			for (let t of fo(this, go).get(e.type)) t(fo(this, ho), e);
		}
	}
};
ho = /* @__PURE__ */ new WeakMap(), go = /* @__PURE__ */ new WeakMap(), _o = /* @__PURE__ */ new WeakMap();
function yo(e, t) {
	return Object.is(e, t) ? !0 : typeof e != "object" || !e || typeof t != "object" || !t ? !1 : Array.isArray(e) && Array.isArray(t) ? e.length === t.length && bo(e[Symbol.iterator](), t[Symbol.iterator]()) : e instanceof Map && t instanceof Map || e instanceof Set && t instanceof Set ? e.size === t.size && bo(e.entries(), t.entries()) : xo(e) && xo(t) ? bo(Object.entries(e)[Symbol.iterator](), Object.entries(t)[Symbol.iterator]()) : !1;
}
function bo(e, t) {
	do {
		let n = e.next(), r = t.next();
		if (n.done && r.done) return !0;
		if (n.done || r.done || !Object.is(n.value, r.value)) return !1;
	} while (!0);
}
function xo(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
function So(e) {
	let [t, n] = e(), r = Ni();
	return (...e) => {
		t(...e), r.dispose(), r.microTask(n);
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/machines/stack-machine.js
var Co = Object.defineProperty, wo = (e, t, n) => t in e ? Co(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, To = (e, t, n) => (wo(e, typeof t == "symbol" ? t : t + "", n), n), Eo = ((e) => (e[e.Push = 0] = "Push", e[e.Pop = 1] = "Pop", e))(Eo || {}), Do = {
	0(e, t) {
		let n = t.id, r = e.stack, i = e.stack.indexOf(n);
		if (i !== -1) {
			let t = e.stack.slice();
			return t.splice(i, 1), t.push(n), r = t, {
				...e,
				stack: r
			};
		}
		return {
			...e,
			stack: [...e.stack, n]
		};
	},
	1(e, t) {
		let n = t.id, r = e.stack.indexOf(n);
		if (r === -1) return e;
		let i = e.stack.slice();
		return i.splice(r, 1), {
			...e,
			stack: i
		};
	}
}, Oo = class e extends vo {
	constructor() {
		super(...arguments), To(this, "actions", {
			push: (e) => this.send({
				type: 0,
				id: e
			}),
			pop: (e) => this.send({
				type: 1,
				id: e
			})
		}), To(this, "selectors", {
			isTop: (e, t) => e.stack[e.stack.length - 1] === t,
			inStack: (e, t) => e.stack.includes(t)
		});
	}
	static new() {
		return new e({ stack: [] });
	}
	reduce(e, t) {
		return Ui(t.type, Do, e, t);
	}
}, ko = new oo(() => Oo.new()), Ao = typeof Object.is == "function" ? Object.is : (e, t) => e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
function jo(e, t, n, r, i) {
	let a = v(null), o;
	a.current === null ? (o = {
		hasValue: !1,
		value: null
	}, a.current = o) : o = a.current;
	let [s, c] = g(() => {
		let e = !1, a, s, c = (t) => {
			if (!e) {
				e = !0, a = t;
				let n = r(t);
				if (i !== void 0 && o.hasValue) {
					let e = o.value;
					if (i(e, n)) return s = e, e;
				}
				return s = n, n;
			}
			let n = a, c = s;
			if (Ao(n, t)) return c;
			let l = r(t);
			return i !== void 0 && i(c, l) ? (a = t, c) : (a = t, s = l, l);
		}, l = n ?? null;
		return [() => c(t()), l === null ? void 0 : () => c(l())];
	}, [
		t,
		n,
		r,
		i
	]), l = b(e, s, c);
	return f(() => {
		o.hasValue = !0, o.value = l;
	}, [l]), d(l), l;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/react-glue.js
function X(e, t, n = yo) {
	return jo(G((t) => e.subscribe(Mo, t)), G(() => e.state), G(() => e.state), G(t), n);
}
function Mo(e) {
	return e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
function No(e, t) {
	let n = p(), r = ko.get(t), [i, a] = X(r, l((e) => [r.selectors.isTop(e, n), r.selectors.inStack(e, n)], [r, n]));
	return W(() => {
		if (e) return r.actions.push(n), () => r.actions.pop(n);
	}, [
		r,
		e,
		n
	]), e ? !a || i : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-inert-others.js
var Po = /* @__PURE__ */ new Map(), Fo = /* @__PURE__ */ new Map();
function Io(e) {
	let t = Fo.get(e) ?? 0;
	return Fo.set(e, t + 1), t === 0 ? (Po.set(e, {
		"aria-hidden": e.getAttribute("aria-hidden"),
		inert: e.inert
	}), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => Lo(e)) : () => Lo(e);
}
function Lo(e) {
	let t = Fo.get(e) ?? 1;
	if (t === 1 ? Fo.delete(e) : Fo.set(e, t - 1), t !== 1) return;
	let n = Po.get(e);
	n && (n["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", n["aria-hidden"]), e.inert = n.inert, Po.delete(e));
}
function Ro(e, { allowed: t, disallowed: n } = {}) {
	let r = No(e, "inert-others");
	W(() => {
		if (!r) return;
		let e = Ni();
		for (let t of n?.() ?? []) t && e.add(Io(t));
		let i = t?.() ?? [];
		for (let t of i) {
			if (!t) continue;
			let n = Oi(t);
			if (!n) continue;
			let r = t.parentElement;
			for (; r && r !== n.body;) {
				for (let t of r.children) i.some((e) => t.contains(e)) || e.add(Io(t));
				r = r.parentElement;
			}
		}
		return e.dispose;
	}, [
		r,
		t,
		n
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-on-disappear.js
function zo(e, t, n) {
	let r = Fi((e) => {
		let t = e.getBoundingClientRect();
		t.x === 0 && t.y === 0 && t.width === 0 && t.height === 0 && n();
	});
	f(() => {
		if (!e) return;
		let n = t === null ? null : Ca(t) ? t : t.current;
		if (!n) return;
		let i = Ni();
		if (typeof ResizeObserver < "u") {
			let e = new ResizeObserver(() => r.current(n));
			e.observe(n), i.add(() => e.disconnect());
		}
		if (typeof IntersectionObserver < "u") {
			let e = new IntersectionObserver(() => r.current(n));
			e.observe(n), i.add(() => e.disconnect());
		}
		return () => i.dispose();
	}, [
		t,
		r,
		e
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/focus-management.js
var Bo = [
	"[contentEditable=true]",
	"[tabindex]",
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	"iframe",
	"input:not([disabled])",
	"select:not([disabled])",
	"details>summary",
	"textarea:not([disabled])"
].map((e) => `${e}:not([tabindex='-1'])`).join(","), Vo = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(","), Z = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(Z || {}), Ho = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(Ho || {}), Uo = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(Uo || {});
function Wo(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(Bo)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
function Go(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(Vo)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
var Ko = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(Ko || {});
function qo(e, t = 0) {
	return e !== Oi(e)?.body && Ui(t, {
		0() {
			return e.matches(Bo);
		},
		1() {
			let t = e;
			for (; t !== null;) {
				if (t.matches(Bo)) return !0;
				t = t.parentElement;
			}
			return !1;
		}
	});
}
function Jo(e) {
	Ni().nextFrame(() => {
		let t = Ai(e);
		t && wa(t) && !qo(t, 0) && Xo(e);
	});
}
var Yo = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(Yo || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
	e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
function Xo(e) {
	e?.focus({ preventScroll: !0 });
}
var Zo = ["textarea", "input"].join(",");
function Qo(e) {
	return (e?.matches)?.call(e, Zo) ?? !1;
}
function $o(e, t = (e) => e) {
	return e.slice().sort((e, n) => {
		let r = t(e), i = t(n);
		if (r === null || i === null) return 0;
		let a = r.compareDocumentPosition(i);
		return a & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : a & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
	});
}
function es(e, t, n = e === null ? document.body : ki(e)) {
	return ts(Wo(n), t, { relativeTo: e });
}
function ts(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
	let a = Array.isArray(e) ? e.length > 0 ? ki(e[0]) : document : ki(e), o = Array.isArray(e) ? n ? $o(e) : e : t & 64 ? Go(e) : Wo(e);
	i.length > 0 && o.length > 1 && (o = o.filter((e) => !i.some((t) => t != null && "current" in t ? t?.current === e : t === e))), r ??= a?.activeElement;
	let s = (() => {
		if (t & 5) return 1;
		if (t & 10) return -1;
		throw Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
	})(), c = (() => {
		if (t & 1) return 0;
		if (t & 2) return Math.max(0, o.indexOf(r)) - 1;
		if (t & 4) return Math.max(0, o.indexOf(r)) + 1;
		if (t & 8) return o.length - 1;
		throw Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
	})(), l = t & 32 ? { preventScroll: !0 } : {}, u = 0, d = o.length, f;
	do {
		if (u >= d || u + d <= 0) return 0;
		let e = c + u;
		if (t & 16) e = (e + d) % d;
		else {
			if (e < 0) return 3;
			if (e >= d) return 1;
		}
		f = o[e], f?.focus(l), u += s;
	} while (f !== Ai(f));
	return t & 6 && Qo(f) && f.select(), 2;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/platform.js
function ns() {
	return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function rs() {
	return /Android/gi.test(window.navigator.userAgent);
}
function is() {
	return ns() || rs();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-document-event.js
function as(e, t, n, r) {
	let i = Fi(n);
	f(() => {
		if (!e) return;
		function n(e) {
			i.current(e);
		}
		return document.addEventListener(t, n, r), () => document.removeEventListener(t, n, r);
	}, [
		e,
		t,
		r
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-window-event.js
function os(e, t, n, r) {
	let i = Fi(n);
	f(() => {
		if (!e) return;
		function n(e) {
			i.current(e);
		}
		return window.addEventListener(t, n, r), () => window.removeEventListener(t, n, r);
	}, [
		e,
		t,
		r
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-outside-click.js
var ss = 30;
function cs(e, t, n) {
	let r = Fi(n), i = l(function(e, n) {
		if (e.defaultPrevented) return;
		let i = n(e);
		if (i === null || !i.getRootNode().contains(i) || !i.isConnected) return;
		let a = function e(t) {
			return typeof t == "function" ? e(t()) : Array.isArray(t) || t instanceof Set ? t : [t];
		}(t);
		for (let t of a) if (t !== null && (t.contains(i) || e.composed && e.composedPath().includes(t))) return;
		return !qo(i, Ko.Loose) && i.tabIndex !== -1 && e.preventDefault(), r.current(e, i);
	}, [r, t]), a = v(null);
	as(e, "pointerdown", (e) => {
		is() || (a.current = e.composedPath?.call(e)?.[0] || e.target);
	}, !0), as(e, "pointerup", (e) => {
		if (is() || !a.current) return;
		let t = a.current;
		return a.current = null, i(e, () => t);
	}, !0);
	let o = v({
		x: 0,
		y: 0
	});
	as(e, "touchstart", (e) => {
		o.current.x = e.touches[0].clientX, o.current.y = e.touches[0].clientY;
	}, !0), as(e, "touchend", (e) => {
		let t = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if (!(Math.abs(t.x - o.current.x) >= ss || Math.abs(t.y - o.current.y) >= ss)) return i(e, () => wa(e.target) ? e.target : null);
	}, !0), os(e, "blur", (e) => i(e, () => Ea(window.document.activeElement) ? window.document.activeElement : null), !0);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-owner.js
function ls(...e) {
	return g(() => Oi(...e), [...e]);
}
function us(...e) {
	return g(() => ki(...e), [...e]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-quick-release.js
var ds = ((e) => (e[e.Ignore = 0] = "Ignore", e[e.Select = 1] = "Select", e[e.Close = 2] = "Close", e))(ds || {}), fs = {
	Ignore: { kind: 0 },
	Select: (e) => ({
		kind: 1,
		target: e
	}),
	Close: { kind: 2 }
}, ps = 200, ms = 5;
function hs(e, { trigger: t, action: n, close: r, select: i }) {
	let a = v(null), o = v(null), s = v(null);
	as(e && t !== null, "pointerdown", (e) => {
		xa(e?.target) && t != null && t.contains(e.target) && (o.current = e.x, s.current = e.y, a.current = e.timeStamp);
	}), as(e && t !== null, "pointerup", (e) => {
		let t = a.current;
		if (t === null || (a.current = null, !wa(e.target)) || Math.abs(e.x - (o.current ?? e.x)) < ms && Math.abs(e.y - (s.current ?? e.y)) < ms) return;
		let c = n(e);
		switch (c.kind) {
			case 0: return;
			case 1:
				e.timeStamp - t > ps && (i(c.target), r());
				break;
			case 2:
				r();
				break;
		}
	}, { capture: !0 });
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event-listener.js
function gs(e, t, n, r) {
	let i = Fi(n);
	f(() => {
		e ??= window;
		function n(e) {
			i.current(e);
		}
		return e.addEventListener(t, n, r), () => e.removeEventListener(t, n, r);
	}, [
		e,
		t,
		r
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-resolve-button-type.js
function _s(e, t) {
	return g(() => {
		if (e.type) return e.type;
		let n = e.as ?? "button";
		if (typeof n == "string" && n.toLowerCase() === "button" || t?.tagName === "BUTTON" && !t.hasAttribute("type")) return "button";
	}, [
		e.type,
		e.as,
		t
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-store.js
function vs(e) {
	return b(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/store.js
function ys(e, t) {
	let n = e(), r = /* @__PURE__ */ new Set();
	return {
		getSnapshot() {
			return n;
		},
		subscribe(e) {
			return r.add(e), () => r.delete(e);
		},
		dispatch(e, ...i) {
			let a = t[e].call(n, ...i);
			a && (n = a, r.forEach((e) => e()));
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/adjust-scrollbar-padding.js
function bs() {
	let e;
	return {
		before({ doc: t }) {
			let n = t.documentElement, r = t.defaultView ?? window;
			e = Math.max(0, r.innerWidth - n.clientWidth);
		},
		after({ doc: t, d: n }) {
			let r = t.documentElement, i = Math.max(0, r.clientWidth - r.offsetWidth), a = Math.max(0, e - i);
			n.style(r, "paddingRight", `${a}px`);
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/handle-ios-locking.js
function xs() {
	return ns() ? { before({ doc: e, d: t, meta: n }) {
		function r(e) {
			for (let t of n().containers) for (let n of t()) if (n.contains(e)) return !0;
			return !1;
		}
		t.microTask(() => {
			if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
				let n = Ni();
				n.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => n.dispose()));
			}
			let n = window.scrollY ?? window.pageYOffset, i = null;
			t.addEventListener(e, "click", (t) => {
				if (wa(t.target)) try {
					let n = t.target.closest("a");
					if (!n) return;
					let { hash: a } = new URL(n.href), o = e.querySelector(a);
					wa(o) && !r(o) && (i = o);
				} catch {}
			}, !0), t.group((n) => {
				t.addEventListener(e, "touchstart", (e) => {
					if (n.dispose(), wa(e.target) && Ta(e.target)) if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && r(t.parentElement);) t = t.parentElement;
						n.style(t, "overscrollBehavior", "contain");
					} else n.style(e.target, "touchAction", "none");
				});
			}), t.addEventListener(e, "touchmove", (e) => {
				if (wa(e.target)) {
					if (Da(e.target)) return;
					if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && t.dataset.headlessuiPortal !== "" && !(t.scrollHeight > t.clientHeight || t.scrollWidth > t.clientWidth);) t = t.parentElement;
						t.dataset.headlessuiPortal === "" && e.preventDefault();
					} else e.preventDefault();
				}
			}, { passive: !1 }), t.add(() => {
				let e = window.scrollY ?? window.pageYOffset;
				n !== e && window.scrollTo(0, n), i && i.isConnected && (i.scrollIntoView({ block: "nearest" }), i = null);
			});
		});
	} } : {};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/prevent-scroll.js
function Ss() {
	return { before({ doc: e, d: t }) {
		t.style(e.documentElement, "overflow", "hidden");
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
function Cs(e) {
	let t = {};
	for (let n of e) Object.assign(t, n(t));
	return t;
}
var ws = ys(() => /* @__PURE__ */ new Map(), {
	PUSH(e, t) {
		let n = this.get(e) ?? {
			doc: e,
			count: 0,
			d: Ni(),
			meta: /* @__PURE__ */ new Set(),
			computedMeta: {}
		};
		return n.count++, n.meta.add(t), n.computedMeta = Cs(n.meta), this.set(e, n), this;
	},
	POP(e, t) {
		let n = this.get(e);
		return n && (n.count--, n.meta.delete(t), n.computedMeta = Cs(n.meta)), this;
	},
	SCROLL_PREVENT(e) {
		let t = {
			doc: e.doc,
			d: e.d,
			meta() {
				return e.computedMeta;
			}
		}, n = [
			xs(),
			bs(),
			Ss()
		];
		n.forEach(({ before: e }) => e?.(t)), n.forEach(({ after: e }) => e?.(t));
	},
	SCROLL_ALLOW({ d: e }) {
		e.dispose();
	},
	TEARDOWN({ doc: e }) {
		this.delete(e);
	}
});
ws.subscribe(() => {
	let e = ws.getSnapshot(), t = /* @__PURE__ */ new Map();
	for (let [n] of e) t.set(n, n.documentElement.style.overflow);
	for (let n of e.values()) {
		let e = t.get(n.doc) === "hidden", r = n.count !== 0;
		(r && !e || !r && e) && ws.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && ws.dispatch("TEARDOWN", n);
	}
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
function Ts(e, t, n = () => ({ containers: [] })) {
	let r = vs(ws), i = t ? r.get(t) : void 0, a = i ? i.count > 0 : !1;
	return W(() => {
		if (!(!t || !e)) return ws.dispatch("PUSH", t, n), () => ws.dispatch("POP", t, n);
	}, [e, t]), a;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
function Es(e, t, n = () => [document.body]) {
	Ts(No(e, "scroll-lock"), t, (e) => ({ containers: [...e.containers ?? [], n] }));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tracked-pointer.js
function Ds(e) {
	return [e.screenX, e.screenY];
}
function Os() {
	let e = v([-1, -1]);
	return {
		wasMoved(t) {
			let n = Ds(t);
			return e.current[0] === n[0] && e.current[1] === n[1] ? !1 : (e.current = n, !0);
		},
		update(t) {
			e.current = Ds(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-flags.js
function ks(e = 0) {
	let [t, n] = y(e);
	return {
		flags: t,
		setFlag: l((e) => n(e), []),
		addFlag: l((e) => n((t) => t | e), []),
		hasFlag: l((e) => (t & e) === e, [t]),
		removeFlag: l((e) => n((t) => t & ~e), []),
		toggleFlag: l((e) => n((t) => t ^ e), [])
	};
}
typeof process < "u" && typeof globalThis < "u" && typeof Element < "u" && (process == null ? void 0 : process.env)?.NODE_ENV === "test" && (Element == null ? void 0 : Element.prototype)?.getAnimations === void 0 && (Element.prototype.getAnimations = function() {
	return console.warn([
		"Headless UI has polyfilled `Element.prototype.getAnimations` for your tests.",
		"Please install a proper polyfill e.g. `jsdom-testing-mocks`, to silence these warnings.",
		"",
		"Example usage:",
		"```js",
		"import { mockAnimationsApi } from 'jsdom-testing-mocks'",
		"mockAnimationsApi()",
		"```"
	].join("\n")), [];
});
var As = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(As || {});
function js(e) {
	let t = {};
	for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
	return t;
}
function Ms(e, t, n, r) {
	let [i, a] = y(n), { hasFlag: o, addFlag: s, removeFlag: c } = ks(e && i ? 3 : 0), l = v(!1), u = v(!1);
	return W(() => {
		var i;
		if (e) {
			if (n && a(!0), !t) {
				n && s(3);
				return;
			}
			return (i = r?.start) == null || i.call(r, n), Ns(t, {
				inFlight: l,
				prepare() {
					u.current ? u.current = !1 : u.current = l.current, l.current = !0, !u.current && (n ? (s(3), c(4)) : (s(4), c(2)));
				},
				run() {
					u.current ? n ? (c(3), s(4)) : (c(4), s(3)) : n ? c(1) : s(1);
				},
				done() {
					var e;
					u.current && Is(t) || (l.current = !1, c(7), n || a(!1), (e = r?.end) == null || e.call(r, n));
				}
			});
		}
	}, [
		e,
		n,
		t,
		Pi()
	]), e ? [i, {
		closed: o(1),
		enter: o(2),
		leave: o(4),
		transition: o(2) || o(4)
	}] : [n, {
		closed: void 0,
		enter: void 0,
		leave: void 0,
		transition: void 0
	}];
}
function Ns(e, { prepare: t, run: n, done: r, inFlight: i }) {
	let a = Ni();
	return Fs(e, {
		prepare: t,
		inFlight: i
	}), a.nextFrame(() => {
		n(), a.requestAnimationFrame(() => {
			a.add(Ps(e, r));
		});
	}), a.dispose;
}
function Ps(e, t) {
	let n = Ni();
	if (!e) return n.dispose;
	let r = !1;
	n.add(() => {
		r = !0;
	});
	let i = e.getAnimations?.call(e).filter((e) => e instanceof CSSTransition) ?? [];
	return i.length === 0 ? (t(), n.dispose) : (Promise.allSettled(i.map((e) => e.finished)).then(() => {
		r || t();
	}), n.dispose);
}
function Fs(e, { inFlight: t, prepare: n }) {
	if (t != null && t.current) {
		n();
		return;
	}
	let r = e.style.transition;
	e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function Is(e) {
	return (e.getAnimations?.call(e) ?? []).some((e) => e instanceof CSSTransition && e.playState !== "finished");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tree-walker.js
function Ls(e, { container: t, accept: n, walk: r }) {
	let i = v(n), a = v(r);
	f(() => {
		i.current = n, a.current = r;
	}, [n, r]), W(() => {
		if (!t || !e) return;
		let n = Oi(t);
		if (!n) return;
		let r = i.current, o = a.current, s = Object.assign((e) => r(e), { acceptNode: r }), c = n.createTreeWalker(t, NodeFilter.SHOW_ELEMENT, s, !1);
		for (; c.nextNode();) o(c.currentNode);
	}, [
		t,
		e,
		i,
		a
	]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-watch.js
function Rs(e, t) {
	let n = v([]), r = G(e);
	f(() => {
		let e = [...n.current];
		for (let [i, a] of t.entries()) if (n.current[i] !== a) {
			let i = r(t, e);
			return n.current = t, i;
		}
	}, [r, ...t]);
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function zs() {
	return typeof window < "u";
}
function Bs(e) {
	return Us(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Vs(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Hs(e) {
	return ((Us(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function Us(e) {
	return zs() ? e instanceof Node || e instanceof Vs(e).Node : !1;
}
function Ws(e) {
	return zs() ? e instanceof Element || e instanceof Vs(e).Element : !1;
}
function Gs(e) {
	return zs() ? e instanceof HTMLElement || e instanceof Vs(e).HTMLElement : !1;
}
function Ks(e) {
	return !zs() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Vs(e).ShadowRoot;
}
function qs(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = ic(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function Js(e) {
	return /^(table|td|th)$/.test(Bs(e));
}
function Ys(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var Xs = /transform|translate|scale|rotate|perspective|filter/, Zs = /paint|layout|strict|content/, Qs = (e) => !!e && e !== "none", $s;
function ec(e) {
	let t = Ws(e) ? ic(e) : e;
	return Qs(t.transform) || Qs(t.translate) || Qs(t.scale) || Qs(t.rotate) || Qs(t.perspective) || !nc() && (Qs(t.backdropFilter) || Qs(t.filter)) || Xs.test(t.willChange || "") || Zs.test(t.contain || "");
}
function tc(e) {
	let t = oc(e);
	for (; Gs(t) && !rc(t);) {
		if (ec(t)) return t;
		if (Ys(t)) return null;
		t = oc(t);
	}
	return null;
}
function nc() {
	return $s ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), $s;
}
function rc(e) {
	return /^(html|body|#document)$/.test(Bs(e));
}
function ic(e) {
	return Vs(e).getComputedStyle(e);
}
function ac(e) {
	return Ws(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function oc(e) {
	if (Bs(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || Ks(e) && e.host || Hs(e);
	return Ks(t) ? t.host : t;
}
function sc(e) {
	let t = oc(e);
	return rc(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : Gs(t) && qs(t) ? t : sc(t);
}
function cc(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = sc(e), i = r === e.ownerDocument?.body, a = Vs(r);
	if (i) {
		let e = lc(a);
		return t.concat(a, a.visualViewport || [], qs(r) ? r : [], e && n ? cc(e) : []);
	} else return t.concat(r, cc(r, [], n));
}
function lc(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+react@0.26.28_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@floating-ui/react/dist/floating-ui.react.utils.mjs
function uc() {
	let e = navigator.userAgentData;
	return e && Array.isArray(e.brands) ? e.brands.map((e) => {
		let { brand: t, version: n } = e;
		return t + "/" + n;
	}).join(" ") : navigator.userAgent;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var dc = Math.min, fc = Math.max, pc = Math.round, mc = Math.floor, hc = (e) => ({
	x: e,
	y: e
}), gc = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function _c(e, t, n) {
	return fc(e, dc(t, n));
}
function vc(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function yc(e) {
	return e.split("-")[0];
}
function bc(e) {
	return e.split("-")[1];
}
function xc(e) {
	return e === "x" ? "y" : "x";
}
function Sc(e) {
	return e === "y" ? "height" : "width";
}
function Cc(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function wc(e) {
	return xc(Cc(e));
}
function Tc(e, t, n) {
	n === void 0 && (n = !1);
	let r = bc(e), i = wc(e), a = Sc(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = Pc(o)), [o, Pc(o)];
}
function Ec(e) {
	let t = Pc(e);
	return [
		Dc(e),
		t,
		Dc(t)
	];
}
function Dc(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var Oc = ["left", "right"], kc = ["right", "left"], Ac = ["top", "bottom"], jc = ["bottom", "top"];
function Mc(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? kc : Oc : t ? Oc : kc;
		case "left":
		case "right": return t ? Ac : jc;
		default: return [];
	}
}
function Nc(e, t, n, r) {
	let i = bc(e), a = Mc(yc(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(Dc)))), a;
}
function Pc(e) {
	let t = yc(e);
	return gc[t] + e.slice(t.length);
}
function Fc(e) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...e
	};
}
function Ic(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : Fc(e);
}
function Lc(e) {
	let { x: t, y: n, width: r, height: i } = e;
	return {
		width: r,
		height: i,
		top: n,
		left: t,
		right: t + r,
		bottom: n + i,
		x: t,
		y: n
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+core@1.7.5/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function Rc(e, t, n) {
	let { reference: r, floating: i } = e, a = Cc(t), o = wc(t), s = Sc(o), c = yc(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
	switch (c) {
		case "top":
			p = {
				x: u,
				y: r.y - i.height
			};
			break;
		case "bottom":
			p = {
				x: u,
				y: r.y + r.height
			};
			break;
		case "right":
			p = {
				x: r.x + r.width,
				y: d
			};
			break;
		case "left":
			p = {
				x: r.x - i.width,
				y: d
			};
			break;
		default: p = {
			x: r.x,
			y: r.y
		};
	}
	switch (bc(t)) {
		case "start":
			p[o] -= f * (n && l ? -1 : 1);
			break;
		case "end":
			p[o] += f * (n && l ? -1 : 1);
			break;
	}
	return p;
}
async function zc(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = vc(t, e), p = Ic(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = Lc(await i.getClippingRect({
		element: await (i.isElement == null ? void 0 : i.isElement(m)) ?? !0 ? m : m.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating)),
		boundary: c,
		rootBoundary: l,
		strategy: s
	})), g = u === "floating" ? {
		x: n,
		y: r,
		width: a.floating.width,
		height: a.floating.height
	} : a.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)), v = await (i.isElement == null ? void 0 : i.isElement(_)) && await (i.getScale == null ? void 0 : i.getScale(_)) || {
		x: 1,
		y: 1
	}, y = Lc(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements: o,
		rect: g,
		offsetParent: _,
		strategy: s
	}) : g);
	return {
		top: (h.top - y.top + p.top) / v.y,
		bottom: (y.bottom - h.bottom + p.bottom) / v.y,
		left: (h.left - y.left + p.left) / v.x,
		right: (y.right - h.right + p.right) / v.x
	};
}
var Bc = 50, Vc = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: zc
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = Rc(l, r, c), f = r, p = 0, m = {};
	for (let n = 0; n < a.length; n++) {
		let h = a[n];
		if (!h) continue;
		let { name: g, fn: _ } = h, { x: v, y, data: b, reset: x } = await _({
			x: u,
			y: d,
			initialPlacement: r,
			placement: f,
			strategy: i,
			middlewareData: m,
			rects: l,
			platform: s,
			elements: {
				reference: e,
				floating: t
			}
		});
		u = v ?? u, d = y ?? d, m[g] = {
			...m[g],
			...b
		}, x && p < Bc && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = Rc(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, Hc = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = vc(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = yc(r), _ = Cc(o), v = yc(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [Pc(o)] : Ec(o)), x = p !== "none";
			!d && x && b.push(...Nc(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = Tc(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (!(u === "alignment" && _ !== Cc(t)) || T.every((e) => Cc(e.placement) !== _ || e.overflows[0] > 0))) return {
					data: {
						index: e,
						overflows: T
					},
					reset: { placement: t }
				};
				let n = T.filter((e) => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]?.placement;
				if (!n) switch (f) {
					case "bestFit": {
						let e = T.filter((e) => {
							if (x) {
								let t = Cc(e.placement);
								return t === _ || t === "y";
							}
							return !0;
						}).map((e) => [e.placement, e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]?.[0];
						e && (n = e);
						break;
					}
					case "initialPlacement":
						n = o;
						break;
				}
				if (r !== n) return { reset: { placement: n } };
			}
			return {};
		}
	};
}, Uc = /*#__PURE__*/ new Set(["left", "top"]);
async function Wc(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = yc(n), s = bc(n), c = Cc(n) === "y", l = Uc.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = vc(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
		mainAxis: d,
		crossAxis: 0,
		alignmentAxis: null
	} : {
		mainAxis: d.mainAxis || 0,
		crossAxis: d.crossAxis || 0,
		alignmentAxis: d.alignmentAxis
	};
	return s && typeof m == "number" && (p = s === "end" ? m * -1 : m), c ? {
		x: p * u,
		y: f * l
	} : {
		x: f * l,
		y: p * u
	};
}
var Gc = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await Wc(t, e);
			return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset ? {} : {
				x: r + s.x,
				y: i + s.y,
				data: {
					...s,
					placement: a
				}
			};
		}
	};
}, Kc = function(e) {
	return e === void 0 && (e = {}), {
		name: "shift",
		options: e,
		async fn(t) {
			let { x: n, y: r, placement: i, platform: a } = t, { mainAxis: o = !0, crossAxis: s = !1, limiter: c = { fn: (e) => {
				let { x: t, y: n } = e;
				return {
					x: t,
					y: n
				};
			} }, ...l } = vc(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Cc(yc(i)), p = xc(f), m = u[p], h = u[f];
			if (o) {
				let e = p === "y" ? "top" : "left", t = p === "y" ? "bottom" : "right", n = m + d[e], r = m - d[t];
				m = _c(n, m, r);
			}
			if (s) {
				let e = f === "y" ? "top" : "left", t = f === "y" ? "bottom" : "right", n = h + d[e], r = h - d[t];
				h = _c(n, h, r);
			}
			let g = c.fn({
				...t,
				[p]: m,
				[f]: h
			});
			return {
				...g,
				data: {
					x: g.x - n,
					y: g.y - r,
					enabled: {
						[p]: o,
						[f]: s
					}
				}
			};
		}
	};
}, qc = function(e) {
	return e === void 0 && (e = {}), {
		name: "size",
		options: e,
		async fn(t) {
			var n, r;
			let { placement: i, rects: a, platform: o, elements: s } = t, { apply: c = () => {}, ...l } = vc(e, t), u = await o.detectOverflow(t, l), d = yc(i), f = bc(i), p = Cc(i) === "y", { width: m, height: h } = a.floating, g, _;
			d === "top" || d === "bottom" ? (g = d, _ = f === (await (o.isRTL == null ? void 0 : o.isRTL(s.floating)) ? "start" : "end") ? "left" : "right") : (_ = d, g = f === "end" ? "top" : "bottom");
			let v = h - u.top - u.bottom, y = m - u.left - u.right, b = dc(h - u[g], v), x = dc(m - u[_], y), S = !t.middlewareData.shift, C = b, w = x;
			if ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y), (r = t.middlewareData.shift) != null && r.enabled.y && (C = v), S && !f) {
				let e = fc(u.left, 0), t = fc(u.right, 0), n = fc(u.top, 0), r = fc(u.bottom, 0);
				p ? w = m - 2 * (e !== 0 || t !== 0 ? e + t : fc(u.left, u.right)) : C = h - 2 * (n !== 0 || r !== 0 ? n + r : fc(u.top, u.bottom));
			}
			await c({
				...t,
				availableWidth: w,
				availableHeight: C
			});
			let T = await o.getDimensions(s.floating);
			return m !== T.width || h !== T.height ? { reset: { rects: !0 } } : {};
		}
	};
};
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+dom@1.7.6/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function Jc(e) {
	let t = ic(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = Gs(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = pc(n) !== a || pc(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function Yc(e) {
	return Ws(e) ? e : e.contextElement;
}
function Xc(e) {
	let t = Yc(e);
	if (!Gs(t)) return hc(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = Jc(t), o = (a ? pc(n.width) : n.width) / r, s = (a ? pc(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var Zc = /*#__PURE__*/ hc(0);
function Qc(e) {
	let t = Vs(e);
	return !nc() || !t.visualViewport ? Zc : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function $c(e, t, n) {
	return t === void 0 && (t = !1), !n || t && n !== Vs(e) ? !1 : t;
}
function el(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = Yc(e), o = hc(1);
	t && (r ? Ws(r) && (o = Xc(r)) : o = Xc(e));
	let s = $c(a, n, r) ? Qc(a) : hc(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a) {
		let e = Vs(a), t = r && Ws(r) ? Vs(r) : r, n = e, i = lc(n);
		for (; i && r && t !== n;) {
			let e = Xc(i), t = i.getBoundingClientRect(), r = ic(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = Vs(i), i = lc(n);
		}
	}
	return Lc({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function tl(e, t) {
	let n = ac(e).scrollLeft;
	return t ? t.left + n : el(Hs(e)).left + n;
}
function nl(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - tl(e, n),
		y: n.top + t.scrollTop
	};
}
function rl(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = Hs(r), s = t ? Ys(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = hc(1), u = hc(0), d = Gs(r);
	if ((d || !d && !a) && ((Bs(r) !== "body" || qs(o)) && (c = ac(r)), d)) {
		let e = el(r);
		l = Xc(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? nl(o, c) : hc(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function il(e) {
	return Array.from(e.getClientRects());
}
function al(e) {
	let t = Hs(e), n = ac(e), r = e.ownerDocument.body, i = fc(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = fc(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight), o = -n.scrollLeft + tl(e), s = -n.scrollTop;
	return ic(r).direction === "rtl" && (o += fc(t.clientWidth, r.clientWidth) - i), {
		width: i,
		height: a,
		x: o,
		y: s
	};
}
var ol = 25;
function sl(e, t) {
	let n = Vs(e), r = Hs(e), i = n.visualViewport, a = r.clientWidth, o = r.clientHeight, s = 0, c = 0;
	if (i) {
		a = i.width, o = i.height;
		let e = nc();
		(!e || e && t === "fixed") && (s = i.offsetLeft, c = i.offsetTop);
	}
	let l = tl(r);
	if (l <= 0) {
		let e = r.ownerDocument, t = e.body, n = getComputedStyle(t), i = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, o = Math.abs(r.clientWidth - t.clientWidth - i);
		o <= ol && (a -= o);
	} else l <= ol && (a += l);
	return {
		width: a,
		height: o,
		x: s,
		y: c
	};
}
function cl(e, t) {
	let n = el(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = Gs(e) ? Xc(e) : hc(1);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function ll(e, t, n) {
	let r;
	if (t === "viewport") r = sl(e, n);
	else if (t === "document") r = al(Hs(e));
	else if (Ws(t)) r = cl(t, n);
	else {
		let n = Qc(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return Lc(r);
}
function ul(e, t) {
	let n = oc(e);
	return n === t || !Ws(n) || rc(n) ? !1 : ic(n).position === "fixed" || ul(n, t);
}
function dl(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = cc(e, [], !1).filter((e) => Ws(e) && Bs(e) !== "body"), i = null, a = ic(e).position === "fixed", o = a ? oc(e) : e;
	for (; Ws(o) && !rc(o);) {
		let t = ic(o), n = ec(o);
		!n && t.position === "fixed" && (i = null), (a ? !n && !i : !n && t.position === "static" && i && (i.position === "absolute" || i.position === "fixed") || qs(o) && !n && ul(e, o)) ? r = r.filter((e) => e !== o) : i = t, o = oc(o);
	}
	return t.set(e, r), r;
}
function fl(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? Ys(t) ? [] : dl(t, this._c) : [].concat(n), r], o = ll(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = ll(t, a[e], i);
		s = fc(n.top, s), c = dc(n.right, c), l = dc(n.bottom, l), u = fc(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function pl(e) {
	let { width: t, height: n } = Jc(e);
	return {
		width: t,
		height: n
	};
}
function ml(e, t, n) {
	let r = Gs(t), i = Hs(t), a = n === "fixed", o = el(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = hc(0);
	function l() {
		c.x = tl(i);
	}
	if (r || !r && !a) if ((Bs(t) !== "body" || qs(i)) && (s = ac(t)), r) {
		let e = el(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	} else i && l();
	a && !r && i && l();
	let u = i && !r && !a ? nl(i, s) : hc(0);
	return {
		x: o.left + s.scrollLeft - c.x - u.x,
		y: o.top + s.scrollTop - c.y - u.y,
		width: o.width,
		height: o.height
	};
}
function hl(e) {
	return ic(e).position === "static";
}
function gl(e, t) {
	if (!Gs(e) || ic(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return Hs(e) === n && (n = n.ownerDocument.body), n;
}
function _l(e, t) {
	let n = Vs(e);
	if (Ys(e)) return n;
	if (!Gs(e)) {
		let t = oc(e);
		for (; t && !rc(t);) {
			if (Ws(t) && !hl(t)) return t;
			t = oc(t);
		}
		return n;
	}
	let r = gl(e, t);
	for (; r && Js(r) && hl(r);) r = gl(r, t);
	return r && rc(r) && hl(r) && !ec(r) ? n : r || tc(e) || n;
}
var vl = async function(e) {
	let t = this.getOffsetParent || _l, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: ml(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function yl(e) {
	return ic(e).direction === "rtl";
}
var bl = {
	convertOffsetParentRelativeRectToViewportRelativeRect: rl,
	getDocumentElement: Hs,
	getClippingRect: fl,
	getOffsetParent: _l,
	getElementRects: vl,
	getClientRects: il,
	getDimensions: pl,
	getScale: Xc,
	isElement: Ws,
	isRTL: yl
};
function xl(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Sl(e, t) {
	let n = null, r, i = Hs(e);
	function a() {
		var e;
		clearTimeout(r), (e = n) == null || e.disconnect(), n = null;
	}
	function o(s, c) {
		s === void 0 && (s = !1), c === void 0 && (c = 1), a();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (s || t(), !f || !p) return;
		let m = mc(d), h = mc(i.clientWidth - (u + f)), g = mc(i.clientHeight - (d + p)), _ = mc(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: fc(0, dc(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (n !== c) {
				if (!y) return o();
				n ? o(!1, n) : r = setTimeout(() => {
					o(!1, 1e-7);
				}, 1e3);
			}
			n === 1 && !xl(l, e.getBoundingClientRect()) && o(), y = !1;
		}
		try {
			n = new IntersectionObserver(b, {
				...v,
				root: i.ownerDocument
			});
		} catch {
			n = new IntersectionObserver(b, v);
		}
		n.observe(e);
	}
	return o(!0), a;
}
function Cl(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = Yc(e), u = i || a ? [...l ? cc(l) : [], ...t ? cc(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n, { passive: !0 }), a && e.addEventListener("resize", n);
	});
	let d = l && s ? Sl(l, n) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? el(e) : null;
	c && g();
	function g() {
		let t = el(e);
		h && !xl(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var wl = zc, Tl = Gc, El = Kc, Dl = Hc, Ol = qc, kl = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = {
		platform: bl,
		...n
	}, a = {
		...i.platform,
		_c: r
	};
	return Vc(e, t, {
		...i,
		platform: a
	});
}, Al = typeof document < "u" ? h : function() {};
function jl(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (typeof e == "function" && e.toString() === t.toString()) return !0;
	let n, r, i;
	if (e && t && typeof e == "object") {
		if (Array.isArray(e)) {
			if (n = e.length, n !== t.length) return !1;
			for (r = n; r-- !== 0;) if (!jl(e[r], t[r])) return !1;
			return !0;
		}
		if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
		for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
		for (r = n; r-- !== 0;) {
			let n = i[r];
			if (!(n === "_owner" && e.$$typeof) && !jl(e[n], t[n])) return !1;
		}
		return !0;
	}
	return e !== e && t !== t;
}
function Ml(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Nl(e, t) {
	let n = Ml(e);
	return Math.round(t * n) / n;
}
function Pl(t) {
	let n = e.useRef(t);
	return Al(() => {
		n.current = t;
	}), n;
}
function Fl(t) {
	t === void 0 && (t = {});
	let { placement: n = "bottom", strategy: r = "absolute", middleware: i = [], platform: a, elements: { reference: o, floating: s } = {}, transform: c = !0, whileElementsMounted: l, open: u } = t, [d, f] = e.useState({
		x: 0,
		y: 0,
		strategy: r,
		placement: n,
		middlewareData: {},
		isPositioned: !1
	}), [p, m] = e.useState(i);
	jl(p, i) || m(i);
	let [h, g] = e.useState(null), [_, v] = e.useState(null), y = e.useCallback((e) => {
		e !== C.current && (C.current = e, g(e));
	}, []), b = e.useCallback((e) => {
		e !== T.current && (T.current = e, v(e));
	}, []), x = o || h, S = s || _, C = e.useRef(null), T = e.useRef(null), E = e.useRef(d), D = l != null, O = Pl(l), k = Pl(a), A = Pl(u), j = e.useCallback(() => {
		if (!C.current || !T.current) return;
		let e = {
			placement: n,
			strategy: r,
			middleware: p
		};
		k.current && (e.platform = k.current), kl(C.current, T.current, e).then((e) => {
			let t = {
				...e,
				isPositioned: A.current !== !1
			};
			M.current && !jl(E.current, t) && (E.current = t, w.flushSync(() => {
				f(t);
			}));
		});
	}, [
		p,
		n,
		r,
		k,
		A
	]);
	Al(() => {
		u === !1 && E.current.isPositioned && (E.current.isPositioned = !1, f((e) => ({
			...e,
			isPositioned: !1
		})));
	}, [u]);
	let M = e.useRef(!1);
	Al(() => (M.current = !0, () => {
		M.current = !1;
	}), []), Al(() => {
		if (x && (C.current = x), S && (T.current = S), x && S) {
			if (O.current) return O.current(x, S, j);
			j();
		}
	}, [
		x,
		S,
		j,
		O,
		D
	]);
	let N = e.useMemo(() => ({
		reference: C,
		floating: T,
		setReference: y,
		setFloating: b
	}), [y, b]), P = e.useMemo(() => ({
		reference: x,
		floating: S
	}), [x, S]), F = e.useMemo(() => {
		let e = {
			position: r,
			left: 0,
			top: 0
		};
		if (!P.floating) return e;
		let t = Nl(P.floating, d.x), n = Nl(P.floating, d.y);
		return c ? {
			...e,
			transform: "translate(" + t + "px, " + n + "px)",
			...Ml(P.floating) >= 1.5 && { willChange: "transform" }
		} : {
			position: r,
			left: t,
			top: n
		};
	}, [
		r,
		c,
		P.floating,
		d.x,
		d.y
	]);
	return e.useMemo(() => ({
		...d,
		update: j,
		refs: N,
		elements: P,
		floatingStyles: F
	}), [
		d,
		j,
		N,
		P,
		F
	]);
}
var Il = (e, t) => {
	let n = Tl(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Ll = (e, t) => {
	let n = El(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Rl = (e, t) => {
	let n = Dl(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, zl = (e, t) => {
	let n = Ol(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Bl = { ...e }, Vl = Bl.useInsertionEffect || ((e) => e());
function Hl(t) {
	let n = e.useRef(() => {});
	return Vl(() => {
		n.current = t;
	}), e.useCallback(function() {
		var e = [...arguments];
		return n.current == null ? void 0 : n.current(...e);
	}, []);
}
var Ul = "ArrowUp", Wl = "ArrowDown", Gl = "ArrowLeft", Kl = "ArrowRight", ql = typeof document < "u" ? h : f, Jl = [Gl, Kl], Yl = [Ul, Wl];
[...Jl, ...Yl];
var Xl = !1, Zl = 0, Ql = () => "floating-ui-" + Math.random().toString(36).slice(2, 6) + Zl++;
function $l() {
	let [t, n] = e.useState(() => Xl ? Ql() : void 0);
	return ql(() => {
		t ?? n(Ql());
	}, []), e.useEffect(() => {
		Xl = !0;
	}, []), t;
}
var eu = Bl.useId || $l;
function tu() {
	let e = /* @__PURE__ */ new Map();
	return {
		emit(t, n) {
			var r;
			(r = e.get(t)) == null || r.forEach((e) => e(n));
		},
		on(t, n) {
			e.set(t, [...e.get(t) || [], n]);
		},
		off(t, n) {
			e.set(t, e.get(t)?.filter((e) => e !== n) || []);
		}
	};
}
var nu = /*#__PURE__*/ e.createContext(null), ru = /*#__PURE__*/ e.createContext(null), iu = () => e.useContext(nu)?.id || null, au = () => e.useContext(ru), ou = "data-floating-ui-focusable";
function su(t) {
	let { open: n = !1, onOpenChange: r, elements: i } = t, a = eu(), o = e.useRef({}), [s] = e.useState(() => tu()), c = iu() != null, [l, u] = e.useState(i.reference), d = Hl((e, t, n) => {
		o.current.openEvent = e ? t : void 0, s.emit("openchange", {
			open: e,
			event: t,
			reason: n,
			nested: c
		}), r?.(e, t, n);
	}), f = e.useMemo(() => ({ setPositionReference: u }), []), p = e.useMemo(() => ({
		reference: l || i.reference || null,
		floating: i.floating || null,
		domReference: i.reference
	}), [
		l,
		i.reference,
		i.floating
	]);
	return e.useMemo(() => ({
		dataRef: o,
		open: n,
		onOpenChange: d,
		elements: p,
		events: s,
		floatingId: a,
		refs: f
	}), [
		n,
		d,
		p,
		s,
		a,
		f
	]);
}
function cu(t) {
	t === void 0 && (t = {});
	let { nodeId: n } = t, r = su({
		...t,
		elements: {
			reference: null,
			floating: null,
			...t.elements
		}
	}), i = t.rootContext || r, a = i.elements, [o, s] = e.useState(null), [c, l] = e.useState(null), u = a?.domReference || o, d = e.useRef(null), f = au();
	ql(() => {
		u && (d.current = u);
	}, [u]);
	let p = Fl({
		...t,
		elements: {
			...a,
			...c && { reference: c }
		}
	}), m = e.useCallback((e) => {
		let t = Ws(e) ? {
			getBoundingClientRect: () => e.getBoundingClientRect(),
			contextElement: e
		} : e;
		l(t), p.refs.setReference(t);
	}, [p.refs]), h = e.useCallback((e) => {
		(Ws(e) || e === null) && (d.current = e, s(e)), (Ws(p.refs.reference.current) || p.refs.reference.current === null || e !== null && !Ws(e)) && p.refs.setReference(e);
	}, [p.refs]), g = e.useMemo(() => ({
		...p.refs,
		setReference: h,
		setPositionReference: m,
		domReference: d
	}), [
		p.refs,
		h,
		m
	]), _ = e.useMemo(() => ({
		...p.elements,
		domReference: u
	}), [p.elements, u]), v = e.useMemo(() => ({
		...p,
		...i,
		refs: g,
		elements: _,
		nodeId: n
	}), [
		p,
		g,
		_,
		n,
		i
	]);
	return ql(() => {
		i.dataRef.current.floatingContext = v;
		let e = f?.nodesRef.current.find((e) => e.id === n);
		e && (e.context = v);
	}), e.useMemo(() => ({
		...p,
		context: v,
		refs: g,
		elements: _
	}), [
		p,
		g,
		_,
		v
	]);
}
var lu = "active", uu = "selected";
function du(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = n === "item", a = e;
	if (i && e) {
		let { [lu]: t, [uu]: n, ...r } = e;
		a = r;
	}
	return {
		...n === "floating" && {
			tabIndex: -1,
			[ou]: ""
		},
		...a,
		...t.map((t) => {
			let r = t ? t[n] : null;
			return typeof r == "function" ? e ? r(e) : null : r;
		}).concat(e).reduce((e, t) => (t && Object.entries(t).forEach((t) => {
			let [n, a] = t;
			if (!(i && [lu, uu].includes(n))) if (n.indexOf("on") === 0) {
				if (r.has(n) || r.set(n, []), typeof a == "function") {
					var o;
					(o = r.get(n)) == null || o.push(a), e[n] = function() {
						var e = [...arguments];
						return r.get(n)?.map((t) => t(...e)).find((e) => e !== void 0);
					};
				}
			} else e[n] = a;
		}), e), {})
	};
}
function fu(t) {
	t === void 0 && (t = []);
	let n = t.map((e) => e?.reference), r = t.map((e) => e?.floating), i = t.map((e) => e?.item), a = e.useCallback((e) => du(e, t, "reference"), n), o = e.useCallback((e) => du(e, t, "floating"), r), s = e.useCallback((e) => du(e, t, "item"), i);
	return e.useMemo(() => ({
		getReferenceProps: a,
		getFloatingProps: o,
		getItemProps: s
	}), [
		a,
		o,
		s
	]);
}
function pu(e, t) {
	return {
		...e,
		rects: {
			...e.rects,
			floating: {
				...e.rects.floating,
				height: t
			}
		}
	};
}
var mu = (e) => ({
	name: "inner",
	options: e,
	async fn(t) {
		let { listRef: n, overflowRef: r, onFallbackChange: i, offset: a = 0, index: o = 0, minItemsVisible: s = 4, referenceOverflowThreshold: c = 0, scrollRef: l, ...u } = vc(e, t), { rects: d, elements: { floating: f } } = t, p = n.current[o], m = l?.current || f, h = f.clientTop || m.clientTop, g = f.clientTop !== 0, _ = m.clientTop !== 0, v = f === m;
		if (!p) return {};
		let y = {
			...t,
			...await Il(-p.offsetTop - f.clientTop - d.reference.height / 2 - p.offsetHeight / 2 - a).fn(t)
		}, b = await wl(pu(y, m.scrollHeight + h + f.clientTop), u), x = await wl(y, {
			...u,
			elementContext: "reference"
		}), S = fc(0, b.top), C = y.y + S, T = (m.scrollHeight > m.clientHeight ? (e) => e : pc)(fc(0, m.scrollHeight + (g && v || _ ? h * 2 : 0) - S - fc(0, b.bottom)));
		if (m.style.maxHeight = T + "px", m.scrollTop = S, i) {
			let e = m.offsetHeight < p.offsetHeight * dc(s, n.current.length) - 1 || x.top >= -c || x.bottom >= -c;
			w.flushSync(() => i(e));
		}
		return r && (r.current = await wl(pu({
			...y,
			y: C
		}, m.offsetHeight + h + f.clientTop), u)), { y: C };
	}
});
function hu(t, n) {
	let { open: r, elements: i } = t, { enabled: a = !0, overflowRef: o, scrollRef: s, onChange: c } = n, l = Hl(c), u = e.useRef(!1), d = e.useRef(null), f = e.useRef(null);
	e.useEffect(() => {
		if (!a) return;
		function e(e) {
			if (e.ctrlKey || !t || o.current == null) return;
			let n = e.deltaY, r = o.current.top >= -.5, i = o.current.bottom >= -.5, a = t.scrollHeight - t.clientHeight, s = n < 0 ? -1 : 1, c = n < 0 ? "max" : "min";
			t.scrollHeight <= t.clientHeight || (!r && n > 0 || !i && n < 0 ? (e.preventDefault(), w.flushSync(() => {
				l((e) => e + Math[c](n, a * s));
			})) : /firefox/i.test(uc()) && (t.scrollTop += n));
		}
		let t = s?.current || i.floating;
		if (r && t) return t.addEventListener("wheel", e), requestAnimationFrame(() => {
			d.current = t.scrollTop, o.current != null && (f.current = { ...o.current });
		}), () => {
			d.current = null, f.current = null, t.removeEventListener("wheel", e);
		};
	}, [
		a,
		r,
		i.floating,
		o,
		s,
		l
	]);
	let p = e.useMemo(() => ({
		onKeyDown() {
			u.current = !0;
		},
		onWheel() {
			u.current = !1;
		},
		onPointerMove() {
			u.current = !1;
		},
		onScroll() {
			let e = s?.current || i.floating;
			if (!(!o.current || !e || !u.current)) {
				if (d.current !== null) {
					let t = e.scrollTop - d.current;
					(o.current.bottom < -.5 && t < -1 || o.current.top < -.5 && t > 1) && w.flushSync(() => l((e) => e + t));
				}
				requestAnimationFrame(() => {
					d.current = e.scrollTop;
				});
			}
		}
	}), [
		i.floating,
		l,
		o,
		s
	]);
	return e.useMemo(() => a ? { floating: p } : {}, [a, p]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/floating.js
var gu = i({
	styles: void 0,
	setReference: () => {},
	setFloating: () => {},
	getReferenceProps: () => ({}),
	getFloatingProps: () => ({}),
	slot: {}
});
gu.displayName = "FloatingContext";
var _u = i(null);
_u.displayName = "PlacementContext";
function vu(e) {
	return g(() => e ? typeof e == "string" ? { to: e } : e : null, [e]);
}
function yu() {
	return u(gu).setReference;
}
function bu() {
	return u(gu).getReferenceProps;
}
function xu() {
	let { getFloatingProps: e, slot: t } = u(gu);
	return l((...n) => Object.assign({}, e(...n), { "data-anchor": t.anchor }), [e, t]);
}
function Su(e = null) {
	e === !1 && (e = null), typeof e == "string" && (e = { to: e });
	let t = u(_u), n = g(() => e, [JSON.stringify(e, (e, t) => t?.outerHTML ?? t)]);
	W(() => {
		t?.(n ?? null);
	}, [t, n]);
	let r = u(gu);
	return g(() => [r.setFloating, e ? r.styles : {}], [
		r.setFloating,
		e,
		r.styles
	]);
}
var Cu = 4;
function wu({ children: t, enabled: n = !0 }) {
	let [r, i] = y(null), [a, o] = y(0), s = v(null), [c, l] = y(null);
	Tu(c);
	let u = n && r !== null && c !== null, { to: d = "bottom", gap: f = 0, offset: p = 0, padding: m = 0, inner: h } = Eu(r, c), [_, b = "center"] = d.split(" ");
	W(() => {
		u && o(0);
	}, [u]);
	let { refs: x, floatingStyles: S, context: C } = cu({
		open: u,
		placement: _ === "selection" ? b === "center" ? "bottom" : `bottom-${b}` : b === "center" ? `${_}` : `${_}-${b}`,
		strategy: "absolute",
		transform: !1,
		middleware: [
			Il({
				mainAxis: _ === "selection" ? 0 : f,
				crossAxis: p
			}),
			Ll({ padding: m }),
			_ !== "selection" && Rl({ padding: m }),
			_ === "selection" && h ? mu({
				...h,
				padding: m,
				overflowRef: s,
				offset: a,
				minItemsVisible: Cu,
				referenceOverflowThreshold: m,
				onFallbackChange(e) {
					if (!e) return;
					let t = C.elements.floating;
					if (!t) return;
					let n = parseFloat(getComputedStyle(t).scrollPaddingBottom) || 0, r = Math.min(Cu, t.childElementCount), i = 0, a = 0;
					for (let e of C.elements.floating?.childNodes ?? []) if (Ca(e)) {
						let o = e.offsetTop, s = o + e.clientHeight + n, c = t.scrollTop, l = c + t.clientHeight;
						if (o >= c && s <= l) r--;
						else {
							a = Math.max(0, Math.min(s, l) - Math.max(o, c)), i = e.clientHeight;
							break;
						}
					}
					r >= 1 && o((e) => {
						let t = i * r - a + n;
						return e >= t ? e : t;
					});
				}
			}) : null,
			zl({
				padding: m,
				apply({ availableWidth: e, availableHeight: t, elements: n }) {
					Object.assign(n.floating.style, {
						overflow: "auto",
						maxWidth: `${e}px`,
						maxHeight: `min(var(--anchor-max-height, 100vh), ${t}px)`
					});
				}
			})
		].filter(Boolean),
		whileElementsMounted: Cl
	}), [w = _, T = b] = C.placement.split("-");
	_ === "selection" && (w = "selection");
	let E = g(() => ({ anchor: [w, T].filter(Boolean).join(" ") }), [w, T]), { getReferenceProps: D, getFloatingProps: O } = fu([hu(C, {
		overflowRef: s,
		onChange: o
	})]), k = G((e) => {
		l(e), x.setFloating(e);
	});
	return e.createElement(_u.Provider, { value: i }, e.createElement(gu.Provider, { value: {
		setFloating: k,
		setReference: x.setReference,
		styles: S,
		getReferenceProps: D,
		getFloatingProps: O,
		slot: E
	} }, t));
}
function Tu(e) {
	W(() => {
		if (!e) return;
		let t = new MutationObserver(() => {
			let t = window.getComputedStyle(e).maxHeight, n = parseFloat(t);
			if (isNaN(n)) return;
			let r = parseInt(t);
			isNaN(r) || n !== r && (e.style.maxHeight = `${Math.ceil(n)}px`);
		});
		return t.observe(e, {
			attributes: !0,
			attributeFilter: ["style"]
		}), () => {
			t.disconnect();
		};
	}, [e]);
}
function Eu(e, t) {
	let n = Du(e?.gap ?? "var(--anchor-gap, 0)", t), r = Du(e?.offset ?? "var(--anchor-offset, 0)", t), i = Du(e?.padding ?? "var(--anchor-padding, 0)", t);
	return {
		...e,
		gap: n,
		offset: r,
		padding: i
	};
}
function Du(e, t, n = void 0) {
	let r = Pi(), i = G((e, t) => {
		if (e == null) return [n, null];
		if (typeof e == "number") return [e, null];
		if (typeof e == "string") {
			if (!t) return [n, null];
			let i = ku(e, t);
			return [i, (n) => {
				let a = Ou(e);
				{
					let o = a.map((e) => window.getComputedStyle(t).getPropertyValue(e));
					r.requestAnimationFrame(function s() {
						r.nextFrame(s);
						let c = !1;
						for (let [e, n] of a.entries()) {
							let r = window.getComputedStyle(t).getPropertyValue(n);
							if (o[e] !== r) {
								o[e] = r, c = !0;
								break;
							}
						}
						if (!c) return;
						let l = ku(e, t);
						i !== l && (n(l), i = l);
					});
				}
				return r.dispose;
			}];
		}
		return [n, null];
	}), a = g(() => i(e, t)[0], [e, t]), [o = a, s] = y();
	return W(() => {
		let [n, r] = i(e, t);
		if (s(n), r) return r(s);
	}, [e, t]), o;
}
function Ou(e) {
	let t = /var\((.*)\)/.exec(e);
	if (t) {
		let e = t[1].indexOf(",");
		if (e === -1) return [t[1]];
		let n = t[1].slice(0, e).trim(), r = t[1].slice(e + 1).trim();
		return r ? [n, ...Ou(r)] : [n];
	}
	return [];
}
function ku(e, t) {
	let n = document.createElement("div");
	t.appendChild(n), n.style.setProperty("margin-top", "0px", "important"), n.style.setProperty("margin-top", e, "important");
	let r = parseFloat(window.getComputedStyle(n).marginTop) || 0;
	return t.removeChild(n), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/frozen.js
function Au({ children: e, freeze: n }, i) {
	let a = ju(n, e);
	return c(a) ? r(a, { ref: i }) : t.createElement(t.Fragment, null, a);
}
t.forwardRef(Au);
function ju(e, t) {
	let [n, r] = y(t);
	return !e && n !== t && r(t), e ? n : t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/open-closed.js
var Mu = i(null);
Mu.displayName = "OpenClosedContext";
var Nu = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(Nu || {});
function Pu() {
	return u(Mu);
}
function Fu({ value: e, children: n }) {
	return t.createElement(Mu.Provider, { value: e }, n);
}
function Iu({ children: e }) {
	return t.createElement(Mu.Provider, { value: null }, e);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/document-ready.js
function Lu(e) {
	function t() {
		document.readyState !== "loading" && (e(), document.removeEventListener("DOMContentLoaded", t));
	}
	typeof window < "u" && typeof document < "u" && (document.addEventListener("DOMContentLoaded", t), t());
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/active-element-history.js
var Ru = [];
Lu(() => {
	function e(e) {
		if (!wa(e.target) || e.target === document.body || Ru[0] === e.target) return;
		let t = e.target;
		t = t.closest(Bo), Ru.unshift(t ?? e.target), Ru = Ru.filter((e) => e != null && e.isConnected), Ru.splice(10);
	}
	window.addEventListener("click", e, { capture: !0 }), window.addEventListener("mousedown", e, { capture: !0 }), window.addEventListener("focus", e, { capture: !0 }), document.body.addEventListener("click", e, { capture: !0 }), document.body.addEventListener("mousedown", e, { capture: !0 }), document.body.addEventListener("focus", e, { capture: !0 });
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/calculate-active-index.js
function zu(e) {
	throw Error("Unexpected object: " + e);
}
var Q = ((e) => (e[e.First = 0] = "First", e[e.Previous = 1] = "Previous", e[e.Next = 2] = "Next", e[e.Last = 3] = "Last", e[e.Specific = 4] = "Specific", e[e.Nothing = 5] = "Nothing", e))(Q || {});
function Bu(e, t) {
	let n = t.resolveItems();
	if (n.length <= 0) return null;
	let r = t.resolveActiveIndex(), i = r ?? -1;
	switch (e.focus) {
		case 0:
			for (let e = 0; e < n.length; ++e) if (!t.resolveDisabled(n[e], e, n)) return e;
			return r;
		case 1:
			i === -1 && (i = n.length);
			for (let e = i - 1; e >= 0; --e) if (!t.resolveDisabled(n[e], e, n)) return e;
			return r;
		case 2:
			for (let e = i + 1; e < n.length; ++e) if (!t.resolveDisabled(n[e], e, n)) return e;
			return r;
		case 3:
			for (let e = n.length - 1; e >= 0; --e) if (!t.resolveDisabled(n[e], e, n)) return e;
			return r;
		case 4:
			for (let r = 0; r < n.length; ++r) if (t.resolveId(n[r], r, n) === e.id) return r;
			return r;
		case 5: return null;
		default: zu(e);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
function Vu(e) {
	let t = G(e), n = v(!1);
	f(() => (n.current = !1, () => {
		n.current = !0, Mi(() => {
			n.current && t();
		});
	}), [t]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
function Hu() {
	let t = typeof document > "u";
	return "useSyncExternalStore" in e && ((e) => e.useSyncExternalStore)(e)(() => () => {}, () => !1, () => !t);
}
function Uu() {
	let t = Hu(), [n, r] = e.useState(Di.isHandoffComplete);
	return n && Di.isHandoffComplete === !1 && r(!1), e.useEffect(() => {
		n !== !0 && r(!0);
	}, [n]), e.useEffect(() => Di.handoff(), []), !t && n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/portal-force-root.js
var Wu = i(!1);
function Gu() {
	return u(Wu);
}
function Ku(e) {
	return t.createElement(Wu.Provider, { value: e.force }, e.children);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/portal/portal.js
function qu(e) {
	let t = Gu(), n = u(Qu), [r, i] = y(() => {
		if (!t && n !== null) return n.current ?? null;
		if (Di.isServer) return null;
		let r = e?.getElementById("headlessui-portal-root");
		if (r) return r;
		if (e === null) return null;
		let i = e.createElement("div");
		return i.setAttribute("id", "headlessui-portal-root"), e.body.appendChild(i);
	});
	return f(() => {
		r !== null && (e != null && e.body.contains(r) || e == null || e.body.appendChild(r));
	}, [r, e]), f(() => {
		t || n !== null && i(n.current);
	}, [
		n,
		i,
		t
	]), r;
}
var Ju = n, Yu = q(function(e, n) {
	let { ownerDocument: r = null, ...i } = e, a = v(null), o = J(Fa((e) => {
		a.current = e;
	}), n), s = ls(a.current), c = qu(r ?? s), l = u(ed), d = Pi(), f = Uu(), p = K();
	return Vu(() => {
		var e;
		c && c.childNodes.length <= 0 && ((e = c.parentElement) == null || e.removeChild(c));
	}), !c || !f ? null : T(t.createElement("div", {
		"data-headlessui-portal": "",
		ref: (e) => {
			d.dispose(), l && e && d.add(l.register(e));
		}
	}, p({
		ourProps: { ref: o },
		theirProps: i,
		slot: {},
		defaultTag: Ju,
		name: "Portal"
	})), c);
});
function Xu(e, n) {
	let r = J(n), { enabled: i = !0, ownerDocument: a, ...o } = e, s = K();
	return i ? t.createElement(Yu, {
		...o,
		ownerDocument: a,
		ref: r
	}) : s({
		ourProps: { ref: r },
		theirProps: o,
		slot: {},
		defaultTag: Ju,
		name: "Portal"
	});
}
var Zu = n, Qu = i(null);
function $u(e, n) {
	let { target: r, ...i } = e, a = { ref: J(n) }, o = K();
	return t.createElement(Qu.Provider, { value: r }, o({
		ourProps: a,
		theirProps: i,
		defaultTag: Zu,
		name: "Popover.Group"
	}));
}
var ed = i(null);
function td() {
	let e = u(ed), n = v([]), r = G((t) => (n.current.push(t), e && e.register(t), () => i(t))), i = G((t) => {
		let r = n.current.indexOf(t);
		r !== -1 && n.current.splice(r, 1), e && e.unregister(t);
	}), a = g(() => ({
		register: r,
		unregister: i,
		portals: n
	}), [
		r,
		i,
		n
	]);
	return [n, g(() => function({ children: e }) {
		return t.createElement(ed.Provider, { value: a }, e);
	}, [a])];
}
var nd = q(Xu), rd = q($u), id = Object.assign(nd, { Group: rd }), ad = {
	Idle: { kind: "Idle" },
	Tracked: (e) => ({
		kind: "Tracked",
		position: e
	}),
	Moved: { kind: "Moved" }
};
function od(e) {
	let t = e.getBoundingClientRect();
	return `${t.x},${t.y}`;
}
function sd(e, t, n) {
	let r = Ni();
	if (t.kind === "Tracked") {
		let i = function() {
			a !== od(e) && (r.dispose(), n());
		}, { position: a } = t, o = new ResizeObserver(i);
		o.observe(e), r.add(() => o.disconnect()), r.addEventListener(window, "scroll", i, { passive: !0 }), r.addEventListener(window, "resize", i);
	}
	return () => r.dispose();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-escape.js
function cd(e, t = typeof document < "u" ? document.defaultView : null, n) {
	let r = No(e, "escape");
	gs(t, "keydown", (e) => {
		r && (e.defaultPrevented || e.key === Y.Escape && n(e));
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-touch-device.js
function ld() {
	let [e] = y(() => typeof window < "u" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [t, n] = y(e?.matches ?? !1);
	return W(() => {
		if (!e) return;
		function t(e) {
			n(e.matches);
		}
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-root-containers.js
function ud({ defaultContainers: e = [], portals: t, mainTreeNode: n } = {}) {
	let r = G(() => {
		let r = Oi(n), i = [];
		for (let t of e) t !== null && (Sa(t) ? i.push(t) : "current" in t && Sa(t.current) && i.push(t.current));
		if (t != null && t.current) for (let e of t.current) i.push(e);
		for (let e of r?.querySelectorAll("html > *, body > *") ?? []) e !== document.body && e !== document.head && Sa(e) && e.id !== "headlessui-portal-root" && (n && (e.contains(n) || e.contains(n?.getRootNode()?.host)) || i.some((t) => e.contains(t)) || i.push(e));
		return i;
	});
	return {
		resolveContainers: r,
		contains: G((e) => r().some((t) => t.contains(e)))
	};
}
var dd = i(null);
function fd({ children: e, node: n }) {
	let [r, i] = y(null), a = pd(n ?? r);
	return t.createElement(dd.Provider, { value: a }, e, a === null && t.createElement(ma, {
		features: fa.Hidden,
		ref: (e) => {
			if (e) {
				for (let t of Oi(e)?.querySelectorAll("html > *, body > *") ?? []) if (t !== document.body && t !== document.head && Sa(t) && t != null && t.contains(e)) {
					i(t);
					break;
				}
			}
		}
	}));
}
function pd(e = null) {
	return u(dd) ?? e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-mounted.js
function md() {
	let e = v(!1);
	return W(() => (e.current = !0, () => {
		e.current = !1;
	}), []), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tab-direction.js
var hd = ((e) => (e[e.Forwards = 0] = "Forwards", e[e.Backwards = 1] = "Backwards", e))(hd || {});
function gd() {
	let e = v(0);
	return os(!0, "keydown", (t) => {
		t.key === "Tab" && (e.current = +!!t.shiftKey);
	}, !0), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/focus-trap/focus-trap.js
function _d(e) {
	if (!e) return /* @__PURE__ */ new Set();
	if (typeof e == "function") return new Set(e());
	let t = /* @__PURE__ */ new Set();
	for (let n of e.current) Sa(n.current) && t.add(n.current);
	return t;
}
var vd = "div", yd = ((e) => (e[e.None = 0] = "None", e[e.InitialFocus = 1] = "InitialFocus", e[e.TabLock = 2] = "TabLock", e[e.FocusLock = 4] = "FocusLock", e[e.RestoreFocus = 8] = "RestoreFocus", e[e.AutoFocus = 16] = "AutoFocus", e))(yd || {});
function bd(e, n) {
	let r = v(null), i = J(r, n), { initialFocus: a, initialFocusFallback: o, containers: s, features: c = 15, ...l } = e;
	Uu() || (c = 0);
	let u = ls(r.current);
	wd(c, { ownerDocument: u });
	let d = Td(c, {
		ownerDocument: u,
		container: r,
		initialFocus: a,
		initialFocusFallback: o
	});
	Ed(c, {
		ownerDocument: u,
		container: r,
		containers: s,
		previousActiveElement: d
	});
	let f = gd(), p = G((e) => {
		if (!Ca(r.current)) return;
		let t = r.current;
		((e) => e())(() => {
			Ui(f.current, {
				[hd.Forwards]: () => {
					ts(t, Z.First, { skipElements: [e.relatedTarget, o] });
				},
				[hd.Backwards]: () => {
					ts(t, Z.Last, { skipElements: [e.relatedTarget, o] });
				}
			});
		});
	}), m = No(!!(c & 2), "focus-trap#tab-lock"), h = Pi(), g = v(!1), _ = {
		ref: i,
		onKeyDown(e) {
			e.key == "Tab" && (g.current = !0, h.requestAnimationFrame(() => {
				g.current = !1;
			}));
		},
		onBlur(e) {
			if (!(c & 4)) return;
			let t = _d(s);
			Ca(r.current) && t.add(r.current);
			let n = e.relatedTarget;
			wa(n) && n.dataset.headlessuiFocusGuard !== "true" && (Dd(t, n) || (g.current ? ts(r.current, Ui(f.current, {
				[hd.Forwards]: () => Z.Next,
				[hd.Backwards]: () => Z.Previous
			}) | Z.WrapAround, { relativeTo: e.target }) : wa(e.target) && Xo(e.target)));
		}
	}, y = K();
	return t.createElement(t.Fragment, null, m && t.createElement(ma, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: fa.Focusable
	}), y({
		ourProps: _,
		theirProps: l,
		defaultTag: vd,
		name: "FocusTrap"
	}), m && t.createElement(ma, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: fa.Focusable
	}));
}
var xd = q(bd), Sd = Object.assign(xd, { features: yd });
function Cd(e = !0) {
	let t = v(Ru.slice());
	return Rs(([e], [n]) => {
		n === !0 && e === !1 && Mi(() => {
			t.current.splice(0);
		}), n === !1 && e === !0 && (t.current = Ru.slice());
	}, [
		e,
		Ru,
		t
	]), G(() => t.current.find((e) => e != null && e.isConnected) ?? null);
}
function wd(e, { ownerDocument: t }) {
	let n = !!(e & 8), r = Cd(n);
	Rs(() => {
		n || ji(t?.body) && Xo(r());
	}, [n]), Vu(() => {
		n && Xo(r());
	});
}
function Td(e, { ownerDocument: t, container: n, initialFocus: r, initialFocusFallback: i }) {
	let a = v(null), o = No(!!(e & 1), "focus-trap#initial-focus"), s = md();
	return Rs(() => {
		if (e === 0) return;
		if (!o) {
			i != null && i.current && Xo(i.current);
			return;
		}
		let c = n.current;
		c && Mi(() => {
			if (!s.current) return;
			let n = t?.activeElement;
			if (r != null && r.current) {
				if (r?.current === n) {
					a.current = n;
					return;
				}
			} else if (c.contains(n)) {
				a.current = n;
				return;
			}
			if (r != null && r.current) Xo(r.current);
			else {
				if (e & 16) {
					if (ts(c, Z.First | Z.AutoFocus) !== Ho.Error) return;
				} else if (ts(c, Z.First) !== Ho.Error) return;
				if (i != null && i.current && (Xo(i.current), t?.activeElement === i.current)) return;
				console.warn("There are no focusable elements inside the <FocusTrap />");
			}
			a.current = t?.activeElement;
		});
	}, [
		i,
		o,
		e
	]), a;
}
function Ed(e, { ownerDocument: t, container: n, containers: r, previousActiveElement: i }) {
	let a = md(), o = !!(e & 4);
	gs(t?.defaultView, "focus", (e) => {
		if (!o || !a.current) return;
		let t = _d(r);
		Ca(n.current) && t.add(n.current);
		let s = i.current;
		if (!s) return;
		let c = e.target;
		Ca(c) ? Dd(t, c) ? (i.current = c, Xo(c)) : (e.preventDefault(), e.stopPropagation(), Xo(s)) : Xo(i.current);
	}, !0);
}
function Dd(e, t) {
	for (let n of e) if (n.contains(t)) return !0;
	return !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/transition/transition.js
function Od(e) {
	return !!(e.enter || e.enterFrom || e.enterTo || e.leave || e.leaveFrom || e.leaveTo) || !na(e.as ?? Id) || t.Children.count(e.children) === 1;
}
var kd = i(null);
kd.displayName = "TransitionContext";
var Ad = ((e) => (e.Visible = "visible", e.Hidden = "hidden", e))(Ad || {});
function jd() {
	let e = u(kd);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
function Md() {
	let e = u(Nd);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
var Nd = i(null);
Nd.displayName = "NestingContext";
function Pd(e) {
	return "children" in e ? Pd(e.children) : e.current.filter(({ el: e }) => e.current !== null).filter(({ state: e }) => e === "visible").length > 0;
}
function Fd(e, t) {
	let n = Fi(e), r = v([]), i = md(), a = Pi(), o = G((e, t = Gi.Hidden) => {
		let o = r.current.findIndex(({ el: t }) => t === e);
		o !== -1 && (Ui(t, {
			[Gi.Unmount]() {
				r.current.splice(o, 1);
			},
			[Gi.Hidden]() {
				r.current[o].state = "hidden";
			}
		}), a.microTask(() => {
			var e;
			!Pd(r) && i.current && ((e = n.current) == null || e.call(n));
		}));
	}), s = G((e) => {
		let t = r.current.find(({ el: t }) => t === e);
		return t ? t.state !== "visible" && (t.state = "visible") : r.current.push({
			el: e,
			state: "visible"
		}), () => o(e, Gi.Unmount);
	}), c = v([]), l = v(Promise.resolve()), u = v({
		enter: [],
		leave: []
	}), d = G((e, n, r) => {
		c.current.splice(0), t && (t.chains.current[n] = t.chains.current[n].filter(([t]) => t !== e)), t?.chains.current[n].push([e, new Promise((e) => {
			c.current.push(e);
		})]), t?.chains.current[n].push([e, new Promise((e) => {
			Promise.all(u.current[n].map(([e, t]) => t)).then(() => e());
		})]), n === "enter" ? l.current = l.current.then(() => t?.wait.current).then(() => r(n)) : r(n);
	}), f = G((e, t, n) => {
		Promise.all(u.current[t].splice(0).map(([e, t]) => t)).then(() => {
			var e;
			(e = c.current.shift()) == null || e();
		}).then(() => n(t));
	});
	return g(() => ({
		children: r,
		register: s,
		unregister: o,
		onStart: d,
		onStop: f,
		wait: l,
		chains: u
	}), [
		s,
		o,
		r,
		d,
		f,
		u,
		l
	]);
}
var Id = n, Ld = Wi.RenderStrategy;
function Rd(e, n) {
	var r;
	let { transition: i = !0, beforeEnter: a, afterEnter: o, beforeLeave: s, afterLeave: c, enter: l, enterFrom: u, enterTo: d, entered: p, leave: m, leaveFrom: h, leaveTo: g, ..._ } = e, [b, x] = y(null), S = v(null), C = Od(e), w = J(...C ? [
		S,
		n,
		x
	] : n === null ? [] : [n]), T = (r = _.unmount) == null || r ? Gi.Unmount : Gi.Hidden, { show: E, appear: D, initial: O } = jd(), [k, A] = y(E ? "visible" : "hidden"), j = Md(), { register: M, unregister: N } = j;
	W(() => M(S), [M, S]), W(() => {
		if (T === Gi.Hidden && S.current) {
			if (E && k !== "visible") {
				A("visible");
				return;
			}
			return Ui(k, {
				hidden: () => N(S),
				visible: () => M(S)
			});
		}
	}, [
		k,
		S,
		M,
		N,
		E,
		T
	]);
	let P = Uu();
	W(() => {
		if (C && P && k === "visible" && S.current === null) throw Error("Did you forget to passthrough the `ref` to the actual DOM node?");
	}, [
		S,
		k,
		P,
		C
	]);
	let F = O && !D, I = D && E && O, ee = v(!1), L = Fd(() => {
		ee.current || (A("hidden"), N(S));
	}, j), R = G((e) => {
		ee.current = !0;
		let t = e ? "enter" : "leave";
		L.onStart(S, t, (e) => {
			e === "enter" ? a?.() : e === "leave" && s?.();
		});
	}), z = G((e) => {
		let t = e ? "enter" : "leave";
		ee.current = !1, L.onStop(S, t, (e) => {
			e === "enter" ? o?.() : e === "leave" && c?.();
		}), t === "leave" && !Pd(L) && (A("hidden"), N(S));
	});
	f(() => {
		C && i || (R(E), z(E));
	}, [
		E,
		C,
		i
	]);
	let [, B] = Ms(!(!i || !C || !P || F), b, E, {
		start: R,
		end: z
	}), te = Qi({
		ref: w,
		className: Hi(_.className, I && l, I && u, B.enter && l, B.enter && B.closed && u, B.enter && !B.closed && d, B.leave && m, B.leave && !B.closed && h, B.leave && B.closed && g, !B.transition && E && p)?.trim() || void 0,
		...js(B)
	}), V = 0;
	k === "visible" && (V |= Nu.Open), k === "hidden" && (V |= Nu.Closed), E && k === "hidden" && (V |= Nu.Opening), !E && k === "visible" && (V |= Nu.Closing);
	let ne = K();
	return t.createElement(Nd.Provider, { value: L }, t.createElement(Fu, { value: V }, ne({
		ourProps: te,
		theirProps: _,
		defaultTag: Id,
		features: Ld,
		visible: k === "visible",
		name: "Transition.Child"
	})));
}
function zd(e, r) {
	let { show: i, appear: a = !1, unmount: o = !0, ...s } = e, c = v(null), l = J(...Od(e) ? [c, r] : r === null ? [] : [r]);
	Uu();
	let u = Pu();
	if (i === void 0 && u !== null && (i = (u & Nu.Open) === Nu.Open), i === void 0) throw Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
	let [d, f] = y(i ? "visible" : "hidden"), p = Fd(() => {
		i || f("hidden");
	}), [m, h] = y(!0), _ = v([i]);
	W(() => {
		m !== !1 && _.current[_.current.length - 1] !== i && (_.current.push(i), h(!1));
	}, [_, i]);
	let b = g(() => ({
		show: i,
		appear: a,
		initial: m
	}), [
		i,
		a,
		m
	]);
	W(() => {
		i ? f("visible") : !Pd(p) && c.current !== null && f("hidden");
	}, [i, p]);
	let x = { unmount: o }, S = G(() => {
		var t;
		m && h(!1), (t = e.beforeEnter) == null || t.call(e);
	}), C = G(() => {
		var t;
		m && h(!1), (t = e.beforeLeave) == null || t.call(e);
	}), w = K();
	return t.createElement(Nd.Provider, { value: p }, t.createElement(kd.Provider, { value: b }, w({
		ourProps: {
			...x,
			as: n,
			children: t.createElement(Hd, {
				ref: l,
				...x,
				...s,
				beforeEnter: S,
				beforeLeave: C
			})
		},
		theirProps: {},
		defaultTag: n,
		features: Ld,
		visible: d === "visible",
		name: "Transition"
	})));
}
function Bd(e, n) {
	let r = u(kd) !== null, i = Pu() !== null;
	return t.createElement(t.Fragment, null, !r && i ? t.createElement(Vd, {
		ref: n,
		...e
	}) : t.createElement(Hd, {
		ref: n,
		...e
	}));
}
var Vd = q(zd), Hd = q(Rd), Ud = q(Bd), Wd = Object.assign(Vd, {
	Child: Ud,
	Root: Vd
}), Gd = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Gd || {}), Kd = ((e) => (e[e.SetTitleId = 0] = "SetTitleId", e))(Kd || {}), qd = { 0(e, t) {
	return e.titleId === t.id ? e : {
		...e,
		titleId: t.id
	};
} }, Jd = i(null);
Jd.displayName = "DialogContext";
function Yd(e) {
	let t = u(Jd);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Dialog /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Yd), t;
	}
	return t;
}
function Xd(e, t) {
	return Ui(t.type, qd, e, t);
}
var Zd = q(function(e, n) {
	let r = m(), { id: i = `headlessui-dialog-${r}`, open: a, onClose: s, initialFocus: c, role: u = "dialog", autoFocus: d = !0, __demoMode: f = !1, unmount: p = !1, ...h } = e, y = v(!1);
	u = function() {
		return u === "dialog" || u === "alertdialog" ? u : (y.current || (y.current = !0, console.warn(`Invalid role [${u}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
	}();
	let b = Pu();
	a === void 0 && b !== null && (a = (b & Nu.Open) === Nu.Open);
	let x = v(null), S = J(x, n), C = ls(x.current), w = +!a, [T, E] = _(Xd, {
		titleId: null,
		descriptionId: null,
		panelRef: o()
	}), D = G(() => s(!1)), O = G((e) => E({
		type: 0,
		id: e
	})), k = Uu() ? w === 0 : !1, [A, j] = td(), M = { get current() {
		return T.panelRef.current ?? x.current;
	} }, N = pd(), { resolveContainers: P } = ud({
		mainTreeNode: N,
		portals: A,
		defaultContainers: [M]
	}), F = b !== null && (b & Nu.Closing) === Nu.Closing;
	Ro(f || F ? !1 : k, {
		allowed: G(() => [x.current?.closest("[data-headlessui-portal]") ?? null]),
		disallowed: G(() => [N?.closest("body > *:not(#headlessui-portal-root)") ?? null])
	});
	let I = ko.get(null);
	W(() => {
		if (k) return I.actions.push(i), () => I.actions.pop(i);
	}, [
		I,
		i,
		k
	]);
	let ee = X(I, l((e) => I.selectors.isTop(e, i), [I, i]));
	cs(ee, P, (e) => {
		e.preventDefault(), D();
	}), cd(ee, C?.defaultView, (e) => {
		e.preventDefault(), e.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), D();
	}), Es(f || F ? !1 : k, C, P), zo(k, x, D);
	let [L, R] = za(), z = g(() => [{
		dialogState: w,
		close: D,
		setTitleId: O,
		unmount: p
	}, T], [
		w,
		D,
		O,
		p,
		T
	]), B = zi({ open: w === 0 }), te = {
		ref: S,
		id: i,
		role: u,
		tabIndex: -1,
		"aria-modal": f ? void 0 : w === 0 || void 0,
		"aria-labelledby": T.titleId,
		"aria-describedby": L,
		unmount: p
	}, V = !ld(), ne = yd.None;
	k && !f && (ne |= yd.RestoreFocus, ne |= yd.TabLock, d && (ne |= yd.AutoFocus), V && (ne |= yd.InitialFocus));
	let re = K();
	return t.createElement(Iu, null, t.createElement(Ku, { force: !0 }, t.createElement(id, null, t.createElement(Jd.Provider, { value: z }, t.createElement(rd, { target: x }, t.createElement(Ku, { force: !1 }, t.createElement(R, { slot: B }, t.createElement(j, null, t.createElement(Sd, {
		initialFocus: c,
		initialFocusFallback: x,
		containers: P,
		features: ne
	}, t.createElement($a, { value: D }, re({
		ourProps: te,
		theirProps: h,
		slot: B,
		defaultTag: Qd,
		features: $d,
		visible: w === 0,
		name: "Dialog"
	})))))))))));
}), Qd = "div", $d = Wi.RenderStrategy | Wi.Static;
function ef(e, n) {
	let { transition: r = !1, open: i, ...a } = e, o = Pu(), s = e.hasOwnProperty("open") || o !== null, c = e.hasOwnProperty("onClose");
	if (!s && !c) throw Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
	if (!s) throw Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
	if (!c) throw Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
	if (!o && typeof e.open != "boolean") throw Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e.open}`);
	if (typeof e.onClose != "function") throw Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e.onClose}`);
	return (i !== void 0 || r) && !a.static ? t.createElement(fd, null, t.createElement(Wd, {
		show: i,
		transition: r,
		unmount: a.unmount
	}, t.createElement(Zd, {
		ref: n,
		...a
	}))) : t.createElement(fd, null, t.createElement(Zd, {
		ref: n,
		open: i,
		...a
	}));
}
var tf = "div";
function nf(e, r) {
	let i = m(), { id: a = `headlessui-dialog-panel-${i}`, transition: o = !1, ...s } = e, [{ dialogState: c, unmount: l }, u] = Yd("Dialog.Panel"), d = J(r, u.panelRef), f = zi({ open: c === 0 }), p = {
		ref: d,
		id: a,
		onClick: G((e) => {
			e.stopPropagation();
		})
	}, h = o ? Ud : n, g = o ? { unmount: l } : {}, _ = K();
	return t.createElement(h, { ...g }, _({
		ourProps: p,
		theirProps: s,
		slot: f,
		defaultTag: tf,
		name: "Dialog.Panel"
	}));
}
var rf = "div";
function af(e, r) {
	let { transition: i = !1, ...a } = e, [{ dialogState: o, unmount: s }] = Yd("Dialog.Backdrop"), c = zi({ open: o === 0 }), l = {
		ref: r,
		"aria-hidden": !0
	}, u = i ? Ud : n, d = i ? { unmount: s } : {}, f = K();
	return t.createElement(u, { ...d }, f({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: rf,
		name: "Dialog.Backdrop"
	}));
}
var of = "h2";
function sf(e, t) {
	let n = m(), { id: r = `headlessui-dialog-title-${n}`, ...i } = e, [{ dialogState: a, setTitleId: o }] = Yd("Dialog.Title"), s = J(t);
	f(() => (o(r), () => o(null)), [r, o]);
	let c = zi({ open: a === 0 }), l = {
		ref: s,
		id: r
	};
	return K()({
		ourProps: l,
		theirProps: i,
		slot: c,
		defaultTag: of,
		name: "Dialog.Title"
	});
}
var cf = q(ef), lf = q(nf), uf = q(af), df = q(sf), ff = Object.assign(cf, {
	Panel: lf,
	Title: df,
	Description: Ua
}), pf = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function mf(e) {
	let t = e.innerText ?? "", n = e.cloneNode(!0);
	if (!Ca(n)) return t;
	let r = !1;
	for (let e of n.querySelectorAll("[hidden],[aria-hidden],[role=\"img\"]")) e.remove(), r = !0;
	let i = r ? n.innerText ?? "" : t;
	return pf.test(i) && (i = i.replace(pf, "")), i;
}
function hf(e) {
	let t = e.getAttribute("aria-label");
	if (typeof t == "string") return t.trim();
	let n = e.getAttribute("aria-labelledby");
	if (n) {
		let e = n.split(" ").map((e) => {
			let t = document.getElementById(e);
			if (t) {
				let e = t.getAttribute("aria-label");
				return typeof e == "string" ? e.trim() : mf(t).trim();
			}
			return null;
		}).filter(Boolean);
		if (e.length > 0) return e.join(", ");
	}
	return mf(e).trim();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-text-value.js
function gf(e) {
	let t = v(""), n = v("");
	return G(() => {
		let r = e.current;
		if (!r) return "";
		let i = r.innerText;
		if (t.current === i) return n.current;
		let a = hf(r).trim().toLowerCase();
		return t.current = i, n.current = a, a;
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox-machine.js
var _f = Object.defineProperty, vf = (e, t, n) => t in e ? _f(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, yf = (e, t, n) => (vf(e, typeof t == "symbol" ? t : t + "", n), n), bf = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(bf || {}), xf = ((e) => (e[e.Single = 0] = "Single", e[e.Multi = 1] = "Multi", e))(xf || {}), Sf = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(Sf || {}), Cf = ((e) => (e[e.OpenListbox = 0] = "OpenListbox", e[e.CloseListbox = 1] = "CloseListbox", e[e.GoToOption = 2] = "GoToOption", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.SelectOption = 5] = "SelectOption", e[e.RegisterOptions = 6] = "RegisterOptions", e[e.UnregisterOptions = 7] = "UnregisterOptions", e[e.SetButtonElement = 8] = "SetButtonElement", e[e.SetOptionsElement = 9] = "SetOptionsElement", e[e.SortOptions = 10] = "SortOptions", e[e.MarkButtonAsMoved = 11] = "MarkButtonAsMoved", e))(Cf || {});
function wf(e, t = (e) => e) {
	let n = e.activeOptionIndex === null ? null : e.options[e.activeOptionIndex], r = $o(t(e.options.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		options: r,
		activeOptionIndex: i
	};
}
var Tf = {
	1(e) {
		if (e.dataRef.current.disabled || e.listboxState === 1) return e;
		let t = e.buttonElement ? ad.Tracked(od(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeOptionIndex: null,
			pendingFocus: { focus: Q.Nothing },
			listboxState: 1,
			__demoMode: !1,
			buttonPositionState: t
		};
	},
	0(e, t) {
		if (e.dataRef.current.disabled || e.listboxState === 0) return e;
		let n = e.activeOptionIndex, { isSelected: r } = e.dataRef.current, i = e.options.findIndex((e) => r(e.dataRef.current.value));
		return i !== -1 && (n = i), {
			...e,
			frozenValue: !1,
			pendingFocus: t.focus,
			listboxState: 0,
			activeOptionIndex: n,
			__demoMode: !1,
			buttonPositionState: ad.Idle
		};
	},
	2(e, t) {
		if (e.dataRef.current.disabled || e.listboxState === 1) return e;
		let n = {
			...e,
			searchQuery: "",
			activationTrigger: t.trigger ?? 1,
			__demoMode: !1
		};
		if (t.focus === Q.Nothing) return {
			...n,
			activeOptionIndex: null
		};
		if (t.focus === Q.Specific) return {
			...n,
			activeOptionIndex: e.options.findIndex((e) => e.id === t.id)
		};
		if (t.focus === Q.Previous) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = Bu(t, {
					resolveItems: () => e.options,
					resolveActiveIndex: () => e.activeOptionIndex,
					resolveId: (e) => e.id,
					resolveDisabled: (e) => e.dataRef.current.disabled
				});
				if (a !== null) {
					let t = e.options[a].dataRef.current.domRef;
					if (i.current?.previousElementSibling === t.current || t.current?.previousElementSibling === null) return {
						...n,
						activeOptionIndex: a
					};
				}
			}
		} else if (t.focus === Q.Next) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = Bu(t, {
					resolveItems: () => e.options,
					resolveActiveIndex: () => e.activeOptionIndex,
					resolveId: (e) => e.id,
					resolveDisabled: (e) => e.dataRef.current.disabled
				});
				if (a !== null) {
					let t = e.options[a].dataRef.current.domRef;
					if (i.current?.nextElementSibling === t.current || t.current?.nextElementSibling === null) return {
						...n,
						activeOptionIndex: a
					};
				}
			}
		}
		let r = wf(e), i = Bu(t, {
			resolveItems: () => r.options,
			resolveActiveIndex: () => r.activeOptionIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		});
		return {
			...n,
			...r,
			activeOptionIndex: i
		};
	},
	3: (e, t) => {
		if (e.dataRef.current.disabled || e.listboxState === 1) return e;
		let n = +(e.searchQuery === ""), r = e.searchQuery + t.value.toLowerCase(), i = (e.activeOptionIndex === null ? e.options : e.options.slice(e.activeOptionIndex + n).concat(e.options.slice(0, e.activeOptionIndex + n))).find((e) => !e.dataRef.current.disabled && e.dataRef.current.textValue?.startsWith(r)), a = i ? e.options.indexOf(i) : -1;
		return a === -1 || a === e.activeOptionIndex ? {
			...e,
			searchQuery: r
		} : {
			...e,
			searchQuery: r,
			activeOptionIndex: a,
			activationTrigger: 1
		};
	},
	4(e) {
		return e.dataRef.current.disabled || e.listboxState === 1 || e.searchQuery === "" ? e : {
			...e,
			searchQuery: ""
		};
	},
	5(e) {
		return e.dataRef.current.mode === 0 ? {
			...e,
			frozenValue: !0
		} : { ...e };
	},
	6: (e, t) => {
		let n = e.options.concat(t.options), r = e.activeOptionIndex;
		if (e.pendingFocus.focus !== Q.Nothing && (r = Bu(e.pendingFocus, {
			resolveItems: () => n,
			resolveActiveIndex: () => e.activeOptionIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		})), e.activeOptionIndex === null) {
			let { isSelected: t } = e.dataRef.current;
			if (t) {
				let e = n.findIndex((e) => t?.(e.dataRef.current.value));
				e !== -1 && (r = e);
			}
		}
		return {
			...e,
			options: n,
			activeOptionIndex: r,
			pendingFocus: { focus: Q.Nothing },
			pendingShouldSort: !0
		};
	},
	7: (e, t) => {
		let n = e.options, r = [], i = new Set(t.options);
		for (let [e, t] of n.entries()) if (i.has(t.id) && (r.push(e), i.delete(t.id), i.size === 0)) break;
		if (r.length > 0) {
			n = n.slice();
			for (let e of r.reverse()) n.splice(e, 1);
		}
		return {
			...e,
			options: n,
			activationTrigger: 1
		};
	},
	8: (e, t) => e.buttonElement === t.element ? e : {
		...e,
		buttonElement: t.element
	},
	9: (e, t) => e.optionsElement === t.element ? e : {
		...e,
		optionsElement: t.element
	},
	10: (e) => e.pendingShouldSort ? {
		...e,
		...wf(e),
		pendingShouldSort: !1
	} : e,
	11(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: ad.Moved
		} : e;
	}
}, Ef = class e extends vo {
	constructor(e) {
		super(e), yf(this, "actions", {
			onChange: (e) => {
				let { onChange: t, compare: n, mode: r, value: i } = this.state.dataRef.current;
				return Ui(r, {
					0: () => t?.(e),
					1: () => {
						let r = i.slice(), a = r.findIndex((t) => n(t, e));
						return a === -1 ? r.push(e) : r.splice(a, 1), t?.(r);
					}
				});
			},
			registerOption: So(() => {
				let e = [], t = /* @__PURE__ */ new Set();
				return [(n, r) => {
					t.has(r) || (t.add(r), e.push({
						id: n,
						dataRef: r
					}));
				}, () => (t.clear(), this.send({
					type: 6,
					options: e.splice(0)
				}))];
			}),
			unregisterOption: So(() => {
				let e = [];
				return [(t) => e.push(t), () => {
					this.send({
						type: 7,
						options: e.splice(0)
					});
				}];
			}),
			goToOption: So(() => {
				let e = null;
				return [(t, n) => {
					e = {
						type: 2,
						...t,
						trigger: n
					};
				}, () => e && this.send(e)];
			}),
			closeListbox: () => {
				this.send({ type: 1 });
			},
			openListbox: (e) => {
				this.send({
					type: 0,
					focus: e
				});
			},
			selectActiveOption: () => {
				var e;
				if (this.state.activeOptionIndex !== null) {
					let { dataRef: e } = this.state.options[this.state.activeOptionIndex];
					this.actions.selectOption(e.current.value);
				} else this.state.dataRef.current.mode === 0 && (this.actions.closeListbox(), (e = this.state.buttonElement) == null || e.focus({ preventScroll: !0 }));
			},
			selectOption: (e) => {
				this.send({
					type: 5,
					value: e
				});
			},
			search: (e) => {
				this.send({
					type: 3,
					value: e
				});
			},
			clearSearch: () => {
				this.send({ type: 4 });
			},
			setButtonElement: (e) => {
				this.send({
					type: 8,
					element: e
				});
			},
			setOptionsElement: (e) => {
				this.send({
					type: 9,
					element: e
				});
			}
		}), yf(this, "selectors", {
			activeDescendantId(e) {
				var t;
				let n = e.activeOptionIndex, r = e.options;
				return n === null || (t = r[n]) == null ? void 0 : t.id;
			},
			isActive(e, t) {
				let n = e.activeOptionIndex, r = e.options;
				return n !== null && r[n]?.id === t;
			},
			hasFrozenValue(e) {
				return e.frozenValue;
			},
			shouldScrollIntoView(e, t) {
				return e.__demoMode || e.listboxState !== 0 || e.activationTrigger === 0 ? !1 : this.isActive(e, t);
			},
			didButtonMove(e) {
				return e.buttonPositionState.kind === "Moved";
			}
		}), this.on(6, () => {
			requestAnimationFrame(() => {
				this.send({ type: 10 });
			});
		});
		{
			let e = this.state.id, t = ko.get(null);
			this.disposables.add(t.on(Eo.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.listboxState === 0 && this.actions.closeListbox();
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(sd(t.buttonElement, t.buttonPositionState, () => {
					this.send({ type: 11 });
				})));
			});
		}), this.on(5, (e, t) => {
			var n;
			this.actions.onChange(t.value), this.state.dataRef.current.mode === 0 && (this.actions.closeListbox(), (n = this.state.buttonElement) == null || n.focus({ preventScroll: !0 }));
		});
	}
	static new({ id: t, __demoMode: n = !1 }) {
		return new e({
			id: t,
			dataRef: { current: {} },
			listboxState: +!n,
			options: [],
			searchQuery: "",
			activeOptionIndex: null,
			activationTrigger: 1,
			buttonElement: null,
			optionsElement: null,
			pendingShouldSort: !1,
			pendingFocus: { focus: Q.Nothing },
			frozenValue: !1,
			__demoMode: n,
			buttonPositionState: ad.Idle
		});
	}
	reduce(e, t) {
		return Ui(t.type, Tf, e, t);
	}
}, Df = i(null);
function Of(e) {
	let t = u(Df);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, kf), t;
	}
	return t;
}
function kf({ id: e, __demoMode: t = !1 }) {
	let n = g(() => Ef.new({
		id: e,
		__demoMode: t
	}), []);
	return Vu(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox.js
var Af = i(null);
Af.displayName = "ListboxDataContext";
function jf(e) {
	let t = u(Af);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, jf), t;
	}
	return t;
}
var Mf = n;
function Nf(e, n) {
	let r = m(), i = Vi(), { value: a, defaultValue: o, form: s, name: c, onChange: u, by: d, invalid: f = !1, disabled: p = i || !1, horizontal: h = !1, multiple: g = !1, __demoMode: _ = !1, ...y } = e, b = h ? "horizontal" : "vertical", x = J(n), S = aa(o), [C = g ? [] : void 0, w] = ia(a, u, S), T = kf({
		id: r,
		__demoMode: _
	}), E = v({
		static: !1,
		hold: !1
	}), D = v(/* @__PURE__ */ new Map()), O = to(d), k = l((e) => Ui(A.mode, {
		[xf.Multi]: () => C.some((t) => O(t, e)),
		[xf.Single]: () => O(C, e)
	}), [C]), A = zi({
		value: C,
		disabled: p,
		invalid: f,
		mode: g ? xf.Multi : xf.Single,
		orientation: b,
		onChange: w,
		compare: O,
		isSelected: k,
		optionsPropsRef: E,
		listRef: D
	});
	W(() => {
		T.state.dataRef.current = A;
	}, [A]);
	let j = X(T, (e) => e.listboxState), M = ko.get(null), N = X(M, l((e) => M.selectors.isTop(e, r), [M, r])), [P, F] = X(T, (e) => [e.buttonElement, e.optionsElement]);
	cs(N, [P, F], (e, t) => {
		T.send({ type: Cf.CloseListbox }), qo(t, Ko.Loose) || (e.preventDefault(), P?.focus());
	});
	let I = zi({
		open: j === bf.Open,
		disabled: p,
		invalid: f,
		value: C
	}), [ee, L] = qa({ inherit: !0 }), R = { ref: x }, z = l(() => {
		if (S !== void 0) return w?.(S);
	}, [w, S]), B = K();
	return t.createElement(L, {
		value: ee,
		props: { htmlFor: P?.id },
		slot: {
			open: j === bf.Open,
			disabled: p
		}
	}, t.createElement(wu, null, t.createElement(Df.Provider, { value: T }, t.createElement(Af.Provider, { value: A }, t.createElement(Fu, { value: Ui(j, {
		[bf.Open]: Nu.Open,
		[bf.Closed]: Nu.Closed
	}) }, c != null && C != null && t.createElement(_a, {
		disabled: p,
		data: { [c]: C },
		form: s,
		onReset: z
	}), B({
		ourProps: R,
		theirProps: y,
		slot: I,
		defaultTag: Mf,
		name: "Listbox"
	}))))));
}
var Pf = "button";
function Ff(e, t) {
	let n = m(), r = ba(), i = jf("Listbox.Button"), a = Of("Listbox.Button"), { id: o = r || `headlessui-listbox-button-${n}`, disabled: s = i.disabled || !1, autoFocus: c = !1, ...u } = e, d = J(t, yu(), a.actions.setButtonElement), f = bu(), [p, h, g] = X(a, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement
	]);
	hs(p === bf.Open, {
		trigger: h,
		action: l((e) => {
			if (h != null && h.contains(e.target)) return fs.Ignore;
			let t = e.target.closest("[role=\"option\"]:not([data-disabled])");
			return Ca(t) ? fs.Select(t) : g != null && g.contains(e.target) ? fs.Ignore : fs.Close;
		}, [h, g]),
		close: a.actions.closeListbox,
		select: a.actions.selectActiveOption
	});
	let _ = G((e) => {
		switch (e.key) {
			case Y.Enter:
				la(e.currentTarget);
				break;
			case Y.Space:
			case Y.ArrowDown:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? Q.Nothing : Q.First });
				break;
			case Y.ArrowUp:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? Q.Nothing : Q.Last });
				break;
		}
	}), v = G((e) => {
		switch (e.key) {
			case Y.Space:
				e.preventDefault();
				break;
		}
	}), y = ao((e) => {
		var t;
		a.state.listboxState === bf.Open ? (E(() => a.actions.closeListbox()), (t = a.state.buttonElement) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), a.actions.openListbox({ focus: Q.Nothing }));
	}), b = G((e) => e.preventDefault()), x = Ka([o]), S = Ra(), { isFocusVisible: C, focusProps: w } = _i({ autoFocus: c }), { isHovered: T, hoverProps: D } = Ci({ isDisabled: s }), { pressed: O, pressProps: k } = Ri({ disabled: s }), A = zi({
		open: p === bf.Open,
		active: O || p === bf.Open,
		disabled: s,
		invalid: i.invalid,
		value: i.value,
		hover: T,
		focus: C,
		autofocus: c
	}), j = X(a, (e) => e.listboxState === bf.Open), M = Zi(f(), {
		ref: d,
		id: o,
		type: _s(e, h),
		"aria-haspopup": "listbox",
		"aria-controls": g?.id,
		"aria-expanded": j,
		"aria-labelledby": x,
		"aria-describedby": S,
		disabled: s || void 0,
		autoFocus: c,
		onKeyDown: _,
		onKeyUp: v,
		onKeyPress: b
	}, y, w, D, k);
	return K()({
		ourProps: M,
		theirProps: u,
		slot: A,
		defaultTag: Pf,
		name: "Listbox.Button"
	});
}
var If = i(!1), Lf = "div", Rf = Wi.RenderStrategy | Wi.Static;
function zf(e, n) {
	let r = m(), { id: i = `headlessui-listbox-options-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = vu(a), [p, h] = y(null);
	d && (o = !0);
	let _ = jf("Listbox.Options"), v = Of("Listbox.Options"), [b, x, S, C] = X(v, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement,
		e.__demoMode
	]), w = ls(x), T = ls(S), D = Pu(), [O, k] = Ms(c, p, D === null ? b === bf.Open : (D & Nu.Open) === Nu.Open);
	zo(O, x, v.actions.closeListbox), Es(!C && s && b === bf.Open, T), Ro(!C && s && b === bf.Open, { allowed: l(() => [x, S], [x, S]) });
	let A = !X(v, v.selectors.didButtonMove) && O, j = ju(X(v, v.selectors.hasFrozenValue) && !e.static, _.value), M = l((e) => _.compare(j, e), [_.compare, j]), N = X(v, (e) => {
		var t;
		if (d == null || !((t = d?.to) != null && t.includes("selection"))) return null;
		let n = e.options.findIndex((e) => M(e.dataRef.current.value));
		return n === -1 && (n = 0), n;
	}), [P, F] = Su((() => {
		if (d == null) return;
		if (N === null) return {
			...d,
			inner: void 0
		};
		let e = Array.from(_.listRef.current.values());
		return {
			...d,
			inner: {
				listRef: { current: e },
				index: N
			}
		};
	})()), I = xu(), ee = J(n, d ? P : null, v.actions.setOptionsElement, h), L = Pi();
	f(() => {
		let e = S;
		e && b === bf.Open && (ji(e) || e == null || e.focus({ preventScroll: !0 }));
	}, [b, S]);
	let R = G((e) => {
		var t;
		switch (L.dispose(), e.key) {
			case Y.Space: if (v.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), v.actions.search(e.key);
			case Y.Enter:
				e.preventDefault(), e.stopPropagation(), v.actions.selectActiveOption();
				break;
			case Ui(_.orientation, {
				vertical: Y.ArrowDown,
				horizontal: Y.ArrowRight
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Q.Next });
			case Ui(_.orientation, {
				vertical: Y.ArrowUp,
				horizontal: Y.ArrowLeft
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Q.Previous });
			case Y.Home:
			case Y.PageUp: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Q.First });
			case Y.End:
			case Y.PageDown: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Q.Last });
			case Y.Escape:
				e.preventDefault(), e.stopPropagation(), E(() => v.actions.closeListbox()), (t = v.state.buttonElement) == null || t.focus({ preventScroll: !0 });
				return;
			case Y.Tab:
				e.preventDefault(), e.stopPropagation(), E(() => v.actions.closeListbox()), es(v.state.buttonElement, e.shiftKey ? Z.Previous : Z.Next);
				break;
			default:
				e.key.length === 1 && (v.actions.search(e.key), L.setTimeout(() => v.actions.clearSearch(), 350));
				break;
		}
	}), z = X(v, (e) => e.buttonElement?.id), B = zi({ open: b === bf.Open }), te = Zi(d ? I() : {}, {
		id: i,
		ref: ee,
		"aria-activedescendant": X(v, v.selectors.activeDescendantId),
		"aria-multiselectable": _.mode === xf.Multi || void 0,
		"aria-labelledby": z,
		"aria-orientation": _.orientation,
		onKeyDown: R,
		role: "listbox",
		tabIndex: b === bf.Open ? 0 : void 0,
		style: {
			...u.style,
			...F,
			"--button-width": ro(O, x, !0).width
		},
		...js(k)
	}), V = K(), ne = g(() => _.mode === xf.Multi ? _ : {
		..._,
		isSelected: M
	}, [_, M]);
	return t.createElement(id, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, t.createElement(Af.Provider, { value: ne }, V({
		ourProps: te,
		theirProps: u,
		slot: B,
		defaultTag: Lf,
		features: Rf,
		visible: A,
		name: "Listbox.Options"
	})));
}
var Bf = "div";
function Vf(e, t) {
	let n = m(), { id: r = `headlessui-listbox-option-${n}`, disabled: i = !1, value: a, ...o } = e, s = u(If) === !0, c = jf("Listbox.Option"), l = Of("Listbox.Option"), d = X(l, (e) => l.selectors.isActive(e, r)), f = c.isSelected(a), p = v(null), h = gf(p), g = Fi({
		disabled: i,
		value: a,
		domRef: p,
		get textValue() {
			return h();
		}
	}), _ = J(t, p, (e) => {
		e ? c.listRef.current.set(r, e) : c.listRef.current.delete(r);
	}), y = X(l, (e) => l.selectors.shouldScrollIntoView(e, r));
	W(() => {
		if (y) return Ni().requestAnimationFrame(() => {
			var e, t;
			(t = (e = p.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [y, p]), W(() => {
		if (!s) return l.actions.registerOption(r, g), () => l.actions.unregisterOption(r);
	}, [
		g,
		r,
		s
	]);
	let b = G((e) => {
		if (i) return e.preventDefault();
		l.actions.selectOption(a);
	}), x = G(() => {
		if (i) return l.actions.goToOption({ focus: Q.Nothing });
		l.actions.goToOption({
			focus: Q.Specific,
			id: r
		});
	}), S = Os(), C = G((e) => S.update(e)), w = G((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === Sf.Pointer || l.actions.goToOption({
			focus: Q.Specific,
			id: r
		}, Sf.Pointer));
	}), T = G((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === Sf.Pointer && l.actions.goToOption({ focus: Q.Nothing }));
	}), E = zi({
		active: d,
		focus: d,
		selected: f,
		disabled: i,
		selectedOption: f && s
	}), D = s ? {} : {
		id: r,
		ref: _,
		role: "option",
		tabIndex: i === !0 ? void 0 : -1,
		"aria-disabled": i === !0 || void 0,
		"aria-selected": f,
		disabled: void 0,
		onClick: b,
		onFocus: x,
		onPointerEnter: C,
		onMouseEnter: C,
		onPointerMove: w,
		onMouseMove: w,
		onPointerLeave: T,
		onMouseLeave: T
	}, O = K();
	return !f && s ? null : O({
		ourProps: D,
		theirProps: o,
		slot: E,
		defaultTag: Bf,
		name: "Listbox.Option"
	});
}
var Hf = n;
function Uf(e, n) {
	let { options: r, placeholder: i, ...a } = e, o = { ref: J(n) }, s = jf("ListboxSelectedOption"), c = zi({}), l = s.value === void 0 || s.value === null || s.mode === xf.Multi && Array.isArray(s.value) && s.value.length === 0, u = K();
	return t.createElement(If.Provider, { value: !0 }, u({
		ourProps: o,
		theirProps: {
			...a,
			children: t.createElement(t.Fragment, null, i && l ? i : r)
		},
		slot: c,
		defaultTag: Hf,
		name: "ListboxSelectedOption"
	}));
}
var Wf = q(Nf), Gf = q(Ff), Kf = Za, qf = q(zf), Jf = q(Vf), Yf = q(Uf), Xf = Object.assign(Wf, {
	Button: Gf,
	Label: Kf,
	Options: qf,
	Option: Jf,
	SelectedOption: Yf
}), Zf = Object.defineProperty, Qf = (e, t, n) => t in e ? Zf(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, $f = (e, t, n) => (Qf(e, typeof t == "symbol" ? t : t + "", n), n), ep = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(ep || {}), tp = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(tp || {}), $ = ((e) => (e[e.OpenMenu = 0] = "OpenMenu", e[e.CloseMenu = 1] = "CloseMenu", e[e.GoToItem = 2] = "GoToItem", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.RegisterItems = 5] = "RegisterItems", e[e.UnregisterItems = 6] = "UnregisterItems", e[e.SetButtonElement = 7] = "SetButtonElement", e[e.SetItemsElement = 8] = "SetItemsElement", e[e.SortItems = 9] = "SortItems", e[e.MarkButtonAsMoved = 10] = "MarkButtonAsMoved", e))($ || {});
function np(e, t = (e) => e) {
	let n = e.activeItemIndex === null ? null : e.items[e.activeItemIndex], r = $o(t(e.items.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		items: r,
		activeItemIndex: i
	};
}
var rp = {
	1(e) {
		if (e.menuState === 1) return e;
		let t = e.buttonElement ? ad.Tracked(od(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeItemIndex: null,
			pendingFocus: { focus: Q.Nothing },
			menuState: 1,
			buttonPositionState: t
		};
	},
	0(e, t) {
		return e.menuState === 0 ? e : {
			...e,
			__demoMode: !1,
			pendingFocus: t.focus,
			menuState: 0,
			buttonPositionState: ad.Idle
		};
	},
	2: (e, t) => {
		if (e.menuState === 1) return e;
		let n = {
			...e,
			searchQuery: "",
			activationTrigger: t.trigger ?? 1,
			__demoMode: !1
		};
		if (t.focus === Q.Nothing) return {
			...n,
			activeItemIndex: null
		};
		if (t.focus === Q.Specific) return {
			...n,
			activeItemIndex: e.items.findIndex((e) => e.id === t.id)
		};
		if (t.focus === Q.Previous) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = Bu(t, {
					resolveItems: () => e.items,
					resolveActiveIndex: () => e.activeItemIndex,
					resolveId: (e) => e.id,
					resolveDisabled: (e) => e.dataRef.current.disabled
				});
				if (a !== null) {
					let t = e.items[a].dataRef.current.domRef;
					if (i.current?.previousElementSibling === t.current || t.current?.previousElementSibling === null) return {
						...n,
						activeItemIndex: a
					};
				}
			}
		} else if (t.focus === Q.Next) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = Bu(t, {
					resolveItems: () => e.items,
					resolveActiveIndex: () => e.activeItemIndex,
					resolveId: (e) => e.id,
					resolveDisabled: (e) => e.dataRef.current.disabled
				});
				if (a !== null) {
					let t = e.items[a].dataRef.current.domRef;
					if (i.current?.nextElementSibling === t.current || t.current?.nextElementSibling === null) return {
						...n,
						activeItemIndex: a
					};
				}
			}
		}
		let r = np(e), i = Bu(t, {
			resolveItems: () => r.items,
			resolveActiveIndex: () => r.activeItemIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		});
		return {
			...n,
			...r,
			activeItemIndex: i
		};
	},
	3: (e, t) => {
		let n = +(e.searchQuery === ""), r = e.searchQuery + t.value.toLowerCase(), i = (e.activeItemIndex === null ? e.items : e.items.slice(e.activeItemIndex + n).concat(e.items.slice(0, e.activeItemIndex + n))).find((e) => e.dataRef.current.textValue?.startsWith(r) && !e.dataRef.current.disabled), a = i ? e.items.indexOf(i) : -1;
		return a === -1 || a === e.activeItemIndex ? {
			...e,
			searchQuery: r
		} : {
			...e,
			searchQuery: r,
			activeItemIndex: a,
			activationTrigger: 1
		};
	},
	4(e) {
		return e.searchQuery === "" ? e : {
			...e,
			searchQuery: "",
			searchActiveItemIndex: null
		};
	},
	5: (e, t) => {
		let n = e.items.concat(t.items.map((e) => e)), r = e.activeItemIndex;
		return e.pendingFocus.focus !== Q.Nothing && (r = Bu(e.pendingFocus, {
			resolveItems: () => n,
			resolveActiveIndex: () => e.activeItemIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		})), {
			...e,
			items: n,
			activeItemIndex: r,
			pendingFocus: { focus: Q.Nothing },
			pendingShouldSort: !0
		};
	},
	6: (e, t) => {
		let n = e.items, r = [], i = new Set(t.items);
		for (let [e, t] of n.entries()) if (i.has(t.id) && (r.push(e), i.delete(t.id), i.size === 0)) break;
		if (r.length > 0) {
			n = n.slice();
			for (let e of r.reverse()) n.splice(e, 1);
		}
		return {
			...e,
			items: n,
			activationTrigger: 1
		};
	},
	7: (e, t) => e.buttonElement === t.element ? e : {
		...e,
		buttonElement: t.element
	},
	8: (e, t) => e.itemsElement === t.element ? e : {
		...e,
		itemsElement: t.element
	},
	9: (e) => e.pendingShouldSort ? {
		...e,
		...np(e),
		pendingShouldSort: !1
	} : e,
	10(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: ad.Moved
		} : e;
	}
}, ip = class e extends vo {
	constructor(e) {
		super(e), $f(this, "actions", {
			registerItem: So(() => {
				let e = [], t = /* @__PURE__ */ new Set();
				return [(n, r) => {
					t.has(r) || (t.add(r), e.push({
						id: n,
						dataRef: r
					}));
				}, () => (t.clear(), this.send({
					type: 5,
					items: e.splice(0)
				}))];
			}),
			unregisterItem: So(() => {
				let e = [];
				return [(t) => e.push(t), () => this.send({
					type: 6,
					items: e.splice(0)
				})];
			})
		}), $f(this, "selectors", {
			activeDescendantId(e) {
				var t;
				let n = e.activeItemIndex, r = e.items;
				return n === null || (t = r[n]) == null ? void 0 : t.id;
			},
			isActive(e, t) {
				let n = e.activeItemIndex, r = e.items;
				return n !== null && r[n]?.id === t;
			},
			shouldScrollIntoView(e, t) {
				return e.__demoMode || e.menuState !== 0 || e.activationTrigger === 0 ? !1 : this.isActive(e, t);
			},
			didButtonMove(e) {
				return e.buttonPositionState.kind === "Moved";
			}
		}), this.on(5, () => {
			this.disposables.requestAnimationFrame(() => {
				this.send({ type: 9 });
			});
		});
		{
			let e = this.state.id, t = ko.get(null);
			this.disposables.add(t.on(Eo.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.menuState === 0 && this.send({ type: 1 });
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(sd(t.buttonElement, t.buttonPositionState, () => {
					this.send({ type: 10 });
				})));
			});
		});
	}
	static new({ id: t, __demoMode: n = !1 }) {
		return new e({
			id: t,
			__demoMode: n,
			menuState: +!n,
			buttonElement: null,
			itemsElement: null,
			items: [],
			searchQuery: "",
			activeItemIndex: null,
			activationTrigger: 1,
			pendingShouldSort: !1,
			pendingFocus: { focus: Q.Nothing },
			buttonPositionState: ad.Idle
		});
	}
	reduce(e, t) {
		return Ui(t.type, rp, e, t);
	}
}, ap = i(null);
function op(e) {
	let t = u(ap);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Menu /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, sp), t;
	}
	return t;
}
function sp({ id: e, __demoMode: t = !1 }) {
	let n = g(() => ip.new({
		id: e,
		__demoMode: t
	}), []);
	return Vu(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/menu/menu.js
var cp = n;
function lp(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = sp({
		id: r,
		__demoMode: i
	}), [s, c, u] = X(o, (e) => [
		e.menuState,
		e.itemsElement,
		e.buttonElement
	]), d = J(n), f = ko.get(null);
	cs(X(f, l((e) => f.selectors.isTop(e, r), [f, r])), [u, c], (e, t) => {
		var n;
		o.send({ type: $.CloseMenu }), qo(t, Ko.Loose) || (e.preventDefault(), (n = o.state.buttonElement) == null || n.focus());
	});
	let p = G(() => {
		o.send({ type: $.CloseMenu });
	}), h = zi({
		open: s === ep.Open,
		close: p
	}), g = { ref: d }, _ = K();
	return t.createElement(wu, null, t.createElement(ap.Provider, { value: o }, t.createElement(Fu, { value: Ui(s, {
		[ep.Open]: Nu.Open,
		[ep.Closed]: Nu.Closed
	}) }, _({
		ourProps: g,
		theirProps: a,
		slot: h,
		defaultTag: cp,
		name: "Menu"
	}))));
}
var up = "button";
function dp(e, t) {
	let n = op("Menu.Button"), r = m(), { id: i = `headlessui-menu-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = v(null), u = bu(), d = J(t, c, yu(), G((e) => n.send({
		type: $.SetButtonElement,
		element: e
	}))), f = G((e) => {
		switch (e.key) {
			case Y.Space:
			case Y.Enter:
			case Y.ArrowDown:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: $.OpenMenu,
					focus: { focus: Q.First }
				});
				break;
			case Y.ArrowUp:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: $.OpenMenu,
					focus: { focus: Q.Last }
				});
				break;
		}
	}), p = G((e) => {
		switch (e.key) {
			case Y.Space:
				e.preventDefault();
				break;
		}
	}), [h, g, _] = X(n, (e) => [
		e.menuState,
		e.buttonElement,
		e.itemsElement
	]);
	hs(h === ep.Open, {
		trigger: g,
		action: l((e) => {
			if (g != null && g.contains(e.target)) return fs.Ignore;
			let t = e.target.closest("[role=\"menuitem\"]:not([data-disabled])");
			return Ca(t) ? fs.Select(t) : _ != null && _.contains(e.target) ? fs.Ignore : fs.Close;
		}, [g, _]),
		close: l(() => n.send({ type: $.CloseMenu }), []),
		select: l((e) => e.click(), [])
	});
	let y = ao((e) => {
		var t;
		a || (h === ep.Open ? (E(() => n.send({ type: $.CloseMenu })), (t = c.current) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), n.send({
			type: $.OpenMenu,
			focus: { focus: Q.Nothing },
			trigger: tp.Pointer
		})));
	}), { isFocusVisible: b, focusProps: x } = _i({ autoFocus: o }), { isHovered: S, hoverProps: C } = Ci({ isDisabled: a }), { pressed: w, pressProps: T } = Ri({ disabled: a }), D = zi({
		open: h === ep.Open,
		active: w || h === ep.Open,
		disabled: a,
		hover: S,
		focus: b,
		autofocus: o
	}), O = Zi(u(), {
		ref: d,
		id: i,
		type: _s(e, c.current),
		"aria-haspopup": "menu",
		"aria-controls": _?.id,
		"aria-expanded": h === ep.Open,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: f,
		onKeyUp: p
	}, y, x, C, T);
	return K()({
		ourProps: O,
		theirProps: s,
		slot: D,
		defaultTag: up,
		name: "Menu.Button"
	});
}
var fp = "div", pp = Wi.RenderStrategy | Wi.Static;
function mp(e, n) {
	let r = m(), { id: i = `headlessui-menu-items-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = vu(a), p = op("Menu.Items"), [h, g] = Su(d), _ = xu(), [v, b] = y(null), x = J(n, d ? h : null, G((e) => p.send({
		type: $.SetItemsElement,
		element: e
	})), b), [S, C] = X(p, (e) => [e.menuState, e.buttonElement]), w = ls(C), T = ls(v);
	d && (o = !0);
	let D = Pu(), [O, k] = Ms(c, v, D === null ? S === ep.Open : (D & Nu.Open) === Nu.Open);
	zo(O, C, () => {
		p.send({ type: $.CloseMenu });
	});
	let A = X(p, (e) => e.__demoMode);
	Es(!A && s && S === ep.Open, T), Ro(!A && s && S === ep.Open, { allowed: l(() => [C, v], [C, v]) });
	let j = !X(p, p.selectors.didButtonMove) && O;
	f(() => {
		let e = v;
		e && S === ep.Open && (ji(e) || e.focus({ preventScroll: !0 }));
	}, [S, v]), Ls(S === ep.Open, {
		container: v,
		accept(e) {
			return e.getAttribute("role") === "menuitem" ? NodeFilter.FILTER_REJECT : e.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
		},
		walk(e) {
			e.setAttribute("role", "none");
		}
	});
	let M = Pi(), N = G((e) => {
		var t, n;
		switch (M.dispose(), e.key) {
			case Y.Space: if (p.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), p.send({
				type: $.Search,
				value: e.key
			});
			case Y.Enter:
				if (e.preventDefault(), e.stopPropagation(), p.state.activeItemIndex !== null) {
					let { dataRef: e } = p.state.items[p.state.activeItemIndex];
					(t = e.current?.domRef.current) == null || t.click();
				}
				p.send({ type: $.CloseMenu }), Jo(p.state.buttonElement);
				break;
			case Y.ArrowDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: $.GoToItem,
				focus: Q.Next
			});
			case Y.ArrowUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: $.GoToItem,
				focus: Q.Previous
			});
			case Y.Home:
			case Y.PageUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: $.GoToItem,
				focus: Q.First
			});
			case Y.End:
			case Y.PageDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: $.GoToItem,
				focus: Q.Last
			});
			case Y.Escape:
				e.preventDefault(), e.stopPropagation(), E(() => p.send({ type: $.CloseMenu })), (n = p.state.buttonElement) == null || n.focus({ preventScroll: !0 });
				break;
			case Y.Tab:
				e.preventDefault(), e.stopPropagation(), E(() => p.send({ type: $.CloseMenu })), es(p.state.buttonElement, e.shiftKey ? Z.Previous : Z.Next);
				break;
			default:
				e.key.length === 1 && (p.send({
					type: $.Search,
					value: e.key
				}), M.setTimeout(() => p.send({ type: $.ClearSearch }), 350));
				break;
		}
	}), P = G((e) => {
		switch (e.key) {
			case Y.Space:
				e.preventDefault();
				break;
		}
	}), F = zi({ open: S === ep.Open }), I = Zi(d ? _() : {}, {
		"aria-activedescendant": X(p, p.selectors.activeDescendantId),
		"aria-labelledby": X(p, (e) => e.buttonElement?.id),
		id: i,
		onKeyDown: N,
		onKeyUp: P,
		role: "menu",
		tabIndex: S === ep.Open ? 0 : void 0,
		ref: x,
		style: {
			...u.style,
			...g,
			"--button-width": ro(O, C, !0).width
		},
		...js(k)
	}), ee = K();
	return t.createElement(id, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, ee({
		ourProps: I,
		theirProps: u,
		slot: F,
		defaultTag: fp,
		features: pp,
		visible: j,
		name: "Menu.Items"
	}));
}
var hp = n;
function gp(e, n) {
	let r = m(), { id: i = `headlessui-menu-item-${r}`, disabled: a = !1, ...o } = e, s = op("Menu.Item"), c = X(s, (e) => s.selectors.isActive(e, i)), l = v(null), u = J(n, l), d = X(s, (e) => s.selectors.shouldScrollIntoView(e, i));
	W(() => {
		if (d) return Ni().requestAnimationFrame(() => {
			var e, t;
			(t = (e = l.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [d, l]);
	let f = gf(l), p = v({
		disabled: a,
		domRef: l,
		get textValue() {
			return f();
		}
	});
	W(() => {
		p.current.disabled = a;
	}, [p, a]), W(() => (s.actions.registerItem(i, p), () => s.actions.unregisterItem(i)), [p, i]);
	let h = G(() => {
		s.send({ type: $.CloseMenu });
	}), g = G((e) => {
		if (a) return e.preventDefault();
		s.send({ type: $.CloseMenu }), Jo(s.state.buttonElement);
	}), _ = G(() => {
		if (a) return s.send({
			type: $.GoToItem,
			focus: Q.Nothing
		});
		s.send({
			type: $.GoToItem,
			focus: Q.Specific,
			id: i
		});
	}), y = Os(), b = G((e) => y.update(e)), x = G((e) => {
		y.wasMoved(e) && (a || c || s.send({
			type: $.GoToItem,
			focus: Q.Specific,
			id: i,
			trigger: tp.Pointer
		}));
	}), S = G((e) => {
		y.wasMoved(e) && (a || c && s.state.activationTrigger === tp.Pointer && s.send({
			type: $.GoToItem,
			focus: Q.Nothing
		}));
	}), [C, w] = qa(), [T, E] = za(), D = zi({
		active: c,
		focus: c,
		disabled: a,
		close: h
	}), O = {
		id: i,
		ref: u,
		role: "menuitem",
		tabIndex: a === !0 ? void 0 : -1,
		"aria-disabled": a === !0 || void 0,
		"aria-labelledby": C,
		"aria-describedby": T,
		disabled: void 0,
		onClick: g,
		onFocus: _,
		onPointerEnter: b,
		onMouseEnter: b,
		onPointerMove: x,
		onMouseMove: x,
		onPointerLeave: S,
		onMouseLeave: S
	}, k = K();
	return t.createElement(w, null, t.createElement(E, null, k({
		ourProps: O,
		theirProps: o,
		slot: D,
		defaultTag: hp,
		name: "Menu.Item"
	})));
}
var _p = "div";
function vp(e, n) {
	let [r, i] = qa(), a = e, o = {
		ref: n,
		"aria-labelledby": r,
		role: "group"
	}, s = K();
	return t.createElement(i, null, s({
		ourProps: o,
		theirProps: a,
		slot: {},
		defaultTag: _p,
		name: "Menu.Section"
	}));
}
var yp = "header";
function bp(e, t) {
	let n = m(), { id: r = `headlessui-menu-heading-${n}`, ...i } = e, a = Ga();
	W(() => a.register(r), [r, a.register]);
	let o = {
		id: r,
		ref: t,
		role: "presentation",
		...a.props
	};
	return K()({
		ourProps: o,
		theirProps: i,
		slot: {},
		defaultTag: yp,
		name: "Menu.Heading"
	});
}
var xp = "div";
function Sp(e, t) {
	let n = e, r = {
		ref: t,
		role: "separator"
	};
	return K()({
		ourProps: r,
		theirProps: n,
		slot: {},
		defaultTag: xp,
		name: "Menu.Separator"
	});
}
var Cp = q(lp), wp = q(dp), Tp = q(mp), Ep = q(gp), Dp = q(vp), Op = q(bp), kp = q(Sp), Ap = Object.assign(Cp, {
	Button: wp,
	Items: Tp,
	Item: Ep,
	Section: Dp,
	Heading: Op,
	Separator: kp
}), jp = Object.defineProperty, Mp = (e, t, n) => t in e ? jp(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Np = (e, t, n) => (Mp(e, typeof t == "symbol" ? t : t + "", n), n), Pp = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Pp || {}), Fp = ((e) => (e[e.OpenPopover = 0] = "OpenPopover", e[e.ClosePopover = 1] = "ClosePopover", e[e.SetButton = 2] = "SetButton", e[e.SetButtonId = 3] = "SetButtonId", e[e.SetPanel = 4] = "SetPanel", e[e.SetPanelId = 5] = "SetPanelId", e))(Fp || {}), Ip = {
	0: (e) => e.popoverState === 0 ? e : {
		...e,
		popoverState: 0,
		__demoMode: !1
	},
	1(e) {
		return e.popoverState === 1 ? e : {
			...e,
			popoverState: 1,
			__demoMode: !1
		};
	},
	2(e, t) {
		return e.button === t.button ? e : {
			...e,
			button: t.button
		};
	},
	3(e, t) {
		return e.buttonId === t.buttonId ? e : {
			...e,
			buttonId: t.buttonId
		};
	},
	4(e, t) {
		return e.panel === t.panel ? e : {
			...e,
			panel: t.panel
		};
	},
	5(e, t) {
		return e.panelId === t.panelId ? e : {
			...e,
			panelId: t.panelId
		};
	}
}, Lp = class e extends vo {
	constructor(e) {
		super(e), Np(this, "actions", {
			close: () => this.send({ type: 1 }),
			refocusableClose: (e) => {
				this.actions.close(), (e ? Ca(e) ? e : "current" in e && Ca(e.current) ? e.current : this.state.button : this.state.button)?.focus();
			},
			open: () => this.send({ type: 0 }),
			setButtonId: (e) => this.send({
				type: 3,
				buttonId: e
			}),
			setButton: (e) => this.send({
				type: 2,
				button: e
			}),
			setPanelId: (e) => this.send({
				type: 5,
				panelId: e
			}),
			setPanel: (e) => this.send({
				type: 4,
				panel: e
			})
		}), Np(this, "selectors", { isPortalled: (e) => {
			if (!e.button || !e.panel) return !1;
			let t = Oi(e.button) ?? document;
			for (let n of t.querySelectorAll("body > *")) if (Number(n?.contains(e.button)) ^ Number(n?.contains(e.panel))) return !0;
			let n = Wo(t), r = n.indexOf(e.button), i = (r + n.length - 1) % n.length, a = (r + 1) % n.length, o = n[i], s = n[a];
			return !e.panel.contains(o) && !e.panel.contains(s);
		} });
		{
			let e = this.state.id, t = ko.get(null);
			this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
	}
	static new({ id: t, __demoMode: n = !1 }) {
		return new e({
			id: t,
			__demoMode: n,
			popoverState: +!n,
			buttons: { current: [] },
			button: null,
			buttonId: null,
			panel: null,
			panelId: null,
			beforePanelSentinel: { current: null },
			afterPanelSentinel: { current: null },
			afterButtonSentinel: { current: null }
		});
	}
	reduce(e, t) {
		return Ui(t.type, Ip, e, t);
	}
}, Rp = i(null);
function zp(e) {
	let t = u(Rp);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Popover /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, zp), t;
	}
	return t;
}
function Bp({ id: e, __demoMode: t = !1 }) {
	let n = g(() => Lp.new({
		id: e,
		__demoMode: t
	}), []);
	return Vu(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/popover/popover.js
var Vp = i(null);
Vp.displayName = "PopoverGroupContext";
function Hp() {
	return u(Vp);
}
var Up = i(null);
Up.displayName = "PopoverPanelContext";
function Wp() {
	return u(Up);
}
var Gp = "div";
function Kp(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = Bp({
		id: r,
		__demoMode: i
	}), s = v(null), c = J(n, Fa((e) => {
		s.current = e;
	})), [u, d, p, h, _] = X(o, l((e) => [
		e.popoverState,
		e.button,
		e.panel,
		e.buttonId,
		e.panelId
	], [])), y = us(s.current ?? d), b = Fi(h), x = Fi(_), S = g(() => ({
		buttonId: b,
		panelId: x,
		close: o.actions.close
	}), [
		b,
		x,
		o
	]), C = Hp(), w = C?.registerPopover, T = G(() => {
		let e = Ai(s.current ?? d);
		return C?.isFocusWithinPopoverGroup() ?? (e && (d?.contains(e) || p?.contains(e)));
	});
	f(() => w?.(S), [w, S]);
	let [E, D] = td(), O = pd(d), k = ud({
		mainTreeNode: O,
		portals: E,
		defaultContainers: [{ get current() {
			return o.state.button;
		} }, { get current() {
			return o.state.panel;
		} }]
	});
	gs(y, "focus", (e) => {
		var t, n, r, i, a, s;
		e.target !== window && wa(e.target) && o.state.popoverState === Pp.Open && (T() || o.state.button && o.state.panel && (k.contains(e.target) || (n = (t = o.state.beforePanelSentinel.current)?.contains) != null && n.call(t, e.target) || (i = (r = o.state.afterPanelSentinel.current)?.contains) != null && i.call(r, e.target) || (s = (a = o.state.afterButtonSentinel.current)?.contains) != null && s.call(a, e.target) || o.actions.close()));
	}, !0), cs(u === Pp.Open, k.resolveContainers, (e, t) => {
		o.actions.close(), qo(t, Ko.Loose) || (e.preventDefault(), d?.focus());
	});
	let A = zi({
		open: u === Pp.Open,
		close: o.actions.refocusableClose
	}), j = X(o, l((e) => Ui(e.popoverState, {
		[Pp.Open]: Nu.Open,
		[Pp.Closed]: Nu.Closed
	}), [])), M = { ref: c }, N = K();
	return t.createElement(fd, { node: O }, t.createElement(wu, null, t.createElement(Up.Provider, { value: null }, t.createElement(Rp.Provider, { value: o }, t.createElement($a, { value: o.actions.refocusableClose }, t.createElement(Fu, { value: j }, t.createElement(D, null, N({
		ourProps: M,
		theirProps: a,
		slot: A,
		defaultTag: Gp,
		name: "Popover"
	}))))))));
}
var qp = "button";
function Jp(e, n) {
	let r = m(), { id: i = `headlessui-popover-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = zp("Popover.Button"), [u, d, p, h, g, _, b] = X(c, l((e) => [
		e.popoverState,
		c.selectors.isPortalled(e),
		e.button,
		e.buttonId,
		e.panel,
		e.panelId,
		e.afterButtonSentinel
	], [])), x = v(null), S = `headlessui-focus-sentinel-${m()}`, C = Hp()?.closeOthers, w = Wp() !== null;
	f(() => {
		if (!w) return c.actions.setButtonId(i), () => c.actions.setButtonId(null);
	}, [
		w,
		i,
		c
	]);
	let [T] = y(() => Symbol()), E = J(x, n, yu(), G((e) => {
		if (!w) {
			if (e) c.state.buttons.current.push(T);
			else {
				let e = c.state.buttons.current.indexOf(T);
				e !== -1 && c.state.buttons.current.splice(e, 1);
			}
			c.state.buttons.current.length > 1 && console.warn("You are already using a <Popover.Button /> but only 1 <Popover.Button /> is supported."), e && c.actions.setButton(e);
		}
	})), D = J(x, n), O = G((e) => {
		var t, n, r;
		if (w) {
			if (c.state.popoverState === Pp.Closed) return;
			switch (e.key) {
				case Y.Space:
				case Y.Enter:
					e.preventDefault(), (n = (t = e.target).click) == null || n.call(t), c.actions.close(), (r = c.state.button) == null || r.focus();
					break;
			}
		} else switch (e.key) {
			case Y.Space:
			case Y.Enter:
				e.preventDefault(), e.stopPropagation(), c.state.popoverState === Pp.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close();
				break;
			case Y.Escape:
				if (c.state.popoverState !== Pp.Open) return C?.(c.state.buttonId);
				if (!x.current) return;
				let t = Ai(x.current);
				if (t && !x.current.contains(t)) return;
				e.preventDefault(), e.stopPropagation(), c.actions.close();
				break;
		}
	}), k = G((e) => {
		w || e.key === Y.Space && e.preventDefault();
	}), A = G((e) => {
		var t, n;
		Ma(e.currentTarget) || a || (w ? (c.actions.close(), (t = c.state.button) == null || t.focus()) : (e.preventDefault(), e.stopPropagation(), c.state.popoverState === Pp.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close(), (n = c.state.button) == null || n.focus()));
	}), j = G((e) => {
		e.preventDefault(), e.stopPropagation();
	}), { isFocusVisible: M, focusProps: N } = _i({ autoFocus: o }), { isHovered: P, hoverProps: F } = Ci({ isDisabled: a }), { pressed: I, pressProps: ee } = Ri({ disabled: a }), L = u === Pp.Open, R = zi({
		open: L,
		active: I || L,
		disabled: a,
		hover: P,
		focus: M,
		autofocus: o
	}), z = _s(e, p), B = Zi(w ? {
		ref: D,
		type: z,
		onKeyDown: O,
		onClick: A,
		disabled: a || void 0,
		autoFocus: o
	} : {
		ref: E,
		id: h,
		type: z,
		"aria-expanded": u === Pp.Open,
		"aria-controls": g ? _ : void 0,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: O,
		onKeyUp: k,
		onClick: A,
		onMouseDown: j
	}, N, F, ee), te = gd(), V = G(() => {
		if (!Ca(c.state.panel)) return;
		let e = c.state.panel;
		function t() {
			Ui(te.current, {
				[hd.Forwards]: () => ts(e, Z.First),
				[hd.Backwards]: () => ts(e, Z.Last)
			}) === Ho.Error && ts(Wo(ki(c.state.button)).filter((e) => e.dataset.headlessuiFocusGuard !== "true"), Ui(te.current, {
				[hd.Forwards]: Z.Next,
				[hd.Backwards]: Z.Previous
			}), { relativeTo: c.state.button });
		}
		t();
	}), ne = K();
	return t.createElement(t.Fragment, null, ne({
		ourProps: B,
		theirProps: s,
		slot: R,
		defaultTag: qp,
		name: "Popover.Button"
	}), L && !w && d && t.createElement(ma, {
		id: S,
		ref: b,
		features: fa.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: V
	}));
}
var Yp = "div", Xp = Wi.RenderStrategy | Wi.Static;
function Zp(e, t) {
	let n = m(), { id: r = `headlessui-popover-backdrop-${n}`, transition: i = !1, ...a } = e, o = zp("Popover.Backdrop"), s = X(o, l((e) => e.popoverState, [])), [c, u] = y(null), d = J(t, u), f = Pu(), [p, h] = Ms(i, c, f === null ? s === Pp.Open : (f & Nu.Open) === Nu.Open), g = G((e) => {
		if (Ma(e.currentTarget)) return e.preventDefault();
		o.actions.close();
	}), _ = zi({ open: s === Pp.Open }), v = {
		ref: d,
		id: r,
		"aria-hidden": !0,
		onClick: g,
		...js(h)
	};
	return K()({
		ourProps: v,
		theirProps: a,
		slot: _,
		defaultTag: Yp,
		features: Xp,
		visible: p,
		name: "Popover.Backdrop"
	});
}
var Qp = "div", $p = Wi.RenderStrategy | Wi.Static;
function em(e, n) {
	let r = m(), { id: i = `headlessui-popover-panel-${r}`, focus: a = !1, anchor: o, portal: s = !1, modal: c = !1, transition: u = !1, ...d } = e, p = zp("Popover.Panel"), h = X(p, p.selectors.isPortalled), [g, _, b, x, S] = X(p, l((e) => [
		e.popoverState,
		e.button,
		e.__demoMode,
		e.beforePanelSentinel,
		e.afterPanelSentinel
	], [])), C = `headlessui-focus-sentinel-before-${r}`, w = `headlessui-focus-sentinel-after-${r}`, T = v(null), E = vu(o), [D, O] = Su(E), k = xu();
	E && (s = !0);
	let [A, j] = y(null), M = J(T, n, E ? D : null, p.actions.setPanel, j), N = ls(_), P = ls(T.current);
	W(() => (p.actions.setPanelId(i), () => p.actions.setPanelId(null)), [i, p]);
	let F = Pu(), [I, ee] = Ms(u, A, F === null ? g === Pp.Open : (F & Nu.Open) === Nu.Open);
	zo(I, _, p.actions.close), Es(!b && c && I, P);
	let L = G((e) => {
		var t;
		switch (e.key) {
			case Y.Escape:
				if (p.state.popoverState !== Pp.Open || !T.current) return;
				let n = Ai(T.current);
				if (n && !T.current.contains(n)) return;
				e.preventDefault(), e.stopPropagation(), p.actions.close(), (t = p.state.button) == null || t.focus();
				break;
		}
	});
	f(() => {
		var t;
		e.static || g === Pp.Closed && ((t = e.unmount) == null || t) && p.actions.setPanel(null);
	}, [
		g,
		e.unmount,
		e.static,
		p
	]), f(() => {
		if (b || !a || g !== Pp.Open || !T.current) return;
		let e = Ai(T.current);
		T.current.contains(e) || ts(T.current, Z.First);
	}, [
		b,
		a,
		T.current,
		g
	]);
	let R = zi({
		open: g === Pp.Open,
		close: p.actions.refocusableClose
	}), z = Zi(E ? k() : {}, {
		ref: M,
		id: i,
		onKeyDown: L,
		onBlur: a && g === Pp.Open ? (e) => {
			var t, n, r, i, a;
			let o = e.relatedTarget;
			o && T.current && ((t = T.current) != null && t.contains(o) || (p.actions.close(), ((r = (n = x.current)?.contains) != null && r.call(n, o) || (a = (i = S.current)?.contains) != null && a.call(i, o)) && o.focus({ preventScroll: !0 })));
		} : void 0,
		tabIndex: -1,
		style: {
			...d.style,
			...O,
			"--button-width": ro(I, _, !0).width
		},
		...js(ee)
	}), B = gd(), te = G(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			Ui(B.current, {
				[hd.Forwards]: () => {
					var t;
					ts(e, Z.First) === Ho.Error && ((t = p.state.afterPanelSentinel.current) == null || t.focus());
				},
				[hd.Backwards]: () => {
					var e;
					(e = p.state.button) == null || e.focus({ preventScroll: !0 });
				}
			});
		}
		t();
	}), V = G(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			Ui(B.current, {
				[hd.Forwards]: () => {
					if (!p.state.button) return;
					let e = Wo(ki(p.state.button) ?? document.body), t = e.indexOf(p.state.button), n = e.slice(0, t + 1), r = [...e.slice(t + 1), ...n];
					for (let e of r.slice()) if (e.dataset.headlessuiFocusGuard === "true" || A != null && A.contains(e)) {
						let t = r.indexOf(e);
						t !== -1 && r.splice(t, 1);
					}
					ts(r, Z.First, { sorted: !1 });
				},
				[hd.Backwards]: () => {
					var t;
					ts(e, Z.Previous) === Ho.Error && ((t = p.state.button) == null || t.focus());
				}
			});
		}
		t();
	}), ne = K();
	return t.createElement(Iu, null, t.createElement(Up.Provider, { value: i }, t.createElement($a, { value: p.actions.refocusableClose }, t.createElement(id, {
		enabled: s ? e.static || I : !1,
		ownerDocument: N
	}, I && h && t.createElement(ma, {
		id: C,
		ref: x,
		features: fa.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: te
	}), ne({
		ourProps: z,
		theirProps: d,
		slot: R,
		defaultTag: Qp,
		features: $p,
		visible: I,
		name: "Popover.Panel"
	}), I && h && t.createElement(ma, {
		id: w,
		ref: S,
		features: fa.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: V
	})))));
}
var tm = "div";
function nm(e, n) {
	let r = v(null), i = J(r, n), [a, o] = y([]), s = G((e) => {
		o((t) => {
			let n = t.indexOf(e);
			if (n !== -1) {
				let e = t.slice();
				return e.splice(n, 1), e;
			}
			return t;
		});
	}), c = G((e) => (o((t) => [...t, e]), () => s(e))), l = G(() => {
		var e;
		let t = ki(r.current);
		if (!t) return !1;
		let n = Ai(r.current);
		return (e = r.current) != null && e.contains(n) ? !0 : a.some((e) => t.getElementById(e.buttonId.current)?.contains(n) || t.getElementById(e.panelId.current)?.contains(n));
	}), u = G((e) => {
		for (let t of a) t.buttonId.current !== e && t.close();
	}), d = g(() => ({
		registerPopover: c,
		unregisterPopover: s,
		isFocusWithinPopoverGroup: l,
		closeOthers: u
	}), [
		c,
		s,
		l,
		u
	]), f = zi({}), p = e, m = { ref: i }, h = K();
	return t.createElement(fd, null, t.createElement(Vp.Provider, { value: d }, h({
		ourProps: m,
		theirProps: p,
		slot: f,
		defaultTag: tm,
		name: "Popover.Group"
	})));
}
var rm = q(Kp), im = q(Jp), am = q(Zp), om = q(Zp), sm = q(em), cm = q(nm), lm = Object.assign(rm, {
	Button: im,
	Backdrop: om,
	Overlay: am,
	Panel: sm,
	Group: cm
}), um = ((e) => (e[e.RegisterOption = 0] = "RegisterOption", e[e.UnregisterOption = 1] = "UnregisterOption", e))(um || {}), dm = {
	0(e, t) {
		let n = [...e.options, {
			id: t.id,
			element: t.element,
			propsRef: t.propsRef
		}];
		return {
			...e,
			options: $o(n, (e) => e.element.current)
		};
	},
	1(e, t) {
		let n = e.options.slice(), r = e.options.findIndex((e) => e.id === t.id);
		return r === -1 ? e : (n.splice(r, 1), {
			...e,
			options: n
		});
	}
}, fm = i(null);
fm.displayName = "RadioGroupDataContext";
function pm(e) {
	let t = u(fm);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, pm), t;
	}
	return t;
}
var mm = i(null);
mm.displayName = "RadioGroupActionsContext";
function hm(e) {
	let t = u(mm);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, hm), t;
	}
	return t;
}
function gm(e, t) {
	return Ui(t.type, dm, e, t);
}
var _m = "div";
function vm(e, n) {
	let r = m(), i = Vi(), { id: a = `headlessui-radiogroup-${r}`, value: o, form: s, name: c, onChange: u, by: d, disabled: f = i || !1, defaultValue: p, tabIndex: h = 0, ...y } = e, b = to(d), [x, S] = _(gm, { options: [] }), C = x.options, [w, T] = qa(), [E, D] = za(), O = v(null), k = J(O, n), A = aa(p), [j, M] = ia(o, u, A), N = g(() => C.find((e) => !e.propsRef.current.disabled), [C]), P = g(() => C.some((e) => b(e.propsRef.current.value, j)), [C, j]), F = G((e) => {
		if (f || b(e, j)) return !1;
		let t = C.find((t) => b(t.propsRef.current.value, e))?.propsRef.current;
		return t != null && t.disabled ? !1 : (M?.(e), !0);
	}), I = G((e) => {
		if (!O.current) return;
		let t = C.filter((e) => e.propsRef.current.disabled === !1).map((e) => e.element.current);
		switch (e.key) {
			case Y.Enter:
				la(e.currentTarget);
				break;
			case Y.ArrowLeft:
			case Y.ArrowUp:
				if (e.preventDefault(), e.stopPropagation(), ts(t, Z.Previous | Z.WrapAround) === Ho.Success) {
					let e = C.find((e) => ji(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case Y.ArrowRight:
			case Y.ArrowDown:
				if (e.preventDefault(), e.stopPropagation(), ts(t, Z.Next | Z.WrapAround) === Ho.Success) {
					let e = C.find((e) => ji(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case Y.Space:
				{
					e.preventDefault(), e.stopPropagation();
					let t = C.find((e) => ji(e.element.current));
					t && F(t.propsRef.current.value);
				}
				break;
		}
	}), ee = G((e) => (S({
		type: 0,
		...e
	}), () => S({
		type: 1,
		id: e.id
	}))), L = g(() => ({
		value: j,
		firstOption: N,
		containsCheckedOption: P,
		disabled: f,
		compare: b,
		tabIndex: h,
		...x
	}), [
		j,
		N,
		P,
		f,
		b,
		h,
		x
	]), R = g(() => ({
		registerOption: ee,
		change: F
	}), [ee, F]), z = {
		ref: k,
		id: a,
		role: "radiogroup",
		"aria-labelledby": w,
		"aria-describedby": E,
		onKeyDown: I
	}, B = zi({ value: j }), te = l(() => {
		if (A !== void 0) return F(A);
	}, [F, A]), V = K();
	return t.createElement(D, { name: "RadioGroup.Description" }, t.createElement(T, { name: "RadioGroup.Label" }, t.createElement(mm.Provider, { value: R }, t.createElement(fm.Provider, { value: L }, c != null && t.createElement(_a, {
		disabled: f,
		data: { [c]: j || "on" },
		overrides: {
			type: "radio",
			checked: j != null
		},
		form: s,
		onReset: te
	}), V({
		ourProps: z,
		theirProps: y,
		slot: B,
		defaultTag: _m,
		name: "RadioGroup"
	})))));
}
var ym = "div";
function bm(e, n) {
	let r = pm("RadioGroup.Option"), i = hm("RadioGroup.Option"), a = m(), { id: o = `headlessui-radiogroup-option-${a}`, value: s, disabled: c = r.disabled || !1, autoFocus: l = !1, ...u } = e, d = v(null), f = J(d, n), [p, h] = qa(), [g, _] = za(), y = Fi({
		value: s,
		disabled: c
	});
	W(() => i.registerOption({
		id: o,
		element: d,
		propsRef: y
	}), [
		o,
		i,
		d,
		y
	]);
	let b = G((e) => {
		var t;
		if (Ma(e.currentTarget)) return e.preventDefault();
		i.change(s) && ((t = d.current) == null || t.focus());
	}), x = r.firstOption?.id === o, { isFocusVisible: S, focusProps: C } = _i({ autoFocus: l }), { isHovered: w, hoverProps: T } = Ci({ isDisabled: c }), E = r.compare(r.value, s), D = Zi({
		ref: f,
		id: o,
		role: "radio",
		"aria-checked": E ? "true" : "false",
		"aria-labelledby": p,
		"aria-describedby": g,
		"aria-disabled": c ? !0 : void 0,
		tabIndex: c ? -1 : E || !r.containsCheckedOption && x ? r.tabIndex : -1,
		onClick: c ? void 0 : b,
		autoFocus: l
	}, C, T), O = zi({
		checked: E,
		disabled: c,
		active: S,
		hover: w,
		focus: S,
		autofocus: l
	}), k = K();
	return t.createElement(_, { name: "RadioGroup.Description" }, t.createElement(h, { name: "RadioGroup.Label" }, k({
		ourProps: D,
		theirProps: u,
		slot: O,
		defaultTag: ym,
		name: "RadioGroup.Option"
	})));
}
var xm = "span";
function Sm(e, t) {
	let n = pm("Radio"), r = hm("Radio"), i = m(), a = ba(), o = Vi(), { id: s = a || `headlessui-radio-${i}`, value: c, disabled: l = n.disabled || o || !1, autoFocus: u = !1, ...d } = e, f = v(null), p = J(f, t), h = Ka(), g = Ra(), _ = Fi({
		value: c,
		disabled: l
	});
	W(() => r.registerOption({
		id: s,
		element: f,
		propsRef: _
	}), [
		s,
		r,
		f,
		_
	]);
	let y = G((e) => {
		var t;
		if (Ma(e.currentTarget)) return e.preventDefault();
		r.change(c) && ((t = f.current) == null || t.focus());
	}), { isFocusVisible: b, focusProps: x } = _i({ autoFocus: u }), { isHovered: S, hoverProps: C } = Ci({ isDisabled: l }), w = n.firstOption?.id === s, T = n.compare(n.value, c), E = Zi({
		ref: p,
		id: s,
		role: "radio",
		"aria-checked": T ? "true" : "false",
		"aria-labelledby": h,
		"aria-describedby": g,
		"aria-disabled": l ? !0 : void 0,
		tabIndex: l ? -1 : T || !n.containsCheckedOption && w ? n.tabIndex : -1,
		autoFocus: u,
		onClick: l ? void 0 : y
	}, x, C), D = zi({
		checked: T,
		disabled: l,
		hover: S,
		focus: b,
		autofocus: u
	});
	return K()({
		ourProps: E,
		theirProps: d,
		slot: D,
		defaultTag: xm,
		name: "Radio"
	});
}
var Cm = q(vm), wm = q(bm), Tm = q(Sm), Em = Object.assign(Cm, {
	Option: wm,
	Radio: Tm,
	Label: Za,
	Description: Ua
}), Dm = "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", Om = /* @__PURE__ */ "🚀.✅.🐞.📌.⭐.🔥.💡.📝.🎨.🛠️.📅.⚠️.🎯.🔧.📦.🧪.🚧.💬.📈.🔍.❤️.🏷️.📂.🧩.⏰.🌟.✏️.📊.🙌.🧠.🌈.🔑".split(".");
function km({ value: e, options: t, onChange: n, disabled: r = !1, portalClassName: i }) {
	let a = t.find((t) => t.value === e);
	return /* @__PURE__ */ C(Xf, {
		value: e,
		onChange: n,
		disabled: r,
		children: [/* @__PURE__ */ C(Gf, {
			className: `${Dm} flex w-full items-center justify-between gap-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60`,
			children: [/* @__PURE__ */ C("span", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [a?.warning ? /* @__PURE__ */ S(xt, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : a?.color ? /* @__PURE__ */ S("span", {
					className: "h-2.5 w-2.5 shrink-0 rounded-full",
					style: { backgroundColor: a.color },
					"aria-hidden": !0
				}) : null, /* @__PURE__ */ S("span", {
					className: "truncate",
					children: a?.label ?? e
				})]
			}), /* @__PURE__ */ S(lt, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" })]
		}), /* @__PURE__ */ S(qf, {
			anchor: "bottom start",
			className: `z-[60] w-[var(--button-width)] rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${i ? ` ${i}` : ""}`,
			children: t.map((t) => /* @__PURE__ */ C(Jf, {
				value: t.value,
				className: "flex cursor-pointer items-center justify-between gap-1 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100",
				children: [/* @__PURE__ */ C("span", {
					className: "flex min-w-0 items-center gap-1.5",
					children: [t.warning ? /* @__PURE__ */ S(xt, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : t.color ? /* @__PURE__ */ S("span", {
						className: "h-2.5 w-2.5 shrink-0 rounded-full",
						style: { backgroundColor: t.color },
						"aria-hidden": !0
					}) : null, /* @__PURE__ */ S("span", {
						className: "truncate",
						children: t.label
					})]
				}), t.value === e && /* @__PURE__ */ S(tt, { className: "h-3.5 w-3.5 shrink-0 text-brand" })]
			}, t.value))
		})]
	});
}
function Am({ value: e, onChange: t, portalClassName: n }) {
	return /* @__PURE__ */ S("div", { children: /* @__PURE__ */ C(Ap, {
		as: "div",
		className: "relative inline-block",
		children: [/* @__PURE__ */ S(wp, {
			className: "flex h-7 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-base leading-none hover:border-brand focus:outline-none focus:ring-1 focus:ring-brand",
			children: e ? /* @__PURE__ */ S("span", { children: e }) : /* @__PURE__ */ S(Tt, { className: "h-4 w-4 text-stone-400" })
		}), /* @__PURE__ */ C(Tp, {
			anchor: "bottom start",
			className: `z-[60] w-[232px] rounded-lg border border-black/[0.06] bg-white p-2 shadow-lg [--anchor-gap:4px] focus:outline-none${n ? ` ${n}` : ""}`,
			children: [/* @__PURE__ */ S("div", {
				className: "grid grid-cols-8 gap-0.5",
				children: Om.map((n) => /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ S("button", {
					type: "button",
					onClick: () => t(n),
					className: `flex h-6 w-6 items-center justify-center rounded text-base hover:bg-stone-100 data-[focus]:bg-stone-100 ${e === n ? "bg-brand-soft" : ""}`,
					children: n
				}) }, n))
			}), /* @__PURE__ */ S("div", {
				className: "mt-1 border-t border-black/[0.05] pt-1",
				children: /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => t(""),
					className: "flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(fn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "zOc0vf" })]
				}) })
			})]
		})]
	}) });
}
function jm({ value: e, options: t, onChange: n, portalClassName: r }) {
	let i = (e) => e.value ?? e.label, a = new Map(t.map((e) => [i(e), e])), o = [...t, ...e.filter((e) => !a.has(e)).map((e) => ({
		value: e,
		label: e,
		color: null
	}))], s = (t) => n(e.includes(t) ? e.filter((e) => e !== t) : [...e, t]);
	return /* @__PURE__ */ C(Ap, {
		as: "div",
		className: "relative inline-block w-full",
		children: [/* @__PURE__ */ C(wp, {
			className: `${Dm} flex w-full items-center justify-between gap-1`,
			children: [/* @__PURE__ */ S("span", {
				className: "truncate",
				children: e.length ? e.map((e) => a.get(e)?.label ?? e).join(", ") : U._({ id: "cfaWH-" })
			}), /* @__PURE__ */ S(lt, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" })]
		}), /* @__PURE__ */ C(Tp, {
			anchor: "bottom start",
			className: `z-[60] max-h-56 w-[var(--button-width)] overflow-y-auto rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${r ? ` ${r}` : ""}`,
			children: [o.length === 0 && /* @__PURE__ */ S("div", {
				className: "px-2 py-1 text-stone-400",
				children: U._({ id: "GKu3m4" })
			}), o.map((t) => {
				let n = i(t);
				return /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: (e) => {
						e.preventDefault(), s(n);
					},
					className: "flex w-full items-center gap-1.5 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100",
					children: [
						/* @__PURE__ */ S("span", {
							className: "h-2.5 w-2.5 rounded-full",
							style: { backgroundColor: t.color ?? "#d6d3d1" }
						}),
						/* @__PURE__ */ S("span", {
							className: "flex-1 truncate text-left",
							children: t.label
						}),
						e.includes(n) && /* @__PURE__ */ S(tt, { className: "h-3.5 w-3.5 text-brand" })
					]
				}) }, n);
			})]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardPeek.tsx
function Mm({ card: e, boardTitle: t, statusOptions: n, swimlaneOptions: r, swimlaneDisabled: i, assigneeOptions: a, tagOptions: o, fields: s, onAddField: c, dependencyCards: u, childCards: d, onOpenCard: p, onAddChild: m, loadNotes: h, onUploadAttachment: g, loadComments: _, addComment: b, updateComment: w, deleteComment: T, toggleReaction: E, resolveComment: D, currentUser: O, loadActivity: k, renderMarkdownToContainer: A, renderMarkdownToHtml: j, portalClassName: M, supplement: N, onChange: P, onClose: F, onDelete: I, onOpenFull: ee }) {
	let [R, z] = y(""), [B, te] = y(""), [V, ne] = y(!1), [re, ie] = y(""), ae = v(0), [H, oe] = y(e), [se, ce] = y(e.notes ?? ""), [le, ue] = y("write"), [de, fe] = y(""), [pe, me] = y(!1), [he, ge] = y([]), [_e, ve] = y(""), [ye, be] = y([]), xe = v(null), Se = v(null), Ce = v({}), we = v(P), Te = l((e = {}) => {
		Se.current && clearTimeout(Se.current), Se.current = null;
		let t = {
			...Ce.current,
			...e
		};
		Ce.current = {}, Object.keys(t).length > 0 && we.current(t);
	}, []);
	f(() => {
		if (ae.current += 1, oe(e), ce(e.notes ?? ""), te(""), ne(!1), ie(""), h) {
			let t = !1;
			return h(e.id).then((e) => {
				t || ce(e);
			}), () => {
				t = !0;
			};
		}
	}, [e.id]), f(() => () => Te(), [e.id, Te]), f(() => {
		if (!_) {
			ge([]);
			return;
		}
		let t = !1;
		return ve(""), _(e.id).then((e) => {
			t || ge(e);
		}).catch(() => {}), () => {
			t = !0;
		};
	}, [e.id]), f(() => {
		if (!k) {
			be([]);
			return;
		}
		let t = !1;
		return k(e.id).then((e) => {
			t || be(e);
		}).catch(() => {}), () => {
			t = !0;
		};
	}, [e.id]);
	let Ee = async () => {
		let t = _e.trim();
		if (!(!t || !b)) try {
			let n = await b(e.id, t);
			ge((e) => [...e, n]), ve("");
		} catch {}
	}, De = async (e) => {
		if (T) try {
			await T(e), ge((t) => t.filter((t) => t.id !== e && t.parentId !== e));
		} catch {}
	}, Oe = (e) => ge((t) => t.map((t) => t.id === e.id ? e : t)), ke = he.filter((e) => !e.parentId), Ae = /* @__PURE__ */ new Map();
	for (let e of he) {
		if (!e.parentId) continue;
		let t = Ae.get(e.parentId);
		t ? t.push(e) : Ae.set(e.parentId, [e]);
	}
	let Me = l((e) => {
		Ce.current = {
			...Ce.current,
			...e
		}, we.current = P, Se.current && clearTimeout(Se.current), Se.current = setTimeout(() => Te(), 350);
	}, [Te, P]), Pe = (e, t = !1) => {
		oe((t) => ({
			...t,
			...e
		})), t ? (we.current = P, Te(e)) : Me(e);
	}, Fe = (e) => {
		ce(e), Me({ notes: e });
	};
	f(() => {
		if (!(le !== "preview" || !xe.current)) {
			if (A) {
				A(se, xe.current);
				return;
			}
			xe.current.textContent = se;
		}
	}, [
		le,
		se,
		A
	]);
	let Ie = H.tags.map((e) => e.label), Le = H.attachments ?? [], Re = (e) => Pe({ attachments: e }, !0), ze = (e) => {
		let t = e.trim();
		t && !Le.includes(t) && Re([...Le, t]);
	}, Be = async () => {
		let e = B.trim();
		if (!e || !m || V) return;
		let t = ae.current + 1;
		ae.current = t, ne(!0), ie("");
		try {
			if (await m(e), ae.current !== t) return;
			te("");
		} catch {
			if (ae.current !== t) return;
			ie(U._({ id: "rfI3Fa" }));
		} finally {
			ae.current === t && ne(!1);
		}
	}, Ve = async (e) => {
		if (!(!e || !g)) {
			me(!0);
			try {
				ze(await g(e));
			} finally {
				me(!1);
			}
		}
	}, He = /* @__PURE__ */ new Map(), Ue = new Map((u ?? []).map((e) => [e.slug, e])), We = /* @__PURE__ */ new Map(), Ge = /* @__PURE__ */ new Map();
	for (let e of u ?? []) {
		He.set(e.title, (He.get(e.title) ?? 0) + 1);
		let t = e.slug.split("/").filter(Boolean), n = t[t.length - 1] ?? e.slug, r = We.get(n);
		r ? r.push(e) : We.set(n, [e]);
		for (let n = 1; n < t.length - 1; n += 1) {
			let r = t.slice(n).join("/"), i = Ge.get(r);
			Ge.set(r, i === void 0 || i === e ? e : null);
		}
	}
	let Ke = (u ?? []).map((e) => ({
		value: e.slug,
		label: (He.get(e.title) ?? 0) > 1 ? `${e.title} · ${e.slug}` : e.title
	})), qe = (e) => {
		if (!e || Ue.has(e)) return e;
		if (!e.includes("/")) {
			let t = We.get(e) ?? [];
			return t.length === 1 ? t[0].slug : e;
		}
		return Ge.get(e)?.slug ?? e;
	}, Je = (e) => /* @__PURE__ */ S(jm, {
		value: (H[e] ?? []).map(qe),
		options: Ke,
		onChange: (t) => Pe({ [e]: t }, !0),
		portalClassName: M
	});
	return /* @__PURE__ */ C("div", {
		className: "flex h-full w-full flex-col overflow-hidden bg-white",
		children: [/* @__PURE__ */ C("header", {
			className: "flex h-14 shrink-0 items-center gap-2 border-b border-line px-5",
			children: [
				/* @__PURE__ */ S("span", {
					className: "flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
					children: H.icon ? /* @__PURE__ */ S("span", {
						className: "text-sm",
						children: H.icon
					}) : /* @__PURE__ */ S(Yt, { className: "h-4 w-4" })
				}),
				t && /* @__PURE__ */ S("span", {
					className: "max-w-48 truncate text-xs font-medium text-brand-gray",
					children: t
				}),
				/* @__PURE__ */ S(st, { className: "h-3.5 w-3.5 text-stone-300" }),
				/* @__PURE__ */ S("span", {
					className: "text-xs font-semibold text-stone-700",
					children: H.ticket ?? /* @__PURE__ */ S(L, { id: "kryGs-" })
				}),
				/* @__PURE__ */ C("div", {
					className: "ml-auto flex items-center gap-1",
					children: [
						ee && /* @__PURE__ */ S("button", {
							type: "button",
							onClick: ee,
							title: U._({ id: "pKztsX" }),
							className: "rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-brand-dark",
							children: /* @__PURE__ */ S(je, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ S("button", {
							type: "button",
							onClick: I,
							title: U._({ id: "nabda1" }),
							className: "rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600",
							children: /* @__PURE__ */ S(rn, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ S("button", {
							type: "button",
							onClick: F,
							title: U._({ id: "yz7wBu" }),
							"aria-label": U._({ id: "yz7wBu" }),
							className: "rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700",
							children: /* @__PURE__ */ S(fn, { className: "h-4 w-4" })
						})
					]
				})
			]
		}), /* @__PURE__ */ C("div", {
			className: "flex min-h-0 flex-1 flex-col lg:flex-row",
			children: [/* @__PURE__ */ C("main", {
				className: "min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-12",
				children: [
					/* @__PURE__ */ S("input", {
						autoFocus: !0,
						className: "w-full bg-transparent text-2xl font-semibold tracking-[-0.025em] text-stone-950 outline-none placeholder:text-stone-300 sm:text-[1.75rem]",
						placeholder: U._({ id: "gLDJuJ" }),
						value: H.title,
						onChange: (e) => Pe({ title: e.target.value })
					}),
					/* @__PURE__ */ C("section", {
						className: "mt-7",
						children: [/* @__PURE__ */ C("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ S("span", {
								className: "text-xs font-semibold text-stone-700",
								children: /* @__PURE__ */ S(L, { id: "Nu4oKW" })
							}), /* @__PURE__ */ S("button", {
								type: "button",
								onClick: () => ue((e) => e === "write" ? "preview" : "write"),
								className: "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100",
								children: le === "write" ? /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S(Ct, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "rdUucN" })] }) : /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S(Vt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "i4_LY_" })] })
							})]
						}), le === "write" ? /* @__PURE__ */ S("textarea", {
							className: "mt-2 min-h-[280px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50/35 px-4 py-3 text-sm leading-6 text-stone-800 outline-none transition focus:border-brand/50 focus:bg-white focus:ring-4 focus:ring-brand/5",
							value: se,
							placeholder: U._({ id: "abUZlY" }),
							onChange: (e) => Fe(e.target.value)
						}) : /* @__PURE__ */ S("article", {
							ref: xe,
							className: `preview mt-2 min-h-[280px] rounded-xl border border-stone-100 bg-stone-50/20 px-4 py-3 text-sm${A ? "" : " whitespace-pre-wrap"}`
						})]
					}),
					(m || (d?.length ?? 0) > 0) && /* @__PURE__ */ C("section", {
						className: "mt-8 border-t border-line pt-6",
						children: [
							/* @__PURE__ */ C("span", {
								className: "text-xs font-semibold text-stone-700",
								children: [/* @__PURE__ */ S(L, { id: "bzjBcL" }), (d?.length ?? 0) > 0 && /* @__PURE__ */ C("span", {
									className: "ml-1.5 font-normal text-stone-400",
									children: [
										d.filter((e) => e.done).length,
										"/",
										d.length
									]
								})]
							}),
							/* @__PURE__ */ S("ul", {
								className: "mt-2 space-y-1.5",
								children: (d ?? []).map((e) => /* @__PURE__ */ S("li", { children: /* @__PURE__ */ C("button", {
									type: "button",
									className: "flex w-full items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/55 px-3 py-2 text-left text-xs transition hover:border-brand/25 hover:bg-brand-soft/20",
									onClick: () => p?.(e.id),
									title: U._({ id: "fEqHZq" }),
									children: [
										/* @__PURE__ */ S("span", { className: `h-2 w-2 shrink-0 rounded-full ${e.done ? "bg-emerald-500" : "bg-stone-300"}` }),
										/* @__PURE__ */ C("span", {
											className: `min-w-0 flex-1 truncate ${e.done ? "text-stone-400 line-through" : "text-stone-700"}`,
											children: [e.icon && /* @__PURE__ */ S("span", {
												className: "mr-1",
												children: e.icon
											}), e.title]
										}),
										/* @__PURE__ */ S("span", {
											className: "shrink-0 text-[10px] text-stone-400",
											children: e.statusName
										})
									]
								}) }, e.id))
							}),
							m && /* @__PURE__ */ C("form", {
								className: "mt-2",
								onSubmit: (e) => {
									e.preventDefault(), Be();
								},
								children: [/* @__PURE__ */ S("input", {
									className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
									placeholder: U._({ id: "OR4WQZ" }),
									value: B,
									disabled: V,
									onChange: (e) => te(e.target.value),
									onKeyDown: (e) => {
										e.key === "Enter" && (e.preventDefault(), e.stopPropagation(), Be());
									}
								}), re && /* @__PURE__ */ S("p", {
									className: "mt-1 text-[11px] text-red-600",
									role: "alert",
									children: re
								})]
							})
						]
					}),
					/* @__PURE__ */ C("section", {
						className: "mt-8 border-t border-line pt-6",
						children: [
							/* @__PURE__ */ C("span", {
								className: "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700",
								children: [/* @__PURE__ */ S(zt, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ S(L, { id: "w_Sphq" })]
							}),
							Le.length > 0 && /* @__PURE__ */ S("div", {
								className: "mt-2 grid gap-1.5 sm:grid-cols-2",
								children: Le.map((e) => /* @__PURE__ */ C("div", {
									className: "flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs",
									children: [
										/* @__PURE__ */ S(zt, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" }),
										bn(e) ? /* @__PURE__ */ S("a", {
											href: e,
											target: "_blank",
											rel: "noreferrer",
											className: "flex-1 truncate text-brand-dark hover:underline",
											title: e,
											children: yn(e)
										}) : /* @__PURE__ */ C("span", {
											className: "flex-1 truncate text-stone-500",
											title: U._({
												id: "w7E-FA",
												values: { url: e }
											}),
											children: [
												yn(e),
												" ",
												/* @__PURE__ */ C("span", {
													className: "text-red-500",
													children: [
														"(",
														U._({ id: "1lWHP7" }),
														")"
													]
												})
											]
										}),
										/* @__PURE__ */ S("button", {
											type: "button",
											onClick: () => Re(Le.filter((t) => t !== e)),
											title: U._({ id: "t_YqKh" }),
											className: "rounded p-0.5 text-stone-400 hover:text-red-600",
											children: /* @__PURE__ */ S(fn, { className: "h-3.5 w-3.5" })
										})
									]
								}, e))
							}),
							/* @__PURE__ */ C("div", {
								className: "mt-2 flex items-center gap-2",
								children: [/* @__PURE__ */ S("form", {
									className: "flex-1",
									onSubmit: (e) => {
										e.preventDefault(), ze(de), fe("");
									},
									children: /* @__PURE__ */ S("input", {
										className: `${Dm} w-full`,
										placeholder: U._({ id: "Pvpx7b" }),
										value: de,
										onChange: (e) => fe(e.target.value)
									})
								}), g && /* @__PURE__ */ C("label", {
									className: "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
									children: [
										/* @__PURE__ */ S(Ne, { className: "h-3.5 w-3.5" }),
										pe ? /* @__PURE__ */ S(L, { id: "gANddk" }) : /* @__PURE__ */ S(L, { id: "ONWvwQ" }),
										/* @__PURE__ */ S("input", {
											type: "file",
											className: "hidden",
											disabled: pe,
											onChange: (e) => {
												Ve(e.target.files?.[0]), e.target.value = "";
											}
										})
									]
								})]
							})
						]
					}),
					_ && /* @__PURE__ */ C("section", {
						className: "mt-8 border-t border-line pt-6",
						children: [
							/* @__PURE__ */ C("span", {
								className: "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700",
								children: [/* @__PURE__ */ S(Ze, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ S(L, { id: "VbyRUy" })]
							}),
							/* @__PURE__ */ C("ul", {
								className: "mt-2 space-y-2",
								children: [ke.map((t) => /* @__PURE__ */ S(Rm, {
									root: t,
									replies: Ae.get(t.id) ?? [],
									currentUser: O,
									canReply: !!b,
									onReply: b ? async (n) => {
										let r = await b(e.id, n, t.id);
										ge((e) => [...e, r]);
									} : void 0,
									onEdit: w ? async (e, t) => {
										let n = await w(e, t);
										Oe(n);
									} : void 0,
									onDelete: T ? (e) => void De(e) : void 0,
									onReact: E ? async (e, t) => {
										Oe(await E(e, t));
									} : void 0,
									onResolve: D ? async (e) => {
										Oe(await D(t.id, e));
									} : void 0,
									renderMarkdownToHtml: j
								}, t.id)), he.length === 0 && /* @__PURE__ */ S("li", {
									className: "text-xs text-stone-400",
									children: /* @__PURE__ */ S(L, { id: "Mm72la" })
								})]
							}),
							b && /* @__PURE__ */ C("form", {
								className: "mt-3",
								onSubmit: (e) => {
									e.preventDefault(), Ee();
								},
								children: [/* @__PURE__ */ S("textarea", {
									className: "w-full resize-y rounded-xl border border-stone-200 p-3 text-xs text-stone-800 outline-none focus:border-brand focus:ring-4 focus:ring-brand/5",
									rows: 3,
									placeholder: U._({ id: "HrmW6B" }),
									value: _e,
									onChange: (e) => ve(e.target.value),
									onKeyDown: (e) => {
										e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), Ee());
									}
								}), /* @__PURE__ */ S("div", {
									className: "mt-2 flex justify-end",
									children: /* @__PURE__ */ S("button", {
										type: "submit",
										disabled: !_e.trim(),
										className: "rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40",
										children: /* @__PURE__ */ S(L, { id: "NBdIgR" })
									})
								})]
							})
						]
					}),
					k && ye.length > 0 && /* @__PURE__ */ C("section", {
						className: "mb-3 mt-8 border-t border-line pt-6",
						children: [/* @__PURE__ */ C("span", {
							className: "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700",
							children: [/* @__PURE__ */ S(pt, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ S(L, { id: "XJOV1Y" })]
						}), /* @__PURE__ */ S("ul", {
							className: "mt-2 space-y-1.5",
							children: ye.map((e, t) => /* @__PURE__ */ C("li", {
								className: "flex items-baseline gap-2 text-xs text-stone-500",
								children: [
									/* @__PURE__ */ S("span", {
										className: "font-medium text-stone-700",
										children: e.kind === "created" ? /* @__PURE__ */ S(L, { id: "d-F6q9" }) : e.kind === "updated" ? /* @__PURE__ */ S(L, { id: "-b7T3G" }) : e.kind === "archived" ? /* @__PURE__ */ S(L, { id: "TdfEV7" }) : e.kind === "restored" ? /* @__PURE__ */ S(L, { id: "o8va6N" }) : e.kind
									}),
									e.by && /* @__PURE__ */ C("span", {
										className: "text-stone-400",
										children: ["· ", e.by]
									}),
									/* @__PURE__ */ S("span", {
										className: "ml-auto whitespace-nowrap text-stone-400",
										children: e.at.slice(0, 16)
									})
								]
							}, t))
						})]
					})
				]
			}), /* @__PURE__ */ C("aside", {
				className: "max-h-[46%] shrink-0 overflow-y-auto border-t border-line bg-stone-50/70 px-5 py-5 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0",
				children: [
					/* @__PURE__ */ S("h2", {
						className: "text-xs font-semibold text-stone-800",
						children: /* @__PURE__ */ S(L, { id: "l_UFPv" })
					}),
					/* @__PURE__ */ C("div", {
						className: "mt-4 space-y-1",
						children: [
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(Tt, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "wwu18a" }),
								children: /* @__PURE__ */ S(Am, {
									value: H.icon,
									onChange: (e) => Pe({ icon: e }, !0),
									portalClassName: M
								})
							}),
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(Yt, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "uAQUqI" }),
								children: /* @__PURE__ */ S(km, {
									value: H.columnKey,
									options: n,
									onChange: (e) => Pe({ columnKey: e }, !0),
									portalClassName: M
								})
							}),
							r && /* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(Yt, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "fVlS4-" }),
								children: /* @__PURE__ */ S(km, {
									value: H.swimlaneKey ?? "",
									options: r,
									onChange: (e) => Pe({ swimlaneKey: e || null }, !0),
									disabled: i,
									portalClassName: M
								})
							}),
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(Dt, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "1hKEom" }),
								children: /* @__PURE__ */ S(km, {
									value: H.priority ?? "none",
									options: Sn.map((e) => ({
										value: e,
										label: e
									})),
									onChange: (e) => Pe({ priority: e }, !0),
									portalClassName: M
								})
							}),
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(cn, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "ojKCLU" }),
								children: a ? /* @__PURE__ */ S(km, {
									value: H.assignee ?? "",
									options: [{
										value: "",
										label: U._({ id: "EbMPZJ" })
									}, ...a],
									onChange: (e) => Pe({ assignee: e || null }, !0),
									portalClassName: M
								}) : /* @__PURE__ */ S("input", {
									className: `${Dm} w-full`,
									value: H.assignee ?? "",
									placeholder: "—",
									onChange: (e) => Pe({ assignee: e.target.value })
								})
							}),
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(Ye, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "Gpfctt" }),
								children: /* @__PURE__ */ S("input", {
									type: "date",
									className: `${Dm} w-full`,
									value: H.due ?? "",
									onChange: (e) => Pe({ due: e.target.value || null }, !0)
								})
							}),
							/* @__PURE__ */ S(Nm, {
								icon: /* @__PURE__ */ S(tn, { className: "h-4 w-4" }),
								label: /* @__PURE__ */ S(L, { id: "OYHzN1" }),
								children: o ? /* @__PURE__ */ S(jm, {
									value: Ie,
									options: o.map((e) => ({
										label: e.label,
										color: e.color
									})),
									onChange: (e) => Pe({ tags: e.map((e) => o.find((t) => t.label === e) ?? { label: e }) }, !0),
									portalClassName: M
								}) : /* @__PURE__ */ S("input", {
									className: `${Dm} w-full`,
									value: Ie.join(", "),
									placeholder: U._({ id: "S5Qbb1" }),
									onChange: (e) => Pe({ tags: e.target.value.split(",").map((e) => e.trim()).filter(Boolean).map((e) => ({ label: e })) })
								})
							})
						]
					}),
					(s?.length || c) && /* @__PURE__ */ C("div", {
						className: "mt-6 border-t border-line pt-5",
						children: [/* @__PURE__ */ S("h3", {
							className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400",
							children: /* @__PURE__ */ S(L, { id: "oPwQt4" })
						}), /* @__PURE__ */ C("div", {
							className: "mt-2 space-y-2",
							children: [s?.map((e) => /* @__PURE__ */ C("label", {
								className: "block",
								children: [/* @__PURE__ */ S("span", {
									className: "mb-1 block truncate text-[11px] text-brand-gray",
									title: e.label,
									children: e.label
								}), /* @__PURE__ */ S("input", {
									type: e.type === "number" ? "number" : e.type === "date" ? "date" : "text",
									className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
									value: H.custom?.[e.key] ?? "",
									onChange: (t) => Pe({ custom: {
										...H.custom ?? {},
										[e.key]: t.target.value
									} }, e.type === "date" || e.type === "number")
								})]
							}, e.key)), c && /* @__PURE__ */ S("form", {
								onSubmit: (e) => {
									e.preventDefault();
									let t = R.trim();
									t && (c(t), z(""));
								},
								children: /* @__PURE__ */ S("input", {
									className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
									placeholder: U._({ id: "yEbJGs" }),
									value: R,
									onChange: (e) => z(e.target.value)
								})
							})]
						})]
					}),
					u && /* @__PURE__ */ C("div", {
						className: "mt-6 border-t border-line pt-5",
						children: [/* @__PURE__ */ S("h3", {
							className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400",
							children: /* @__PURE__ */ S(L, { id: "g87L9j" })
						}), /* @__PURE__ */ C("div", {
							className: "mt-2 space-y-2",
							children: [
								/* @__PURE__ */ S(Pm, {
									label: /* @__PURE__ */ S(L, { id: "--lIxB" }),
									children: Je("blockedBy")
								}),
								/* @__PURE__ */ S(Pm, {
									label: /* @__PURE__ */ S(L, { id: "7s3WlU" }),
									children: Je("blocks")
								}),
								/* @__PURE__ */ S(Pm, {
									label: /* @__PURE__ */ S(L, { id: "hh4sEG" }),
									children: Je("relates")
								}),
								/* @__PURE__ */ S(Pm, {
									label: /* @__PURE__ */ S(L, { id: "sujToP" }),
									children: /* @__PURE__ */ S(km, {
										value: qe(H.parent ?? ""),
										options: [{
											value: "",
											label: "—"
										}, ...Ke],
										onChange: (e) => Pe({ parent: e || null }, !0),
										portalClassName: M
									})
								})
							]
						})]
					}),
					N != null && N !== !1 && N !== "" && /* @__PURE__ */ S("section", {
						"aria-label": U._({ id: "fOP7Wy" }),
						className: "mt-6 border-t border-line pt-5",
						children: N
					})
				]
			})]
		})]
	});
}
function Nm({ icon: e, label: t, children: n }) {
	return /* @__PURE__ */ C("div", {
		className: "grid min-h-10 grid-cols-[88px_minmax(0,1fr)] items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white",
		children: [/* @__PURE__ */ C("span", {
			className: "flex min-w-0 items-center gap-2 text-xs text-brand-gray",
			children: [/* @__PURE__ */ S("span", {
				className: "shrink-0 text-stone-400",
				children: e
			}), /* @__PURE__ */ S("span", {
				className: "truncate",
				children: t
			})]
		}), /* @__PURE__ */ S("div", {
			className: "min-w-0",
			children: n
		})]
	});
}
function Pm({ label: e, children: t }) {
	return /* @__PURE__ */ C("label", {
		className: "block",
		children: [/* @__PURE__ */ S("span", {
			className: "mb-1 block text-[11px] text-brand-gray",
			children: e
		}), t]
	});
}
var Fm = [
	"👍",
	"❤️",
	"🎉",
	"😄",
	"👀",
	"✅"
];
function Im({ body: e, renderMarkdownToHtml: t }) {
	let n = v(null);
	return f(() => {
		if (!t) return;
		let r = !1;
		return t(e).then((e) => {
			!r && n.current && (n.current.innerHTML = e);
		}), () => {
			r = !0;
		};
	}, [e, t]), t ? /* @__PURE__ */ S("div", {
		ref: n,
		className: "comment-markdown mt-0.5 text-stone-700"
	}) : /* @__PURE__ */ S("div", {
		className: "mt-0.5 whitespace-pre-wrap text-stone-700",
		children: e
	});
}
function Lm({ comment: e, currentUser: t, onEdit: n, onDelete: r, onReact: i, extraActions: a, renderMarkdownToHtml: o }) {
	let [s, c] = y(!1), [l, u] = y(e.body), [d, f] = y(!1), p = !!t && e.author === t, m = async () => {
		let t = l.trim();
		!t || !n || (await n(e.id, t), c(!1));
	};
	return /* @__PURE__ */ C("div", {
		className: "group/comment",
		children: [
			/* @__PURE__ */ C("div", {
				className: "flex items-baseline gap-2",
				children: [
					/* @__PURE__ */ S("span", {
						className: "font-medium text-stone-700",
						children: e.author ?? /* @__PURE__ */ S(L, { id: "C6-ZRl" })
					}),
					/* @__PURE__ */ S("span", {
						className: "text-stone-400",
						children: e.createdAt.slice(0, 16)
					}),
					e.updatedAt && e.updatedAt !== e.createdAt && /* @__PURE__ */ S("span", {
						className: "text-[10px] text-stone-300",
						children: /* @__PURE__ */ S(L, { id: "k4b5_X" })
					}),
					/* @__PURE__ */ C("span", {
						className: "ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100",
						children: [
							i && /* @__PURE__ */ S("button", {
								type: "button",
								onClick: () => f((e) => !e),
								title: U._({ id: "9OEgyT" }),
								className: "rounded p-0.5 text-stone-300 hover:text-amber-500",
								children: /* @__PURE__ */ S(Tt, { className: "h-3.5 w-3.5" })
							}),
							a,
							p && n && !s && /* @__PURE__ */ S("button", {
								type: "button",
								onClick: () => {
									u(e.body), c(!0);
								},
								title: U._({ id: "rF8SEQ" }),
								className: "rounded p-0.5 text-stone-300 hover:text-brand-dark",
								children: /* @__PURE__ */ S(Vt, { className: "h-3.5 w-3.5" })
							}),
							p && r && /* @__PURE__ */ S("button", {
								type: "button",
								onClick: () => r(e.id),
								title: U._({ id: "njJFtc" }),
								className: "rounded p-0.5 text-stone-300 hover:text-red-600",
								children: /* @__PURE__ */ S(fn, { className: "h-3.5 w-3.5" })
							})
						]
					})
				]
			}),
			s ? /* @__PURE__ */ C("div", {
				className: "mt-1",
				children: [/* @__PURE__ */ S("textarea", {
					className: "w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none",
					rows: 2,
					value: l,
					autoFocus: !0,
					onChange: (e) => u(e.target.value),
					onKeyDown: (e) => {
						e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), m()), e.key === "Escape" && c(!1);
					}
				}), /* @__PURE__ */ C("div", {
					className: "mt-1 flex justify-end gap-1",
					children: [/* @__PURE__ */ S("button", {
						type: "button",
						className: "rounded px-2 py-0.5 text-xs text-stone-500 hover:bg-stone-100",
						onClick: () => c(!1),
						children: /* @__PURE__ */ S(L, { id: "dEgA5A" })
					}), /* @__PURE__ */ S("button", {
						type: "button",
						className: "rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40",
						disabled: !l.trim(),
						onClick: () => void m(),
						children: /* @__PURE__ */ S(L, { id: "tfDRzk" })
					})]
				})]
			}) : /* @__PURE__ */ S(Im, {
				body: e.body,
				renderMarkdownToHtml: o
			}),
			((e.reactions?.length ?? 0) > 0 || d) && /* @__PURE__ */ C("div", {
				className: "mt-1 flex flex-wrap items-center gap-1",
				children: [(e.reactions ?? []).map((t) => /* @__PURE__ */ C("button", {
					type: "button",
					disabled: !i,
					onClick: () => void i?.(e.id, t.emoji),
					className: `inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${t.mine ? "border-brand/40 bg-brand-soft/40 text-brand-dark" : "border-stone-200 bg-white text-stone-600"}`,
					title: t.mine ? U._({ id: "KeYrQ5" }) : U._({ id: "UDb2YD" }),
					children: [
						t.emoji,
						" ",
						t.count
					]
				}, t.emoji)), d && i && /* @__PURE__ */ S("span", {
					className: "inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-white px-1 py-0.5",
					children: Fm.map((t) => /* @__PURE__ */ S("button", {
						type: "button",
						className: "rounded px-0.5 text-[13px] hover:bg-stone-100",
						onClick: () => {
							f(!1), i(e.id, t);
						},
						children: t
					}, t))
				})]
			})
		]
	});
}
function Rm({ root: e, replies: t, currentUser: n, canReply: r, onReply: i, onEdit: a, onDelete: o, onReact: s, onResolve: c, renderMarkdownToHtml: l }) {
	let [u, d] = y(!1), [f, p] = y(""), [m, h] = y(!1), g = !!e.resolvedAt, _ = async () => {
		let e = f.trim();
		!e || !i || (await i(e), p(""), d(!1));
	};
	return g && !m ? /* @__PURE__ */ S("li", {
		className: "rounded-lg border border-stone-100 bg-stone-50/40 text-xs",
		children: /* @__PURE__ */ C("button", {
			type: "button",
			className: "flex w-full items-center gap-2 p-2 text-left text-stone-400 hover:text-stone-600",
			onClick: () => h(!0),
			title: U._({ id: "pKKcSl" }),
			children: [
				/* @__PURE__ */ S($e, { className: "h-3.5 w-3.5 shrink-0 text-emerald-500" }),
				/* @__PURE__ */ C("span", {
					className: "min-w-0 flex-1 truncate",
					children: [
						/* @__PURE__ */ S(L, { id: "O6H89R" }),
						" · ",
						e.body.split("\n")[0]
					]
				}),
				t.length > 0 && /* @__PURE__ */ S("span", {
					className: "shrink-0 text-stone-300",
					children: t.length
				})
			]
		})
	}) : /* @__PURE__ */ C("li", {
		className: `rounded-lg border p-2 text-xs ${g ? "border-emerald-100 bg-emerald-50/30" : "border-stone-100 bg-stone-50/60"}`,
		children: [
			/* @__PURE__ */ S(Lm, {
				comment: e,
				currentUser: n,
				onEdit: a,
				onDelete: o,
				onReact: s,
				renderMarkdownToHtml: l,
				extraActions: /* @__PURE__ */ C(x, { children: [r && i && /* @__PURE__ */ S("button", {
					type: "button",
					onClick: () => d((e) => !e),
					title: U._({ id: "ImOQa9" }),
					className: "rounded p-0.5 text-stone-300 hover:text-brand-dark",
					children: /* @__PURE__ */ S(Le, { className: "h-3.5 w-3.5" })
				}), c && /* @__PURE__ */ S("button", {
					type: "button",
					onClick: () => void c(!g),
					title: g ? U._({ id: "QmZYQP" }) : U._({ id: "9OH3W0" }),
					className: `rounded p-0.5 ${g ? "text-emerald-500 hover:text-stone-400" : "text-stone-300 hover:text-emerald-600"}`,
					children: /* @__PURE__ */ S($e, { className: "h-3.5 w-3.5" })
				})] })
			}),
			t.length > 0 && /* @__PURE__ */ S("ul", {
				className: "mt-2 space-y-2 border-l-2 border-stone-100 pl-2",
				children: t.map((e) => /* @__PURE__ */ S("li", { children: /* @__PURE__ */ S(Lm, {
					comment: e,
					currentUser: n,
					onEdit: a,
					onDelete: o,
					onReact: s,
					renderMarkdownToHtml: l
				}) }, e.id))
			}),
			g && /* @__PURE__ */ S("button", {
				type: "button",
				className: "mt-1.5 text-[10px] text-stone-400 hover:text-stone-600",
				onClick: () => h(!1),
				children: /* @__PURE__ */ S(L, { id: "66g_UW" })
			}),
			u && /* @__PURE__ */ C("form", {
				className: "mt-2 border-l-2 border-stone-100 pl-2",
				onSubmit: (e) => {
					e.preventDefault(), _();
				},
				children: [/* @__PURE__ */ S("textarea", {
					className: "w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none",
					rows: 2,
					autoFocus: !0,
					placeholder: U._({ id: "MmYpxT" }),
					value: f,
					onChange: (e) => p(e.target.value),
					onKeyDown: (e) => {
						e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), _()), e.key === "Escape" && d(!1);
					}
				}), /* @__PURE__ */ S("div", {
					className: "mt-1 flex justify-end",
					children: /* @__PURE__ */ S("button", {
						type: "submit",
						disabled: !f.trim(),
						className: "rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40",
						children: /* @__PURE__ */ S(L, { id: "ImOQa9" })
					})
				})]
			})
		]
	});
}
//#endregion
//#region ../../shared/components/board/BoardFilterPopover.tsx
function zm(e, t) {
	let n = new Set(e ?? []);
	return n.has(t) ? n.delete(t) : n.add(t), n.size > 0 ? [...n] : void 0;
}
function Bm({ selected: e, children: t, onClick: n, selectionRole: r = "checkbox" }) {
	return /* @__PURE__ */ C("button", {
		type: "button",
		role: r,
		"aria-checked": e,
		onClick: n,
		className: `flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition ${e ? "bg-brand-soft/70 font-medium text-brand-dark" : "text-stone-600 hover:bg-stone-50"}`,
		children: [/* @__PURE__ */ S("span", {
			className: `flex h-4 w-4 shrink-0 items-center justify-center border ${r === "radio" ? "rounded-full" : "rounded"} ${e ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`,
			"aria-hidden": !0,
			children: e && /* @__PURE__ */ S(tt, { className: "h-3 w-3" })
		}), /* @__PURE__ */ S("span", {
			className: "min-w-0 flex-1 truncate",
			children: t
		})]
	});
}
function Vm({ title: e, children: t }) {
	return /* @__PURE__ */ C("section", {
		className: "border-t border-line px-3 py-3 first:border-t-0",
		children: [/* @__PURE__ */ S("h3", {
			className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-gray",
			children: e
		}), t]
	});
}
function Hm(e) {
	return e === "overdue" ? U._({ id: "ddrz1m" }) : e === "today" ? U._({ id: "1iShX0" }) : e === "nextSevenDays" ? U._({ id: "3CIp19" }) : U._({ id: "VXh9CK" });
}
function Um({ filters: e, onChange: t, assignees: r, tags: i, currentUser: a, visibleCount: o, totalCount: s, portalClassName: c }) {
	let l = sr(e), u = c ? ` ${c}` : "", d = (n, r) => t({
		...e,
		[n]: r
	}), f = (n) => {
		let r = { ...e };
		delete r[n], t(r);
	}, p = [];
	if (e.priorities?.length) {
		let t = e.priorities.map((e) => e === "none" ? U._({ id: "-X4ual" }) : e);
		p.push({
			key: "priorities",
			label: U._({
				id: "-3Qbcm",
				values: { 0: t.join(", ") }
			})
		});
	}
	return e.assignees?.length && p.push({
		key: "assignees",
		label: U._({
			id: "vJvZPY",
			values: { 0: e.assignees.map((e) => e || U._({ id: "EbMPZJ" })).join(", ") }
		})
	}), e.tags?.length && p.push({
		key: "tags",
		label: U._({
			id: "5Oy0YM",
			values: { 0: e.tags.join(", ") }
		})
	}), e.due && p.push({
		key: "due",
		label: Hm(e.due)
	}), e.blocked && p.push({
		key: "blocked",
		label: U._({ id: "32TndD" })
	}), e.mine && p.push({
		key: "mine",
		label: U._({ id: "YDa2KG" })
	}), e.missingRow && p.push({
		key: "missingRow",
		label: U._({ id: "WSbuWy" })
	}), /* @__PURE__ */ C(n, { children: [/* @__PURE__ */ C(lm, {
		className: "relative",
		children: [/* @__PURE__ */ C(im, {
			className: `inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition ${l > 0 ? "border-brand/40 bg-brand-soft/60 font-medium text-brand-dark" : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
			"aria-label": l > 0 ? U._({
				id: "obId50",
				values: { activeCount: l }
			}) : U._({ id: "cSev-j" }),
			children: [
				/* @__PURE__ */ S(kt, { className: "h-3.5 w-3.5" }),
				/* @__PURE__ */ S(L, { id: "cSev-j" }),
				l > 0 && /* @__PURE__ */ S("span", {
					className: "rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white",
					children: l
				}),
				/* @__PURE__ */ S(rt, { className: "h-3 w-3 text-stone-400" })
			]
		}), /* @__PURE__ */ C(sm, {
			anchor: "bottom start",
			className: `z-40 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-emerald-950/10 [--anchor-gap:6px] focus:outline-none${u}`,
			children: [/* @__PURE__ */ C("div", {
				className: "flex min-h-12 items-center gap-3 px-4",
				children: [/* @__PURE__ */ C("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ S("span", {
						className: "block text-xs font-semibold text-stone-800",
						children: /* @__PURE__ */ S(L, { id: "02N8r0" })
					}), /* @__PURE__ */ S("span", {
						className: "block text-[10px] text-brand-gray",
						children: /* @__PURE__ */ S(L, {
							id: "7pBic4",
							values: {
								visibleCount: o,
								totalCount: s
							}
						})
					})]
				}), l > 0 && /* @__PURE__ */ S("button", {
					type: "button",
					onClick: () => t({}),
					className: "rounded-lg px-2 py-1 text-[11px] font-medium text-brand-dark hover:bg-brand-soft",
					children: /* @__PURE__ */ S(L, { id: "yYxB17" })
				})]
			}), /* @__PURE__ */ C("div", {
				className: "max-h-[min(70vh,34rem)] overflow-y-auto",
				children: [
					/* @__PURE__ */ S(Vm, {
						title: /* @__PURE__ */ S(L, { id: "1hKEom" }),
						children: /* @__PURE__ */ S("div", {
							className: "grid grid-cols-2 gap-1",
							children: Cn.map((t) => /* @__PURE__ */ S(Bm, {
								selected: e.priorities?.includes(t) ?? !1,
								onClick: () => d("priorities", zm(e.priorities, t)),
								children: t === "none" ? U._({ id: "-X4ual" }) : t
							}, t))
						})
					}),
					/* @__PURE__ */ S(Vm, {
						title: /* @__PURE__ */ S(L, { id: "ojKCLU" }),
						children: /* @__PURE__ */ C("div", {
							className: "space-y-1",
							children: [
								a && /* @__PURE__ */ S(Bm, {
									selected: !!e.mine,
									onClick: () => d("mine", !e.mine || void 0),
									children: /* @__PURE__ */ C("span", {
										className: "inline-flex items-center gap-1.5",
										children: [/* @__PURE__ */ S(on, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "YDa2KG" })]
									})
								}),
								/* @__PURE__ */ S(Bm, {
									selected: e.assignees?.includes("") ?? !1,
									onClick: () => d("assignees", zm(e.assignees, "")),
									children: /* @__PURE__ */ S(L, { id: "EbMPZJ" })
								}),
								r.map((t) => /* @__PURE__ */ S(Bm, {
									selected: e.assignees?.includes(t) ?? !1,
									onClick: () => d("assignees", zm(e.assignees, t)),
									children: t
								}, t))
							]
						})
					}),
					i.length > 0 && /* @__PURE__ */ S(Vm, {
						title: /* @__PURE__ */ S(L, { id: "h8DugX" }),
						children: /* @__PURE__ */ S("div", {
							className: "space-y-1",
							children: i.map((t) => /* @__PURE__ */ S(Bm, {
								selected: e.tags?.includes(t) ?? !1,
								onClick: () => d("tags", zm(e.tags, t)),
								children: t
							}, t))
						})
					}),
					/* @__PURE__ */ S(Vm, {
						title: /* @__PURE__ */ S(L, { id: "XicmhT" }),
						children: /* @__PURE__ */ S("div", {
							className: "grid grid-cols-2 gap-1",
							role: "radiogroup",
							"aria-label": U._({ id: "XicmhT" }),
							children: [
								"overdue",
								"today",
								"nextSevenDays",
								"none"
							].map((t) => /* @__PURE__ */ S(Bm, {
								selected: e.due === t,
								selectionRole: "radio",
								onClick: () => d("due", t),
								children: Hm(t)
							}, t))
						})
					}),
					/* @__PURE__ */ C(Vm, {
						title: /* @__PURE__ */ S(L, { id: "YFdnVT" }),
						children: [/* @__PURE__ */ S(Bm, {
							selected: !!e.blocked,
							onClick: () => d("blocked", !e.blocked || void 0),
							children: /* @__PURE__ */ C("span", {
								className: "inline-flex items-center gap-1.5",
								children: [/* @__PURE__ */ S(Ft, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "9YTdO7" })]
							})
						}), e.missingRow && /* @__PURE__ */ S("div", {
							className: "mt-1",
							children: /* @__PURE__ */ S(Bm, {
								selected: !0,
								onClick: () => d("missingRow", void 0),
								children: /* @__PURE__ */ S(L, { id: "JPB7_s" })
							})
						})]
					})
				]
			})]
		})]
	}), p.map((e) => /* @__PURE__ */ C("button", {
		type: "button",
		onClick: () => f(e.key),
		title: U._({ id: "rn2_2V" }),
		"aria-label": U._({
			id: "rT-mCe",
			values: { 0: e.label }
		}),
		className: "inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/45 px-2 text-[11px] font-medium text-brand-dark hover:border-brand/40 hover:bg-brand-soft",
		children: [/* @__PURE__ */ S("span", {
			className: "truncate",
			children: e.label
		}), /* @__PURE__ */ S(fn, { className: "h-3 w-3 shrink-0" })]
	}, e.key))] });
}
//#endregion
//#region ../../shared/components/board/BoardTable.tsx
function Wm({ cards: e, statusName: t, today: n, doneKey: r, selectedId: i, onSelect: a }) {
	let o = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-brand-gray", s = "px-3 py-2 align-middle", c = /* @__PURE__ */ S("span", {
		className: "text-stone-300",
		children: "—"
	});
	return /* @__PURE__ */ S("div", {
		className: "min-h-0 flex-1 overflow-auto p-4",
		children: /* @__PURE__ */ C("table", {
			className: "w-full border-collapse text-sm",
			children: [/* @__PURE__ */ S("thead", {
				className: "sticky top-0 bg-[#fbfdfb]",
				children: /* @__PURE__ */ C("tr", {
					className: "border-b border-black/[0.08]",
					children: [
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "MHrjPM" })
						}),
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "uAQUqI" })
						}),
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "1hKEom" })
						}),
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "ojKCLU" })
						}),
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "Gpfctt" })
						}),
						/* @__PURE__ */ S("th", {
							className: o,
							children: /* @__PURE__ */ S(L, { id: "OYHzN1" })
						})
					]
				})
			}), /* @__PURE__ */ C("tbody", { children: [e.map((e) => {
				let o = e.due && e.due < n && e.columnKey !== r;
				return /* @__PURE__ */ C("tr", {
					role: "button",
					tabIndex: 0,
					onClick: () => a(e),
					onKeyDown: (t) => {
						t.key === "Enter" && a(e);
					},
					className: `cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-brand-soft/30 ${i === e.id ? "bg-brand-soft/40" : ""}`,
					children: [
						/* @__PURE__ */ S("td", {
							className: `${s} text-stone-800`,
							children: /* @__PURE__ */ C("span", {
								className: "flex items-center gap-1.5",
								children: [
									e.icon && /* @__PURE__ */ S("span", { children: e.icon }),
									/* @__PURE__ */ S("span", {
										className: "truncate",
										children: e.title
									}),
									(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ C("span", {
										className: `inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
										children: [
											/* @__PURE__ */ S($e, { className: "h-3 w-3" }),
											e.taskDone,
											"/",
											e.taskTotal
										]
									})
								]
							})
						}),
						/* @__PURE__ */ S("td", {
							className: `${s} text-stone-600`,
							children: t(e.columnKey)
						}),
						/* @__PURE__ */ S("td", {
							className: s,
							children: e.priority && e.priority !== "none" ? /* @__PURE__ */ S("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Tn[e.priority] ?? "bg-stone-100 text-stone-500"}`,
								children: e.priority
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: `${s} text-stone-600`,
							children: e.assignee ? /* @__PURE__ */ C("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ S(cn, { className: "h-3.5 w-3.5 text-brand-gray" }), e.assignee]
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: s,
							children: e.due ? /* @__PURE__ */ C("span", {
								className: `inline-flex items-center gap-1 ${o ? "font-medium text-red-600" : "text-stone-600"}`,
								children: [/* @__PURE__ */ S(Ye, { className: "h-3.5 w-3.5" }), e.due]
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: s,
							children: e.tags.length ? /* @__PURE__ */ S("span", {
								className: "flex flex-wrap gap-1",
								children: e.tags.map((e) => /* @__PURE__ */ C("span", {
									className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
									style: { backgroundColor: e.color ? `${e.color}22` : void 0 },
									children: [/* @__PURE__ */ S(tn, { className: "h-3 w-3" }), e.label]
								}, e.label))
							}) : c
						})
					]
				}, e.id);
			}), e.length === 0 && /* @__PURE__ */ S("tr", { children: /* @__PURE__ */ S("td", {
				colSpan: 6,
				className: "px-3 py-8 text-center text-sm text-stone-400",
				children: /* @__PURE__ */ S(L, { id: "Zot9XS" })
			}) })] })]
		})
	});
}
//#endregion
//#region ../../shared/components/board/BoardCalendar.tsx
var Gm = Array.from({ length: 7 }, (e, t) => new Date(2023, 0, 1 + t).toLocaleDateString(void 0, { weekday: "short" }));
function Km({ cards: e, today: t, doneKey: n, mode: r, onModeChange: i, selectedId: a, onSelect: o }) {
	let [s, c] = y(() => hr()), l = _r(e), [u, d] = s.split("-"), f = new Date(Number(u), Number(d) - 1, 1).toLocaleDateString(void 0, {
		year: "numeric",
		month: "long"
	}), p = (e) => !!e.due && e.due < t && e.columnKey !== n, m = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:border-brand/40 hover:text-brand-dark", h = (e) => `rounded-md px-2 py-1 text-xs font-medium ${r === e ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`, g = (e, t) => {
		let n = p(e);
		return /* @__PURE__ */ C("button", {
			type: "button",
			onClick: () => o(e),
			title: e.title,
			className: `flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] transition-colors ${a === e.id ? "bg-brand-soft/60" : "bg-stone-100/70 hover:bg-brand-soft/40"} ${n ? "text-red-600" : "text-stone-700"}`,
			children: [
				e.priority && e.priority !== "none" && /* @__PURE__ */ S("span", { className: `h-1.5 w-1.5 shrink-0 rounded-full ${Tn[e.priority]?.split(" ")[0] ?? "bg-stone-300"}` }),
				e.icon && /* @__PURE__ */ S("span", {
					className: "shrink-0",
					children: e.icon
				}),
				/* @__PURE__ */ S("span", {
					className: "truncate",
					children: e.title
				}),
				!t && (e.taskTotal ?? 0) > 0 && /* @__PURE__ */ C("span", {
					className: "ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] text-stone-400",
					children: [
						/* @__PURE__ */ S($e, { className: "h-2.5 w-2.5" }),
						e.taskDone,
						"/",
						e.taskTotal
					]
				})
			]
		}, e.id);
	}, _ = /* @__PURE__ */ C("div", {
		className: "flex items-center gap-2 border-b border-black/[0.04] px-4 py-2",
		children: [r === "month" && /* @__PURE__ */ C(x, { children: [
			/* @__PURE__ */ S("button", {
				type: "button",
				className: m,
				title: U._({ id: "1xwZj_" }),
				"aria-label": U._({ id: "1xwZj_" }),
				onClick: () => c((e) => gr(e, -1)),
				children: /* @__PURE__ */ S(at, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ S("button", {
				type: "button",
				className: m,
				title: U._({ id: "g8JmSC" }),
				"aria-label": U._({ id: "g8JmSC" }),
				onClick: () => c((e) => gr(e, 1)),
				children: /* @__PURE__ */ S(st, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ S("span", {
				className: "min-w-[8rem] text-sm font-medium text-brand-dark",
				children: f
			}),
			/* @__PURE__ */ S("button", {
				type: "button",
				className: "rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				onClick: () => c(hr()),
				children: /* @__PURE__ */ S(L, { id: "ecUA8p" })
			})
		] }), /* @__PURE__ */ C("div", {
			className: "ml-auto inline-flex items-center rounded-lg border border-stone-200 p-0.5",
			children: [/* @__PURE__ */ S("button", {
				type: "button",
				className: h("month"),
				onClick: () => i("month"),
				children: /* @__PURE__ */ S(L, { id: "HajiZl" })
			}), /* @__PURE__ */ S("button", {
				type: "button",
				className: h("agenda"),
				onClick: () => i("agenda"),
				children: /* @__PURE__ */ S(L, { id: "xDsmP9" })
			})]
		})]
	});
	if (r === "agenda") {
		let n = fr(e, "due"), r = n.filter((e) => mr(e.due)), i = n.filter((e) => !mr(e.due)), a = "";
		return /* @__PURE__ */ C("div", {
			className: "flex min-h-0 flex-1 flex-col",
			children: [_, /* @__PURE__ */ C("div", {
				className: "min-h-0 flex-1 overflow-auto p-4",
				children: [
					r.length === 0 && i.length === 0 && /* @__PURE__ */ S("div", {
						className: "px-3 py-8 text-center text-sm text-stone-400",
						children: /* @__PURE__ */ S(L, { id: "Zot9XS" })
					}),
					r.map((e) => {
						let n = e.due !== a;
						return a = e.due, /* @__PURE__ */ C("div", { children: [n && /* @__PURE__ */ C("div", {
							className: `mt-3 mb-1 text-xs font-medium ${e.due === t ? "text-brand-dark" : "text-brand-gray"}`,
							children: [e.due, e.due === t && /* @__PURE__ */ S("span", {
								className: "ml-1 rounded bg-brand-soft px-1 text-[10px] text-brand-dark",
								children: /* @__PURE__ */ S(L, { id: "ecUA8p" })
							})]
						}), /* @__PURE__ */ S("div", {
							className: "max-w-xl",
							children: g(e, !1)
						})] }, e.id);
					}),
					i.length > 0 && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", {
						className: "mt-4 mb-1 text-xs font-medium text-stone-400",
						children: /* @__PURE__ */ S(L, { id: "cJ44lA" })
					}), /* @__PURE__ */ S("div", {
						className: "max-w-xl space-y-0.5",
						children: i.map((e) => g(e, !1))
					})] })
				]
			})]
		});
	}
	let v = vr(s);
	return /* @__PURE__ */ C("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			_,
			/* @__PURE__ */ S("div", {
				className: "grid grid-cols-7 border-b border-black/[0.04] bg-[#fbfdfb]",
				children: Gm.map((e) => /* @__PURE__ */ S("div", {
					className: "px-2 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-brand-gray",
					children: e
				}, e))
			}),
			/* @__PURE__ */ S("div", {
				className: "grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto",
				children: v.flat().map((e) => {
					let n = e.slice(0, 7) === s, r = e === t, i = l.get(e) ?? [];
					return /* @__PURE__ */ C("div", {
						className: `flex min-h-[5.5rem] flex-col gap-0.5 border-b border-r border-black/[0.04] p-1 ${n ? "" : "bg-stone-50/60"}`,
						children: [/* @__PURE__ */ S("div", {
							className: `mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${r ? "bg-brand text-white" : n ? "text-stone-500" : "text-stone-300"}`,
							children: Number(e.slice(8, 10))
						}), /* @__PURE__ */ C("div", {
							className: "flex flex-col gap-0.5 overflow-hidden",
							children: [i.slice(0, 4).map((e) => g(e, !0)), i.length > 4 && /* @__PURE__ */ C("span", {
								className: "px-1 text-[10px] text-stone-400",
								children: ["+", i.length - 4]
							})]
						})]
					}, e);
				})
			})
		]
	});
}
//#endregion
//#region ../../shared/components/board/CardCreateDialog.tsx
function qm({ open: e, boardTitle: t, laneName: n, initialStatus: r, initialPriority: i = "none", initialAssignee: a = "", statusOptions: o, assigneeOptions: s, tagOptions: c, portalClassName: l, onClose: u, onCreate: d }) {
	let [p, m] = y(""), [h, g] = y(""), [_, b] = y(r), [x, w] = y(i), [T, E] = y(a), [D, O] = y(""), [k, A] = y([]), [j, M] = y(""), [N, P] = y(!1), [F, I] = y(""), ee = v(null), R = l ? ` ${l}` : "";
	f(() => {
		e && (m(""), g(""), b(r), w(i), E(a), O(""), A([]), M(""), P(!1), I(""), window.setTimeout(() => ee.current?.focus(), 0));
	}, [
		a,
		i,
		r,
		e
	]);
	let z = async () => {
		let e = p.trim();
		if (!(!e || N)) {
			P(!0), I("");
			try {
				await d({
					title: e,
					columnKey: _,
					priority: x,
					assignee: T || null,
					due: D || null,
					notes: h,
					tags: k.map((e) => c?.find((t) => t.label === e) ?? { label: e })
				}) !== !1 && u();
			} catch {
				I(U._({ id: "klk7Go" }));
			} finally {
				P(!1);
			}
		}
	};
	return /* @__PURE__ */ C(ff, {
		open: e,
		onClose: N ? () => {} : u,
		className: `fixed inset-0 z-50${R}`,
		children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/25 backdrop-blur-[3px]${R}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-6${R}`,
			children: /* @__PURE__ */ C(lf, {
				className: `flex min-h-[430px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_90px_rgba(28,25,23,0.22)] ring-1 ring-black/[0.06]${R}`,
				onKeyDown: (e) => {
					e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), z());
				},
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex items-center gap-2 px-6 pb-3 pt-5 text-xs text-brand-gray",
						children: [
							/* @__PURE__ */ S("span", {
								className: "max-w-[15rem] truncate font-medium text-stone-600",
								children: t
							}),
							/* @__PURE__ */ S(st, { className: "h-3.5 w-3.5 shrink-0 text-stone-300" }),
							/* @__PURE__ */ S(df, {
								className: "font-semibold text-stone-800",
								children: /* @__PURE__ */ S(L, { id: "pnrmSP" })
							}),
							/* @__PURE__ */ S("span", {
								className: "ml-auto rounded-full bg-brand-soft px-2 py-1 font-medium text-brand-dark",
								children: n
							}),
							/* @__PURE__ */ S("button", {
								type: "button",
								onClick: u,
								disabled: N,
								title: U._({ id: "yz7wBu" }),
								"aria-label": U._({ id: "yz7wBu" }),
								className: "ml-1 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40",
								children: /* @__PURE__ */ S(fn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "min-h-0 flex-1 px-6 pb-5",
						children: [/* @__PURE__ */ S("input", {
							ref: ee,
							value: p,
							onChange: (e) => m(e.target.value),
							placeholder: U._({ id: "ZH7TVS" }),
							"aria-label": U._({ id: "ZH7TVS" }),
							className: "w-full bg-transparent text-[1.35rem] font-semibold tracking-[-0.02em] text-stone-900 outline-none placeholder:text-stone-300"
						}), /* @__PURE__ */ S("textarea", {
							value: h,
							onChange: (e) => g(e.target.value),
							placeholder: U._({ id: "3ESfuy" }),
							"aria-label": U._({ id: "Nu4oKW" }),
							className: "mt-3 min-h-44 w-full resize-none bg-transparent text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400"
						})]
					}),
					/* @__PURE__ */ S("div", {
						className: "border-t border-line px-5 py-3",
						children: /* @__PURE__ */ C("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ S(Jm, {
									icon: /* @__PURE__ */ S(Dt, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ S(km, {
										value: _,
										options: o,
										onChange: b,
										portalClassName: l
									})
								}),
								/* @__PURE__ */ S(Jm, {
									icon: /* @__PURE__ */ S(Dt, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ S(km, {
										value: x,
										options: Sn.map((e) => ({
											value: e,
											label: e
										})),
										onChange: w,
										portalClassName: l
									})
								}),
								/* @__PURE__ */ S(Jm, {
									icon: /* @__PURE__ */ S(cn, { className: "h-3.5 w-3.5" }),
									children: s ? /* @__PURE__ */ S(km, {
										value: T,
										options: [{
											value: "",
											label: U._({ id: "EbMPZJ" })
										}, ...s],
										onChange: E,
										portalClassName: l
									}) : /* @__PURE__ */ S("input", {
										value: T,
										onChange: (e) => E(e.target.value),
										placeholder: U._({ id: "EbMPZJ" }),
										"aria-label": U._({ id: "ojKCLU" }),
										className: `${Dm} w-28`
									})
								}),
								/* @__PURE__ */ S(Jm, {
									icon: /* @__PURE__ */ S(tn, { className: "h-3.5 w-3.5" }),
									children: c ? /* @__PURE__ */ S(jm, {
										value: k,
										options: c.map((e) => ({
											label: e.label,
											color: e.color
										})),
										onChange: A,
										portalClassName: l
									}) : /* @__PURE__ */ S("input", {
										value: j,
										onChange: (e) => {
											M(e.target.value), A(e.target.value.split(",").map((e) => e.trim()).filter(Boolean));
										},
										placeholder: U._({ id: "cfaWH-" }),
										"aria-label": U._({ id: "OYHzN1" }),
										className: `${Dm} w-28`
									})
								}),
								/* @__PURE__ */ S(Jm, {
									icon: /* @__PURE__ */ S(Ye, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ S("input", {
										type: "date",
										value: D,
										onChange: (e) => O(e.target.value),
										"aria-label": U._({ id: "Gpfctt" }),
										className: Dm
									})
								})
							]
						})
					}),
					/* @__PURE__ */ C("div", {
						className: "flex items-center gap-3 border-t border-line bg-stone-50/70 px-5 py-3",
						children: [
							F ? /* @__PURE__ */ S("span", {
								role: "alert",
								className: "text-[11px] font-medium text-red-600",
								children: F
							}) : /* @__PURE__ */ S("span", {
								className: "text-[11px] text-stone-400",
								children: /* @__PURE__ */ S(L, { id: "JKsLFA" })
							}),
							/* @__PURE__ */ S("span", {
								className: "ml-auto hidden text-[11px] text-stone-400 sm:inline",
								children: /* @__PURE__ */ S(L, { id: "3dmm5B" })
							}),
							/* @__PURE__ */ S("button", {
								type: "button",
								disabled: !p.trim() || N,
								onClick: () => void z(),
								className: "rounded-lg bg-brand-dark px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40",
								children: N ? /* @__PURE__ */ S(L, { id: "_DwR-n" }) : /* @__PURE__ */ S(L, { id: "dsLT3m" })
							})
						]
					})
				]
			})
		})]
	});
}
function Jm({ icon: e, children: t }) {
	return /* @__PURE__ */ C("div", {
		className: "flex min-h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-1.5 text-stone-400 shadow-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-1 [&_button]:shadow-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-1 [&_input]:shadow-none",
		children: [e, /* @__PURE__ */ S("div", {
			className: "min-w-24 text-stone-700",
			children: t
		})]
	});
}
//#endregion
//#region ../../shared/components/board/StatusActionsMenu.tsx
function Ym({ column: e, siblings: t, actions: n, doneKey: r, orientation: i, portalClassName: a, buttonClassName: o = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
	let s = t.findIndex((t) => t.key === e.key), c = r === e.key;
	if (!(n.renameColumn || n.reorderColumns || n.toggleDoneColumn || n.setColumnLimit || n.setColumnColor || n.deleteColumn)) return null;
	let l = a ? ` ${a}` : "", u = s > 0 ? t[s - 1] : void 0, d = s >= 0 && s < t.length - 1 ? t[s + 1] : void 0;
	return /* @__PURE__ */ C(Ap, {
		as: "div",
		className: "relative shrink-0",
		children: [/* @__PURE__ */ S(wp, {
			title: U._({ id: "YHjvGb" }),
			"aria-label": U._({
				id: "RlLl3G",
				values: { 0: e.name }
			}),
			className: o,
			children: /* @__PURE__ */ S(yt, { className: "h-4 w-4" })
		}), /* @__PURE__ */ C(Tp, {
			anchor: "bottom end",
			className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${l}`,
			children: [
				n.renameColumn && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.renameColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(Ut, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
				}) }),
				n.reorderColumns && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: !u,
					"aria-disabled": !u,
					onClick: () => {
						u && n.reorderColumns?.(e.key, u.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [S(i === "horizontal" ? Te : Fe, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ S(L, { id: "iSLA_r" }) : /* @__PURE__ */ S(L, { id: "QyioBP" })]
				}) }), /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: !d,
					"aria-disabled": !d,
					onClick: () => {
						d && n.reorderColumns?.(e.key, d.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [S(i === "horizontal" ? ke : Ce, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ S(L, { id: "Ubl2by" }) : /* @__PURE__ */ S(L, { id: "3Ib6FN" })]
				}) })] }),
				n.toggleDoneColumn && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.toggleDoneColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S($e, { className: "h-3.5 w-3.5" }), c ? /* @__PURE__ */ S(L, { id: "G4qrLy" }) : /* @__PURE__ */ S(L, { id: "wtw-au" })]
				}) }),
				n.setColumnLimit && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.setColumnLimit?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(kt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Iw6WJa" })]
				}) }),
				n.setColumnColor && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ C("div", {
					className: "px-3 py-2",
					children: [/* @__PURE__ */ S("span", {
						className: "text-[11px] text-brand-gray",
						children: /* @__PURE__ */ S(L, { id: "jZlrte" })
					}), /* @__PURE__ */ C("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [En.map((t) => /* @__PURE__ */ S("button", {
							type: "button",
							onClick: () => void n.setColumnColor?.(e.key, t),
							title: t,
							className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
							style: { backgroundColor: t }
						}, t)), /* @__PURE__ */ S("button", {
							type: "button",
							title: U._({ id: "H_SQFv" }),
							onClick: () => void n.setColumnColor?.(e.key, null),
							className: "flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10",
							children: /* @__PURE__ */ S(fn, { className: "h-3 w-3 text-stone-400" })
						})]
					})]
				})] }),
				n.deleteColumn && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: t.length <= 1,
					"aria-disabled": t.length <= 1,
					onClick: () => {
						t.length > 1 && n.deleteColumn?.(e.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 aria-disabled:opacity-40 data-[focus]:bg-red-50",
					children: [/* @__PURE__ */ S(rn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
				}) })] })
			]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/StatusManagerDialog.tsx
function Xm({ open: e, config: t, actions: n, portalClassName: r, onClose: i }) {
	let [a, o] = y(!1), [s, c] = y(""), l = r ? ` ${r}` : "", u = t.doneColumn ?? "done";
	return /* @__PURE__ */ C(ff, {
		open: e,
		onClose: i,
		className: `relative z-40${l}`,
		children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${l}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${l}`,
			children: /* @__PURE__ */ C(lf, {
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${l}`,
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ S("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ S(qt, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ C("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ S(df, {
									className: "text-base font-semibold tracking-tight text-stone-900",
									children: /* @__PURE__ */ S(L, { id: "rvpMpc" })
								}), /* @__PURE__ */ S("p", {
									className: "mt-1 text-xs leading-5 text-brand-gray",
									children: /* @__PURE__ */ S(L, { id: "0gvHNl" })
								})]
							}),
							/* @__PURE__ */ S("button", {
								type: "button",
								onClick: i,
								title: U._({ id: "yz7wBu" }),
								"aria-label": U._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
								children: /* @__PURE__ */ S(fn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [/* @__PURE__ */ S("ul", {
							className: "space-y-1",
							"aria-label": U._({ id: "Db4W3_" }),
							children: t.columns.map((e) => {
								let i = u === e.key;
								return /* @__PURE__ */ C("li", {
									className: "group flex min-h-12 items-center gap-2 rounded-xl px-2 hover:bg-stone-50",
									children: [
										/* @__PURE__ */ S("span", {
											className: "h-4 w-4 shrink-0 rounded-full bg-stone-300 ring-1 ring-black/10",
											style: e.color ? { backgroundColor: e.color } : void 0
										}),
										/* @__PURE__ */ C("span", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ S("span", {
												className: "block truncate text-xs font-semibold text-stone-800",
												children: e.name
											}), /* @__PURE__ */ C("span", {
												className: "mt-0.5 block truncate text-[10px] text-brand-gray",
												children: [
													/* @__PURE__ */ S(L, { id: "YNYued" }),
													": ",
													/* @__PURE__ */ S("code", { children: e.key })
												]
											})]
										}),
										e.limit != null && /* @__PURE__ */ S("span", {
											className: "rounded bg-stone-100 px-1.5 py-0.5 text-[10px] tabular-nums text-brand-gray",
											children: U._({
												id: "pdVZUg",
												values: { 0: e.limit }
											})
										}),
										i && /* @__PURE__ */ S($e, {
											className: "h-4 w-4 text-emerald-500",
											title: U._({ id: "_5CsXX" })
										}),
										/* @__PURE__ */ S(Ym, {
											column: e,
											siblings: t.columns,
											actions: n,
											doneKey: u,
											orientation: "vertical",
											portalClassName: r,
											buttonClassName: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600"
										})
									]
								}, e.key);
							})
						}), n.addColumn && (a ? /* @__PURE__ */ C("form", {
							className: "mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 px-3",
							onSubmit: (e) => {
								e.preventDefault();
								let t = s.trim();
								t && (o(!1), c(""), n.addColumn?.(t));
							},
							children: [
								/* @__PURE__ */ S(Gt, { className: "h-4 w-4 text-brand-dark" }),
								/* @__PURE__ */ S("input", {
									autoFocus: !0,
									value: s,
									onChange: (e) => c(e.target.value),
									onKeyDown: (e) => {
										e.key === "Escape" && (o(!1), c(""));
									},
									placeholder: U._({ id: "P5cvAA" }),
									"aria-label": U._({ id: "P5cvAA" }),
									className: "h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
								}),
								/* @__PURE__ */ S("button", {
									type: "submit",
									className: "h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white",
									children: /* @__PURE__ */ S(L, { id: "m16xKo" })
								})
							]
						}) : /* @__PURE__ */ C("button", {
							type: "button",
							onClick: () => o(!0),
							className: "mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40",
							children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "1nUGn5" })]
						}))]
					}),
					/* @__PURE__ */ S("div", {
						className: "flex justify-end border-t border-line bg-stone-50 px-5 py-3",
						children: /* @__PURE__ */ S("button", {
							type: "button",
							onClick: i,
							className: "rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand",
							children: /* @__PURE__ */ S(L, { id: "DPfwMq" })
						})
					})
				]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/LaneDetailsPopover.tsx
function Zm({ lane: e, cardCount: t, portalClassName: n, buttonClassName: r = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
	let [i, a] = y("idle"), o = v(null), s = n ? ` ${n}` : "";
	f(() => {
		a("idle");
	}, [e.key]), f(() => () => {
		o.current != null && window.clearTimeout(o.current);
	}, []);
	let c = async () => {
		try {
			if (!navigator.clipboard) throw Error("Clipboard unavailable");
			await navigator.clipboard.writeText(e.key), a("copied"), o.current != null && window.clearTimeout(o.current), o.current = window.setTimeout(() => a("idle"), 1600);
		} catch {
			a("error");
		}
	};
	return /* @__PURE__ */ C(lm, {
		className: "relative shrink-0",
		children: [/* @__PURE__ */ S(im, {
			title: U._({ id: "-eTfgY" }),
			"aria-label": U._({
				id: "Q-Pe7U",
				values: { 0: e.name }
			}),
			className: r,
			children: /* @__PURE__ */ S(jt, { className: "h-4 w-4" })
		}), /* @__PURE__ */ C(sm, {
			anchor: "bottom end",
			className: `z-50 w-80 rounded-xl border border-line bg-white p-4 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${s}`,
			children: [
				/* @__PURE__ */ C("p", {
					className: "flex items-center gap-2 text-xs font-semibold text-stone-800",
					children: [/* @__PURE__ */ S(jt, { className: "h-4 w-4 text-brand-dark" }), /* @__PURE__ */ S(L, { id: "-eTfgY" })]
				}),
				/* @__PURE__ */ C("dl", {
					className: "mt-3 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[11px]",
					children: [
						/* @__PURE__ */ S("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ S(L, { id: "6YtxFj" })
						}),
						/* @__PURE__ */ S("dd", {
							className: "truncate font-medium text-stone-700",
							children: e.name
						}),
						/* @__PURE__ */ S("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ S(L, { id: "arhExE" })
						}),
						/* @__PURE__ */ C("dd", {
							className: "flex min-w-0 items-center gap-1.5",
							children: [/* @__PURE__ */ S("code", {
								className: "min-w-0 flex-1 truncate rounded bg-stone-100 px-1.5 py-1 text-[10px] text-stone-600",
								children: e.key
							}), /* @__PURE__ */ C("button", {
								type: "button",
								title: U._({ id: "GNoXOd" }),
								"aria-label": U._({ id: "GNoXOd" }),
								onClick: () => void c(),
								className: "inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[10px] font-medium text-brand-dark hover:border-brand/30",
								children: [/* @__PURE__ */ S(dt, { className: "h-3.5 w-3.5" }), i === "copied" ? U._({ id: "6V3Ea3" }) : U._({ id: "he3ygx" })]
							})]
						}),
						/* @__PURE__ */ S("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ S(L, { id: "xUOPoQ" })
						}),
						/* @__PURE__ */ S("dd", {
							className: "tabular-nums text-stone-700",
							children: /* @__PURE__ */ S(L, {
								id: "tF-_sn",
								values: { cardCount: t }
							})
						})
					]
				}),
				i === "error" && /* @__PURE__ */ S("p", {
					className: "mt-3 text-[11px] text-red-600",
					role: "alert",
					children: /* @__PURE__ */ S(L, { id: "vfYjJ_" })
				})
			]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneDeleteDialog.tsx
function Qm({ lane: e, cardCount: t, targets: n, busy: r, progress: i, error: a, portalClassName: o, onClose: s, onConfirm: c }) {
	let [l, u] = y("keep"), [d, p] = y(""), m = v(null), h = n.length > 0;
	f(() => {
		let t = e?.key ?? null, r = m.current !== t;
		m.current = t, r && u("keep"), p((e) => r || !n.some((t) => t.value === e) ? n[0]?.value ?? "" : e);
	}, [e?.key, n]);
	let g = o ? ` ${o}` : "", _ = () => {
		r || s();
	};
	return /* @__PURE__ */ C(ff, {
		open: !!e,
		onClose: _,
		className: `relative z-50${g}`,
		children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${g}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${g}`,
			children: /* @__PURE__ */ S(lf, {
				"aria-describedby": "swimlane-delete-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${g}`,
				children: e && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ C("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ S(df, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: U._({
								id: "KpnwJK",
								values: { 0: e.name }
							})
						}),
						/* @__PURE__ */ S("p", {
							id: "swimlane-delete-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: t > 0 ? U._({
								id: "RbsNko",
								values: { cardCount: t }
							}) : U._({ id: "MYx830" })
						}),
						t > 0 && /* @__PURE__ */ C(Em, {
							value: l,
							onChange: u,
							className: "mt-4 space-y-2",
							children: [/* @__PURE__ */ C(Tm, {
								value: "keep",
								className: "group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30",
								children: [/* @__PURE__ */ S("span", {
									className: "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand",
									children: /* @__PURE__ */ S("span", { className: "h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" })
								}), /* @__PURE__ */ C("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ C("span", {
										className: "flex items-center justify-between gap-2 text-xs font-semibold text-stone-800",
										children: [/* @__PURE__ */ S(L, { id: "by_svU" }), /* @__PURE__ */ S("span", {
											className: "font-normal text-brand-dark",
											children: /* @__PURE__ */ S(L, { id: "WEYdDv" })
										})]
									}), /* @__PURE__ */ S("span", {
										className: "mt-1 block text-[11px] leading-4 text-brand-gray",
										children: /* @__PURE__ */ S(L, { id: "Y8bR2a" })
									})]
								})]
							}), /* @__PURE__ */ C(Tm, {
								value: "move",
								className: "group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30",
								children: [/* @__PURE__ */ S("span", {
									className: "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand",
									children: /* @__PURE__ */ S("span", { className: "h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" })
								}), /* @__PURE__ */ C("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ S("span", {
										className: "text-xs font-semibold text-stone-800",
										children: /* @__PURE__ */ S(L, { id: "_TJomP" })
									}), /* @__PURE__ */ S("span", {
										className: "mt-1 block text-[11px] leading-4 text-brand-gray",
										children: /* @__PURE__ */ S(L, { id: "3CtQL6" })
									})]
								})]
							})]
						}),
						h && /* @__PURE__ */ S("div", {
							className: "mt-2 pl-7",
							children: /* @__PURE__ */ S(km, {
								value: d,
								options: n,
								disabled: l !== "move",
								onChange: p,
								portalClassName: o
							})
						}),
						i && /* @__PURE__ */ C("div", {
							className: "mt-4",
							"aria-live": "polite",
							children: [
								/* @__PURE__ */ C("div", {
									className: "flex items-center justify-between text-[11px] text-brand-gray",
									children: [/* @__PURE__ */ S(L, { id: "Kd6eg7" }), /* @__PURE__ */ C("span", {
										className: "tabular-nums",
										children: [
											i.completed,
											"/",
											i.total
										]
									})]
								}),
								/* @__PURE__ */ S("div", {
									className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100",
									children: /* @__PURE__ */ S("div", {
										className: "h-full rounded-full bg-brand transition-[width] duration-200",
										style: { width: `${i.total ? i.completed / i.total * 100 : 0}%` }
									})
								}),
								/* @__PURE__ */ S("p", {
									className: "mt-1.5 text-[11px] text-brand-gray",
									children: /* @__PURE__ */ S(L, { id: "HTKRVa" })
								})
							]
						}),
						a && /* @__PURE__ */ C("div", {
							className: "mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800",
							role: "alert",
							children: [/* @__PURE__ */ S(xt, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: a })]
						})
					]
				}), /* @__PURE__ */ C("div", {
					className: "flex justify-end gap-2 border-t border-line bg-stone-50 px-5 py-3",
					children: [/* @__PURE__ */ S("button", {
						type: "button",
						onClick: _,
						"aria-disabled": r,
						className: "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/30 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: /* @__PURE__ */ S(L, { id: "dEgA5A" })
					}), /* @__PURE__ */ S("button", {
						type: "button",
						onClick: () => !r && !(t > 0 && l === "move" && n.length === 0) && void c(t === 0 || l === "keep" ? { mode: "keep" } : {
							mode: "move",
							targetKey: d || null
						}),
						"aria-disabled": r || t > 0 && l === "move" && n.length === 0,
						className: "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: r ? U._({ id: "XklovM" }) : t > 0 && l === "move" ? U._({ id: "NYTPDY" }) : U._({ id: "uAP6ov" })
					})]
				})] })
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneManagerDialog.tsx
function $m({ open: e, lanes: t, cards: n, focusRequest: r, portalClassName: i, onClose: a, onSaveLanes: o, onUpdateCards: s, onShowAffected: c }) {
	let [l, u] = y(!1), [d, p] = y(""), [m, h] = y(null), [_, b] = y(""), [w, T] = y(null), [E, D] = y(!1), [O, k] = y(null), [A, j] = y(!1), [M, N] = y(""), [P, F] = y(null), [I, ee] = y(""), R = v(null), [z, B] = y(null), te = v(!1), V = v(null);
	f(() => {
		e || (u(!1), p(""), h(null), T(null), k(null), N(""), F(null), ee(""));
	}, [e]), f(() => {
		if (!e || !r || V.current === r.id) return;
		let n = t.find((e) => e.key === r.laneKey);
		n && (V.current = r.id, r.action === "rename" ? (h(n.key), b(n.name), T(null)) : (N(""), F(null), k(n)));
	}, [
		r?.id,
		e,
		t
	]);
	let ne = i ? ` ${i}` : "", re = g(() => {
		let e = /* @__PURE__ */ new Map();
		for (let t of n) t.swimlaneKey && e.set(t.swimlaneKey, (e.get(t.swimlaneKey) ?? 0) + 1);
		return e;
	}, [n]), ie = g(() => Qn({ swimlanes: t }, n), [t, n]), ae = ie.filter((e) => e.kind === "dangling_swimlane").reduce((e, t) => e + t.cardCount, 0), H = ie.filter((e) => e.kind !== "dangling_swimlane"), oe = async (e, t = "dialog") => {
		if (!te.current) {
			te.current = !0, D(!0), T(null);
			try {
				await o(e);
			} catch (e) {
				throw T({
					key: t,
					message: e instanceof Error ? e.message : String(e)
				}), e;
			} finally {
				te.current = !1, D(!1);
			}
		}
	}, se = (e, n) => {
		let r = t.findIndex((t) => t.key === e), i = r + n;
		if (r < 0 || i < 0 || i >= t.length || E) return;
		let a = [...t], [o] = a.splice(r, 1);
		o && (a.splice(i, 0, o), oe(a, e).then(() => ee(U._({
			id: "CxcMyt",
			values: {
				0: o.name,
				1: i + 1,
				2: t.length
			}
		}))).catch(() => void 0));
	}, ce = (e, n) => {
		if (e === n || E) return;
		let r = [...t], i = r.findIndex((t) => t.key === e), a = r.findIndex((e) => e.key === n);
		if (i < 0 || a < 0) return;
		let [o] = r.splice(i, 1);
		o && (r.splice(a, 0, o), oe(r, e).then(() => ee(U._({
			id: "CxcMyt",
			values: {
				0: o.name,
				1: a + 1,
				2: t.length
			}
		}))).catch(() => void 0));
	}, le = (e, t) => {
		e.button !== 0 || E || (R.current = {
			key: t,
			x: e.clientX,
			y: e.clientY,
			moved: !1
		}, e.currentTarget.setPointerCapture?.(e.pointerId));
	}, ue = (e, t) => {
		let n = R.current;
		if (!(!n || n.key !== t) && !n.moved) {
			if (Math.abs(e.clientX - n.x) < 4 && Math.abs(e.clientY - n.y) < 4) return;
			n.moved = !0, B(t);
		}
	}, de = (e, t) => {
		let n = R.current;
		R.current = null, B(null);
		try {
			e.currentTarget.releasePointerCapture?.(e.pointerId);
		} catch {}
		if (!n?.moved || n.key !== t) return;
		let r = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-swimlane-row]")?.dataset.swimlaneRow;
		r && ce(t, r);
	}, fe = (e) => {
		T(null), h(e.key), b(e.name);
	}, pe = async (e) => {
		let n = Xn(_, t, e.key);
		if (n) {
			T({
				key: e.key,
				message: n
			});
			return;
		}
		let r = _.trim();
		h(null), r !== e.name && await oe(t.map((t) => t.key === e.key ? {
			...t,
			name: r
		} : t), e.key).catch(() => {
			h(e.key);
		});
	}, me = async () => {
		let e = Xn(d, t);
		if (e) {
			T({
				key: "new",
				message: e
			});
			return;
		}
		let r = d.trim(), i = {
			key: Yn(r, [...t.map((e) => e.key), ...n.map((e) => e.swimlaneKey).filter((e) => !!e)]),
			name: r
		};
		u(!1), p(""), await oe([...t, i], "new").catch(() => {
			u(!0), p(r);
		});
	}, he = (e, n) => {
		E || oe(t.map((t) => t.key === e.key ? {
			...t,
			color: n
		} : t), e.key).catch(() => void 0);
	}, ge = async (e) => {
		if (!O || A) return;
		let r = n.filter((e) => e.swimlaneKey === O.key);
		j(!0), N(""), F(null);
		try {
			if (e.mode === "move" && r.length > 0) {
				let t = r.map((t) => ({
					cardId: t.id,
					patch: { swimlaneKey: e.targetKey }
				}));
				F({
					completed: 0,
					total: t.length
				}), await s(t, (e, t) => F({
					completed: e,
					total: t
				}));
			}
			await o(t.filter((e) => e.key !== O.key)), k(null);
		} catch (e) {
			N(e instanceof Error ? e.message : String(e));
		} finally {
			j(!1);
		}
	}, _e = O ? [{
		value: "",
		label: U._({ id: "EbMPZJ" })
	}, ...t.filter((e) => e.key !== O.key).map((e) => ({
		value: e.key,
		label: e.name,
		color: e.color
	}))] : [];
	return /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ C(ff, {
		open: e,
		onClose: () => {
			!E && !A && a();
		},
		className: `relative z-40${ne}`,
		children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${ne}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${ne}`,
			children: /* @__PURE__ */ C(lf, {
				"aria-describedby": "swimlane-manager-description",
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${ne}`,
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ S("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ S(Ue, { className: "h-4.5 w-4.5" })
							}),
							/* @__PURE__ */ C("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ S(df, {
										className: "text-base font-semibold tracking-tight text-stone-900",
										children: /* @__PURE__ */ S(L, { id: "pip_Rq" })
									}),
									/* @__PURE__ */ S("p", {
										id: "swimlane-manager-description",
										className: "mt-1 text-xs leading-5 text-brand-gray",
										children: /* @__PURE__ */ S(L, { id: "s8QaQC" })
									}),
									/* @__PURE__ */ S("span", {
										className: "sr-only",
										"aria-live": "polite",
										children: I
									})
								]
							}),
							/* @__PURE__ */ S("button", {
								type: "button",
								onClick: () => {
									E || a();
								},
								"aria-disabled": E,
								title: U._({ id: "yz7wBu" }),
								"aria-label": U._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
								children: /* @__PURE__ */ S(fn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [
							/* @__PURE__ */ S("ul", {
								"aria-label": U._({ id: "nNGN_D" }),
								className: "space-y-1",
								children: t.map((e, n) => {
									let r = w?.key === e.key ? w.message : null;
									return /* @__PURE__ */ C("li", {
										"data-swimlane-row": e.key,
										className: `rounded-xl transition ${z === e.key ? "opacity-50" : ""}`,
										children: [/* @__PURE__ */ C("div", {
											className: "group flex min-h-12 items-center gap-2 px-2 hover:bg-stone-50 focus-within:bg-stone-50",
											children: [
												/* @__PURE__ */ S("button", {
													type: "button",
													onPointerDown: (t) => le(t, e.key),
													onPointerMove: (t) => ue(t, e.key),
													onPointerUp: (t) => de(t, e.key),
													title: U._({ id: "KGi3u9" }),
													"aria-label": U._({
														id: "2BPVq8",
														values: { 0: e.name }
													}),
													className: "hidden h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-stone-300 hover:bg-white hover:text-stone-500 active:cursor-grabbing md:flex md:cursor-grab",
													children: /* @__PURE__ */ S(Ue, { className: "h-4 w-4" })
												}),
												/* @__PURE__ */ C(lm, {
													className: "relative shrink-0",
													children: [/* @__PURE__ */ S(im, {
														title: U._({ id: "KFiYGY" }),
														className: "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30",
														children: /* @__PURE__ */ S("span", {
															className: "h-4 w-4 rounded-full bg-stone-300 ring-1 ring-black/10",
															style: e.color ? { backgroundColor: e.color } : void 0,
															"aria-hidden": !0
														})
													}), /* @__PURE__ */ C(sm, {
														anchor: "bottom start",
														className: `z-50 w-52 rounded-xl border border-line bg-white p-3 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${ne}`,
														children: [/* @__PURE__ */ S("p", {
															className: "text-[11px] font-medium text-brand-gray",
															children: /* @__PURE__ */ S(L, { id: "U0hizX" })
														}), /* @__PURE__ */ C("div", {
															className: "mt-2 flex flex-wrap gap-2",
															children: [En.map((t) => /* @__PURE__ */ S("button", {
																type: "button",
																onClick: () => he(e, t),
																title: t,
																className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
																style: { backgroundColor: t }
															}, t)), /* @__PURE__ */ S("button", {
																type: "button",
																onClick: () => he(e, null),
																title: U._({ id: "H_SQFv" }),
																className: `flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${e.color ? "" : "ring-2 ring-brand ring-offset-2"}`,
																children: /* @__PURE__ */ S(fn, { className: "h-3 w-3 text-stone-400" })
															})]
														})]
													})]
												}),
												m === e.key ? /* @__PURE__ */ S("form", {
													className: "min-w-0 flex-1",
													onSubmit: (t) => {
														t.preventDefault(), pe(e);
													},
													children: /* @__PURE__ */ S("input", {
														autoFocus: !0,
														value: _,
														maxLength: 80,
														onChange: (e) => b(e.target.value),
														onBlur: () => void pe(e),
														onKeyDown: (e) => {
															e.key === "Escape" && (h(null), T(null));
														},
														"aria-label": U._({ id: "79Yvzu" }),
														className: "h-8 w-full rounded-lg border border-brand/40 bg-white px-2 text-xs font-medium text-stone-800 outline-none ring-2 ring-brand/10"
													})
												}) : /* @__PURE__ */ S("button", {
													type: "button",
													onDoubleClick: () => fe(e),
													className: "min-w-0 flex-1 truncate text-left text-xs font-semibold text-stone-800",
													title: e.name,
													children: e.name
												}),
												/* @__PURE__ */ S("span", {
													className: "shrink-0 tabular-nums text-[11px] text-brand-gray",
													children: /* @__PURE__ */ S(L, {
														id: "fFAIng",
														values: { 0: re.get(e.key) ?? 0 }
													})
												}),
												/* @__PURE__ */ C(Ap, {
													as: "div",
													className: "relative shrink-0",
													children: [/* @__PURE__ */ S(wp, {
														title: U._({ id: "DGEEOQ" }),
														"aria-label": U._({
															id: "RlLl3G",
															values: { 0: e.name }
														}),
														className: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100",
														children: /* @__PURE__ */ S(yt, { className: "h-4 w-4" })
													}), /* @__PURE__ */ C(Tp, {
														anchor: "bottom end",
														className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${ne}`,
														children: [
															/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => fe(e),
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Ut, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
															}) }),
															/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => se(e.key, -1),
																disabled: n === 0 || E,
																"aria-disabled": n === 0 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Fe, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "QyioBP" })]
															}) }),
															/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => se(e.key, 1),
																disabled: n === t.length - 1 || E,
																"aria-disabled": n === t.length - 1 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Ce, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "3Ib6FN" })]
															}) }),
															/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }),
															/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => {
																	N(""), F(null), k(e);
																},
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 data-[focus]:bg-red-50",
																children: [/* @__PURE__ */ S(rn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
															}) })
														]
													})]
												}),
												/* @__PURE__ */ S(Zm, {
													lane: e,
													cardCount: re.get(e.key) ?? 0,
													portalClassName: i,
													buttonClassName: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100"
												})
											]
										}), r && /* @__PURE__ */ C("div", {
											className: "mx-2 mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800",
											role: "alert",
											children: [/* @__PURE__ */ S(xt, { className: "h-3.5 w-3.5 shrink-0" }), r]
										})]
									}, e.key);
								})
							}),
							l ? /* @__PURE__ */ C("form", {
								className: "mt-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-2",
								onSubmit: (e) => {
									e.preventDefault(), me();
								},
								children: [/* @__PURE__ */ C("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ S("span", {
											className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark",
											children: /* @__PURE__ */ S(Gt, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ S("input", {
											autoFocus: !0,
											value: d,
											maxLength: 80,
											onChange: (e) => p(e.target.value),
											onKeyDown: (e) => {
												e.key === "Escape" && (u(!1), p(""), T(null));
											},
											placeholder: U._({ id: "79Yvzu" }),
											"aria-label": U._({ id: "79Yvzu" }),
											className: "h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
										}),
										/* @__PURE__ */ S("button", {
											type: "submit",
											"aria-disabled": E,
											className: "h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand aria-disabled:opacity-50",
											children: /* @__PURE__ */ S(L, { id: "m16xKo" })
										}),
										/* @__PURE__ */ S("button", {
											type: "button",
											onClick: () => {
												u(!1), p(""), T(null);
											},
											className: "h-8 rounded-lg px-2 text-xs font-medium text-brand-gray hover:bg-white",
											children: /* @__PURE__ */ S(L, { id: "dEgA5A" })
										})
									]
								}), w?.key === "new" && /* @__PURE__ */ S("p", {
									className: "mt-1.5 pl-10 text-[11px] text-amber-700",
									role: "alert",
									children: w.message
								})]
							}) : /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => {
									u(!0), p(""), T(null);
								},
								className: "mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-left text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40",
								children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "KCszT6" })]
							}),
							(H.length > 0 || ae > 0) && /* @__PURE__ */ C("section", {
								className: "mt-4 border-t border-line pt-3",
								"aria-labelledby": "swimlane-issues-title",
								children: [/* @__PURE__ */ S("h3", {
									id: "swimlane-issues-title",
									className: "text-[10px] font-semibold uppercase tracking-wider text-brand-gray",
									children: /* @__PURE__ */ S(L, { id: "1718Q-" })
								}), /* @__PURE__ */ C("div", {
									className: "mt-2 space-y-2",
									children: [H.map((e) => /* @__PURE__ */ C("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										role: "alert",
										children: [/* @__PURE__ */ S(xt, { className: "h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: e.kind === "duplicate_swimlane_key" ? U._({
											id: "bUNpV2",
											values: { 0: e.key }
										}) : U._({
											id: "uWPalN",
											values: { 0: e.name }
										}) })]
									}, `${e.kind}-${e.kind === "duplicate_swimlane_key" ? e.key : e.name}`)), ae > 0 && /* @__PURE__ */ C("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										children: [
											/* @__PURE__ */ S(xt, { className: "h-4 w-4 shrink-0" }),
											/* @__PURE__ */ S("span", {
												className: "min-w-0 flex-1",
												children: U._({
													id: "SavliD",
													values: { danglingCount: ae }
												})
											}),
											/* @__PURE__ */ S("button", {
												type: "button",
												onClick: () => {
													a(), c();
												},
												className: "shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-amber-100",
												children: /* @__PURE__ */ S(L, { id: "23yqV0" })
											})
										]
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "flex min-h-12 items-center border-t border-line bg-stone-50 px-5 py-3",
						children: [/* @__PURE__ */ S("span", {
							className: "text-[11px] text-brand-gray",
							"aria-live": "polite",
							children: E ? U._({ id: "K_F6pa" }) : U._({ id: "cUt8yN" })
						}), /* @__PURE__ */ S("button", {
							type: "button",
							onClick: () => {
								E || a();
							},
							"aria-disabled": E,
							className: "ml-auto rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
							children: /* @__PURE__ */ S(L, { id: "DPfwMq" })
						})]
					})
				]
			})
		})]
	}), /* @__PURE__ */ S(Qm, {
		lane: O,
		cardCount: O ? re.get(O.key) ?? 0 : 0,
		targets: _e,
		busy: A,
		progress: P,
		error: M,
		portalClassName: i,
		onClose: () => {
			A || k(null);
		},
		onConfirm: ge
	})] });
}
//#endregion
//#region ../../shared/components/board/SwimlaneConversionDialog.tsx
function eh({ source: e, rows: t, open: n, busy: r, resume: i, progress: a, error: o, portalClassName: s, onClose: c, onConfirm: l }) {
	let u = s ? ` ${s}` : "", d = () => {
		r || c();
	};
	return /* @__PURE__ */ C(ff, {
		open: n,
		onClose: d,
		className: `relative z-50${u}`,
		children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${u}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${u}`,
			children: /* @__PURE__ */ C(lf, {
				"aria-describedby": "swimlane-conversion-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${u}`,
				children: [/* @__PURE__ */ C("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ S(df, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: i ? U._({ id: "CXTDT_" }) : e === "priority" ? U._({ id: "nfhh60" }) : U._({ id: "vMTOsC" })
						}),
						/* @__PURE__ */ S("p", {
							id: "swimlane-conversion-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: i ? U._({ id: "MRsDXp" }) : e === "priority" ? U._({ id: "4vd-Kd" }) : U._({ id: "QRhoJb" })
						}),
						/* @__PURE__ */ C("ul", {
							className: "mt-4 divide-y divide-line",
							"aria-label": U._({ id: "4NY8B5" }),
							children: [t.map((e) => /* @__PURE__ */ C("li", {
								className: "flex min-h-10 items-center gap-2 py-2",
								children: [
									/* @__PURE__ */ S("span", {
										className: "h-2.5 w-2.5 shrink-0 rounded-full bg-stone-300",
										style: e.color ? { backgroundColor: e.color } : void 0,
										"aria-hidden": !0
									}),
									/* @__PURE__ */ S("span", {
										className: "min-w-0 flex-1 truncate text-xs font-medium text-stone-700",
										children: e.name
									}),
									/* @__PURE__ */ S("span", {
										className: "tabular-nums text-[11px] text-brand-gray",
										children: /* @__PURE__ */ S(L, {
											id: "fFAIng",
											values: { 0: e.cardCount }
										})
									})
								]
							}, e.value)), t.length === 0 && /* @__PURE__ */ S("li", {
								className: "py-4 text-center text-xs text-brand-gray",
								children: /* @__PURE__ */ S(L, { id: "gzZWjO" })
							})]
						}),
						a && /* @__PURE__ */ C("div", {
							className: "mt-4",
							"aria-live": "polite",
							children: [/* @__PURE__ */ C("div", {
								className: "flex items-center justify-between text-[11px] text-brand-gray",
								children: [/* @__PURE__ */ C("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ S(De, { className: "h-3.5 w-3.5 animate-spin" }), /* @__PURE__ */ S(L, { id: "ANe5kn" })]
								}), /* @__PURE__ */ C("span", {
									className: "tabular-nums",
									children: [
										a.completed,
										"/",
										a.total
									]
								})]
							}), /* @__PURE__ */ S("div", {
								className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100",
								children: /* @__PURE__ */ S("div", {
									className: "h-full rounded-full bg-brand transition-[width] duration-200",
									style: { width: `${a.total ? a.completed / a.total * 100 : 0}%` }
								})
							})]
						}),
						o && /* @__PURE__ */ C("div", {
							className: "mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800",
							role: "alert",
							children: [/* @__PURE__ */ S(xt, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: o })]
						})
					]
				}), /* @__PURE__ */ C("div", {
					className: "flex justify-end gap-2 border-t border-line bg-stone-50 px-5 py-3",
					children: [/* @__PURE__ */ S("button", {
						type: "button",
						onClick: d,
						"aria-disabled": r,
						className: "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/30 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: /* @__PURE__ */ S(L, { id: "dEgA5A" })
					}), /* @__PURE__ */ S("button", {
						type: "button",
						onClick: () => {
							!r && t.length > 0 && l();
						},
						disabled: r || t.length === 0,
						"aria-disabled": r || t.length === 0,
						className: "rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: r ? U._({ id: "XklovM" }) : i ? U._({ id: "l_g7se" }) : U._({ id: "PUeYA1" })
					})]
				})]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardSurface.tsx
function th({ config: e, cards: t, actions: r, error: i, initialCardId: a, templates: o, createFromTemplate: s, assigneeOptions: c, tagOptions: l, loadNotes: u, onUploadAttachment: d, loadComments: p, addComment: m, updateComment: h, deleteComment: _, toggleReaction: b, resolveComment: w, currentUser: T, loadActivity: E, renderMarkdownToContainer: D, renderMarkdownToHtml: O, fullscreen: k, onToggleFullscreen: A, onOpenSettings: j, readOnly: M, onCardOpen: N, renderCardSupplement: P, peekComponent: F, portalClassName: I }) {
	let [ee, R] = y(null), [z, B] = y(/* @__PURE__ */ new Set()), [te, V] = y(null), [ne, re] = y(null), [ie, ae] = y(/* @__PURE__ */ new Set()), [H, oe] = y(null), [se, ce] = y(!1), [le, ue] = y(""), [de, fe] = y(""), [pe, me] = y("manual"), [he, ge] = y({}), [_e, ve] = y(null), [ye, be] = y(null), [Se, Ce] = y(null), [we, Te] = y(!1), [Ee, Oe] = y(!1), [ke, Ae] = y(!1), [je, Me] = y("priority"), [Ne, Pe] = y(!1), [Fe, Ie] = y(null), [Le, Re] = y(""), [Be, He] = y(0), Ue = v(null), We = v(null), Ke = v(!1), Je = v(null), Xe = v(/* @__PURE__ */ new Map()), Ze = v(!1);
	f(() => {
		if (!(Ze.current || !a) && t.some((e) => e.id === a)) {
			if (Ze.current = !0, N) {
				N(t.find((e) => e.id === a));
				return;
			}
			R(a);
		}
	}, [
		t,
		a,
		N
	]);
	let Qe = Kn(e), et = Qe === "status", tt = Qe === "custom", nt = e.viewType ?? "board", rt = e.doneColumn ?? "done", it = (e.colorColumns ?? !1) && et && nt === "board", at = pe === "manual" && et && nt === "board" && !de.trim() && !or(he), ot = Vn(), ct = (e, t) => {
		let n = (Xe.current.get(e) ?? Promise.resolve()).catch(() => void 0).then(() => r.updateCard(e, t)).catch(() => void 0);
		return Xe.current.set(e, n), n.then(() => {
			Xe.current.get(e) === n && Xe.current.delete(e);
		}), n;
	};
	f(() => {
		if (!k || !A) return;
		let e = (e) => {
			e.key === "Escape" && !ee && z.size === 0 && A();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [
		k,
		ee,
		z.size,
		A
	]), f(() => {
		if (z.size === 0) return;
		let e = (e) => {
			e.key === "Escape" && B(/* @__PURE__ */ new Set());
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [z.size]);
	let lt = g(() => Qe === "custom" ? rr(e, t, Qe, U._({ id: "EbMPZJ" })) : tr(e, t, Qe, U._({ id: "EbMPZJ" })), [
		e,
		t,
		Qe
	]), ut = g(() => Rn(t, e.doneColumn), [t, e.doneColumn]), dt = g(() => new Set(ut.keys()), [ut]), ft = g(() => dr(t, de, he, e, {
		currentUser: T,
		today: ot,
		blockedCardIds: dt
	}), [
		t,
		de,
		he,
		e,
		T,
		ot,
		dt
	]), pt = g(() => zn(t), [t]), mt = g(() => [...new Set(t.map((e) => e.assignee).filter(Boolean))], [t]), gt = g(() => [...new Set(t.flatMap((e) => e.tags.map((e) => e.label)))], [t]), vt = (t) => e.columns.find((e) => e.key === t)?.name || t || U._({ id: "EbMPZJ" }), bt = ee ? t.find((e) => e.id === ee) ?? null : null, St = g(() => tr(e, t, je, U._({ id: "EbMPZJ" })).filter((e) => je === "priority" ? e.key !== "none" : e.key !== "").map((e, n) => ({
		value: e.key,
		name: e.name,
		color: e.color ?? En[n % En.length],
		cardCount: t.filter((t) => $n(t, je) === e.key).length
	})), [
		t,
		e,
		je
	]), Ct = async (e, t) => {
		if (r.updateCards) {
			await r.updateCards(e, t);
			return;
		}
		let n = 0;
		for (let i of e) await r.updateCard(i.cardId, i.patch), n += 1, t?.(n, e.length);
	}, wt = async () => {
		if (!Ne) {
			if (Re(""), Je.current = null, !(e.swimlaneMigration?.source === je && e.swimlaneMigration)) {
				let n = /* @__PURE__ */ new Set([...(e.swimlanes ?? []).map((e) => e.key), ...t.map((e) => e.swimlaneKey).filter((e) => !!e)]), i = St.map((e) => {
					let t = Yn(e.name, n);
					return n.add(t), {
						value: e.value,
						swimlaneKey: t
					};
				}), a = [...e.swimlanes ?? [], ...i.map((e, t) => ({
					key: e.swimlaneKey,
					name: St[t]?.name ?? e.value,
					color: St[t]?.color
				}))], o = {
					version: 1,
					source: je,
					mapping: i
				};
				try {
					await r.setConfig({
						swimlanes: a,
						swimlaneMigration: o
					});
				} catch (e) {
					Re(e instanceof Error ? e.message : String(e));
					return;
				}
			}
			Ie(null), Pe(!0);
		}
	};
	f(() => {
		if (!Ne || Ke.current) return;
		let n = e.swimlaneMigration;
		!n || n.source !== je || (Ke.current = !0, (async () => {
			try {
				let i = [...n.mapping], a = [...e.swimlanes ?? []], o = new Set(i.map((e) => e.value)), s = new Set(a.map((e) => e.key)), c = /* @__PURE__ */ new Set([
					...s,
					...i.map((e) => e.swimlaneKey),
					...t.map((e) => e.swimlaneKey).filter((e) => !!e)
				]), l = [...new Set(t.map((e) => $n(e, n.source)).filter((e) => n.source === "priority" ? e !== "none" : e !== ""))], u = !1;
				for (let e of l) if (!o.has(e)) {
					let t = Yn(e, c);
					c.add(t), i.push({
						value: e,
						swimlaneKey: t
					}), o.add(e), u = !0;
				}
				for (let e of i) if (!s.has(e.swimlaneKey)) {
					let t = St.find((t) => t.value === e.value), n = Math.max(0, l.indexOf(e.value));
					a.push({
						key: e.swimlaneKey,
						name: t?.name ?? e.value,
						color: t?.color ?? En[n % En.length]
					}), s.add(e.swimlaneKey), u = !0;
				}
				if (u) {
					Je.current = null, await r.setConfig({
						swimlanes: a,
						swimlaneMigration: {
							...n,
							mapping: i
						}
					});
					return;
				}
				let d = new Map(i.map((e) => [e.value, e.swimlaneKey])), f = t.flatMap((e) => {
					let t = $n(e, n.source), r = d.get(t);
					return r && e.swimlaneKey !== r ? [{
						cardId: e.id,
						patch: { swimlaneKey: r }
					}] : [];
				});
				if (f.length > 0) {
					let e = f.map((e) => `${e.cardId}:${String(e.patch.swimlaneKey ?? "")}`).sort().join("\n"), t = Je.current;
					if (t?.signature === e && t.writes >= 2) throw Error(U._({ id: "KAlhe_" }));
					Je.current = {
						signature: e,
						writes: t?.signature === e ? t.writes + 1 : 1
					}, Ie({
						completed: 0,
						total: f.length
					}), await Ct(f, (e, t) => Ie({
						completed: e,
						total: t
					}));
					return;
				}
				await r.setConfig({
					groupBy: "status",
					swimlanes: a,
					swimlaneBy: "custom",
					swimlaneMigration: void 0
				}), Je.current = null, Pe(!1), Ie(null), Ae(!1);
			} catch (e) {
				Re(e instanceof Error ? e.message : String(e)), Ie(null), Pe(!1);
			} finally {
				Ke.current = !1, He((e) => e + 1);
			}
		})());
	}, [
		r,
		t,
		e.swimlaneMigration,
		e.swimlanes,
		Be,
		Ne,
		St,
		je
	]);
	let Tt = "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", Et = I ? ` ${I}` : "", Dt = (e) => {
		Ne || Promise.resolve(r.setConfig(e)).catch(() => {});
	}, Ot = async (e) => {
		await r.setConfig({ swimlanes: e });
	}, At = () => {
		ge((e) => ({
			...e,
			missingRow: !0
		})), window.setTimeout(() => {
			document.querySelector("[data-col-key=\"\"]")?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth"
			});
		}, 80);
	}, jt = (e) => {
		N ? N(e) : R(e.id);
	}, Mt = !!(r.renameColumn || r.toggleDoneColumn || r.setColumnLimit || r.setColumnColor || r.deleteColumn), Pt = (e, t) => {
		let n = document.elementFromPoint(e, t), r = n?.closest("[data-col-key]");
		if (!r) return null;
		let i = r.dataset.colKey, a = n?.closest("[data-card-id]");
		if (a && r.contains(a)) {
			let e = Number(a.dataset.cardIndex), n = a.getBoundingClientRect();
			return {
				col: i,
				index: e + +(t > n.top + n.height / 2)
			};
		}
		return {
			col: i,
			index: r.querySelectorAll("[data-card-id]").length
		};
	}, It = (e, t) => (document.elementFromPoint(e, t)?.closest("[data-col-key]"))?.dataset.colKey ?? null, Rt = (e, t) => {
		if (e.button === 0) {
			Ue.current = {
				id: t.id,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, zt = (e, t) => {
		if (M) return;
		let n = Ue.current;
		if (!(!n || n.id !== t.id)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, ve(t.id);
			}
			Ce({
				x: e.clientX,
				y: e.clientY
			}), V(Pt(e.clientX, e.clientY));
		}
	}, Bt = (n, i) => {
		let a = Ue.current;
		Ue.current = null;
		try {
			n.currentTarget.releasePointerCapture(n.pointerId);
		} catch {}
		if (ve(null), Ce(null), V(null), a?.moved) {
			let a = Pt(n.clientX, n.clientY);
			if (a) {
				let n = et && !at ? t.filter((t) => t.id !== i.id && er(t, e) === a.col).length : a.index;
				r.moveCard(i.id, a.col, n);
			}
		} else if (a) {
			if ((n.metaKey || n.ctrlKey) && !M) {
				B((e) => {
					let t = new Set(e);
					return t.has(i.id) ? t.delete(i.id) : t.add(i.id), t;
				});
				return;
			}
			jt(i);
		}
	}, Ht = (e) => {
		for (let n of z) t.some((e) => e.id === n) && r.updateCard(n, e);
	}, Wt = (e, t) => {
		if (!(!et || !r.reorderColumns || e.button !== 0) && !e.target.closest("button")) {
			We.current = {
				key: t.key,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, Kt = (e, t) => {
		let n = We.current;
		if (!(!n || n.key !== t.key)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, be(t.key);
			}
			re(It(e.clientX, e.clientY));
		}
	}, Jt = (e, t) => {
		let n = We.current;
		We.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (be(null), re(null), n?.moved) {
			let n = It(e.clientX, e.clientY);
			n && n !== t.key && r.reorderColumns?.(t.key, n);
		}
	}, Yt = (e) => ae((t) => {
		let n = new Set(t);
		return n.has(e) ? n.delete(e) : n.add(e), n;
	}), Xt = async (e, t) => {
		let n = t.title.trim();
		if (!n) return !1;
		let { title: i, ...a } = t, o = await r.createCard(e, n, a);
		return typeof o == "string" && !N && R(o), !0;
	};
	return i && e.columns.length === 0 ? /* @__PURE__ */ C("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-stone-50 p-8 text-center",
		children: [/* @__PURE__ */ S(xt, { className: "h-9 w-9 text-amber-500" }), /* @__PURE__ */ S("p", {
			className: "max-w-md break-words text-sm text-stone-600",
			children: i
		})]
	}) : /* @__PURE__ */ C("div", {
		className: "relative flex h-full min-h-0 bg-stone-50",
		children: [
			/* @__PURE__ */ C("div", {
				className: "flex min-h-0 min-w-0 flex-1 flex-col",
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex flex-wrap items-center gap-2.5 border-b border-black/[0.05] bg-white/70 px-5 py-2.5",
						children: [
							/* @__PURE__ */ S("span", {
								className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ S(un, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ C("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ S("p", {
									className: "truncate text-sm font-semibold text-stone-900",
									children: e.title
								}), /* @__PURE__ */ C("p", {
									className: "truncate text-xs text-brand-gray",
									children: [
										/* @__PURE__ */ S(L, { id: "QD8opX" }),
										/* @__PURE__ */ S("span", {
											"aria-hidden": !0,
											children: " · "
										}),
										ft.length,
										ft.length === t.length ? "" : `/${t.length}`,
										" ",
										/* @__PURE__ */ S(L, { id: "sCzmvQ" })
									]
								})]
							}),
							/* @__PURE__ */ C("div", {
								className: "flex items-center gap-2.5 max-md:w-full",
								children: [
									/* @__PURE__ */ C("div", {
										className: "inline-flex items-center rounded-lg border border-stone-200 p-0.5",
										children: [
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => Dt({ viewType: "board" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${nt === "board" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S(un, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "QD8opX" })]
											}),
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => Dt({ viewType: "table" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${nt === "table" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S($t, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "4hJhzz" })]
											}),
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => Dt({ viewType: "calendar" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${nt === "calendar" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S(Ye, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "AjVXBS" })]
											})
										]
									}),
									et && nt === "board" && !M && /* @__PURE__ */ C("button", {
										type: "button",
										className: `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${it ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: () => Dt({ colorColumns: !e.colorColumns }),
										title: U._({ id: "b4hVKD" }),
										children: [/* @__PURE__ */ S(Zt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "jZlrte" })]
									}),
									r.refresh && /* @__PURE__ */ C("button", {
										type: "button",
										className: "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: () => void r.refresh?.(),
										title: U._({ id: "lCF0wC" }),
										children: [/* @__PURE__ */ S(De, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "lCF0wC" })]
									}),
									j && /* @__PURE__ */ S("button", {
										type: "button",
										className: "inline-flex items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: j,
										title: U._({ id: "6buwPb" }),
										"aria-label": U._({ id: "6buwPb" }),
										children: /* @__PURE__ */ S(ht, { className: "h-3.5 w-3.5" })
									}),
									A && /* @__PURE__ */ S("button", {
										type: "button",
										className: `inline-flex items-center justify-center rounded-lg border p-1.5 ${k ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: A,
										title: k ? U._({ id: "sQpDn6" }) : U._({ id: "3qkggm" }),
										"aria-label": k ? U._({ id: "sQpDn6" }) : U._({ id: "3qkggm" }),
										"aria-pressed": k,
										children: S(k ? ze : Ve, { className: "h-3.5 w-3.5" })
									})
								]
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-white/40 px-5 py-1.5",
						children: [
							nt === "board" && /* @__PURE__ */ C("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ S(qt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("select", {
									className: Tt,
									"aria-label": U._({ id: "hyVzII" }),
									value: Qe,
									disabled: Ne,
									onChange: (t) => {
										let n = t.target.value, i = n === "custom" ? {
											groupBy: "status",
											swimlaneBy: "custom"
										} : {
											groupBy: n,
											swimlaneBy: void 0
										};
										Promise.resolve(r.setConfig(i)).then(() => {
											n === "custom" && (e.swimlanes?.length ?? 0) === 0 && !M && Te(!0);
										}).catch(() => {});
									},
									children: [
										/* @__PURE__ */ S("option", {
											value: "status",
											children: U._({ id: "CQ_dDx" })
										}),
										/* @__PURE__ */ S("option", {
											value: "priority",
											children: U._({ id: "Ve-C10" })
										}),
										/* @__PURE__ */ S("option", {
											value: "assignee",
											children: U._({ id: "UouxNQ" })
										}),
										/* @__PURE__ */ S("option", {
											value: "custom",
											children: U._({ id: "5Cawxq" })
										})
									]
								})]
							}),
							nt === "board" && Qe === "status" && !M && /* @__PURE__ */ S("button", {
								type: "button",
								disabled: Ne,
								onClick: () => Oe(!0),
								title: U._({ id: "rvpMpc" }),
								"aria-label": U._({ id: "rvpMpc" }),
								className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
								children: /* @__PURE__ */ S(Vt, { className: "h-3.5 w-3.5" })
							}),
							nt === "board" && Qe !== "status" && !M && /* @__PURE__ */ S("button", {
								type: "button",
								disabled: Ne,
								onClick: () => {
									Qe === "custom" ? Te(!0) : (Me(e.swimlaneMigration?.source ?? Qe), Re(""), Ae(!0));
								},
								title: Qe === "custom" ? U._({ id: "pip_Rq" }) : U._({ id: "jzy1b8" }),
								"aria-label": Qe === "custom" ? U._({ id: "pip_Rq" }) : U._({ id: "jzy1b8" }),
								className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
								children: /* @__PURE__ */ S(xe, { className: "h-3.5 w-3.5" })
							}),
							nt !== "calendar" && /* @__PURE__ */ C("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ S(Ge, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("select", {
									className: Tt,
									value: pe,
									onChange: (e) => me(e.target.value),
									children: [
										/* @__PURE__ */ S("option", {
											value: "manual",
											children: U._({ id: "8lE269" })
										}),
										/* @__PURE__ */ S("option", {
											value: "due",
											children: U._({ id: "fYcKtB" })
										}),
										/* @__PURE__ */ S("option", {
											value: "priority",
											children: U._({ id: "WSP6v1" })
										}),
										/* @__PURE__ */ S("option", {
											value: "title",
											children: U._({ id: "p9yTeb" })
										})
									]
								})]
							}),
							/* @__PURE__ */ S(Um, {
								filters: he,
								onChange: ge,
								assignees: mt,
								tags: gt,
								currentUser: T,
								visibleCount: ft.length,
								totalCount: t.length,
								portalClassName: I
							}),
							/* @__PURE__ */ C("div", {
								className: "relative ml-auto",
								children: [/* @__PURE__ */ S(Lt, { className: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" }), /* @__PURE__ */ S("input", {
									className: `${Tt} w-44 pl-7`,
									placeholder: U._({ id: "JTYvAw" }),
									value: de,
									onChange: (e) => fe(e.target.value)
								})]
							})
						]
					}),
					i && /* @__PURE__ */ S("div", {
						className: "bg-amber-50 px-5 py-1.5 text-xs text-amber-700",
						children: /* @__PURE__ */ S("span", {
							className: "truncate",
							children: i
						})
					}),
					nt === "table" ? /* @__PURE__ */ S(Wm, {
						cards: fr(ft, pe),
						statusName: vt,
						today: ot,
						doneKey: rt,
						selectedId: bt?.id,
						onSelect: jt
					}) : nt === "calendar" ? /* @__PURE__ */ S(Km, {
						cards: ft,
						today: ot,
						doneKey: rt,
						mode: e.calendarMode ?? "month",
						onModeChange: (e) => Dt({ calendarMode: e }),
						selectedId: bt?.id,
						onSelect: jt
					}) : /* @__PURE__ */ C("div", {
						className: "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4",
						children: [
							lt.map((t, i) => {
								let a = fr(ft.filter((n) => er(n, e) === t.key), pe), c = (e) => !!_e && at && te?.col === t.key && te.index === e, l = et && rt === t.key, u = ne === t.key, d = et && t.limit != null && a.length > t.limit, f = t.color ?? En[i % En.length];
								return ie.has(t.key) ? /* @__PURE__ */ C("button", {
									type: "button",
									"data-col-key": t.key,
									onClick: () => Yt(t.key),
									title: U._({ id: "AC9Gkf" }),
									className: `flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-stone-100/60 py-2 text-stone-500 hover:border-brand/40 ${u ? "border-brand/60" : "border-black/[0.05]"}`,
									children: [
										/* @__PURE__ */ S(st, { className: "h-4 w-4" }),
										(it || t.color) && /* @__PURE__ */ S("span", {
											className: "h-2 w-2 rounded-full",
											style: { backgroundColor: f },
											"aria-hidden": !0
										}),
										/* @__PURE__ */ S("span", {
											className: "rounded-full bg-white px-1.5 text-[11px] text-stone-400",
											children: a.length
										}),
										/* @__PURE__ */ S("span", {
											className: "mt-1 whitespace-nowrap text-xs font-medium text-stone-600 [writing-mode:vertical-rl]",
											children: t.name
										})
									]
								}, t.key) : /* @__PURE__ */ C("div", {
									"data-col-key": t.key,
									className: `flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-stone-100/60 transition-opacity ${ye === t.key ? "opacity-50" : ""} ${u ? "border-brand/60" : te?.col === t.key ? "border-brand/40" : "border-black/[0.05]"}`,
									children: [/* @__PURE__ */ C("div", {
										className: "flex items-center justify-between gap-1 rounded-t-xl px-3 py-2",
										style: it ? { backgroundColor: `${f}1f` } : void 0,
										children: [/* @__PURE__ */ C("div", {
											onPointerDown: (e) => Wt(e, t),
											onPointerMove: (e) => Kt(e, t),
											onPointerUp: (e) => Jt(e, t),
											className: `flex min-w-0 flex-1 select-none items-center gap-1.5 text-sm font-medium text-stone-700 ${et && r.reorderColumns ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
											children: [
												/* @__PURE__ */ S("button", {
													type: "button",
													onClick: () => Yt(t.key),
													title: U._({ id: "pwN6Ae" }),
													className: "-ml-1 rotate-90 rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
													children: /* @__PURE__ */ S(st, { className: "h-3.5 w-3.5" })
												}),
												(it || t.color) && /* @__PURE__ */ S("span", {
													className: "h-2 w-2 rounded-full",
													style: { backgroundColor: f },
													"aria-hidden": !0
												}),
												/* @__PURE__ */ S("span", {
													className: "truncate",
													children: t.name || U._({ id: "EbMPZJ" })
												}),
												l && /* @__PURE__ */ S($e, {
													className: "h-3.5 w-3.5 shrink-0 text-emerald-500",
													title: U._({ id: "_5CsXX" })
												}),
												/* @__PURE__ */ C("span", {
													className: `rounded-full px-1.5 text-xs ${d ? "bg-red-100 font-medium text-red-600" : "bg-white text-stone-400"}`,
													title: t.limit == null ? void 0 : U._({
														id: "d5z6xQ",
														values: { 0: t.limit }
													}),
													children: [a.length, t.limit == null ? "" : `/${t.limit}`]
												})
											]
										}), et && !M && Mt && /* @__PURE__ */ C(Ap, {
											as: "div",
											className: "relative shrink-0",
											children: [/* @__PURE__ */ S(wp, {
												className: "rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
												children: /* @__PURE__ */ S(yt, { className: "h-4 w-4" })
											}), /* @__PURE__ */ C(Tp, {
												anchor: "bottom end",
												className: `z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${Et}`,
												children: [
													r.renameColumn && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.renameColumn?.(t.key),
														children: [/* @__PURE__ */ S(Ut, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
													}) }),
													r.toggleDoneColumn && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.toggleDoneColumn?.(t.key),
														children: [/* @__PURE__ */ S($e, { className: "h-3.5 w-3.5" }), l ? /* @__PURE__ */ S(L, { id: "G4qrLy" }) : /* @__PURE__ */ S(L, { id: "wtw-au" })]
													}) }),
													r.setColumnLimit && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.setColumnLimit?.(t.key),
														children: [/* @__PURE__ */ S(kt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Iw6WJa" })]
													}) }),
													r.setColumnColor && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ C("div", {
														className: "px-3 py-1",
														children: [/* @__PURE__ */ S("span", {
															className: "text-[11px] text-brand-gray",
															children: /* @__PURE__ */ S(L, { id: "jZlrte" })
														}), /* @__PURE__ */ C("div", {
															className: "mt-1 flex flex-wrap items-center gap-1.5",
															children: [En.map((e) => /* @__PURE__ */ S("button", {
																type: "button",
																title: e,
																onClick: () => void r.setColumnColor?.(t.key, e),
																className: `h-4 w-4 rounded-full ring-1 ring-black/10 ${t.color === e ? "ring-2 ring-offset-1 ring-stone-500" : ""}`,
																style: { backgroundColor: e }
															}, e)), /* @__PURE__ */ S("button", {
																type: "button",
																title: U._({ id: "H_SQFv" }),
																onClick: () => void r.setColumnColor?.(t.key, null),
																className: `flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${t.color ? "" : "ring-2 ring-offset-1 ring-stone-500"}`,
																children: /* @__PURE__ */ S("span", { className: "h-2 w-2 rounded-full bg-stone-300" })
															})]
														})]
													})] }),
													r.deleteColumn && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
														type: "button",
														disabled: lt.length <= 1,
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 disabled:opacity-40 data-[focus]:bg-red-50",
														onClick: () => void r.deleteColumn?.(t.key),
														children: [/* @__PURE__ */ S(rn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
													}) })] })
												]
											})]
										})]
									}), /* @__PURE__ */ C("div", {
										className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2",
										children: [
											a.map((t, i) => {
												let a = t.due && t.due < ot && t.columnKey !== rt, o = ut.get(t.id) ?? 0, s = pt.get(t.id), l = t.priority && t.priority !== "none" || t.assignee || t.due || (t.taskTotal ?? 0) > 0 || t.tags.length > 0 || o > 0 || (s?.length ?? 0) > 0;
												return /* @__PURE__ */ C(n, { children: [c(i) && /* @__PURE__ */ S("div", { className: "mx-1 h-0.5 rounded bg-brand" }), /* @__PURE__ */ C("div", {
													role: "button",
													tabIndex: 0,
													"data-card-id": t.id,
													"data-card-index": i,
													onPointerDown: (e) => Rt(e, t),
													onPointerMove: (e) => zt(e, t),
													onPointerUp: (e) => Bt(e, t),
													onKeyDown: (e) => {
														e.key === "Enter" && jt(t);
													},
													className: `group relative block w-full cursor-pointer touch-none select-none rounded-lg bg-white p-2.5 text-left shadow-sm transition hover:ring-brand/30 ${_e === t.id ? "opacity-40" : ""} ${z.has(t.id) ? "ring-2 ring-brand/70" : bt?.id === t.id ? "ring-1 ring-brand/60" : "ring-1 ring-black/[0.04]"}`,
													children: [
														!M && /* @__PURE__ */ S("div", {
															className: "absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
															onClick: (e) => e.stopPropagation(),
															onMouseDown: (e) => e.stopPropagation(),
															onPointerDown: (e) => e.stopPropagation(),
															children: /* @__PURE__ */ C(Ap, {
																as: "div",
																children: [/* @__PURE__ */ S(wp, {
																	className: "rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
																	children: /* @__PURE__ */ S(yt, { className: "h-4 w-4" })
																}), /* @__PURE__ */ C(Tp, {
																	anchor: "bottom end",
																	className: `z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${Et}`,
																	children: [
																		r.openCardFull && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																			type: "button",
																			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																			onClick: () => r.openCardFull?.(t),
																			children: [/* @__PURE__ */ S(Ve, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Ik60OC" })]
																		}) }),
																		r.copyCardLink && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																			type: "button",
																			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																			onClick: () => void r.copyCardLink?.(t),
																			children: [/* @__PURE__ */ S(Nt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "y1eoq1" })]
																		}) }),
																		r.duplicateCard && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																			type: "button",
																			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																			onClick: () => void r.duplicateCard?.(t),
																			children: [/* @__PURE__ */ S(_t, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "euc6Ns" })]
																		}) }),
																		r.saveAsTemplate && /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																			type: "button",
																			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																			onClick: () => void r.saveAsTemplate?.(t),
																			children: [/* @__PURE__ */ S(qe, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "BnmEvM" })]
																		}) }),
																		/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }),
																		/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
																			type: "button",
																			className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 data-[focus]:bg-red-50",
																			onClick: () => void r.deleteCard(t),
																			children: [/* @__PURE__ */ S(rn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
																		}) })
																	]
																})]
															})
														}),
														t.ticket && /* @__PURE__ */ S("span", {
															className: "mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
															children: t.ticket
														}),
														/* @__PURE__ */ C("span", {
															className: "block pr-5 text-sm text-stone-800",
															children: [t.icon && /* @__PURE__ */ S("span", {
																className: "mr-1",
																children: t.icon
															}), t.title]
														}),
														t.excerpt && t.excerpt !== t.title && /* @__PURE__ */ S("span", {
															className: "mt-0.5 block truncate text-[11px] text-stone-400",
															children: t.excerpt
														}),
														l && /* @__PURE__ */ C("span", {
															className: "mt-1.5 flex flex-wrap items-center gap-1.5",
															children: [
																o > 0 && /* @__PURE__ */ C("span", {
																	className: "inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600",
																	title: U._({
																		id: "x52RAh",
																		values: { blockedCount: o }
																	}),
																	children: [/* @__PURE__ */ S(Ft, { className: "h-3 w-3" }), o]
																}),
																t.priority && t.priority !== "none" && /* @__PURE__ */ S("span", {
																	className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Tn[t.priority] ?? "bg-stone-100 text-stone-500"}`,
																	children: t.priority
																}),
																(t.taskTotal ?? 0) > 0 && /* @__PURE__ */ C("span", {
																	className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.taskDone === t.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																	children: [
																		/* @__PURE__ */ S($e, { className: "h-3 w-3" }),
																		t.taskDone,
																		"/",
																		t.taskTotal
																	]
																}),
																s && s.length > 0 && (() => {
																	let t = Bn(s, e.doneColumn), n = 2 * Math.PI * 6;
																	return /* @__PURE__ */ C("span", {
																		className: `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.done === t.total ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																		title: U._({
																			id: "bwOqWD",
																			values: {
																				0: t.done,
																				1: t.total
																			}
																		}),
																		children: [
																			/* @__PURE__ */ C("svg", {
																				viewBox: "0 0 16 16",
																				className: "h-3 w-3 -rotate-90",
																				children: [/* @__PURE__ */ S("circle", {
																					cx: "8",
																					cy: "8",
																					r: "6",
																					fill: "none",
																					stroke: "currentColor",
																					strokeOpacity: "0.25",
																					strokeWidth: "3"
																				}), /* @__PURE__ */ S("circle", {
																					cx: "8",
																					cy: "8",
																					r: "6",
																					fill: "none",
																					stroke: "currentColor",
																					strokeWidth: "3",
																					strokeLinecap: "round",
																					strokeDasharray: `${t.done / t.total * n} ${n}`
																				})]
																			}),
																			t.done,
																			"/",
																			t.total
																		]
																	});
																})(),
																t.tags.map((e) => /* @__PURE__ */ C("span", {
																	className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
																	style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
																	children: [/* @__PURE__ */ S(tn, { className: "h-3 w-3" }), e.label]
																}, e.label)),
																t.assignee && /* @__PURE__ */ C("span", {
																	className: "inline-flex items-center gap-0.5 text-[11px] text-brand-gray",
																	children: [/* @__PURE__ */ S(cn, { className: "h-3 w-3" }), t.assignee]
																}),
																t.due && /* @__PURE__ */ C("span", {
																	className: `inline-flex items-center gap-0.5 text-[11px] ${a ? "font-medium text-red-600" : "text-brand-gray"}`,
																	children: [/* @__PURE__ */ S(Ye, { className: "h-3 w-3" }), t.due]
																})
															]
														})
													]
												})] }, t.id);
											}),
											a.length === 0 ? _e && te?.col === t.key && /* @__PURE__ */ S("div", { className: "mx-1 h-14 rounded-lg border-2 border-dashed border-brand/50 bg-brand-soft/30" }) : c(a.length) && /* @__PURE__ */ S("div", { className: "mx-1 h-0.5 rounded bg-brand" }),
											M ? null : o && o.length > 0 && s ? /* @__PURE__ */ C(Ap, {
												as: "div",
												className: "relative",
												children: [/* @__PURE__ */ C(wp, {
													className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
													children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "pnrmSP" })]
												}), /* @__PURE__ */ C(Tp, {
													anchor: "bottom start",
													className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${Et}`,
													children: [
														/* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
															type: "button",
															className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
															onClick: () => oe(t.key),
															children: [/* @__PURE__ */ S(Ut, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "UQOvxZ" })]
														}) }),
														/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }),
														/* @__PURE__ */ S("div", {
															className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
															children: /* @__PURE__ */ S(L, { id: "iTylMl" })
														}),
														o.map((e) => /* @__PURE__ */ S(Ep, { children: /* @__PURE__ */ C("button", {
															type: "button",
															className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
															onClick: () => void s(t.key, e.id),
															children: [/* @__PURE__ */ S(qe, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S("span", {
																className: "truncate",
																children: e.name
															})]
														}) }, e.id))
													]
												})]
											}) : /* @__PURE__ */ C("button", {
												type: "button",
												className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
												onClick: () => oe(t.key),
												children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "pnrmSP" })]
											})
										]
									})]
								}, t.key);
							}),
							et && !M && r.addColumn && (se ? /* @__PURE__ */ S("input", {
								autoFocus: !0,
								className: "w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40",
								placeholder: U._({ id: "P5cvAA" }),
								value: le,
								onChange: (e) => ue(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										let e = le.trim();
										ue(""), ce(!1), e && r.addColumn?.(e);
									}
									e.key === "Escape" && (ue(""), ce(!1));
								},
								onBlur: () => {
									let e = le.trim();
									e && r.addColumn?.(e), ue(""), ce(!1);
								}
							}) : /* @__PURE__ */ C("button", {
								type: "button",
								className: "flex w-44 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 hover:border-brand/40 hover:text-brand-dark",
								onClick: () => {
									ue(""), ce(!0);
								},
								children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "1nUGn5" })]
							})),
							tt && !M && /* @__PURE__ */ C("button", {
								type: "button",
								className: "flex w-72 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 transition hover:border-brand/40 hover:bg-brand-soft/20 hover:text-brand-dark active:translate-y-px",
								onClick: () => Te(!0),
								children: [/* @__PURE__ */ S(Gt, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "KCszT6" })]
							})
						]
					})
				]
			}),
			z.size > 0 && !M && /* @__PURE__ */ C("div", {
				className: "absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-3 py-2 shadow-xl backdrop-blur",
				children: [
					/* @__PURE__ */ S("span", {
						className: "text-xs font-medium text-stone-600",
						children: /* @__PURE__ */ S(L, {
							id: "fvImQM",
							values: { 0: z.size }
						})
					}),
					/* @__PURE__ */ C("select", {
						className: Tt,
						value: "",
						"aria-label": U._({ id: "8enUYo" }),
						onChange: (e) => {
							e.target.value && Ht({ columnKey: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ S("option", {
							value: "",
							disabled: !0,
							children: U._({ id: "BiWlsk" })
						}), e.columns.map((e) => /* @__PURE__ */ S("option", {
							value: e.key,
							children: e.name
						}, e.key))]
					}),
					/* @__PURE__ */ C("select", {
						className: Tt,
						value: "",
						"aria-label": U._({ id: "hNmOZ7" }),
						onChange: (e) => {
							e.target.value && Ht({ priority: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ S("option", {
							value: "",
							disabled: !0,
							children: U._({ id: "B5TUF-" })
						}), Cn.map((e) => /* @__PURE__ */ S("option", {
							value: e,
							children: e
						}, e))]
					}),
					r.deleteCards && /* @__PURE__ */ C("button", {
						type: "button",
						className: "inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50",
						onClick: () => {
							let e = t.filter((e) => z.has(e.id));
							B(/* @__PURE__ */ new Set()), r.deleteCards?.(e);
						},
						children: [/* @__PURE__ */ S(rn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
					}),
					/* @__PURE__ */ S("button", {
						type: "button",
						className: "rounded p-1 text-stone-400 hover:bg-stone-100",
						title: U._({ id: "FBIuPX" }),
						"aria-label": U._({ id: "FBIuPX" }),
						onClick: () => B(/* @__PURE__ */ new Set()),
						children: /* @__PURE__ */ S(fn, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ S(qm, {
				open: H != null,
				boardTitle: e.title,
				laneName: lt.find((e) => e.key === H)?.name ?? U._({ id: "EbMPZJ" }),
				initialStatus: Qe === "status" ? H ?? e.columns[0]?.key ?? "" : e.columns[0]?.key ?? "",
				initialPriority: Qe === "priority" ? H ?? "none" : "none",
				initialAssignee: Qe === "assignee" ? H ?? "" : "",
				statusOptions: e.columns.map((e) => ({
					value: e.key,
					label: e.name,
					color: e.color
				})),
				assigneeOptions: c,
				tagOptions: l,
				portalClassName: I,
				onClose: () => oe(null),
				onCreate: (e) => H == null ? void 0 : Xt(H, e)
			}),
			bt && F && /* @__PURE__ */ C(ff, {
				open: !0,
				onClose: () => R(null),
				className: `fixed inset-0 z-50${Et}`,
				children: [/* @__PURE__ */ S(uf, { className: `fixed inset-0 bg-stone-950/20 backdrop-blur-[2px]${Et}` }), /* @__PURE__ */ S("div", {
					className: `fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-5${Et}`,
					children: /* @__PURE__ */ C(lf, {
						className: `h-full max-h-[900px] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_100px_rgba(28,25,23,0.24)] ring-1 ring-black/[0.06]${Et}`,
						children: [/* @__PURE__ */ S(df, {
							className: "sr-only",
							children: /* @__PURE__ */ S(L, { id: "iROlQr" })
						}), /* @__PURE__ */ S(F, {
							card: bt,
							boardTitle: e.title,
							statusOptions: e.columns.map((e) => ({
								value: e.key,
								label: e.name
							})),
							swimlaneOptions: e.swimlaneBy === "custom" || (e.swimlanes?.length ?? 0) > 0 ? [
								{
									value: "",
									label: U._({ id: "EbMPZJ" })
								},
								...(e.swimlanes ?? []).map((e) => ({
									value: e.key,
									label: e.name,
									color: e.color
								})),
								...bt.swimlaneKey && !(e.swimlanes ?? []).some((e) => e.key === bt.swimlaneKey) ? [{
									value: bt.swimlaneKey,
									label: U._({ id: "7dZyQU" }),
									warning: !0
								}] : []
							] : void 0,
							swimlaneDisabled: Ne,
							assigneeOptions: c,
							tagOptions: l,
							fields: e.fields,
							onAddField: (t) => {
								let n = /* @__PURE__ */ new Set([...Dn, ...(e.fields ?? []).map((e) => e.key)]), r = Hn(t);
								if (n.has(r)) {
									let e = 2;
									for (; n.has(`${r}-${e}`);) e += 1;
									r = `${r}-${e}`;
								}
								Dt({ fields: [...e.fields ?? [], {
									key: r,
									label: t
								}] });
							},
							dependencyCards: t.filter((e) => e.id !== bt.id).map((e) => ({
								slug: In(e),
								title: e.title
							})),
							childCards: (pt.get(bt.id) ?? []).map((e) => ({
								id: e.id,
								title: e.title,
								icon: e.icon,
								statusName: vt(e.columnKey),
								done: e.columnKey === rt
							})),
							onOpenCard: (e) => R(e),
							onAddChild: M ? void 0 : async (t) => {
								await Xe.current.get(bt.id);
								let n = Qe === "status" ? e.columns[0]?.key ?? bt.columnKey : er(bt, e);
								await r.createCard(n, t, { parent: In(bt) });
							},
							loadNotes: u,
							onUploadAttachment: d,
							loadComments: p,
							addComment: m,
							updateComment: h,
							deleteComment: _,
							toggleReaction: b,
							resolveComment: w,
							currentUser: T,
							loadActivity: E,
							renderMarkdownToContainer: D,
							renderMarkdownToHtml: O,
							portalClassName: I,
							supplement: P?.(bt),
							onChange: (e) => void ct(bt.id, e),
							onClose: () => R(null),
							onDelete: () => void r.deleteCard(bt),
							onOpenFull: r.openCardFull ? () => r.openCardFull?.(bt) : void 0
						})]
					})
				})]
			}),
			/* @__PURE__ */ S($m, {
				open: we,
				lanes: e.swimlanes ?? [],
				cards: t,
				portalClassName: I,
				onClose: () => Te(!1),
				onSaveLanes: Ot,
				onUpdateCards: Ct,
				onShowAffected: At
			}),
			/* @__PURE__ */ S(Xm, {
				open: Ee,
				config: e,
				actions: r,
				portalClassName: I,
				onClose: () => Oe(!1)
			}),
			/* @__PURE__ */ S(eh, {
				source: je,
				rows: St,
				open: ke,
				busy: Ne,
				resume: e.swimlaneMigration?.source === je,
				progress: Fe,
				error: Le,
				portalClassName: I,
				onClose: () => {
					Ne || Ae(!1);
				},
				onConfirm: wt
			}),
			_e && Se && (() => {
				let e = t.find((e) => e.id === _e);
				return /* @__PURE__ */ C("div", {
					className: "pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-xl ring-1 ring-brand/40",
					style: {
						left: Se.x,
						top: Se.y
					},
					children: [e?.icon && /* @__PURE__ */ S("span", {
						className: "mr-1",
						children: e.icon
					}), e?.title]
				});
			})()
		]
	});
}
//#endregion
//#region src/client.ts
var nh = class extends Error {
	status;
	code;
	constructor(e, t) {
		super(`jtype API error${e ? ` ${e}` : ""}: ${t}`), this.name = "JTypeApiError", this.status = e, this.code = t;
	}
};
function rh(e) {
	let t = (e.baseUrl ?? "").replace(/\/+$/, ""), n = e.token, r = e.fetchImpl ?? ((...e) => fetch(...e));
	if (!t) throw new nh(0, "base_url_required");
	if (!n) throw new nh(0, "token_required");
	async function i(e, i = {}) {
		let a;
		try {
			a = await r(`${t}${e}`, {
				...i,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${n}`,
					...i.headers ?? {}
				}
			});
		} catch {
			throw new nh(0, "network_error");
		}
		if (!a.ok) {
			let e = await a.json().catch(() => null);
			throw new nh(a.status, e?.error || `http_${a.status}`);
		}
		if (a.status !== 204) return await a.json();
	}
	return {
		listDocuments: (e) => i(`/api/v1/workspaces/${encodeURIComponent(e)}/documents`),
		getDocument: (e, t) => i(`/api/v1/workspaces/${encodeURIComponent(e)}/documents/${encodeURIComponent(t)}`),
		saveDocument: (e, t) => i(`/api/v1/workspaces/${encodeURIComponent(e)}/documents/save`, {
			method: "POST",
			body: JSON.stringify(t)
		}),
		deleteDocument: (e, t) => i(`/api/v1/workspaces/${encodeURIComponent(e)}/documents/${encodeURIComponent(t)}`, { method: "DELETE" }),
		subscribeBoardEvents: (e, i, a) => {
			let o = new AbortController(), s = !1;
			return (async () => {
				let c;
				try {
					c = await r(`${t}/api/v1/workspaces/${encodeURIComponent(e)}/boards/${encodeURIComponent(i)}/events?token=${encodeURIComponent(n)}`, {
						signal: o.signal,
						headers: { Accept: "text/event-stream" }
					});
				} catch {
					s || a.onDown({
						permanent: !1,
						reason: "network_error"
					});
					return;
				}
				if (c.status === 401 || c.status === 403) {
					s || a.onDown({
						permanent: !0,
						reason: "live_forbidden_for_token"
					});
					return;
				}
				if (!c.ok || !c.body) {
					s || a.onDown({
						permanent: !1,
						reason: `http_${c.status}`
					});
					return;
				}
				if (!s) {
					a.onUp();
					try {
						let e = c.body.getReader(), t = new TextDecoder(), n = "";
						for (;;) {
							let { done: r, value: i } = await e.read();
							if (r || s) break;
							n += t.decode(i, { stream: !0 });
							let o;
							for (; (o = n.indexOf("\n\n")) >= 0;) {
								let e = n.slice(0, o);
								n = n.slice(o + 2), !s && e.split("\n").some((e) => e.startsWith("data:")) && a.onEvent();
							}
						}
					} catch {}
					s || a.onDown({
						permanent: !1,
						reason: "stream_closed"
					});
				}
			})(), () => {
				s = !0, o.abort();
			};
		}
	};
}
//#endregion
//#region src/resolveBoard.ts
var ih = class extends Error {
	code;
	candidates;
	constructor(e, t, n = []) {
		super(t ? `${e}: ${t}` : e), this.name = "JTypeBoardError", this.code = e, this.candidates = n;
	}
};
function ah(e, t) {
	let n = t.trim().replace(/^\.?\//, "");
	if (!n) throw new ih("board_not_found", "empty boardRef");
	let r = n.toLowerCase(), i = r.endsWith(".board") ? r : `${r}.board`, a = e.filter((e) => e.relativePath.toLowerCase().endsWith(".board")), o = a.find((e) => {
		let t = e.relativePath.toLowerCase();
		return t === r || t === i;
	});
	if (o) return oh(o);
	let s = a.filter((e) => e.relativePath.toLowerCase().endsWith(`/${i}`));
	if (s.length === 1) return oh(s[0]);
	throw s.length > 1 ? new ih("board_ref_ambiguous", `"${t}" matches ${s.length} boards`, s.map((e) => e.relativePath)) : new ih("board_not_found", `no .board document matches "${t}"`);
}
function oh(e) {
	return {
		boardDocId: e.id,
		boardRelativePath: e.relativePath,
		boardDir: e.relativePath.replace(/\.board$/i, "")
	};
}
//#endregion
//#region src/boardData.ts
function sh(e, t) {
	return {
		title: e.title || t,
		columns: e.columns,
		doneColumn: e.doneColumn,
		colorColumns: e.colorColumns,
		viewType: e.viewType,
		calendarMode: e.calendarMode,
		fields: e.fields,
		labels: e.labels,
		ticketKey: e.ticketKey,
		swimlaneBy: Gn(e.swimlaneBy),
		swimlanes: e.swimlanes,
		swimlaneMigration: e.swimlaneMigration,
		groupBy: Wn(e.groupBy)
	};
}
function ch(e, t) {
	let n = pn(e.content);
	if (n.data.board !== t.id) return null;
	let r = On(n.body);
	return {
		id: e.relativePath,
		relationKey: e.relativePath,
		columnKey: n.data.status || "",
		position: Number(n.data.position ?? 0),
		title: n.data.title || e.title || e.relativePath,
		icon: n.data.icon || null,
		priority: n.data.priority || null,
		assignee: n.data.assignee || null,
		swimlaneKey: n.data.swimlane || null,
		due: n.data.due || null,
		tags: Nn(n.data.tags ? An(n.data.tags) : [], t.labels),
		notes: n.body,
		taskDone: r.done,
		taskTotal: r.total,
		excerpt: kn(n.body),
		attachments: n.data.attachments ? hn(n.data.attachments) : [],
		custom: xn(n.data, t.fields),
		blockedBy: n.data.blocked_by ? Pn(n.data.blocked_by) : [],
		blocks: n.data.blocks ? Pn(n.data.blocks) : [],
		relates: n.data.relates ? Pn(n.data.relates) : [],
		parent: n.data.parent ? Pn(n.data.parent)[0] ?? null : null
	};
}
function lh(e, t) {
	return vn(e, t);
}
var uh = [
	"viewType",
	"groupBy",
	"swimlaneBy",
	"calendarMode"
];
function dh(e, t) {
	let n = { ...e };
	for (let e of uh) e in t && (n[e] = t[e]);
	return n;
}
async function fh(e, t, n, r, i = []) {
	let a = await e.listDocuments(t), o = ah(a, n), s = async (n, i) => {
		let a = r.get(n);
		if (a && a.contentHash === i) return a.doc;
		let o = await e.getDocument(t, n);
		return r.set(n, {
			contentHash: o.contentHash,
			doc: o
		}), o;
	}, c = a.find((e) => e.id === o.boardDocId), l = await s(c.id, c.contentHash), u;
	try {
		if (u = JSON.parse(l.content), !u || typeof u != "object" || !Array.isArray(u.columns)) throw Error("missing columns");
	} catch (e) {
		throw new ih("board_config_invalid", `${o.boardRelativePath}: ${String(e)}`);
	}
	let d = a.filter((e) => (e.relativePath.startsWith(`${o.boardDir}/`) || i.some((t) => e.relativePath.startsWith(`${t}/`))) && e.relativePath.toLowerCase().endsWith(".md")), f = await Promise.all(d.map(async (e) => ({
		item: e,
		doc: await s(e.id, e.contentHash)
	}))), p = /* @__PURE__ */ new Map(), m = [];
	for (let { item: e, doc: t } of f) {
		let n = ch(t, u);
		n && (p.set(t.relativePath, {
			id: e.id,
			relativePath: t.relativePath,
			content: t.content,
			contentHash: t.contentHash
		}), m.push(n));
	}
	let h = new Set(a.map((e) => e.id));
	for (let e of [...r.keys()]) h.has(e) || r.delete(e);
	return {
		config: u,
		boardDocId: o.boardDocId,
		boardRelativePath: o.boardRelativePath,
		boardDir: o.boardDir,
		boardDoc: {
			content: l.content,
			contentHash: l.contentHash
		},
		cards: m,
		metaByPath: p
	};
}
//#endregion
//#region src/CardDetail.tsx
function ph({ card: e, config: t, strings: n, supplement: r, onClose: i }) {
	f(() => {
		let e = (e) => {
			e.key === "Escape" && i();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [i]);
	let a = t.columns.find((t) => t.key === e.columnKey)?.name || e.columnKey, o = e.swimlaneKey ? t.swimlanes?.find((t) => t.key === e.swimlaneKey)?.name ?? n.unassigned : n.unassigned, s = [
		[n.status, a],
		...t.swimlaneBy === "custom" || (t.swimlanes?.length ?? 0) > 0 ? [[n.swimlane, o]] : [],
		...e.priority && e.priority !== "none" ? [[n.priority, e.priority]] : [],
		...e.assignee ? [[n.assignee, e.assignee]] : [],
		...e.due ? [[n.due, e.due]] : [],
		...(t.fields ?? []).map((t) => [t.label, e.custom?.[t.key] ?? ""]).filter(([, e]) => e !== "")
	];
	return /* @__PURE__ */ C("aside", {
		className: "absolute right-0 top-0 z-40 flex h-full w-[360px] max-w-[92%] flex-col border-l border-black/[0.06] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.07)]",
		"aria-label": n.cardReadOnlyHint,
		children: [/* @__PURE__ */ C("div", {
			className: "flex items-center justify-between border-b border-black/[0.05] px-3 py-2",
			children: [/* @__PURE__ */ S("span", {
				className: "text-xs font-medium text-brand-gray",
				children: n.cardReadOnlyHint
			}), /* @__PURE__ */ S("button", {
				type: "button",
				onClick: i,
				title: n.close,
				"aria-label": n.close,
				className: "rounded p-1 text-stone-400 hover:bg-stone-100",
				children: /* @__PURE__ */ S(te, {
					className: "h-4 w-4",
					"aria-hidden": !0
				})
			})]
		}), /* @__PURE__ */ C("div", {
			className: "min-h-0 flex-1 overflow-y-auto p-3",
			children: [
				e.ticket && /* @__PURE__ */ S("span", {
					className: "mb-1 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
					children: e.ticket
				}),
				/* @__PURE__ */ C("h2", {
					className: "text-base font-semibold text-stone-900",
					children: [e.icon && /* @__PURE__ */ S("span", {
						className: "mr-1",
						children: e.icon
					}), e.title]
				}),
				/* @__PURE__ */ C("dl", {
					className: "mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1.5",
					children: [s.map(([e, t]) => /* @__PURE__ */ C("div", {
						className: "contents",
						children: [/* @__PURE__ */ S("dt", {
							className: "truncate text-xs text-brand-gray",
							title: e,
							children: e
						}), /* @__PURE__ */ S("dd", {
							className: "text-sm text-stone-800",
							children: e === n.priority ? /* @__PURE__ */ S("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Tn[t] ?? "bg-stone-100 text-stone-500"}`,
								children: t
							}) : t
						})]
					}, e)), e.tags.length > 0 && /* @__PURE__ */ C("div", {
						className: "contents",
						children: [/* @__PURE__ */ S("dt", {
							className: "text-xs text-brand-gray",
							children: n.tags
						}), /* @__PURE__ */ S("dd", {
							className: "flex flex-wrap gap-1",
							children: e.tags.map((e) => /* @__PURE__ */ S("span", {
								className: "rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
								style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
								children: e.label
							}, e.label))
						})]
					})]
				}),
				(e.attachments?.length ?? 0) > 0 && /* @__PURE__ */ C("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ S("span", {
						className: "text-xs font-medium text-brand-gray",
						children: n.attachments
					}), /* @__PURE__ */ S("ul", {
						className: "mt-1 space-y-1",
						children: e.attachments.map((e) => /* @__PURE__ */ S("li", {
							className: "rounded border border-stone-200 px-2 py-1 text-xs",
							children: bn(e) ? /* @__PURE__ */ S("a", {
								href: e,
								target: "_blank",
								rel: "noreferrer",
								className: "block truncate text-brand-dark hover:underline",
								title: e,
								children: yn(e)
							}) : /* @__PURE__ */ C("span", {
								className: "block truncate text-stone-500",
								title: e,
								children: [
									yn(e),
									" ",
									/* @__PURE__ */ C("span", {
										className: "text-red-500",
										children: [
											"(",
											n.unsafeLink,
											")"
										]
									})
								]
							})
						}, e))
					})]
				}),
				e.notes && e.notes.trim() !== "" && /* @__PURE__ */ C("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ S("span", {
						className: "text-xs font-medium text-brand-gray",
						children: n.notes
					}), /* @__PURE__ */ S("pre", {
						className: "mt-1.5 whitespace-pre-wrap rounded-lg border border-stone-100 bg-stone-50/60 p-2 font-mono text-[12px] leading-5 text-stone-800",
						children: e.notes
					})]
				}),
				r != null && r !== !1 && r !== "" && /* @__PURE__ */ S("section", {
					"aria-label": n.additionalInformation,
					className: "mt-4 border-t border-stone-100 pt-4",
					children: r
				})
			]
		})]
	});
}
//#endregion
//#region src/i18n.ts
var mh = {
	en: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"Notes\"],\"1YABGm\":[\"Link (Ctrl+K)\"],\"1hKEom\":[\"Priority\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"Rename\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3ESfuy\":[\"Add a description…\"],\"3Ib6FN\":[\"Move down\"],\"3dmm5B\":[\"Press ⌘/Ctrl + Enter to create\"],\"3qkggm\":[\"Fullscreen\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4gdyen\":[\"Local (yours)\"],\"4hJhzz\":[\"Table\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[Start] --> B[End]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"Inline Code\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"Swimlane name\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"Confirm\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid diagram\"],\"8Tg_JR\":[\"Custom\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"Result (editable)\"],\"8lE269\":[\"Sort: Manual\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"Could not render this Draw.io diagram.\"],\"AC9Gkf\":[\"Expand column\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"Could not render this PDF.\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"Drag to resize\"],\"AgvHni\":[\"Add column\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"Group: Assignee\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"Accept cloud\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"Save as template\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"Code\"],\"EbMPZJ\":[\"Unassigned\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"Unset done column\"],\"GKu3m4\":[\"No labels\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gpfctt\":[\"Due\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"H_SQFv\":[\"No color\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"Split\"],\"ICip_B\":[\"Cloud (remote)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"Open in editor\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"Set WIP limit\"],\"JKsLFA\":[\"Markdown is supported\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"Search cards\"],\"KAlhe_\":[\"Conversion stopped because card updates did not persist. Refresh and try again.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"K_F6pa\":[\"Saving…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"Bold\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KvW1VO\":[\"Draw.io diagram\"],\"LQn6-8\":[\"Accept local\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"MHrjPM\":[\"Title\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"Description\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"Tags\"],\"OepdfE\":[\"Group: Status\"],\"P5cvAA\":[\"Status name\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"Clear filter\"],\"QD8opX\":[\"Board\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Write Mermaid syntax to see the diagram.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"comma, separated\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[\"Lane details for \",[\"0\"]],\"U0hizX\":[\"Swimlane color\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"Blank card\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"This file type can not be previewed yet.\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"Sort: Priority\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"Please enter a value.\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"Status actions\"],\"YNYued\":[\"Status ID\"],\"Ya7bZl\":[\"Diagram error\"],\"ZH7TVS\":[\"Card title\"],\"Zot9XS\":[\"No cards\"],\"_5CsXX\":[\"Done column\"],\"_DwR-n\":[\"Creating…\"],\"_EsjyQ\":[\"Use this\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_laW0t\":[\"Previous row missing\"],\"a6uhHr\":[\"Bold (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"Add details...\"],\"agOeRN\":[\"Could not render this API specification.\"],\"arhExE\":[\"Swimlane ID\"],\"b4hVKD\":[\"Color columns\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"Changes save automatically.\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"Add labels\"],\"cnGeoo\":[\"Delete\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP limit \",[\"0\"]],\"dEgA5A\":[\"Cancel\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"ddrz1m\":[\"Overdue\"],\"dsLT3m\":[\"Create card\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"Duplicate\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"fOP7Wy\":[\"Additional information\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"Sort: Due\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"Relations\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"Untitled card\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF document\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"Write\"],\"iROlQr\":[\"Card details\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"Templates\"],\"iYVqZq\":[\"Column name\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"Color\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid source\"],\"klk7Go\":[\"Could not create card. Try again.\"],\"kryGs-\":[\"Card\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"Refresh\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_UFPv\":[\"Properties\"],\"l_g7se\":[\"Resume conversion\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"Save merged result\"],\"m16xKo\":[\"Add\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"Delete card\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"Filter\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"Custom fields\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"ojKCLU\":[\"Assignee\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"Sort: Title\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"Open in full editor\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"New card\"],\"pwN6Ae\":[\"Collapse column\"],\"pzutoc\":[\"Italic\"],\"qZd_ph\":[\"Add row\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"Lane details\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"Preview\"],\"rfI3Fa\":[\"Could not create sub-card. Try again.\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"Manage statuses\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sCzmvQ\":[\"cards\"],\"sQpDn6\":[\"Exit fullscreen\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" Conflict\",[\"1\"],\" to Resolve\"],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"Card title (Enter to add, Esc to cancel)\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"Status\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"Copy failed.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"Italic (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"Set as done column\"],\"wwu18a\":[\"Icon\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"Used by\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"y1eoq1\":[\"Copy link\"],\"y9cj46\":[\"Group: Priority\"],\"yEbJGs\":[\"+ Add field\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← Back to list\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yz7wBu\":[\"Close\"],\"yzF66j\":[\"Link\"],\"zOc0vf\":[\"No icon\"],\"zga9sT\":[\"OK\"]}"),
	zh: JSON.parse("{\"--lIxB\":[\"被阻塞于\"],\"-3Qbcm\":[\"优先级：\",[\"0\"]],\"-9kYEs\":[\"横向分组缺失的卡片\"],\"-X4ual\":[\"无优先级\"],\"-b7T3G\":[\"更新\"],\"-eTfgY\":[\"泳道详情\"],\"-hwvgo\":[\"横向分组操作\"],\"02N8r0\":[\"筛选卡片\"],\"0cspe_\":[\"删除横向分组\"],\"0gvHNl\":[\"状态定义卡片工作流。可自由重命名或排序；卡片始终通过状态 ID 保持映射。\"],\"1718Q-\":[\"问题\"],\"1DBGsz\":[\"备注\"],\"1YABGm\":[\"链接 (Ctrl+K)\"],\"1hKEom\":[\"优先级\"],\"1iShX0\":[\"今天到期\"],\"1lWHP7\":[\"不安全\"],\"1nUGn5\":[\"添加状态\"],\"1xwZj_\":[\"上个月\"],\"23yqV0\":[\"显示受影响的卡片\"],\"2BPVq8\":[\"重新排序 \",[\"0\"]],\"2aEwT_\":[\"管理自定义横向分组\"],\"2wxgft\":[\"重命名\"],\"32TndD\":[\"被阻塞\"],\"3CIp19\":[\"未来 7 天\"],\"3CtQL6\":[\"选择另一个泳道，然后先更新卡片。\"],\"3ESfuy\":[\"添加描述…\"],\"3Ib6FN\":[\"下移\"],\"3dmm5B\":[\"按 ⌘/Ctrl + Enter 创建\"],\"3qkggm\":[\"全屏\"],\"4NY8B5\":[\"将创建的泳道\"],\"4gdyen\":[\"本地（我的）\"],\"4hJhzz\":[\"表格\"],\"4t8aKB\":[\"将创建的横向分组\"],\"4vd-Kd\":[\"JType 将根据当前优先级列创建独立的自定义泳道。卡片的优先级值保持不变。\"],\"54sFiP\":[\"flowchart TD\\n  A[开始] --> B[结束]\"],\"5Cawxq\":[\"泳道：自定义\"],\"5Oy0YM\":[\"标签：\",[\"0\"]],\"5Q_DQ6\":[\"行内代码\"],\"66g_UW\":[\"折叠已解决话题\"],\"6G3KzD\":[\"横向分组详情\"],\"6V3Ea3\":[\"已复制\"],\"6YtxFj\":[\"名称\"],\"6buwPb\":[\"看板设置\"],\"79Yvzu\":[\"泳道名称\"],\"7MGAQC\":[\"JType 会复用现有横向分组 ID，并继续完成尚未结束的卡片更新。\"],\"7VpPHA\":[\"确认\"],\"7dZyQU\":[\"原泳道已不存在\"],\"7pBic4\":[\"显示 \",[\"visibleCount\"],\"/\",[\"totalCount\"],\" 张卡片\"],\"7s3WlU\":[\"阻塞\"],\"8PifYj\":[\"Mermaid 图表\"],\"8Tg_JR\":[\"自定义\"],\"8enUYo\":[\"设置状态\"],\"8hSn0h\":[\"结果（可编辑）\"],\"8lE269\":[\"排序:手动\"],\"9L7ptC\":[\"此空横向分组将从看板中移除。\"],\"9OEgyT\":[\"添加回应\"],\"9OH3W0\":[\"解决话题\"],\"9YTdO7\":[\"被阻塞的卡片\"],\"9gx7rl\":[\"有 \",[\"missingCount\"],\" 张卡片引用了已删除的横向分组。\"],\"9gxam6\":[\"无法渲染此 Draw.io 图表。\"],\"AC9Gkf\":[\"展开列\"],\"ANe5kn\":[\"正在更新卡片…\"],\"AS5WO9\":[\"无法渲染此 PDF。\"],\"ATIq3Z\":[\"泳道：自定义\"],\"AVreQ5\":[\"拖动调整宽度\"],\"AgvHni\":[\"添加列\"],\"AjVXBS\":[\"日历\"],\"AoHpbt\":[\"显示泳道缺失的卡片\"],\"AxAubu\":[\"分组:负责人\"],\"B5TUF-\":[\"优先级…\"],\"BfMZ7w\":[\"接受云端\"],\"BiWlsk\":[\"状态…\"],\"BnmEvM\":[\"存为模板\"],\"C6-ZRl\":[\"某人\"],\"CQ_dDx\":[\"泳道：状态\"],\"CXTDT_\":[\"继续泳道转换？\"],\"CxcMyt\":[\"已将 \",[\"0\"],\" 移到第 \",[\"1\"],\" 位，共 \",[\"2\"],\" 项。\"],\"DGEEOQ\":[\"泳道操作\"],\"DPfwMq\":[\"完成\"],\"Db4W3_\":[\"状态\"],\"EWPtMO\":[\"代码\"],\"EbMPZJ\":[\"未分配\"],\"F6osRA\":[\"有 \",[\"danglingCount\"],\" 张卡片引用了已删除的横向分组。\"],\"FBIuPX\":[\"清除选择\"],\"FQylcT\":[\"泳道：缺失\"],\"G4qrLy\":[\"取消完成列\"],\"GKu3m4\":[\"暂无标签\"],\"GL6e_U\":[\"当前有 \",[\"cardCount\"],\" 张卡片使用此横向分组。\"],\"GNoXOd\":[\"复制泳道 ID\"],\"Gpfctt\":[\"截止日期\"],\"HTKRVa\":[\"请勿关闭此对话框。\"],\"H_SQFv\":[\"无颜色\"],\"HajiZl\":[\"月\"],\"HrmW6B\":[\"添加评论…（支持 Markdown）\"],\"I6SWEy\":[\"分栏\"],\"ICip_B\":[\"云端（远程）\"],\"IdMoS6\":[\"创建第一条泳道\"],\"Ik60OC\":[\"在编辑器中打开\"],\"ImOQa9\":[\"回复\"],\"IqKCNQ\":[\"横向分组\"],\"Iw6WJa\":[\"设置 WIP 限制\"],\"JKsLFA\":[\"支持 Markdown\"],\"JPB7_s\":[\"泳道映射缺失的卡片\"],\"JTYvAw\":[\"搜索卡片\"],\"KAlhe_\":[\"卡片更新未能持久化，转换已停止。请刷新后重试。\"],\"KCszT6\":[\"添加泳道\"],\"KFiYGY\":[\"更改颜色\"],\"KGi3u9\":[\"拖动以重新排序\"],\"K_F6pa\":[\"保存中…\"],\"K_cST0\":[\"继续转换横向分组？\"],\"Kd6eg7\":[\"正在移动卡片…\"],\"KeYrQ5\":[\"撤回你的回应\"],\"KjXDqG\":[\"泳道：无\"],\"KmydK6\":[\"粗体\"],\"KpnwJK\":[\"删除“\",[\"0\"],\"”？\"],\"KvW1VO\":[\"Draw.io 图表\"],\"LQn6-8\":[\"接受本地\"],\"Ld9MtR\":[\"横向分组：负责人\"],\"MHrjPM\":[\"标题\"],\"MRsDXp\":[\"JType 将复用现有泳道 ID，并继续尚未完成的卡片更新。\"],\"MYx830\":[\"此空泳道将从看板中移除。\"],\"Mm72la\":[\"暂无评论\"],\"MmYpxT\":[\"回复…\"],\"NBdIgR\":[\"评论\"],\"NYTPDY\":[\"移动卡片并删除\"],\"NnxWLJ\":[\"创建第一个自定义横向分组\"],\"Nu4oKW\":[\"描述\"],\"O6H89R\":[\"已解决\"],\"ONWvwQ\":[\"上传\"],\"OR4WQZ\":[\"+ 添加子卡片\"],\"OYHzN1\":[\"标签\"],\"OepdfE\":[\"分组:状态\"],\"P5cvAA\":[\"状态名称\"],\"PM7yYy\":[\"横向分组 ID\"],\"PUeYA1\":[\"创建可编辑泳道\"],\"Pvpx7b\":[\"粘贴 URL 或路径\"],\"Q-Pe7U\":[[\"0\"],\" 的泳道详情\"],\"Q2mGA7\":[\"清除筛选\"],\"QD8opX\":[\"看板\"],\"QRhoJb\":[\"JType 将根据当前负责人列创建独立的自定义泳道。卡片的负责人值保持不变。\"],\"QlsPZy\":[\"输入 Mermaid 语法以查看图表。\"],\"QmZYQP\":[\"取消解决\"],\"QyioBP\":[\"上移\"],\"RbsNko\":[\"当前有 \",[\"cardCount\"],\" 张卡片使用此泳道。\"],\"RfEZH1\":[\"JType 将根据当前负责人行创建独立泳道。卡片的负责人值不会改变。\"],\"RgO4DX\":[\"泳道 ID“\",[\"0\"],\"”重复。将使用第一条定义。\"],\"RlLl3G\":[[\"0\"],\" 的操作\"],\"RnplaY\":[[\"0\"],\" 的横向分组详情\"],\"S5Qbb1\":[\"用逗号分隔\"],\"SavliD\":[\"有 \",[\"danglingCount\"],\" 张卡片引用了已删除的泳道。\"],\"T_nAzC\":[\"JType 将复用现有泳道 ID，并继续未完成的卡片更新。\"],\"TdfEV7\":[\"归档\"],\"Th4mIx\":[[\"0\"],\" 的泳道详情\"],\"U0hizX\":[\"泳道颜色\"],\"U95P80\":[\"将优先级横向分组转为可编辑？\"],\"UDb2YD\":[\"回应\"],\"UQOvxZ\":[\"空白卡片\"],\"URmyfc\":[\"详情\"],\"Ubl2by\":[\"右移\"],\"UouxNQ\":[\"泳道：负责人\"],\"VNa_N2\":[\"暂不支持预览此文件类型。\"],\"VXh9CK\":[\"无截止日期\"],\"VbyRUy\":[\"评论\"],\"Ve-C10\":[\"泳道：优先级\"],\"WEYdDv\":[\"推荐\"],\"WSP6v1\":[\"排序:优先级\"],\"WSbuWy\":[\"泳道缺失\"],\"WWUwTb\":[\"将负责人横向分组转为可编辑？\"],\"X03-eC\":[\"请输入内容。\"],\"XJOV1Y\":[\"活动\"],\"XicmhT\":[\"截止日期\"],\"XklovM\":[\"正在处理…\"],\"Y8bR2a\":[\"仅删除泳道。卡片引用仍可恢复。\"],\"YDa2KG\":[\"我的卡片\"],\"YFdnVT\":[\"卡片状态\"],\"YHjvGb\":[\"状态操作\"],\"YNYued\":[\"状态 ID\"],\"Ya7bZl\":[\"图表错误\"],\"ZH7TVS\":[\"卡片标题\"],\"Zot9XS\":[\"暂无卡片\"],\"_5CsXX\":[\"完成列\"],\"_DwR-n\":[\"创建中…\"],\"_EsjyQ\":[\"使用此版本\"],\"_TJomP\":[\"删除前移动卡片\"],\"_YbTQZ\":[\"JType 将根据当前优先级行创建独立泳道。卡片的优先级值不会改变。\"],\"_kh61D\":[\"显示横向分组缺失的卡片\"],\"_laW0t\":[\"原横向分组已缺失\"],\"a6uhHr\":[\"粗体 (Ctrl+B)\"],\"aDvLhk\":[\"添加评论…\"],\"abUZlY\":[\"添加详情...\"],\"agOeRN\":[\"无法渲染此 API 规范。\"],\"arhExE\":[\"泳道 ID\"],\"b4hVKD\":[\"彩色列\"],\"bUNpV2\":[\"泳道 ID“\",[\"0\"],\"”重复。将使用第一个定义。\"],\"bwOqWD\":[[\"1\"],\" 张子卡中已完成 \",[\"0\"],\" 张\"],\"by_svU\":[\"将卡片保留在未分配\"],\"bzjBcL\":[\"子卡片\"],\"c-EXz1\":[\"仅删除横向分组。卡片引用仍可恢复。\"],\"c61_Lv\":[\"泳道 ID\"],\"cJ44lA\":[\"未排期\"],\"cSev-j\":[\"筛选\"],\"cUt8yN\":[\"更改会自动保存。\"],\"ceQmqN\":[\"自定义横向分组\"],\"cfaWH-\":[\"添加标签\"],\"cnGeoo\":[\"删除\"],\"d-F6q9\":[\"创建\"],\"d5z6xQ\":[\"WIP 限制 \",[\"0\"]],\"dEgA5A\":[\"取消\"],\"dQva-y\":[\"横向分组 ID“\",[\"0\"],\"”重复。将使用第一条定义。\"],\"ddrz1m\":[\"已逾期\"],\"dsLT3m\":[\"创建卡片\"],\"eAi4RE\":[\"JType 会根据当前优先级分组创建独立的自定义横向分组。卡片的优先级不会改变。\"],\"ecUA8p\":[\"今天\"],\"euc6Ns\":[\"复制卡片\"],\"fEqHZq\":[\"打开子卡片\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"fOP7Wy\":[\"附加信息\"],\"fOluHh\":[\"JType 会根据当前负责人分组创建独立的自定义横向分组。卡片的负责人不会改变。\"],\"fVlS4-\":[\"泳道\"],\"fYcKtB\":[\"排序:截止\"],\"fdEjOR\":[\"复制横向分组 ID\"],\"fvImQM\":[\"已选择 \",[\"0\"],\" 项\"],\"fwTn8F\":[\"横向分组颜色\"],\"g87L9j\":[\"关联\"],\"g8JmSC\":[\"下个月\"],\"gANddk\":[\"上传中…\"],\"gLDJuJ\":[\"未命名卡片\"],\"guQk4e\":[\"列：状态\"],\"gzZWjO\":[\"没有可转换的已分配值。\"],\"h8DugX\":[\"标签\"],\"hL5-_P\":[\"横向分组\"],\"hNQgyI\":[\"列：优先级\"],\"hNmOZ7\":[\"设置优先级\"],\"he3ygx\":[\"复制\"],\"hh4sEG\":[\"相关\"],\"hnK1gR\":[\"PDF 文档\"],\"hyVzII\":[\"泳道\"],\"i4_LY_\":[\"写作\"],\"iROlQr\":[\"卡片详情\"],\"iSLA_r\":[\"左移\"],\"iTylMl\":[\"模板\"],\"iYVqZq\":[\"列名称\"],\"jUbC3Z\":[\"泳道：优先级\"],\"jZlrte\":[\"颜色\"],\"jzy1b8\":[\"将泳道转为可编辑\"],\"k4b5_X\":[\"已编辑\"],\"kBRFD0\":[\"创建可编辑横向分组\"],\"kMqzL_\":[\"横向分组名称\"],\"kZlRKE\":[\"Mermaid 源码\"],\"klk7Go\":[\"无法创建卡片，请重试。\"],\"kryGs-\":[\"卡片\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"刷新\"],\"lEQWoB\":[\"添加稳定的横向分组，即使没有卡片也会保持显示。\"],\"lHxVTh\":[\"泳道：负责人\"],\"lUeOk0\":[\"此看板的横向分组。名称可以更改，卡片映射会保持关联。\"],\"l_UFPv\":[\"属性\"],\"l_g7se\":[\"继续转换\"],\"lqoy3F\":[\"横向分组缺失\"],\"lt2UOc\":[\"横向分组：无\"],\"ltF1xa\":[\"保存合并结果\"],\"m16xKo\":[\"添加\"],\"mPINe9\":[\"横向分组名称“\",[\"0\"],\"”重复。名称应保持唯一。\"],\"nNGN_D\":[\"自定义泳道\"],\"nabda1\":[\"删除卡片\"],\"nfhh60\":[\"将优先级泳道转为可编辑？\"],\"njJFtc\":[\"删除评论\"],\"o7J4JM\":[\"筛选\"],\"o8va6N\":[\"恢复\"],\"oPwQt4\":[\"自定义字段\"],\"obId50\":[\"筛选，已启用 \",[\"activeCount\"],\" 项\"],\"ojKCLU\":[\"负责人\"],\"p4rTvq\":[\"横向分组：优先级\"],\"p9yTeb\":[\"排序:标题\"],\"pKKcSl\":[\"显示已解决话题\"],\"pKztsX\":[\"在完整编辑器中打开\"],\"pdVZUg\":[\"在制品 \",[\"0\"]],\"pip_Rq\":[\"管理自定义泳道\"],\"pnrmSP\":[\"新建卡片\"],\"pwN6Ae\":[\"折叠列\"],\"pzutoc\":[\"斜体\"],\"qZd_ph\":[\"添加横向分组\"],\"qpGDiV\":[\"复制泳道 ID\"],\"rF8SEQ\":[\"编辑评论\"],\"rK_KGj\":[\"看板的可选横向分组。名称可以修改，卡片仍通过横向分组 ID 保持映射。\"],\"rRubBJ\":[\"泳道详情\"],\"rT-mCe\":[\"移除筛选：\",[\"0\"]],\"rdUucN\":[\"预览\"],\"rfI3Fa\":[\"无法创建子卡片，请重试。\"],\"rn2_2V\":[\"移除筛选\"],\"rvpMpc\":[\"管理状态\"],\"s8QaQC\":[\"此看板的纵向列。名称可以修改；卡片始终通过泳道 ID 保持映射。\"],\"sCzmvQ\":[\"张卡片\"],\"sQpDn6\":[\"退出全屏\"],\"sujToP\":[\"父卡片\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 个冲突\",[\"1\"],\"待解决\"],\"tYS8HY\":[\"无论作为列还是泳道使用，状态列都可以继续管理。\"],\"t_YqKh\":[\"移除\"],\"tfDRzk\":[\"保存\"],\"u2IprG\":[\"卡片标题(回车添加,Esc 取消)\"],\"u36sC2\":[\"转为可编辑横向分组\"],\"uAP6ov\":[\"删除泳道\"],\"uAQUqI\":[\"状态\"],\"uH1U8v\":[\"管理泳道\"],\"uWPalN\":[\"泳道名称“\",[\"0\"],\"”重复。名称应保持唯一。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"ucJg3u\":[\"泳道：状态\"],\"vIKvqQ\":[\"有 \",[\"missingCount\"],\" 张卡片引用了已删除的泳道。\"],\"vJvZPY\":[\"负责人：\",[\"0\"]],\"vMTOsC\":[\"将负责人泳道转为可编辑？\"],\"vfYjJ_\":[\"复制失败。\"],\"w7E-FA\":[\"已拦截不安全链接：\",[\"url\"]],\"wGM_xy\":[\"横向分组：自定义\"],\"w_Sphq\":[\"附件\"],\"wf6Djn\":[\"斜体 (Ctrl+I)\"],\"wp-2ZK\":[\"横向分组：状态\"],\"wtw-au\":[\"设为完成列\"],\"wwu18a\":[\"图标\"],\"x52RAh\":[\"被 \",[\"blockedCount\"],\" 张未完成卡片阻塞\"],\"xDsmP9\":[\"日程\"],\"xUOPoQ\":[\"使用情况\"],\"xX5QVp\":[\"选择另一个横向分组，然后先更新卡片。\"],\"y1eoq1\":[\"复制链接\"],\"y9cj46\":[\"分组:优先级\"],\"yEbJGs\":[\"+ 添加字段\"],\"yYxB17\":[\"清除全部\"],\"ybGQtY\":[\"← 返回列表\"],\"yjeGpt\":[\"列：负责人\"],\"yz7wBu\":[\"关闭\"],\"yzF66j\":[\"链接\"],\"zOc0vf\":[\"无图标\"],\"zga9sT\":[\"确定\"]}"),
	ja: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"問題\"],\"1DBGsz\":[\"ノート\"],\"1YABGm\":[\"リンク (Ctrl+K)\"],\"1hKEom\":[\"優先度\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"ステータスを追加\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"影響を受けるカードを表示\"],\"2BPVq8\":[[\"0\"],\"を並べ替え\"],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"名前を変更\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"別のスイムレーンを選び、先にカードを更新します。\"],\"3ESfuy\":[\"説明を追加…\"],\"3Ib6FN\":[\"下へ移動\"],\"3dmm5B\":[\"⌘/Ctrl + Enter で作成\"],\"3qkggm\":[\"全画面表示\"],\"4NY8B5\":[\"作成するスイムレーン\"],\"4gdyen\":[\"ローカル（自分の）\"],\"4hJhzz\":[\"表\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[開始] --> B[終了]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"インラインコード\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"コピーしました\"],\"6YtxFj\":[\"名前\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"スイムレーン名\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"確認\"],\"7dZyQU\":[\"以前のスイムレーンが見つかりません\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 図\"],\"8Tg_JR\":[\"カスタム\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"結果（編集可能）\"],\"8lE269\":[\"並べ替え：手動\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"この Draw.io 図をレンダリングできませんでした。\"],\"AC9Gkf\":[\"列を展開\"],\"ANe5kn\":[\"カードを更新中…\"],\"AS5WO9\":[\"この PDF をレンダリングできませんでした。\"],\"ATIq3Z\":[\"スイムレーン：カスタム\"],\"AVreQ5\":[\"ドラッグしてサイズ変更\"],\"AgvHni\":[\"列を追加\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"スイムレーンが見つからないカードを表示\"],\"AxAubu\":[\"グループ：担当者\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"クラウドを採用\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"テンプレートとして保存\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"スイムレーンの変換を再開しますか？\"],\"CxcMyt\":[[\"0\"],\"を\",[\"2\"],\"件中\",[\"1\"],\"番目に移動しました。\"],\"DGEEOQ\":[\"スイムレーンの操作\"],\"DPfwMq\":[\"完了\"],\"Db4W3_\":[\"ステータス\"],\"EWPtMO\":[\"コード\"],\"EbMPZJ\":[\"未割り当て\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"スイムレーン：不明\"],\"G4qrLy\":[\"完了列を解除\"],\"GKu3m4\":[\"ラベルなし\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gpfctt\":[\"期限\"],\"HTKRVa\":[\"このダイアログを閉じないでください。\"],\"H_SQFv\":[\"色なし\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"分割\"],\"ICip_B\":[\"クラウド（リモート）\"],\"IdMoS6\":[\"最初のスイムレーンを作成\"],\"Ik60OC\":[\"エディターで開く\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"WIP 制限を設定\"],\"JKsLFA\":[\"Markdown に対応\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"カードを検索\"],\"KAlhe_\":[\"カードの更新が保存されなかったため、変換を停止しました。更新して再試行してください。\"],\"KCszT6\":[\"スイムレーンを追加\"],\"KFiYGY\":[\"色を変更\"],\"KGi3u9\":[\"ドラッグして並べ替え\"],\"K_F6pa\":[\"保存中…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"カードを移動中…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"太字\"],\"KpnwJK\":[\"「\",[\"0\"],\"」を削除しますか？\"],\"KvW1VO\":[\"Draw.io 図\"],\"LQn6-8\":[\"ローカルを採用\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"MHrjPM\":[\"タイトル\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"この空のスイムレーンをボードから削除します。\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"カードを移動して削除\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"説明\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"タグ\"],\"OepdfE\":[\"グループ：ステータス\"],\"P5cvAA\":[\"ステータス名\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"編集可能なスイムレーンを作成\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"フィルターをクリア\"],\"QD8opX\":[\"ボード\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Mermaid 構文を書くと図が表示されます。\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"上へ移動\"],\"RbsNko\":[\"現在\",[\"cardCount\"],\"枚のカードがこのスイムレーンを使用しています。\"],\"RfEZH1\":[\"JType は現在の担当者行から独立したスイムレーンを作成します。カードの担当者は変更されません。\"],\"RgO4DX\":[\"スイムレーン ID「\",[\"0\"],\"」が重複しています。最初の定義を使用します。\"],\"RlLl3G\":[[\"0\"],\"の操作\"],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"カンマ区切り\"],\"SavliD\":[[\"danglingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"T_nAzC\":[\"JType は既存のスイムレーン ID を再利用し、未完了のカード更新を続行します。\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" のレーン詳細\"],\"U0hizX\":[\"スイムレーンの色\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"空のカード\"],\"URmyfc\":[\"詳細\"],\"Ubl2by\":[\"右へ移動\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"このファイル形式はまだプレビューできません。\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WEYdDv\":[\"推奨\"],\"WSP6v1\":[\"並べ替え：優先度\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"値を入力してください。\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"処理中…\"],\"Y8bR2a\":[\"スイムレーンだけを削除します。カードの参照は復元できます。\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"ステータスの操作\"],\"YNYued\":[\"Status ID\"],\"Ya7bZl\":[\"図のエラー\"],\"ZH7TVS\":[\"カードのタイトル\"],\"Zot9XS\":[\"カードなし\"],\"_5CsXX\":[\"完了列\"],\"_DwR-n\":[\"作成中…\"],\"_EsjyQ\":[\"これを使用\"],\"_TJomP\":[\"削除前にカードを移動\"],\"_YbTQZ\":[\"JType は現在の優先度行から独立したスイムレーンを作成します。カードの優先度は変更されません。\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_laW0t\":[\"Previous row missing\"],\"a6uhHr\":[\"太字 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"詳細を追加...\"],\"agOeRN\":[\"この API 仕様をレンダリングできませんでした。\"],\"arhExE\":[\"Swimlane ID\"],\"b4hVKD\":[\"色付き列\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"カードを未割り当てに残す\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"スイムレーン ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"変更は自動的に保存されます。\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"ラベルを追加\"],\"cnGeoo\":[\"削除\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 制限 \",[\"0\"]],\"dEgA5A\":[\"キャンセル\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"ddrz1m\":[\"Overdue\"],\"dsLT3m\":[\"カードを作成\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"複製\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"fOP7Wy\":[\"追加情報\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"スイムレーン\"],\"fYcKtB\":[\"並べ替え：期限\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"関連\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"無題のカード\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"変換できる割り当て済みの値がありません。\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"コピー\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF ドキュメント\"],\"hyVzII\":[\"スイムレーン\"],\"i4_LY_\":[\"記述\"],\"iROlQr\":[\"カードの詳細\"],\"iSLA_r\":[\"左へ移動\"],\"iTylMl\":[\"テンプレート\"],\"iYVqZq\":[\"列名\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"カラー\"],\"jzy1b8\":[\"スイムレーンを編集可能にする\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid ソース\"],\"klk7Go\":[\"カードを作成できませんでした。もう一度お試しください。\"],\"kryGs-\":[\"カード\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"更新\"],\"lEQWoB\":[\"カードがなくても表示され続ける横方向のグループを追加します。\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"このボードの横方向グループです。名前を変更しても、カードの関連付けは維持されます。\"],\"l_UFPv\":[\"プロパティ\"],\"l_g7se\":[\"変換を再開\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"マージ結果を保存\"],\"m16xKo\":[\"追加\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"カードを削除\"],\"nfhh60\":[\"優先度スイムレーンを編集可能にしますか？\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"フィルター\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"カスタムフィールド\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"ojKCLU\":[\"担当者\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"並べ替え：タイトル\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"フルエディターで開く\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"新規カード\"],\"pwN6Ae\":[\"列を折りたたむ\"],\"pzutoc\":[\"イタリック\"],\"qZd_ph\":[\"Add row\"],\"qpGDiV\":[\"スイムレーン ID をコピー\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"スイムレーンの詳細\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"プレビュー\"],\"rfI3Fa\":[\"サブカードを作成できませんでした。もう一度お試しください。\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"ステータスを管理\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sCzmvQ\":[\"枚のカード\"],\"sQpDn6\":[\"全画面表示を終了\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 件の競合\",[\"1\"],\"を解決中\"],\"tYS8HY\":[\"ステータス列は、列またはスイムレーンとして使用中でも管理できます。\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"カードのタイトル（Enter で追加、Esc でキャンセル）\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"スイムレーンを削除\"],\"uAQUqI\":[\"ステータス\"],\"uH1U8v\":[\"スイムレーンを管理\"],\"uWPalN\":[\"スイムレーン名「\",[\"0\"],\"」が重複しています。名前は一意にしてください。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"担当者スイムレーンを編集可能にしますか？\"],\"vfYjJ_\":[\"コピーに失敗しました。\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"イタリック (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"完了列に設定\"],\"wwu18a\":[\"アイコン\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"使用状況\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"y1eoq1\":[\"リンクをコピー\"],\"y9cj46\":[\"グループ：優先度\"],\"yEbJGs\":[\"+ Add field\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← リストに戻る\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yz7wBu\":[\"閉じる\"],\"yzF66j\":[\"リンク\"],\"zOc0vf\":[\"アイコンなし\"],\"zga9sT\":[\"OK\"]}"),
	ko: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"노트\"],\"1YABGm\":[\"링크 (Ctrl+K)\"],\"1hKEom\":[\"우선순위\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"이름 변경\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3ESfuy\":[\"설명 추가…\"],\"3Ib6FN\":[\"Move down\"],\"3dmm5B\":[\"⌘/Ctrl + Enter를 눌러 만들기\"],\"3qkggm\":[\"전체 화면\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4gdyen\":[\"로컈 (내 것)\"],\"4hJhzz\":[\"테이블\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[시작] --> B[끝]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"인라인 코드\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"Swimlane name\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"확인\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 다이어그램\"],\"8Tg_JR\":[\"Custom\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"결과 (편집 가능)\"],\"8lE269\":[\"정렬: 수동\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"이 Draw.io 다이어그램을 렌더링할 수 없습니다.\"],\"AC9Gkf\":[\"열 펼치기\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"이 PDF를 렌더링할 수 없습니다.\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"드래그하여 크기 조정\"],\"AgvHni\":[\"열 추가\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"그룹: 담당자\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"클라우드 수낙\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"템플릿으로 저장\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"코드\"],\"EbMPZJ\":[\"미할당\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"완료 열 해제\"],\"GKu3m4\":[\"라벨 없음\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gpfctt\":[\"마감\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"H_SQFv\":[\"색상 없음\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"스플릿\"],\"ICip_B\":[\"클라우드 (원격)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"에디터에서 열기\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"WIP 한도 설정\"],\"JKsLFA\":[\"Markdown 지원\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"카드 검색\"],\"KAlhe_\":[\"카드 업데이트가 저장되지 않아 변환을 중지했습니다. 새로 고친 후 다시 시도하세요.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"K_F6pa\":[\"저장 중…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"굵게\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KvW1VO\":[\"Draw.io 다이어그램\"],\"LQn6-8\":[\"로컈 수낙\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"MHrjPM\":[\"제목\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"설명\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"태그\"],\"OepdfE\":[\"그룹: 상태\"],\"P5cvAA\":[\"Status name\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"필터 지우기\"],\"QD8opX\":[\"보드\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Mermaid 구문을 작성하면 다이어그램이 표시됩니다.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"쉼표로 구분\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" 레인 세부 정보\"],\"U0hizX\":[\"Swimlane color\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"빈 카드\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"이 파일 형식은 아직 미리볼 수 없습니다.\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"정렬: 우선순위\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"값을 입력해 주세요.\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"Status actions\"],\"YNYued\":[\"Status ID\"],\"Ya7bZl\":[\"다이어그램 오류\"],\"ZH7TVS\":[\"카드 제목\"],\"Zot9XS\":[\"카드 없음\"],\"_5CsXX\":[\"완료 열\"],\"_DwR-n\":[\"만드는 중…\"],\"_EsjyQ\":[\"이것 사용\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_laW0t\":[\"Previous row missing\"],\"a6uhHr\":[\"굵게 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"세부정보 추가...\"],\"agOeRN\":[\"이 API 명세를 렌더링할 수 없습니다.\"],\"arhExE\":[\"Swimlane ID\"],\"b4hVKD\":[\"색상 열\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"Changes save automatically.\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"라벨 추가\"],\"cnGeoo\":[\"삭제\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 한도 \",[\"0\"]],\"dEgA5A\":[\"취소\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"ddrz1m\":[\"Overdue\"],\"dsLT3m\":[\"카드 만들기\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"복제\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"fOP7Wy\":[\"추가 정보\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"정렬: 마감\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"관계\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"제목 없는 카드\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF 문서\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"작성\"],\"iROlQr\":[\"카드 세부 정보\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"템플릿\"],\"iYVqZq\":[\"열 이름\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"색상\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid 소스\"],\"klk7Go\":[\"카드를 만들 수 없습니다. 다시 시도해 주세요.\"],\"kryGs-\":[\"카드\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"새로고침\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_UFPv\":[\"속성\"],\"l_g7se\":[\"Resume conversion\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"병합 결과 저장\"],\"m16xKo\":[\"Add\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"카드 삭제\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"필터\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"사용자 지정 필드\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"ojKCLU\":[\"담당자\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"정렬: 제목\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"전체 에디터에서 열기\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"새 카드\"],\"pwN6Ae\":[\"열 접기\"],\"pzutoc\":[\"기울임꼴\"],\"qZd_ph\":[\"Add row\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"Lane details\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"미리보기\"],\"rfI3Fa\":[\"하위 카드를 만들 수 없습니다. 다시 시도하세요.\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"Manage statuses\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sCzmvQ\":[\"개 카드\"],\"sQpDn6\":[\"전체 화면 종료\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"tK2x9T\":[\"⚠ 해결할 충돌 \",[\"0\"],\"건\",[\"1\"]],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"카드 제목 (Enter로 추가, Esc로 취소)\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"상태\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"복사하지 못했습니다.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"기울임꼴 (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"완료 열로 설정\"],\"wwu18a\":[\"아이콘\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"Used by\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"y1eoq1\":[\"링크 복사\"],\"y9cj46\":[\"그룹: 우선순위\"],\"yEbJGs\":[\"+ Add field\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← 목록으로\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yz7wBu\":[\"닫기\"],\"yzF66j\":[\"링크\"],\"zOc0vf\":[\"아이콘 없음\"],\"zga9sT\":[\"확인\"]}")
};
function hh(e) {
	U.load(e, mh[e] ?? mh.en), U.activate(e);
}
//#endregion
//#region src/strings.ts
var gh = {
	en: {
		loading: "Loading board…",
		live: "Live",
		polling: (e) => `Auto-refresh · ${e}s`,
		connectionError: "Connection error",
		liveUnavailableHint: "Live updates are not available for this token — refreshing by polling.",
		retry: "Retry",
		close: "Close",
		cardReadOnlyHint: "Read-only card view",
		additionalInformation: "Additional information",
		status: "Status",
		swimlane: "Swimlane",
		unassigned: "Unassigned",
		priority: "Priority",
		assignee: "Assignee",
		due: "Due",
		tags: "Tags",
		attachments: "Attachments",
		notes: "Notes",
		unsafeLink: "unsafe link blocked",
		confirmDeleteCard: (e) => `Delete card "${e}"? It moves to the trash.`,
		deleteUnsupported: "This client does not support deleting cards.",
		errPropsBoth: "Pass either `client` OR `baseUrl`+`token` to <JTypeBoard>, not both.",
		errPropsNone: "<JTypeBoard> needs `baseUrl`+`token`, or an injected `client`.",
		errBoardNotFound: (e) => `Board "${e}" was not found in this workspace.`,
		errBoardAmbiguous: (e, t) => `Board name "${e}" is ambiguous: ${t.join(", ")}. Use the full path.`,
		errBoardConfigInvalid: "The board configuration document could not be parsed.",
		errCardNotFound: (e) => `Card "${e}" was not found on this board.`,
		errUnauthorized: "The token was rejected (invalid, expired, or no access to this workspace).",
		errNetwork: "Could not reach the jtype server.",
		errGeneric: (e) => `Board failed to load: ${e}`
	},
	zh: {
		loading: "正在加载看板…",
		live: "实时",
		polling: (e) => `自动刷新 · ${e}秒`,
		connectionError: "连接错误",
		liveUnavailableHint: "当前令牌不支持实时更新，已改为轮询刷新。",
		retry: "重试",
		close: "关闭",
		cardReadOnlyHint: "只读卡片视图",
		additionalInformation: "附加信息",
		status: "状态",
		swimlane: "泳道",
		unassigned: "未分配",
		priority: "优先级",
		assignee: "负责人",
		due: "截止",
		tags: "标签",
		attachments: "附件",
		notes: "备注",
		unsafeLink: "已拦截不安全链接",
		confirmDeleteCard: (e) => `删除卡片“${e}”？它将移入回收站。`,
		deleteUnsupported: "当前客户端不支持删除卡片。",
		errPropsBoth: "<JTypeBoard> 的 `client` 与 `baseUrl`+`token` 只能二选一。",
		errPropsNone: "<JTypeBoard> 需要 `baseUrl`+`token`，或注入 `client`。",
		errBoardNotFound: (e) => `在该工作区中找不到看板“${e}”。`,
		errBoardAmbiguous: (e, t) => `看板名“${e}”有歧义：${t.join("、")}。请使用完整路径。`,
		errBoardConfigInvalid: "看板配置文档无法解析。",
		errCardNotFound: (e) => `在该看板中找不到卡片“${e}”。`,
		errUnauthorized: "令牌被拒绝（无效、过期或无该工作区权限）。",
		errNetwork: "无法连接 jtype 服务器。",
		errGeneric: (e) => `看板加载失败：${e}`
	},
	ja: {
		loading: "ボードを読み込み中…",
		live: "ライブ",
		polling: (e) => `自動更新 · ${e}秒`,
		connectionError: "接続エラー",
		liveUnavailableHint: "このトークンではライブ更新を利用できないため、ポーリングで更新します。",
		retry: "再試行",
		close: "閉じる",
		cardReadOnlyHint: "読み取り専用のカード表示",
		additionalInformation: "追加情報",
		status: "ステータス",
		swimlane: "スイムレーン",
		unassigned: "未割り当て",
		priority: "優先度",
		assignee: "担当者",
		due: "期限",
		tags: "タグ",
		attachments: "添付ファイル",
		notes: "メモ",
		unsafeLink: "安全でないリンクをブロックしました",
		confirmDeleteCard: (e) => `カード「${e}」を削除しますか？ごみ箱に移動します。`,
		deleteUnsupported: "このクライアントはカードの削除に対応していません。",
		errPropsBoth: "<JTypeBoard> には `client` か `baseUrl`+`token` のどちらか一方のみを渡してください。",
		errPropsNone: "<JTypeBoard> には `baseUrl`+`token` または `client` が必要です。",
		errBoardNotFound: (e) => `ワークスペースにボード「${e}」が見つかりません。`,
		errBoardAmbiguous: (e, t) => `ボード名「${e}」が曖昧です：${t.join("、")}。フルパスを使用してください。`,
		errBoardConfigInvalid: "ボード設定ドキュメントを解析できませんでした。",
		errCardNotFound: (e) => `このボードにカード「${e}」が見つかりません。`,
		errUnauthorized: "トークンが拒否されました（無効・期限切れ・権限なし）。",
		errNetwork: "jtype サーバーに接続できません。",
		errGeneric: (e) => `ボードの読み込みに失敗しました：${e}`
	},
	ko: {
		loading: "보드를 불러오는 중…",
		live: "실시간",
		polling: (e) => `자동 새로고침 · ${e}초`,
		connectionError: "연결 오류",
		liveUnavailableHint: "이 토큰은 실시간 업데이트를 지원하지 않아 폴링으로 새로고침합니다.",
		retry: "다시 시도",
		close: "닫기",
		cardReadOnlyHint: "읽기 전용 카드 보기",
		additionalInformation: "추가 정보",
		status: "상태",
		swimlane: "스윔레인",
		unassigned: "미할당",
		priority: "우선순위",
		assignee: "담당자",
		due: "마감",
		tags: "태그",
		attachments: "첨부파일",
		notes: "메모",
		unsafeLink: "안전하지 않은 링크 차단됨",
		confirmDeleteCard: (e) => `카드 "${e}"을(를) 삭제할까요? 휴지통으로 이동합니다.`,
		deleteUnsupported: "이 클라이언트는 카드 삭제를 지원하지 않습니다.",
		errPropsBoth: "<JTypeBoard>에는 `client` 또는 `baseUrl`+`token` 중 하나만 전달하세요.",
		errPropsNone: "<JTypeBoard>에는 `baseUrl`+`token` 또는 `client`가 필요합니다.",
		errBoardNotFound: (e) => `워크스페이스에서 보드 "${e}"을(를) 찾을 수 없습니다.`,
		errBoardAmbiguous: (e, t) => `보드 이름 "${e}"이(가) 모호합니다: ${t.join(", ")}. 전체 경로를 사용하세요.`,
		errBoardConfigInvalid: "보드 설정 문서를 해석할 수 없습니다.",
		errCardNotFound: (e) => `이 보드에서 카드 "${e}"을(를) 찾을 수 없습니다.`,
		errUnauthorized: "토큰이 거부되었습니다(무효, 만료 또는 권한 없음).",
		errNetwork: "jtype 서버에 연결할 수 없습니다.",
		errGeneric: (e) => `보드를 불러오지 못했습니다: ${e}`
	}
};
function _h(e) {
	return gh[e] ?? gh.en;
}
//#endregion
//#region src/JTypeBoard.tsx
function vh() {
	return Math.random().toString(36).slice(2, 6);
}
function yh({ workspaceId: e, boardRef: t, baseUrl: n, token: r, client: i, readOnly: a = !1, currentUser: o, live: s = !0, pollIntervalMs: c = 3e4, initialCardPath: l, additionalCardRoots: u, onCardOpen: d, renderCardSupplement: p, onConnectionChange: m, locale: h, className: _, style: b }) {
	let w = h ?? "en", T = _h(w), E = v(null);
	E.current !== w && (E.current = w, hh(w));
	let D = i && (n || r) ? T.errPropsBoth : !i && (!n || !r) ? T.errPropsNone : null, O = g(() => D ? null : i || rh({
		baseUrl: n,
		token: r
	}), [
		i,
		n,
		r,
		D
	]), k = Math.max(5e3, c), A = (u ?? []).map((e) => e.trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "")).filter((e) => e !== "" && !e.startsWith("/") && e.split("/").every((e) => e !== "" && e !== "." && e !== "..")).filter((e, t, n) => n.indexOf(e) === t).join("\0"), j = g(() => A ? A.split("\0") : [], [A]), [M, N] = y(null), [P, F] = y(""), [I, L] = y(""), [R, z] = y("polling"), [B, te] = y(null), [V, ne] = y({}), re = v(null), ie = v(/* @__PURE__ */ new Map()), ae = v(null), H = v(null), oe = v(m);
	oe.current = m;
	let se = v(T);
	se.current = T;
	let ce = (e) => {
		let n = se.current;
		return e instanceof ih ? e.code === "board_not_found" ? n.errBoardNotFound(t) : e.code === "board_ref_ambiguous" ? n.errBoardAmbiguous(t, e.candidates) : e.code === "board_config_invalid" ? n.errBoardConfigInvalid : n.errGeneric(e.message) : e instanceof nh ? e.status === 401 || e.status === 403 ? n.errUnauthorized : e.status === 0 && e.code === "network_error" ? n.errNetwork : n.errGeneric(e.code) : n.errGeneric(e instanceof Error ? e.message : String(e));
	}, le = v(ce);
	le.current = ce, f(() => {
		if (!O) return;
		let n = !1, r = null, i = null, a = null, o = null, c = !1, l = !1;
		re.current = null, N(null), F(""), L(""), te(null), ne({});
		let u = (e) => {
			n || (z(e), H.current !== e && (H.current = e, oe.current?.(e)));
		}, d = async () => {
			try {
				let r = await fh(O, e, t, ie.current, j);
				return n ? null : (re.current = r, N(r), F(""), L(""), u(c ? "live" : "polling"), r);
			} catch (e) {
				if (n) return null;
				let t = le.current(e);
				return re.current ? L(t) : F(t), u("error"), null;
			}
		};
		ae.current = d;
		let f = () => {
			r = setTimeout(async () => {
				n || (c || await d(), n || f());
			}, k);
		}, p = (t) => {
			n || !s || l || !O.subscribeBoardEvents || (o = O.subscribeBoardEvents(e, t, {
				onEvent: () => {
					a && clearTimeout(a), a = setTimeout(() => void d(), 300);
				},
				onUp: () => {
					c = !0, u("live");
				},
				onDown: ({ permanent: e }) => {
					c = !1, !n && (re.current && u("polling"), e ? l = !0 : i = setTimeout(() => p(t), 3e4));
				}
			}));
		};
		return d().then((e) => {
			n || (e && p(e.config.id), f());
		}), () => {
			n = !0, r && clearTimeout(r), i && clearTimeout(i), a && clearTimeout(a), o?.(), ae.current = null;
		};
	}, [
		O,
		e,
		t,
		s,
		k,
		j
	]);
	let ue = g(() => {
		let t = () => ae.current?.() ?? Promise.resolve(null), n = async (e) => {
			try {
				await e();
			} catch (e) {
				L(le.current(e));
			}
		}, r = async (t, n) => {
			let r = re.current;
			if (!r || !O) return;
			let i = r.metaByPath.get(t), a = await O.saveDocument(e, {
				relativePath: t,
				content: n,
				baseContentHash: i?.contentHash,
				baseContent: i?.content
			});
			if (i) {
				let e = re.current;
				if (!e) return;
				let r = new Map(e.metaByPath);
				r.set(t, {
					...r.get(t) ?? i,
					content: n,
					contentHash: a.contentHash
				});
				let o = {
					...e,
					metaByPath: r
				};
				re.current = o, N((t) => t === e ? o : t);
			}
		};
		return {
			refresh: () => void t(),
			setConfig: async (n) => {
				try {
					let r = re.current;
					if (!r || !O) return;
					if (a) {
						ne((e) => dh(e, n));
						return;
					}
					let i = {
						...r.config,
						...n
					};
					await O.saveDocument(e, {
						relativePath: r.boardRelativePath,
						content: JSON.stringify(i, null, 2),
						baseContentHash: r.boardDoc.contentHash,
						baseContent: r.boardDoc.content
					}), await t();
				} catch (e) {
					throw L(le.current(e)), e;
				}
			},
			createCard: async (n, r, i) => {
				let a = re.current;
				if (!(!a || !O)) try {
					let o = Kn(a.config), s = Jn(o, n, i), c = a.cards.filter((e) => er(e, a.config) === s).reduce((e, t) => Math.max(e, t.position), -1) + 1, l = lh(lh(mn("", {
						title: r,
						board: a.config.id,
						status: o === "status" ? s : a.config.columns[0]?.key ?? "todo",
						position: String(c)
					}), qn(o, s)), i ?? {}), u = `${a.boardDir}/${Hn(r)}.md`;
					return a.metaByPath.has(u) && (u = `${a.boardDir}/${Hn(r)}-${vh()}.md`), await O.saveDocument(e, {
						relativePath: u,
						content: l
					}), await t(), u;
				} catch (e) {
					throw L(le.current(e)), e;
				}
			},
			updateCard: (e, i) => n(async () => {
				let n = re.current, a = n?.metaByPath.get(e);
				!n || !a || (await r(e, lh(a.content, i)), await t());
			}),
			updateCards: async (e, n) => {
				try {
					if (a) return;
					let i = re.current;
					if (!i) return;
					let o = e.find((e) => !i.metaByPath.has(e.cardId));
					if (o) throw Error(`Card metadata is missing for ${o.cardId}.`);
					let s = 0;
					for (let t of e) {
						let a = i.metaByPath.get(t.cardId);
						await r(t.cardId, lh(a.content, t.patch)), s += 1, n?.(s, e.length);
					}
					await t();
				} catch (e) {
					throw await t(), L(le.current(e)), e;
				}
			},
			moveCard: (e, i, a) => n(async () => {
				let n = re.current;
				if (!n || !O) return;
				let o = Kn(n.config), s = n.metaByPath.get(e);
				if (!s) return;
				if (o !== "status") {
					let a = n.cards.find((t) => t.id === e);
					if (!a || er(a, n.config) === i) return;
					await r(e, lh(s.content, qn(o, i))), await t();
					return;
				}
				let c = n.cards.filter((t) => t.columnKey === i && t.id !== e).sort((e, t) => e.position - t.position), l = n.cards.find((t) => t.id === e);
				l && c.splice(Math.max(0, Math.min(a, c.length)), 0, l);
				for (let t = 0; t < c.length; t++) {
					let a = c[t];
					if (!a) continue;
					let o = n.metaByPath.get(a.id);
					if (!o || a.id !== e && a.position === t && a.columnKey === i) continue;
					let { data: s, body: l } = pn(o.content);
					await r(a.id, mn(l, {
						...s,
						status: i,
						position: String(t)
					}));
				}
				await t();
			}),
			deleteCard: async (r) => {
				let i = re.current, a = i?.metaByPath.get(r.id);
				if (!(!i || !a || !O)) {
					if (!O.deleteDocument) {
						L(se.current.deleteUnsupported);
						return;
					}
					window.confirm(se.current.confirmDeleteCard(r.title)) && await n(async () => {
						await O.deleteDocument(e, a.id), await t();
					});
				}
			}
		};
	}, [
		O,
		e,
		a
	]), de = g(() => M ? a ? {
		...M.config,
		...V
	} : M.config : null, [
		M,
		a,
		V
	]), fe = g(() => M && de ? sh(de, M.boardDir) : null, [M, de]), pe = B ? M?.cards.find((e) => e.id === B) ?? null : null, me = l && M && !M.cards.some((e) => e.id === l) ? T.errCardNotFound(l) : "", he = d ?? (a ? (e) => te(e.id) : void 0), ge;
	return ge = D ? /* @__PURE__ */ S(bh, { message: D }) : !M && P ? /* @__PURE__ */ S(bh, {
		message: P,
		retryLabel: T.retry,
		onRetry: () => void ae.current?.()
	}) : !M || !fe ? /* @__PURE__ */ S("div", {
		className: "flex h-full items-center justify-center bg-[#fbfdfb] p-8 text-sm text-stone-500",
		children: T.loading
	}) : /* @__PURE__ */ C(x, { children: [
		/* @__PURE__ */ S(ee, {
			i18n: U,
			children: /* @__PURE__ */ S(th, {
				config: fe,
				cards: M.cards,
				actions: ue,
				error: I || me || void 0,
				initialCardId: l,
				readOnly: a,
				currentUser: o,
				onCardOpen: he,
				peekComponent: !a && !d ? Mm : void 0,
				renderCardSupplement: p,
				portalClassName: "jtb-scope"
			})
		}),
		pe && a && !d && de && /* @__PURE__ */ S(ph, {
			card: pe,
			config: de,
			strings: T,
			supplement: p?.(pe),
			onClose: () => te(null)
		}),
		/* @__PURE__ */ S(xh, {
			state: R,
			strings: T,
			pollSecs: Math.round(k / 1e3),
			liveWanted: s
		})
	] }), /* @__PURE__ */ S("div", {
		className: `jtb-scope jtb-root ${_ ?? ""}`,
		style: b,
		"data-jtype-board": t,
		children: ge
	});
}
function bh({ message: e, retryLabel: t, onRetry: n }) {
	return /* @__PURE__ */ C("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center",
		children: [
			/* @__PURE__ */ S(z, {
				className: "h-9 w-9 text-amber-500",
				"aria-hidden": !0
			}),
			/* @__PURE__ */ S("p", {
				className: "max-w-md break-words text-sm text-stone-600",
				children: e
			}),
			n && t && /* @__PURE__ */ S("button", {
				type: "button",
				onClick: n,
				className: "rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				children: t
			})
		]
	});
}
function xh({ state: e, strings: t, pollSecs: n, liveWanted: r }) {
	let i = e === "live" ? t.live : e === "polling" ? t.polling(n) : t.connectionError, a = e === "live" ? "bg-emerald-500" : e === "polling" ? "bg-stone-400" : "bg-red-500";
	return /* @__PURE__ */ C("div", {
		className: "pointer-events-none absolute bottom-2 right-2 z-40 inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 px-2 py-0.5 text-[11px] text-stone-500 shadow-sm",
		title: e === "polling" && r ? t.liveUnavailableHint : void 0,
		children: [/* @__PURE__ */ S("span", {
			className: `h-1.5 w-1.5 rounded-full ${a}`,
			"aria-hidden": !0
		}), i]
	});
}
//#endregion
export { nh as JTypeApiError, yh as JTypeBoard, ih as JTypeBoardError, rh as createJTypeClient, ah as resolveBoardDoc };
