import * as e from "react";
import t, { Fragment as n, cloneElement as r, createContext as i, createElement as a, createRef as o, forwardRef as s, isValidElement as c, useCallback as l, useContext as u, useDebugValue as d, useEffect as f, useId as p, useId as m, useId as h, useLayoutEffect as g, useMemo as _, useReducer as v, useRef as y, useState as b, useSyncExternalStore as x } from "react";
import { Fragment as S, jsx as C, jsxs as w } from "react/jsx-runtime";
import * as T from "react-dom";
import { createPortal as E, flushSync as D } from "react-dom";
//#region node_modules/@lingui/react/dist/shared/react.DZONiYSA.mjs
var O = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)\/>/, k = {
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
function A(e, t = {}) {
	let n = e.split(O);
	if (n.length === 1) return e;
	let i = M(0, "$lingui$"), a = [], o = n.shift();
	o && a.push(o);
	for (let [e, o, s] of j(n)) {
		let n = e === void 0 ? void 0 : t[e];
		(!n || k[n.type] && o) && (console.error(n ? `${n.type} is a void element tag therefore it must have no children` : `Can't use element at index '${e}' as it is not declared in the original translation`), n = /* @__PURE__ */ C(S, {})), Array.isArray(n) && (n = /* @__PURE__ */ C(S, { children: n })), a.push(r(n, { key: i() }, o ? A(o, t) : n.props.children)), s && a.push(s);
	}
	return a.length === 1 ? a[0] : a;
}
function j(e) {
	if (!e.length) return [];
	let [t, n, r, i] = e.slice(0, 4);
	return [[
		t || r,
		n || "",
		i
	]].concat(j(e.slice(4, e.length)));
}
var M = (e = 0, t = "") => () => `${t}_${e++}`;
function N(e) {
	let { render: t, component: n, id: r, message: i, formats: a, lingui: { i18n: o, defaultComponent: s } } = e, { values: c, components: l } = F(e), u = o && typeof o._ == "function" ? o._(r, c, {
		message: i,
		formats: a
	}) : r, d = u ? A(u, l) : null;
	if (t === null || n === null) return d;
	let f = s || P, p = {
		id: r,
		message: i,
		translation: d,
		children: d
	};
	if (t && n) console.error("You can't use both `component` and `render` prop at the same time. `component` is ignored.");
	else if (t && typeof t != "function") console.error(`Invalid value supplied to prop \`render\`. It must be a function, provided ${t}`);
	else if (n && typeof n != "function") return console.error(`Invalid value supplied to prop \`component\`. It must be a React component, provided ${n}`), /* @__PURE__ */ C(f, {
		...p,
		children: d
	});
	return typeof t == "function" ? t(p) : /* @__PURE__ */ C(n || f, {
		...p,
		children: d
	});
}
var P = ({ children: e }) => e, F = (e) => {
	if (!e.values) return {
		values: void 0,
		components: e.components
	};
	let t = { ...e.values }, n = { ...e.components };
	return Object.entries(e.values).forEach(([e, r]) => {
		if (typeof r == "string" || typeof r == "number") return;
		let i = Object.keys(n).length;
		n[i] = /* @__PURE__ */ C(S, { children: r }), t[e] = `<${i}/>`;
	}), {
		values: t,
		components: n
	};
}, I = i(null), L = (e) => u(I);
function R() {
	return L();
}
var ee = ({ i18n: e, defaultComponent: t, children: n }) => {
	let r = y(e.locale || null), i = l(() => ({
		i18n: new Proxy(e, {}),
		defaultComponent: t,
		_: e.t.bind(e)
	}), [e, t]), [a, o] = b(i);
	return f(() => {
		let t = () => {
			r.current = e.locale || null, o(i());
		}, n = e.on("change", t);
		return r.current !== e.locale && t(), n;
	}, [e, i]), r.current === null ? null : /* @__PURE__ */ C(I.Provider, {
		value: a,
		children: n
	});
};
function z(e) {
	let t = L(void 0);
	return /* @__PURE__ */ C(N, {
		...e,
		lingui: t
	});
}
//#endregion
//#region node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
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
		d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
	}));
}
var te = /*#__PURE__*/ e.forwardRef(B);
//#endregion
//#region node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function V({ title: t, titleId: n, ...r }, i) {
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
var H = /*#__PURE__*/ e.forwardRef(V), ne = (e) => typeof e == "string", re = (e) => typeof e == "function", ie = /* @__PURE__ */ new Map(), ae = "en";
function oe(e) {
	return [...Array.isArray(e) ? e : [e], ae];
}
function se(e, t, n) {
	let r = oe(e);
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
	return de(() => fe("date", r, n), () => new Intl.DateTimeFormat(r, i)).format(ne(t) ? new Date(t) : t);
}
function ce(e, t, n) {
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
	return se(e, t, r);
}
function le(e, t, n) {
	let r = oe(e);
	return de(() => fe("number", r, n), () => new Intl.NumberFormat(r, n)).format(t);
}
function ue(e, t, n, { offset: r = 0, ...i }) {
	let a = oe(e), o = t ? de(() => fe("plural-ordinal", a), () => new Intl.PluralRules(a, { type: "ordinal" })) : de(() => fe("plural-cardinal", a), () => new Intl.PluralRules(a, { type: "cardinal" }));
	return i[n] ?? i[o.select(n - r)] ?? i.other;
}
function de(e, t) {
	let n = e(), r = ie.get(n);
	return r || (r = t(), ie.set(n, r)), r;
}
function fe(e, t, n) {
	return `${e}-${t.join("-")}-${JSON.stringify(n)}`;
}
var pe = /\\u[a-fA-F0-9]{4}|\\x[a-fA-F0-9]{2}/, me = (e) => e.replace(/\\u([a-fA-F0-9]{4})|\\x([a-fA-F0-9]{2})/g, (e, t, n) => {
	if (t) {
		let e = parseInt(t, 16);
		return String.fromCharCode(e);
	} else {
		let e = parseInt(n, 16);
		return String.fromCharCode(e);
	}
}), he = "%__lingui_octothorpe__%", ge = (e, t, n = {}) => {
	let r = t || e, i = (e) => typeof e == "object" ? e : n[e], a = (e, t) => {
		let a = Object.keys(n).length ? i("number") : void 0, o = le(r, e, a);
		return t.replace(new RegExp(he, "g"), o);
	};
	return {
		plural: (e, t) => {
			let { offset: n = 0 } = t, i = ue(r, !1, e, t);
			return a(e - n, i);
		},
		selectordinal: (e, t) => {
			let { offset: n = 0 } = t, i = ue(r, !0, e, t);
			return a(e - n, i);
		},
		select: U,
		number: (e, t) => le(r, e, i(t) || { style: t }),
		date: (e, t) => se(r, e, i(t) || t),
		time: (e, t) => ce(r, e, i(t) || t)
	};
}, U = (e, t) => t[e] ?? t.other;
function _e(e, t, n) {
	return (r = {}, i) => {
		let a = ge(t, n, i), o = (e, t = !1) => Array.isArray(e) ? e.reduce((e, n) => {
			if (n === "#" && t) return e + he;
			if (ne(n)) return e + n;
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
		return ne(s) && pe.test(s) ? me(s) : ne(s) ? s : s ? String(s) : "";
	};
}
var ve = class {
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
}, ye = class extends ve {
	_locale = "";
	_locales;
	_messages = {};
	_missing;
	_messageCompiler;
	constructor(e) {
		super(), e.missing != null && (this._missing = e.missing), e.messages != null && this.load(e.messages), (typeof e.locale == "string" || e.locales) && this.activate(e.locale ?? ae, e.locales);
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
		e ||= "", ne(e) || (t = e.values || t, r = e.message, e = e.id);
		let i = this.messages[e], a = i === void 0, o = this._missing;
		if (o && a) return re(o) ? o(this._locale, e) : o;
		a && this.emit("missing", {
			id: e,
			locale: this._locale
		});
		let s = i || r || e;
		return ne(s) && (this._messageCompiler ? s = this._messageCompiler(s) : console.warn(`Uncompiled message detected! Message:

> ${s}

That means you use raw catalog or your catalog doesn't have a translation for the message and fallback was used.
ICU features such as interpolation and plurals will not work properly for that message.

Please compile your catalog first.
`)), ne(s) && pe.test(s) ? me(s) : ne(s) ? s : _e(s, this._locale, this._locales)(t, n?.formats);
	}
	t = this._.bind(this);
	date(e, t) {
		return se(this._locales || this._locale, e, t);
	}
	number(e, t) {
		return le(this._locales || this._locale, e, t);
	}
};
function be(e = {}) {
	return new ye(e);
}
var W = be();
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/AdjustmentsHorizontalIcon.js
function xe({ title: t, titleId: n, ...r }, i) {
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
var Se = /*#__PURE__*/ e.forwardRef(xe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArchiveBoxIcon.js
function Ce({ title: t, titleId: n, ...r }, i) {
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
		d: "m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
	}));
}
var we = /*#__PURE__*/ e.forwardRef(Ce);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowDownIcon.js
function Te({ title: t, titleId: n, ...r }, i) {
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
var Ee = /*#__PURE__*/ e.forwardRef(Te);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowLeftIcon.js
function De({ title: t, titleId: n, ...r }, i) {
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
var Oe = /*#__PURE__*/ e.forwardRef(De);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowPathIcon.js
function ke({ title: t, titleId: n, ...r }, i) {
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
var Ae = /*#__PURE__*/ e.forwardRef(ke);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowRightIcon.js
function je({ title: t, titleId: n, ...r }, i) {
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
var Me = /*#__PURE__*/ e.forwardRef(je);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowTopRightOnSquareIcon.js
function Ne({ title: t, titleId: n, ...r }, i) {
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
var Pe = /*#__PURE__*/ e.forwardRef(Ne);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUpTrayIcon.js
function Fe({ title: t, titleId: n, ...r }, i) {
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
var Ie = /*#__PURE__*/ e.forwardRef(Fe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUpIcon.js
function Le({ title: t, titleId: n, ...r }, i) {
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
var Re = /*#__PURE__*/ e.forwardRef(Le);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUturnLeftIcon.js
function ze({ title: t, titleId: n, ...r }, i) {
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
var Be = /*#__PURE__*/ e.forwardRef(ze);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingInIcon.js
function Ve({ title: t, titleId: n, ...r }, i) {
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
var He = /*#__PURE__*/ e.forwardRef(Ve);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingOutIcon.js
function Ue({ title: t, titleId: n, ...r }, i) {
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
var We = /*#__PURE__*/ e.forwardRef(Ue);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Bars3Icon.js
function Ge({ title: t, titleId: n, ...r }, i) {
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
var Ke = /*#__PURE__*/ e.forwardRef(Ge);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BarsArrowDownIcon.js
function qe({ title: t, titleId: n, ...r }, i) {
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
var Je = /*#__PURE__*/ e.forwardRef(qe);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BellAlertIcon.js
function Ye({ title: t, titleId: n, ...r }, i) {
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
		d: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
	}));
}
var Xe = /*#__PURE__*/ e.forwardRef(Ye);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BookmarkIcon.js
function Ze({ title: t, titleId: n, ...r }, i) {
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
var Qe = /*#__PURE__*/ e.forwardRef(Ze);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BriefcaseIcon.js
function $e({ title: t, titleId: n, ...r }, i) {
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
		d: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
	}));
}
var et = /*#__PURE__*/ e.forwardRef($e);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CalendarDaysIcon.js
function tt({ title: t, titleId: n, ...r }, i) {
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
var nt = /*#__PURE__*/ e.forwardRef(tt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChartBarIcon.js
function rt({ title: t, titleId: n, ...r }, i) {
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
		d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
	}));
}
var it = /*#__PURE__*/ e.forwardRef(rt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChatBubbleLeftEllipsisIcon.js
function at({ title: t, titleId: n, ...r }, i) {
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
		d: "M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
	}));
}
var ot = /*#__PURE__*/ e.forwardRef(at);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChatBubbleLeftIcon.js
function st({ title: t, titleId: n, ...r }, i) {
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
var ct = /*#__PURE__*/ e.forwardRef(st);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckCircleIcon.js
function lt({ title: t, titleId: n, ...r }, i) {
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
var ut = /*#__PURE__*/ e.forwardRef(lt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckIcon.js
function dt({ title: t, titleId: n, ...r }, i) {
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
var ft = /*#__PURE__*/ e.forwardRef(dt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronDownIcon.js
function pt({ title: t, titleId: n, ...r }, i) {
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
var mt = /*#__PURE__*/ e.forwardRef(pt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronLeftIcon.js
function ht({ title: t, titleId: n, ...r }, i) {
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
var gt = /*#__PURE__*/ e.forwardRef(ht);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronRightIcon.js
function _t({ title: t, titleId: n, ...r }, i) {
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
var vt = /*#__PURE__*/ e.forwardRef(_t);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronUpDownIcon.js
function yt({ title: t, titleId: n, ...r }, i) {
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
var bt = /*#__PURE__*/ e.forwardRef(yt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClipboardDocumentListIcon.js
function xt({ title: t, titleId: n, ...r }, i) {
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
		d: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
	}));
}
var St = /*#__PURE__*/ e.forwardRef(xt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClipboardDocumentIcon.js
function Ct({ title: t, titleId: n, ...r }, i) {
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
var wt = /*#__PURE__*/ e.forwardRef(Ct);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClockIcon.js
function Tt({ title: t, titleId: n, ...r }, i) {
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
var Et = /*#__PURE__*/ e.forwardRef(Tt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Cog6ToothIcon.js
function Dt({ title: t, titleId: n, ...r }, i) {
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
var Ot = /*#__PURE__*/ e.forwardRef(Dt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/DocumentDuplicateIcon.js
function kt({ title: t, titleId: n, ...r }, i) {
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
var At = /*#__PURE__*/ e.forwardRef(kt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EllipsisHorizontalIcon.js
function jt({ title: t, titleId: n, ...r }, i) {
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
var Mt = /*#__PURE__*/ e.forwardRef(jt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
function Nt({ title: t, titleId: n, ...r }, i) {
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
var Pt = /*#__PURE__*/ e.forwardRef(Nt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EyeIcon.js
function Ft({ title: t, titleId: n, ...r }, i) {
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
var It = /*#__PURE__*/ e.forwardRef(Ft);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FaceSmileIcon.js
function Lt({ title: t, titleId: n, ...r }, i) {
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
var Rt = /*#__PURE__*/ e.forwardRef(Lt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FlagIcon.js
function zt({ title: t, titleId: n, ...r }, i) {
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
var Bt = /*#__PURE__*/ e.forwardRef(zt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FunnelIcon.js
function Vt({ title: t, titleId: n, ...r }, i) {
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
var Ht = /*#__PURE__*/ e.forwardRef(Vt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/InboxIcon.js
function Ut({ title: t, titleId: n, ...r }, i) {
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
		d: "M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
	}));
}
var Wt = /*#__PURE__*/ e.forwardRef(Ut);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/InformationCircleIcon.js
function Gt({ title: t, titleId: n, ...r }, i) {
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
var Kt = /*#__PURE__*/ e.forwardRef(Gt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LinkIcon.js
function qt({ title: t, titleId: n, ...r }, i) {
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
var Jt = /*#__PURE__*/ e.forwardRef(qt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LockClosedIcon.js
function Yt({ title: t, titleId: n, ...r }, i) {
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
var Xt = /*#__PURE__*/ e.forwardRef(Yt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/MagnifyingGlassIcon.js
function Zt({ title: t, titleId: n, ...r }, i) {
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
var Qt = /*#__PURE__*/ e.forwardRef(Zt);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PaperClipIcon.js
function $t({ title: t, titleId: n, ...r }, i) {
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
var en = /*#__PURE__*/ e.forwardRef($t);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilSquareIcon.js
function tn({ title: t, titleId: n, ...r }, i) {
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
var nn = /*#__PURE__*/ e.forwardRef(tn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilIcon.js
function rn({ title: t, titleId: n, ...r }, i) {
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
var an = /*#__PURE__*/ e.forwardRef(rn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PlusIcon.js
function on({ title: t, titleId: n, ...r }, i) {
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
var sn = /*#__PURE__*/ e.forwardRef(on);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/QueueListIcon.js
function cn({ title: t, titleId: n, ...r }, i) {
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
		d: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
	}));
}
var ln = /*#__PURE__*/ e.forwardRef(cn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleGroupIcon.js
function un({ title: t, titleId: n, ...r }, i) {
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
var dn = /*#__PURE__*/ e.forwardRef(un);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleStackIcon.js
function fn({ title: t, titleId: n, ...r }, i) {
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
var pn = /*#__PURE__*/ e.forwardRef(fn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Squares2X2Icon.js
function mn({ title: t, titleId: n, ...r }, i) {
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
var hn = /*#__PURE__*/ e.forwardRef(mn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TableCellsIcon.js
function gn({ title: t, titleId: n, ...r }, i) {
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
var _n = /*#__PURE__*/ e.forwardRef(gn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TagIcon.js
function vn({ title: t, titleId: n, ...r }, i) {
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
var yn = /*#__PURE__*/ e.forwardRef(vn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TrashIcon.js
function bn({ title: t, titleId: n, ...r }, i) {
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
var xn = /*#__PURE__*/ e.forwardRef(bn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserCircleIcon.js
function Sn({ title: t, titleId: n, ...r }, i) {
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
var Cn = /*#__PURE__*/ e.forwardRef(Sn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserIcon.js
function wn({ title: t, titleId: n, ...r }, i) {
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
var Tn = /*#__PURE__*/ e.forwardRef(wn);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ViewColumnsIcon.js
function En({ title: t, titleId: n, ...r }, i) {
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
var Dn = /*#__PURE__*/ e.forwardRef(En);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function On({ title: t, titleId: n, ...r }, i) {
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
var kn = /*#__PURE__*/ e.forwardRef(On);
//#endregion
//#region ../../shared/lib/frontmatter.ts
function An(e) {
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
function jn(e, t) {
	let n = An(e), r = {
		...n.data,
		...t
	};
	return `---\n${Object.entries(r).filter(([, e]) => e !== "").map(([e, t]) => `${e}: ${t}`).join("\n")}\n---\n\n${n.body.trimStart()}`;
}
//#endregion
//#region ../../shared/lib/board.ts
function Mn(e, t = "Untitled board") {
	let n = JSON.parse(e), r = (e) => typeof e == "object" && !!e && !Array.isArray(e);
	if (!r(n)) throw Error("Board configuration must be a JSON object.");
	if (typeof n.id != "string" || n.id.trim() === "") throw Error("Board configuration is missing a non-empty id.");
	if (!Array.isArray(n.columns) || n.columns.some((e) => !r(e) || typeof e.key != "string" || typeof e.name != "string")) throw Error("Board configuration must contain columns with string key and name values.");
	for (let [e, t] of [
		["fields", ["key", "label"]],
		["labels", ["label"]],
		["swimlanes", ["key", "name"]]
	]) {
		let i = n[e];
		if (i !== void 0 && (!Array.isArray(i) || i.some((e) => !r(e) || t.some((t) => typeof e[t] != "string")))) throw Error(`Board configuration has an invalid ${e} array.`);
	}
	if (n.project !== void 0 && !r(n.project)) throw Error("Board configuration has invalid project metadata.");
	if (n.swimlaneMigration !== void 0) {
		let e = n.swimlaneMigration;
		if (!r(e) || !Array.isArray(e.mapping) || e.mapping.some((e) => !r(e) || typeof e.value != "string" || typeof e.swimlaneKey != "string")) throw Error("Board configuration has an invalid swimlane migration.");
	}
	return {
		...n,
		id: n.id,
		title: typeof n.title == "string" && n.title.trim() ? n.title : t,
		columns: n.columns
	};
}
function Nn(e) {
	return e.split(",").map((e) => e.trim()).filter(Boolean);
}
function Pn(e) {
	return e.join(", ");
}
var Fn = /* @__PURE__ */ new Set(/* @__PURE__ */ "id.relationKey.board.ticket.title.status.columnKey.position.priority.assignee.swimlane.swimlaneKey.start.due.reminder.archived.icon.tags.attachments.notes.taskDone.taskTotal.excerpt.blocked_by.blockedBy.blocks.relates.parent".split("."));
function In(e, t) {
	let { data: n, body: r } = An(e), i = { ...n };
	if (t.title !== void 0 && (i.title = t.title), t.columnKey !== void 0 && (i.status = t.columnKey), t.priority !== void 0 && (i.priority = t.priority ?? ""), t.assignee !== void 0 && (i.assignee = t.assignee ?? ""), t.swimlaneKey !== void 0 && (i.swimlane = t.swimlaneKey ?? ""), t.start !== void 0 && (i.start = t.start ?? ""), t.due !== void 0 && (i.due = t.due ?? ""), t.reminder !== void 0 && (i.reminder = t.reminder ?? ""), t.archived !== void 0 && (i.archived = t.archived ? "true" : ""), t.icon !== void 0 && (i.icon = t.icon ?? ""), t.tags !== void 0 && (i.tags = t.tags.map((e) => e.label).join(", ")), t.attachments !== void 0 && (i.attachments = Pn(t.attachments)), t.custom !== void 0) for (let [e, n] of Object.entries(t.custom)) Fn.has(e) || (i[e] = n ?? "");
	return t.blockedBy !== void 0 && (i.blocked_by = $n(t.blockedBy)), t.blocks !== void 0 && (i.blocks = $n(t.blocks)), t.relates !== void 0 && (i.relates = $n(t.relates)), t.parent !== void 0 && (i.parent = t.parent ? $n([t.parent]) : ""), jn(t.notes === void 0 ? r : t.notes, i);
}
function Ln(e) {
	let t = e.split(/[\\/]/).pop() || e;
	try {
		return decodeURIComponent(t.split("?")[0] || t);
	} catch {
		return t;
	}
}
function Rn(e) {
	let t = e.trim();
	if (!t) return !1;
	let n = /^([a-z][a-z0-9+.-]*):/i.exec(t);
	if (!n) return !0;
	let r = n[1].toLowerCase();
	return r === "http" || r === "https";
}
function zn(e, t) {
	let n = {};
	if (!e || !t) return n;
	for (let r of t) {
		let t = e[r.key];
		t !== void 0 && t !== "" && (n[r.key] = t);
	}
	return n;
}
var Bn = [
	"none",
	"low",
	"medium",
	"high",
	"urgent"
], Vn = [
	"urgent",
	"high",
	"medium",
	"low",
	"none"
], Hn = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4
}, Un = {
	urgent: "bg-red-100 text-red-700",
	high: "bg-amber-100 text-amber-700",
	medium: "bg-sky-100 text-sky-700",
	low: "bg-stone-100 text-stone-500"
}, Wn = [
	"#ef4444",
	"#f59e0b",
	"#eab308",
	"#22c55e",
	"#0ea5e9",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#78716c"
], Gn = [
	"title",
	"relationKey",
	"board",
	"status",
	"position",
	"priority",
	"assignee",
	"swimlane",
	"start",
	"due",
	"reminder",
	"archived",
	"tags",
	"icon",
	"blocked_by",
	"blocks",
	"relates",
	"attachments",
	"parent"
];
function Kn(e) {
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
function qn(e) {
	for (let t of e.split("\n")) {
		let e = t.trim().replace(/^[#>\-*+\s]+/, "").replace(/^\[[ xX]\]\s*/, "").trim();
		if (e) return e.length > 120 ? `${e.slice(0, 120)}…` : e;
	}
	return null;
}
function Jn(e) {
	return e.trim().replace(/^\[|\]$/g, "").split(",").map((e) => e.trim().replace(/^#/, "")).filter(Boolean);
}
var Yn = [
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
function Xn(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = Math.imul(t, 31) + e.charCodeAt(n) >>> 0;
	return Yn[t % Yn.length];
}
function Zn(e, t) {
	return e.map((e) => ({
		label: e,
		color: t?.find((t) => t.label === e)?.color ?? Xn(e)
	}));
}
function Qn(e) {
	return e.split(",").map((e) => e.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim()).filter(Boolean);
}
function $n(e) {
	return e.map((e) => `[[${e}]]`).join(", ");
}
function er(e) {
	return (e.relationKey ?? e.id).replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\.md$/i, "");
}
function tr(e) {
	let t = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = er(i);
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
function nr(e, t) {
	let n = t || "done", r = tr(e), i = (e) => !!e && e.columnKey !== n, a = /* @__PURE__ */ new Map(), o = (e, t) => {
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
	return a;
}
function rr(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let [r, i] of nr(e, t)) n.set(r, i.size);
	return n;
}
function ir(e) {
	let t = tr(e), n = /* @__PURE__ */ new Map();
	for (let r of e) {
		if (!r.parent) continue;
		let e = t(r.parent);
		if (!e || e.id === r.id) continue;
		let i = n.get(e.id);
		i ? i.push(r) : n.set(e.id, [r]);
	}
	return n;
}
function ar(e, t) {
	let n = t || "done";
	return {
		done: e.filter((e) => e.columnKey === n).length,
		total: e.length
	};
}
function or() {
	let e = /* @__PURE__ */ new Date();
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function sr(e) {
	return e.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
var cr = /* @__PURE__ */ new Set([
	"status",
	"priority",
	"assignee"
]);
function lr(e) {
	return typeof e == "string" && cr.has(e) ? e : "status";
}
function ur(e) {
	return e === "custom" ? "custom" : typeof e == "string" && cr.has(e) ? e : void 0;
}
function dr(e) {
	return ur(e.swimlaneBy) ?? lr(e.groupBy);
}
function fr(e, t) {
	return e === "status" ? { columnKey: t } : e === "priority" ? { priority: t === "none" ? null : t } : e === "assignee" ? { assignee: t || null } : { swimlaneKey: t || null };
}
function pr(e, t, n = {}) {
	return e === "status" ? n.columnKey ?? t : e === "priority" ? Object.prototype.hasOwnProperty.call(n, "priority") ? n.priority || "none" : t : e === "assignee" ? Object.prototype.hasOwnProperty.call(n, "assignee") ? n.assignee || "" : t : Object.prototype.hasOwnProperty.call(n, "swimlaneKey") ? n.swimlaneKey || "" : t;
}
function mr(e, t = []) {
	let n = new Set(t), r = `lane_${sr(e).replace(/-/g, "_")}`;
	for (let e = 0; e < 20; e += 1) {
		let e = `${r}_${typeof globalThis.crypto?.randomUUID == "function" ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
		if (!n.has(e)) return e;
	}
	return `${r}_${Date.now().toString(36)}`;
}
function hr(e, t, n) {
	let r = e.trim();
	return r ? r.length > 80 ? "Swimlane names can be at most 80 characters." : t.some((e) => e.key !== n && e.name.trim().toLocaleLowerCase() === r.toLocaleLowerCase()) ? "Swimlane names must be unique on this board." : null : "Swimlane name is required.";
}
function gr(e) {
	return e.swimlaneKey || "";
}
function _r(e, t) {
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
		let t = gr(e);
		t && !i.has(t) && c.set(t, (c.get(t) ?? 0) + 1);
	}
	for (let [e, t] of c) n.push({
		kind: "dangling_swimlane",
		key: e,
		cardCount: t
	});
	return n;
}
function vr(e, t) {
	return t === "custom" ? gr(e) : t === "priority" ? e.priority || "none" : t === "assignee" ? e.assignee || "" : e.columnKey || "";
}
function yr(e, t) {
	let n = dr(t), r = vr(e, n);
	return n === "custom" && r && !(t.swimlanes ?? []).some((e) => e.key === r) ? "" : r;
}
function br(e, t, n, r) {
	if (n === "status") return e.columns;
	if (n === "priority") return Vn.map((e) => ({
		key: e,
		name: e === "none" ? r : `${e.charAt(0).toUpperCase()}${e.slice(1)}`
	}));
	let i = /* @__PURE__ */ new Set([""]);
	for (let e of t) i.add(vr(e, n));
	return [...i].sort((e, t) => e === "" ? 1 : t === "" ? -1 : e.localeCompare(t)).map((e) => ({
		key: e,
		name: e || r
	}));
}
function xr(e, t) {
	let n = e.swimlaneKey;
	return !!n && !(t ?? []).some((e) => e.key === n);
}
function Sr(e, t, n, r) {
	if (n !== "custom") return br(e, t, n, r);
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
function Cr(e) {
	return new Set((e ?? []).map((e) => e.trim().toLowerCase()));
}
function wr(e, t) {
	let [n, r, i] = e.split("-").map(Number);
	return Mr(new Date(n, r - 1, i + t));
}
function Tr(e) {
	return !!(e.priorities?.length || e.assignees?.length || e.tags?.length || e.due || e.blocked || e.mine || e.archived !== void 0 && e.archived !== "active" || e.missingRow);
}
function Er(e) {
	return [
		!!e.priorities?.length,
		!!e.assignees?.length,
		!!e.tags?.length,
		!!e.due,
		!!e.blocked,
		!!e.mine,
		e.archived !== void 0 && e.archived !== "active",
		!!e.missingRow
	].filter(Boolean).length;
}
function Dr(e, t, n = {}) {
	let r = t.archived ?? "active";
	if (r === "active" && e.archived || r === "archived" && !e.archived) return !1;
	let i = Cr(t.priorities);
	if (i.size > 0 && !i.has((e.priority || "none").toLowerCase())) return !1;
	let a = Cr(t.assignees);
	if (a.size > 0 && !a.has((e.assignee || "").trim().toLowerCase())) return !1;
	let o = Cr(t.tags);
	if (o.size > 0 && !e.tags.some((e) => o.has(e.label.trim().toLowerCase()))) return !1;
	if (t.due) {
		let r = e.due && Nr(e.due) ? e.due : null, i = n.today && Nr(n.today) ? n.today : or();
		if (t.due === "none" && r || t.due !== "none" && !r || r && (t.due === "overdue" && r >= i || t.due === "today" && r !== i || t.due === "nextSevenDays" && (r < i || r > wr(i, 6)))) return !1;
	}
	if (t.blocked && !(n.blockedCardIds ? n.blockedCardIds.has(e.id) : (e.blockedBy?.length ?? 0) > 0)) return !1;
	if (t.mine) {
		let t = n.currentUser?.trim().toLowerCase();
		if (!t || e.assignee?.trim().toLowerCase() !== t) return !1;
	}
	return !(t.missingRow && !xr(e, n.config?.swimlanes));
}
function Or(e, t) {
	return !!(e.title.toLowerCase().includes(t) || e.ticket && e.ticket.toLowerCase().includes(t) || e.assignee && e.assignee.toLowerCase().includes(t) || e.tags.some((e) => e.label.toLowerCase().includes(t)) || e.notes && e.notes.toLowerCase().includes(t) || !e.notes && e.excerpt && e.excerpt.toLowerCase().includes(t));
}
function kr(e) {
	return e ? "prop" in e ? e.prop === "priority" ? { priorities: [e.value] } : e.prop === "assignee" ? { assignees: [e.value] } : e.prop === "tag" ? { tags: [e.value] } : { missingRow: !0 } : e : {};
}
function Ar(e, t, n, r, i = {}) {
	let a = t.trim().toLowerCase(), o = kr(n);
	return e.filter((e) => a && !Or(e, a) ? !1 : Dr(e, o, {
		...i,
		config: r
	}));
}
function jr(e, t) {
	let n = [...e];
	return t === "due" ? n.sort((e, t) => (Nr(e.due) ? e.due : "9999-99-99").localeCompare(Nr(t.due) ? t.due : "9999-99-99")) : t === "priority" ? n.sort((e, t) => (Hn[e.priority || "none"] ?? 5) - (Hn[t.priority || "none"] ?? 5)) : t === "title" ? n.sort((e, t) => e.title.localeCompare(t.title)) : n.sort((e, t) => e.position - t.position), n;
}
function Mr(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Nr(e) {
	if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return !1;
	let t = /* @__PURE__ */ new Date(`${e}T00:00:00Z`);
	return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === e;
}
function Pr() {
	return or().slice(0, 7);
}
function Fr(e, t) {
	let [n, r] = e.split("-"), i = new Date(Number(n), Number(r) - 1 + t, 1);
	return `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}`;
}
function Ir(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		if (!Nr(n.due)) continue;
		let e = t.get(n.due);
		e ? e.push(n) : t.set(n.due, [n]);
	}
	return t;
}
function Lr(e, t = 0) {
	let [n, r] = e.split("-"), i = Number(n), a = Number(r), o = (new Date(i, a - 1, 1).getDay() - t + 7) % 7, s = new Date(i, a - 1, 1 - o), c = [];
	for (let e = 0; e < 6; e++) {
		let t = [];
		for (let n = 0; n < 7; n++) t.push(Mr(new Date(s.getFullYear(), s.getMonth(), s.getDate() + e * 7 + n)));
		c.push(t);
	}
	return c;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/domHelpers.mjs
var Rr = (e) => e?.ownerDocument ?? document, zr = (e) => e && "window" in e && e.window === e ? e : Rr(e).defaultView || window;
function Br(e) {
	return typeof e == "object" && !!e && "nodeType" in e && typeof e.nodeType == "number";
}
function Vr(e) {
	return Br(e) && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in e;
}
//#endregion
//#region ../../node_modules/.pnpm/react-stately@3.47.0_react@19.2.7/node_modules/react-stately/dist/private/flags/flags.mjs
var Hr = !1;
function Ur() {
	return Hr;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function Wr(e, t) {
	if (!Ur()) return t && e ? e.contains(t) : !1;
	if (!e || !t) return !1;
	let n = t;
	for (; n !== null;) {
		if (n === e) return !0;
		n = n.tagName === "SLOT" && n.assignedSlot ? n.assignedSlot.parentNode : Vr(n) ? n.host : n.parentNode;
	}
	return !1;
}
var Gr = (e = document) => {
	if (!Ur()) return e.activeElement;
	let t = e.activeElement;
	for (; t && "shadowRoot" in t && t.shadowRoot?.activeElement;) t = t.shadowRoot.activeElement;
	return t;
};
function Kr(e) {
	if (Ur() && e.target instanceof Element && e.target.shadowRoot) {
		if ("composedPath" in e) return e.composedPath()[0] ?? null;
		if ("composedPath" in e.nativeEvent) return e.nativeEvent.composedPath()[0] ?? null;
	}
	return e.target;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function qr(e) {
	if (Yr()) e.focus({ preventScroll: !0 });
	else {
		let t = Xr(e);
		e.focus(), Zr(t);
	}
}
var Jr = null;
function Yr() {
	if (Jr == null) {
		Jr = !1;
		try {
			document.createElement("div").focus({ get preventScroll() {
				return Jr = !0, !0;
			} });
		} catch {}
	}
	return Jr;
}
function Xr(e) {
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
function Zr(e) {
	for (let { element: t, scrollTop: n, scrollLeft: r } of e) t.scrollTop = n, t.scrollLeft = r;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var Qr = typeof document < "u" ? t.useLayoutEffect : () => {};
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/utils.mjs
function $r(e) {
	let t = e;
	return t.nativeEvent = e, t.isDefaultPrevented = () => t.defaultPrevented, t.isPropagationStopped = () => t.cancelBubble, t.persist = () => {}, t;
}
function ei(e, t) {
	Object.defineProperty(e, "target", { value: t }), Object.defineProperty(e, "currentTarget", { value: t });
}
function ti(e) {
	let t = y({
		isFocused: !1,
		observer: null
	});
	return Qr(() => {
		let e = t.current;
		return () => {
			e.observer &&= (e.observer.disconnect(), null);
		};
	}, []), l((n) => {
		let r = Kr(n);
		if (r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) {
			t.current.isFocused = !0;
			let n = r;
			n.addEventListener("focusout", (r) => {
				if (t.current.isFocused = !1, n.disabled) {
					let t = $r(r);
					e?.(t);
				}
				t.current.observer && (t.current.observer.disconnect(), t.current.observer = null);
			}, { once: !0 }), t.current.observer = new MutationObserver(() => {
				if (t.current.isFocused && n.disabled) {
					t.current.observer?.disconnect();
					let e = n === Gr() ? null : Gr();
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
function ni(e) {
	if (typeof window > "u" || window.navigator == null) return !1;
	let t = window.navigator.userAgentData?.brands;
	return Array.isArray(t) && t.some((t) => e.test(t.brand)) || e.test(window.navigator.userAgent);
}
function ri(e) {
	return typeof window < "u" && window.navigator != null && e.test(window.navigator.userAgentData?.platform || window.navigator.platform);
}
function ii(e) {
	let t = null;
	return () => (t ??= e(), t);
}
var ai = ii(function() {
	return ri(/^Mac/i);
}), oi = ii(function() {
	return ri(/^iPad/i) || ai() && navigator.maxTouchPoints > 1;
}), si = ii(function() {
	return ni(/AppleWebKit/i) && !ci();
}), ci = ii(function() {
	return ni(/Chrome/i);
}), li = ii(function() {
	return ni(/Android/i);
}), ui = ii(function() {
	return ni(/Firefox/i);
});
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function di(e) {
	return e.pointerType === "" && e.isTrusted ? !0 : li() && e.pointerType ? e.type === "click" && e.buttons === 1 : e.detail === 0 && !e.pointerType;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/openLink.mjs
function fi(e, t, n = !0) {
	let { metaKey: r, ctrlKey: i, altKey: a, shiftKey: o } = t;
	ui() && window.event?.type?.startsWith("key") && e.target === "_blank" && (ai() ? r = !0 : i = !0);
	let s = si() && ai() && !oi() ? new KeyboardEvent("keydown", {
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
	fi.isOpening = n, qr(e), e.dispatchEvent(s), fi.isOpening = !1;
}
fi.isOpening = !1;
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var pi = null, mi = /* @__PURE__ */ new Set(), hi = /* @__PURE__ */ new Map(), gi = !1, _i = !1, vi = {
	Tab: !0,
	Escape: !0
};
function yi(e, t) {
	for (let n of mi) n(e, t);
}
function bi(e) {
	return !(e.metaKey || !ai() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function xi(e) {
	gi = !0, !fi.isOpening && bi(e) && (pi = "keyboard", yi("keyboard", e));
}
function Si(e) {
	pi = "pointer", "pointerType" in e && e.pointerType, (e.type === "mousedown" || e.type === "pointerdown") && (gi = !0, yi("pointer", e));
}
function Ci(e) {
	!fi.isOpening && di(e) && (gi = !0, pi = "virtual");
}
function wi(e) {
	let t = zr(Kr(e)), n = Rr(Kr(e));
	Kr(e) === t || Kr(e) === n || !e.isTrusted || (!gi && !_i && (pi = "virtual", yi("virtual", e)), gi = !1, _i = !1);
}
function Ti() {
	gi = !1, _i = !0;
}
function Ei(e) {
	if (typeof window > "u" || typeof document > "u") return;
	let t = zr(e), n = Rr(e);
	if (hi.get(t)) return;
	let r = t.HTMLElement.prototype.focus;
	t.HTMLElement.prototype.focus = function() {
		gi = !0, r.apply(this, arguments);
	}, n.addEventListener("keydown", xi, !0), n.addEventListener("keyup", xi, !0), n.addEventListener("click", Ci, !0), t.addEventListener("focus", wi, !0), t.addEventListener("blur", Ti, !1), typeof PointerEvent < "u" && (n.addEventListener("pointerdown", Si, !0), n.addEventListener("pointermove", Si, !0), n.addEventListener("pointerup", Si, !0)), t.addEventListener("beforeunload", () => {
		Di(e);
	}, { once: !0 }), hi.set(t, { focus: r });
}
var Di = (e, t) => {
	let n = zr(e), r = Rr(e);
	t && r.removeEventListener("DOMContentLoaded", t), hi.has(n) && (n.HTMLElement.prototype.focus = hi.get(n).focus, r.removeEventListener("keydown", xi, !0), r.removeEventListener("keyup", xi, !0), r.removeEventListener("click", Ci, !0), n.removeEventListener("focus", wi, !0), n.removeEventListener("blur", Ti, !1), typeof PointerEvent < "u" && (r.removeEventListener("pointerdown", Si, !0), r.removeEventListener("pointermove", Si, !0), r.removeEventListener("pointerup", Si, !0)), hi.delete(n));
};
function Oi(e) {
	let t = Rr(e), n;
	return t.readyState === "loading" ? (n = () => {
		Ei(e);
	}, t.addEventListener("DOMContentLoaded", n)) : Ei(e), () => Di(e, n);
}
typeof document < "u" && Oi();
function ki() {
	return pi !== "pointer";
}
var Ai = /* @__PURE__ */ new Set([
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
function ji(e, t, n) {
	let r = n ? Kr(n) : void 0, i = Rr(r), a = zr(r), o = a === void 0 ? HTMLInputElement : a.HTMLInputElement, s = a === void 0 ? HTMLTextAreaElement : a.HTMLTextAreaElement, c = a === void 0 ? HTMLElement : a.HTMLElement, l = a === void 0 ? KeyboardEvent : a.KeyboardEvent, u = Gr(i);
	return e = e || u instanceof o && !Ai.has(u.type) || u instanceof s || u instanceof c && u.isContentEditable, !(e && t === "keyboard" && n instanceof l && !vi[n.key]);
}
function Mi(e, t, n) {
	Ei(), f(() => {
		if (n?.enabled === !1) return;
		let t = (t, r) => {
			ji(!!n?.isTextInput, t, r) && e(ki());
		};
		return mi.add(t), () => {
			mi.delete(t);
		};
	}, t);
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocus.mjs
function Ni(e) {
	let { isDisabled: t, onFocus: n, onBlur: r, onFocusChange: i } = e, a = l((e) => {
		if (Kr(e) === e.currentTarget) return r && r(e), i && i(!1), !0;
	}, [r, i]), o = ti(a), s = l((e) => {
		let t = Kr(e), r = Rr(t), a = r ? Gr(r) : Gr();
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
function Pi() {
	let e = y(/* @__PURE__ */ new Map()), t = l((t, n, r, i) => {
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
function Fi(e) {
	let { isDisabled: t, onBlurWithin: n, onFocusWithin: r, onFocusWithinChange: i } = e, a = y({ isFocusWithin: !1 }), { addGlobalListener: o, removeAllGlobalListeners: s } = Pi(), c = l((e) => {
		Wr(e.currentTarget, Kr(e)) && a.current.isFocusWithin && !Wr(e.currentTarget, e.relatedTarget) && (a.current.isFocusWithin = !1, s(), n && n(e), i && i(!1));
	}, [
		n,
		i,
		a,
		s
	]), u = ti(c), d = l((e) => {
		if (!Wr(e.currentTarget, Kr(e))) return;
		let t = Kr(e), n = Rr(t), s = Gr(n);
		if (!a.current.isFocusWithin && s === t) {
			r && r(e), i && i(!0), a.current.isFocusWithin = !0, u(e);
			let t = e.currentTarget;
			o(n, "focus", (e) => {
				let r = Kr(e);
				if (a.current.isFocusWithin && !Wr(t, r)) {
					let e = new n.defaultView.FocusEvent("blur", { relatedTarget: r });
					ei(e, t);
					let i = $r(e);
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
function Ii(e = {}) {
	let { autoFocus: t = !1, isTextInput: n, within: r } = e, i = y({
		isFocused: !1,
		isFocusVisible: t || ki()
	}), [a, o] = b(!1), [s, c] = b(() => i.current.isFocused && i.current.isFocusVisible), u = l(() => c(i.current.isFocused && i.current.isFocusVisible), []), d = l((e) => {
		i.current.isFocused = e, i.current.isFocusVisible = ki(), o(e), u();
	}, [u]);
	Mi((e) => {
		i.current.isFocusVisible = e, u();
	}, [n, a], {
		enabled: a,
		isTextInput: n
	});
	let { focusProps: f } = Ni({
		isDisabled: r,
		onFocusChange: d
	}), { focusWithinProps: p } = Fi({
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
var Li = !1, Ri = 0;
function zi() {
	Li = !0, setTimeout(() => {
		Li = !1;
	}, 500);
}
function Bi(e) {
	e.pointerType === "touch" && zi();
}
function Vi() {
	let e = Rr(null);
	if (e !== void 0) return Ri === 0 && typeof PointerEvent < "u" && e.addEventListener("pointerup", Bi), Ri++, () => {
		Ri--, !(Ri > 0) && typeof PointerEvent < "u" && e.removeEventListener("pointerup", Bi);
	};
}
function Hi(e) {
	let { onHoverStart: t, onHoverChange: n, onHoverEnd: r, isDisabled: i } = e, [a, o] = b(!1), s = y({
		isHovered: !1,
		ignoreEmulatedMouseEvents: !1,
		pointerType: "",
		target: null
	}).current;
	f(Vi, []);
	let { addGlobalListener: c, removeAllGlobalListeners: l } = Pi(), { hoverProps: u, triggerHoverEnd: d } = _(() => {
		let e = (e, r) => {
			if (s.pointerType = r, i || r === "touch" || s.isHovered || !Wr(e.currentTarget, Kr(e))) return;
			s.isHovered = !0;
			let l = e.currentTarget;
			s.target = l, c(Rr(Kr(e)), "pointerover", (e) => {
				s.isHovered && s.target && !Wr(s.target, Kr(e)) && a(e, e.pointerType);
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
			Li && t.pointerType === "mouse" || e(t, t.pointerType);
		}, u.onPointerLeave = (e) => {
			!i && Wr(e.currentTarget, Kr(e)) && a(e, e.pointerType);
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
var Ui = Object.defineProperty, Wi = (e, t, n) => t in e ? Ui(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Gi = (e, t, n) => (Wi(e, typeof t == "symbol" ? t : t + "", n), n), Ki = new class {
	constructor() {
		Gi(this, "current", this.detect()), Gi(this, "handoffState", "pending"), Gi(this, "currentId", 0);
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
function qi(e) {
	return Ki.isServer ? null : e == null ? document : e?.ownerDocument ?? document;
}
function Ji(e) {
	return Ki.isServer ? null : e == null ? document : (e?.getRootNode)?.call(e) ?? document;
}
function Yi(e) {
	return Ji(e)?.activeElement ?? null;
}
function Xi(e) {
	return Yi(e) === e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/micro-task.js
function Zi(e) {
	typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((e) => setTimeout(() => {
		throw e;
	}));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/disposables.js
function Qi() {
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
			return Zi(() => {
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
			let t = Qi();
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
function $i() {
	let [e] = b(Qi);
	return f(() => () => e.dispose(), [e]), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
var G = (e, t) => {
	Ki.isServer ? f(e, t) : g(e, t);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-latest-value.js
function ea(e) {
	let t = y(e);
	return G(() => {
		t.current = e;
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event.js
var K = function(e) {
	let n = ea(e);
	return t.useCallback((...e) => n.current(...e), [n]);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-active-press.js
function ta(e) {
	let t = e.width / 2, n = e.height / 2;
	return {
		top: e.clientY - n,
		right: e.clientX + t,
		bottom: e.clientY + n,
		left: e.clientX - t
	};
}
function na(e, t) {
	return !(!e || !t || e.right < t.left || e.left > t.right || e.bottom < t.top || e.top > t.bottom);
}
function ra({ disabled: e = !1 } = {}) {
	let t = y(null), [n, r] = b(!1), i = $i(), a = K(() => {
		t.current = null, r(!1), i.dispose();
	}), o = K((e) => {
		if (i.dispose(), t.current === null) {
			t.current = e.currentTarget, r(!0);
			{
				let n = qi(e.currentTarget);
				i.addEventListener(n, "pointerup", a, !1), i.addEventListener(n, "pointermove", (e) => {
					if (t.current) {
						let n = ta(e);
						r(na(n, t.current.getBoundingClientRect()));
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
function ia(e) {
	return _(() => e, Object.values(e));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/disabled.js
var aa = i(void 0);
function oa() {
	return u(aa);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/class-names.js
function sa(...e) {
	return Array.from(new Set(e.flatMap((e) => typeof e == "string" ? e.split(" ") : []))).filter(Boolean).join(" ");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/match.js
function ca(e, t, ...n) {
	if (e in t) {
		let r = t[e];
		return typeof r == "function" ? r(...n) : r;
	}
	let r = /* @__PURE__ */ Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((e) => `"${e}"`).join(", ")}.`);
	throw Error.captureStackTrace && Error.captureStackTrace(r, ca), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/render.js
var la = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(la || {}), ua = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(ua || {});
function q() {
	let e = pa();
	return l((t) => da({
		mergeRefs: e,
		...t
	}), [e]);
}
function da({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: a = !0, name: o, mergeRefs: s }) {
	s ??= ma;
	let c = ha(t, e);
	if (a) return fa(c, n, r, o, s);
	let l = i ?? 0;
	if (l & 2) {
		let { static: e = !1, ...t } = c;
		if (e) return fa(t, n, r, o, s);
	}
	if (l & 1) {
		let { unmount: e = !0, ...t } = c;
		return ca(+!e, {
			0() {
				return null;
			},
			1() {
				return fa({
					...t,
					hidden: !0,
					style: { display: "none" }
				}, n, r, o, s);
			}
		});
	}
	return fa(c, n, r, o, s);
}
function fa(e, t = {}, n, i, o) {
	let { as: s = n, children: l, refName: u = "ref", ...d } = va(e, ["unmount", "static"]), f = e.ref === void 0 ? {} : { [u]: e.ref }, p = typeof l == "function" ? l(t) : l;
	p = ba(p), "className" in d && d.className && typeof d.className == "function" && (d.className = d.className(t)), d["aria-labelledby"] && d["aria-labelledby"] === d.id && (d["aria-labelledby"] = void 0);
	let m = {};
	if (t) {
		let e = !1, n = [];
		for (let [r, i] of Object.entries(t)) typeof i == "boolean" && (e = !0), i === !0 && n.push(r.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`));
		if (e) {
			m["data-headlessui-state"] = n.join(" ");
			for (let e of n) m[`data-${e}`] = "";
		}
	}
	if (xa(s) && (Object.keys(_a(d)).length > 0 || Object.keys(_a(m)).length > 0)) if (!c(p) || Array.isArray(p) && p.length > 1 || Sa(p)) {
		if (Object.keys(_a(d)).length > 0) throw Error([
			"Passing props on \"Fragment\"!",
			"",
			`The current component <${i} /> is rendering a "Fragment".`,
			"However we need to passthrough the following props:",
			Object.keys(_a(d)).concat(Object.keys(_a(m))).map((e) => `  - ${e}`).join("\n"),
			"",
			"You can apply a few solutions:",
			["Add an `as=\"...\"` prop, to ensure that we render an actual element instead of a \"Fragment\".", "Render a single element as the child so that we can forward the props onto that element."].map((e) => `  - ${e}`).join("\n")
		].join("\n"));
	} else {
		let e = p.props?.className, t = typeof e == "function" ? (...t) => sa(e(...t), d.className) : sa(e, d.className), n = t ? { className: t } : {}, i = ha(p.props, _a(va(d, ["ref"])));
		for (let e in m) e in i && delete m[e];
		return r(p, Object.assign({}, i, m, f, { ref: o(ya(p), f.ref) }, n));
	}
	return a(s, Object.assign({}, va(d, ["ref"]), !xa(s) && f, !xa(s) && m), p);
}
function pa() {
	let e = y([]), t = l((t) => {
		for (let n of e.current) n != null && (typeof n == "function" ? n(t) : n.current = t);
	}, []);
	return (...n) => {
		if (!n.every((e) => e == null)) return e.current = n, t;
	};
}
function ma(...e) {
	return e.every((e) => e == null) ? void 0 : (t) => {
		for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
	};
}
function ha(...e) {
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
function ga(...e) {
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
function J(e) {
	return Object.assign(s(e), { displayName: e.displayName ?? e.name });
}
function _a(e) {
	let t = Object.assign({}, e);
	for (let e in t) t[e] === void 0 && delete t[e];
	return t;
}
function va(e, t = []) {
	let n = Object.assign({}, e);
	for (let e of t) e in n && delete n[e];
	return n;
}
function ya(e) {
	return t.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function ba(e) {
	if (e != null && e.$$typeof === Symbol.for("react.lazy")) {
		let t = e._payload;
		if (t != null && t.status === "fulfilled") return ba(t.value);
	}
	return e;
}
function xa(e) {
	return e === n || e === Symbol.for("react.fragment");
}
function Sa(e) {
	return xa(e.type);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-controllable.js
function Ca(e, t, n) {
	let [r, i] = b(n), a = e !== void 0, o = y(a), s = y(!1), c = y(!1);
	return a && !o.current && !s.current ? (s.current = !0, o.current = a, console.error("A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.")) : !a && o.current && !c.current && (c.current = !0, o.current = a, console.error("A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.")), [a ? e : r, K((e) => (a || D(() => i(e)), t?.(e)))];
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-default-value.js
function wa(e) {
	let [t] = b(e);
	return t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/form.js
function Ta(e = {}, t = null, n = []) {
	for (let [r, i] of Object.entries(e)) Da(n, Ea(t, r), i);
	return n;
}
function Ea(e, t) {
	return e ? e + "[" + t + "]" : t;
}
function Da(e, t, n) {
	if (Array.isArray(n)) for (let [r, i] of n.entries()) Da(e, Ea(t, r.toString()), i);
	else n instanceof Date ? e.push([t, n.toISOString()]) : typeof n == "boolean" ? e.push([t, n ? "1" : "0"]) : typeof n == "string" ? e.push([t, n]) : typeof n == "number" ? e.push([t, `${n}`]) : n == null ? e.push([t, ""]) : ka(n) && !c(n) && Ta(n, t, e);
}
function Oa(e) {
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
function ka(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/hidden.js
var Aa = "span", ja = ((e) => (e[e.None = 1] = "None", e[e.Focusable = 2] = "Focusable", e[e.Hidden = 4] = "Hidden", e))(ja || {});
function Ma(e, t) {
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
	return q()({
		ourProps: i,
		theirProps: r,
		slot: {},
		defaultTag: Aa,
		name: "Hidden"
	});
}
var Na = J(Ma), Pa = i(null);
function Fa({ children: e }) {
	let n = u(Pa);
	if (!n) return t.createElement(t.Fragment, null, e);
	let { target: r } = n;
	return r ? E(t.createElement(t.Fragment, null, e), r) : null;
}
function Ia({ data: e, form: n, disabled: r, onReset: i, overrides: a }) {
	let [o, s] = b(null), c = $i();
	return f(() => {
		if (i && o) return c.addEventListener(o, "reset", i);
	}, [
		o,
		n,
		i
	]), t.createElement(Fa, null, t.createElement(La, {
		setForm: s,
		formId: n
	}), Ta(e).map(([e, i]) => t.createElement(Na, {
		features: ja.Hidden,
		..._a({
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
function La({ setForm: e, formId: n }) {
	return f(() => {
		if (n) {
			let t = document.getElementById(n);
			t && e(t);
		}
	}, [e, n]), n ? null : t.createElement(Na, {
		features: ja.Hidden,
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
var Ra = i(void 0);
function za() {
	return u(Ra);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/dom.js
function Ba(e) {
	return typeof e != "object" || !e ? !1 : "nodeType" in e;
}
function Va(e) {
	return Ba(e) && "tagName" in e;
}
function Ha(e) {
	return Va(e) && "accessKey" in e;
}
function Ua(e) {
	return Va(e) && "tabIndex" in e;
}
function Wa(e) {
	return Va(e) && "style" in e;
}
function Ga(e) {
	return Ha(e) && e.nodeName === "IFRAME";
}
function Ka(e) {
	return Ha(e) && e.nodeName === "INPUT";
}
function qa(e) {
	return Ha(e) && e.nodeName === "LABEL";
}
function Ja(e) {
	return Ha(e) && e.nodeName === "FIELDSET";
}
function Ya(e) {
	return Ha(e) && e.nodeName === "LEGEND";
}
function Xa(e) {
	return Va(e) ? e.matches("a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type=\"hidden\"]),label,select,textarea,video[controls]") : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/bugs.js
function Za(e) {
	let t = e.parentElement, n = null;
	for (; t && !Ja(t);) Ya(t) && (n = t), t = t.parentElement;
	let r = t?.getAttribute("disabled") === "";
	return r && Qa(n) ? !1 : r;
}
function Qa(e) {
	if (!e) return !1;
	let t = e.previousElementSibling;
	for (; t !== null;) {
		if (Ya(t)) return !1;
		t = t.previousElementSibling;
	}
	return !0;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
var $a = Symbol();
function eo(e, t = !0) {
	return Object.assign(e, { [$a]: t });
}
function Y(...e) {
	let t = y(e);
	f(() => {
		t.current = e;
	}, [e]);
	let n = K((e) => {
		for (let n of t.current) n != null && (typeof n == "function" ? n(e) : n.current = e);
	});
	return e.every((e) => e == null || e?.[$a]) ? void 0 : n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/description/description.js
var to = i(null);
to.displayName = "DescriptionContext";
function no() {
	let e = u(to);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Description /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, no), e;
	}
	return e;
}
function ro() {
	return u(to)?.value ?? void 0;
}
function io() {
	let [e, n] = b([]);
	return [e.length > 0 ? e.join(" ") : void 0, _(() => function(e) {
		let r = K((e) => (n((t) => [...t, e]), () => n((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), i = _(() => ({
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
		return t.createElement(to.Provider, { value: i }, e.children);
	}, [n])];
}
var ao = "p";
function oo(e, t) {
	let n = m(), r = oa(), { id: i = `headlessui-description-${n}`, ...a } = e, o = no(), s = Y(t);
	G(() => o.register(i), [i, o.register]);
	let c = ia({
		...o.slot,
		disabled: r || !1
	}), l = {
		ref: s,
		...o.props,
		id: i
	};
	return q()({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: ao,
		name: o.name || "Description"
	});
}
var so = J(oo), co = Object.assign(so, {}), X = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(X || {}), lo = i(null);
lo.displayName = "LabelContext";
function uo() {
	let e = u(lo);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Label /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, uo), e;
	}
	return e;
}
function fo(e) {
	let t = u(lo)?.value ?? void 0;
	return (e?.length ?? 0) > 0 ? [t, ...e].filter(Boolean).join(" ") : t;
}
function po({ inherit: e = !1 } = {}) {
	let n = fo(), [r, i] = b([]), a = e ? [n, ...r].filter(Boolean) : r;
	return [a.length > 0 ? a.join(" ") : void 0, _(() => function(e) {
		let n = K((e) => (i((t) => [...t, e]), () => i((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), r = _(() => ({
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
		return t.createElement(lo.Provider, { value: r }, e.children);
	}, [i])];
}
var mo = "label";
function ho(e, t) {
	let n = m(), r = uo(), i = za(), a = oa(), { id: o = `headlessui-label-${n}`, htmlFor: s = i ?? r.props?.htmlFor, passive: c = !1, ...l } = e, u = Y(t);
	G(() => r.register(o), [o, r.register]);
	let d = K((e) => {
		let t = e.currentTarget;
		if (!(e.target !== e.currentTarget && Xa(e.target)) && (qa(t) && e.preventDefault(), r.props && "onClick" in r.props && typeof r.props.onClick == "function" && r.props.onClick(e), qa(t))) {
			let e = document.getElementById(t.htmlFor);
			if (e) {
				let t = e.getAttribute("disabled");
				if (t === "true" || t === "") return;
				let n = e.getAttribute("aria-disabled");
				if (n === "true" || n === "") return;
				(Ka(e) && (e.type === "file" || e.type === "radio" || e.type === "checkbox") || e.role === "radio" || e.role === "checkbox" || e.role === "switch") && e.click(), e.focus({ preventScroll: !0 });
			}
		}
	}), f = ia({
		...r.slot,
		disabled: a || !1
	}), p = {
		ref: u,
		...r.props,
		id: o,
		htmlFor: s,
		onClick: d
	};
	return c && ("onClick" in p && (delete p.htmlFor, delete p.onClick), "onClick" in l && delete l.onClick), q()({
		ourProps: p,
		theirProps: l,
		slot: f,
		defaultTag: s ? mo : "div",
		name: r.name || "Label"
	});
}
var go = J(ho), _o = Object.assign(go, {}), vo = i(() => {});
function yo({ value: e, children: n }) {
	return t.createElement(vo.Provider, { value: e }, n);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-by-comparator.js
function bo(e, t) {
	return e !== null && t !== null && typeof e == "object" && typeof t == "object" && "id" in e && "id" in t ? e.id === t.id : e === t;
}
function xo(e = bo) {
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
function So(e) {
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
function Co(e, t, n = !1) {
	let [r, i] = b(() => So(t));
	return G(() => {
		if (!t || !e) return;
		let n = Qi();
		return n.requestAnimationFrame(function e() {
			n.requestAnimationFrame(e), i((e) => {
				let n = So(t);
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
var wo = ((e) => (e[e.Left = 0] = "Left", e[e.Right = 2] = "Right", e))(wo || {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-handle-toggle.js
function To(e) {
	let t = y(null);
	return {
		onPointerDown: K((n) => {
			t.current = n.pointerType, !Za(n.currentTarget) && n.pointerType === "mouse" && n.button === wo.Left && (n.preventDefault(), e(n));
		}),
		onClick: K((n) => {
			t.current !== "mouse" && (Za(n.currentTarget) || e(n));
		})
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/default-map.js
var Eo = class extends Map {
	constructor(e) {
		super(), this.factory = e;
	}
	get(e) {
		let t = super.get(e);
		return t === void 0 && (t = this.factory(e), this.set(e, t)), t;
	}
}, Do = Object.defineProperty, Oo = (e, t, n) => t in e ? Do(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, ko = (e, t, n) => (Oo(e, typeof t == "symbol" ? t : t + "", n), n), Ao = (e, t, n) => {
	if (!t.has(e)) throw TypeError("Cannot " + n);
}, jo = (e, t, n) => (Ao(e, t, "read from private field"), n ? n.call(e) : t.get(e)), Mo = (e, t, n) => {
	if (t.has(e)) throw TypeError("Cannot add the same private member more than once");
	t instanceof WeakSet ? t.add(e) : t.set(e, n);
}, No = (e, t, n, r) => (Ao(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), Po, Fo, Io, Lo = class {
	constructor(e) {
		Mo(this, Po, {}), Mo(this, Fo, new Eo(() => /* @__PURE__ */ new Set())), Mo(this, Io, /* @__PURE__ */ new Set()), ko(this, "disposables", Qi()), No(this, Po, e), Ki.isServer && this.disposables.microTask(() => {
			this.dispose();
		});
	}
	dispose() {
		this.disposables.dispose();
	}
	get state() {
		return jo(this, Po);
	}
	subscribe(e, t) {
		if (Ki.isServer) return () => {};
		let n = {
			selector: e,
			callback: t,
			current: e(jo(this, Po))
		};
		return jo(this, Io).add(n), this.disposables.add(() => {
			jo(this, Io).delete(n);
		});
	}
	on(e, t) {
		return Ki.isServer ? () => {} : (jo(this, Fo).get(e).add(t), this.disposables.add(() => {
			jo(this, Fo).get(e).delete(t);
		}));
	}
	send(e) {
		let t = this.reduce(jo(this, Po), e);
		if (t !== jo(this, Po)) {
			No(this, Po, t);
			for (let e of jo(this, Io)) {
				let t = e.selector(jo(this, Po));
				Ro(e.current, t) || (e.current = t, e.callback(t));
			}
			for (let t of jo(this, Fo).get(e.type)) t(jo(this, Po), e);
		}
	}
};
Po = /* @__PURE__ */ new WeakMap(), Fo = /* @__PURE__ */ new WeakMap(), Io = /* @__PURE__ */ new WeakMap();
function Ro(e, t) {
	return Object.is(e, t) ? !0 : typeof e != "object" || !e || typeof t != "object" || !t ? !1 : Array.isArray(e) && Array.isArray(t) ? e.length === t.length && zo(e[Symbol.iterator](), t[Symbol.iterator]()) : e instanceof Map && t instanceof Map || e instanceof Set && t instanceof Set ? e.size === t.size && zo(e.entries(), t.entries()) : Bo(e) && Bo(t) ? zo(Object.entries(e)[Symbol.iterator](), Object.entries(t)[Symbol.iterator]()) : !1;
}
function zo(e, t) {
	do {
		let n = e.next(), r = t.next();
		if (n.done && r.done) return !0;
		if (n.done || r.done || !Object.is(n.value, r.value)) return !1;
	} while (!0);
}
function Bo(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
function Vo(e) {
	let [t, n] = e(), r = Qi();
	return (...e) => {
		t(...e), r.dispose(), r.microTask(n);
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/machines/stack-machine.js
var Ho = Object.defineProperty, Uo = (e, t, n) => t in e ? Ho(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Wo = (e, t, n) => (Uo(e, typeof t == "symbol" ? t : t + "", n), n), Go = ((e) => (e[e.Push = 0] = "Push", e[e.Pop = 1] = "Pop", e))(Go || {}), Ko = {
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
}, qo = class e extends Lo {
	constructor() {
		super(...arguments), Wo(this, "actions", {
			push: (e) => this.send({
				type: 0,
				id: e
			}),
			pop: (e) => this.send({
				type: 1,
				id: e
			})
		}), Wo(this, "selectors", {
			isTop: (e, t) => e.stack[e.stack.length - 1] === t,
			inStack: (e, t) => e.stack.includes(t)
		});
	}
	static new() {
		return new e({ stack: [] });
	}
	reduce(e, t) {
		return ca(t.type, Ko, e, t);
	}
}, Jo = new Eo(() => qo.new()), Yo = typeof Object.is == "function" ? Object.is : (e, t) => e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
function Xo(e, t, n, r, i) {
	let a = y(null), o;
	a.current === null ? (o = {
		hasValue: !1,
		value: null
	}, a.current = o) : o = a.current;
	let [s, c] = _(() => {
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
			if (Yo(n, t)) return c;
			let l = r(t);
			return i !== void 0 && i(c, l) ? (a = t, c) : (a = t, s = l, l);
		}, l = n ?? null;
		return [() => c(t()), l === null ? void 0 : () => c(l())];
	}, [
		t,
		n,
		r,
		i
	]), l = x(e, s, c);
	return f(() => {
		o.hasValue = !0, o.value = l;
	}, [l]), d(l), l;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/react-glue.js
function Z(e, t, n = Ro) {
	return Xo(K((t) => e.subscribe(Zo, t)), K(() => e.state), K(() => e.state), K(t), n);
}
function Zo(e) {
	return e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
function Qo(e, t) {
	let n = p(), r = Jo.get(t), [i, a] = Z(r, l((e) => [r.selectors.isTop(e, n), r.selectors.inStack(e, n)], [r, n]));
	return G(() => {
		if (e) return r.actions.push(n), () => r.actions.pop(n);
	}, [
		r,
		e,
		n
	]), e ? !a || i : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-inert-others.js
var $o = /* @__PURE__ */ new Map(), es = /* @__PURE__ */ new Map();
function ts(e) {
	let t = es.get(e) ?? 0;
	return es.set(e, t + 1), t === 0 ? ($o.set(e, {
		"aria-hidden": e.getAttribute("aria-hidden"),
		inert: e.inert
	}), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => ns(e)) : () => ns(e);
}
function ns(e) {
	let t = es.get(e) ?? 1;
	if (t === 1 ? es.delete(e) : es.set(e, t - 1), t !== 1) return;
	let n = $o.get(e);
	n && (n["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", n["aria-hidden"]), e.inert = n.inert, $o.delete(e));
}
function rs(e, { allowed: t, disallowed: n } = {}) {
	let r = Qo(e, "inert-others");
	G(() => {
		if (!r) return;
		let e = Qi();
		for (let t of n?.() ?? []) t && e.add(ts(t));
		let i = t?.() ?? [];
		for (let t of i) {
			if (!t) continue;
			let n = qi(t);
			if (!n) continue;
			let r = t.parentElement;
			for (; r && r !== n.body;) {
				for (let t of r.children) i.some((e) => t.contains(e)) || e.add(ts(t));
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
function is(e, t, n) {
	let r = ea((e) => {
		let t = e.getBoundingClientRect();
		t.x === 0 && t.y === 0 && t.width === 0 && t.height === 0 && n();
	});
	f(() => {
		if (!e) return;
		let n = t === null ? null : Ha(t) ? t : t.current;
		if (!n) return;
		let i = Qi();
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
var as = [
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
].map((e) => `${e}:not([tabindex='-1'])`).join(","), os = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(","), ss = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(ss || {}), cs = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(cs || {}), ls = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(ls || {});
function us(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(as)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
function ds(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(os)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
var fs = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(fs || {});
function ps(e, t = 0) {
	return e !== qi(e)?.body && ca(t, {
		0() {
			return e.matches(as);
		},
		1() {
			let t = e;
			for (; t !== null;) {
				if (t.matches(as)) return !0;
				t = t.parentElement;
			}
			return !1;
		}
	});
}
function ms(e) {
	Qi().nextFrame(() => {
		let t = Yi(e);
		t && Ua(t) && !ps(t, 0) && gs(e);
	});
}
var hs = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(hs || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
	e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
function gs(e) {
	e?.focus({ preventScroll: !0 });
}
var _s = ["textarea", "input"].join(",");
function vs(e) {
	return (e?.matches)?.call(e, _s) ?? !1;
}
function ys(e, t = (e) => e) {
	return e.slice().sort((e, n) => {
		let r = t(e), i = t(n);
		if (r === null || i === null) return 0;
		let a = r.compareDocumentPosition(i);
		return a & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : a & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
	});
}
function bs(e, t, n = e === null ? document.body : Ji(e)) {
	return xs(us(n), t, { relativeTo: e });
}
function xs(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
	let a = Array.isArray(e) ? e.length > 0 ? Ji(e[0]) : document : Ji(e), o = Array.isArray(e) ? n ? ys(e) : e : t & 64 ? ds(e) : us(e);
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
	} while (f !== Yi(f));
	return t & 6 && vs(f) && f.select(), 2;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/platform.js
function Ss() {
	return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function Cs() {
	return /Android/gi.test(window.navigator.userAgent);
}
function ws() {
	return Ss() || Cs();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-document-event.js
function Ts(e, t, n, r) {
	let i = ea(n);
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
function Es(e, t, n, r) {
	let i = ea(n);
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
var Ds = 30;
function Os(e, t, n) {
	let r = ea(n), i = l(function(e, n) {
		if (e.defaultPrevented) return;
		let i = n(e);
		if (i === null || !i.getRootNode().contains(i) || !i.isConnected) return;
		let a = function e(t) {
			return typeof t == "function" ? e(t()) : Array.isArray(t) || t instanceof Set ? t : [t];
		}(t);
		for (let t of a) if (t !== null && (t.contains(i) || e.composed && e.composedPath().includes(t))) return;
		return !ps(i, fs.Loose) && i.tabIndex !== -1 && e.preventDefault(), r.current(e, i);
	}, [r, t]), a = y(null);
	Ts(e, "pointerdown", (e) => {
		ws() || (a.current = e.composedPath?.call(e)?.[0] || e.target);
	}, !0), Ts(e, "pointerup", (e) => {
		if (ws() || !a.current) return;
		let t = a.current;
		return a.current = null, i(e, () => t);
	}, !0);
	let o = y({
		x: 0,
		y: 0
	});
	Ts(e, "touchstart", (e) => {
		o.current.x = e.touches[0].clientX, o.current.y = e.touches[0].clientY;
	}, !0), Ts(e, "touchend", (e) => {
		let t = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if (!(Math.abs(t.x - o.current.x) >= Ds || Math.abs(t.y - o.current.y) >= Ds)) return i(e, () => Ua(e.target) ? e.target : null);
	}, !0), Es(e, "blur", (e) => i(e, () => Ga(window.document.activeElement) ? window.document.activeElement : null), !0);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-owner.js
function ks(...e) {
	return _(() => qi(...e), [...e]);
}
function As(...e) {
	return _(() => Ji(...e), [...e]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-quick-release.js
var js = ((e) => (e[e.Ignore = 0] = "Ignore", e[e.Select = 1] = "Select", e[e.Close = 2] = "Close", e))(js || {}), Ms = {
	Ignore: { kind: 0 },
	Select: (e) => ({
		kind: 1,
		target: e
	}),
	Close: { kind: 2 }
}, Ns = 200, Ps = 5;
function Fs(e, { trigger: t, action: n, close: r, select: i }) {
	let a = y(null), o = y(null), s = y(null);
	Ts(e && t !== null, "pointerdown", (e) => {
		Ba(e?.target) && t != null && t.contains(e.target) && (o.current = e.x, s.current = e.y, a.current = e.timeStamp);
	}), Ts(e && t !== null, "pointerup", (e) => {
		let t = a.current;
		if (t === null || (a.current = null, !Ua(e.target)) || Math.abs(e.x - (o.current ?? e.x)) < Ps && Math.abs(e.y - (s.current ?? e.y)) < Ps) return;
		let c = n(e);
		switch (c.kind) {
			case 0: return;
			case 1:
				e.timeStamp - t > Ns && (i(c.target), r());
				break;
			case 2:
				r();
				break;
		}
	}, { capture: !0 });
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event-listener.js
function Is(e, t, n, r) {
	let i = ea(n);
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
function Ls(e, t) {
	return _(() => {
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
function Rs(e) {
	return x(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/store.js
function zs(e, t) {
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
function Bs() {
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
function Vs() {
	return Ss() ? { before({ doc: e, d: t, meta: n }) {
		function r(e) {
			for (let t of n().containers) for (let n of t()) if (n.contains(e)) return !0;
			return !1;
		}
		t.microTask(() => {
			if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
				let n = Qi();
				n.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => n.dispose()));
			}
			let n = window.scrollY ?? window.pageYOffset, i = null;
			t.addEventListener(e, "click", (t) => {
				if (Ua(t.target)) try {
					let n = t.target.closest("a");
					if (!n) return;
					let { hash: a } = new URL(n.href), o = e.querySelector(a);
					Ua(o) && !r(o) && (i = o);
				} catch {}
			}, !0), t.group((n) => {
				t.addEventListener(e, "touchstart", (e) => {
					if (n.dispose(), Ua(e.target) && Wa(e.target)) if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && r(t.parentElement);) t = t.parentElement;
						n.style(t, "overscrollBehavior", "contain");
					} else n.style(e.target, "touchAction", "none");
				});
			}), t.addEventListener(e, "touchmove", (e) => {
				if (Ua(e.target)) {
					if (Ka(e.target)) return;
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
function Hs() {
	return { before({ doc: e, d: t }) {
		t.style(e.documentElement, "overflow", "hidden");
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
function Us(e) {
	let t = {};
	for (let n of e) Object.assign(t, n(t));
	return t;
}
var Ws = zs(() => /* @__PURE__ */ new Map(), {
	PUSH(e, t) {
		let n = this.get(e) ?? {
			doc: e,
			count: 0,
			d: Qi(),
			meta: /* @__PURE__ */ new Set(),
			computedMeta: {}
		};
		return n.count++, n.meta.add(t), n.computedMeta = Us(n.meta), this.set(e, n), this;
	},
	POP(e, t) {
		let n = this.get(e);
		return n && (n.count--, n.meta.delete(t), n.computedMeta = Us(n.meta)), this;
	},
	SCROLL_PREVENT(e) {
		let t = {
			doc: e.doc,
			d: e.d,
			meta() {
				return e.computedMeta;
			}
		}, n = [
			Vs(),
			Bs(),
			Hs()
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
Ws.subscribe(() => {
	let e = Ws.getSnapshot(), t = /* @__PURE__ */ new Map();
	for (let [n] of e) t.set(n, n.documentElement.style.overflow);
	for (let n of e.values()) {
		let e = t.get(n.doc) === "hidden", r = n.count !== 0;
		(r && !e || !r && e) && Ws.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && Ws.dispatch("TEARDOWN", n);
	}
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
function Gs(e, t, n = () => ({ containers: [] })) {
	let r = Rs(Ws), i = t ? r.get(t) : void 0, a = i ? i.count > 0 : !1;
	return G(() => {
		if (!(!t || !e)) return Ws.dispatch("PUSH", t, n), () => Ws.dispatch("POP", t, n);
	}, [e, t]), a;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
function Ks(e, t, n = () => [document.body]) {
	Gs(Qo(e, "scroll-lock"), t, (e) => ({ containers: [...e.containers ?? [], n] }));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tracked-pointer.js
function qs(e) {
	return [e.screenX, e.screenY];
}
function Js() {
	let e = y([-1, -1]);
	return {
		wasMoved(t) {
			let n = qs(t);
			return e.current[0] === n[0] && e.current[1] === n[1] ? !1 : (e.current = n, !0);
		},
		update(t) {
			e.current = qs(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-flags.js
function Ys(e = 0) {
	let [t, n] = b(e);
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
var Xs = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(Xs || {});
function Zs(e) {
	let t = {};
	for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
	return t;
}
function Qs(e, t, n, r) {
	let [i, a] = b(n), { hasFlag: o, addFlag: s, removeFlag: c } = Ys(e && i ? 3 : 0), l = y(!1), u = y(!1);
	return G(() => {
		var i;
		if (e) {
			if (n && a(!0), !t) {
				n && s(3);
				return;
			}
			return (i = r?.start) == null || i.call(r, n), $s(t, {
				inFlight: l,
				prepare() {
					u.current ? u.current = !1 : u.current = l.current, l.current = !0, !u.current && (n ? (s(3), c(4)) : (s(4), c(2)));
				},
				run() {
					u.current ? n ? (c(3), s(4)) : (c(4), s(3)) : n ? c(1) : s(1);
				},
				done() {
					var e;
					u.current && nc(t) || (l.current = !1, c(7), n || a(!1), (e = r?.end) == null || e.call(r, n));
				}
			});
		}
	}, [
		e,
		n,
		t,
		$i()
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
function $s(e, { prepare: t, run: n, done: r, inFlight: i }) {
	let a = Qi();
	return tc(e, {
		prepare: t,
		inFlight: i
	}), a.nextFrame(() => {
		n(), a.requestAnimationFrame(() => {
			a.add(ec(e, r));
		});
	}), a.dispose;
}
function ec(e, t) {
	let n = Qi();
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
function tc(e, { inFlight: t, prepare: n }) {
	if (t != null && t.current) {
		n();
		return;
	}
	let r = e.style.transition;
	e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function nc(e) {
	return (e.getAnimations?.call(e) ?? []).some((e) => e instanceof CSSTransition && e.playState !== "finished");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tree-walker.js
function rc(e, { container: t, accept: n, walk: r }) {
	let i = y(n), a = y(r);
	f(() => {
		i.current = n, a.current = r;
	}, [n, r]), G(() => {
		if (!t || !e) return;
		let n = qi(t);
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
function ic(e, t) {
	let n = y([]), r = K(e);
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
function ac() {
	return typeof window < "u";
}
function oc(e) {
	return lc(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function sc(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function cc(e) {
	return ((lc(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function lc(e) {
	return ac() ? e instanceof Node || e instanceof sc(e).Node : !1;
}
function uc(e) {
	return ac() ? e instanceof Element || e instanceof sc(e).Element : !1;
}
function dc(e) {
	return ac() ? e instanceof HTMLElement || e instanceof sc(e).HTMLElement : !1;
}
function fc(e) {
	return !ac() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof sc(e).ShadowRoot;
}
function pc(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = wc(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function mc(e) {
	return /^(table|td|th)$/.test(oc(e));
}
function hc(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var gc = /transform|translate|scale|rotate|perspective|filter/, _c = /paint|layout|strict|content/, vc = (e) => !!e && e !== "none", yc;
function bc(e) {
	let t = uc(e) ? wc(e) : e;
	return vc(t.transform) || vc(t.translate) || vc(t.scale) || vc(t.rotate) || vc(t.perspective) || !Sc() && (vc(t.backdropFilter) || vc(t.filter)) || gc.test(t.willChange || "") || _c.test(t.contain || "");
}
function xc(e) {
	let t = Ec(e);
	for (; dc(t) && !Cc(t);) {
		if (bc(t)) return t;
		if (hc(t)) return null;
		t = Ec(t);
	}
	return null;
}
function Sc() {
	return yc ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), yc;
}
function Cc(e) {
	return /^(html|body|#document)$/.test(oc(e));
}
function wc(e) {
	return sc(e).getComputedStyle(e);
}
function Tc(e) {
	return uc(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function Ec(e) {
	if (oc(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || fc(e) && e.host || cc(e);
	return fc(t) ? t.host : t;
}
function Dc(e) {
	let t = Ec(e);
	return Cc(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : dc(t) && pc(t) ? t : Dc(t);
}
function Oc(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = Dc(e), i = r === e.ownerDocument?.body, a = sc(r);
	if (i) {
		let e = kc(a);
		return t.concat(a, a.visualViewport || [], pc(r) ? r : [], e && n ? Oc(e) : []);
	} else return t.concat(r, Oc(r, [], n));
}
function kc(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+react@0.26.28_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@floating-ui/react/dist/floating-ui.react.utils.mjs
function Ac() {
	let e = navigator.userAgentData;
	return e && Array.isArray(e.brands) ? e.brands.map((e) => {
		let { brand: t, version: n } = e;
		return t + "/" + n;
	}).join(" ") : navigator.userAgent;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var jc = Math.min, Mc = Math.max, Nc = Math.round, Pc = Math.floor, Fc = (e) => ({
	x: e,
	y: e
}), Ic = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function Lc(e, t, n) {
	return Mc(e, jc(t, n));
}
function Rc(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function zc(e) {
	return e.split("-")[0];
}
function Bc(e) {
	return e.split("-")[1];
}
function Vc(e) {
	return e === "x" ? "y" : "x";
}
function Hc(e) {
	return e === "y" ? "height" : "width";
}
function Uc(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function Wc(e) {
	return Vc(Uc(e));
}
function Gc(e, t, n) {
	n === void 0 && (n = !1);
	let r = Bc(e), i = Wc(e), a = Hc(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = el(o)), [o, el(o)];
}
function Kc(e) {
	let t = el(e);
	return [
		qc(e),
		t,
		qc(t)
	];
}
function qc(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var Jc = ["left", "right"], Yc = ["right", "left"], Xc = ["top", "bottom"], Zc = ["bottom", "top"];
function Qc(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? Yc : Jc : t ? Jc : Yc;
		case "left":
		case "right": return t ? Xc : Zc;
		default: return [];
	}
}
function $c(e, t, n, r) {
	let i = Bc(e), a = Qc(zc(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(qc)))), a;
}
function el(e) {
	let t = zc(e);
	return Ic[t] + e.slice(t.length);
}
function tl(e) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...e
	};
}
function nl(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : tl(e);
}
function rl(e) {
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
function il(e, t, n) {
	let { reference: r, floating: i } = e, a = Uc(t), o = Wc(t), s = Hc(o), c = zc(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
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
	switch (Bc(t)) {
		case "start":
			p[o] -= f * (n && l ? -1 : 1);
			break;
		case "end":
			p[o] += f * (n && l ? -1 : 1);
			break;
	}
	return p;
}
async function al(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = Rc(t, e), p = nl(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = rl(await i.getClippingRect({
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
	}, y = rl(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
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
var ol = 50, sl = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: al
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = il(l, r, c), f = r, p = 0, m = {};
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
		}, x && p < ol && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = il(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, cl = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = Rc(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = zc(r), _ = Uc(o), v = zc(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [el(o)] : Kc(o)), x = p !== "none";
			!d && x && b.push(...$c(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = Gc(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (!(u === "alignment" && _ !== Uc(t)) || T.every((e) => Uc(e.placement) !== _ || e.overflows[0] > 0))) return {
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
								let t = Uc(e.placement);
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
}, ll = /*#__PURE__*/ new Set(["left", "top"]);
async function ul(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = zc(n), s = Bc(n), c = Uc(n) === "y", l = ll.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = Rc(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
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
var dl = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await ul(t, e);
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
}, fl = function(e) {
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
			} }, ...l } = Rc(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Uc(zc(i)), p = Vc(f), m = u[p], h = u[f];
			if (o) {
				let e = p === "y" ? "top" : "left", t = p === "y" ? "bottom" : "right", n = m + d[e], r = m - d[t];
				m = Lc(n, m, r);
			}
			if (s) {
				let e = f === "y" ? "top" : "left", t = f === "y" ? "bottom" : "right", n = h + d[e], r = h - d[t];
				h = Lc(n, h, r);
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
}, pl = function(e) {
	return e === void 0 && (e = {}), {
		name: "size",
		options: e,
		async fn(t) {
			var n, r;
			let { placement: i, rects: a, platform: o, elements: s } = t, { apply: c = () => {}, ...l } = Rc(e, t), u = await o.detectOverflow(t, l), d = zc(i), f = Bc(i), p = Uc(i) === "y", { width: m, height: h } = a.floating, g, _;
			d === "top" || d === "bottom" ? (g = d, _ = f === (await (o.isRTL == null ? void 0 : o.isRTL(s.floating)) ? "start" : "end") ? "left" : "right") : (_ = d, g = f === "end" ? "top" : "bottom");
			let v = h - u.top - u.bottom, y = m - u.left - u.right, b = jc(h - u[g], v), x = jc(m - u[_], y), S = !t.middlewareData.shift, C = b, w = x;
			if ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y), (r = t.middlewareData.shift) != null && r.enabled.y && (C = v), S && !f) {
				let e = Mc(u.left, 0), t = Mc(u.right, 0), n = Mc(u.top, 0), r = Mc(u.bottom, 0);
				p ? w = m - 2 * (e !== 0 || t !== 0 ? e + t : Mc(u.left, u.right)) : C = h - 2 * (n !== 0 || r !== 0 ? n + r : Mc(u.top, u.bottom));
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
function ml(e) {
	let t = wc(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = dc(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = Nc(n) !== a || Nc(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function hl(e) {
	return uc(e) ? e : e.contextElement;
}
function gl(e) {
	let t = hl(e);
	if (!dc(t)) return Fc(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = ml(t), o = (a ? Nc(n.width) : n.width) / r, s = (a ? Nc(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var _l = /*#__PURE__*/ Fc(0);
function vl(e) {
	let t = sc(e);
	return !Sc() || !t.visualViewport ? _l : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function yl(e, t, n) {
	return t === void 0 && (t = !1), !n || t && n !== sc(e) ? !1 : t;
}
function bl(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = hl(e), o = Fc(1);
	t && (r ? uc(r) && (o = gl(r)) : o = gl(e));
	let s = yl(a, n, r) ? vl(a) : Fc(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a) {
		let e = sc(a), t = r && uc(r) ? sc(r) : r, n = e, i = kc(n);
		for (; i && r && t !== n;) {
			let e = gl(i), t = i.getBoundingClientRect(), r = wc(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = sc(i), i = kc(n);
		}
	}
	return rl({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function xl(e, t) {
	let n = Tc(e).scrollLeft;
	return t ? t.left + n : bl(cc(e)).left + n;
}
function Sl(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - xl(e, n),
		y: n.top + t.scrollTop
	};
}
function Cl(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = cc(r), s = t ? hc(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = Fc(1), u = Fc(0), d = dc(r);
	if ((d || !d && !a) && ((oc(r) !== "body" || pc(o)) && (c = Tc(r)), d)) {
		let e = bl(r);
		l = gl(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? Sl(o, c) : Fc(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function wl(e) {
	return Array.from(e.getClientRects());
}
function Tl(e) {
	let t = cc(e), n = Tc(e), r = e.ownerDocument.body, i = Mc(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = Mc(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight), o = -n.scrollLeft + xl(e), s = -n.scrollTop;
	return wc(r).direction === "rtl" && (o += Mc(t.clientWidth, r.clientWidth) - i), {
		width: i,
		height: a,
		x: o,
		y: s
	};
}
var El = 25;
function Dl(e, t) {
	let n = sc(e), r = cc(e), i = n.visualViewport, a = r.clientWidth, o = r.clientHeight, s = 0, c = 0;
	if (i) {
		a = i.width, o = i.height;
		let e = Sc();
		(!e || e && t === "fixed") && (s = i.offsetLeft, c = i.offsetTop);
	}
	let l = xl(r);
	if (l <= 0) {
		let e = r.ownerDocument, t = e.body, n = getComputedStyle(t), i = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, o = Math.abs(r.clientWidth - t.clientWidth - i);
		o <= El && (a -= o);
	} else l <= El && (a += l);
	return {
		width: a,
		height: o,
		x: s,
		y: c
	};
}
function Ol(e, t) {
	let n = bl(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = dc(e) ? gl(e) : Fc(1);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function kl(e, t, n) {
	let r;
	if (t === "viewport") r = Dl(e, n);
	else if (t === "document") r = Tl(cc(e));
	else if (uc(t)) r = Ol(t, n);
	else {
		let n = vl(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return rl(r);
}
function Al(e, t) {
	let n = Ec(e);
	return n === t || !uc(n) || Cc(n) ? !1 : wc(n).position === "fixed" || Al(n, t);
}
function jl(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = Oc(e, [], !1).filter((e) => uc(e) && oc(e) !== "body"), i = null, a = wc(e).position === "fixed", o = a ? Ec(e) : e;
	for (; uc(o) && !Cc(o);) {
		let t = wc(o), n = bc(o);
		!n && t.position === "fixed" && (i = null), (a ? !n && !i : !n && t.position === "static" && i && (i.position === "absolute" || i.position === "fixed") || pc(o) && !n && Al(e, o)) ? r = r.filter((e) => e !== o) : i = t, o = Ec(o);
	}
	return t.set(e, r), r;
}
function Ml(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? hc(t) ? [] : jl(t, this._c) : [].concat(n), r], o = kl(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = kl(t, a[e], i);
		s = Mc(n.top, s), c = jc(n.right, c), l = jc(n.bottom, l), u = Mc(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function Nl(e) {
	let { width: t, height: n } = ml(e);
	return {
		width: t,
		height: n
	};
}
function Pl(e, t, n) {
	let r = dc(t), i = cc(t), a = n === "fixed", o = bl(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = Fc(0);
	function l() {
		c.x = xl(i);
	}
	if (r || !r && !a) if ((oc(t) !== "body" || pc(i)) && (s = Tc(t)), r) {
		let e = bl(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	} else i && l();
	a && !r && i && l();
	let u = i && !r && !a ? Sl(i, s) : Fc(0);
	return {
		x: o.left + s.scrollLeft - c.x - u.x,
		y: o.top + s.scrollTop - c.y - u.y,
		width: o.width,
		height: o.height
	};
}
function Fl(e) {
	return wc(e).position === "static";
}
function Il(e, t) {
	if (!dc(e) || wc(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return cc(e) === n && (n = n.ownerDocument.body), n;
}
function Ll(e, t) {
	let n = sc(e);
	if (hc(e)) return n;
	if (!dc(e)) {
		let t = Ec(e);
		for (; t && !Cc(t);) {
			if (uc(t) && !Fl(t)) return t;
			t = Ec(t);
		}
		return n;
	}
	let r = Il(e, t);
	for (; r && mc(r) && Fl(r);) r = Il(r, t);
	return r && Cc(r) && Fl(r) && !bc(r) ? n : r || xc(e) || n;
}
var Rl = async function(e) {
	let t = this.getOffsetParent || Ll, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: Pl(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function zl(e) {
	return wc(e).direction === "rtl";
}
var Bl = {
	convertOffsetParentRelativeRectToViewportRelativeRect: Cl,
	getDocumentElement: cc,
	getClippingRect: Ml,
	getOffsetParent: Ll,
	getElementRects: Rl,
	getClientRects: wl,
	getDimensions: Nl,
	getScale: gl,
	isElement: uc,
	isRTL: zl
};
function Vl(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Hl(e, t) {
	let n = null, r, i = cc(e);
	function a() {
		var e;
		clearTimeout(r), (e = n) == null || e.disconnect(), n = null;
	}
	function o(s, c) {
		s === void 0 && (s = !1), c === void 0 && (c = 1), a();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (s || t(), !f || !p) return;
		let m = Pc(d), h = Pc(i.clientWidth - (u + f)), g = Pc(i.clientHeight - (d + p)), _ = Pc(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: Mc(0, jc(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (n !== c) {
				if (!y) return o();
				n ? o(!1, n) : r = setTimeout(() => {
					o(!1, 1e-7);
				}, 1e3);
			}
			n === 1 && !Vl(l, e.getBoundingClientRect()) && o(), y = !1;
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
function Ul(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = hl(e), u = i || a ? [...l ? Oc(l) : [], ...t ? Oc(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n, { passive: !0 }), a && e.addEventListener("resize", n);
	});
	let d = l && s ? Hl(l, n) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? bl(e) : null;
	c && g();
	function g() {
		let t = bl(e);
		h && !Vl(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var Wl = al, Gl = dl, Kl = fl, ql = cl, Jl = pl, Yl = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = {
		platform: Bl,
		...n
	}, a = {
		...i.platform,
		_c: r
	};
	return sl(e, t, {
		...i,
		platform: a
	});
}, Xl = typeof document < "u" ? g : function() {};
function Zl(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (typeof e == "function" && e.toString() === t.toString()) return !0;
	let n, r, i;
	if (e && t && typeof e == "object") {
		if (Array.isArray(e)) {
			if (n = e.length, n !== t.length) return !1;
			for (r = n; r-- !== 0;) if (!Zl(e[r], t[r])) return !1;
			return !0;
		}
		if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
		for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
		for (r = n; r-- !== 0;) {
			let n = i[r];
			if (!(n === "_owner" && e.$$typeof) && !Zl(e[n], t[n])) return !1;
		}
		return !0;
	}
	return e !== e && t !== t;
}
function Ql(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function $l(e, t) {
	let n = Ql(e);
	return Math.round(t * n) / n;
}
function eu(t) {
	let n = e.useRef(t);
	return Xl(() => {
		n.current = t;
	}), n;
}
function tu(t) {
	t === void 0 && (t = {});
	let { placement: n = "bottom", strategy: r = "absolute", middleware: i = [], platform: a, elements: { reference: o, floating: s } = {}, transform: c = !0, whileElementsMounted: l, open: u } = t, [d, f] = e.useState({
		x: 0,
		y: 0,
		strategy: r,
		placement: n,
		middlewareData: {},
		isPositioned: !1
	}), [p, m] = e.useState(i);
	Zl(p, i) || m(i);
	let [h, g] = e.useState(null), [_, v] = e.useState(null), y = e.useCallback((e) => {
		e !== C.current && (C.current = e, g(e));
	}, []), b = e.useCallback((e) => {
		e !== w.current && (w.current = e, v(e));
	}, []), x = o || h, S = s || _, C = e.useRef(null), w = e.useRef(null), E = e.useRef(d), D = l != null, O = eu(l), k = eu(a), A = eu(u), j = e.useCallback(() => {
		if (!C.current || !w.current) return;
		let e = {
			placement: n,
			strategy: r,
			middleware: p
		};
		k.current && (e.platform = k.current), Yl(C.current, w.current, e).then((e) => {
			let t = {
				...e,
				isPositioned: A.current !== !1
			};
			M.current && !Zl(E.current, t) && (E.current = t, T.flushSync(() => {
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
	Xl(() => {
		u === !1 && E.current.isPositioned && (E.current.isPositioned = !1, f((e) => ({
			...e,
			isPositioned: !1
		})));
	}, [u]);
	let M = e.useRef(!1);
	Xl(() => (M.current = !0, () => {
		M.current = !1;
	}), []), Xl(() => {
		if (x && (C.current = x), S && (w.current = S), x && S) {
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
		floating: w,
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
		let t = $l(P.floating, d.x), n = $l(P.floating, d.y);
		return c ? {
			...e,
			transform: "translate(" + t + "px, " + n + "px)",
			...Ql(P.floating) >= 1.5 && { willChange: "transform" }
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
var nu = (e, t) => {
	let n = Gl(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, ru = (e, t) => {
	let n = Kl(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, iu = (e, t) => {
	let n = ql(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, au = (e, t) => {
	let n = Jl(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, ou = { ...e }, su = ou.useInsertionEffect || ((e) => e());
function cu(t) {
	let n = e.useRef(() => {});
	return su(() => {
		n.current = t;
	}), e.useCallback(function() {
		var e = [...arguments];
		return n.current == null ? void 0 : n.current(...e);
	}, []);
}
var lu = "ArrowUp", uu = "ArrowDown", du = "ArrowLeft", fu = "ArrowRight", pu = typeof document < "u" ? g : f, mu = [du, fu], hu = [lu, uu];
[...mu, ...hu];
var gu = !1, _u = 0, vu = () => "floating-ui-" + Math.random().toString(36).slice(2, 6) + _u++;
function yu() {
	let [t, n] = e.useState(() => gu ? vu() : void 0);
	return pu(() => {
		t ?? n(vu());
	}, []), e.useEffect(() => {
		gu = !0;
	}, []), t;
}
var bu = ou.useId || yu;
function xu() {
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
var Su = /*#__PURE__*/ e.createContext(null), Cu = /*#__PURE__*/ e.createContext(null), wu = () => e.useContext(Su)?.id || null, Tu = () => e.useContext(Cu), Eu = "data-floating-ui-focusable";
function Du(t) {
	let { open: n = !1, onOpenChange: r, elements: i } = t, a = bu(), o = e.useRef({}), [s] = e.useState(() => xu()), c = wu() != null, [l, u] = e.useState(i.reference), d = cu((e, t, n) => {
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
function Ou(t) {
	t === void 0 && (t = {});
	let { nodeId: n } = t, r = Du({
		...t,
		elements: {
			reference: null,
			floating: null,
			...t.elements
		}
	}), i = t.rootContext || r, a = i.elements, [o, s] = e.useState(null), [c, l] = e.useState(null), u = a?.domReference || o, d = e.useRef(null), f = Tu();
	pu(() => {
		u && (d.current = u);
	}, [u]);
	let p = tu({
		...t,
		elements: {
			...a,
			...c && { reference: c }
		}
	}), m = e.useCallback((e) => {
		let t = uc(e) ? {
			getBoundingClientRect: () => e.getBoundingClientRect(),
			contextElement: e
		} : e;
		l(t), p.refs.setReference(t);
	}, [p.refs]), h = e.useCallback((e) => {
		(uc(e) || e === null) && (d.current = e, s(e)), (uc(p.refs.reference.current) || p.refs.reference.current === null || e !== null && !uc(e)) && p.refs.setReference(e);
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
	return pu(() => {
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
var ku = "active", Au = "selected";
function ju(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = n === "item", a = e;
	if (i && e) {
		let { [ku]: t, [Au]: n, ...r } = e;
		a = r;
	}
	return {
		...n === "floating" && {
			tabIndex: -1,
			[Eu]: ""
		},
		...a,
		...t.map((t) => {
			let r = t ? t[n] : null;
			return typeof r == "function" ? e ? r(e) : null : r;
		}).concat(e).reduce((e, t) => (t && Object.entries(t).forEach((t) => {
			let [n, a] = t;
			if (!(i && [ku, Au].includes(n))) if (n.indexOf("on") === 0) {
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
function Mu(t) {
	t === void 0 && (t = []);
	let n = t.map((e) => e?.reference), r = t.map((e) => e?.floating), i = t.map((e) => e?.item), a = e.useCallback((e) => ju(e, t, "reference"), n), o = e.useCallback((e) => ju(e, t, "floating"), r), s = e.useCallback((e) => ju(e, t, "item"), i);
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
function Nu(e, t) {
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
var Pu = (e) => ({
	name: "inner",
	options: e,
	async fn(t) {
		let { listRef: n, overflowRef: r, onFallbackChange: i, offset: a = 0, index: o = 0, minItemsVisible: s = 4, referenceOverflowThreshold: c = 0, scrollRef: l, ...u } = Rc(e, t), { rects: d, elements: { floating: f } } = t, p = n.current[o], m = l?.current || f, h = f.clientTop || m.clientTop, g = f.clientTop !== 0, _ = m.clientTop !== 0, v = f === m;
		if (!p) return {};
		let y = {
			...t,
			...await nu(-p.offsetTop - f.clientTop - d.reference.height / 2 - p.offsetHeight / 2 - a).fn(t)
		}, b = await Wl(Nu(y, m.scrollHeight + h + f.clientTop), u), x = await Wl(y, {
			...u,
			elementContext: "reference"
		}), S = Mc(0, b.top), C = y.y + S, w = (m.scrollHeight > m.clientHeight ? (e) => e : Nc)(Mc(0, m.scrollHeight + (g && v || _ ? h * 2 : 0) - S - Mc(0, b.bottom)));
		if (m.style.maxHeight = w + "px", m.scrollTop = S, i) {
			let e = m.offsetHeight < p.offsetHeight * jc(s, n.current.length) - 1 || x.top >= -c || x.bottom >= -c;
			T.flushSync(() => i(e));
		}
		return r && (r.current = await Wl(Nu({
			...y,
			y: C
		}, m.offsetHeight + h + f.clientTop), u)), { y: C };
	}
});
function Fu(t, n) {
	let { open: r, elements: i } = t, { enabled: a = !0, overflowRef: o, scrollRef: s, onChange: c } = n, l = cu(c), u = e.useRef(!1), d = e.useRef(null), f = e.useRef(null);
	e.useEffect(() => {
		if (!a) return;
		function e(e) {
			if (e.ctrlKey || !t || o.current == null) return;
			let n = e.deltaY, r = o.current.top >= -.5, i = o.current.bottom >= -.5, a = t.scrollHeight - t.clientHeight, s = n < 0 ? -1 : 1, c = n < 0 ? "max" : "min";
			t.scrollHeight <= t.clientHeight || (!r && n > 0 || !i && n < 0 ? (e.preventDefault(), T.flushSync(() => {
				l((e) => e + Math[c](n, a * s));
			})) : /firefox/i.test(Ac()) && (t.scrollTop += n));
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
					(o.current.bottom < -.5 && t < -1 || o.current.top < -.5 && t > 1) && T.flushSync(() => l((e) => e + t));
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
var Iu = i({
	styles: void 0,
	setReference: () => {},
	setFloating: () => {},
	getReferenceProps: () => ({}),
	getFloatingProps: () => ({}),
	slot: {}
});
Iu.displayName = "FloatingContext";
var Lu = i(null);
Lu.displayName = "PlacementContext";
function Ru(e) {
	return _(() => e ? typeof e == "string" ? { to: e } : e : null, [e]);
}
function zu() {
	return u(Iu).setReference;
}
function Bu() {
	return u(Iu).getReferenceProps;
}
function Vu() {
	let { getFloatingProps: e, slot: t } = u(Iu);
	return l((...n) => Object.assign({}, e(...n), { "data-anchor": t.anchor }), [e, t]);
}
function Hu(e = null) {
	e === !1 && (e = null), typeof e == "string" && (e = { to: e });
	let t = u(Lu), n = _(() => e, [JSON.stringify(e, (e, t) => t?.outerHTML ?? t)]);
	G(() => {
		t?.(n ?? null);
	}, [t, n]);
	let r = u(Iu);
	return _(() => [r.setFloating, e ? r.styles : {}], [
		r.setFloating,
		e,
		r.styles
	]);
}
var Uu = 4;
function Wu({ children: t, enabled: n = !0 }) {
	let [r, i] = b(null), [a, o] = b(0), s = y(null), [c, l] = b(null);
	Gu(c);
	let u = n && r !== null && c !== null, { to: d = "bottom", gap: f = 0, offset: p = 0, padding: m = 0, inner: h } = Ku(r, c), [g, v = "center"] = d.split(" ");
	G(() => {
		u && o(0);
	}, [u]);
	let { refs: x, floatingStyles: S, context: C } = Ou({
		open: u,
		placement: g === "selection" ? v === "center" ? "bottom" : `bottom-${v}` : v === "center" ? `${g}` : `${g}-${v}`,
		strategy: "absolute",
		transform: !1,
		middleware: [
			nu({
				mainAxis: g === "selection" ? 0 : f,
				crossAxis: p
			}),
			ru({ padding: m }),
			g !== "selection" && iu({ padding: m }),
			g === "selection" && h ? Pu({
				...h,
				padding: m,
				overflowRef: s,
				offset: a,
				minItemsVisible: Uu,
				referenceOverflowThreshold: m,
				onFallbackChange(e) {
					if (!e) return;
					let t = C.elements.floating;
					if (!t) return;
					let n = parseFloat(getComputedStyle(t).scrollPaddingBottom) || 0, r = Math.min(Uu, t.childElementCount), i = 0, a = 0;
					for (let e of C.elements.floating?.childNodes ?? []) if (Ha(e)) {
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
			au({
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
		whileElementsMounted: Ul
	}), [w = g, T = v] = C.placement.split("-");
	g === "selection" && (w = "selection");
	let E = _(() => ({ anchor: [w, T].filter(Boolean).join(" ") }), [w, T]), { getReferenceProps: D, getFloatingProps: O } = Mu([Fu(C, {
		overflowRef: s,
		onChange: o
	})]), k = K((e) => {
		l(e), x.setFloating(e);
	});
	return e.createElement(Lu.Provider, { value: i }, e.createElement(Iu.Provider, { value: {
		setFloating: k,
		setReference: x.setReference,
		styles: S,
		getReferenceProps: D,
		getFloatingProps: O,
		slot: E
	} }, t));
}
function Gu(e) {
	G(() => {
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
function Ku(e, t) {
	let n = qu(e?.gap ?? "var(--anchor-gap, 0)", t), r = qu(e?.offset ?? "var(--anchor-offset, 0)", t), i = qu(e?.padding ?? "var(--anchor-padding, 0)", t);
	return {
		...e,
		gap: n,
		offset: r,
		padding: i
	};
}
function qu(e, t, n = void 0) {
	let r = $i(), i = K((e, t) => {
		if (e == null) return [n, null];
		if (typeof e == "number") return [e, null];
		if (typeof e == "string") {
			if (!t) return [n, null];
			let i = Yu(e, t);
			return [i, (n) => {
				let a = Ju(e);
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
						let l = Yu(e, t);
						i !== l && (n(l), i = l);
					});
				}
				return r.dispose;
			}];
		}
		return [n, null];
	}), a = _(() => i(e, t)[0], [e, t]), [o = a, s] = b();
	return G(() => {
		let [n, r] = i(e, t);
		if (s(n), r) return r(s);
	}, [e, t]), o;
}
function Ju(e) {
	let t = /var\((.*)\)/.exec(e);
	if (t) {
		let e = t[1].indexOf(",");
		if (e === -1) return [t[1]];
		let n = t[1].slice(0, e).trim(), r = t[1].slice(e + 1).trim();
		return r ? [n, ...Ju(r)] : [n];
	}
	return [];
}
function Yu(e, t) {
	let n = document.createElement("div");
	t.appendChild(n), n.style.setProperty("margin-top", "0px", "important"), n.style.setProperty("margin-top", e, "important");
	let r = parseFloat(window.getComputedStyle(n).marginTop) || 0;
	return t.removeChild(n), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/frozen.js
function Xu({ children: e, freeze: n }, i) {
	let a = Zu(n, e);
	return c(a) ? r(a, { ref: i }) : t.createElement(t.Fragment, null, a);
}
t.forwardRef(Xu);
function Zu(e, t) {
	let [n, r] = b(t);
	return !e && n !== t && r(t), e ? n : t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/open-closed.js
var Qu = i(null);
Qu.displayName = "OpenClosedContext";
var Q = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(Q || {});
function $u() {
	return u(Qu);
}
function ed({ value: e, children: n }) {
	return t.createElement(Qu.Provider, { value: e }, n);
}
function td({ children: e }) {
	return t.createElement(Qu.Provider, { value: null }, e);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/document-ready.js
function nd(e) {
	function t() {
		document.readyState !== "loading" && (e(), document.removeEventListener("DOMContentLoaded", t));
	}
	typeof window < "u" && typeof document < "u" && (document.addEventListener("DOMContentLoaded", t), t());
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/active-element-history.js
var rd = [];
nd(() => {
	function e(e) {
		if (!Ua(e.target) || e.target === document.body || rd[0] === e.target) return;
		let t = e.target;
		t = t.closest(as), rd.unshift(t ?? e.target), rd = rd.filter((e) => e != null && e.isConnected), rd.splice(10);
	}
	window.addEventListener("click", e, { capture: !0 }), window.addEventListener("mousedown", e, { capture: !0 }), window.addEventListener("focus", e, { capture: !0 }), document.body.addEventListener("click", e, { capture: !0 }), document.body.addEventListener("mousedown", e, { capture: !0 }), document.body.addEventListener("focus", e, { capture: !0 });
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/calculate-active-index.js
function id(e) {
	throw Error("Unexpected object: " + e);
}
var $ = ((e) => (e[e.First = 0] = "First", e[e.Previous = 1] = "Previous", e[e.Next = 2] = "Next", e[e.Last = 3] = "Last", e[e.Specific = 4] = "Specific", e[e.Nothing = 5] = "Nothing", e))($ || {});
function ad(e, t) {
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
		default: id(e);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
function od(e) {
	let t = K(e), n = y(!1);
	f(() => (n.current = !1, () => {
		n.current = !0, Zi(() => {
			n.current && t();
		});
	}), [t]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
function sd() {
	let t = typeof document > "u";
	return "useSyncExternalStore" in e && ((e) => e.useSyncExternalStore)(e)(() => () => {}, () => !1, () => !t);
}
function cd() {
	let t = sd(), [n, r] = e.useState(Ki.isHandoffComplete);
	return n && Ki.isHandoffComplete === !1 && r(!1), e.useEffect(() => {
		n !== !0 && r(!0);
	}, [n]), e.useEffect(() => Ki.handoff(), []), !t && n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/portal-force-root.js
var ld = i(!1);
function ud() {
	return u(ld);
}
function dd(e) {
	return t.createElement(ld.Provider, { value: e.force }, e.children);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/portal/portal.js
function fd(e) {
	let t = ud(), n = u(_d), [r, i] = b(() => {
		if (!t && n !== null) return n.current ?? null;
		if (Ki.isServer) return null;
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
var pd = n, md = J(function(e, n) {
	let { ownerDocument: r = null, ...i } = e, a = y(null), o = Y(eo((e) => {
		a.current = e;
	}), n), s = ks(a.current), c = fd(r ?? s), l = u(yd), d = $i(), f = cd(), p = q();
	return od(() => {
		var e;
		c && c.childNodes.length <= 0 && ((e = c.parentElement) == null || e.removeChild(c));
	}), !c || !f ? null : E(t.createElement("div", {
		"data-headlessui-portal": "",
		ref: (e) => {
			d.dispose(), l && e && d.add(l.register(e));
		}
	}, p({
		ourProps: { ref: o },
		theirProps: i,
		slot: {},
		defaultTag: pd,
		name: "Portal"
	})), c);
});
function hd(e, n) {
	let r = Y(n), { enabled: i = !0, ownerDocument: a, ...o } = e, s = q();
	return i ? t.createElement(md, {
		...o,
		ownerDocument: a,
		ref: r
	}) : s({
		ourProps: { ref: r },
		theirProps: o,
		slot: {},
		defaultTag: pd,
		name: "Portal"
	});
}
var gd = n, _d = i(null);
function vd(e, n) {
	let { target: r, ...i } = e, a = { ref: Y(n) }, o = q();
	return t.createElement(_d.Provider, { value: r }, o({
		ourProps: a,
		theirProps: i,
		defaultTag: gd,
		name: "Popover.Group"
	}));
}
var yd = i(null);
function bd() {
	let e = u(yd), n = y([]), r = K((t) => (n.current.push(t), e && e.register(t), () => i(t))), i = K((t) => {
		let r = n.current.indexOf(t);
		r !== -1 && n.current.splice(r, 1), e && e.unregister(t);
	}), a = _(() => ({
		register: r,
		unregister: i,
		portals: n
	}), [
		r,
		i,
		n
	]);
	return [n, _(() => function({ children: e }) {
		return t.createElement(yd.Provider, { value: a }, e);
	}, [a])];
}
var xd = J(hd), Sd = J(vd), Cd = Object.assign(xd, { Group: Sd }), wd = {
	Idle: { kind: "Idle" },
	Tracked: (e) => ({
		kind: "Tracked",
		position: e
	}),
	Moved: { kind: "Moved" }
};
function Td(e) {
	let t = e.getBoundingClientRect();
	return `${t.x},${t.y}`;
}
function Ed(e, t, n) {
	let r = Qi();
	if (t.kind === "Tracked") {
		let i = function() {
			a !== Td(e) && (r.dispose(), n());
		}, { position: a } = t, o = new ResizeObserver(i);
		o.observe(e), r.add(() => o.disconnect()), r.addEventListener(window, "scroll", i, { passive: !0 }), r.addEventListener(window, "resize", i);
	}
	return () => r.dispose();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-escape.js
function Dd(e, t = typeof document < "u" ? document.defaultView : null, n) {
	let r = Qo(e, "escape");
	Is(t, "keydown", (e) => {
		r && (e.defaultPrevented || e.key === X.Escape && n(e));
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-touch-device.js
function Od() {
	let [e] = b(() => typeof window < "u" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [t, n] = b(e?.matches ?? !1);
	return G(() => {
		if (!e) return;
		function t(e) {
			n(e.matches);
		}
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-root-containers.js
function kd({ defaultContainers: e = [], portals: t, mainTreeNode: n } = {}) {
	let r = K(() => {
		let r = qi(n), i = [];
		for (let t of e) t !== null && (Va(t) ? i.push(t) : "current" in t && Va(t.current) && i.push(t.current));
		if (t != null && t.current) for (let e of t.current) i.push(e);
		for (let e of r?.querySelectorAll("html > *, body > *") ?? []) e !== document.body && e !== document.head && Va(e) && e.id !== "headlessui-portal-root" && (n && (e.contains(n) || e.contains(n?.getRootNode()?.host)) || i.some((t) => e.contains(t)) || i.push(e));
		return i;
	});
	return {
		resolveContainers: r,
		contains: K((e) => r().some((t) => t.contains(e)))
	};
}
var Ad = i(null);
function jd({ children: e, node: n }) {
	let [r, i] = b(null), a = Md(n ?? r);
	return t.createElement(Ad.Provider, { value: a }, e, a === null && t.createElement(Na, {
		features: ja.Hidden,
		ref: (e) => {
			if (e) {
				for (let t of qi(e)?.querySelectorAll("html > *, body > *") ?? []) if (t !== document.body && t !== document.head && Va(t) && t != null && t.contains(e)) {
					i(t);
					break;
				}
			}
		}
	}));
}
function Md(e = null) {
	return u(Ad) ?? e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-mounted.js
function Nd() {
	let e = y(!1);
	return G(() => (e.current = !0, () => {
		e.current = !1;
	}), []), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tab-direction.js
var Pd = ((e) => (e[e.Forwards = 0] = "Forwards", e[e.Backwards = 1] = "Backwards", e))(Pd || {});
function Fd() {
	let e = y(0);
	return Es(!0, "keydown", (t) => {
		t.key === "Tab" && (e.current = +!!t.shiftKey);
	}, !0), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/focus-trap/focus-trap.js
function Id(e) {
	if (!e) return /* @__PURE__ */ new Set();
	if (typeof e == "function") return new Set(e());
	let t = /* @__PURE__ */ new Set();
	for (let n of e.current) Va(n.current) && t.add(n.current);
	return t;
}
var Ld = "div", Rd = ((e) => (e[e.None = 0] = "None", e[e.InitialFocus = 1] = "InitialFocus", e[e.TabLock = 2] = "TabLock", e[e.FocusLock = 4] = "FocusLock", e[e.RestoreFocus = 8] = "RestoreFocus", e[e.AutoFocus = 16] = "AutoFocus", e))(Rd || {});
function zd(e, n) {
	let r = y(null), i = Y(r, n), { initialFocus: a, initialFocusFallback: o, containers: s, features: c = 15, ...l } = e;
	cd() || (c = 0);
	let u = ks(r.current);
	Ud(c, { ownerDocument: u });
	let d = Wd(c, {
		ownerDocument: u,
		container: r,
		initialFocus: a,
		initialFocusFallback: o
	});
	Gd(c, {
		ownerDocument: u,
		container: r,
		containers: s,
		previousActiveElement: d
	});
	let f = Fd(), p = K((e) => {
		if (!Ha(r.current)) return;
		let t = r.current;
		((e) => e())(() => {
			ca(f.current, {
				[Pd.Forwards]: () => {
					xs(t, ss.First, { skipElements: [e.relatedTarget, o] });
				},
				[Pd.Backwards]: () => {
					xs(t, ss.Last, { skipElements: [e.relatedTarget, o] });
				}
			});
		});
	}), m = Qo(!!(c & 2), "focus-trap#tab-lock"), h = $i(), g = y(!1), _ = {
		ref: i,
		onKeyDown(e) {
			e.key == "Tab" && (g.current = !0, h.requestAnimationFrame(() => {
				g.current = !1;
			}));
		},
		onBlur(e) {
			if (!(c & 4)) return;
			let t = Id(s);
			Ha(r.current) && t.add(r.current);
			let n = e.relatedTarget;
			Ua(n) && n.dataset.headlessuiFocusGuard !== "true" && (Kd(t, n) || (g.current ? xs(r.current, ca(f.current, {
				[Pd.Forwards]: () => ss.Next,
				[Pd.Backwards]: () => ss.Previous
			}) | ss.WrapAround, { relativeTo: e.target }) : Ua(e.target) && gs(e.target)));
		}
	}, v = q();
	return t.createElement(t.Fragment, null, m && t.createElement(Na, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: ja.Focusable
	}), v({
		ourProps: _,
		theirProps: l,
		defaultTag: Ld,
		name: "FocusTrap"
	}), m && t.createElement(Na, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: ja.Focusable
	}));
}
var Bd = J(zd), Vd = Object.assign(Bd, { features: Rd });
function Hd(e = !0) {
	let t = y(rd.slice());
	return ic(([e], [n]) => {
		n === !0 && e === !1 && Zi(() => {
			t.current.splice(0);
		}), n === !1 && e === !0 && (t.current = rd.slice());
	}, [
		e,
		rd,
		t
	]), K(() => t.current.find((e) => e != null && e.isConnected) ?? null);
}
function Ud(e, { ownerDocument: t }) {
	let n = !!(e & 8), r = Hd(n);
	ic(() => {
		n || Xi(t?.body) && gs(r());
	}, [n]), od(() => {
		n && gs(r());
	});
}
function Wd(e, { ownerDocument: t, container: n, initialFocus: r, initialFocusFallback: i }) {
	let a = y(null), o = Qo(!!(e & 1), "focus-trap#initial-focus"), s = Nd();
	return ic(() => {
		if (e === 0) return;
		if (!o) {
			i != null && i.current && gs(i.current);
			return;
		}
		let c = n.current;
		c && Zi(() => {
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
			if (r != null && r.current) gs(r.current);
			else {
				if (e & 16) {
					if (xs(c, ss.First | ss.AutoFocus) !== cs.Error) return;
				} else if (xs(c, ss.First) !== cs.Error) return;
				if (i != null && i.current && (gs(i.current), t?.activeElement === i.current)) return;
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
function Gd(e, { ownerDocument: t, container: n, containers: r, previousActiveElement: i }) {
	let a = Nd(), o = !!(e & 4);
	Is(t?.defaultView, "focus", (e) => {
		if (!o || !a.current) return;
		let t = Id(r);
		Ha(n.current) && t.add(n.current);
		let s = i.current;
		if (!s) return;
		let c = e.target;
		Ha(c) ? Kd(t, c) ? (i.current = c, gs(c)) : (e.preventDefault(), e.stopPropagation(), gs(s)) : gs(i.current);
	}, !0);
}
function Kd(e, t) {
	for (let n of e) if (n.contains(t)) return !0;
	return !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/transition/transition.js
function qd(e) {
	return !!(e.enter || e.enterFrom || e.enterTo || e.leave || e.leaveFrom || e.leaveTo) || !xa(e.as ?? tf) || t.Children.count(e.children) === 1;
}
var Jd = i(null);
Jd.displayName = "TransitionContext";
var Yd = ((e) => (e.Visible = "visible", e.Hidden = "hidden", e))(Yd || {});
function Xd() {
	let e = u(Jd);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
function Zd() {
	let e = u(Qd);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
var Qd = i(null);
Qd.displayName = "NestingContext";
function $d(e) {
	return "children" in e ? $d(e.children) : e.current.filter(({ el: e }) => e.current !== null).filter(({ state: e }) => e === "visible").length > 0;
}
function ef(e, t) {
	let n = ea(e), r = y([]), i = Nd(), a = $i(), o = K((e, t = ua.Hidden) => {
		let o = r.current.findIndex(({ el: t }) => t === e);
		o !== -1 && (ca(t, {
			[ua.Unmount]() {
				r.current.splice(o, 1);
			},
			[ua.Hidden]() {
				r.current[o].state = "hidden";
			}
		}), a.microTask(() => {
			var e;
			!$d(r) && i.current && ((e = n.current) == null || e.call(n));
		}));
	}), s = K((e) => {
		let t = r.current.find(({ el: t }) => t === e);
		return t ? t.state !== "visible" && (t.state = "visible") : r.current.push({
			el: e,
			state: "visible"
		}), () => o(e, ua.Unmount);
	}), c = y([]), l = y(Promise.resolve()), u = y({
		enter: [],
		leave: []
	}), d = K((e, n, r) => {
		c.current.splice(0), t && (t.chains.current[n] = t.chains.current[n].filter(([t]) => t !== e)), t?.chains.current[n].push([e, new Promise((e) => {
			c.current.push(e);
		})]), t?.chains.current[n].push([e, new Promise((e) => {
			Promise.all(u.current[n].map(([e, t]) => t)).then(() => e());
		})]), n === "enter" ? l.current = l.current.then(() => t?.wait.current).then(() => r(n)) : r(n);
	}), f = K((e, t, n) => {
		Promise.all(u.current[t].splice(0).map(([e, t]) => t)).then(() => {
			var e;
			(e = c.current.shift()) == null || e();
		}).then(() => n(t));
	});
	return _(() => ({
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
var tf = n, nf = la.RenderStrategy;
function rf(e, n) {
	var r;
	let { transition: i = !0, beforeEnter: a, afterEnter: o, beforeLeave: s, afterLeave: c, enter: l, enterFrom: u, enterTo: d, entered: p, leave: m, leaveFrom: h, leaveTo: g, ..._ } = e, [v, x] = b(null), S = y(null), C = qd(e), w = Y(...C ? [
		S,
		n,
		x
	] : n === null ? [] : [n]), T = (r = _.unmount) == null || r ? ua.Unmount : ua.Hidden, { show: E, appear: D, initial: O } = Xd(), [k, A] = b(E ? "visible" : "hidden"), j = Zd(), { register: M, unregister: N } = j;
	G(() => M(S), [M, S]), G(() => {
		if (T === ua.Hidden && S.current) {
			if (E && k !== "visible") {
				A("visible");
				return;
			}
			return ca(k, {
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
	let P = cd();
	G(() => {
		if (C && P && k === "visible" && S.current === null) throw Error("Did you forget to passthrough the `ref` to the actual DOM node?");
	}, [
		S,
		k,
		P,
		C
	]);
	let F = O && !D, I = D && E && O, L = y(!1), R = ef(() => {
		L.current || (A("hidden"), N(S));
	}, j), ee = K((e) => {
		L.current = !0;
		let t = e ? "enter" : "leave";
		R.onStart(S, t, (e) => {
			e === "enter" ? a?.() : e === "leave" && s?.();
		});
	}), z = K((e) => {
		let t = e ? "enter" : "leave";
		L.current = !1, R.onStop(S, t, (e) => {
			e === "enter" ? o?.() : e === "leave" && c?.();
		}), t === "leave" && !$d(R) && (A("hidden"), N(S));
	});
	f(() => {
		C && i || (ee(E), z(E));
	}, [
		E,
		C,
		i
	]);
	let [, B] = Qs(!(!i || !C || !P || F), v, E, {
		start: ee,
		end: z
	}), te = _a({
		ref: w,
		className: sa(_.className, I && l, I && u, B.enter && l, B.enter && B.closed && u, B.enter && !B.closed && d, B.leave && m, B.leave && !B.closed && h, B.leave && B.closed && g, !B.transition && E && p)?.trim() || void 0,
		...Zs(B)
	}), V = 0;
	k === "visible" && (V |= Q.Open), k === "hidden" && (V |= Q.Closed), E && k === "hidden" && (V |= Q.Opening), !E && k === "visible" && (V |= Q.Closing);
	let H = q();
	return t.createElement(Qd.Provider, { value: R }, t.createElement(ed, { value: V }, H({
		ourProps: te,
		theirProps: _,
		defaultTag: tf,
		features: nf,
		visible: k === "visible",
		name: "Transition.Child"
	})));
}
function af(e, r) {
	let { show: i, appear: a = !1, unmount: o = !0, ...s } = e, c = y(null), l = Y(...qd(e) ? [c, r] : r === null ? [] : [r]);
	cd();
	let u = $u();
	if (i === void 0 && u !== null && (i = (u & Q.Open) === Q.Open), i === void 0) throw Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
	let [d, f] = b(i ? "visible" : "hidden"), p = ef(() => {
		i || f("hidden");
	}), [m, h] = b(!0), g = y([i]);
	G(() => {
		m !== !1 && g.current[g.current.length - 1] !== i && (g.current.push(i), h(!1));
	}, [g, i]);
	let v = _(() => ({
		show: i,
		appear: a,
		initial: m
	}), [
		i,
		a,
		m
	]);
	G(() => {
		i ? f("visible") : !$d(p) && c.current !== null && f("hidden");
	}, [i, p]);
	let x = { unmount: o }, S = K(() => {
		var t;
		m && h(!1), (t = e.beforeEnter) == null || t.call(e);
	}), C = K(() => {
		var t;
		m && h(!1), (t = e.beforeLeave) == null || t.call(e);
	}), w = q();
	return t.createElement(Qd.Provider, { value: p }, t.createElement(Jd.Provider, { value: v }, w({
		ourProps: {
			...x,
			as: n,
			children: t.createElement(cf, {
				ref: l,
				...x,
				...s,
				beforeEnter: S,
				beforeLeave: C
			})
		},
		theirProps: {},
		defaultTag: n,
		features: nf,
		visible: d === "visible",
		name: "Transition"
	})));
}
function of(e, n) {
	let r = u(Jd) !== null, i = $u() !== null;
	return t.createElement(t.Fragment, null, !r && i ? t.createElement(sf, {
		ref: n,
		...e
	}) : t.createElement(cf, {
		ref: n,
		...e
	}));
}
var sf = J(af), cf = J(rf), lf = J(of), uf = Object.assign(sf, {
	Child: lf,
	Root: sf
}), df = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(df || {}), ff = ((e) => (e[e.SetTitleId = 0] = "SetTitleId", e))(ff || {}), pf = { 0(e, t) {
	return e.titleId === t.id ? e : {
		...e,
		titleId: t.id
	};
} }, mf = i(null);
mf.displayName = "DialogContext";
function hf(e) {
	let t = u(mf);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Dialog /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, hf), t;
	}
	return t;
}
function gf(e, t) {
	return ca(t.type, pf, e, t);
}
var _f = J(function(e, n) {
	let r = m(), { id: i = `headlessui-dialog-${r}`, open: a, onClose: s, initialFocus: c, role: u = "dialog", autoFocus: d = !0, __demoMode: f = !1, unmount: p = !1, ...h } = e, g = y(!1);
	u = function() {
		return u === "dialog" || u === "alertdialog" ? u : (g.current || (g.current = !0, console.warn(`Invalid role [${u}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
	}();
	let b = $u();
	a === void 0 && b !== null && (a = (b & Q.Open) === Q.Open);
	let x = y(null), S = Y(x, n), C = ks(x.current), w = +!a, [T, E] = v(gf, {
		titleId: null,
		descriptionId: null,
		panelRef: o()
	}), D = K(() => s(!1)), O = K((e) => E({
		type: 0,
		id: e
	})), k = cd() ? w === 0 : !1, [A, j] = bd(), M = { get current() {
		return T.panelRef.current ?? x.current;
	} }, N = Md(), { resolveContainers: P } = kd({
		mainTreeNode: N,
		portals: A,
		defaultContainers: [M]
	}), F = b !== null && (b & Q.Closing) === Q.Closing;
	rs(f || F ? !1 : k, {
		allowed: K(() => [x.current?.closest("[data-headlessui-portal]") ?? null]),
		disallowed: K(() => [N?.closest("body > *:not(#headlessui-portal-root)") ?? null])
	});
	let I = Jo.get(null);
	G(() => {
		if (k) return I.actions.push(i), () => I.actions.pop(i);
	}, [
		I,
		i,
		k
	]);
	let L = Z(I, l((e) => I.selectors.isTop(e, i), [I, i]));
	Os(L, P, (e) => {
		e.preventDefault(), D();
	}), Dd(L, C?.defaultView, (e) => {
		e.preventDefault(), e.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), D();
	}), Ks(f || F ? !1 : k, C, P), is(k, x, D);
	let [R, ee] = io(), z = _(() => [{
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
	]), B = ia({ open: w === 0 }), te = {
		ref: S,
		id: i,
		role: u,
		tabIndex: -1,
		"aria-modal": f ? void 0 : w === 0 || void 0,
		"aria-labelledby": T.titleId,
		"aria-describedby": R,
		unmount: p
	}, V = !Od(), H = Rd.None;
	k && !f && (H |= Rd.RestoreFocus, H |= Rd.TabLock, d && (H |= Rd.AutoFocus), V && (H |= Rd.InitialFocus));
	let ne = q();
	return t.createElement(td, null, t.createElement(dd, { force: !0 }, t.createElement(Cd, null, t.createElement(mf.Provider, { value: z }, t.createElement(Sd, { target: x }, t.createElement(dd, { force: !1 }, t.createElement(ee, { slot: B }, t.createElement(j, null, t.createElement(Vd, {
		initialFocus: c,
		initialFocusFallback: x,
		containers: P,
		features: H
	}, t.createElement(yo, { value: D }, ne({
		ourProps: te,
		theirProps: h,
		slot: B,
		defaultTag: vf,
		features: yf,
		visible: w === 0,
		name: "Dialog"
	})))))))))));
}), vf = "div", yf = la.RenderStrategy | la.Static;
function bf(e, n) {
	let { transition: r = !1, open: i, ...a } = e, o = $u(), s = e.hasOwnProperty("open") || o !== null, c = e.hasOwnProperty("onClose");
	if (!s && !c) throw Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
	if (!s) throw Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
	if (!c) throw Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
	if (!o && typeof e.open != "boolean") throw Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e.open}`);
	if (typeof e.onClose != "function") throw Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e.onClose}`);
	return (i !== void 0 || r) && !a.static ? t.createElement(jd, null, t.createElement(uf, {
		show: i,
		transition: r,
		unmount: a.unmount
	}, t.createElement(_f, {
		ref: n,
		...a
	}))) : t.createElement(jd, null, t.createElement(_f, {
		ref: n,
		open: i,
		...a
	}));
}
var xf = "div";
function Sf(e, r) {
	let i = m(), { id: a = `headlessui-dialog-panel-${i}`, transition: o = !1, ...s } = e, [{ dialogState: c, unmount: l }, u] = hf("Dialog.Panel"), d = Y(r, u.panelRef), f = ia({ open: c === 0 }), p = {
		ref: d,
		id: a,
		onClick: K((e) => {
			e.stopPropagation();
		})
	}, h = o ? lf : n, g = o ? { unmount: l } : {}, _ = q();
	return t.createElement(h, { ...g }, _({
		ourProps: p,
		theirProps: s,
		slot: f,
		defaultTag: xf,
		name: "Dialog.Panel"
	}));
}
var Cf = "div";
function wf(e, r) {
	let { transition: i = !1, ...a } = e, [{ dialogState: o, unmount: s }] = hf("Dialog.Backdrop"), c = ia({ open: o === 0 }), l = {
		ref: r,
		"aria-hidden": !0
	}, u = i ? lf : n, d = i ? { unmount: s } : {}, f = q();
	return t.createElement(u, { ...d }, f({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: Cf,
		name: "Dialog.Backdrop"
	}));
}
var Tf = "h2";
function Ef(e, t) {
	let n = m(), { id: r = `headlessui-dialog-title-${n}`, ...i } = e, [{ dialogState: a, setTitleId: o }] = hf("Dialog.Title"), s = Y(t);
	f(() => (o(r), () => o(null)), [r, o]);
	let c = ia({ open: a === 0 }), l = {
		ref: s,
		id: r
	};
	return q()({
		ourProps: l,
		theirProps: i,
		slot: c,
		defaultTag: Tf,
		name: "Dialog.Title"
	});
}
var Df = J(bf), Of = J(Sf), kf = J(wf), Af = J(Ef), jf = Object.assign(Df, {
	Panel: Of,
	Title: Af,
	Description: co
}), Mf = t.startTransition ?? function(e) {
	e();
}, Nf = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Nf || {}), Pf = ((e) => (e[e.ToggleDisclosure = 0] = "ToggleDisclosure", e[e.CloseDisclosure = 1] = "CloseDisclosure", e[e.SetButtonId = 2] = "SetButtonId", e[e.SetPanelId = 3] = "SetPanelId", e[e.SetButtonElement = 4] = "SetButtonElement", e[e.SetPanelElement = 5] = "SetPanelElement", e))(Pf || {}), Ff = {
	0: (e) => ({
		...e,
		disclosureState: ca(e.disclosureState, {
			0: 1,
			1: 0
		})
	}),
	1: (e) => e.disclosureState === 1 ? e : {
		...e,
		disclosureState: 1
	},
	2(e, t) {
		return e.buttonId === t.buttonId ? e : {
			...e,
			buttonId: t.buttonId
		};
	},
	3(e, t) {
		return e.panelId === t.panelId ? e : {
			...e,
			panelId: t.panelId
		};
	},
	4(e, t) {
		return e.buttonElement === t.element ? e : {
			...e,
			buttonElement: t.element
		};
	},
	5(e, t) {
		return e.panelElement === t.element ? e : {
			...e,
			panelElement: t.element
		};
	}
}, If = i(null);
If.displayName = "DisclosureContext";
function Lf(e) {
	let t = u(If);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Disclosure /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Lf), t;
	}
	return t;
}
var Rf = i(null);
Rf.displayName = "DisclosureAPIContext";
function zf(e) {
	let t = u(Rf);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Disclosure /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, zf), t;
	}
	return t;
}
var Bf = i(null);
Bf.displayName = "DisclosurePanelContext";
function Vf() {
	return u(Bf);
}
function Hf(e, t) {
	return ca(t.type, Ff, e, t);
}
var Uf = n;
function Wf(e, n) {
	let { defaultOpen: r = !1, ...i } = e, a = y(null), o = Y(n, eo((e) => {
		a.current = e;
	}, e.as === void 0 || xa(e.as))), s = v(Hf, {
		disclosureState: +!r,
		buttonElement: null,
		panelElement: null,
		buttonId: null,
		panelId: null
	}), [{ disclosureState: c, buttonId: l }, u] = s, d = K((e) => {
		u({ type: 1 });
		let t = qi(a.current);
		!t || !l || (e ? Ua(e) ? e : "current" in e && Ua(e.current) ? e.current : t.getElementById(l) : t.getElementById(l))?.focus();
	}), f = _(() => ({ close: d }), [d]), p = ia({
		open: c === 0,
		close: d
	}), m = { ref: o }, h = q();
	return t.createElement(If.Provider, { value: s }, t.createElement(Rf.Provider, { value: f }, t.createElement(yo, { value: d }, t.createElement(ed, { value: ca(c, {
		0: Q.Open,
		1: Q.Closed
	}) }, h({
		ourProps: m,
		theirProps: i,
		slot: p,
		defaultTag: Uf,
		name: "Disclosure"
	})))));
}
var Gf = "button";
function Kf(e, t) {
	let n = m(), { id: r = `headlessui-disclosure-button-${n}`, disabled: i = !1, autoFocus: a = !1, ...o } = e, [s, c] = Lf("Disclosure.Button"), l = Vf(), u = l !== null && l === s.panelId, d = Y(y(null), t, K((e) => {
		if (!u) return c({
			type: 4,
			element: e
		});
	}));
	f(() => {
		if (!u) return c({
			type: 2,
			buttonId: r
		}), () => {
			c({
				type: 2,
				buttonId: null
			});
		};
	}, [
		r,
		c,
		u
	]);
	let p = K((e) => {
		var t;
		if (u) {
			if (s.disclosureState === 1) return;
			switch (e.key) {
				case X.Space:
				case X.Enter:
					e.preventDefault(), e.stopPropagation(), c({ type: 0 }), (t = s.buttonElement) == null || t.focus();
					break;
			}
		} else switch (e.key) {
			case X.Space:
			case X.Enter:
				e.preventDefault(), e.stopPropagation(), c({ type: 0 });
				break;
		}
	}), h = K((e) => {
		switch (e.key) {
			case X.Space:
				e.preventDefault();
				break;
		}
	}), g = K((e) => {
		var t;
		Za(e.currentTarget) || i || (u ? (c({ type: 0 }), (t = s.buttonElement) == null || t.focus()) : c({ type: 0 }));
	}), { isFocusVisible: _, focusProps: v } = Ii({ autoFocus: a }), { isHovered: b, hoverProps: x } = Hi({ isDisabled: i }), { pressed: S, pressProps: C } = ra({ disabled: i }), w = ia({
		open: s.disclosureState === 0,
		hover: b,
		active: S,
		disabled: i,
		focus: _,
		autofocus: a
	}), T = Ls(e, s.buttonElement), E = ga(u ? {
		ref: d,
		type: T,
		disabled: i || void 0,
		autoFocus: a,
		onKeyDown: p,
		onClick: g
	} : {
		ref: d,
		id: r,
		type: T,
		"aria-expanded": s.disclosureState === 0,
		"aria-controls": s.panelElement ? s.panelId : void 0,
		disabled: i || void 0,
		autoFocus: a,
		onKeyDown: p,
		onKeyUp: h,
		onClick: g
	}, v, x, C);
	return q()({
		ourProps: E,
		theirProps: o,
		slot: w,
		defaultTag: Gf,
		name: "Disclosure.Button"
	});
}
var qf = "div", Jf = la.RenderStrategy | la.Static;
function Yf(e, n) {
	let r = m(), { id: i = `headlessui-disclosure-panel-${r}`, transition: a = !1, ...o } = e, [s, c] = Lf("Disclosure.Panel"), { close: l } = zf("Disclosure.Panel"), [u, d] = b(null), p = Y(n, K((e) => {
		Mf(() => c({
			type: 5,
			element: e
		}));
	}), d);
	f(() => (c({
		type: 3,
		panelId: i
	}), () => {
		c({
			type: 3,
			panelId: null
		});
	}), [i, c]);
	let h = $u(), [g, _] = Qs(a, u, h === null ? s.disclosureState === 0 : (h & Q.Open) === Q.Open), v = ia({
		open: s.disclosureState === 0,
		close: l
	}), y = {
		ref: p,
		id: i,
		...Zs(_)
	}, x = q();
	return t.createElement(td, null, t.createElement(Bf.Provider, { value: s.panelId }, x({
		ourProps: y,
		theirProps: o,
		slot: v,
		defaultTag: qf,
		features: Jf,
		visible: g,
		name: "Disclosure.Panel"
	})));
}
var Xf = J(Wf), Zf = J(Kf), Qf = J(Yf), $f = Object.assign(Xf, {
	Button: Zf,
	Panel: Qf
}), ep = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function tp(e) {
	let t = e.innerText ?? "", n = e.cloneNode(!0);
	if (!Ha(n)) return t;
	let r = !1;
	for (let e of n.querySelectorAll("[hidden],[aria-hidden],[role=\"img\"]")) e.remove(), r = !0;
	let i = r ? n.innerText ?? "" : t;
	return ep.test(i) && (i = i.replace(ep, "")), i;
}
function np(e) {
	let t = e.getAttribute("aria-label");
	if (typeof t == "string") return t.trim();
	let n = e.getAttribute("aria-labelledby");
	if (n) {
		let e = n.split(" ").map((e) => {
			let t = document.getElementById(e);
			if (t) {
				let e = t.getAttribute("aria-label");
				return typeof e == "string" ? e.trim() : tp(t).trim();
			}
			return null;
		}).filter(Boolean);
		if (e.length > 0) return e.join(", ");
	}
	return tp(e).trim();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-text-value.js
function rp(e) {
	let t = y(""), n = y("");
	return K(() => {
		let r = e.current;
		if (!r) return "";
		let i = r.innerText;
		if (t.current === i) return n.current;
		let a = np(r).trim().toLowerCase();
		return t.current = i, n.current = a, a;
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox-machine.js
var ip = Object.defineProperty, ap = (e, t, n) => t in e ? ip(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, op = (e, t, n) => (ap(e, typeof t == "symbol" ? t : t + "", n), n), sp = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(sp || {}), cp = ((e) => (e[e.Single = 0] = "Single", e[e.Multi = 1] = "Multi", e))(cp || {}), lp = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(lp || {}), up = ((e) => (e[e.OpenListbox = 0] = "OpenListbox", e[e.CloseListbox = 1] = "CloseListbox", e[e.GoToOption = 2] = "GoToOption", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.SelectOption = 5] = "SelectOption", e[e.RegisterOptions = 6] = "RegisterOptions", e[e.UnregisterOptions = 7] = "UnregisterOptions", e[e.SetButtonElement = 8] = "SetButtonElement", e[e.SetOptionsElement = 9] = "SetOptionsElement", e[e.SortOptions = 10] = "SortOptions", e[e.MarkButtonAsMoved = 11] = "MarkButtonAsMoved", e))(up || {});
function dp(e, t = (e) => e) {
	let n = e.activeOptionIndex === null ? null : e.options[e.activeOptionIndex], r = ys(t(e.options.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		options: r,
		activeOptionIndex: i
	};
}
var fp = {
	1(e) {
		if (e.dataRef.current.disabled || e.listboxState === 1) return e;
		let t = e.buttonElement ? wd.Tracked(Td(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeOptionIndex: null,
			pendingFocus: { focus: $.Nothing },
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
			buttonPositionState: wd.Idle
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
		if (t.focus === $.Nothing) return {
			...n,
			activeOptionIndex: null
		};
		if (t.focus === $.Specific) return {
			...n,
			activeOptionIndex: e.options.findIndex((e) => e.id === t.id)
		};
		if (t.focus === $.Previous) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = ad(t, {
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
		} else if (t.focus === $.Next) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = ad(t, {
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
		let r = dp(e), i = ad(t, {
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
		if (e.pendingFocus.focus !== $.Nothing && (r = ad(e.pendingFocus, {
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
			pendingFocus: { focus: $.Nothing },
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
		...dp(e),
		pendingShouldSort: !1
	} : e,
	11(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: wd.Moved
		} : e;
	}
}, pp = class e extends Lo {
	constructor(e) {
		super(e), op(this, "actions", {
			onChange: (e) => {
				let { onChange: t, compare: n, mode: r, value: i } = this.state.dataRef.current;
				return ca(r, {
					0: () => t?.(e),
					1: () => {
						let r = i.slice(), a = r.findIndex((t) => n(t, e));
						return a === -1 ? r.push(e) : r.splice(a, 1), t?.(r);
					}
				});
			},
			registerOption: Vo(() => {
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
			unregisterOption: Vo(() => {
				let e = [];
				return [(t) => e.push(t), () => {
					this.send({
						type: 7,
						options: e.splice(0)
					});
				}];
			}),
			goToOption: Vo(() => {
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
		}), op(this, "selectors", {
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
			let e = this.state.id, t = Jo.get(null);
			this.disposables.add(t.on(Go.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.listboxState === 0 && this.actions.closeListbox();
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(Ed(t.buttonElement, t.buttonPositionState, () => {
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
			pendingFocus: { focus: $.Nothing },
			frozenValue: !1,
			__demoMode: n,
			buttonPositionState: wd.Idle
		});
	}
	reduce(e, t) {
		return ca(t.type, fp, e, t);
	}
}, mp = i(null);
function hp(e) {
	let t = u(mp);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, gp), t;
	}
	return t;
}
function gp({ id: e, __demoMode: t = !1 }) {
	let n = _(() => pp.new({
		id: e,
		__demoMode: t
	}), []);
	return od(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox.js
var _p = i(null);
_p.displayName = "ListboxDataContext";
function vp(e) {
	let t = u(_p);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, vp), t;
	}
	return t;
}
var yp = n;
function bp(e, n) {
	let r = m(), i = oa(), { value: a, defaultValue: o, form: s, name: c, onChange: u, by: d, invalid: f = !1, disabled: p = i || !1, horizontal: h = !1, multiple: g = !1, __demoMode: _ = !1, ...v } = e, b = h ? "horizontal" : "vertical", x = Y(n), S = wa(o), [C = g ? [] : void 0, w] = Ca(a, u, S), T = gp({
		id: r,
		__demoMode: _
	}), E = y({
		static: !1,
		hold: !1
	}), D = y(/* @__PURE__ */ new Map()), O = xo(d), k = l((e) => ca(A.mode, {
		[cp.Multi]: () => C.some((t) => O(t, e)),
		[cp.Single]: () => O(C, e)
	}), [C]), A = ia({
		value: C,
		disabled: p,
		invalid: f,
		mode: g ? cp.Multi : cp.Single,
		orientation: b,
		onChange: w,
		compare: O,
		isSelected: k,
		optionsPropsRef: E,
		listRef: D
	});
	G(() => {
		T.state.dataRef.current = A;
	}, [A]);
	let j = Z(T, (e) => e.listboxState), M = Jo.get(null), N = Z(M, l((e) => M.selectors.isTop(e, r), [M, r])), [P, F] = Z(T, (e) => [e.buttonElement, e.optionsElement]);
	Os(N, [P, F], (e, t) => {
		T.send({ type: up.CloseListbox }), ps(t, fs.Loose) || (e.preventDefault(), P?.focus());
	});
	let I = ia({
		open: j === sp.Open,
		disabled: p,
		invalid: f,
		value: C
	}), [L, R] = po({ inherit: !0 }), ee = { ref: x }, z = l(() => {
		if (S !== void 0) return w?.(S);
	}, [w, S]), B = q();
	return t.createElement(R, {
		value: L,
		props: { htmlFor: P?.id },
		slot: {
			open: j === sp.Open,
			disabled: p
		}
	}, t.createElement(Wu, null, t.createElement(mp.Provider, { value: T }, t.createElement(_p.Provider, { value: A }, t.createElement(ed, { value: ca(j, {
		[sp.Open]: Q.Open,
		[sp.Closed]: Q.Closed
	}) }, c != null && C != null && t.createElement(Ia, {
		disabled: p,
		data: { [c]: C },
		form: s,
		onReset: z
	}), B({
		ourProps: ee,
		theirProps: v,
		slot: I,
		defaultTag: yp,
		name: "Listbox"
	}))))));
}
var xp = "button";
function Sp(e, t) {
	let n = m(), r = za(), i = vp("Listbox.Button"), a = hp("Listbox.Button"), { id: o = r || `headlessui-listbox-button-${n}`, disabled: s = i.disabled || !1, autoFocus: c = !1, ...u } = e, d = Y(t, zu(), a.actions.setButtonElement), f = Bu(), [p, h, g] = Z(a, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement
	]);
	Fs(p === sp.Open, {
		trigger: h,
		action: l((e) => {
			if (h != null && h.contains(e.target)) return Ms.Ignore;
			let t = e.target.closest("[role=\"option\"]:not([data-disabled])");
			return Ha(t) ? Ms.Select(t) : g != null && g.contains(e.target) ? Ms.Ignore : Ms.Close;
		}, [h, g]),
		close: a.actions.closeListbox,
		select: a.actions.selectActiveOption
	});
	let _ = K((e) => {
		switch (e.key) {
			case X.Enter:
				Oa(e.currentTarget);
				break;
			case X.Space:
			case X.ArrowDown:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? $.Nothing : $.First });
				break;
			case X.ArrowUp:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? $.Nothing : $.Last });
				break;
		}
	}), v = K((e) => {
		switch (e.key) {
			case X.Space:
				e.preventDefault();
				break;
		}
	}), y = To((e) => {
		var t;
		a.state.listboxState === sp.Open ? (D(() => a.actions.closeListbox()), (t = a.state.buttonElement) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), a.actions.openListbox({ focus: $.Nothing }));
	}), b = K((e) => e.preventDefault()), x = fo([o]), S = ro(), { isFocusVisible: C, focusProps: w } = Ii({ autoFocus: c }), { isHovered: T, hoverProps: E } = Hi({ isDisabled: s }), { pressed: O, pressProps: k } = ra({ disabled: s }), A = ia({
		open: p === sp.Open,
		active: O || p === sp.Open,
		disabled: s,
		invalid: i.invalid,
		value: i.value,
		hover: T,
		focus: C,
		autofocus: c
	}), j = Z(a, (e) => e.listboxState === sp.Open), M = ga(f(), {
		ref: d,
		id: o,
		type: Ls(e, h),
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
	}, y, w, E, k);
	return q()({
		ourProps: M,
		theirProps: u,
		slot: A,
		defaultTag: xp,
		name: "Listbox.Button"
	});
}
var Cp = i(!1), wp = "div", Tp = la.RenderStrategy | la.Static;
function Ep(e, n) {
	let r = m(), { id: i = `headlessui-listbox-options-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = Ru(a), [p, h] = b(null);
	d && (o = !0);
	let g = vp("Listbox.Options"), v = hp("Listbox.Options"), [y, x, S, C] = Z(v, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement,
		e.__demoMode
	]), w = ks(x), T = ks(S), E = $u(), [O, k] = Qs(c, p, E === null ? y === sp.Open : (E & Q.Open) === Q.Open);
	is(O, x, v.actions.closeListbox), Ks(!C && s && y === sp.Open, T), rs(!C && s && y === sp.Open, { allowed: l(() => [x, S], [x, S]) });
	let A = !Z(v, v.selectors.didButtonMove) && O, j = Zu(Z(v, v.selectors.hasFrozenValue) && !e.static, g.value), M = l((e) => g.compare(j, e), [g.compare, j]), N = Z(v, (e) => {
		var t;
		if (d == null || !((t = d?.to) != null && t.includes("selection"))) return null;
		let n = e.options.findIndex((e) => M(e.dataRef.current.value));
		return n === -1 && (n = 0), n;
	}), [P, F] = Hu((() => {
		if (d == null) return;
		if (N === null) return {
			...d,
			inner: void 0
		};
		let e = Array.from(g.listRef.current.values());
		return {
			...d,
			inner: {
				listRef: { current: e },
				index: N
			}
		};
	})()), I = Vu(), L = Y(n, d ? P : null, v.actions.setOptionsElement, h), R = $i();
	f(() => {
		let e = S;
		e && y === sp.Open && (Xi(e) || e == null || e.focus({ preventScroll: !0 }));
	}, [y, S]);
	let ee = K((e) => {
		var t;
		switch (R.dispose(), e.key) {
			case X.Space: if (v.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), v.actions.search(e.key);
			case X.Enter:
				e.preventDefault(), e.stopPropagation(), v.actions.selectActiveOption();
				break;
			case ca(g.orientation, {
				vertical: X.ArrowDown,
				horizontal: X.ArrowRight
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: $.Next });
			case ca(g.orientation, {
				vertical: X.ArrowUp,
				horizontal: X.ArrowLeft
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: $.Previous });
			case X.Home:
			case X.PageUp: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: $.First });
			case X.End:
			case X.PageDown: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: $.Last });
			case X.Escape:
				e.preventDefault(), e.stopPropagation(), D(() => v.actions.closeListbox()), (t = v.state.buttonElement) == null || t.focus({ preventScroll: !0 });
				return;
			case X.Tab:
				e.preventDefault(), e.stopPropagation(), D(() => v.actions.closeListbox()), bs(v.state.buttonElement, e.shiftKey ? ss.Previous : ss.Next);
				break;
			default:
				e.key.length === 1 && (v.actions.search(e.key), R.setTimeout(() => v.actions.clearSearch(), 350));
				break;
		}
	}), z = Z(v, (e) => e.buttonElement?.id), B = ia({ open: y === sp.Open }), te = ga(d ? I() : {}, {
		id: i,
		ref: L,
		"aria-activedescendant": Z(v, v.selectors.activeDescendantId),
		"aria-multiselectable": g.mode === cp.Multi || void 0,
		"aria-labelledby": z,
		"aria-orientation": g.orientation,
		onKeyDown: ee,
		role: "listbox",
		tabIndex: y === sp.Open ? 0 : void 0,
		style: {
			...u.style,
			...F,
			"--button-width": Co(O, x, !0).width
		},
		...Zs(k)
	}), V = q(), H = _(() => g.mode === cp.Multi ? g : {
		...g,
		isSelected: M
	}, [g, M]);
	return t.createElement(Cd, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, t.createElement(_p.Provider, { value: H }, V({
		ourProps: te,
		theirProps: u,
		slot: B,
		defaultTag: wp,
		features: Tp,
		visible: A,
		name: "Listbox.Options"
	})));
}
var Dp = "div";
function Op(e, t) {
	let n = m(), { id: r = `headlessui-listbox-option-${n}`, disabled: i = !1, value: a, ...o } = e, s = u(Cp) === !0, c = vp("Listbox.Option"), l = hp("Listbox.Option"), d = Z(l, (e) => l.selectors.isActive(e, r)), f = c.isSelected(a), p = y(null), h = rp(p), g = ea({
		disabled: i,
		value: a,
		domRef: p,
		get textValue() {
			return h();
		}
	}), _ = Y(t, p, (e) => {
		e ? c.listRef.current.set(r, e) : c.listRef.current.delete(r);
	}), v = Z(l, (e) => l.selectors.shouldScrollIntoView(e, r));
	G(() => {
		if (v) return Qi().requestAnimationFrame(() => {
			var e, t;
			(t = (e = p.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [v, p]), G(() => {
		if (!s) return l.actions.registerOption(r, g), () => l.actions.unregisterOption(r);
	}, [
		g,
		r,
		s
	]);
	let b = K((e) => {
		if (i) return e.preventDefault();
		l.actions.selectOption(a);
	}), x = K(() => {
		if (i) return l.actions.goToOption({ focus: $.Nothing });
		l.actions.goToOption({
			focus: $.Specific,
			id: r
		});
	}), S = Js(), C = K((e) => S.update(e)), w = K((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === lp.Pointer || l.actions.goToOption({
			focus: $.Specific,
			id: r
		}, lp.Pointer));
	}), T = K((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === lp.Pointer && l.actions.goToOption({ focus: $.Nothing }));
	}), E = ia({
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
	}, O = q();
	return !f && s ? null : O({
		ourProps: D,
		theirProps: o,
		slot: E,
		defaultTag: Dp,
		name: "Listbox.Option"
	});
}
var kp = n;
function Ap(e, n) {
	let { options: r, placeholder: i, ...a } = e, o = { ref: Y(n) }, s = vp("ListboxSelectedOption"), c = ia({}), l = s.value === void 0 || s.value === null || s.mode === cp.Multi && Array.isArray(s.value) && s.value.length === 0, u = q();
	return t.createElement(Cp.Provider, { value: !0 }, u({
		ourProps: o,
		theirProps: {
			...a,
			children: t.createElement(t.Fragment, null, i && l ? i : r)
		},
		slot: c,
		defaultTag: kp,
		name: "ListboxSelectedOption"
	}));
}
var jp = J(bp), Mp = J(Sp), Np = _o, Pp = J(Ep), Fp = J(Op), Ip = J(Ap), Lp = Object.assign(jp, {
	Button: Mp,
	Label: Np,
	Options: Pp,
	Option: Fp,
	SelectedOption: Ip
}), Rp = Object.defineProperty, zp = (e, t, n) => t in e ? Rp(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Bp = (e, t, n) => (zp(e, typeof t == "symbol" ? t : t + "", n), n), Vp = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Vp || {}), Hp = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(Hp || {}), Up = ((e) => (e[e.OpenMenu = 0] = "OpenMenu", e[e.CloseMenu = 1] = "CloseMenu", e[e.GoToItem = 2] = "GoToItem", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.RegisterItems = 5] = "RegisterItems", e[e.UnregisterItems = 6] = "UnregisterItems", e[e.SetButtonElement = 7] = "SetButtonElement", e[e.SetItemsElement = 8] = "SetItemsElement", e[e.SortItems = 9] = "SortItems", e[e.MarkButtonAsMoved = 10] = "MarkButtonAsMoved", e))(Up || {});
function Wp(e, t = (e) => e) {
	let n = e.activeItemIndex === null ? null : e.items[e.activeItemIndex], r = ys(t(e.items.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		items: r,
		activeItemIndex: i
	};
}
var Gp = {
	1(e) {
		if (e.menuState === 1) return e;
		let t = e.buttonElement ? wd.Tracked(Td(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeItemIndex: null,
			pendingFocus: { focus: $.Nothing },
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
			buttonPositionState: wd.Idle
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
		if (t.focus === $.Nothing) return {
			...n,
			activeItemIndex: null
		};
		if (t.focus === $.Specific) return {
			...n,
			activeItemIndex: e.items.findIndex((e) => e.id === t.id)
		};
		if (t.focus === $.Previous) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = ad(t, {
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
		} else if (t.focus === $.Next) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = ad(t, {
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
		let r = Wp(e), i = ad(t, {
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
		return e.pendingFocus.focus !== $.Nothing && (r = ad(e.pendingFocus, {
			resolveItems: () => n,
			resolveActiveIndex: () => e.activeItemIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		})), {
			...e,
			items: n,
			activeItemIndex: r,
			pendingFocus: { focus: $.Nothing },
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
		...Wp(e),
		pendingShouldSort: !1
	} : e,
	10(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: wd.Moved
		} : e;
	}
}, Kp = class e extends Lo {
	constructor(e) {
		super(e), Bp(this, "actions", {
			registerItem: Vo(() => {
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
			unregisterItem: Vo(() => {
				let e = [];
				return [(t) => e.push(t), () => this.send({
					type: 6,
					items: e.splice(0)
				})];
			})
		}), Bp(this, "selectors", {
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
			let e = this.state.id, t = Jo.get(null);
			this.disposables.add(t.on(Go.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.menuState === 0 && this.send({ type: 1 });
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(Ed(t.buttonElement, t.buttonPositionState, () => {
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
			pendingFocus: { focus: $.Nothing },
			buttonPositionState: wd.Idle
		});
	}
	reduce(e, t) {
		return ca(t.type, Gp, e, t);
	}
}, qp = i(null);
function Jp(e) {
	let t = u(qp);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Menu /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Yp), t;
	}
	return t;
}
function Yp({ id: e, __demoMode: t = !1 }) {
	let n = _(() => Kp.new({
		id: e,
		__demoMode: t
	}), []);
	return od(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/menu/menu.js
var Xp = n;
function Zp(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = Yp({
		id: r,
		__demoMode: i
	}), [s, c, u] = Z(o, (e) => [
		e.menuState,
		e.itemsElement,
		e.buttonElement
	]), d = Y(n), f = Jo.get(null);
	Os(Z(f, l((e) => f.selectors.isTop(e, r), [f, r])), [u, c], (e, t) => {
		var n;
		o.send({ type: Up.CloseMenu }), ps(t, fs.Loose) || (e.preventDefault(), (n = o.state.buttonElement) == null || n.focus());
	});
	let p = K(() => {
		o.send({ type: Up.CloseMenu });
	}), h = ia({
		open: s === Vp.Open,
		close: p
	}), g = { ref: d }, _ = q();
	return t.createElement(Wu, null, t.createElement(qp.Provider, { value: o }, t.createElement(ed, { value: ca(s, {
		[Vp.Open]: Q.Open,
		[Vp.Closed]: Q.Closed
	}) }, _({
		ourProps: g,
		theirProps: a,
		slot: h,
		defaultTag: Xp,
		name: "Menu"
	}))));
}
var Qp = "button";
function $p(e, t) {
	let n = Jp("Menu.Button"), r = m(), { id: i = `headlessui-menu-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = y(null), u = Bu(), d = Y(t, c, zu(), K((e) => n.send({
		type: Up.SetButtonElement,
		element: e
	}))), f = K((e) => {
		switch (e.key) {
			case X.Space:
			case X.Enter:
			case X.ArrowDown:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Up.OpenMenu,
					focus: { focus: $.First }
				});
				break;
			case X.ArrowUp:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Up.OpenMenu,
					focus: { focus: $.Last }
				});
				break;
		}
	}), p = K((e) => {
		switch (e.key) {
			case X.Space:
				e.preventDefault();
				break;
		}
	}), [h, g, _] = Z(n, (e) => [
		e.menuState,
		e.buttonElement,
		e.itemsElement
	]);
	Fs(h === Vp.Open, {
		trigger: g,
		action: l((e) => {
			if (g != null && g.contains(e.target)) return Ms.Ignore;
			let t = e.target.closest("[role=\"menuitem\"]:not([data-disabled])");
			return Ha(t) ? Ms.Select(t) : _ != null && _.contains(e.target) ? Ms.Ignore : Ms.Close;
		}, [g, _]),
		close: l(() => n.send({ type: Up.CloseMenu }), []),
		select: l((e) => e.click(), [])
	});
	let v = To((e) => {
		var t;
		a || (h === Vp.Open ? (D(() => n.send({ type: Up.CloseMenu })), (t = c.current) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), n.send({
			type: Up.OpenMenu,
			focus: { focus: $.Nothing },
			trigger: Hp.Pointer
		})));
	}), { isFocusVisible: b, focusProps: x } = Ii({ autoFocus: o }), { isHovered: S, hoverProps: C } = Hi({ isDisabled: a }), { pressed: w, pressProps: T } = ra({ disabled: a }), E = ia({
		open: h === Vp.Open,
		active: w || h === Vp.Open,
		disabled: a,
		hover: S,
		focus: b,
		autofocus: o
	}), O = ga(u(), {
		ref: d,
		id: i,
		type: Ls(e, c.current),
		"aria-haspopup": "menu",
		"aria-controls": _?.id,
		"aria-expanded": h === Vp.Open,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: f,
		onKeyUp: p
	}, v, x, C, T);
	return q()({
		ourProps: O,
		theirProps: s,
		slot: E,
		defaultTag: Qp,
		name: "Menu.Button"
	});
}
var em = "div", tm = la.RenderStrategy | la.Static;
function nm(e, n) {
	let r = m(), { id: i = `headlessui-menu-items-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = Ru(a), p = Jp("Menu.Items"), [h, g] = Hu(d), _ = Vu(), [v, y] = b(null), x = Y(n, d ? h : null, K((e) => p.send({
		type: Up.SetItemsElement,
		element: e
	})), y), [S, C] = Z(p, (e) => [e.menuState, e.buttonElement]), w = ks(C), T = ks(v);
	d && (o = !0);
	let E = $u(), [O, k] = Qs(c, v, E === null ? S === Vp.Open : (E & Q.Open) === Q.Open);
	is(O, C, () => {
		p.send({ type: Up.CloseMenu });
	});
	let A = Z(p, (e) => e.__demoMode);
	Ks(!A && s && S === Vp.Open, T), rs(!A && s && S === Vp.Open, { allowed: l(() => [C, v], [C, v]) });
	let j = !Z(p, p.selectors.didButtonMove) && O;
	f(() => {
		let e = v;
		e && S === Vp.Open && (Xi(e) || e.focus({ preventScroll: !0 }));
	}, [S, v]), rc(S === Vp.Open, {
		container: v,
		accept(e) {
			return e.getAttribute("role") === "menuitem" ? NodeFilter.FILTER_REJECT : e.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
		},
		walk(e) {
			e.setAttribute("role", "none");
		}
	});
	let M = $i(), N = K((e) => {
		var t, n;
		switch (M.dispose(), e.key) {
			case X.Space: if (p.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), p.send({
				type: Up.Search,
				value: e.key
			});
			case X.Enter:
				if (e.preventDefault(), e.stopPropagation(), p.state.activeItemIndex !== null) {
					let { dataRef: e } = p.state.items[p.state.activeItemIndex];
					(t = e.current?.domRef.current) == null || t.click();
				}
				p.send({ type: Up.CloseMenu }), ms(p.state.buttonElement);
				break;
			case X.ArrowDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Up.GoToItem,
				focus: $.Next
			});
			case X.ArrowUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Up.GoToItem,
				focus: $.Previous
			});
			case X.Home:
			case X.PageUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Up.GoToItem,
				focus: $.First
			});
			case X.End:
			case X.PageDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Up.GoToItem,
				focus: $.Last
			});
			case X.Escape:
				e.preventDefault(), e.stopPropagation(), D(() => p.send({ type: Up.CloseMenu })), (n = p.state.buttonElement) == null || n.focus({ preventScroll: !0 });
				break;
			case X.Tab:
				e.preventDefault(), e.stopPropagation(), D(() => p.send({ type: Up.CloseMenu })), bs(p.state.buttonElement, e.shiftKey ? ss.Previous : ss.Next);
				break;
			default:
				e.key.length === 1 && (p.send({
					type: Up.Search,
					value: e.key
				}), M.setTimeout(() => p.send({ type: Up.ClearSearch }), 350));
				break;
		}
	}), P = K((e) => {
		switch (e.key) {
			case X.Space:
				e.preventDefault();
				break;
		}
	}), F = ia({ open: S === Vp.Open }), I = ga(d ? _() : {}, {
		"aria-activedescendant": Z(p, p.selectors.activeDescendantId),
		"aria-labelledby": Z(p, (e) => e.buttonElement?.id),
		id: i,
		onKeyDown: N,
		onKeyUp: P,
		role: "menu",
		tabIndex: S === Vp.Open ? 0 : void 0,
		ref: x,
		style: {
			...u.style,
			...g,
			"--button-width": Co(O, C, !0).width
		},
		...Zs(k)
	}), L = q();
	return t.createElement(Cd, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, L({
		ourProps: I,
		theirProps: u,
		slot: F,
		defaultTag: em,
		features: tm,
		visible: j,
		name: "Menu.Items"
	}));
}
var rm = n;
function im(e, n) {
	let r = m(), { id: i = `headlessui-menu-item-${r}`, disabled: a = !1, ...o } = e, s = Jp("Menu.Item"), c = Z(s, (e) => s.selectors.isActive(e, i)), l = y(null), u = Y(n, l), d = Z(s, (e) => s.selectors.shouldScrollIntoView(e, i));
	G(() => {
		if (d) return Qi().requestAnimationFrame(() => {
			var e, t;
			(t = (e = l.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [d, l]);
	let f = rp(l), p = y({
		disabled: a,
		domRef: l,
		get textValue() {
			return f();
		}
	});
	G(() => {
		p.current.disabled = a;
	}, [p, a]), G(() => (s.actions.registerItem(i, p), () => s.actions.unregisterItem(i)), [p, i]);
	let h = K(() => {
		s.send({ type: Up.CloseMenu });
	}), g = K((e) => {
		if (a) return e.preventDefault();
		s.send({ type: Up.CloseMenu }), ms(s.state.buttonElement);
	}), _ = K(() => {
		if (a) return s.send({
			type: Up.GoToItem,
			focus: $.Nothing
		});
		s.send({
			type: Up.GoToItem,
			focus: $.Specific,
			id: i
		});
	}), v = Js(), b = K((e) => v.update(e)), x = K((e) => {
		v.wasMoved(e) && (a || c || s.send({
			type: Up.GoToItem,
			focus: $.Specific,
			id: i,
			trigger: Hp.Pointer
		}));
	}), S = K((e) => {
		v.wasMoved(e) && (a || c && s.state.activationTrigger === Hp.Pointer && s.send({
			type: Up.GoToItem,
			focus: $.Nothing
		}));
	}), [C, w] = po(), [T, E] = io(), D = ia({
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
	}, k = q();
	return t.createElement(w, null, t.createElement(E, null, k({
		ourProps: O,
		theirProps: o,
		slot: D,
		defaultTag: rm,
		name: "Menu.Item"
	})));
}
var am = "div";
function om(e, n) {
	let [r, i] = po(), a = e, o = {
		ref: n,
		"aria-labelledby": r,
		role: "group"
	}, s = q();
	return t.createElement(i, null, s({
		ourProps: o,
		theirProps: a,
		slot: {},
		defaultTag: am,
		name: "Menu.Section"
	}));
}
var sm = "header";
function cm(e, t) {
	let n = m(), { id: r = `headlessui-menu-heading-${n}`, ...i } = e, a = uo();
	G(() => a.register(r), [r, a.register]);
	let o = {
		id: r,
		ref: t,
		role: "presentation",
		...a.props
	};
	return q()({
		ourProps: o,
		theirProps: i,
		slot: {},
		defaultTag: sm,
		name: "Menu.Heading"
	});
}
var lm = "div";
function um(e, t) {
	let n = e, r = {
		ref: t,
		role: "separator"
	};
	return q()({
		ourProps: r,
		theirProps: n,
		slot: {},
		defaultTag: lm,
		name: "Menu.Separator"
	});
}
var dm = J(Zp), fm = J($p), pm = J(nm), mm = J(im), hm = J(om), gm = J(cm), _m = J(um), vm = Object.assign(dm, {
	Button: fm,
	Items: pm,
	Item: mm,
	Section: hm,
	Heading: gm,
	Separator: _m
}), ym = Object.defineProperty, bm = (e, t, n) => t in e ? ym(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, xm = (e, t, n) => (bm(e, typeof t == "symbol" ? t : t + "", n), n), Sm = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Sm || {}), Cm = ((e) => (e[e.OpenPopover = 0] = "OpenPopover", e[e.ClosePopover = 1] = "ClosePopover", e[e.SetButton = 2] = "SetButton", e[e.SetButtonId = 3] = "SetButtonId", e[e.SetPanel = 4] = "SetPanel", e[e.SetPanelId = 5] = "SetPanelId", e))(Cm || {}), wm = {
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
}, Tm = class e extends Lo {
	constructor(e) {
		super(e), xm(this, "actions", {
			close: () => this.send({ type: 1 }),
			refocusableClose: (e) => {
				this.actions.close(), (e ? Ha(e) ? e : "current" in e && Ha(e.current) ? e.current : this.state.button : this.state.button)?.focus();
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
		}), xm(this, "selectors", { isPortalled: (e) => {
			if (!e.button || !e.panel) return !1;
			let t = qi(e.button) ?? document;
			for (let n of t.querySelectorAll("body > *")) if (Number(n?.contains(e.button)) ^ Number(n?.contains(e.panel))) return !0;
			let n = us(t), r = n.indexOf(e.button), i = (r + n.length - 1) % n.length, a = (r + 1) % n.length, o = n[i], s = n[a];
			return !e.panel.contains(o) && !e.panel.contains(s);
		} });
		{
			let e = this.state.id, t = Jo.get(null);
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
		return ca(t.type, wm, e, t);
	}
}, Em = i(null);
function Dm(e) {
	let t = u(Em);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Popover /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Dm), t;
	}
	return t;
}
function Om({ id: e, __demoMode: t = !1 }) {
	let n = _(() => Tm.new({
		id: e,
		__demoMode: t
	}), []);
	return od(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/popover/popover.js
var km = i(null);
km.displayName = "PopoverGroupContext";
function Am() {
	return u(km);
}
var jm = i(null);
jm.displayName = "PopoverPanelContext";
function Mm() {
	return u(jm);
}
var Nm = "div";
function Pm(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = Om({
		id: r,
		__demoMode: i
	}), s = y(null), c = Y(n, eo((e) => {
		s.current = e;
	})), [u, d, p, h, g] = Z(o, l((e) => [
		e.popoverState,
		e.button,
		e.panel,
		e.buttonId,
		e.panelId
	], [])), v = As(s.current ?? d), b = ea(h), x = ea(g), S = _(() => ({
		buttonId: b,
		panelId: x,
		close: o.actions.close
	}), [
		b,
		x,
		o
	]), C = Am(), w = C?.registerPopover, T = K(() => {
		let e = Yi(s.current ?? d);
		return C?.isFocusWithinPopoverGroup() ?? (e && (d?.contains(e) || p?.contains(e)));
	});
	f(() => w?.(S), [w, S]);
	let [E, D] = bd(), O = Md(d), k = kd({
		mainTreeNode: O,
		portals: E,
		defaultContainers: [{ get current() {
			return o.state.button;
		} }, { get current() {
			return o.state.panel;
		} }]
	});
	Is(v, "focus", (e) => {
		var t, n, r, i, a, s;
		e.target !== window && Ua(e.target) && o.state.popoverState === Sm.Open && (T() || o.state.button && o.state.panel && (k.contains(e.target) || (n = (t = o.state.beforePanelSentinel.current)?.contains) != null && n.call(t, e.target) || (i = (r = o.state.afterPanelSentinel.current)?.contains) != null && i.call(r, e.target) || (s = (a = o.state.afterButtonSentinel.current)?.contains) != null && s.call(a, e.target) || o.actions.close()));
	}, !0), Os(u === Sm.Open, k.resolveContainers, (e, t) => {
		o.actions.close(), ps(t, fs.Loose) || (e.preventDefault(), d?.focus());
	});
	let A = ia({
		open: u === Sm.Open,
		close: o.actions.refocusableClose
	}), j = Z(o, l((e) => ca(e.popoverState, {
		[Sm.Open]: Q.Open,
		[Sm.Closed]: Q.Closed
	}), [])), M = { ref: c }, N = q();
	return t.createElement(jd, { node: O }, t.createElement(Wu, null, t.createElement(jm.Provider, { value: null }, t.createElement(Em.Provider, { value: o }, t.createElement(yo, { value: o.actions.refocusableClose }, t.createElement(ed, { value: j }, t.createElement(D, null, N({
		ourProps: M,
		theirProps: a,
		slot: A,
		defaultTag: Nm,
		name: "Popover"
	}))))))));
}
var Fm = "button";
function Im(e, n) {
	let r = m(), { id: i = `headlessui-popover-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = Dm("Popover.Button"), [u, d, p, h, g, _, v] = Z(c, l((e) => [
		e.popoverState,
		c.selectors.isPortalled(e),
		e.button,
		e.buttonId,
		e.panel,
		e.panelId,
		e.afterButtonSentinel
	], [])), x = y(null), S = `headlessui-focus-sentinel-${m()}`, C = Am()?.closeOthers, w = Mm() !== null;
	f(() => {
		if (!w) return c.actions.setButtonId(i), () => c.actions.setButtonId(null);
	}, [
		w,
		i,
		c
	]);
	let [T] = b(() => Symbol()), E = Y(x, n, zu(), K((e) => {
		if (!w) {
			if (e) c.state.buttons.current.push(T);
			else {
				let e = c.state.buttons.current.indexOf(T);
				e !== -1 && c.state.buttons.current.splice(e, 1);
			}
			c.state.buttons.current.length > 1 && console.warn("You are already using a <Popover.Button /> but only 1 <Popover.Button /> is supported."), e && c.actions.setButton(e);
		}
	})), D = Y(x, n), O = K((e) => {
		var t, n, r;
		if (w) {
			if (c.state.popoverState === Sm.Closed) return;
			switch (e.key) {
				case X.Space:
				case X.Enter:
					e.preventDefault(), (n = (t = e.target).click) == null || n.call(t), c.actions.close(), (r = c.state.button) == null || r.focus();
					break;
			}
		} else switch (e.key) {
			case X.Space:
			case X.Enter:
				e.preventDefault(), e.stopPropagation(), c.state.popoverState === Sm.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close();
				break;
			case X.Escape:
				if (c.state.popoverState !== Sm.Open) return C?.(c.state.buttonId);
				if (!x.current) return;
				let t = Yi(x.current);
				if (t && !x.current.contains(t)) return;
				e.preventDefault(), e.stopPropagation(), c.actions.close();
				break;
		}
	}), k = K((e) => {
		w || e.key === X.Space && e.preventDefault();
	}), A = K((e) => {
		var t, n;
		Za(e.currentTarget) || a || (w ? (c.actions.close(), (t = c.state.button) == null || t.focus()) : (e.preventDefault(), e.stopPropagation(), c.state.popoverState === Sm.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close(), (n = c.state.button) == null || n.focus()));
	}), j = K((e) => {
		e.preventDefault(), e.stopPropagation();
	}), { isFocusVisible: M, focusProps: N } = Ii({ autoFocus: o }), { isHovered: P, hoverProps: F } = Hi({ isDisabled: a }), { pressed: I, pressProps: L } = ra({ disabled: a }), R = u === Sm.Open, ee = ia({
		open: R,
		active: I || R,
		disabled: a,
		hover: P,
		focus: M,
		autofocus: o
	}), z = Ls(e, p), B = ga(w ? {
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
		"aria-expanded": u === Sm.Open,
		"aria-controls": g ? _ : void 0,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: O,
		onKeyUp: k,
		onClick: A,
		onMouseDown: j
	}, N, F, L), te = Fd(), V = K(() => {
		if (!Ha(c.state.panel)) return;
		let e = c.state.panel;
		function t() {
			ca(te.current, {
				[Pd.Forwards]: () => xs(e, ss.First),
				[Pd.Backwards]: () => xs(e, ss.Last)
			}) === cs.Error && xs(us(Ji(c.state.button)).filter((e) => e.dataset.headlessuiFocusGuard !== "true"), ca(te.current, {
				[Pd.Forwards]: ss.Next,
				[Pd.Backwards]: ss.Previous
			}), { relativeTo: c.state.button });
		}
		t();
	}), H = q();
	return t.createElement(t.Fragment, null, H({
		ourProps: B,
		theirProps: s,
		slot: ee,
		defaultTag: Fm,
		name: "Popover.Button"
	}), R && !w && d && t.createElement(Na, {
		id: S,
		ref: v,
		features: ja.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: V
	}));
}
var Lm = "div", Rm = la.RenderStrategy | la.Static;
function zm(e, t) {
	let n = m(), { id: r = `headlessui-popover-backdrop-${n}`, transition: i = !1, ...a } = e, o = Dm("Popover.Backdrop"), s = Z(o, l((e) => e.popoverState, [])), [c, u] = b(null), d = Y(t, u), f = $u(), [p, h] = Qs(i, c, f === null ? s === Sm.Open : (f & Q.Open) === Q.Open), g = K((e) => {
		if (Za(e.currentTarget)) return e.preventDefault();
		o.actions.close();
	}), _ = ia({ open: s === Sm.Open }), v = {
		ref: d,
		id: r,
		"aria-hidden": !0,
		onClick: g,
		...Zs(h)
	};
	return q()({
		ourProps: v,
		theirProps: a,
		slot: _,
		defaultTag: Lm,
		features: Rm,
		visible: p,
		name: "Popover.Backdrop"
	});
}
var Bm = "div", Vm = la.RenderStrategy | la.Static;
function Hm(e, n) {
	let r = m(), { id: i = `headlessui-popover-panel-${r}`, focus: a = !1, anchor: o, portal: s = !1, modal: c = !1, transition: u = !1, ...d } = e, p = Dm("Popover.Panel"), h = Z(p, p.selectors.isPortalled), [g, _, v, x, S] = Z(p, l((e) => [
		e.popoverState,
		e.button,
		e.__demoMode,
		e.beforePanelSentinel,
		e.afterPanelSentinel
	], [])), C = `headlessui-focus-sentinel-before-${r}`, w = `headlessui-focus-sentinel-after-${r}`, T = y(null), E = Ru(o), [D, O] = Hu(E), k = Vu();
	E && (s = !0);
	let [A, j] = b(null), M = Y(T, n, E ? D : null, p.actions.setPanel, j), N = ks(_), P = ks(T.current);
	G(() => (p.actions.setPanelId(i), () => p.actions.setPanelId(null)), [i, p]);
	let F = $u(), [I, L] = Qs(u, A, F === null ? g === Sm.Open : (F & Q.Open) === Q.Open);
	is(I, _, p.actions.close), Ks(!v && c && I, P);
	let R = K((e) => {
		var t;
		switch (e.key) {
			case X.Escape:
				if (p.state.popoverState !== Sm.Open || !T.current) return;
				let n = Yi(T.current);
				if (n && !T.current.contains(n)) return;
				e.preventDefault(), e.stopPropagation(), p.actions.close(), (t = p.state.button) == null || t.focus();
				break;
		}
	});
	f(() => {
		var t;
		e.static || g === Sm.Closed && ((t = e.unmount) == null || t) && p.actions.setPanel(null);
	}, [
		g,
		e.unmount,
		e.static,
		p
	]), f(() => {
		if (v || !a || g !== Sm.Open || !T.current) return;
		let e = Yi(T.current);
		T.current.contains(e) || xs(T.current, ss.First);
	}, [
		v,
		a,
		T.current,
		g
	]);
	let ee = ia({
		open: g === Sm.Open,
		close: p.actions.refocusableClose
	}), z = ga(E ? k() : {}, {
		ref: M,
		id: i,
		onKeyDown: R,
		onBlur: a && g === Sm.Open ? (e) => {
			var t, n, r, i, a;
			let o = e.relatedTarget;
			o && T.current && ((t = T.current) != null && t.contains(o) || (p.actions.close(), ((r = (n = x.current)?.contains) != null && r.call(n, o) || (a = (i = S.current)?.contains) != null && a.call(i, o)) && o.focus({ preventScroll: !0 })));
		} : void 0,
		tabIndex: -1,
		style: {
			...d.style,
			...O,
			"--button-width": Co(I, _, !0).width
		},
		...Zs(L)
	}), B = Fd(), te = K(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			ca(B.current, {
				[Pd.Forwards]: () => {
					var t;
					xs(e, ss.First) === cs.Error && ((t = p.state.afterPanelSentinel.current) == null || t.focus());
				},
				[Pd.Backwards]: () => {
					var e;
					(e = p.state.button) == null || e.focus({ preventScroll: !0 });
				}
			});
		}
		t();
	}), V = K(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			ca(B.current, {
				[Pd.Forwards]: () => {
					if (!p.state.button) return;
					let e = us(Ji(p.state.button) ?? document.body), t = e.indexOf(p.state.button), n = e.slice(0, t + 1), r = [...e.slice(t + 1), ...n];
					for (let e of r.slice()) if (e.dataset.headlessuiFocusGuard === "true" || A != null && A.contains(e)) {
						let t = r.indexOf(e);
						t !== -1 && r.splice(t, 1);
					}
					xs(r, ss.First, { sorted: !1 });
				},
				[Pd.Backwards]: () => {
					var t;
					xs(e, ss.Previous) === cs.Error && ((t = p.state.button) == null || t.focus());
				}
			});
		}
		t();
	}), H = q();
	return t.createElement(td, null, t.createElement(jm.Provider, { value: i }, t.createElement(yo, { value: p.actions.refocusableClose }, t.createElement(Cd, {
		enabled: s ? e.static || I : !1,
		ownerDocument: N
	}, I && h && t.createElement(Na, {
		id: C,
		ref: x,
		features: ja.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: te
	}), H({
		ourProps: z,
		theirProps: d,
		slot: ee,
		defaultTag: Bm,
		features: Vm,
		visible: I,
		name: "Popover.Panel"
	}), I && h && t.createElement(Na, {
		id: w,
		ref: S,
		features: ja.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: V
	})))));
}
var Um = "div";
function Wm(e, n) {
	let r = y(null), i = Y(r, n), [a, o] = b([]), s = K((e) => {
		o((t) => {
			let n = t.indexOf(e);
			if (n !== -1) {
				let e = t.slice();
				return e.splice(n, 1), e;
			}
			return t;
		});
	}), c = K((e) => (o((t) => [...t, e]), () => s(e))), l = K(() => {
		var e;
		let t = Ji(r.current);
		if (!t) return !1;
		let n = Yi(r.current);
		return (e = r.current) != null && e.contains(n) ? !0 : a.some((e) => t.getElementById(e.buttonId.current)?.contains(n) || t.getElementById(e.panelId.current)?.contains(n));
	}), u = K((e) => {
		for (let t of a) t.buttonId.current !== e && t.close();
	}), d = _(() => ({
		registerPopover: c,
		unregisterPopover: s,
		isFocusWithinPopoverGroup: l,
		closeOthers: u
	}), [
		c,
		s,
		l,
		u
	]), f = ia({}), p = e, m = { ref: i }, h = q();
	return t.createElement(jd, null, t.createElement(km.Provider, { value: d }, h({
		ourProps: m,
		theirProps: p,
		slot: f,
		defaultTag: Um,
		name: "Popover.Group"
	})));
}
var Gm = J(Pm), Km = J(Im), qm = J(zm), Jm = J(zm), Ym = J(Hm), Xm = J(Wm), Zm = Object.assign(Gm, {
	Button: Km,
	Backdrop: Jm,
	Overlay: qm,
	Panel: Ym,
	Group: Xm
}), Qm = ((e) => (e[e.RegisterOption = 0] = "RegisterOption", e[e.UnregisterOption = 1] = "UnregisterOption", e))(Qm || {}), $m = {
	0(e, t) {
		let n = [...e.options, {
			id: t.id,
			element: t.element,
			propsRef: t.propsRef
		}];
		return {
			...e,
			options: ys(n, (e) => e.element.current)
		};
	},
	1(e, t) {
		let n = e.options.slice(), r = e.options.findIndex((e) => e.id === t.id);
		return r === -1 ? e : (n.splice(r, 1), {
			...e,
			options: n
		});
	}
}, eh = i(null);
eh.displayName = "RadioGroupDataContext";
function th(e) {
	let t = u(eh);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, th), t;
	}
	return t;
}
var nh = i(null);
nh.displayName = "RadioGroupActionsContext";
function rh(e) {
	let t = u(nh);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, rh), t;
	}
	return t;
}
function ih(e, t) {
	return ca(t.type, $m, e, t);
}
var ah = "div";
function oh(e, n) {
	let r = m(), i = oa(), { id: a = `headlessui-radiogroup-${r}`, value: o, form: s, name: c, onChange: u, by: d, disabled: f = i || !1, defaultValue: p, tabIndex: h = 0, ...g } = e, b = xo(d), [x, S] = v(ih, { options: [] }), C = x.options, [w, T] = po(), [E, D] = io(), O = y(null), k = Y(O, n), A = wa(p), [j, M] = Ca(o, u, A), N = _(() => C.find((e) => !e.propsRef.current.disabled), [C]), P = _(() => C.some((e) => b(e.propsRef.current.value, j)), [C, j]), F = K((e) => {
		if (f || b(e, j)) return !1;
		let t = C.find((t) => b(t.propsRef.current.value, e))?.propsRef.current;
		return t != null && t.disabled ? !1 : (M?.(e), !0);
	}), I = K((e) => {
		if (!O.current) return;
		let t = C.filter((e) => e.propsRef.current.disabled === !1).map((e) => e.element.current);
		switch (e.key) {
			case X.Enter:
				Oa(e.currentTarget);
				break;
			case X.ArrowLeft:
			case X.ArrowUp:
				if (e.preventDefault(), e.stopPropagation(), xs(t, ss.Previous | ss.WrapAround) === cs.Success) {
					let e = C.find((e) => Xi(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case X.ArrowRight:
			case X.ArrowDown:
				if (e.preventDefault(), e.stopPropagation(), xs(t, ss.Next | ss.WrapAround) === cs.Success) {
					let e = C.find((e) => Xi(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case X.Space:
				{
					e.preventDefault(), e.stopPropagation();
					let t = C.find((e) => Xi(e.element.current));
					t && F(t.propsRef.current.value);
				}
				break;
		}
	}), L = K((e) => (S({
		type: 0,
		...e
	}), () => S({
		type: 1,
		id: e.id
	}))), R = _(() => ({
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
	]), ee = _(() => ({
		registerOption: L,
		change: F
	}), [L, F]), z = {
		ref: k,
		id: a,
		role: "radiogroup",
		"aria-labelledby": w,
		"aria-describedby": E,
		onKeyDown: I
	}, B = ia({ value: j }), te = l(() => {
		if (A !== void 0) return F(A);
	}, [F, A]), V = q();
	return t.createElement(D, { name: "RadioGroup.Description" }, t.createElement(T, { name: "RadioGroup.Label" }, t.createElement(nh.Provider, { value: ee }, t.createElement(eh.Provider, { value: R }, c != null && t.createElement(Ia, {
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
		theirProps: g,
		slot: B,
		defaultTag: ah,
		name: "RadioGroup"
	})))));
}
var sh = "div";
function ch(e, n) {
	let r = th("RadioGroup.Option"), i = rh("RadioGroup.Option"), a = m(), { id: o = `headlessui-radiogroup-option-${a}`, value: s, disabled: c = r.disabled || !1, autoFocus: l = !1, ...u } = e, d = y(null), f = Y(d, n), [p, h] = po(), [g, _] = io(), v = ea({
		value: s,
		disabled: c
	});
	G(() => i.registerOption({
		id: o,
		element: d,
		propsRef: v
	}), [
		o,
		i,
		d,
		v
	]);
	let b = K((e) => {
		var t;
		if (Za(e.currentTarget)) return e.preventDefault();
		i.change(s) && ((t = d.current) == null || t.focus());
	}), x = r.firstOption?.id === o, { isFocusVisible: S, focusProps: C } = Ii({ autoFocus: l }), { isHovered: w, hoverProps: T } = Hi({ isDisabled: c }), E = r.compare(r.value, s), D = ga({
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
	}, C, T), O = ia({
		checked: E,
		disabled: c,
		active: S,
		hover: w,
		focus: S,
		autofocus: l
	}), k = q();
	return t.createElement(_, { name: "RadioGroup.Description" }, t.createElement(h, { name: "RadioGroup.Label" }, k({
		ourProps: D,
		theirProps: u,
		slot: O,
		defaultTag: sh,
		name: "RadioGroup.Option"
	})));
}
var lh = "span";
function uh(e, t) {
	let n = th("Radio"), r = rh("Radio"), i = m(), a = za(), o = oa(), { id: s = a || `headlessui-radio-${i}`, value: c, disabled: l = n.disabled || o || !1, autoFocus: u = !1, ...d } = e, f = y(null), p = Y(f, t), h = fo(), g = ro(), _ = ea({
		value: c,
		disabled: l
	});
	G(() => r.registerOption({
		id: s,
		element: f,
		propsRef: _
	}), [
		s,
		r,
		f,
		_
	]);
	let v = K((e) => {
		var t;
		if (Za(e.currentTarget)) return e.preventDefault();
		r.change(c) && ((t = f.current) == null || t.focus());
	}), { isFocusVisible: b, focusProps: x } = Ii({ autoFocus: u }), { isHovered: S, hoverProps: C } = Hi({ isDisabled: l }), w = n.firstOption?.id === s, T = n.compare(n.value, c), E = ga({
		ref: p,
		id: s,
		role: "radio",
		"aria-checked": T ? "true" : "false",
		"aria-labelledby": h,
		"aria-describedby": g,
		"aria-disabled": l ? !0 : void 0,
		tabIndex: l ? -1 : T || !n.containsCheckedOption && w ? n.tabIndex : -1,
		autoFocus: u,
		onClick: l ? void 0 : v
	}, x, C), D = ia({
		checked: T,
		disabled: l,
		hover: S,
		focus: b,
		autofocus: u
	});
	return q()({
		ourProps: E,
		theirProps: d,
		slot: D,
		defaultTag: lh,
		name: "Radio"
	});
}
var dh = J(oh), fh = J(ch), ph = J(uh), mh = Object.assign(dh, {
	Option: fh,
	Radio: ph,
	Label: _o,
	Description: co
}), hh = "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", gh = /* @__PURE__ */ "🚀.✅.🐞.📌.⭐.🔥.💡.📝.🎨.🛠️.📅.⚠️.🎯.🔧.📦.🧪.🚧.💬.📈.🔍.❤️.🏷️.📂.🧩.⏰.🌟.✏️.📊.🙌.🧠.🌈.🔑".split(".");
function _h({ value: e, options: t, onChange: n, disabled: r = !1, portalClassName: i }) {
	let a = t.find((t) => t.value === e);
	return /* @__PURE__ */ w(Lp, {
		value: e,
		onChange: n,
		disabled: r,
		children: [/* @__PURE__ */ w(Mp, {
			className: `${hh} flex w-full items-center justify-between gap-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60`,
			children: [/* @__PURE__ */ w("span", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [a?.warning ? /* @__PURE__ */ C(Pt, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : a?.color ? /* @__PURE__ */ C("span", {
					className: "h-2.5 w-2.5 shrink-0 rounded-full",
					style: { backgroundColor: a.color },
					"aria-hidden": !0
				}) : null, /* @__PURE__ */ C("span", {
					className: "truncate",
					children: a?.label ?? e
				})]
			}), /* @__PURE__ */ C(bt, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" })]
		}), /* @__PURE__ */ C(Pp, {
			anchor: "bottom start",
			className: `z-[60] w-[var(--button-width)] rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${i ? ` ${i}` : ""}`,
			children: t.map((t) => /* @__PURE__ */ w(Fp, {
				value: t.value,
				className: "flex cursor-pointer items-center justify-between gap-1 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100",
				children: [/* @__PURE__ */ w("span", {
					className: "flex min-w-0 items-center gap-1.5",
					children: [t.warning ? /* @__PURE__ */ C(Pt, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : t.color ? /* @__PURE__ */ C("span", {
						className: "h-2.5 w-2.5 shrink-0 rounded-full",
						style: { backgroundColor: t.color },
						"aria-hidden": !0
					}) : null, /* @__PURE__ */ C("span", {
						className: "truncate",
						children: t.label
					})]
				}), t.value === e && /* @__PURE__ */ C(ft, { className: "h-3.5 w-3.5 shrink-0 text-brand" })]
			}, t.value))
		})]
	});
}
function vh({ value: e, onChange: t, disabled: n = !1, portalClassName: r }) {
	return /* @__PURE__ */ C("div", { children: /* @__PURE__ */ w(vm, {
		as: "div",
		className: "relative inline-block",
		children: [/* @__PURE__ */ C(fm, {
			disabled: n,
			className: "flex h-7 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-base leading-none hover:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60",
			children: e ? /* @__PURE__ */ C("span", { children: e }) : /* @__PURE__ */ C(Rt, { className: "h-4 w-4 text-stone-400" })
		}), /* @__PURE__ */ w(pm, {
			anchor: "bottom start",
			className: `z-[60] w-[232px] rounded-lg border border-black/[0.06] bg-white p-2 shadow-lg [--anchor-gap:4px] focus:outline-none${r ? ` ${r}` : ""}`,
			children: [/* @__PURE__ */ C("div", {
				className: "grid grid-cols-8 gap-0.5",
				children: gh.map((n) => /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => t(n),
					className: `flex h-6 w-6 items-center justify-center rounded text-base hover:bg-stone-100 data-[focus]:bg-stone-100 ${e === n ? "bg-brand-soft" : ""}`,
					children: n
				}) }, n))
			}), /* @__PURE__ */ C("div", {
				className: "mt-1 border-t border-black/[0.05] pt-1",
				children: /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					onClick: () => t(""),
					className: "flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ C(kn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "zOc0vf" })]
				}) })
			})]
		})]
	}) });
}
function yh({ value: e, options: t, onChange: n, disabled: r = !1, portalClassName: i, emptyLabel: a, emptyMessage: o }) {
	let s = (e) => e.value ?? e.label, c = new Map(t.map((e) => [s(e), e])), l = [...t, ...e.filter((e) => !c.has(e)).map((e) => ({
		value: e,
		label: e,
		color: null
	}))], u = (t) => n(e.includes(t) ? e.filter((e) => e !== t) : [...e, t]);
	return /* @__PURE__ */ w(vm, {
		as: "div",
		className: "relative inline-block w-full",
		children: [/* @__PURE__ */ w(fm, {
			disabled: r,
			className: `${hh} flex w-full items-center justify-between gap-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60`,
			children: [/* @__PURE__ */ C("span", {
				className: "truncate",
				children: e.length ? e.map((e) => c.get(e)?.label ?? e).join(", ") : a ?? W._({ id: "cfaWH-" })
			}), /* @__PURE__ */ C(bt, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" })]
		}), /* @__PURE__ */ w(pm, {
			anchor: "bottom start",
			className: `z-[60] max-h-56 w-[var(--button-width)] overflow-y-auto rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none${i ? ` ${i}` : ""}`,
			children: [l.length === 0 && /* @__PURE__ */ C("div", {
				className: "px-2 py-1 text-stone-400",
				children: o ?? W._({ id: "GKu3m4" })
			}), l.map((t) => {
				let n = s(t);
				return /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					onClick: (e) => {
						e.preventDefault(), u(n);
					},
					className: "flex w-full items-center gap-1.5 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100",
					children: [
						/* @__PURE__ */ C("span", {
							className: `h-2.5 w-2.5 rounded-full ${t.color ? "" : "bg-stone-300"}`,
							style: t.color ? { backgroundColor: t.color } : void 0
						}),
						/* @__PURE__ */ C("span", {
							className: "flex-1 truncate text-left",
							children: t.label
						}),
						e.includes(n) && /* @__PURE__ */ C(ft, { className: "h-3.5 w-3.5 text-brand" })
					]
				}) }, n);
			})]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardPeek.tsx
function bh({ card: e, boardTitle: t, statusOptions: n, swimlaneOptions: r, swimlaneDisabled: i, assigneeOptions: a, tagOptions: o, fields: s, onAddField: c, dependencyCards: u, childCards: d, onOpenCard: p, onAddChild: m, loadNotes: h, onUploadAttachment: g, loadComments: _, addComment: v, updateComment: x, deleteComment: T, toggleReaction: E, resolveComment: D, currentUser: O, loadActivity: k, renderMarkdownToContainer: A, renderMarkdownToHtml: j, portalClassName: M, supplement: N, readOnly: P, onBack: F, onChange: I, onCloseRequestReady: L, onClose: R, onDelete: ee, onOpenFull: B }) {
	let [te, V] = b(""), [H, ne] = b(""), [re, ie] = b(!1), [ae, oe] = b(""), se = y(0), [ce, le] = b(e), [ue, de] = b(e.notes ?? ""), [fe, pe] = b(P ? "preview" : "write"), [me, he] = b(""), [ge, U] = b(!1), [_e, ve] = b([]), [ye, be] = b(!1), [xe, Se] = b(""), [Ce, Te] = b(0), [Ee, De] = b(""), [ke, je] = b([]), [Me, Ne] = b(!1), [Fe, Le] = b(""), [Re, ze] = b(0), [Be, Ve] = b(""), [He, Ue] = b(0), [We, Ge] = b(!1), Ke = y(null), qe = y(null), Je = y(null), Ye = y({}), Ze = y(I), Qe = y(null), $e = y(null), et = y(/* @__PURE__ */ new Set()), tt = y(!1), rt = y(!!P);
	rt.current = !!P;
	let it = l((e) => {
		if (rt.current || Object.keys(e).length === 0) return Promise.resolve();
		let t;
		return Ue((e) => e + 1), t = Promise.resolve(Ze.current(e)).then(() => {
			let t = Qe.current;
			if (!t) return;
			let n = Object.fromEntries(Object.entries(t).filter(([t]) => !Object.prototype.hasOwnProperty.call(e, t)));
			Qe.current = Object.keys(n).length > 0 ? n : null, !Qe.current && !$e.current && Ve("");
		}, (t) => {
			Qe.current = {
				...Qe.current ?? {},
				...e
			}, Ve(t instanceof Error && t.message ? t.message : W._({ id: "5nNdrW" }));
		}).finally(() => {
			et.current.delete(t), Ue((e) => Math.max(0, e - 1));
		}), et.current.add(t), t;
	}, []), at = l((e = {}) => {
		Je.current && clearTimeout(Je.current), Je.current = null;
		let t = {
			...Ye.current,
			...e
		};
		return Ye.current = {}, it(t);
	}, [it]), ot = l(async (e) => {
		if (!tt.current) {
			for (tt.current = !0, Ge(!0), await at(); et.current.size > 0;) await Promise.all([...et.current]);
			if (Qe.current || Object.keys(Ye.current).length > 0) {
				tt.current = !1, Ge(!1);
				return;
			}
			try {
				await e(), $e.current = null, Ve("");
			} catch (t) {
				$e.current = e, Ve(t instanceof Error && t.message ? t.message : W._({ id: "5nNdrW" }));
			} finally {
				tt.current = !1, Ge(!1);
			}
		}
	}, [at]), st = l(() => ot(R), [R, ot]);
	f(() => (L?.(() => {
		st();
	}), () => L?.(null)), [L, st]), f(() => {
		if (se.current += 1, le(e), de(e.notes ?? ""), ne(""), ie(!1), oe(""), Qe.current = null, $e.current = null, Ye.current = {}, Ve(""), tt.current = !1, Ge(!1), h) {
			let t = !1;
			return h(e.id).then((e) => {
				t || de(e);
			}), () => {
				t = !0;
			};
		}
	}, [e.id]), f(() => {
		let e = window.setTimeout(() => Ke.current?.focus(), 0);
		return () => window.clearTimeout(e);
	}, [e.id]), f(() => () => {
		at();
	}, [e.id, at]), f(() => {
		P && (Je.current && clearTimeout(Je.current), Je.current = null, Ye.current = {}, Qe.current = null, tt.current = !1, Ge(!1), Ve(""), pe("preview"));
	}, [P]), f(() => {
		if (!_) {
			ve([]), be(!1), Se("");
			return;
		}
		let t = !1;
		return De(""), be(!0), Se(""), _(e.id).then((e) => {
			t || (ve(e), be(!1));
		}).catch((e) => {
			t || (be(!1), Se(e instanceof Error && e.message ? e.message : W._({ id: "ntiMEf" })));
		}), () => {
			t = !0;
		};
	}, [e.id, Ce]), f(() => {
		if (!k) {
			je([]), Ne(!1), Le("");
			return;
		}
		let t = !1;
		return je([]), Ne(!0), Le(""), k(e.id).then((e) => {
			t || (je(e), Ne(!1));
		}).catch((e) => {
			t || (Ne(!1), Le(e instanceof Error ? e.message : W._({ id: "N2tLf0" })));
		}), () => {
			t = !0;
		};
	}, [
		Re,
		e.id,
		k
	]);
	let lt = async () => {
		let t = Ee.trim();
		if (!(P || !t || !v)) try {
			let n = await v(e.id, t);
			ve((e) => [...e, n]), De("");
		} catch {}
	}, ut = async (e) => {
		if (!(P || !T)) try {
			await T(e), ve((t) => t.filter((t) => t.id !== e && t.parentId !== e));
		} catch {}
	}, dt = (e) => ve((t) => t.map((t) => t.id === e.id ? e : t)), ft = _e.filter((e) => !e.parentId), pt = /* @__PURE__ */ new Map();
	for (let e of _e) {
		if (!e.parentId) continue;
		let t = pt.get(e.parentId);
		t ? t.push(e) : pt.set(e.parentId, [e]);
	}
	let mt = l((e) => {
		P || (Ye.current = {
			...Ye.current,
			...e
		}, Ze.current = I, Je.current && clearTimeout(Je.current), Je.current = setTimeout(() => at(), 350));
	}, [
		at,
		I,
		P
	]), ht = (e, t = !1) => {
		P || (le((t) => ({
			...t,
			...e
		})), t ? (Ze.current = I, at(e)) : mt(e));
	}, gt = (e) => {
		P || (de(e), mt({ notes: e }));
	};
	f(() => {
		if (!(fe !== "preview" || !qe.current)) {
			if (A) {
				A(ue, qe.current);
				return;
			}
			qe.current.textContent = ue;
		}
	}, [
		fe,
		ue,
		A
	]);
	let _t = ce.tags.map((e) => e.label), yt = ce.attachments ?? [], bt = (e) => ht({ attachments: e }, !0), xt = (e) => {
		let t = e.trim();
		t && !yt.includes(t) && bt([...yt, t]);
	}, St = async () => {
		let e = H.trim();
		if (P || !e || !m || re) return;
		let t = se.current + 1;
		se.current = t, ie(!0), oe("");
		try {
			if (await m(e), se.current !== t) return;
			ne("");
		} catch {
			if (se.current !== t) return;
			oe(W._({ id: "rfI3Fa" }));
		} finally {
			se.current === t && ie(!1);
		}
	}, Ct = async (e) => {
		if (!(P || !e || !g)) {
			U(!0);
			try {
				xt(await g(e));
			} finally {
				U(!1);
			}
		}
	}, wt = /* @__PURE__ */ new Map(), Tt = new Map((u ?? []).map((e) => [e.slug, e])), Dt = /* @__PURE__ */ new Map(), Ot = /* @__PURE__ */ new Map();
	for (let e of u ?? []) {
		wt.set(e.title, (wt.get(e.title) ?? 0) + 1);
		let t = e.slug.split("/").filter(Boolean), n = t[t.length - 1] ?? e.slug, r = Dt.get(n);
		r ? r.push(e) : Dt.set(n, [e]);
		for (let n = 1; n < t.length - 1; n += 1) {
			let r = t.slice(n).join("/"), i = Ot.get(r);
			Ot.set(r, i === void 0 || i === e ? e : null);
		}
	}
	let kt = (u ?? []).map((e) => ({
		value: e.slug,
		label: (wt.get(e.title) ?? 0) > 1 ? `${e.title} · ${e.slug}` : e.title
	})), At = (e) => {
		if (!e || Tt.has(e)) return e;
		if (!e.includes("/")) {
			let t = Dt.get(e) ?? [];
			return t.length === 1 ? t[0].slug : e;
		}
		return Ot.get(e)?.slug ?? e;
	}, jt = (e) => /* @__PURE__ */ C(yh, {
		value: (ce[e] ?? []).map(At),
		options: kt,
		onChange: (t) => ht({ [e]: t }, !0),
		disabled: P,
		portalClassName: M,
		emptyLabel: W._({ id: "AmiJYR" }),
		emptyMessage: W._({ id: "Zot9XS" })
	});
	return /* @__PURE__ */ w("div", {
		className: "flex h-full w-full flex-col overflow-hidden bg-white",
		children: [
			/* @__PURE__ */ w("header", {
				className: "flex h-14 shrink-0 items-center gap-2 border-b border-line px-5",
				children: [
					F && /* @__PURE__ */ C("button", {
						type: "button",
						onClick: () => void ot(F),
						title: W._({ id: "z68Wjp" }),
						"aria-label": W._({ id: "z68Wjp" }),
						className: "-ml-2 rounded-lg p-1.5 text-stone-500 outline-none transition hover:bg-stone-100 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand",
						children: /* @__PURE__ */ C(Oe, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ C("span", {
						className: "flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
						children: ce.icon ? /* @__PURE__ */ C("span", {
							className: "text-sm",
							children: ce.icon
						}) : /* @__PURE__ */ C(pn, { className: "h-4 w-4" })
					}),
					t && /* @__PURE__ */ C("span", {
						className: "max-w-48 truncate text-xs font-medium text-brand-gray",
						children: t
					}),
					/* @__PURE__ */ C(vt, { className: "h-3.5 w-3.5 text-stone-300" }),
					/* @__PURE__ */ C("span", {
						className: "text-xs font-semibold text-stone-700",
						children: ce.ticket ?? /* @__PURE__ */ C(z, { id: "kryGs-" })
					}),
					/* @__PURE__ */ w("div", {
						className: "ml-auto flex items-center gap-1",
						children: [
							B && /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => void ot(B),
								disabled: We,
								title: W._({ id: "pKztsX" }),
								className: "rounded-lg p-1.5 text-stone-400 outline-none transition hover:bg-stone-100 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand",
								children: /* @__PURE__ */ C(Pe, { className: "h-4 w-4" })
							}),
							ee && !P && /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => void ot(ee),
								disabled: We,
								title: W._({ id: "nabda1" }),
								className: "rounded-lg p-1.5 text-stone-400 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500",
								children: /* @__PURE__ */ C(xn, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => void st(),
								disabled: We,
								title: W._({ id: "yz7wBu" }),
								"aria-label": W._({ id: "yz7wBu" }),
								className: "rounded-lg p-1.5 text-stone-400 outline-none transition hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-brand",
								children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
							})
						]
					})
				]
			}),
			(Be || He > 0) && /* @__PURE__ */ w("div", {
				className: `mx-4 mt-3 flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${Be ? "border-red-100 bg-red-50 text-red-700" : "border-brand/15 bg-brand-soft/40 text-brand-dark"}`,
				role: Be ? "alert" : "status",
				children: [/* @__PURE__ */ C("span", {
					className: "min-w-0 flex-1",
					children: Be || W._({ id: "-yOx8u" })
				}), Be && /* @__PURE__ */ w("button", {
					type: "button",
					disabled: P || !Qe.current && !$e.current,
					onClick: () => {
						let e = Qe.current;
						e ? it(e) : $e.current && ot($e.current);
					},
					className: "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50",
					children: [/* @__PURE__ */ C(Ae, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "6gRgw8" })]
				})]
			}),
			/* @__PURE__ */ w("div", {
				className: "flex min-h-0 flex-1 flex-col lg:flex-row",
				children: [/* @__PURE__ */ w("main", {
					className: "min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 lg:px-12",
					children: [
						/* @__PURE__ */ C("input", {
							ref: Ke,
							autoFocus: !0,
							readOnly: P,
							className: "w-full bg-transparent text-2xl font-semibold tracking-[-0.025em] text-stone-950 outline-none placeholder:text-stone-300 focus-visible:ring-2 focus-visible:ring-brand sm:text-[1.75rem] read-only:cursor-default",
							placeholder: W._({ id: "gLDJuJ" }),
							value: ce.title,
							onChange: (e) => ht({ title: e.target.value })
						}),
						/* @__PURE__ */ w("section", {
							className: "mt-7",
							children: [/* @__PURE__ */ w("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ C("span", {
									className: "text-xs font-semibold text-stone-700",
									children: /* @__PURE__ */ C(z, { id: "Nu4oKW" })
								}), /* @__PURE__ */ C("button", {
									type: "button",
									onClick: () => pe((e) => e === "write" ? "preview" : "write"),
									className: "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100",
									children: fe === "write" ? /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C(It, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "rdUucN" })] }) : /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C(nn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "i4_LY_" })] })
								})]
							}), fe === "write" ? /* @__PURE__ */ C("textarea", {
								readOnly: P,
								className: "mt-2 min-h-[280px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50/35 px-4 py-3 text-sm leading-6 text-stone-800 outline-none transition focus:border-brand/50 focus:bg-white focus:ring-4 focus:ring-brand/5",
								value: ue,
								placeholder: W._({ id: "abUZlY" }),
								onChange: (e) => gt(e.target.value)
							}) : /* @__PURE__ */ C("article", {
								ref: qe,
								className: `preview mt-2 min-h-[280px] rounded-xl border border-stone-100 bg-stone-50/20 px-4 py-3 text-sm${A ? "" : " whitespace-pre-wrap"}`
							})]
						}),
						(m || (d?.length ?? 0) > 0) && /* @__PURE__ */ w("section", {
							className: "mt-8 border-t border-line pt-6",
							children: [
								/* @__PURE__ */ w("span", {
									className: "text-xs font-semibold text-stone-700",
									children: [/* @__PURE__ */ C(z, { id: "bzjBcL" }), (d?.length ?? 0) > 0 && /* @__PURE__ */ w("span", {
										className: "ml-1.5 font-normal text-stone-400",
										children: [
											d.filter((e) => e.done).length,
											"/",
											d.length
										]
									})]
								}),
								/* @__PURE__ */ C("ul", {
									className: "mt-2 space-y-1.5",
									children: (d ?? []).map((e) => /* @__PURE__ */ C("li", { children: /* @__PURE__ */ w("button", {
										type: "button",
										className: "flex w-full items-center gap-2 rounded-xl border border-stone-100 bg-stone-50/55 px-3 py-2 text-left text-xs transition hover:border-brand/25 hover:bg-brand-soft/20",
										onClick: () => {
											p && ot(() => p(e.id));
										},
										title: W._({ id: "fEqHZq" }),
										children: [
											/* @__PURE__ */ C("span", { className: `h-2 w-2 shrink-0 rounded-full ${e.done ? "bg-emerald-500" : "bg-stone-300"}` }),
											/* @__PURE__ */ w("span", {
												className: `min-w-0 flex-1 truncate ${e.done ? "text-stone-400 line-through" : "text-stone-700"}`,
												children: [e.icon && /* @__PURE__ */ C("span", {
													className: "mr-1",
													children: e.icon
												}), e.title]
											}),
											/* @__PURE__ */ C("span", {
												className: "shrink-0 text-[10px] text-stone-400",
												children: e.statusName
											})
										]
									}) }, e.id))
								}),
								m && !P && /* @__PURE__ */ w("form", {
									className: "mt-2",
									onSubmit: (e) => {
										e.preventDefault(), St();
									},
									children: [/* @__PURE__ */ C("input", {
										className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
										placeholder: W._({ id: "OR4WQZ" }),
										value: H,
										disabled: re,
										onChange: (e) => ne(e.target.value),
										onKeyDown: (e) => {
											e.key === "Enter" && (e.preventDefault(), e.stopPropagation(), St());
										}
									}), ae && /* @__PURE__ */ C("p", {
										className: "mt-1 text-[11px] text-red-600",
										role: "alert",
										children: ae
									})]
								})
							]
						}),
						/* @__PURE__ */ w("section", {
							className: "mt-8 border-t border-line pt-6",
							children: [
								/* @__PURE__ */ w("span", {
									className: "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700",
									children: [/* @__PURE__ */ C(en, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ C(z, { id: "w_Sphq" })]
								}),
								yt.length > 0 && /* @__PURE__ */ C("div", {
									className: "mt-2 grid gap-1.5 sm:grid-cols-2",
									children: yt.map((e) => /* @__PURE__ */ w("div", {
										className: "flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs",
										children: [
											/* @__PURE__ */ C(en, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" }),
											Rn(e) ? /* @__PURE__ */ C("a", {
												href: e,
												target: "_blank",
												rel: "noreferrer",
												className: "flex-1 truncate text-brand-dark hover:underline",
												title: e,
												children: Ln(e)
											}) : /* @__PURE__ */ w("span", {
												className: "flex-1 truncate text-stone-500",
												title: W._({
													id: "w7E-FA",
													values: { url: e }
												}),
												children: [
													Ln(e),
													" ",
													/* @__PURE__ */ w("span", {
														className: "text-red-500",
														children: [
															"(",
															W._({ id: "1lWHP7" }),
															")"
														]
													})
												]
											}),
											!P && /* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => bt(yt.filter((t) => t !== e)),
												title: W._({ id: "t_YqKh" }),
												className: "rounded p-0.5 text-stone-400 hover:text-red-600",
												children: /* @__PURE__ */ C(kn, { className: "h-3.5 w-3.5" })
											})
										]
									}, e))
								}),
								!P && /* @__PURE__ */ w("div", {
									className: "mt-2 flex items-center gap-2",
									children: [/* @__PURE__ */ C("form", {
										className: "flex-1",
										onSubmit: (e) => {
											e.preventDefault(), xt(me), he("");
										},
										children: /* @__PURE__ */ C("input", {
											className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
											placeholder: W._({ id: "Pvpx7b" }),
											value: me,
											onChange: (e) => he(e.target.value)
										})
									}), g && /* @__PURE__ */ w("label", {
										className: "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										children: [
											/* @__PURE__ */ C(Ie, { className: "h-3.5 w-3.5" }),
											ge ? /* @__PURE__ */ C(z, { id: "gANddk" }) : /* @__PURE__ */ C(z, { id: "ONWvwQ" }),
											/* @__PURE__ */ C("input", {
												type: "file",
												className: "hidden",
												disabled: ge,
												onChange: (e) => {
													Ct(e.target.files?.[0]), e.target.value = "";
												}
											})
										]
									})]
								})
							]
						}),
						_ && /* @__PURE__ */ w("section", {
							className: "mt-8 border-t border-line pt-6",
							children: [
								/* @__PURE__ */ w("span", {
									className: "inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700",
									children: [/* @__PURE__ */ C(ct, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ C(z, { id: "VbyRUy" })]
								}),
								xe ? /* @__PURE__ */ w("div", {
									className: "mt-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700",
									role: "alert",
									children: [/* @__PURE__ */ C("span", {
										className: "min-w-0 flex-1 truncate",
										children: xe
									}), /* @__PURE__ */ w("button", {
										type: "button",
										onClick: () => Te((e) => e + 1),
										className: "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-red-500",
										children: [/* @__PURE__ */ C(Ae, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "6gRgw8" })]
									})]
								}) : ye ? /* @__PURE__ */ w("div", {
									className: "mt-2 space-y-2",
									"aria-label": W._({ id: "tR1uEq" }),
									children: [/* @__PURE__ */ C("div", { className: "h-10 animate-pulse rounded-lg bg-stone-100" }), /* @__PURE__ */ C("div", { className: "h-10 animate-pulse rounded-lg bg-stone-100" })]
								}) : /* @__PURE__ */ w("ul", {
									className: "mt-2 space-y-2",
									children: [ft.map((t) => /* @__PURE__ */ C(jh, {
										root: t,
										replies: pt.get(t.id) ?? [],
										currentUser: O,
										canReply: !!v && !P,
										onReply: v && !P ? async (n) => {
											let r = await v(e.id, n, t.id);
											ve((e) => [...e, r]);
										} : void 0,
										onEdit: x && !P ? async (e, t) => {
											let n = await x(e, t);
											dt(n);
										} : void 0,
										onDelete: T && !P ? (e) => void ut(e) : void 0,
										onReact: E && !P ? async (e, t) => {
											dt(await E(e, t));
										} : void 0,
										onResolve: D && !P ? async (e) => {
											dt(await D(t.id, e));
										} : void 0,
										renderMarkdownToHtml: j
									}, t.id)), _e.length === 0 && /* @__PURE__ */ C("li", {
										className: "text-xs text-stone-400",
										children: /* @__PURE__ */ C(z, { id: "Mm72la" })
									})]
								}),
								v && !P && /* @__PURE__ */ w("form", {
									className: "mt-3",
									onSubmit: (e) => {
										e.preventDefault(), lt();
									},
									children: [/* @__PURE__ */ C("textarea", {
										className: "w-full resize-y rounded-xl border border-stone-200 p-3 text-xs text-stone-800 outline-none focus:border-brand focus:ring-4 focus:ring-brand/5",
										rows: 3,
										placeholder: W._({ id: "HrmW6B" }),
										value: Ee,
										onChange: (e) => De(e.target.value),
										onKeyDown: (e) => {
											e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), lt());
										}
									}), /* @__PURE__ */ C("div", {
										className: "mt-2 flex justify-end",
										children: /* @__PURE__ */ C("button", {
											type: "submit",
											disabled: !Ee.trim(),
											className: "rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40",
											children: /* @__PURE__ */ C(z, { id: "NBdIgR" })
										})
									})]
								})
							]
						}),
						k && /* @__PURE__ */ w("section", {
							className: "mb-3 mt-8 border-t border-line pt-6",
							children: [/* @__PURE__ */ w("div", {
								className: "flex items-center gap-1.5 text-xs font-semibold text-stone-700",
								children: [
									/* @__PURE__ */ C(Et, { className: "h-3.5 w-3.5 text-stone-400" }),
									/* @__PURE__ */ C(z, { id: "XJOV1Y" }),
									Me && /* @__PURE__ */ C("span", {
										className: "ml-auto text-[10px] font-normal text-stone-400",
										children: /* @__PURE__ */ C(z, { id: "Pwqkdw" })
									})
								]
							}), Fe ? /* @__PURE__ */ w("div", {
								className: "mt-2 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700",
								role: "alert",
								children: [/* @__PURE__ */ C("span", {
									className: "min-w-0 flex-1 truncate",
									children: Fe
								}), /* @__PURE__ */ w("button", {
									type: "button",
									onClick: () => ze((e) => e + 1),
									className: "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-red-500",
									children: [/* @__PURE__ */ C(Ae, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "6gRgw8" })]
								})]
							}) : Me ? /* @__PURE__ */ w("div", {
								className: "mt-2 space-y-2",
								"aria-label": W._({ id: "-0gKc0" }),
								children: [/* @__PURE__ */ C("div", { className: "h-10 animate-pulse rounded-lg bg-stone-100" }), /* @__PURE__ */ C("div", { className: "h-10 animate-pulse rounded-lg bg-stone-100" })]
							}) : ke.length === 0 ? /* @__PURE__ */ C("p", {
								className: "mt-2 text-xs text-stone-400",
								children: /* @__PURE__ */ C(z, { id: "aXFOuf" })
							}) : /* @__PURE__ */ C("ul", {
								className: "mt-2 space-y-2",
								children: ke.map((e, t) => /* @__PURE__ */ C(Th, { event: e }, e.id ?? `${e.at}-${t}`))
							})]
						})
					]
				}), /* @__PURE__ */ w("aside", {
					className: "max-h-[46%] shrink-0 overflow-y-auto border-t border-line bg-stone-50/70 px-5 py-5 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0",
					children: [
						/* @__PURE__ */ C("h2", {
							className: "text-xs font-semibold text-stone-800",
							children: /* @__PURE__ */ C(z, { id: "l_UFPv" })
						}),
						/* @__PURE__ */ w("div", {
							className: "mt-4 space-y-1",
							children: [
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(Rt, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "wwu18a" }),
									children: /* @__PURE__ */ C(vh, {
										value: ce.icon,
										onChange: (e) => ht({ icon: e }, !0),
										disabled: P,
										portalClassName: M
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(pn, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "uAQUqI" }),
									children: /* @__PURE__ */ C(_h, {
										value: ce.columnKey,
										options: n,
										onChange: (e) => ht({ columnKey: e }, !0),
										disabled: P,
										portalClassName: M
									})
								}),
								r && /* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(pn, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "fVlS4-" }),
									children: /* @__PURE__ */ C(_h, {
										value: ce.swimlaneKey ?? "",
										options: r,
										onChange: (e) => ht({ swimlaneKey: e || null }, !0),
										disabled: i || P,
										portalClassName: M
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(Bt, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "1hKEom" }),
									children: /* @__PURE__ */ C(_h, {
										value: ce.priority ?? "none",
										options: Bn.map((e) => ({
											value: e,
											label: e
										})),
										onChange: (e) => ht({ priority: e }, !0),
										disabled: P,
										portalClassName: M
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(Tn, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "ojKCLU" }),
									children: a ? /* @__PURE__ */ C(_h, {
										value: ce.assignee ?? "",
										options: [{
											value: "",
											label: W._({ id: "EbMPZJ" })
										}, ...a],
										onChange: (e) => ht({ assignee: e || null }, !0),
										disabled: P,
										portalClassName: M
									}) : /* @__PURE__ */ C("input", {
										className: `${hh} w-full`,
										value: ce.assignee ?? "",
										placeholder: "—",
										readOnly: P,
										onChange: (e) => ht({ assignee: e.target.value })
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(nt, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "tXkhj_" }),
									children: /* @__PURE__ */ C("input", {
										type: "date",
										"aria-label": W._({ id: "tXkhj_" }),
										className: `${hh} w-full read-only:cursor-default read-only:bg-stone-50 read-only:opacity-70`,
										value: ce.start ?? "",
										readOnly: P,
										onChange: (e) => ht({ start: e.target.value || null }, !0)
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(nt, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "Gpfctt" }),
									children: /* @__PURE__ */ C("input", {
										type: "date",
										"aria-label": W._({ id: "Gpfctt" }),
										className: `${hh} w-full read-only:cursor-default read-only:bg-stone-50 read-only:opacity-70`,
										value: ce.due ?? "",
										readOnly: P,
										onChange: (e) => ht({ due: e.target.value || null }, !0)
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(Xe, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "_kpR4w" }),
									children: /* @__PURE__ */ C("input", {
										type: "date",
										"aria-label": W._({ id: "_kpR4w" }),
										className: `${hh} w-full read-only:cursor-default read-only:bg-stone-50 read-only:opacity-70`,
										value: ce.reminder ?? "",
										readOnly: P,
										onChange: (e) => ht({ reminder: e.target.value || null }, !0)
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(we, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "RS0o7b" }),
									children: /* @__PURE__ */ C(_h, {
										value: ce.archived ? "archived" : "active",
										options: [{
											value: "active",
											label: W._({ id: "F6pfE9" })
										}, {
											value: "archived",
											label: W._({ id: "TdfEV7" })
										}],
										onChange: (e) => ht({ archived: e === "archived" }, !0),
										disabled: P,
										portalClassName: M
									})
								}),
								/* @__PURE__ */ C(Eh, {
									icon: /* @__PURE__ */ C(yn, { className: "h-4 w-4" }),
									label: /* @__PURE__ */ C(z, { id: "OYHzN1" }),
									children: o ? /* @__PURE__ */ C(yh, {
										value: _t,
										options: o.map((e) => ({
											label: e.label,
											color: e.color
										})),
										onChange: (e) => ht({ tags: e.map((e) => o.find((t) => t.label === e) ?? { label: e }) }, !0),
										disabled: P,
										portalClassName: M
									}) : /* @__PURE__ */ C("input", {
										className: `${hh} w-full`,
										value: _t.join(", "),
										placeholder: W._({ id: "S5Qbb1" }),
										readOnly: P,
										onChange: (e) => ht({ tags: e.target.value.split(",").map((e) => e.trim()).filter(Boolean).map((e) => ({ label: e })) })
									})
								})
							]
						}),
						(s?.length || c) && /* @__PURE__ */ w("div", {
							className: "mt-6 border-t border-line pt-5",
							children: [/* @__PURE__ */ C("h3", {
								className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400",
								children: /* @__PURE__ */ C(z, { id: "oPwQt4" })
							}), /* @__PURE__ */ w("div", {
								className: "mt-2 space-y-2",
								children: [s?.map((e) => /* @__PURE__ */ w("label", {
									className: "block",
									children: [/* @__PURE__ */ C("span", {
										className: "mb-1 block truncate text-[11px] text-brand-gray",
										title: e.label,
										children: e.label
									}), /* @__PURE__ */ C("input", {
										type: e.type === "number" ? "number" : e.type === "date" ? "date" : "text",
										className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
										value: ce.custom?.[e.key] ?? "",
										readOnly: P,
										onChange: (t) => ht({ custom: {
											...ce.custom ?? {},
											[e.key]: t.target.value
										} }, e.type === "date" || e.type === "number")
									})]
								}, e.key)), c && !P && /* @__PURE__ */ C("form", {
									onSubmit: (e) => {
										e.preventDefault();
										let t = te.trim();
										t && (c(t), V(""));
									},
									children: /* @__PURE__ */ C("input", {
										className: "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand w-full",
										placeholder: W._({ id: "yEbJGs" }),
										value: te,
										onChange: (e) => V(e.target.value)
									})
								})]
							})]
						}),
						u && /* @__PURE__ */ w("div", {
							className: "mt-6 border-t border-line pt-5",
							children: [/* @__PURE__ */ C("h3", {
								className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400",
								children: /* @__PURE__ */ C(z, { id: "g87L9j" })
							}), /* @__PURE__ */ w("div", {
								className: "mt-2 space-y-2",
								children: [
									/* @__PURE__ */ C(Dh, {
										label: /* @__PURE__ */ C(z, { id: "--lIxB" }),
										children: jt("blockedBy")
									}),
									/* @__PURE__ */ C(Dh, {
										label: /* @__PURE__ */ C(z, { id: "7s3WlU" }),
										children: jt("blocks")
									}),
									/* @__PURE__ */ C(Dh, {
										label: /* @__PURE__ */ C(z, { id: "hh4sEG" }),
										children: jt("relates")
									}),
									/* @__PURE__ */ C(Dh, {
										label: /* @__PURE__ */ C(z, { id: "sujToP" }),
										children: /* @__PURE__ */ C(_h, {
											value: At(ce.parent ?? ""),
											options: [{
												value: "",
												label: "—"
											}, ...kt],
											onChange: (e) => ht({ parent: e || null }, !0),
											disabled: P,
											portalClassName: M
										})
									})
								]
							})]
						}),
						N != null && N !== !1 && N !== "" && /* @__PURE__ */ C("section", {
							"aria-label": W._({ id: "fOP7Wy" }),
							className: "mt-6 border-t border-line pt-5",
							children: N
						})
					]
				})]
			})
		]
	});
}
function xh(e) {
	if (e == null || e === "") return "—";
	if (typeof e == "string") return e;
	if (typeof e == "number" || typeof e == "boolean") return String(e);
	try {
		let t = JSON.stringify(e);
		return t.length > 96 ? `${t.slice(0, 93)}…` : t;
	} catch {
		return String(e);
	}
}
function Sh(e) {
	return {
		created: W._({ id: "d-F6q9" }),
		updated: W._({ id: "-b7T3G" }),
		archived: W._({ id: "TdfEV7" }),
		restored: W._({ id: "o8va6N" }),
		"card.created": W._({ id: "Z801fH" }),
		"card.updated": W._({ id: "b1MkzY" }),
		"card.deleted": W._({ id: "6_Ns5U" }),
		"card.status_changed": W._({ id: "A_X9M1" }),
		"card.assignee_changed": W._({ id: "lujQxb" }),
		"card.schedule_changed": W._({ id: "Evdel1" }),
		"card.labels_changed": W._({ id: "7z2Od5" }),
		"card.dependencies_changed": W._({ id: "CdL7Vl" }),
		"card.archived": W._({ id: "4WPwlg" }),
		"card.restored": W._({ id: "8cwUrg" }),
		"comment.created": W._({ id: "yp6eeC" }),
		"comment.updated": W._({ id: "yXjcFl" }),
		"comment.deleted": W._({ id: "sPHzr3" }),
		"comment.resolved": W._({ id: "-AW71f" }),
		"comment.reopened": W._({ id: "_0G8xR" }),
		"mention.created": W._({ id: "-MNaMX" })
	}[e] ?? e;
}
function Ch(e) {
	return {
		title: W._({ id: "MHrjPM" }),
		notes: W._({ id: "Nu4oKW" }),
		status: W._({ id: "uAQUqI" }),
		column_key: W._({ id: "uAQUqI" }),
		swimlane_key: W._({ id: "fVlS4-" }),
		priority: W._({ id: "1hKEom" }),
		assignee: W._({ id: "ojKCLU" }),
		labels: W._({ id: "h8DugX" }),
		tags: W._({ id: "h8DugX" }),
		start: W._({ id: "WAjFYI" }),
		start_date: W._({ id: "WAjFYI" }),
		due: W._({ id: "XicmhT" }),
		due_date: W._({ id: "XicmhT" }),
		reminder: W._({ id: "_kpR4w" }),
		archived: W._({ id: "TdfEV7" }),
		blocked_by: W._({ id: "--lIxB" }),
		blocks: W._({ id: "7s3WlU" }),
		relates: W._({ id: "DXbQMt" }),
		parent: W._({ id: "CdZ3-n" }),
		dependencies: W._({ id: "xHe_7h" })
	}[e] ?? e.replace(/_/g, " ");
}
function wh(e) {
	return e.label ? e.label : {
		desktop: "Desktop",
		web: "Web",
		mcp: "MCP",
		system: "System"
	}[e.kind.toLowerCase()] ?? e.kind;
}
function Th({ event: e }) {
	let t = e.actor?.label || e.by || W._({ id: "PVNHB1" }), n = e.actor?.kind === "agent" ? "bg-sky-50 text-sky-700" : e.actor?.kind === "system" ? "bg-stone-100 text-stone-600" : "bg-brand-soft text-brand-dark";
	return /* @__PURE__ */ w("li", {
		className: "rounded-lg border border-line bg-stone-50/60 px-3 py-2.5 text-xs",
		children: [/* @__PURE__ */ w("div", {
			className: "flex flex-wrap items-center gap-1.5",
			children: [
				/* @__PURE__ */ C("span", {
					className: "font-semibold text-stone-700",
					children: Sh(e.kind)
				}),
				/* @__PURE__ */ C("span", {
					className: `rounded-full px-2 py-0.5 text-[10px] font-medium ${n}`,
					children: t
				}),
				e.client && /* @__PURE__ */ C("span", {
					className: "rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[10px] text-stone-500",
					children: wh(e.client)
				}),
				e.token?.label && /* @__PURE__ */ C("span", {
					className: "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700",
					children: e.token.label
				}),
				/* @__PURE__ */ C("time", {
					className: "ml-auto whitespace-nowrap text-[10px] text-stone-400",
					dateTime: e.at,
					children: e.at.slice(0, 16)
				})
			]
		}), !!e.changes?.length && /* @__PURE__ */ C("dl", {
			className: "mt-2 space-y-1 border-l-2 border-stone-200 pl-2",
			children: e.changes.map((e, t) => /* @__PURE__ */ w("div", {
				className: "grid grid-cols-[minmax(4.5rem,0.6fr)_minmax(0,1fr)] gap-2 text-[11px]",
				children: [/* @__PURE__ */ C("dt", {
					className: "truncate font-medium capitalize text-brand-gray",
					title: e.field,
					children: Ch(e.field)
				}), /* @__PURE__ */ w("dd", {
					className: "flex min-w-0 items-center gap-1 text-stone-500",
					children: [
						/* @__PURE__ */ C("code", {
							className: "max-w-[42%] truncate rounded bg-white px-1 py-0.5",
							children: xh(e.before)
						}),
						/* @__PURE__ */ C(vt, { className: "h-3 w-3 shrink-0 text-stone-300" }),
						/* @__PURE__ */ C("code", {
							className: "min-w-0 truncate rounded bg-white px-1 py-0.5 text-stone-700",
							children: xh(e.after)
						})
					]
				})]
			}, `${e.field}-${t}`))
		})]
	});
}
function Eh({ icon: e, label: t, children: n }) {
	return /* @__PURE__ */ w("div", {
		className: "grid min-h-10 grid-cols-[88px_minmax(0,1fr)] items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white",
		children: [/* @__PURE__ */ w("span", {
			className: "flex min-w-0 items-center gap-2 text-xs text-brand-gray",
			children: [/* @__PURE__ */ C("span", {
				className: "shrink-0 text-stone-400",
				children: e
			}), /* @__PURE__ */ C("span", {
				className: "truncate",
				children: t
			})]
		}), /* @__PURE__ */ C("div", {
			className: "min-w-0",
			children: n
		})]
	});
}
function Dh({ label: e, children: t }) {
	return /* @__PURE__ */ w("label", {
		className: "block",
		children: [/* @__PURE__ */ C("span", {
			className: "mb-1 block text-[11px] text-brand-gray",
			children: e
		}), t]
	});
}
var Oh = [
	"👍",
	"❤️",
	"🎉",
	"😄",
	"👀",
	"✅"
];
function kh({ body: e, renderMarkdownToHtml: t }) {
	let n = y(null);
	return f(() => {
		if (!t) return;
		let r = !1;
		return t(e).then((e) => {
			!r && n.current && (n.current.innerHTML = e);
		}), () => {
			r = !0;
		};
	}, [e, t]), t ? /* @__PURE__ */ C("div", {
		ref: n,
		className: "comment-markdown mt-0.5 text-stone-700"
	}) : /* @__PURE__ */ C("div", {
		className: "mt-0.5 whitespace-pre-wrap text-stone-700",
		children: e
	});
}
function Ah({ comment: e, currentUser: t, onEdit: n, onDelete: r, onReact: i, extraActions: a, renderMarkdownToHtml: o }) {
	let [s, c] = b(!1), [l, u] = b(e.body), [d, f] = b(!1), p = !!t && e.author === t, m = async () => {
		let t = l.trim();
		!t || !n || (await n(e.id, t), c(!1));
	};
	return /* @__PURE__ */ w("div", {
		className: "group/comment",
		children: [
			/* @__PURE__ */ w("div", {
				className: "flex items-baseline gap-2",
				children: [
					/* @__PURE__ */ C("span", {
						className: "font-medium text-stone-700",
						children: e.author ?? /* @__PURE__ */ C(z, { id: "C6-ZRl" })
					}),
					/* @__PURE__ */ C("span", {
						className: "text-stone-400",
						children: e.createdAt.slice(0, 16)
					}),
					e.updatedAt && e.updatedAt !== e.createdAt && /* @__PURE__ */ C("span", {
						className: "text-[10px] text-stone-300",
						children: /* @__PURE__ */ C(z, { id: "k4b5_X" })
					}),
					/* @__PURE__ */ w("span", {
						className: "ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/comment:opacity-100",
						children: [
							i && /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => f((e) => !e),
								title: W._({ id: "9OEgyT" }),
								className: "rounded p-0.5 text-stone-300 hover:text-amber-500",
								children: /* @__PURE__ */ C(Rt, { className: "h-3.5 w-3.5" })
							}),
							a,
							p && n && !s && /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => {
									u(e.body), c(!0);
								},
								title: W._({ id: "rF8SEQ" }),
								className: "rounded p-0.5 text-stone-300 hover:text-brand-dark",
								children: /* @__PURE__ */ C(nn, { className: "h-3.5 w-3.5" })
							}),
							p && r && /* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => r(e.id),
								title: W._({ id: "njJFtc" }),
								className: "rounded p-0.5 text-stone-300 hover:text-red-600",
								children: /* @__PURE__ */ C(kn, { className: "h-3.5 w-3.5" })
							})
						]
					})
				]
			}),
			s ? /* @__PURE__ */ w("div", {
				className: "mt-1",
				children: [/* @__PURE__ */ C("textarea", {
					className: "w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none",
					rows: 2,
					value: l,
					autoFocus: !0,
					onChange: (e) => u(e.target.value),
					onKeyDown: (e) => {
						e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), m()), e.key === "Escape" && c(!1);
					}
				}), /* @__PURE__ */ w("div", {
					className: "mt-1 flex justify-end gap-1",
					children: [/* @__PURE__ */ C("button", {
						type: "button",
						className: "rounded px-2 py-0.5 text-xs text-stone-500 hover:bg-stone-100",
						onClick: () => c(!1),
						children: /* @__PURE__ */ C(z, { id: "dEgA5A" })
					}), /* @__PURE__ */ C("button", {
						type: "button",
						className: "rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40",
						disabled: !l.trim(),
						onClick: () => void m(),
						children: /* @__PURE__ */ C(z, { id: "tfDRzk" })
					})]
				})]
			}) : /* @__PURE__ */ C(kh, {
				body: e.body,
				renderMarkdownToHtml: o
			}),
			((e.reactions?.length ?? 0) > 0 || d) && /* @__PURE__ */ w("div", {
				className: "mt-1 flex flex-wrap items-center gap-1",
				children: [(e.reactions ?? []).map((t) => /* @__PURE__ */ w("button", {
					type: "button",
					disabled: !i,
					onClick: () => void i?.(e.id, t.emoji),
					className: `inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${t.mine ? "border-brand/40 bg-brand-soft/40 text-brand-dark" : "border-stone-200 bg-white text-stone-600"}`,
					title: t.mine ? W._({ id: "KeYrQ5" }) : W._({ id: "UDb2YD" }),
					children: [
						t.emoji,
						" ",
						t.count
					]
				}, t.emoji)), d && i && /* @__PURE__ */ C("span", {
					className: "inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-white px-1 py-0.5",
					children: Oh.map((t) => /* @__PURE__ */ C("button", {
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
function jh({ root: e, replies: t, currentUser: n, canReply: r, onReply: i, onEdit: a, onDelete: o, onReact: s, onResolve: c, renderMarkdownToHtml: l }) {
	let [u, d] = b(!1), [f, p] = b(""), [m, h] = b(!1), g = !!e.resolvedAt, _ = async () => {
		let e = f.trim();
		!e || !i || (await i(e), p(""), d(!1));
	};
	return g && !m ? /* @__PURE__ */ C("li", {
		className: "rounded-lg border border-stone-100 bg-stone-50/40 text-xs",
		children: /* @__PURE__ */ w("button", {
			type: "button",
			className: "flex w-full items-center gap-2 p-2 text-left text-stone-400 hover:text-stone-600",
			onClick: () => h(!0),
			title: W._({ id: "pKKcSl" }),
			children: [
				/* @__PURE__ */ C(ut, { className: "h-3.5 w-3.5 shrink-0 text-emerald-500" }),
				/* @__PURE__ */ w("span", {
					className: "min-w-0 flex-1 truncate",
					children: [
						/* @__PURE__ */ C(z, { id: "O6H89R" }),
						" · ",
						e.body.split("\n")[0]
					]
				}),
				t.length > 0 && /* @__PURE__ */ C("span", {
					className: "shrink-0 text-stone-300",
					children: t.length
				})
			]
		})
	}) : /* @__PURE__ */ w("li", {
		className: `rounded-lg border p-2 text-xs ${g ? "border-emerald-100 bg-emerald-50/30" : "border-stone-100 bg-stone-50/60"}`,
		children: [
			/* @__PURE__ */ C(Ah, {
				comment: e,
				currentUser: n,
				onEdit: a,
				onDelete: o,
				onReact: s,
				renderMarkdownToHtml: l,
				extraActions: /* @__PURE__ */ w(S, { children: [r && i && /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => d((e) => !e),
					title: W._({ id: "ImOQa9" }),
					className: "rounded p-0.5 text-stone-300 hover:text-brand-dark",
					children: /* @__PURE__ */ C(Be, { className: "h-3.5 w-3.5" })
				}), c && /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void c(!g),
					title: g ? W._({ id: "QmZYQP" }) : W._({ id: "9OH3W0" }),
					className: `rounded p-0.5 ${g ? "text-emerald-500 hover:text-stone-400" : "text-stone-300 hover:text-emerald-600"}`,
					children: /* @__PURE__ */ C(ut, { className: "h-3.5 w-3.5" })
				})] })
			}),
			t.length > 0 && /* @__PURE__ */ C("ul", {
				className: "mt-2 space-y-2 border-l-2 border-stone-100 pl-2",
				children: t.map((e) => /* @__PURE__ */ C("li", { children: /* @__PURE__ */ C(Ah, {
					comment: e,
					currentUser: n,
					onEdit: a,
					onDelete: o,
					onReact: s,
					renderMarkdownToHtml: l
				}) }, e.id))
			}),
			g && /* @__PURE__ */ C("button", {
				type: "button",
				className: "mt-1.5 text-[10px] text-stone-400 hover:text-stone-600",
				onClick: () => h(!1),
				children: /* @__PURE__ */ C(z, { id: "66g_UW" })
			}),
			u && /* @__PURE__ */ w("form", {
				className: "mt-2 border-l-2 border-stone-100 pl-2",
				onSubmit: (e) => {
					e.preventDefault(), _();
				},
				children: [/* @__PURE__ */ C("textarea", {
					className: "w-full resize-y rounded-lg border border-stone-200 p-2 text-xs text-stone-800 focus:border-brand focus:outline-none",
					rows: 2,
					autoFocus: !0,
					placeholder: W._({ id: "MmYpxT" }),
					value: f,
					onChange: (e) => p(e.target.value),
					onKeyDown: (e) => {
						e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), _()), e.key === "Escape" && d(!1);
					}
				}), /* @__PURE__ */ C("div", {
					className: "mt-1 flex justify-end",
					children: /* @__PURE__ */ C("button", {
						type: "submit",
						disabled: !f.trim(),
						className: "rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-white disabled:opacity-40",
						children: /* @__PURE__ */ C(z, { id: "ImOQa9" })
					})
				})]
			})
		]
	});
}
//#endregion
//#region ../../shared/lib/boardViewState.ts
var Mh = /* @__PURE__ */ new Set([
	"board",
	"table",
	"calendar",
	"backlog",
	"gantt"
]), Nh = /* @__PURE__ */ new Set([
	"status",
	"priority",
	"assignee"
]), Ph = /* @__PURE__ */ new Set([
	"status",
	"priority",
	"assignee",
	"custom"
]), Fh = /* @__PURE__ */ new Set(["month", "agenda"]), Ih = /* @__PURE__ */ new Set([
	"manual",
	"due",
	"priority",
	"title"
]), Lh = /* @__PURE__ */ new Set([
	"all",
	"my-work",
	"inbox"
]), Rh = /* @__PURE__ */ new Set([
	"overdue",
	"today",
	"nextSevenDays",
	"none"
]), zh = /* @__PURE__ */ new Set([
	"active",
	"archived",
	"all"
]);
function Bh(e) {
	if (!Array.isArray(e)) return;
	let t = e.filter((e) => typeof e == "string");
	return t.length > 0 ? [...new Set(t)] : void 0;
}
function Vh(e) {
	if (!e || typeof e != "object" || Array.isArray(e)) return;
	let t = e, n = {};
	return n.priorities = Bh(t.priorities), n.assignees = Bh(t.assignees), n.tags = Bh(t.tags), typeof t.due == "string" && Rh.has(t.due) && (n.due = t.due), t.blocked === !0 && (n.blocked = !0), t.mine === !0 && (n.mine = !0), typeof t.archived == "string" && zh.has(t.archived) && (n.archived = t.archived), t.missingRow === !0 && (n.missingRow = !0), Object.values(n).some((e) => e !== void 0) ? n : void 0;
}
function Hh(e) {
	let t = { version: 1 };
	if (!e || typeof e != "object" || Array.isArray(e)) return t;
	let n = e;
	return typeof n.viewType == "string" && Mh.has(n.viewType) && (t.viewType = n.viewType), typeof n.groupBy == "string" && Nh.has(n.groupBy) && (t.groupBy = n.groupBy), typeof n.swimlaneBy == "string" && Ph.has(n.swimlaneBy) && (t.swimlaneBy = n.swimlaneBy), typeof n.calendarMode == "string" && Fh.has(n.calendarMode) && (t.calendarMode = n.calendarMode), typeof n.sortBy == "string" && Ih.has(n.sortBy) && (t.sortBy = n.sortBy), typeof n.scope == "string" && Lh.has(n.scope) && (t.scope = n.scope), t.filters = Vh(n.filters), t.collapsedGroupKeys = Bh(n.collapsedGroupKeys), t.dismissedInboxItemKeys = Bh(n.dismissedInboxItemKeys), t;
}
function Uh(e) {
	return Hh({
		version: 1,
		viewType: e.viewType,
		groupBy: e.groupBy,
		swimlaneBy: e.swimlaneBy,
		calendarMode: e.calendarMode,
		scope: "all",
		sortBy: "manual",
		filters: { archived: "active" }
	});
}
function Wh(e, t) {
	return Hh({
		...e,
		...t,
		version: 1
	});
}
function Gh(e) {
	let [t, n, r] = e.split("-").map(Number);
	return Date.UTC(t, n - 1, r);
}
function Kh(e) {
	return new Date(e).toISOString().slice(0, 10);
}
function qh(e) {
	return typeof e == "string" && Nr(e);
}
function Jh(e, t) {
	return Kh(Gh(e) + t * 864e5);
}
function Yh(e, t) {
	return Math.round((Gh(t) - Gh(e)) / 864e5);
}
function Xh(e, t, n) {
	let r = [
		t?.startDate,
		n,
		...e.flatMap((e) => [e.start, e.due])
	].filter(qh), i = [
		t?.targetDate,
		Jh(n, 30),
		...e.flatMap((e) => [e.start, e.due])
	].filter(qh), a = r.sort()[0] ?? n, o = i.sort(), s = o[o.length - 1] ?? Jh(n, 30);
	if (Yh(a, s) < 13 && (s = Jh(a, 13)), Yh(a, s) + 1 > 548) {
		let e = qh(t?.startDate) ? t.startDate : null;
		a = e && Math.abs(Yh(e, n)) < 548 / 2 && e < n ? e : Jh(n, -30), s = Jh(a, 547);
	}
	return {
		start: a,
		end: s,
		days: Yh(a, s) + 1
	};
}
function Zh(e, t) {
	let n = qh(e.start) ? e.start : qh(e.due) ? e.due : null, r = qh(e.due) ? e.due : n;
	if (!n || !r || r < n || r < t.start || n > t.end) return null;
	let i = n < t.start ? t.start : n, a = r > t.end ? t.end : r;
	return {
		card: e,
		start: n,
		end: r,
		offset: Yh(t.start, i),
		span: Yh(i, a) + 1,
		milestone: !qh(e.start) && qh(e.due)
	};
}
function Qh(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) {
		if (t.archived) continue;
		let e = n.get(t.columnKey) ?? [];
		e.push(t), n.set(t.columnKey, e);
	}
	let r = t.map((e) => ({
		key: e.key,
		name: e.name,
		cards: [...n.get(e.key) ?? []]
	})), i = new Set(t.map((e) => e.key)), a = e.filter((e) => !e.archived && !i.has(e.columnKey));
	return a.length > 0 && r.push({
		key: "",
		name: "Unassigned",
		cards: a
	}), r;
}
function $h(e, t) {
	let n = (qh(e.due) ? e.due : "9999-99-99").localeCompare(qh(t.due) ? t.due : "9999-99-99");
	if (n !== 0) return n;
	let r = (Hn[e.priority || "none"] ?? 5) - (Hn[t.priority || "none"] ?? 5);
	return r === 0 ? e.position - t.position || e.title.localeCompare(t.title) : r;
}
function eg(e, t, n, r, i) {
	let a = t?.trim().toLowerCase();
	if (!a) return [];
	let o = (e) => r && qh(e.due) && e.due < r ? 0 : r && qh(e.due) && e.due === r ? 1 : i?.has(e.id) ? 2 : 3;
	return e.filter((e) => !e.archived && e.columnKey !== n && e.assignee?.trim().toLowerCase() === a).sort((e, t) => o(e) - o(t) || $h(e, t));
}
function tg(e) {
	if (!e) return [];
	let t = e.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ").replace(/`[^`\n]*`/g, " ").replace(/!?\[[^\]]*\]\([^)]*\)/g, " "), n = /* @__PURE__ */ new Set();
	for (let e of t.matchAll(/(^|[\s([{>])@([a-zA-Z0-9][a-zA-Z0-9._-]{0,63})\b/g)) n.add(e[2].toLowerCase());
	return [...n];
}
function ng(e, t) {
	let n = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), r = RegExp(`(^|[\\s([{>])@${n}(?=$|[^a-zA-Z0-9._-])`, "i"), i = (e ?? "").replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ").replace(/`[^`\n]*`/g, " ").replace(/!?\[[^\]]*\]\([^)]*\)/g, " ").split("\n").map((e) => e.trim().replace(/\s+/g, " ")).filter((e) => r.test(e)).join("\n"), a = 2166136261;
	for (let e = 0; e < i.length; e += 1) a ^= i.charCodeAt(e), a = Math.imul(a, 16777619);
	return (a >>> 0).toString(36);
}
function rg(e) {
	let t = e.currentUser?.trim().toLowerCase();
	if (!t) return [];
	let n = e.dismissedKeys ?? /* @__PURE__ */ new Set(), r = [];
	for (let i of e.cards) {
		if (i.archived) continue;
		if (tg(i.notes).includes(t)) {
			let e = `${i.id}:mention:${t}:${ng(i.notes, t)}`;
			n.has(e) || r.push({
				key: e,
				cardId: i.id,
				kind: "mention",
				title: i.title,
				summary: `Mentioned @${t}`
			});
		}
		if (i.columnKey === e.doneColumn) continue;
		if (qh(i.reminder) && i.reminder <= e.today) {
			let e = `${i.id}:reminder:${i.reminder}`;
			n.has(e) || r.push({
				key: e,
				cardId: i.id,
				kind: "reminder",
				title: i.title,
				summary: "Reminder due",
				date: i.reminder
			});
		}
		let a = i.assignee?.trim().toLowerCase() === t;
		if (a && qh(i.due) && i.due <= e.today) {
			let t = `${i.id}:due:${i.due}`;
			n.has(t) || r.push({
				key: t,
				cardId: i.id,
				kind: "due",
				title: i.title,
				summary: i.due < e.today ? "Overdue" : "Due today",
				date: i.due
			});
		}
		if (a && e.blockedCardIds?.has(i.id)) {
			let t = [...e.blockerCardIds?.get(i.id) ?? []].sort().join(",") || "unknown", a = `${i.id}:blocked:${t}`;
			n.has(a) || r.push({
				key: a,
				cardId: i.id,
				kind: "blocked",
				title: i.title,
				summary: "Work is blocked"
			});
		}
	}
	return r.sort((e, t) => (e.date || "9999-99-99").localeCompare(t.date || "9999-99-99") || e.title.localeCompare(t.title));
}
function ig(e, t) {
	let n = new Set(t.map((e) => e.key));
	return e.filter((e) => n.has(e));
}
//#endregion
//#region ../../shared/components/board/BoardFilterPopover.tsx
function ag(e, t) {
	let n = new Set(e ?? []);
	return n.has(t) ? n.delete(t) : n.add(t), n.size > 0 ? [...n] : void 0;
}
function og({ selected: e, children: t, onClick: n, selectionRole: r = "checkbox" }) {
	return /* @__PURE__ */ w("button", {
		type: "button",
		role: r,
		"aria-checked": e,
		onClick: n,
		className: `flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition ${e ? "bg-brand-soft/70 font-medium text-brand-dark" : "text-stone-600 hover:bg-stone-50"}`,
		children: [/* @__PURE__ */ C("span", {
			className: `flex h-4 w-4 shrink-0 items-center justify-center border ${r === "radio" ? "rounded-full" : "rounded"} ${e ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`,
			"aria-hidden": !0,
			children: e && /* @__PURE__ */ C(ft, { className: "h-3 w-3" })
		}), /* @__PURE__ */ C("span", {
			className: "min-w-0 flex-1 truncate",
			children: t
		})]
	});
}
function sg({ title: e, children: t }) {
	return /* @__PURE__ */ w("section", {
		className: "border-t border-line px-3 py-3 first:border-t-0",
		children: [/* @__PURE__ */ C("h3", {
			className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-gray",
			children: e
		}), t]
	});
}
function cg(e) {
	return e === "overdue" ? W._({ id: "ddrz1m" }) : e === "today" ? W._({ id: "1iShX0" }) : e === "nextSevenDays" ? W._({ id: "3CIp19" }) : W._({ id: "VXh9CK" });
}
function lg({ filters: e, onChange: t, assignees: r, tags: i, currentUser: a, visibleCount: o, totalCount: s, portalClassName: c }) {
	let l = Er(e), u = c ? ` ${c}` : "", d = (n, r) => t({
		...e,
		[n]: r
	}), f = (n) => {
		let r = { ...e };
		delete r[n], t(r);
	}, p = [];
	if (e.priorities?.length) {
		let t = e.priorities.map((e) => e === "none" ? W._({ id: "-X4ual" }) : e);
		p.push({
			key: "priorities",
			label: W._({
				id: "-3Qbcm",
				values: { 0: t.join(", ") }
			})
		});
	}
	return e.assignees?.length && p.push({
		key: "assignees",
		label: W._({
			id: "vJvZPY",
			values: { 0: e.assignees.map((e) => e || W._({ id: "EbMPZJ" })).join(", ") }
		})
	}), e.tags?.length && p.push({
		key: "tags",
		label: W._({
			id: "5Oy0YM",
			values: { 0: e.tags.join(", ") }
		})
	}), e.due && p.push({
		key: "due",
		label: cg(e.due)
	}), e.blocked && p.push({
		key: "blocked",
		label: W._({ id: "32TndD" })
	}), e.mine && p.push({
		key: "mine",
		label: W._({ id: "YDa2KG" })
	}), e.archived && e.archived !== "active" && p.push({
		key: "archived",
		label: e.archived === "archived" ? W._({ id: "gWlA7i" }) : W._({ id: "Kfl94N" })
	}), e.missingRow && p.push({
		key: "missingRow",
		label: W._({ id: "WSbuWy" })
	}), /* @__PURE__ */ w(n, { children: [/* @__PURE__ */ w(Zm, {
		className: "relative",
		children: [/* @__PURE__ */ w(Km, {
			className: `inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition ${l > 0 ? "border-brand/40 bg-brand-soft/60 font-medium text-brand-dark" : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
			"aria-label": l > 0 ? W._({
				id: "obId50",
				values: { activeCount: l }
			}) : W._({ id: "cSev-j" }),
			children: [
				/* @__PURE__ */ C(Ht, { className: "h-3.5 w-3.5" }),
				/* @__PURE__ */ C(z, { id: "cSev-j" }),
				l > 0 && /* @__PURE__ */ C("span", {
					className: "rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white",
					children: l
				}),
				/* @__PURE__ */ C(mt, { className: "h-3 w-3 text-stone-400" })
			]
		}), /* @__PURE__ */ w(Ym, {
			anchor: "bottom start",
			className: `z-40 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-emerald-950/10 [--anchor-gap:6px] focus:outline-none${u}`,
			children: [/* @__PURE__ */ w("div", {
				className: "flex min-h-12 items-center gap-3 px-4",
				children: [/* @__PURE__ */ w("span", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ C("span", {
						className: "block text-xs font-semibold text-stone-800",
						children: /* @__PURE__ */ C(z, { id: "02N8r0" })
					}), /* @__PURE__ */ C("span", {
						className: "block text-[10px] text-brand-gray",
						children: /* @__PURE__ */ C(z, {
							id: "7pBic4",
							values: {
								visibleCount: o,
								totalCount: s
							}
						})
					})]
				}), l > 0 && /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => t({}),
					className: "rounded-lg px-2 py-1 text-[11px] font-medium text-brand-dark hover:bg-brand-soft",
					children: /* @__PURE__ */ C(z, { id: "yYxB17" })
				})]
			}), /* @__PURE__ */ w("div", {
				className: "max-h-[min(70vh,34rem)] overflow-y-auto",
				children: [
					/* @__PURE__ */ C(sg, {
						title: /* @__PURE__ */ C(z, { id: "1hKEom" }),
						children: /* @__PURE__ */ C("div", {
							className: "grid grid-cols-2 gap-1",
							children: Vn.map((t) => /* @__PURE__ */ C(og, {
								selected: e.priorities?.includes(t) ?? !1,
								onClick: () => d("priorities", ag(e.priorities, t)),
								children: t === "none" ? W._({ id: "-X4ual" }) : t
							}, t))
						})
					}),
					/* @__PURE__ */ C(sg, {
						title: /* @__PURE__ */ C(z, { id: "ojKCLU" }),
						children: /* @__PURE__ */ w("div", {
							className: "space-y-1",
							children: [
								a && /* @__PURE__ */ C(og, {
									selected: !!e.mine,
									onClick: () => d("mine", !e.mine || void 0),
									children: /* @__PURE__ */ w("span", {
										className: "inline-flex items-center gap-1.5",
										children: [/* @__PURE__ */ C(Cn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "YDa2KG" })]
									})
								}),
								/* @__PURE__ */ C(og, {
									selected: e.assignees?.includes("") ?? !1,
									onClick: () => d("assignees", ag(e.assignees, "")),
									children: /* @__PURE__ */ C(z, { id: "EbMPZJ" })
								}),
								r.map((t) => /* @__PURE__ */ C(og, {
									selected: e.assignees?.includes(t) ?? !1,
									onClick: () => d("assignees", ag(e.assignees, t)),
									children: t
								}, t))
							]
						})
					}),
					i.length > 0 && /* @__PURE__ */ C(sg, {
						title: /* @__PURE__ */ C(z, { id: "h8DugX" }),
						children: /* @__PURE__ */ C("div", {
							className: "space-y-1",
							children: i.map((t) => /* @__PURE__ */ C(og, {
								selected: e.tags?.includes(t) ?? !1,
								onClick: () => d("tags", ag(e.tags, t)),
								children: t
							}, t))
						})
					}),
					/* @__PURE__ */ C(sg, {
						title: /* @__PURE__ */ C(z, { id: "XicmhT" }),
						children: /* @__PURE__ */ C("div", {
							className: "grid grid-cols-2 gap-1",
							role: "radiogroup",
							"aria-label": W._({ id: "XicmhT" }),
							children: [
								"overdue",
								"today",
								"nextSevenDays",
								"none"
							].map((t) => /* @__PURE__ */ C(og, {
								selected: e.due === t,
								selectionRole: "radio",
								onClick: () => d("due", t),
								children: cg(t)
							}, t))
						})
					}),
					/* @__PURE__ */ w(sg, {
						title: /* @__PURE__ */ C(z, { id: "YFdnVT" }),
						children: [
							/* @__PURE__ */ C("div", {
								className: "mb-2 grid grid-cols-3 gap-1",
								role: "radiogroup",
								"aria-label": W._({ id: "28IjHv" }),
								children: [
									"active",
									"archived",
									"all"
								].map((t) => /* @__PURE__ */ C(og, {
									selected: (e.archived ?? "active") === t,
									selectionRole: "radio",
									onClick: () => d("archived", t),
									children: /* @__PURE__ */ w("span", {
										className: "inline-flex items-center gap-1",
										children: [/* @__PURE__ */ C(we, { className: "h-3.5 w-3.5" }), t === "active" ? W._({ id: "F6pfE9" }) : t === "archived" ? W._({ id: "TdfEV7" }) : W._({ id: "N40H-G" })]
									})
								}, t))
							}),
							/* @__PURE__ */ C(og, {
								selected: !!e.blocked,
								onClick: () => d("blocked", !e.blocked || void 0),
								children: /* @__PURE__ */ w("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ C(Xt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "9YTdO7" })]
								})
							}),
							e.missingRow && /* @__PURE__ */ C("div", {
								className: "mt-1",
								children: /* @__PURE__ */ C(og, {
									selected: !0,
									onClick: () => d("missingRow", void 0),
									children: /* @__PURE__ */ C(z, { id: "JPB7_s" })
								})
							})
						]
					})
				]
			})]
		})]
	}), p.map((e) => /* @__PURE__ */ w("button", {
		type: "button",
		onClick: () => f(e.key),
		title: W._({ id: "rn2_2V" }),
		"aria-label": W._({
			id: "rT-mCe",
			values: { 0: e.label }
		}),
		className: "inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-brand/20 bg-brand-soft/45 px-2 text-[11px] font-medium text-brand-dark hover:border-brand/40 hover:bg-brand-soft",
		children: [/* @__PURE__ */ C("span", {
			className: "truncate",
			children: e.label
		}), /* @__PURE__ */ C(kn, { className: "h-3 w-3 shrink-0" })]
	}, e.key))] });
}
//#endregion
//#region ../../shared/components/board/BoardTable.tsx
function ug({ cards: e, statusName: t, today: n, doneKey: r, selectedId: i, onSelect: a }) {
	let o = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-brand-gray", s = "px-3 py-2 align-middle", c = /* @__PURE__ */ C("span", {
		className: "text-stone-300",
		children: "—"
	});
	return /* @__PURE__ */ C("div", {
		className: "min-h-0 flex-1 overflow-auto p-4",
		children: /* @__PURE__ */ w("table", {
			className: "w-full border-collapse text-sm",
			children: [/* @__PURE__ */ C("thead", {
				className: "sticky top-0 bg-stone-50",
				children: /* @__PURE__ */ w("tr", {
					className: "border-b border-black/[0.08]",
					children: [
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "MHrjPM" })
						}),
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "uAQUqI" })
						}),
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "1hKEom" })
						}),
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "ojKCLU" })
						}),
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "Gpfctt" })
						}),
						/* @__PURE__ */ C("th", {
							className: o,
							children: /* @__PURE__ */ C(z, { id: "OYHzN1" })
						})
					]
				})
			}), /* @__PURE__ */ w("tbody", { children: [e.map((e) => {
				let o = Nr(e.due) && e.due < n && e.columnKey !== r;
				return /* @__PURE__ */ w("tr", {
					role: "button",
					tabIndex: 0,
					onClick: () => a(e),
					onKeyDown: (t) => {
						(t.key === "Enter" || t.key === " ") && (t.preventDefault(), a(e));
					},
					className: `cursor-pointer border-b border-black/[0.04] outline-none transition-colors hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${i === e.id ? "bg-brand-soft/40" : ""}`,
					children: [
						/* @__PURE__ */ C("td", {
							className: `${s} text-stone-800`,
							children: /* @__PURE__ */ w("span", {
								className: "flex items-center gap-1.5",
								children: [
									e.icon && /* @__PURE__ */ C("span", { children: e.icon }),
									/* @__PURE__ */ C("span", {
										className: "truncate",
										children: e.title
									}),
									(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ w("span", {
										className: `inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
										children: [
											/* @__PURE__ */ C(ut, { className: "h-3 w-3" }),
											e.taskDone,
											"/",
											e.taskTotal
										]
									})
								]
							})
						}),
						/* @__PURE__ */ C("td", {
							className: `${s} text-stone-600`,
							children: t(e.columnKey)
						}),
						/* @__PURE__ */ C("td", {
							className: s,
							children: e.priority && e.priority !== "none" ? /* @__PURE__ */ C("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Un[e.priority] ?? "bg-stone-100 text-stone-500"}`,
								children: e.priority
							}) : c
						}),
						/* @__PURE__ */ C("td", {
							className: `${s} text-stone-600`,
							children: e.assignee ? /* @__PURE__ */ w("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ C(Tn, { className: "h-3.5 w-3.5 text-brand-gray" }), e.assignee]
							}) : c
						}),
						/* @__PURE__ */ C("td", {
							className: s,
							children: e.due ? /* @__PURE__ */ w("span", {
								className: `inline-flex items-center gap-1 ${o ? "font-medium text-red-600" : "text-stone-600"}`,
								children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5" }), e.due]
							}) : c
						}),
						/* @__PURE__ */ C("td", {
							className: s,
							children: e.tags.length ? /* @__PURE__ */ C("span", {
								className: "flex flex-wrap gap-1",
								children: e.tags.map((e) => /* @__PURE__ */ w("span", {
									className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
									style: { backgroundColor: e.color ? `${e.color}22` : void 0 },
									children: [/* @__PURE__ */ C(yn, { className: "h-3 w-3" }), e.label]
								}, e.label))
							}) : c
						})
					]
				}, e.id);
			}), e.length === 0 && /* @__PURE__ */ C("tr", { children: /* @__PURE__ */ C("td", {
				colSpan: 6,
				className: "px-3 py-8 text-center text-sm text-stone-400",
				children: /* @__PURE__ */ C(z, { id: "Zot9XS" })
			}) })] })]
		})
	});
}
//#endregion
//#region ../../shared/components/board/BoardCalendar.tsx
function dg({ cards: e, today: t, doneKey: n, mode: r, onModeChange: i, selectedId: a, onSelect: o }) {
	let { i18n: s } = R(), c = s.locale || void 0, [l, u] = b(() => Pr()), d = Ir(e), [f, p] = l.split("-"), m = new Date(Number(f), Number(p) - 1, 1).toLocaleDateString(c, {
		year: "numeric",
		month: "long"
	}), h = _(() => Array.from({ length: 7 }, (e, t) => new Date(2023, 0, 1 + t).toLocaleDateString(c, { weekday: "short" })), [c]), g = (e) => Nr(e.due) && e.due < t && e.columnKey !== n, v = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 outline-none hover:border-brand/40 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand", y = (e) => `rounded-md px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand ${r === e ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`, x = (e, t) => {
		let n = g(e);
		return /* @__PURE__ */ w("button", {
			type: "button",
			onClick: () => o(e),
			title: e.title,
			className: `flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand ${a === e.id ? "bg-brand-soft/60" : "bg-stone-100/70 hover:bg-brand-soft/40"} ${n ? "text-red-600" : "text-stone-700"}`,
			children: [
				e.priority && e.priority !== "none" && /* @__PURE__ */ C("span", { className: `h-1.5 w-1.5 shrink-0 rounded-full ${Un[e.priority]?.split(" ")[0] ?? "bg-stone-300"}` }),
				e.icon && /* @__PURE__ */ C("span", {
					className: "shrink-0",
					children: e.icon
				}),
				/* @__PURE__ */ C("span", {
					className: "truncate",
					children: e.title
				}),
				!t && (e.taskTotal ?? 0) > 0 && /* @__PURE__ */ w("span", {
					className: "ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] text-stone-400",
					children: [
						/* @__PURE__ */ C(ut, { className: "h-2.5 w-2.5" }),
						e.taskDone,
						"/",
						e.taskTotal
					]
				})
			]
		}, e.id);
	}, T = /* @__PURE__ */ w("div", {
		className: "flex items-center gap-2 border-b border-black/[0.04] px-4 py-2",
		children: [r === "month" && /* @__PURE__ */ w(S, { children: [
			/* @__PURE__ */ C("button", {
				type: "button",
				className: v,
				title: W._({ id: "1xwZj_" }),
				"aria-label": W._({ id: "1xwZj_" }),
				onClick: () => u((e) => Fr(e, -1)),
				children: /* @__PURE__ */ C(gt, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ C("button", {
				type: "button",
				className: v,
				title: W._({ id: "g8JmSC" }),
				"aria-label": W._({ id: "g8JmSC" }),
				onClick: () => u((e) => Fr(e, 1)),
				children: /* @__PURE__ */ C(vt, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ C("span", {
				className: "min-w-[8rem] text-sm font-medium text-brand-dark",
				children: m
			}),
			/* @__PURE__ */ C("button", {
				type: "button",
				className: "rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				onClick: () => u(Pr()),
				children: /* @__PURE__ */ C(z, { id: "ecUA8p" })
			})
		] }), /* @__PURE__ */ w("div", {
			className: "ml-auto inline-flex items-center rounded-lg border border-stone-200 p-0.5",
			children: [/* @__PURE__ */ C("button", {
				type: "button",
				className: y("month"),
				onClick: () => i("month"),
				children: /* @__PURE__ */ C(z, { id: "HajiZl" })
			}), /* @__PURE__ */ C("button", {
				type: "button",
				className: y("agenda"),
				onClick: () => i("agenda"),
				children: /* @__PURE__ */ C(z, { id: "xDsmP9" })
			})]
		})]
	});
	if (r === "agenda") {
		let n = jr(e, "due"), r = n.filter((e) => Nr(e.due)), i = n.filter((e) => !Nr(e.due)), a = "";
		return /* @__PURE__ */ w("div", {
			className: "flex min-h-0 flex-1 flex-col",
			children: [T, /* @__PURE__ */ w("div", {
				className: "min-h-0 flex-1 overflow-auto p-4",
				children: [
					r.length === 0 && i.length === 0 && /* @__PURE__ */ C("div", {
						className: "px-3 py-8 text-center text-sm text-stone-400",
						children: /* @__PURE__ */ C(z, { id: "Zot9XS" })
					}),
					r.map((e) => {
						let n = e.due !== a;
						return a = e.due, /* @__PURE__ */ w("div", { children: [n && /* @__PURE__ */ w("div", {
							className: `mt-3 mb-1 text-xs font-medium ${e.due === t ? "text-brand-dark" : "text-brand-gray"}`,
							children: [e.due, e.due === t && /* @__PURE__ */ C("span", {
								className: "ml-1 rounded bg-brand-soft px-1 text-[10px] text-brand-dark",
								children: /* @__PURE__ */ C(z, { id: "ecUA8p" })
							})]
						}), /* @__PURE__ */ C("div", {
							className: "max-w-xl",
							children: x(e, !1)
						})] }, e.id);
					}),
					i.length > 0 && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C("div", {
						className: "mt-4 mb-1 text-xs font-medium text-stone-400",
						children: /* @__PURE__ */ C(z, { id: "cJ44lA" })
					}), /* @__PURE__ */ C("div", {
						className: "max-w-xl space-y-0.5",
						children: i.map((e) => x(e, !1))
					})] })
				]
			})]
		});
	}
	let E = Lr(l);
	return /* @__PURE__ */ w("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			T,
			/* @__PURE__ */ C("div", {
				className: "grid grid-cols-7 border-b border-black/[0.04] bg-stone-50",
				children: h.map((e, t) => /* @__PURE__ */ C("div", {
					className: "px-2 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-brand-gray",
					children: e
				}, t))
			}),
			/* @__PURE__ */ C("div", {
				className: "grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto",
				children: E.flat().map((e) => {
					let n = e.slice(0, 7) === l, r = e === t, i = d.get(e) ?? [];
					return /* @__PURE__ */ w("div", {
						className: `flex min-h-[5.5rem] flex-col gap-0.5 border-b border-r border-black/[0.04] p-1 ${n ? "" : "bg-stone-50/60"}`,
						children: [/* @__PURE__ */ C("div", {
							className: `mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${r ? "bg-brand text-white" : n ? "text-stone-500" : "text-stone-300"}`,
							children: Number(e.slice(8, 10))
						}), /* @__PURE__ */ w("div", {
							className: "flex flex-col gap-0.5 overflow-hidden",
							children: [i.slice(0, 4).map((e) => x(e, !0)), i.length > 4 && /* @__PURE__ */ w("span", {
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
//#region ../../shared/components/board/BoardBacklog.tsx
function fg({ cards: e, columns: t, selectedId: n, selectedIds: r, readOnly: i, blockedCardIds: a, collapsedGroupKeys: o, onSelect: s, onToggleSelect: c, onToggleCollapsed: l }) {
	let u = e.filter((e) => e.archived);
	return /* @__PURE__ */ C("div", {
		className: "min-h-0 flex-1 overflow-auto bg-stone-50 px-4 py-4 sm:px-6",
		children: /* @__PURE__ */ C("div", {
			className: "mx-auto max-w-6xl space-y-3",
			children: [...Qh(e, t), ...u.length > 0 ? [{
				key: "__archived",
				name: W._({ id: "TdfEV7" }),
				cards: u
			}] : []].map((e) => /* @__PURE__ */ C($f, {
				as: "section",
				defaultOpen: !o?.has(e.key),
				className: "overflow-hidden rounded-xl border border-line bg-white shadow-sm",
				children: ({ open: t }) => /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ w(Zf, {
					onClick: () => l?.(e.key),
					className: "flex min-h-11 w-full cursor-pointer items-center gap-2 border-b border-line px-4 text-left text-xs font-semibold text-stone-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
					children: [
						/* @__PURE__ */ C(mt, { className: `h-3.5 w-3.5 text-stone-400 transition ${t ? "rotate-0" : "-rotate-90"}` }),
						/* @__PURE__ */ C("span", { children: e.name }),
						/* @__PURE__ */ C("span", {
							className: "rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500",
							children: e.cards.length
						})
					]
				}), /* @__PURE__ */ C(Qf, { children: e.cards.length === 0 ? /* @__PURE__ */ C("div", {
					className: "px-4 py-5 text-xs text-stone-400",
					children: /* @__PURE__ */ C(z, { id: "KqBY_x" })
				}) : /* @__PURE__ */ C("div", {
					className: "divide-y divide-line",
					children: e.cards.map((e) => {
						let t = r?.has(e.id) ?? !1;
						return /* @__PURE__ */ w("div", {
							className: `flex min-h-12 items-center gap-2 px-3 py-1.5 transition hover:bg-brand-soft/25 ${n === e.id || t ? "bg-brand-soft/40" : ""}`,
							children: [!i && c && /* @__PURE__ */ C("button", {
								type: "button",
								"aria-label": t ? W._({ id: "vDFCs9" }) : W._({ id: "dgAb2R" }),
								"aria-pressed": t,
								onClick: () => c(e.id),
								className: `flex h-5 w-5 shrink-0 items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-brand ${t ? "border-brand bg-brand text-white" : "border-stone-300 bg-white"}`,
								children: t && /* @__PURE__ */ C(ft, { className: "h-3 w-3" })
							}), /* @__PURE__ */ w("button", {
								type: "button",
								"data-card-id": e.id,
								"aria-current": n === e.id ? "true" : void 0,
								onClick: (t) => {
									(t.metaKey || t.ctrlKey) && !i && c ? c(e.id) : s(e);
								},
								className: "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand",
								children: [/* @__PURE__ */ w("span", {
									className: "flex min-w-0 flex-wrap items-center gap-2",
									children: [
										/* @__PURE__ */ C("span", {
											className: "shrink-0 text-base",
											"aria-hidden": !0,
											children: e.icon || "·"
										}),
										/* @__PURE__ */ C("span", {
											className: "min-w-24 flex-1 truncate text-sm font-medium text-stone-800",
											children: e.title
										}),
										e.priority && e.priority !== "none" && /* @__PURE__ */ w("span", {
											className: `hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline ${Un[e.priority] ?? "bg-stone-100 text-stone-500"}`,
											children: [/* @__PURE__ */ C(Bt, { className: "mr-0.5 inline h-3 w-3" }), e.priority]
										}),
										a?.has(e.id) && /* @__PURE__ */ w("span", {
											className: "inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700",
											children: [/* @__PURE__ */ C(Xt, { className: "h-3 w-3" }), /* @__PURE__ */ C(z, { id: "32TndD" })]
										}),
										e.tags.slice(0, 2).map((e) => /* @__PURE__ */ C("span", {
											className: "hidden max-w-28 truncate rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 lg:inline",
											children: e.label
										}, e.label))
									]
								}), /* @__PURE__ */ w("span", {
									className: "flex shrink-0 items-center gap-3 text-[11px] text-brand-gray",
									children: [e.assignee && /* @__PURE__ */ w("span", {
										className: "hidden items-center gap-1 md:inline-flex",
										children: [/* @__PURE__ */ C(Tn, { className: "h-3.5 w-3.5" }), e.assignee]
									}), (e.start || e.due) && /* @__PURE__ */ w("span", {
										className: "inline-flex items-center gap-1",
										children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5" }), [e.start, e.due].filter(Boolean).join(" → ")]
									})]
								})]
							})]
						}, e.id);
					})
				}) })] })
			}, `${e.key}:${o?.has(e.key) ? "closed" : "open"}`))
		})
	});
}
//#endregion
//#region ../../shared/components/board/BoardGantt.tsx
var pg = 28, mg = 44;
function hg(e, t) {
	let n = /* @__PURE__ */ new Date(`${e}T00:00:00Z`);
	return new Intl.DateTimeFormat(t || "en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	}).format(n);
}
function gg({ cards: e, project: t, today: n, selectedId: r, onSelect: i }) {
	let { i18n: a } = R(), o = Xh(e, t, n), s = e.map((e) => Zh(e, o)).filter((e) => !!e), c = new Set(s.map((e) => e.card.id)), l = (e) => qh(e.start) || qh(e.due), u = e.filter((e) => l(e) && !c.has(e.id)), d = e.filter((e) => !l(e)), f = Array.from({ length: o.days }, (e, t) => {
		let n = /* @__PURE__ */ new Date(`${o.start}T00:00:00Z`);
		return n.setUTCDate(n.getUTCDate() + t), n.toISOString().slice(0, 10);
	});
	return /* @__PURE__ */ w("div", {
		className: "min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-5",
		children: [
			/* @__PURE__ */ w("div", {
				className: "min-w-max overflow-hidden rounded-xl border border-line bg-white shadow-sm",
				children: [
					/* @__PURE__ */ w("div", {
						className: "sticky top-0 z-20 flex h-12 border-b border-line bg-white/95 backdrop-blur",
						children: [/* @__PURE__ */ C("div", {
							className: "sticky left-0 z-30 flex w-72 shrink-0 items-center border-r border-line bg-white px-4",
							children: /* @__PURE__ */ w("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ C("p", {
									className: "truncate text-xs font-semibold text-stone-800",
									children: t?.summary || /* @__PURE__ */ C(z, { id: "8vwDbf" })
								}), /* @__PURE__ */ w("p", {
									className: "text-[10px] text-brand-gray",
									children: [
										o.start,
										" – ",
										o.end
									]
								})]
							})
						}), /* @__PURE__ */ C("div", {
							className: "relative flex",
							style: { width: o.days * pg },
							children: f.map((e, t) => /* @__PURE__ */ C("div", {
								title: e,
								className: `flex w-7 shrink-0 items-end justify-center border-r border-line pb-1 text-[9px] ${e === n ? "bg-brand-soft font-semibold text-brand-dark" : t % 7 == 0 ? "bg-stone-50 text-stone-500" : "text-stone-400"}`,
								children: t % 7 == 0 || e === n ? hg(e, a.locale).replace(" ", "\n") : e.slice(8)
							}, e))
						})]
					}),
					s.map((e) => /* @__PURE__ */ C(vg, {
						item: e,
						days: o.days,
						selected: r === e.card.id,
						onSelect: i
					}, e.card.id)),
					s.length === 0 && /* @__PURE__ */ C("div", {
						className: "flex h-24 items-center justify-center text-xs text-stone-400",
						children: /* @__PURE__ */ C(z, { id: "qjtdW-" })
					})
				]
			}),
			/* @__PURE__ */ C(_g, {
				cards: u,
				title: /* @__PURE__ */ C(z, { id: "pKxJpM" }),
				onSelect: i
			}),
			/* @__PURE__ */ C(_g, {
				cards: d,
				title: /* @__PURE__ */ C(z, { id: "cJ44lA" }),
				onSelect: i
			})
		]
	});
}
function _g({ cards: e, title: t, onSelect: n }) {
	return e.length === 0 ? null : /* @__PURE__ */ w("section", {
		className: "mt-4 overflow-hidden rounded-xl border border-line bg-white shadow-sm",
		children: [/* @__PURE__ */ w("header", {
			className: "flex items-center gap-2 border-b border-line px-4 py-3",
			children: [
				/* @__PURE__ */ C(nt, { className: "h-4 w-4 text-stone-400" }),
				/* @__PURE__ */ C("h3", {
					className: "text-xs font-semibold text-stone-700",
					children: t
				}),
				/* @__PURE__ */ C("span", {
					className: "rounded-full bg-stone-100 px-2 text-[10px] text-stone-500",
					children: e.length
				})
			]
		}), /* @__PURE__ */ C("div", {
			className: "grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3",
			children: e.map((e) => /* @__PURE__ */ w("button", {
				type: "button",
				"data-card-id": e.id,
				onClick: () => n(e),
				className: "min-w-0 rounded-lg border border-line bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-700 outline-none transition hover:border-brand/30 hover:bg-brand-soft/30 focus-visible:ring-2 focus-visible:ring-brand",
				children: [/* @__PURE__ */ C("span", {
					className: "mr-1.5",
					"aria-hidden": !0,
					children: e.icon
				}), e.title]
			}, e.id))
		})]
	});
}
function vg({ item: e, days: t, selected: n, onSelect: r }) {
	let i = Math.max(0, e.offset) * pg, a = Math.max(1, Math.min(e.span, t - Math.max(0, e.offset))) * pg;
	return /* @__PURE__ */ w("div", {
		className: `flex border-b border-line last:border-b-0 ${n ? "bg-brand-soft/25" : ""}`,
		style: { height: mg },
		children: [/* @__PURE__ */ w("button", {
			type: "button",
			"data-card-id": e.card.id,
			onClick: () => r(e.card),
			className: "sticky left-0 z-10 flex w-72 shrink-0 items-center gap-2 border-r border-line bg-white px-4 text-left outline-none hover:bg-brand-soft/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
			children: [/* @__PURE__ */ C("span", {
				"aria-hidden": !0,
				children: e.card.icon
			}), /* @__PURE__ */ C("span", {
				className: "truncate text-xs font-medium text-stone-700",
				children: e.card.title
			})]
		}), /* @__PURE__ */ C("div", {
			className: "relative bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px)] bg-[length:28px_100%]",
			style: { width: t * pg },
			children: e.milestone ? /* @__PURE__ */ C("button", {
				type: "button",
				title: `${e.card.title} · ${e.end}`,
				"aria-label": `${e.card.title}, ${W._({ id: "-yFTkm" })} ${e.end}`,
				onClick: () => r(e.card),
				className: "absolute top-1/2 -translate-y-1/2 text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand",
				style: { left: i + pg / 2 - 8 },
				children: /* @__PURE__ */ C("span", {
					className: "block h-3.5 w-3.5 rotate-45 rounded-[2px] bg-brand shadow-sm",
					"aria-hidden": !0
				})
			}) : /* @__PURE__ */ C("button", {
				type: "button",
				title: `${e.card.title} · ${e.start} – ${e.end}`,
				"aria-label": `${e.card.title}, ${e.start} ${W._({ id: "dMtLDE" })} ${e.end}`,
				onClick: () => r(e.card),
				className: "absolute top-2.5 h-6 min-w-5 overflow-hidden rounded-md bg-brand px-2 text-left text-[10px] font-medium leading-6 text-white shadow-sm outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
				style: {
					left: i,
					width: a
				},
				children: /* @__PURE__ */ C("span", {
					className: "block truncate",
					children: e.card.title
				})
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardWorkScope.tsx
var yg = {
	mention: ot,
	reminder: Xe,
	due: nt,
	blocked: Xt
};
function bg({ scope: e, cards: t, inboxItems: n, currentUser: r, selectedId: i, selectedIds: a, readOnly: o, statusName: s, doneKey: c, today: l, blockedCardIds: u, onSelect: d, onToggleSelect: f, onDismissInbox: p }) {
	let m = (e) => e.kind === "mention" ? W._({
		id: "PeXa8M",
		values: { 0: r?.trim() ?? "" }
	}) : e.kind === "reminder" ? W._({ id: "TXnokZ" }) : e.kind === "blocked" ? W._({ id: "oesHMm" }) : e.date && e.date < l ? W._({ id: "ddrz1m" }) : W._({ id: "1iShX0" });
	if (!r?.trim()) return /* @__PURE__ */ C(xg, {
		icon: Cn,
		title: /* @__PURE__ */ C(z, { id: "_zI8pq" }),
		body: /* @__PURE__ */ C(z, { id: "lCu9N3" })
	});
	if (e === "inbox") return n.length === 0 ? /* @__PURE__ */ C(xg, {
		icon: ft,
		title: /* @__PURE__ */ C(z, { id: "Gpw0dJ" }),
		body: /* @__PURE__ */ C(z, { id: "3SETeK" })
	}) : /* @__PURE__ */ C("div", {
		className: "min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-6",
		children: /* @__PURE__ */ C("div", {
			className: "mx-auto max-w-4xl overflow-hidden rounded-xl border border-line bg-white shadow-sm",
			children: n.map((e) => {
				let n = t.find((t) => t.id === e.cardId);
				return /* @__PURE__ */ w("div", {
					className: "group flex min-h-16 items-center gap-3 border-b border-line px-4 last:border-b-0 hover:bg-brand-soft/20",
					children: [
						/* @__PURE__ */ C("span", {
							className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
							children: /* @__PURE__ */ C(yg[e.kind] ?? Pt, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ w("button", {
							type: "button",
							disabled: !n,
							"data-card-id": n?.id,
							onClick: () => n && d(n),
							className: "min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default",
							children: [/* @__PURE__ */ C("span", {
								className: "block truncate text-sm font-medium text-stone-800",
								children: e.title
							}), /* @__PURE__ */ w("span", {
								className: "block truncate text-xs text-brand-gray",
								children: [m(e), e.date ? ` · ${e.date}` : ""]
							})]
						}),
						/* @__PURE__ */ C("button", {
							type: "button",
							onClick: () => p(e.key),
							title: W._({ id: "1QfxQT" }),
							"aria-label": W._({
								id: "LHvIwl",
								values: { 0: e.title }
							}),
							className: "rounded-md p-1.5 text-stone-400 opacity-60 outline-none hover:bg-white hover:text-stone-700 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand group-hover:opacity-100",
							children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
						})
					]
				}, e.key);
			})
		})
	});
	let h = eg(t, r, c, l, u);
	return h.length === 0 ? /* @__PURE__ */ C(xg, {
		icon: Cn,
		title: /* @__PURE__ */ C(z, { id: "7dA6V6" }),
		body: /* @__PURE__ */ C(z, { id: "t5Pdeu" })
	}) : /* @__PURE__ */ C("div", {
		className: "min-h-0 flex-1 overflow-auto bg-stone-50 p-4 sm:p-6",
		children: /* @__PURE__ */ C("div", {
			className: "mx-auto max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-sm",
			children: h.map((e) => {
				let t = a?.has(e.id) ?? !1;
				return /* @__PURE__ */ w("div", {
					className: `flex items-center gap-2 border-b border-line px-3 py-1.5 last:border-b-0 hover:bg-brand-soft/20 ${i === e.id || t ? "bg-brand-soft/35" : ""}`,
					children: [!o && f && /* @__PURE__ */ C("button", {
						type: "button",
						"aria-pressed": t,
						"aria-label": t ? W._({ id: "vDFCs9" }) : W._({ id: "dgAb2R" }),
						onClick: () => f(e.id),
						className: `flex h-5 w-5 shrink-0 items-center justify-center rounded border outline-none focus-visible:ring-2 focus-visible:ring-brand ${t ? "border-brand bg-brand text-white" : "border-stone-300"}`,
						children: t && /* @__PURE__ */ C(ft, { className: "h-3 w-3" })
					}), /* @__PURE__ */ w("button", {
						type: "button",
						"data-card-id": e.id,
						onClick: (t) => {
							(t.metaKey || t.ctrlKey) && !o && f ? f(e.id) : d(e);
						},
						className: "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand",
						children: [/* @__PURE__ */ w("span", {
							className: "flex min-w-0 items-center gap-3",
							children: [/* @__PURE__ */ C("span", {
								"aria-hidden": !0,
								children: e.icon
							}), /* @__PURE__ */ w("span", {
								className: "min-w-0",
								children: [/* @__PURE__ */ C("span", {
									className: "block truncate text-sm font-medium text-stone-800",
									children: e.title
								}), /* @__PURE__ */ w("span", {
									className: "flex items-center gap-2 truncate text-[11px] text-brand-gray",
									children: [s(e.columnKey), u?.has(e.id) && /* @__PURE__ */ w("span", {
										className: "inline-flex items-center gap-1 text-amber-700",
										children: [/* @__PURE__ */ C(Xt, { className: "h-3 w-3" }), /* @__PURE__ */ C(z, { id: "32TndD" })]
									})]
								})]
							})]
						}), e.due && /* @__PURE__ */ w("span", {
							className: "inline-flex items-center gap-1 text-[11px] text-brand-gray",
							children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5" }), e.due]
						})]
					})]
				}, e.id);
			})
		})
	});
}
function xg({ icon: e, title: t, body: n }) {
	return /* @__PURE__ */ C("div", {
		className: "flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8 text-center",
		children: /* @__PURE__ */ w("div", {
			className: "max-w-sm",
			children: [
				/* @__PURE__ */ C("span", {
					className: "mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
					children: /* @__PURE__ */ C(e, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ C("h2", {
					className: "mt-3 text-sm font-semibold text-stone-800",
					children: t
				}),
				/* @__PURE__ */ C("p", {
					className: "mt-1 text-xs leading-5 text-brand-gray",
					children: n
				})
			]
		})
	});
}
//#endregion
//#region ../../shared/components/board/ProjectSettingsDialog.tsx
function Sg({ open: e, project: t, portalClassName: n, onClose: r, onSave: i }) {
	let [a, o] = b(t ?? {}), [s, c] = b(!1), [l, u] = b(""), d = n ? ` ${n}` : "";
	return f(() => {
		e && (o(t ?? {}), u(""));
	}, [e, t]), /* @__PURE__ */ w(jf, {
		open: e,
		onClose: s ? () => void 0 : r,
		className: `fixed inset-0 z-[70]${d}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/20${d}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-center justify-center p-4${d}`,
			children: /* @__PURE__ */ w(Of, {
				className: `w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/[0.06]${d}`,
				children: [/* @__PURE__ */ w("div", {
					className: "flex items-center gap-3",
					children: [
						/* @__PURE__ */ C("span", {
							className: "flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
							children: /* @__PURE__ */ C(St, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ w("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ C(Af, {
								className: "text-sm font-semibold text-stone-900",
								children: /* @__PURE__ */ C(z, { id: "jXsah0" })
							}), /* @__PURE__ */ C("p", {
								className: "mt-0.5 text-xs text-brand-gray",
								children: /* @__PURE__ */ C(z, { id: "HX7utX" })
							})]
						}),
						/* @__PURE__ */ C("button", {
							type: "button",
							onClick: r,
							disabled: s,
							title: W._({ id: "yz7wBu" }),
							"aria-label": W._({ id: "yz7wBu" }),
							className: "rounded-lg p-1.5 text-stone-400 outline-none hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
							children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
						})
					]
				}), /* @__PURE__ */ w("form", {
					onSubmit: async (e) => {
						e.preventDefault();
						let t = Object.fromEntries(Object.entries(a).map(([e, t]) => [e, t?.trim() || void 0]));
						if ((t.key?.length ?? 0) > 32) {
							u(W._({ id: "7JA4uP" }));
							return;
						}
						if ((t.summary?.length ?? 0) > 280) {
							u(W._({ id: "DD5Nk7" }));
							return;
						}
						if (t.startDate && t.targetDate && t.startDate > t.targetDate) {
							u(W._({ id: "M0aIbs" }));
							return;
						}
						c(!0), u("");
						try {
							await i(Object.values(t).some(Boolean) ? t : void 0), r();
						} catch (e) {
							u(e instanceof Error ? e.message : W._({ id: "5ptOXn" }));
						} finally {
							c(!1);
						}
					},
					className: "mt-5 space-y-4",
					children: [
						/* @__PURE__ */ w("label", {
							className: "block",
							children: [/* @__PURE__ */ C("span", {
								className: "mb-1.5 block text-xs font-medium text-stone-700",
								children: /* @__PURE__ */ C(z, { id: "xt1ty_" })
							}), /* @__PURE__ */ C("input", {
								autoFocus: !0,
								maxLength: 32,
								className: `${hh} h-9 w-full px-3`,
								value: a.key ?? "",
								placeholder: W._({ id: "AL_kTn" }),
								onChange: (e) => o((t) => ({
									...t,
									key: e.target.value
								}))
							})]
						}),
						/* @__PURE__ */ w("label", {
							className: "block",
							children: [/* @__PURE__ */ C("span", {
								className: "mb-1.5 block text-xs font-medium text-stone-700",
								children: /* @__PURE__ */ C(z, { id: "dXoieq" })
							}), /* @__PURE__ */ C("textarea", {
								maxLength: 280,
								className: `${hh} min-h-20 w-full resize-y px-3 py-2`,
								value: a.summary ?? "",
								placeholder: W._({ id: "BC3Pra" }),
								onChange: (e) => o((t) => ({
									...t,
									summary: e.target.value
								}))
							})]
						}),
						/* @__PURE__ */ w("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ w("label", {
								className: "block",
								children: [/* @__PURE__ */ w("span", {
									className: "mb-1.5 flex items-center gap-1 text-xs font-medium text-stone-700",
									children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ C(z, { id: "WAjFYI" })]
								}), /* @__PURE__ */ C("input", {
									type: "date",
									className: `${hh} h-9 w-full px-2`,
									value: a.startDate ?? "",
									onChange: (e) => o((t) => ({
										...t,
										startDate: e.target.value
									}))
								})]
							}), /* @__PURE__ */ w("label", {
								className: "block",
								children: [/* @__PURE__ */ w("span", {
									className: "mb-1.5 flex items-center gap-1 text-xs font-medium text-stone-700",
									children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5 text-stone-400" }), /* @__PURE__ */ C(z, { id: "ASPlZ6" })]
								}), /* @__PURE__ */ C("input", {
									type: "date",
									className: `${hh} h-9 w-full px-2`,
									value: a.targetDate ?? "",
									onChange: (e) => o((t) => ({
										...t,
										targetDate: e.target.value
									}))
								})]
							})]
						}),
						l && /* @__PURE__ */ C("p", {
							role: "alert",
							className: "rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700",
							children: l
						}),
						/* @__PURE__ */ w("div", {
							className: "flex justify-end gap-2 border-t border-line pt-4",
							children: [/* @__PURE__ */ C("button", {
								type: "button",
								disabled: s,
								onClick: r,
								className: "rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
								children: /* @__PURE__ */ C(z, { id: "dEgA5A" })
							}), /* @__PURE__ */ C("button", {
								type: "submit",
								disabled: s,
								className: "rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50",
								children: s ? /* @__PURE__ */ C(z, { id: "K_F6pa" }) : /* @__PURE__ */ C(z, { id: "_BsotH" })
							})]
						})
					]
				})]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/CardCreateDialog.tsx
function Cg({ open: e, boardTitle: t, laneName: n, initialStatus: r, initialPriority: i = "none", initialAssignee: a = "", statusOptions: o, assigneeOptions: s, tagOptions: c, portalClassName: l, onClose: u, onCreate: d }) {
	let [p, m] = b(""), [h, g] = b(""), [_, v] = b(r), [x, S] = b(i), [T, E] = b(a), [D, O] = b(""), [k, A] = b([]), [j, M] = b(""), [N, P] = b(!1), [F, I] = b(""), L = y(null), R = l ? ` ${l}` : "";
	f(() => {
		e && (m(""), g(""), v(r), S(i), E(a), O(""), A([]), M(""), P(!1), I(""), window.setTimeout(() => L.current?.focus(), 0));
	}, [
		a,
		i,
		r,
		e
	]);
	let ee = async () => {
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
				I(W._({ id: "klk7Go" }));
			} finally {
				P(!1);
			}
		}
	};
	return /* @__PURE__ */ w(jf, {
		open: e,
		onClose: N ? () => {} : u,
		className: `fixed inset-0 z-50${R}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/25 backdrop-blur-[3px]${R}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-3 sm:p-6${R}`,
			children: /* @__PURE__ */ w(Of, {
				className: `flex min-h-[430px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_90px_rgba(28,25,23,0.22)] ring-1 ring-black/[0.06]${R}`,
				onKeyDown: (e) => {
					e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), ee());
				},
				children: [
					/* @__PURE__ */ w("div", {
						className: "flex items-center gap-2 px-6 pb-3 pt-5 text-xs text-brand-gray",
						children: [
							/* @__PURE__ */ C("span", {
								className: "max-w-[15rem] truncate font-medium text-stone-600",
								children: t
							}),
							/* @__PURE__ */ C(vt, { className: "h-3.5 w-3.5 shrink-0 text-stone-300" }),
							/* @__PURE__ */ C(Af, {
								className: "font-semibold text-stone-800",
								children: /* @__PURE__ */ C(z, { id: "pnrmSP" })
							}),
							/* @__PURE__ */ C("span", {
								className: "ml-auto rounded-full bg-brand-soft px-2 py-1 font-medium text-brand-dark",
								children: n
							}),
							/* @__PURE__ */ C("button", {
								type: "button",
								onClick: u,
								disabled: N,
								title: W._({ id: "yz7wBu" }),
								"aria-label": W._({ id: "yz7wBu" }),
								className: "ml-1 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40",
								children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ w("div", {
						className: "min-h-0 flex-1 px-6 pb-5",
						children: [/* @__PURE__ */ C("input", {
							ref: L,
							value: p,
							onChange: (e) => m(e.target.value),
							placeholder: W._({ id: "ZH7TVS" }),
							"aria-label": W._({ id: "ZH7TVS" }),
							className: "w-full bg-transparent text-[1.35rem] font-semibold tracking-[-0.02em] text-stone-900 outline-none placeholder:text-stone-300"
						}), /* @__PURE__ */ C("textarea", {
							value: h,
							onChange: (e) => g(e.target.value),
							placeholder: W._({ id: "3ESfuy" }),
							"aria-label": W._({ id: "Nu4oKW" }),
							className: "mt-3 min-h-44 w-full resize-none bg-transparent text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400"
						})]
					}),
					/* @__PURE__ */ C("div", {
						className: "border-t border-line px-5 py-3",
						children: /* @__PURE__ */ w("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ C(wg, {
									icon: /* @__PURE__ */ C(Bt, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ C(_h, {
										value: _,
										options: o,
										onChange: v,
										portalClassName: l
									})
								}),
								/* @__PURE__ */ C(wg, {
									icon: /* @__PURE__ */ C(Bt, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ C(_h, {
										value: x,
										options: Bn.map((e) => ({
											value: e,
											label: e
										})),
										onChange: S,
										portalClassName: l
									})
								}),
								/* @__PURE__ */ C(wg, {
									icon: /* @__PURE__ */ C(Tn, { className: "h-3.5 w-3.5" }),
									children: s ? /* @__PURE__ */ C(_h, {
										value: T,
										options: [{
											value: "",
											label: W._({ id: "EbMPZJ" })
										}, ...s],
										onChange: E,
										portalClassName: l
									}) : /* @__PURE__ */ C("input", {
										value: T,
										onChange: (e) => E(e.target.value),
										placeholder: W._({ id: "EbMPZJ" }),
										"aria-label": W._({ id: "ojKCLU" }),
										className: `${hh} w-28`
									})
								}),
								/* @__PURE__ */ C(wg, {
									icon: /* @__PURE__ */ C(yn, { className: "h-3.5 w-3.5" }),
									children: c ? /* @__PURE__ */ C(yh, {
										value: k,
										options: c.map((e) => ({
											label: e.label,
											color: e.color
										})),
										onChange: A,
										portalClassName: l
									}) : /* @__PURE__ */ C("input", {
										value: j,
										onChange: (e) => {
											M(e.target.value), A(e.target.value.split(",").map((e) => e.trim()).filter(Boolean));
										},
										placeholder: W._({ id: "cfaWH-" }),
										"aria-label": W._({ id: "OYHzN1" }),
										className: `${hh} w-28`
									})
								}),
								/* @__PURE__ */ C(wg, {
									icon: /* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5" }),
									children: /* @__PURE__ */ C("input", {
										type: "date",
										value: D,
										onChange: (e) => O(e.target.value),
										"aria-label": W._({ id: "Gpfctt" }),
										className: hh
									})
								})
							]
						})
					}),
					/* @__PURE__ */ w("div", {
						className: "flex items-center gap-3 border-t border-line bg-stone-50/70 px-5 py-3",
						children: [
							F ? /* @__PURE__ */ C("span", {
								role: "alert",
								className: "text-[11px] font-medium text-red-600",
								children: F
							}) : /* @__PURE__ */ C("span", {
								className: "text-[11px] text-stone-400",
								children: /* @__PURE__ */ C(z, { id: "JKsLFA" })
							}),
							/* @__PURE__ */ C("span", {
								className: "ml-auto hidden text-[11px] text-stone-400 sm:inline",
								children: /* @__PURE__ */ C(z, { id: "3dmm5B" })
							}),
							/* @__PURE__ */ C("button", {
								type: "button",
								disabled: !p.trim() || N,
								onClick: () => void ee(),
								className: "rounded-lg bg-brand-dark px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-40",
								children: N ? /* @__PURE__ */ C(z, { id: "_DwR-n" }) : /* @__PURE__ */ C(z, { id: "dsLT3m" })
							})
						]
					})
				]
			})
		})]
	});
}
function wg({ icon: e, children: t }) {
	return /* @__PURE__ */ w("div", {
		className: "flex min-h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-1.5 text-stone-400 shadow-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-1 [&_button]:shadow-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-1 [&_input]:shadow-none",
		children: [e, /* @__PURE__ */ C("div", {
			className: "min-w-24 text-stone-700",
			children: t
		})]
	});
}
//#endregion
//#region ../../shared/components/board/StatusActionsMenu.tsx
function Tg({ column: e, siblings: t, actions: n, doneKey: r, orientation: i, portalClassName: a, buttonClassName: o = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
	let s = t.findIndex((t) => t.key === e.key), c = r === e.key;
	if (!(n.renameColumn || n.reorderColumns || n.toggleDoneColumn || n.setColumnLimit || n.setColumnColor || n.deleteColumn)) return null;
	let l = a ? ` ${a}` : "", u = s > 0 ? t[s - 1] : void 0, d = s >= 0 && s < t.length - 1 ? t[s + 1] : void 0;
	return /* @__PURE__ */ w(vm, {
		as: "div",
		className: "relative shrink-0",
		children: [/* @__PURE__ */ C(fm, {
			title: W._({ id: "YHjvGb" }),
			"aria-label": W._({
				id: "RlLl3G",
				values: { 0: e.name }
			}),
			className: o,
			children: /* @__PURE__ */ C(Mt, { className: "h-4 w-4" })
		}), /* @__PURE__ */ w(pm, {
			anchor: "bottom end",
			className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${l}`,
			children: [
				n.renameColumn && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					onClick: () => void n.renameColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ C(an, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "2wxgft" })]
				}) }),
				n.reorderColumns && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					disabled: !u,
					"aria-disabled": !u,
					onClick: () => {
						u && n.reorderColumns?.(e.key, u.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [C(i === "horizontal" ? Oe : Re, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ C(z, { id: "iSLA_r" }) : /* @__PURE__ */ C(z, { id: "QyioBP" })]
				}) }), /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					disabled: !d,
					"aria-disabled": !d,
					onClick: () => {
						d && n.reorderColumns?.(e.key, d.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [C(i === "horizontal" ? Me : Ee, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ C(z, { id: "Ubl2by" }) : /* @__PURE__ */ C(z, { id: "3Ib6FN" })]
				}) })] }),
				n.toggleDoneColumn && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					onClick: () => void n.toggleDoneColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ C(ut, { className: "h-3.5 w-3.5" }), c ? /* @__PURE__ */ C(z, { id: "G4qrLy" }) : /* @__PURE__ */ C(z, { id: "wtw-au" })]
				}) }),
				n.setColumnLimit && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					onClick: () => void n.setColumnLimit?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ C(Ht, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "Iw6WJa" })]
				}) }),
				n.setColumnColor && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ w("div", {
					className: "px-3 py-2",
					children: [/* @__PURE__ */ C("span", {
						className: "text-[11px] text-brand-gray",
						children: /* @__PURE__ */ C(z, { id: "jZlrte" })
					}), /* @__PURE__ */ w("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [Wn.map((t) => /* @__PURE__ */ C("button", {
							type: "button",
							onClick: () => void n.setColumnColor?.(e.key, t),
							title: t,
							className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
							style: { backgroundColor: t }
						}, t)), /* @__PURE__ */ C("button", {
							type: "button",
							title: W._({ id: "H_SQFv" }),
							onClick: () => void n.setColumnColor?.(e.key, null),
							className: "flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10",
							children: /* @__PURE__ */ C(kn, { className: "h-3 w-3 text-stone-400" })
						})]
					})]
				})] }),
				n.deleteColumn && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
					type: "button",
					disabled: t.length <= 1,
					"aria-disabled": t.length <= 1,
					onClick: () => {
						t.length > 1 && n.deleteColumn?.(e.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 aria-disabled:opacity-40 data-[focus]:bg-red-50",
					children: [/* @__PURE__ */ C(xn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cnGeoo" })]
				}) })] })
			]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/StatusManagerDialog.tsx
function Eg({ open: e, config: t, actions: n, portalClassName: r, onClose: i }) {
	let [a, o] = b(!1), [s, c] = b(""), l = r ? ` ${r}` : "", u = t.doneColumn ?? "done";
	return /* @__PURE__ */ w(jf, {
		open: e,
		onClose: i,
		className: `relative z-40${l}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${l}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${l}`,
			children: /* @__PURE__ */ w(Of, {
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${l}`,
				children: [
					/* @__PURE__ */ w("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ C("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ C(dn, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ w("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ C(Af, {
									className: "text-base font-semibold tracking-tight text-stone-900",
									children: /* @__PURE__ */ C(z, { id: "rvpMpc" })
								}), /* @__PURE__ */ C("p", {
									className: "mt-1 text-xs leading-5 text-brand-gray",
									children: /* @__PURE__ */ C(z, { id: "0gvHNl" })
								})]
							}),
							/* @__PURE__ */ C("button", {
								type: "button",
								onClick: i,
								title: W._({ id: "yz7wBu" }),
								"aria-label": W._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
								children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ w("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [/* @__PURE__ */ C("ul", {
							className: "space-y-1",
							"aria-label": W._({ id: "Db4W3_" }),
							children: t.columns.map((e) => {
								let i = u === e.key;
								return /* @__PURE__ */ w("li", {
									className: "group flex min-h-12 items-center gap-2 rounded-xl px-2 hover:bg-stone-50",
									children: [
										/* @__PURE__ */ C("span", {
											className: "h-4 w-4 shrink-0 rounded-full bg-stone-300 ring-1 ring-black/10",
											style: e.color ? { backgroundColor: e.color } : void 0
										}),
										/* @__PURE__ */ w("span", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ C("span", {
												className: "block truncate text-xs font-semibold text-stone-800",
												children: e.name
											}), /* @__PURE__ */ w("span", {
												className: "mt-0.5 block truncate text-[10px] text-brand-gray",
												children: [
													/* @__PURE__ */ C(z, { id: "YNYued" }),
													": ",
													/* @__PURE__ */ C("code", { children: e.key })
												]
											})]
										}),
										e.limit != null && /* @__PURE__ */ C("span", {
											className: "rounded bg-stone-100 px-1.5 py-0.5 text-[10px] tabular-nums text-brand-gray",
											children: W._({
												id: "pdVZUg",
												values: { 0: e.limit }
											})
										}),
										i && /* @__PURE__ */ C(ut, {
											className: "h-4 w-4 text-emerald-500",
											title: W._({ id: "_5CsXX" })
										}),
										/* @__PURE__ */ C(Tg, {
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
						}), n.addColumn && (a ? /* @__PURE__ */ w("form", {
							className: "mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 px-3",
							onSubmit: (e) => {
								e.preventDefault();
								let t = s.trim();
								t && (o(!1), c(""), n.addColumn?.(t));
							},
							children: [
								/* @__PURE__ */ C(sn, { className: "h-4 w-4 text-brand-dark" }),
								/* @__PURE__ */ C("input", {
									autoFocus: !0,
									value: s,
									onChange: (e) => c(e.target.value),
									onKeyDown: (e) => {
										e.key === "Escape" && (o(!1), c(""));
									},
									placeholder: W._({ id: "P5cvAA" }),
									"aria-label": W._({ id: "P5cvAA" }),
									className: "h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
								}),
								/* @__PURE__ */ C("button", {
									type: "submit",
									className: "h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white",
									children: /* @__PURE__ */ C(z, { id: "m16xKo" })
								})
							]
						}) : /* @__PURE__ */ w("button", {
							type: "button",
							onClick: () => o(!0),
							className: "mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40",
							children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "1nUGn5" })]
						}))]
					}),
					/* @__PURE__ */ C("div", {
						className: "flex justify-end border-t border-line bg-stone-50 px-5 py-3",
						children: /* @__PURE__ */ C("button", {
							type: "button",
							onClick: i,
							className: "rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand",
							children: /* @__PURE__ */ C(z, { id: "DPfwMq" })
						})
					})
				]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/LaneDetailsPopover.tsx
function Dg({ lane: e, cardCount: t, portalClassName: n, buttonClassName: r = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
	let [i, a] = b("idle"), o = y(null), s = n ? ` ${n}` : "";
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
	return /* @__PURE__ */ w(Zm, {
		className: "relative shrink-0",
		children: [/* @__PURE__ */ C(Km, {
			title: W._({ id: "-eTfgY" }),
			"aria-label": W._({
				id: "Q-Pe7U",
				values: { 0: e.name }
			}),
			className: r,
			children: /* @__PURE__ */ C(Kt, { className: "h-4 w-4" })
		}), /* @__PURE__ */ w(Ym, {
			anchor: "bottom end",
			className: `z-50 w-80 rounded-xl border border-line bg-white p-4 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${s}`,
			children: [
				/* @__PURE__ */ w("p", {
					className: "flex items-center gap-2 text-xs font-semibold text-stone-800",
					children: [/* @__PURE__ */ C(Kt, { className: "h-4 w-4 text-brand-dark" }), /* @__PURE__ */ C(z, { id: "-eTfgY" })]
				}),
				/* @__PURE__ */ w("dl", {
					className: "mt-3 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[11px]",
					children: [
						/* @__PURE__ */ C("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ C(z, { id: "6YtxFj" })
						}),
						/* @__PURE__ */ C("dd", {
							className: "truncate font-medium text-stone-700",
							children: e.name
						}),
						/* @__PURE__ */ C("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ C(z, { id: "arhExE" })
						}),
						/* @__PURE__ */ w("dd", {
							className: "flex min-w-0 items-center gap-1.5",
							children: [/* @__PURE__ */ C("code", {
								className: "min-w-0 flex-1 truncate rounded bg-stone-100 px-1.5 py-1 text-[10px] text-stone-600",
								children: e.key
							}), /* @__PURE__ */ w("button", {
								type: "button",
								title: W._({ id: "GNoXOd" }),
								"aria-label": W._({ id: "GNoXOd" }),
								onClick: () => void c(),
								className: "inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[10px] font-medium text-brand-dark hover:border-brand/30",
								children: [/* @__PURE__ */ C(wt, { className: "h-3.5 w-3.5" }), i === "copied" ? W._({ id: "6V3Ea3" }) : W._({ id: "he3ygx" })]
							})]
						}),
						/* @__PURE__ */ C("dt", {
							className: "text-brand-gray",
							children: /* @__PURE__ */ C(z, { id: "xUOPoQ" })
						}),
						/* @__PURE__ */ C("dd", {
							className: "tabular-nums text-stone-700",
							children: /* @__PURE__ */ C(z, {
								id: "tF-_sn",
								values: { cardCount: t }
							})
						})
					]
				}),
				i === "error" && /* @__PURE__ */ C("p", {
					className: "mt-3 text-[11px] text-red-600",
					role: "alert",
					children: /* @__PURE__ */ C(z, { id: "vfYjJ_" })
				})
			]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneDeleteDialog.tsx
function Og({ lane: e, cardCount: t, targets: n, busy: r, progress: i, error: a, portalClassName: o, onClose: s, onConfirm: c }) {
	let [l, u] = b("keep"), [d, p] = b(""), m = y(null), h = n.length > 0;
	f(() => {
		let t = e?.key ?? null, r = m.current !== t;
		m.current = t, r && u("keep"), p((e) => r || !n.some((t) => t.value === e) ? n[0]?.value ?? "" : e);
	}, [e?.key, n]);
	let g = o ? ` ${o}` : "", _ = () => {
		r || s();
	};
	return /* @__PURE__ */ w(jf, {
		open: !!e,
		onClose: _,
		className: `relative z-50${g}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${g}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${g}`,
			children: /* @__PURE__ */ C(Of, {
				"aria-describedby": "swimlane-delete-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${g}`,
				children: e && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ w("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ C(Af, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: W._({
								id: "KpnwJK",
								values: { 0: e.name }
							})
						}),
						/* @__PURE__ */ C("p", {
							id: "swimlane-delete-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: t > 0 ? W._({
								id: "RbsNko",
								values: { cardCount: t }
							}) : W._({ id: "MYx830" })
						}),
						t > 0 && /* @__PURE__ */ w(mh, {
							value: l,
							onChange: u,
							className: "mt-4 space-y-2",
							children: [/* @__PURE__ */ w(ph, {
								value: "keep",
								className: "group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30",
								children: [/* @__PURE__ */ C("span", {
									className: "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand",
									children: /* @__PURE__ */ C("span", { className: "h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" })
								}), /* @__PURE__ */ w("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ w("span", {
										className: "flex items-center justify-between gap-2 text-xs font-semibold text-stone-800",
										children: [/* @__PURE__ */ C(z, { id: "by_svU" }), /* @__PURE__ */ C("span", {
											className: "font-normal text-brand-dark",
											children: /* @__PURE__ */ C(z, { id: "WEYdDv" })
										})]
									}), /* @__PURE__ */ C("span", {
										className: "mt-1 block text-[11px] leading-4 text-brand-gray",
										children: /* @__PURE__ */ C(z, { id: "Y8bR2a" })
									})]
								})]
							}), /* @__PURE__ */ w(ph, {
								value: "move",
								className: "group flex cursor-pointer gap-3 rounded-xl border border-line px-3 py-3 outline-none transition data-[checked]:border-brand/40 data-[checked]:bg-brand-soft/40 data-[focus]:ring-2 data-[focus]:ring-brand/30",
								children: [/* @__PURE__ */ C("span", {
									className: "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 group-data-[checked]:border-brand",
									children: /* @__PURE__ */ C("span", { className: "h-2 w-2 rounded-full bg-brand opacity-0 group-data-[checked]:opacity-100" })
								}), /* @__PURE__ */ w("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ C("span", {
										className: "text-xs font-semibold text-stone-800",
										children: /* @__PURE__ */ C(z, { id: "_TJomP" })
									}), /* @__PURE__ */ C("span", {
										className: "mt-1 block text-[11px] leading-4 text-brand-gray",
										children: /* @__PURE__ */ C(z, { id: "3CtQL6" })
									})]
								})]
							})]
						}),
						h && /* @__PURE__ */ C("div", {
							className: "mt-2 pl-7",
							children: /* @__PURE__ */ C(_h, {
								value: d,
								options: n,
								disabled: l !== "move",
								onChange: p,
								portalClassName: o
							})
						}),
						i && /* @__PURE__ */ w("div", {
							className: "mt-4",
							"aria-live": "polite",
							children: [
								/* @__PURE__ */ w("div", {
									className: "flex items-center justify-between text-[11px] text-brand-gray",
									children: [/* @__PURE__ */ C(z, { id: "Kd6eg7" }), /* @__PURE__ */ w("span", {
										className: "tabular-nums",
										children: [
											i.completed,
											"/",
											i.total
										]
									})]
								}),
								/* @__PURE__ */ C("div", {
									className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100",
									children: /* @__PURE__ */ C("div", {
										className: "h-full rounded-full bg-brand transition-[width] duration-200",
										style: { width: `${i.total ? i.completed / i.total * 100 : 0}%` }
									})
								}),
								/* @__PURE__ */ C("p", {
									className: "mt-1.5 text-[11px] text-brand-gray",
									children: /* @__PURE__ */ C(z, { id: "HTKRVa" })
								})
							]
						}),
						a && /* @__PURE__ */ w("div", {
							className: "mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800",
							role: "alert",
							children: [/* @__PURE__ */ C(Pt, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ C("span", { children: a })]
						})
					]
				}), /* @__PURE__ */ w("div", {
					className: "flex justify-end gap-2 border-t border-line bg-stone-50 px-5 py-3",
					children: [/* @__PURE__ */ C("button", {
						type: "button",
						onClick: _,
						"aria-disabled": r,
						className: "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/30 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: /* @__PURE__ */ C(z, { id: "dEgA5A" })
					}), /* @__PURE__ */ C("button", {
						type: "button",
						onClick: () => !r && !(t > 0 && l === "move" && n.length === 0) && void c(t === 0 || l === "keep" ? { mode: "keep" } : {
							mode: "move",
							targetKey: d || null
						}),
						"aria-disabled": r || t > 0 && l === "move" && n.length === 0,
						className: "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: r ? W._({ id: "XklovM" }) : t > 0 && l === "move" ? W._({ id: "NYTPDY" }) : W._({ id: "uAP6ov" })
					})]
				})] })
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneManagerDialog.tsx
function kg({ open: e, lanes: t, cards: n, focusRequest: r, portalClassName: i, onClose: a, onSaveLanes: o, onUpdateCards: s, onShowAffected: c }) {
	let [l, u] = b(!1), [d, p] = b(""), [m, h] = b(null), [g, v] = b(""), [x, T] = b(null), [E, D] = b(!1), [O, k] = b(null), [A, j] = b(!1), [M, N] = b(""), [P, F] = b(null), [I, L] = b(""), R = y(null), [ee, B] = b(null), te = y(!1), V = y(null);
	f(() => {
		e || (u(!1), p(""), h(null), T(null), k(null), N(""), F(null), L(""));
	}, [e]), f(() => {
		if (!e || !r || V.current === r.id) return;
		let n = t.find((e) => e.key === r.laneKey);
		n && (V.current = r.id, r.action === "rename" ? (h(n.key), v(n.name), T(null)) : (N(""), F(null), k(n)));
	}, [
		r?.id,
		e,
		t
	]);
	let H = i ? ` ${i}` : "", ne = _(() => {
		let e = /* @__PURE__ */ new Map();
		for (let t of n) t.swimlaneKey && e.set(t.swimlaneKey, (e.get(t.swimlaneKey) ?? 0) + 1);
		return e;
	}, [n]), re = _(() => _r({ swimlanes: t }, n), [t, n]), ie = re.filter((e) => e.kind === "dangling_swimlane").reduce((e, t) => e + t.cardCount, 0), ae = re.filter((e) => e.kind !== "dangling_swimlane"), oe = async (e, t = "dialog") => {
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
		o && (a.splice(i, 0, o), oe(a, e).then(() => L(W._({
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
		o && (r.splice(a, 0, o), oe(r, e).then(() => L(W._({
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
		T(null), h(e.key), v(e.name);
	}, pe = async (e) => {
		let n = hr(g, t, e.key);
		if (n) {
			T({
				key: e.key,
				message: n
			});
			return;
		}
		let r = g.trim();
		h(null), r !== e.name && await oe(t.map((t) => t.key === e.key ? {
			...t,
			name: r
		} : t), e.key).catch(() => {
			h(e.key);
		});
	}, me = async () => {
		let e = hr(d, t);
		if (e) {
			T({
				key: "new",
				message: e
			});
			return;
		}
		let r = d.trim(), i = {
			key: mr(r, [...t.map((e) => e.key), ...n.map((e) => e.swimlaneKey).filter((e) => !!e)]),
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
	}, U = O ? [{
		value: "",
		label: W._({ id: "EbMPZJ" })
	}, ...t.filter((e) => e.key !== O.key).map((e) => ({
		value: e.key,
		label: e.name,
		color: e.color
	}))] : [];
	return /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ w(jf, {
		open: e,
		onClose: () => {
			!E && !A && a();
		},
		className: `relative z-40${H}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${H}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${H}`,
			children: /* @__PURE__ */ w(Of, {
				"aria-describedby": "swimlane-manager-description",
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${H}`,
				children: [
					/* @__PURE__ */ w("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ C("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ C(Ke, { className: "h-4.5 w-4.5" })
							}),
							/* @__PURE__ */ w("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ C(Af, {
										className: "text-base font-semibold tracking-tight text-stone-900",
										children: /* @__PURE__ */ C(z, { id: "pip_Rq" })
									}),
									/* @__PURE__ */ C("p", {
										id: "swimlane-manager-description",
										className: "mt-1 text-xs leading-5 text-brand-gray",
										children: /* @__PURE__ */ C(z, { id: "s8QaQC" })
									}),
									/* @__PURE__ */ C("span", {
										className: "sr-only",
										"aria-live": "polite",
										children: I
									})
								]
							}),
							/* @__PURE__ */ C("button", {
								type: "button",
								onClick: () => {
									E || a();
								},
								"aria-disabled": E,
								title: W._({ id: "yz7wBu" }),
								"aria-label": W._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
								children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ w("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [
							/* @__PURE__ */ C("ul", {
								"aria-label": W._({ id: "nNGN_D" }),
								className: "space-y-1",
								children: t.map((e, n) => {
									let r = x?.key === e.key ? x.message : null;
									return /* @__PURE__ */ w("li", {
										"data-swimlane-row": e.key,
										className: `rounded-xl transition ${ee === e.key ? "opacity-50" : ""}`,
										children: [/* @__PURE__ */ w("div", {
											className: "group flex min-h-12 items-center gap-2 px-2 hover:bg-stone-50 focus-within:bg-stone-50",
											children: [
												/* @__PURE__ */ C("button", {
													type: "button",
													onPointerDown: (t) => le(t, e.key),
													onPointerMove: (t) => ue(t, e.key),
													onPointerUp: (t) => de(t, e.key),
													title: W._({ id: "KGi3u9" }),
													"aria-label": W._({
														id: "2BPVq8",
														values: { 0: e.name }
													}),
													className: "hidden h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-stone-300 hover:bg-white hover:text-stone-500 active:cursor-grabbing md:flex md:cursor-grab",
													children: /* @__PURE__ */ C(Ke, { className: "h-4 w-4" })
												}),
												/* @__PURE__ */ w(Zm, {
													className: "relative shrink-0",
													children: [/* @__PURE__ */ C(Km, {
														title: W._({ id: "KFiYGY" }),
														className: "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30",
														children: /* @__PURE__ */ C("span", {
															className: "h-4 w-4 rounded-full bg-stone-300 ring-1 ring-black/10",
															style: e.color ? { backgroundColor: e.color } : void 0,
															"aria-hidden": !0
														})
													}), /* @__PURE__ */ w(Ym, {
														anchor: "bottom start",
														className: `z-50 w-52 rounded-xl border border-line bg-white p-3 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${H}`,
														children: [/* @__PURE__ */ C("p", {
															className: "text-[11px] font-medium text-brand-gray",
															children: /* @__PURE__ */ C(z, { id: "U0hizX" })
														}), /* @__PURE__ */ w("div", {
															className: "mt-2 flex flex-wrap gap-2",
															children: [Wn.map((t) => /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => he(e, t),
																title: t,
																className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
																style: { backgroundColor: t }
															}, t)), /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => he(e, null),
																title: W._({ id: "H_SQFv" }),
																className: `flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${e.color ? "" : "ring-2 ring-brand ring-offset-2"}`,
																children: /* @__PURE__ */ C(kn, { className: "h-3 w-3 text-stone-400" })
															})]
														})]
													})]
												}),
												m === e.key ? /* @__PURE__ */ C("form", {
													className: "min-w-0 flex-1",
													onSubmit: (t) => {
														t.preventDefault(), pe(e);
													},
													children: /* @__PURE__ */ C("input", {
														autoFocus: !0,
														value: g,
														maxLength: 80,
														onChange: (e) => v(e.target.value),
														onBlur: () => void pe(e),
														onKeyDown: (e) => {
															e.key === "Escape" && (h(null), T(null));
														},
														"aria-label": W._({ id: "79Yvzu" }),
														className: "h-8 w-full rounded-lg border border-brand/40 bg-white px-2 text-xs font-medium text-stone-800 outline-none ring-2 ring-brand/10"
													})
												}) : /* @__PURE__ */ C("button", {
													type: "button",
													onDoubleClick: () => fe(e),
													className: "min-w-0 flex-1 truncate text-left text-xs font-semibold text-stone-800",
													title: e.name,
													children: e.name
												}),
												/* @__PURE__ */ C("span", {
													className: "shrink-0 tabular-nums text-[11px] text-brand-gray",
													children: /* @__PURE__ */ C(z, {
														id: "fFAIng",
														values: { 0: ne.get(e.key) ?? 0 }
													})
												}),
												/* @__PURE__ */ w(vm, {
													as: "div",
													className: "relative shrink-0",
													children: [/* @__PURE__ */ C(fm, {
														title: W._({ id: "DGEEOQ" }),
														"aria-label": W._({
															id: "RlLl3G",
															values: { 0: e.name }
														}),
														className: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100",
														children: /* @__PURE__ */ C(Mt, { className: "h-4 w-4" })
													}), /* @__PURE__ */ w(pm, {
														anchor: "bottom end",
														className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${H}`,
														children: [
															/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																type: "button",
																onClick: () => fe(e),
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ C(an, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "2wxgft" })]
															}) }),
															/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																type: "button",
																onClick: () => se(e.key, -1),
																disabled: n === 0 || E,
																"aria-disabled": n === 0 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ C(Re, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "QyioBP" })]
															}) }),
															/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																type: "button",
																onClick: () => se(e.key, 1),
																disabled: n === t.length - 1 || E,
																"aria-disabled": n === t.length - 1 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ C(Ee, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "3Ib6FN" })]
															}) }),
															/* @__PURE__ */ C("div", { className: "my-1 border-t border-line" }),
															/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																type: "button",
																onClick: () => {
																	N(""), F(null), k(e);
																},
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 data-[focus]:bg-red-50",
																children: [/* @__PURE__ */ C(xn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cnGeoo" })]
															}) })
														]
													})]
												}),
												/* @__PURE__ */ C(Dg, {
													lane: e,
													cardCount: ne.get(e.key) ?? 0,
													portalClassName: i,
													buttonClassName: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100"
												})
											]
										}), r && /* @__PURE__ */ w("div", {
											className: "mx-2 mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800",
											role: "alert",
											children: [/* @__PURE__ */ C(Pt, { className: "h-3.5 w-3.5 shrink-0" }), r]
										})]
									}, e.key);
								})
							}),
							l ? /* @__PURE__ */ w("form", {
								className: "mt-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-2",
								onSubmit: (e) => {
									e.preventDefault(), me();
								},
								children: [/* @__PURE__ */ w("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ C("span", {
											className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark",
											children: /* @__PURE__ */ C(sn, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ C("input", {
											autoFocus: !0,
											value: d,
											maxLength: 80,
											onChange: (e) => p(e.target.value),
											onKeyDown: (e) => {
												e.key === "Escape" && (u(!1), p(""), T(null));
											},
											placeholder: W._({ id: "79Yvzu" }),
											"aria-label": W._({ id: "79Yvzu" }),
											className: "h-8 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
										}),
										/* @__PURE__ */ C("button", {
											type: "submit",
											"aria-disabled": E,
											className: "h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand aria-disabled:opacity-50",
											children: /* @__PURE__ */ C(z, { id: "m16xKo" })
										}),
										/* @__PURE__ */ C("button", {
											type: "button",
											onClick: () => {
												u(!1), p(""), T(null);
											},
											className: "h-8 rounded-lg px-2 text-xs font-medium text-brand-gray hover:bg-white",
											children: /* @__PURE__ */ C(z, { id: "dEgA5A" })
										})
									]
								}), x?.key === "new" && /* @__PURE__ */ C("p", {
									className: "mt-1.5 pl-10 text-[11px] text-amber-700",
									role: "alert",
									children: x.message
								})]
							}) : /* @__PURE__ */ w("button", {
								type: "button",
								onClick: () => {
									u(!0), p(""), T(null);
								},
								className: "mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed border-brand/20 bg-brand-soft/20 px-3 text-left text-xs font-semibold text-brand-dark hover:border-brand/40 hover:bg-brand-soft/40",
								children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "KCszT6" })]
							}),
							(ae.length > 0 || ie > 0) && /* @__PURE__ */ w("section", {
								className: "mt-4 border-t border-line pt-3",
								"aria-labelledby": "swimlane-issues-title",
								children: [/* @__PURE__ */ C("h3", {
									id: "swimlane-issues-title",
									className: "text-[10px] font-semibold uppercase tracking-wider text-brand-gray",
									children: /* @__PURE__ */ C(z, { id: "1718Q-" })
								}), /* @__PURE__ */ w("div", {
									className: "mt-2 space-y-2",
									children: [ae.map((e) => /* @__PURE__ */ w("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										role: "alert",
										children: [/* @__PURE__ */ C(Pt, { className: "h-4 w-4 shrink-0" }), /* @__PURE__ */ C("span", { children: e.kind === "duplicate_swimlane_key" ? W._({
											id: "bUNpV2",
											values: { 0: e.key }
										}) : W._({
											id: "uWPalN",
											values: { 0: e.name }
										}) })]
									}, `${e.kind}-${e.kind === "duplicate_swimlane_key" ? e.key : e.name}`)), ie > 0 && /* @__PURE__ */ w("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										children: [
											/* @__PURE__ */ C(Pt, { className: "h-4 w-4 shrink-0" }),
											/* @__PURE__ */ C("span", {
												className: "min-w-0 flex-1",
												children: W._({
													id: "SavliD",
													values: { danglingCount: ie }
												})
											}),
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => {
													a(), c();
												},
												className: "shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold hover:bg-amber-100",
												children: /* @__PURE__ */ C(z, { id: "23yqV0" })
											})
										]
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ w("div", {
						className: "flex min-h-12 items-center border-t border-line bg-stone-50 px-5 py-3",
						children: [/* @__PURE__ */ C("span", {
							className: "text-[11px] text-brand-gray",
							"aria-live": "polite",
							children: E ? W._({ id: "K_F6pa" }) : W._({ id: "cUt8yN" })
						}), /* @__PURE__ */ C("button", {
							type: "button",
							onClick: () => {
								E || a();
							},
							"aria-disabled": E,
							className: "ml-auto rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
							children: /* @__PURE__ */ C(z, { id: "DPfwMq" })
						})]
					})
				]
			})
		})]
	}), /* @__PURE__ */ C(Og, {
		lane: O,
		cardCount: O ? ne.get(O.key) ?? 0 : 0,
		targets: U,
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
function Ag({ source: e, rows: t, open: n, busy: r, resume: i, progress: a, error: o, portalClassName: s, onClose: c, onConfirm: l }) {
	let u = s ? ` ${s}` : "", d = () => {
		r || c();
	};
	return /* @__PURE__ */ w(jf, {
		open: n,
		onClose: d,
		className: `relative z-50${u}`,
		children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${u}` }), /* @__PURE__ */ C("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${u}`,
			children: /* @__PURE__ */ w(Of, {
				"aria-describedby": "swimlane-conversion-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${u}`,
				children: [/* @__PURE__ */ w("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ C(Af, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: i ? W._({ id: "CXTDT_" }) : e === "priority" ? W._({ id: "nfhh60" }) : W._({ id: "vMTOsC" })
						}),
						/* @__PURE__ */ C("p", {
							id: "swimlane-conversion-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: i ? W._({ id: "MRsDXp" }) : e === "priority" ? W._({ id: "4vd-Kd" }) : W._({ id: "QRhoJb" })
						}),
						/* @__PURE__ */ w("ul", {
							className: "mt-4 divide-y divide-line",
							"aria-label": W._({ id: "4NY8B5" }),
							children: [t.map((e) => /* @__PURE__ */ w("li", {
								className: "flex min-h-10 items-center gap-2 py-2",
								children: [
									/* @__PURE__ */ C("span", {
										className: "h-2.5 w-2.5 shrink-0 rounded-full bg-stone-300",
										style: e.color ? { backgroundColor: e.color } : void 0,
										"aria-hidden": !0
									}),
									/* @__PURE__ */ C("span", {
										className: "min-w-0 flex-1 truncate text-xs font-medium text-stone-700",
										children: e.name
									}),
									/* @__PURE__ */ C("span", {
										className: "tabular-nums text-[11px] text-brand-gray",
										children: /* @__PURE__ */ C(z, {
											id: "fFAIng",
											values: { 0: e.cardCount }
										})
									})
								]
							}, e.value)), t.length === 0 && /* @__PURE__ */ C("li", {
								className: "py-4 text-center text-xs text-brand-gray",
								children: /* @__PURE__ */ C(z, { id: "gzZWjO" })
							})]
						}),
						a && /* @__PURE__ */ w("div", {
							className: "mt-4",
							"aria-live": "polite",
							children: [/* @__PURE__ */ w("div", {
								className: "flex items-center justify-between text-[11px] text-brand-gray",
								children: [/* @__PURE__ */ w("span", {
									className: "inline-flex items-center gap-1.5",
									children: [/* @__PURE__ */ C(Ae, { className: "h-3.5 w-3.5 animate-spin" }), /* @__PURE__ */ C(z, { id: "ANe5kn" })]
								}), /* @__PURE__ */ w("span", {
									className: "tabular-nums",
									children: [
										a.completed,
										"/",
										a.total
									]
								})]
							}), /* @__PURE__ */ C("div", {
								className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100",
								children: /* @__PURE__ */ C("div", {
									className: "h-full rounded-full bg-brand transition-[width] duration-200",
									style: { width: `${a.total ? a.completed / a.total * 100 : 0}%` }
								})
							})]
						}),
						o && /* @__PURE__ */ w("div", {
							className: "mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800",
							role: "alert",
							children: [/* @__PURE__ */ C(Pt, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ C("span", { children: o })]
						})
					]
				}), /* @__PURE__ */ w("div", {
					className: "flex justify-end gap-2 border-t border-line bg-stone-50 px-5 py-3",
					children: [/* @__PURE__ */ C("button", {
						type: "button",
						onClick: d,
						"aria-disabled": r,
						className: "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/30 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: /* @__PURE__ */ C(z, { id: "dEgA5A" })
					}), /* @__PURE__ */ C("button", {
						type: "button",
						onClick: () => {
							!r && t.length > 0 && l();
						},
						disabled: r || t.length === 0,
						"aria-disabled": r || t.length === 0,
						className: "rounded-lg bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
						children: r ? W._({ id: "XklovM" }) : i ? W._({ id: "l_g7se" }) : W._({ id: "PUeYA1" })
					})]
				})]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardSurface.tsx
function jg({ config: e, cards: t, actions: r, viewState: i, onViewStateChange: a, error: o, initialCardId: s, templates: c, createFromTemplate: l, assigneeOptions: u, tagOptions: d, loadNotes: p, onUploadAttachment: m, loadComments: h, addComment: g, updateComment: v, deleteComment: x, toggleReaction: T, resolveComment: E, currentUser: D, loadActivity: O, renderMarkdownToContainer: k, renderMarkdownToHtml: A, fullscreen: j, onToggleFullscreen: M, onOpenSettings: N, readOnly: P, onCardOpen: F, renderCardSupplement: I, peekComponent: L, portalClassName: R }) {
	let [ee, B] = b(null), [te, V] = b([]), [H, ne] = b(/* @__PURE__ */ new Set()), [re, ie] = b(null), [ae, oe] = b(null), [se, ce] = b(null), [le, ue] = b(!1), [de, fe] = b(""), [pe, me] = b(""), [he, ge] = b(() => Uh(e)), [U, _e] = b(null), [ve, ye] = b(""), [be, xe] = b(null), [Ce, we] = b(null), [Te, Ee] = b(null), [De, Oe] = b(!1), [ke, je] = b(!1), [Me, Ne] = b(!1), [Pe, Fe] = b(!1), [Ie, Le] = b("priority"), [Re, ze] = b(!1), [Be, Ve] = b(null), [Ue, Ge] = b(""), [Ke, qe] = b(0), Ye = y(null), Xe = y(null), Ze = y(!1), $e = y(null), tt = y(/* @__PURE__ */ new Map()), rt = y(!1), at = y(null), ot = y(null), st = y(null), ct = y(null), lt = y(!!P);
	lt.current = !!P;
	let dt = _(() => i ? Hh(i) : he, [he, i]), ft = (e) => {
		let t = Wh(dt, e);
		i || ge(t), Promise.resolve().then(() => a?.(t)).catch(() => {});
	};
	f(() => {
		if (!(rt.current || !s) && t.some((e) => e.id === s)) {
			if (rt.current = !0, F) {
				F(t.find((e) => e.id === s));
				return;
			}
			B(s), V([s]);
		}
	}, [
		t,
		s,
		F
	]);
	let pt = _(() => ({
		...e,
		groupBy: dt.groupBy ?? e.groupBy,
		swimlaneBy: dt.swimlaneBy ?? (dt.groupBy ? void 0 : e.swimlaneBy),
		calendarMode: dt.calendarMode ?? e.calendarMode,
		viewType: dt.viewType ?? e.viewType
	}), [
		e,
		dt.calendarMode,
		dt.groupBy,
		dt.swimlaneBy,
		dt.viewType
	]), mt = dr(pt), ht = mt === "status", gt = mt === "custom", _t = dt.viewType ?? "board", yt = dt.scope ?? "all", bt = dt.sortBy ?? "manual", xt = dt.filters ?? { archived: "active" }, Ct = _(() => new Set(dt.collapsedGroupKeys ?? []), [dt.collapsedGroupKeys]), wt = `${_t}:${_t === "backlog" ? "status" : mt}:`, Tt = _(() => {
		let e = /* @__PURE__ */ new Set();
		for (let t of Ct) t.startsWith(wt) ? e.add(t.slice(wt.length)) : _t === "board" && !t.includes(":") && e.add(t);
		return e;
	}, [
		wt,
		Ct,
		_t
	]), Et = e.doneColumn ?? "done", Dt = (e.colorColumns ?? !1) && ht && _t === "board", kt = bt === "manual" && ht && _t === "board" && !pe.trim() && !Tr(xt), jt = or(), Nt = (e, t) => {
		if (lt.current) return Promise.resolve();
		let n = (tt.current.get(e) ?? Promise.resolve()).catch(() => void 0).then(() => {
			if (!lt.current) return r.updateCard(e, t);
		});
		tt.current.set(e, n);
		let i = () => {
			tt.current.get(e) === n && tt.current.delete(e);
		};
		return n.then(i, i), n;
	};
	f(() => {
		if (!j || !M) return;
		let e = (e) => {
			e.key === "Escape" && !ee && H.size === 0 && M();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [
		j,
		ee,
		H.size,
		M
	]), f(() => {
		if (H.size === 0) return;
		let e = (e) => {
			e.key === "Escape" && ne(/* @__PURE__ */ new Set());
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [H.size]);
	let Ft = _(() => mt === "custom" ? Sr(pt, t, mt, W._({ id: "EbMPZJ" })) : br(pt, t, mt, W._({ id: "EbMPZJ" })), [
		pt,
		t,
		mt
	]), It = _(() => nr(t, e.doneColumn), [t, e.doneColumn]), Lt = _(() => rr(t, e.doneColumn), [t, e.doneColumn]), Rt = _(() => new Set(Lt.keys()), [Lt]), zt = _(() => Ar(t, pe, xt, pt, {
		currentUser: D,
		today: jt,
		blockedCardIds: Rt
	}), [
		t,
		pe,
		xt,
		pt,
		D,
		jt,
		Rt
	]), Bt = _(() => rg({
		cards: t,
		currentUser: D,
		today: jt,
		blockedCardIds: Rt,
		blockerCardIds: It,
		doneColumn: Et
	}), [
		Rt,
		It,
		t,
		D,
		Et,
		jt
	]), Vt = _(() => new Set(dt.dismissedInboxItemKeys ?? []), [dt.dismissedInboxItemKeys]), Ut = _(() => Bt.filter((e) => !Vt.has(e.key)), [Bt, Vt]);
	f(() => {
		let e = dt.dismissedInboxItemKeys ?? [];
		if (e.length === 0) return;
		let t = ig(e, Bt);
		if (t.length === e.length) return;
		let n = Wh(dt, { dismissedInboxItemKeys: t });
		i || ge(n), Promise.resolve().then(() => a?.(n)).catch(() => void 0);
	}, [
		Bt,
		a,
		dt,
		i
	]);
	let Gt = _(() => ir(t), [t]), Kt = _(() => [...new Set(t.map((e) => e.assignee).filter(Boolean))], [t]), qt = _(() => [...new Set(t.flatMap((e) => e.tags.map((e) => e.label)))], [t]), Yt = _(() => d?.length ? d : qt.map((e) => ({
		label: e,
		color: null
	})), [qt, d]), Zt = (t) => e.columns.find((e) => e.key === t)?.name || t || W._({ id: "EbMPZJ" }), $t = ee ? t.find((e) => e.id === ee) ?? null : null;
	f(() => {
		!ee || $t || (B(null), V([]));
	}, [$t, ee]), f(() => {
		let e = new Set(t.map((e) => e.id));
		ne((t) => {
			let n = new Set([...t].filter((t) => e.has(t)));
			return n.size === t.size ? t : n;
		});
	}, [t]), f(() => {
		P && (ne(/* @__PURE__ */ new Set()), ce(null), ue(!1), je(!1), Oe(!1), Ne(!1), Fe(!1));
	}, [P]);
	let en = _(() => br(e, t, Ie, W._({ id: "EbMPZJ" })).filter((e) => Ie === "priority" ? e.key !== "none" : e.key !== "").map((e, n) => ({
		value: e.key,
		name: e.name,
		color: e.color ?? Wn[n % Wn.length],
		cardCount: t.filter((t) => vr(t, Ie) === e.key).length
	})), [
		t,
		e,
		Ie
	]), tn = async (e, t) => {
		if (lt.current) throw Error(W._({ id: "gpGcIe" }));
		if (r.updateCards) {
			await r.updateCards(e, t);
			return;
		}
		let n = 0;
		for (let i of e) await r.updateCard(i.cardId, i.patch), n += 1, t?.(n, e.length);
	}, rn = async () => {
		if (!(Re || lt.current)) {
			if (Ge(""), $e.current = null, !(e.swimlaneMigration?.source === Ie && e.swimlaneMigration)) {
				let n = /* @__PURE__ */ new Set([...(e.swimlanes ?? []).map((e) => e.key), ...t.map((e) => e.swimlaneKey).filter((e) => !!e)]), i = en.map((e) => {
					let t = mr(e.name, n);
					return n.add(t), {
						value: e.value,
						swimlaneKey: t
					};
				}), a = [...e.swimlanes ?? [], ...i.map((e, t) => ({
					key: e.swimlaneKey,
					name: en[t]?.name ?? e.value,
					color: en[t]?.color
				}))], o = {
					version: 1,
					source: Ie,
					mapping: i
				};
				try {
					await r.setConfig({
						swimlanes: a,
						swimlaneMigration: o
					});
				} catch (e) {
					Ge(e instanceof Error ? e.message : String(e));
					return;
				}
			}
			Ve(null), ze(!0);
		}
	};
	f(() => {
		if (!Re || Ze.current || lt.current) return;
		let n = e.swimlaneMigration;
		!n || n.source !== Ie || (Ze.current = !0, (async () => {
			try {
				if (lt.current) throw Error(W._({ id: "gpGcIe" }));
				let i = [...n.mapping], a = [...e.swimlanes ?? []], o = new Set(i.map((e) => e.value)), s = new Set(a.map((e) => e.key)), c = /* @__PURE__ */ new Set([
					...s,
					...i.map((e) => e.swimlaneKey),
					...t.map((e) => e.swimlaneKey).filter((e) => !!e)
				]), l = [...new Set(t.map((e) => vr(e, n.source)).filter((e) => n.source === "priority" ? e !== "none" : e !== ""))], u = !1;
				for (let e of l) if (!o.has(e)) {
					let t = mr(e, c);
					c.add(t), i.push({
						value: e,
						swimlaneKey: t
					}), o.add(e), u = !0;
				}
				for (let e of i) if (!s.has(e.swimlaneKey)) {
					let t = en.find((t) => t.value === e.value), n = Math.max(0, l.indexOf(e.value));
					a.push({
						key: e.swimlaneKey,
						name: t?.name ?? e.value,
						color: t?.color ?? Wn[n % Wn.length]
					}), s.add(e.swimlaneKey), u = !0;
				}
				if (u) {
					$e.current = null, await r.setConfig({
						swimlanes: a,
						swimlaneMigration: {
							...n,
							mapping: i
						}
					});
					return;
				}
				let d = new Map(i.map((e) => [e.value, e.swimlaneKey])), f = t.flatMap((e) => {
					let t = vr(e, n.source), r = d.get(t);
					return r && e.swimlaneKey !== r ? [{
						cardId: e.id,
						patch: { swimlaneKey: r }
					}] : [];
				});
				if (f.length > 0) {
					let e = f.map((e) => `${e.cardId}:${String(e.patch.swimlaneKey ?? "")}`).sort().join("\n"), t = $e.current;
					if (t?.signature === e && t.writes >= 2) throw Error(W._({ id: "KAlhe_" }));
					$e.current = {
						signature: e,
						writes: t?.signature === e ? t.writes + 1 : 1
					}, Ve({
						completed: 0,
						total: f.length
					}), await tn(f, (e, t) => Ve({
						completed: e,
						total: t
					}));
					return;
				}
				await r.setConfig({
					swimlanes: a,
					swimlaneMigration: void 0
				}), ft({
					groupBy: "status",
					swimlaneBy: "custom"
				}), $e.current = null, ze(!1), Ve(null), Ne(!1);
			} catch (e) {
				Ge(e instanceof Error ? e.message : String(e)), Ve(null), ze(!1);
			} finally {
				Ze.current = !1, qe((e) => e + 1);
			}
		})());
	}, [
		r,
		t,
		e.swimlaneMigration,
		e.swimlanes,
		Ke,
		Re,
		en,
		Ie
	]);
	let on = "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", cn = R ? ` ${R}` : "", un = (e) => {
		Re || lt.current || Promise.resolve(r.setConfig(e)).catch(() => {});
	}, fn = async (e) => {
		lt.current || await r.setConfig({ swimlanes: e });
	}, pn = () => {
		ft({ filters: {
			...xt,
			missingRow: !0
		} }), window.setTimeout(() => {
			ct.current?.querySelector("[data-col-key=\"\"]")?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth"
			});
		}, 80);
	}, mn = (e) => {
		if (F) F(e);
		else {
			let t = [...ct.current?.querySelectorAll("[data-card-id]") ?? []].find((t) => t.dataset.cardId === e.id);
			t?.focus({ preventScroll: !0 }), at.current = t ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null), ot.current = e.id, V([e.id]), B(e.id);
		}
	}, gn = (e) => {
		t.some((t) => t.id === e) && (V((t) => [...t, e]), B(e));
	}, vn = () => {
		let e = ot.current, t = () => {
			let t = at.current?.isConnected ? at.current : null, n = e ? [...ct.current?.querySelectorAll("[data-card-id]") ?? []].find((t) => t.dataset.cardId === e) : null;
			(t ?? n)?.focus({ preventScroll: !0 });
		};
		B(null), V([]), window.setTimeout(t, 0), window.setTimeout(t, 80);
	}, bn = () => {
		V((e) => {
			let t = e.slice(0, -1);
			return B(t.length > 0 ? t[t.length - 1] : null), t;
		});
	}, Sn = (e) => {
		P || ne((t) => {
			let n = new Set(t);
			return n.has(e) ? n.delete(e) : n.add(e), n;
		});
	}, Cn = !!(r.renameColumn || r.toggleDoneColumn || r.setColumnLimit || r.setColumnColor || r.deleteColumn), wn = (e, t) => {
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
	}, En = (e, t) => (document.elementFromPoint(e, t)?.closest("[data-col-key]"))?.dataset.colKey ?? null, On = (e, t) => {
		if (e.button === 0) {
			Ye.current = {
				id: t.id,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, An = (e, t) => {
		if (P) return;
		let n = Ye.current;
		if (!(!n || n.id !== t.id)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, xe(t.id);
			}
			Ee({
				x: e.clientX,
				y: e.clientY
			}), ie(wn(e.clientX, e.clientY));
		}
	}, jn = (e, n) => {
		let i = Ye.current;
		Ye.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (xe(null), Ee(null), ie(null), i?.moved) {
			let i = wn(e.clientX, e.clientY);
			if (i) {
				let e = ht && !kt ? t.filter((e) => e.id !== n.id && yr(e, pt) === i.col).length : i.index;
				P || r.moveCard(n.id, i.col, e);
			}
		} else if (i) {
			if ((e.metaKey || e.ctrlKey) && !P) {
				Sn(n.id);
				return;
			}
			mn(n);
		}
	}, Mn = async (e) => {
		if (P || U) return;
		let n = t.filter((e) => H.has(e.id));
		if (n.length === 0) return;
		let r = n.map((t) => ({
			cardId: t.id,
			patch: typeof e == "function" ? e(t) : e
		}));
		ye(""), _e({
			completed: 0,
			total: r.length
		});
		try {
			await tn(r, (e, t) => _e({
				completed: e,
				total: t
			})), ne(/* @__PURE__ */ new Set());
		} catch (e) {
			ye(e instanceof Error ? e.message : String(e));
		} finally {
			_e(null);
		}
	}, Nn = async () => {
		if (P || U || !r.deleteCards) return;
		let e = t.filter((e) => H.has(e.id));
		if (e.length !== 0) {
			ye(""), _e({
				completed: 0,
				total: e.length
			});
			try {
				await r.deleteCards(e) !== !1 && ne(/* @__PURE__ */ new Set());
			} catch (e) {
				ye(e instanceof Error ? e.message : String(e));
			} finally {
				_e(null);
			}
		}
	}, Pn = (e, t) => {
		if (!(P || !ht || !r.reorderColumns || e.button !== 0) && !e.target.closest("button")) {
			Xe.current = {
				key: t.key,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, Fn = (e, t) => {
		if (P) return;
		let n = Xe.current;
		if (!(!n || n.key !== t.key)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, we(t.key);
			}
			oe(En(e.clientX, e.clientY));
		}
	}, In = (e, t) => {
		let n = Xe.current;
		Xe.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (we(null), oe(null), n?.moved) {
			let n = En(e.clientX, e.clientY);
			!P && n && n !== t.key && r.reorderColumns?.(t.key, n);
		}
	}, Ln = (e) => (() => {
		let t = new Set(Ct), n = `${wt}${e}`, r = Tt.has(e);
		t.delete(e), r ? t.delete(n) : t.add(n), ft({ collapsedGroupKeys: [...t] });
	})(), Rn = async (e, t) => {
		if (P) return !1;
		let n = t.title.trim();
		if (!n) return !1;
		let { title: i, ...a } = t, o = await r.createCard(e, n, a);
		return typeof o == "string" && !F && (V([o]), B(o)), !0;
	}, zn = [
		{
			value: "all",
			label: W._({ id: "N40H-G" }),
			icon: hn
		},
		{
			value: "my-work",
			label: W._({ id: "sBe1e-" }),
			icon: et
		},
		{
			value: "inbox",
			label: W._({ id: "Gp4Yi6" }),
			icon: Wt,
			count: Ut.length
		}
	], Bn = [
		{
			value: "board",
			label: W._({ id: "QD8opX" }),
			icon: Dn
		},
		{
			value: "table",
			label: W._({ id: "4hJhzz" }),
			icon: _n
		},
		{
			value: "calendar",
			label: W._({ id: "AjVXBS" }),
			icon: nt
		},
		{
			value: "backlog",
			label: W._({ id: "KNKCTb" }),
			icon: ln
		},
		{
			value: "gantt",
			label: W._({ id: "MeLVaU" }),
			icon: it
		}
	];
	return o && e.columns.length === 0 ? /* @__PURE__ */ w("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-stone-50 p-8 text-center",
		children: [/* @__PURE__ */ C(Pt, { className: "h-9 w-9 text-amber-500" }), /* @__PURE__ */ C("p", {
			className: "max-w-md break-words text-sm text-stone-600",
			children: o
		})]
	}) : /* @__PURE__ */ w("div", {
		ref: ct,
		className: "relative flex h-full min-h-0 bg-stone-50",
		children: [
			/* @__PURE__ */ w("div", {
				className: "flex min-h-0 min-w-0 flex-1 flex-col",
				children: [
					/* @__PURE__ */ w("div", {
						className: "flex flex-wrap items-center gap-2.5 border-b border-black/[0.05] bg-white/70 px-5 py-2.5",
						children: [
							/* @__PURE__ */ C("span", {
								className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ C(Dn, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ w("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ w("div", {
										className: "flex min-w-0 items-center gap-2",
										children: [e.project?.key && /* @__PURE__ */ C("span", {
											className: "shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-dark",
											children: e.project.key
										}), /* @__PURE__ */ C("p", {
											className: "truncate text-sm font-semibold text-stone-900",
											children: e.title
										})]
									}),
									e.project?.summary && /* @__PURE__ */ C("p", {
										className: "truncate text-xs text-stone-600",
										children: e.project.summary
									}),
									/* @__PURE__ */ w("p", {
										className: "truncate text-[11px] text-brand-gray",
										children: [
											e.project?.startDate || e.project?.targetDate ? /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ w("span", { children: [
												e.project.startDate || "—",
												" → ",
												e.project.targetDate || "—"
											] }), /* @__PURE__ */ C("span", {
												"aria-hidden": !0,
												children: " · "
											})] }) : /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C(z, { id: "QD8opX" }), /* @__PURE__ */ C("span", {
												"aria-hidden": !0,
												children: " · "
											})] }),
											zt.length,
											zt.length === t.length ? "" : `/${t.length}`,
											" ",
											/* @__PURE__ */ C(z, { id: "sCzmvQ" })
										]
									})
								]
							}),
							/* @__PURE__ */ w("div", {
								className: "flex min-w-0 items-center gap-2.5 max-md:w-full",
								children: [
									/* @__PURE__ */ C("div", {
										className: "flex shrink-0 items-center rounded-lg border border-stone-200 bg-white p-0.5",
										"aria-label": W._({ id: "gMAF3u" }),
										children: zn.map((e) => {
											let t = e.icon;
											return /* @__PURE__ */ w("button", {
												type: "button",
												"aria-label": e.label,
												"aria-pressed": yt === e.value,
												onClick: () => ft({ scope: e.value }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand ${yt === e.value ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [
													/* @__PURE__ */ C(t, { className: "h-3.5 w-3.5" }),
													/* @__PURE__ */ C("span", {
														className: "hidden sm:inline",
														children: e.label
													}),
													e.count ? /* @__PURE__ */ C("span", {
														className: "rounded-full bg-brand px-1.5 text-[9px] text-white",
														children: e.count
													}) : null
												]
											}, e.value);
										})
									}),
									yt === "all" && /* @__PURE__ */ C("div", {
										className: "flex min-w-0 items-center overflow-x-auto rounded-lg border border-stone-200 bg-white p-0.5",
										"aria-label": W._({ id: "5OrUX9" }),
										children: Bn.map((e) => {
											let t = e.icon;
											return /* @__PURE__ */ w("button", {
												type: "button",
												"aria-label": e.label,
												"aria-pressed": _t === e.value,
												onClick: () => ft({ viewType: e.value }),
												className: `inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand ${_t === e.value ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ C(t, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("span", {
													className: "hidden lg:inline",
													children: e.label
												})]
											}, e.value);
										})
									}),
									ht && _t === "board" && !P && /* @__PURE__ */ w("button", {
										type: "button",
										className: `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${Dt ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: () => un({ colorColumns: !e.colorColumns }),
										title: W._({ id: "b4hVKD" }),
										children: [/* @__PURE__ */ C(hn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "jZlrte" })]
									}),
									!P && /* @__PURE__ */ C("button", {
										type: "button",
										className: `inline-flex items-center justify-center rounded-lg border p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-brand ${e.project ? "border-brand/30 bg-brand-soft/40 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: () => Fe(!0),
										title: W._({ id: "jXsah0" }),
										"aria-label": W._({ id: "jXsah0" }),
										children: /* @__PURE__ */ C(St, { className: "h-3.5 w-3.5" })
									}),
									r.refresh && /* @__PURE__ */ w("button", {
										type: "button",
										className: "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: () => void r.refresh?.(),
										title: W._({ id: "lCF0wC" }),
										children: [/* @__PURE__ */ C(Ae, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "lCF0wC" })]
									}),
									N && !P && /* @__PURE__ */ C("button", {
										type: "button",
										className: "inline-flex items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: N,
										title: W._({ id: "6buwPb" }),
										"aria-label": W._({ id: "6buwPb" }),
										children: /* @__PURE__ */ C(Ot, { className: "h-3.5 w-3.5" })
									}),
									M && /* @__PURE__ */ C("button", {
										type: "button",
										className: `inline-flex items-center justify-center rounded-lg border p-1.5 ${j ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: M,
										title: j ? W._({ id: "sQpDn6" }) : W._({ id: "3qkggm" }),
										"aria-label": j ? W._({ id: "sQpDn6" }) : W._({ id: "3qkggm" }),
										"aria-pressed": j,
										children: C(j ? He : We, { className: "h-3.5 w-3.5" })
									})
								]
							})
						]
					}),
					yt === "all" && /* @__PURE__ */ w("div", {
						className: "flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-white/40 px-5 py-1.5",
						children: [
							_t === "board" && /* @__PURE__ */ w("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ C(dn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ w("select", {
									className: on,
									"aria-label": W._({ id: "hyVzII" }),
									value: mt,
									disabled: Re,
									onChange: (t) => {
										let n = t.target.value;
										ft(n === "custom" ? {
											groupBy: "status",
											swimlaneBy: "custom"
										} : {
											groupBy: n,
											swimlaneBy: void 0
										}), n === "custom" && (e.swimlanes?.length ?? 0) === 0 && !P && Oe(!0);
									},
									children: [
										/* @__PURE__ */ C("option", {
											value: "status",
											children: W._({ id: "CQ_dDx" })
										}),
										/* @__PURE__ */ C("option", {
											value: "priority",
											children: W._({ id: "Ve-C10" })
										}),
										/* @__PURE__ */ C("option", {
											value: "assignee",
											children: W._({ id: "UouxNQ" })
										}),
										/* @__PURE__ */ C("option", {
											value: "custom",
											children: W._({ id: "5Cawxq" })
										})
									]
								})]
							}),
							_t === "board" && mt === "status" && !P && /* @__PURE__ */ C("button", {
								type: "button",
								disabled: Re,
								onClick: () => je(!0),
								title: W._({ id: "rvpMpc" }),
								"aria-label": W._({ id: "rvpMpc" }),
								className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
								children: /* @__PURE__ */ C(nn, { className: "h-3.5 w-3.5" })
							}),
							_t === "board" && mt !== "status" && !P && /* @__PURE__ */ C("button", {
								type: "button",
								disabled: Re,
								onClick: () => {
									mt === "custom" ? Oe(!0) : (Le(e.swimlaneMigration?.source ?? mt), Ge(""), Ne(!0));
								},
								title: mt === "custom" ? W._({ id: "pip_Rq" }) : W._({ id: "jzy1b8" }),
								"aria-label": mt === "custom" ? W._({ id: "pip_Rq" }) : W._({ id: "jzy1b8" }),
								className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
								children: /* @__PURE__ */ C(Se, { className: "h-3.5 w-3.5" })
							}),
							_t !== "calendar" && /* @__PURE__ */ w("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ C(Je, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ w("select", {
									className: on,
									value: bt,
									onChange: (e) => ft({ sortBy: e.target.value }),
									children: [
										/* @__PURE__ */ C("option", {
											value: "manual",
											children: W._({ id: "8lE269" })
										}),
										/* @__PURE__ */ C("option", {
											value: "due",
											children: W._({ id: "fYcKtB" })
										}),
										/* @__PURE__ */ C("option", {
											value: "priority",
											children: W._({ id: "WSP6v1" })
										}),
										/* @__PURE__ */ C("option", {
											value: "title",
											children: W._({ id: "p9yTeb" })
										})
									]
								})]
							}),
							/* @__PURE__ */ C(lg, {
								filters: xt,
								onChange: (e) => ft({ filters: e }),
								assignees: Kt,
								tags: qt,
								currentUser: D,
								visibleCount: zt.length,
								totalCount: t.length,
								portalClassName: R
							}),
							/* @__PURE__ */ w("div", {
								className: "relative ml-auto",
								children: [/* @__PURE__ */ C(Qt, { className: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" }), /* @__PURE__ */ C("input", {
									className: `${on} w-44 pl-7`,
									placeholder: W._({ id: "JTYvAw" }),
									value: pe,
									onChange: (e) => me(e.target.value)
								})]
							})
						]
					}),
					o && /* @__PURE__ */ C("div", {
						className: "bg-amber-50 px-5 py-1.5 text-xs text-amber-700",
						children: /* @__PURE__ */ C("span", {
							className: "truncate",
							children: o
						})
					}),
					yt === "all" ? _t === "table" ? /* @__PURE__ */ C(ug, {
						cards: jr(zt, bt),
						statusName: Zt,
						today: jt,
						doneKey: Et,
						selectedId: $t?.id,
						onSelect: mn
					}) : _t === "calendar" ? /* @__PURE__ */ C(dg, {
						cards: jr(zt, bt),
						today: jt,
						doneKey: Et,
						mode: dt.calendarMode ?? "month",
						onModeChange: (e) => ft({ calendarMode: e }),
						selectedId: $t?.id,
						onSelect: mn
					}) : _t === "backlog" ? /* @__PURE__ */ C(fg, {
						cards: jr(zt, bt),
						columns: e.columns,
						selectedId: $t?.id,
						selectedIds: H,
						readOnly: P,
						blockedCardIds: Rt,
						collapsedGroupKeys: Tt,
						onSelect: mn,
						onToggleSelect: Sn,
						onToggleCollapsed: Ln
					}) : _t === "gantt" ? /* @__PURE__ */ C(gg, {
						cards: jr(zt, bt),
						project: e.project,
						today: jt,
						selectedId: $t?.id,
						onSelect: mn
					}) : /* @__PURE__ */ w("div", {
						className: "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4",
						children: [
							Ft.map((t, i) => {
								let a = jr(zt.filter((e) => yr(e, pt) === t.key), bt), o = (e) => !!be && kt && re?.col === t.key && re.index === e, s = ht && Et === t.key, u = ae === t.key, d = ht && t.limit != null && a.length > t.limit, f = t.color ?? Wn[i % Wn.length];
								return Tt.has(t.key) ? /* @__PURE__ */ w("button", {
									type: "button",
									"data-col-key": t.key,
									onClick: () => Ln(t.key),
									title: W._({ id: "AC9Gkf" }),
									className: `flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-stone-100/60 py-2 text-stone-500 hover:border-brand/40 ${u ? "border-brand/60" : "border-black/[0.05]"}`,
									children: [
										/* @__PURE__ */ C(vt, { className: "h-4 w-4" }),
										(Dt || t.color) && /* @__PURE__ */ C("span", {
											className: "h-2 w-2 rounded-full",
											style: { backgroundColor: f },
											"aria-hidden": !0
										}),
										/* @__PURE__ */ C("span", {
											className: "rounded-full bg-white px-1.5 text-[11px] text-stone-400",
											children: a.length
										}),
										/* @__PURE__ */ C("span", {
											className: "mt-1 whitespace-nowrap text-xs font-medium text-stone-600 [writing-mode:vertical-rl]",
											children: t.name
										})
									]
								}, t.key) : /* @__PURE__ */ w("div", {
									"data-col-key": t.key,
									className: `flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-stone-100/60 transition-opacity ${Ce === t.key ? "opacity-50" : ""} ${u ? "border-brand/60" : re?.col === t.key ? "border-brand/40" : "border-black/[0.05]"}`,
									children: [/* @__PURE__ */ w("div", {
										className: "flex items-center justify-between gap-1 rounded-t-xl px-3 py-2",
										style: Dt ? { backgroundColor: `${f}1f` } : void 0,
										children: [/* @__PURE__ */ w("div", {
											onPointerDown: (e) => Pn(e, t),
											onPointerMove: (e) => Fn(e, t),
											onPointerUp: (e) => In(e, t),
											className: `flex min-w-0 flex-1 select-none items-center gap-1.5 text-sm font-medium text-stone-700 ${ht && r.reorderColumns ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
											children: [
												/* @__PURE__ */ C("button", {
													type: "button",
													onClick: () => Ln(t.key),
													title: W._({ id: "pwN6Ae" }),
													className: "-ml-1 rotate-90 rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
													children: /* @__PURE__ */ C(vt, { className: "h-3.5 w-3.5" })
												}),
												(Dt || t.color) && /* @__PURE__ */ C("span", {
													className: "h-2 w-2 rounded-full",
													style: { backgroundColor: f },
													"aria-hidden": !0
												}),
												/* @__PURE__ */ C("span", {
													className: "truncate",
													children: t.name || W._({ id: "EbMPZJ" })
												}),
												s && /* @__PURE__ */ C(ut, {
													className: "h-3.5 w-3.5 shrink-0 text-emerald-500",
													title: W._({ id: "_5CsXX" })
												}),
												/* @__PURE__ */ w("span", {
													className: `rounded-full px-1.5 text-xs ${d ? "bg-red-100 font-medium text-red-600" : "bg-white text-stone-400"}`,
													title: t.limit == null ? void 0 : W._({
														id: "d5z6xQ",
														values: { 0: t.limit }
													}),
													children: [a.length, t.limit == null ? "" : `/${t.limit}`]
												})
											]
										}), ht && !P && Cn && /* @__PURE__ */ w(vm, {
											as: "div",
											className: "relative shrink-0",
											children: [/* @__PURE__ */ C(fm, {
												className: "rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
												children: /* @__PURE__ */ C(Mt, { className: "h-4 w-4" })
											}), /* @__PURE__ */ w(pm, {
												anchor: "bottom end",
												className: `z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${cn}`,
												children: [
													r.renameColumn && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.renameColumn?.(t.key),
														children: [/* @__PURE__ */ C(an, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "2wxgft" })]
													}) }),
													r.toggleDoneColumn && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.toggleDoneColumn?.(t.key),
														children: [/* @__PURE__ */ C(ut, { className: "h-3.5 w-3.5" }), s ? /* @__PURE__ */ C(z, { id: "G4qrLy" }) : /* @__PURE__ */ C(z, { id: "wtw-au" })]
													}) }),
													r.setColumnLimit && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void r.setColumnLimit?.(t.key),
														children: [/* @__PURE__ */ C(Ht, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "Iw6WJa" })]
													}) }),
													r.setColumnColor && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ w("div", {
														className: "px-3 py-1",
														children: [/* @__PURE__ */ C("span", {
															className: "text-[11px] text-brand-gray",
															children: /* @__PURE__ */ C(z, { id: "jZlrte" })
														}), /* @__PURE__ */ w("div", {
															className: "mt-1 flex flex-wrap items-center gap-1.5",
															children: [Wn.map((e) => /* @__PURE__ */ C("button", {
																type: "button",
																title: e,
																onClick: () => void r.setColumnColor?.(t.key, e),
																className: `h-4 w-4 rounded-full ring-1 ring-black/10 ${t.color === e ? "ring-2 ring-offset-1 ring-stone-500" : ""}`,
																style: { backgroundColor: e }
															}, e)), /* @__PURE__ */ C("button", {
																type: "button",
																title: W._({ id: "H_SQFv" }),
																onClick: () => void r.setColumnColor?.(t.key, null),
																className: `flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${t.color ? "" : "ring-2 ring-offset-1 ring-stone-500"}`,
																children: /* @__PURE__ */ C("span", { className: "h-2 w-2 rounded-full bg-stone-300" })
															})]
														})]
													})] }),
													r.deleteColumn && /* @__PURE__ */ w(S, { children: [/* @__PURE__ */ C("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
														type: "button",
														disabled: Ft.length <= 1,
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 disabled:opacity-40 data-[focus]:bg-red-50",
														onClick: () => void r.deleteColumn?.(t.key),
														children: [/* @__PURE__ */ C(xn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cnGeoo" })]
													}) })] })
												]
											})]
										})]
									}), /* @__PURE__ */ w("div", {
										className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2",
										children: [
											a.map((t, i) => {
												let a = Nr(t.due) && t.due < jt && t.columnKey !== Et, s = Lt.get(t.id) ?? 0, c = Gt.get(t.id), l = t.priority && t.priority !== "none" || t.assignee || t.due || (t.taskTotal ?? 0) > 0 || t.tags.length > 0 || s > 0 || (c?.length ?? 0) > 0;
												return /* @__PURE__ */ w(n, { children: [o(i) && /* @__PURE__ */ C("div", { className: "mx-1 h-0.5 rounded bg-brand" }), /* @__PURE__ */ w("div", {
													onPointerDown: (e) => On(e, t),
													onPointerMove: (e) => An(e, t),
													onPointerUp: (e) => jn(e, t),
													className: `group relative block w-full rounded-lg bg-white text-left shadow-sm transition hover:ring-brand/30 ${P ? "touch-pan-y" : "touch-none select-none"} ${be === t.id ? "opacity-40" : ""} ${H.has(t.id) ? "ring-2 ring-brand/70" : $t?.id === t.id ? "ring-1 ring-brand/60" : "ring-1 ring-black/[0.04]"}`,
													children: [!P && /* @__PURE__ */ C("div", {
														className: "absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
														onClick: (e) => e.stopPropagation(),
														onMouseDown: (e) => e.stopPropagation(),
														onPointerDown: (e) => e.stopPropagation(),
														children: /* @__PURE__ */ w(vm, {
															as: "div",
															children: [/* @__PURE__ */ C(fm, {
																title: W._({
																	id: "KOXB6D",
																	values: { 0: t.title }
																}),
																"aria-label": W._({
																	id: "KOXB6D",
																	values: { 0: t.title }
																}),
																className: "rounded p-0.5 text-stone-400 outline-none hover:bg-stone-100 hover:text-stone-600 focus-visible:ring-2 focus-visible:ring-brand",
																children: /* @__PURE__ */ C(Mt, { className: "h-4 w-4" })
															}), /* @__PURE__ */ w(pm, {
																anchor: "bottom end",
																className: `z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${cn}`,
																children: [
																	r.openCardFull && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => r.openCardFull?.(t),
																		children: [/* @__PURE__ */ C(We, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "Ik60OC" })]
																	}) }),
																	r.copyCardLink && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.copyCardLink?.(t),
																		children: [/* @__PURE__ */ C(Jt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "y1eoq1" })]
																	}) }),
																	r.duplicateCard && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.duplicateCard?.(t),
																		children: [/* @__PURE__ */ C(At, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "euc6Ns" })]
																	}) }),
																	r.saveAsTemplate && /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.saveAsTemplate?.(t),
																		children: [/* @__PURE__ */ C(Qe, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "BnmEvM" })]
																	}) }),
																	/* @__PURE__ */ C("div", { className: "my-1 border-t border-black/[0.05]" }),
																	/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 data-[focus]:bg-red-50",
																		onClick: () => void r.deleteCard(t),
																		children: [/* @__PURE__ */ C(xn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cnGeoo" })]
																	}) })
																]
															})]
														})
													}), /* @__PURE__ */ w("button", {
														type: "button",
														"data-card-id": t.id,
														"data-card-index": i,
														onClick: (e) => {
															e.detail === 0 && mn(t);
														},
														className: "block w-full cursor-pointer rounded-lg p-2.5 pr-7 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand",
														children: [
															t.ticket && /* @__PURE__ */ C("span", {
																className: "mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
																children: t.ticket
															}),
															/* @__PURE__ */ w("span", {
																className: "block pr-5 text-sm text-stone-800",
																children: [t.icon && /* @__PURE__ */ C("span", {
																	className: "mr-1",
																	children: t.icon
																}), t.title]
															}),
															t.excerpt && t.excerpt !== t.title && /* @__PURE__ */ C("span", {
																className: "mt-0.5 block truncate text-[11px] text-stone-400",
																children: t.excerpt
															}),
															l && /* @__PURE__ */ w("span", {
																className: "mt-1.5 flex flex-wrap items-center gap-1.5",
																children: [
																	s > 0 && /* @__PURE__ */ w("span", {
																		className: "inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600",
																		title: W._({
																			id: "x52RAh",
																			values: { blockedCount: s }
																		}),
																		children: [/* @__PURE__ */ C(Xt, { className: "h-3 w-3" }), s]
																	}),
																	t.priority && t.priority !== "none" && /* @__PURE__ */ C("span", {
																		className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Un[t.priority] ?? "bg-stone-100 text-stone-500"}`,
																		children: t.priority
																	}),
																	(t.taskTotal ?? 0) > 0 && /* @__PURE__ */ w("span", {
																		className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.taskDone === t.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																		children: [
																			/* @__PURE__ */ C(ut, { className: "h-3 w-3" }),
																			t.taskDone,
																			"/",
																			t.taskTotal
																		]
																	}),
																	c && c.length > 0 && (() => {
																		let t = ar(c, e.doneColumn), n = 2 * Math.PI * 6;
																		return /* @__PURE__ */ w("span", {
																			className: `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.done === t.total ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																			title: W._({
																				id: "bwOqWD",
																				values: {
																					0: t.done,
																					1: t.total
																				}
																			}),
																			children: [
																				/* @__PURE__ */ w("svg", {
																					viewBox: "0 0 16 16",
																					className: "h-3 w-3 -rotate-90",
																					children: [/* @__PURE__ */ C("circle", {
																						cx: "8",
																						cy: "8",
																						r: "6",
																						fill: "none",
																						stroke: "currentColor",
																						strokeOpacity: "0.25",
																						strokeWidth: "3"
																					}), /* @__PURE__ */ C("circle", {
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
																	t.tags.map((e) => /* @__PURE__ */ w("span", {
																		className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
																		style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
																		children: [/* @__PURE__ */ C(yn, { className: "h-3 w-3" }), e.label]
																	}, e.label)),
																	t.assignee && /* @__PURE__ */ w("span", {
																		className: "inline-flex items-center gap-0.5 text-[11px] text-brand-gray",
																		children: [/* @__PURE__ */ C(Tn, { className: "h-3 w-3" }), t.assignee]
																	}),
																	t.due && /* @__PURE__ */ w("span", {
																		className: `inline-flex items-center gap-0.5 text-[11px] ${a ? "font-medium text-red-600" : "text-brand-gray"}`,
																		children: [/* @__PURE__ */ C(nt, { className: "h-3 w-3" }), t.due]
																	})
																]
															})
														]
													})]
												})] }, t.id);
											}),
											a.length === 0 ? be && re?.col === t.key && /* @__PURE__ */ C("div", { className: "mx-1 h-14 rounded-lg border-2 border-dashed border-brand/50 bg-brand-soft/30" }) : o(a.length) && /* @__PURE__ */ C("div", { className: "mx-1 h-0.5 rounded bg-brand" }),
											P ? null : c && c.length > 0 && l ? /* @__PURE__ */ w(vm, {
												as: "div",
												className: "relative",
												children: [/* @__PURE__ */ w(fm, {
													className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
													children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "pnrmSP" })]
												}), /* @__PURE__ */ w(pm, {
													anchor: "bottom start",
													className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${cn}`,
													children: [
														/* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
															type: "button",
															className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
															onClick: () => ce(t.key),
															children: [/* @__PURE__ */ C(an, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "UQOvxZ" })]
														}) }),
														/* @__PURE__ */ C("div", { className: "my-1 border-t border-black/[0.05]" }),
														/* @__PURE__ */ C("div", {
															className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
															children: /* @__PURE__ */ C(z, { id: "iTylMl" })
														}),
														c.map((e) => /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
															type: "button",
															className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
															onClick: () => void l(t.key, e.id),
															children: [/* @__PURE__ */ C(Qe, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("span", {
																className: "truncate",
																children: e.name
															})]
														}) }, e.id))
													]
												})]
											}) : /* @__PURE__ */ w("button", {
												type: "button",
												className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
												onClick: () => ce(t.key),
												children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "pnrmSP" })]
											})
										]
									})]
								}, t.key);
							}),
							ht && !P && r.addColumn && (le ? /* @__PURE__ */ C("input", {
								autoFocus: !0,
								className: "w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40",
								placeholder: W._({ id: "P5cvAA" }),
								value: de,
								onChange: (e) => fe(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										let e = de.trim();
										fe(""), ue(!1), e && r.addColumn?.(e);
									}
									e.key === "Escape" && (fe(""), ue(!1));
								},
								onBlur: () => {
									let e = de.trim();
									e && r.addColumn?.(e), fe(""), ue(!1);
								}
							}) : /* @__PURE__ */ w("button", {
								type: "button",
								className: "flex w-44 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 hover:border-brand/40 hover:text-brand-dark",
								onClick: () => {
									fe(""), ue(!0);
								},
								children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "1nUGn5" })]
							})),
							gt && !P && /* @__PURE__ */ w("button", {
								type: "button",
								className: "flex w-72 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 transition hover:border-brand/40 hover:bg-brand-soft/20 hover:text-brand-dark active:translate-y-px",
								onClick: () => Oe(!0),
								children: [/* @__PURE__ */ C(sn, { className: "h-4 w-4" }), /* @__PURE__ */ C(z, { id: "KCszT6" })]
							})
						]
					}) : /* @__PURE__ */ C(bg, {
						scope: yt,
						cards: t,
						inboxItems: Ut,
						currentUser: D,
						selectedId: $t?.id,
						selectedIds: H,
						readOnly: P,
						statusName: Zt,
						doneKey: Et,
						today: jt,
						blockedCardIds: Rt,
						onSelect: mn,
						onToggleSelect: Sn,
						onDismissInbox: (e) => ft({ dismissedInboxItemKeys: [.../* @__PURE__ */ new Set([...dt.dismissedInboxItemKeys ?? [], e])] })
					})
				]
			}),
			H.size > 0 && !P && /* @__PURE__ */ w("div", {
				className: "absolute inset-x-2 bottom-3 z-40 mx-auto flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-3 py-2 shadow-xl backdrop-blur",
				children: [
					/* @__PURE__ */ C("span", {
						className: "whitespace-nowrap text-xs font-medium text-stone-600",
						children: U ? /* @__PURE__ */ C(z, {
							id: "YOWshY",
							values: {
								0: U.completed,
								1: U.total
							}
						}) : /* @__PURE__ */ C(z, {
							id: "fvImQM",
							values: { 0: H.size }
						})
					}),
					/* @__PURE__ */ w("select", {
						disabled: !!U,
						className: on,
						value: "",
						"aria-label": W._({ id: "8enUYo" }),
						onChange: (e) => {
							e.target.value && Mn({ columnKey: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ C("option", {
							value: "",
							disabled: !0,
							children: W._({ id: "BiWlsk" })
						}), e.columns.map((e) => /* @__PURE__ */ C("option", {
							value: e.key,
							children: e.name
						}, e.key))]
					}),
					/* @__PURE__ */ w("select", {
						disabled: !!U,
						className: on,
						value: "",
						"aria-label": W._({ id: "hNmOZ7" }),
						onChange: (e) => {
							e.target.value && Mn({ priority: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ C("option", {
							value: "",
							disabled: !0,
							children: W._({ id: "B5TUF-" })
						}), Vn.map((e) => /* @__PURE__ */ C("option", {
							value: e,
							children: e
						}, e))]
					}),
					/* @__PURE__ */ w("select", {
						disabled: !!U,
						className: on,
						value: "",
						"aria-label": W._({ id: "Bkuvz9" }),
						onChange: (e) => {
							e.target.value !== "" && Mn({ assignee: e.target.value === "__none__" ? null : e.target.value }), e.target.value = "";
						},
						children: [
							/* @__PURE__ */ C("option", {
								value: "",
								disabled: !0,
								children: W._({ id: "TA4xJz" })
							}),
							/* @__PURE__ */ C("option", {
								value: "__none__",
								children: W._({ id: "EbMPZJ" })
							}),
							(u?.length ? u : Kt.map((e) => ({
								value: e,
								label: e
							}))).filter((e) => e.value !== "").map((e) => /* @__PURE__ */ C("option", {
								value: e.value,
								children: e.label
							}, e.value))
						]
					}),
					/* @__PURE__ */ w(vm, {
						as: "div",
						className: "relative",
						children: [/* @__PURE__ */ w(fm, {
							disabled: !!U,
							className: `${on} inline-flex items-center gap-1 disabled:opacity-50`,
							children: [/* @__PURE__ */ C(yn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cfaWH-" })]
						}), /* @__PURE__ */ C(pm, {
							anchor: "top start",
							className: `z-50 max-h-56 w-52 overflow-y-auto rounded-lg border border-line bg-white py-1 text-xs shadow-xl [--anchor-gap:6px] focus:outline-none${cn}`,
							children: Yt.length === 0 ? /* @__PURE__ */ C("div", {
								className: "px-3 py-2 text-stone-400",
								children: /* @__PURE__ */ C(z, { id: "GKu3m4" })
							}) : Yt.map((e) => /* @__PURE__ */ C(mm, { children: /* @__PURE__ */ w("button", {
								type: "button",
								onClick: () => void Mn((t) => ({ tags: t.tags.some((t) => t.label === e.label) ? t.tags : [...t.tags, e] })),
								className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
								children: [/* @__PURE__ */ C("span", {
									className: `h-2.5 w-2.5 rounded-full ${e.color ? "" : "bg-stone-300"}`,
									style: e.color ? { backgroundColor: e.color } : void 0
								}), /* @__PURE__ */ C("span", {
									className: "truncate",
									children: e.label
								})]
							}) }, e.label))
						})]
					}),
					/* @__PURE__ */ w("label", {
						className: "inline-flex items-center gap-1 text-[10px] text-brand-gray",
						children: [/* @__PURE__ */ C(nt, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("input", {
							disabled: !!U,
							type: "date",
							"aria-label": W._({ id: "8AbRER" }),
							className: `${on} w-[8.4rem]`,
							onChange: (e) => {
								Mn({ due: e.target.value || null }), e.currentTarget.value = "";
							}
						})]
					}),
					/* @__PURE__ */ C("button", {
						type: "button",
						disabled: !!U,
						onClick: () => void Mn({ due: null }),
						title: W._({ id: "Cx7myC" }),
						"aria-label": W._({ id: "Cx7myC" }),
						className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 outline-none hover:border-brand/40 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
						children: /* @__PURE__ */ C(kn, { className: "h-3.5 w-3.5" })
					}),
					/* @__PURE__ */ C("button", {
						type: "button",
						disabled: !!U,
						onClick: () => void Mn({ archived: !t.filter((e) => H.has(e.id)).every((e) => e.archived) }),
						className: "inline-flex h-7 items-center gap-1 rounded-md border border-stone-200 px-2 text-xs font-medium text-stone-600 outline-none hover:border-brand/40 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
						children: t.filter((e) => H.has(e.id)).every((e) => e.archived) ? /* @__PURE__ */ C(z, { id: "yKu_3Y" }) : /* @__PURE__ */ C(z, { id: "B495Gs" })
					}),
					r.deleteCards && /* @__PURE__ */ w("button", {
						type: "button",
						disabled: !!U,
						className: "inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50",
						onClick: () => void Nn(),
						children: [/* @__PURE__ */ C(xn, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C(z, { id: "cnGeoo" })]
					}),
					ve && /* @__PURE__ */ C("span", {
						role: "alert",
						className: "max-w-48 truncate text-[10px] text-red-600",
						title: ve,
						children: ve
					}),
					/* @__PURE__ */ C("button", {
						type: "button",
						disabled: !!U,
						className: "rounded p-1 text-stone-400 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
						title: W._({ id: "FBIuPX" }),
						"aria-label": W._({ id: "FBIuPX" }),
						onClick: () => ne(/* @__PURE__ */ new Set()),
						children: /* @__PURE__ */ C(kn, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ C(Cg, {
				open: se != null && !P,
				boardTitle: e.title,
				laneName: Ft.find((e) => e.key === se)?.name ?? W._({ id: "EbMPZJ" }),
				initialStatus: mt === "status" ? se ?? e.columns[0]?.key ?? "" : e.columns[0]?.key ?? "",
				initialPriority: mt === "priority" ? se ?? "none" : "none",
				initialAssignee: mt === "assignee" ? se ?? "" : "",
				statusOptions: e.columns.map((e) => ({
					value: e.key,
					label: e.name,
					color: e.color
				})),
				assigneeOptions: u,
				tagOptions: d,
				portalClassName: R,
				onClose: () => ce(null),
				onCreate: (e) => se == null ? void 0 : Rn(se, e)
			}),
			$t && L && /* @__PURE__ */ w(jf, {
				open: !0,
				onClose: () => st.current ? st.current() : vn(),
				className: `fixed inset-0 z-50${cn}`,
				children: [/* @__PURE__ */ C(kf, { className: `fixed inset-0 bg-stone-950/12 transition-opacity${cn}` }), /* @__PURE__ */ C("div", {
					className: `fixed inset-0 flex justify-end overflow-hidden${cn}`,
					children: /* @__PURE__ */ w(Of, {
						"data-testid": "card-detail-sheet",
						className: `h-full w-full overflow-hidden bg-white shadow-[-24px_0_80px_rgba(28,25,23,0.18)] ring-1 ring-black/[0.06] sm:max-w-[52rem] sm:rounded-l-2xl${cn}`,
						children: [/* @__PURE__ */ C(Af, {
							className: "sr-only",
							children: /* @__PURE__ */ C(z, { id: "iROlQr" })
						}), /* @__PURE__ */ C(L, {
							card: $t,
							boardTitle: e.title,
							statusOptions: e.columns.map((e) => ({
								value: e.key,
								label: e.name
							})),
							swimlaneOptions: mt === "custom" || (e.swimlanes?.length ?? 0) > 0 ? [
								{
									value: "",
									label: W._({ id: "EbMPZJ" })
								},
								...(e.swimlanes ?? []).map((e) => ({
									value: e.key,
									label: e.name,
									color: e.color
								})),
								...$t.swimlaneKey && !(e.swimlanes ?? []).some((e) => e.key === $t.swimlaneKey) ? [{
									value: $t.swimlaneKey,
									label: W._({ id: "7dZyQU" }),
									warning: !0
								}] : []
							] : void 0,
							swimlaneDisabled: Re || P,
							assigneeOptions: u,
							tagOptions: d,
							fields: e.fields,
							onAddField: P ? void 0 : (t) => {
								let n = /* @__PURE__ */ new Set([...Gn, ...(e.fields ?? []).map((e) => e.key)]), r = sr(t);
								if (n.has(r)) {
									let e = 2;
									for (; n.has(`${r}-${e}`);) e += 1;
									r = `${r}-${e}`;
								}
								un({ fields: [...e.fields ?? [], {
									key: r,
									label: t
								}] });
							},
							dependencyCards: t.filter((e) => e.id !== $t.id).map((e) => ({
								slug: er(e),
								title: e.title
							})),
							childCards: (Gt.get($t.id) ?? []).map((e) => ({
								id: e.id,
								title: e.title,
								icon: e.icon,
								statusName: Zt(e.columnKey),
								done: e.columnKey === Et
							})),
							onOpenCard: gn,
							onAddChild: P ? void 0 : async (t) => {
								await tt.current.get($t.id);
								let n = mt === "status" ? e.columns[0]?.key ?? $t.columnKey : yr($t, pt);
								await r.createCard(n, t, { parent: er($t) });
							},
							loadNotes: p,
							onUploadAttachment: P ? void 0 : m,
							loadComments: h,
							addComment: P ? void 0 : g,
							updateComment: P ? void 0 : v,
							deleteComment: P ? void 0 : x,
							toggleReaction: P ? void 0 : T,
							resolveComment: P ? void 0 : E,
							currentUser: D,
							loadActivity: O,
							renderMarkdownToContainer: k,
							renderMarkdownToHtml: A,
							portalClassName: R,
							supplement: I?.($t),
							readOnly: P,
							onBack: te.length > 1 ? bn : void 0,
							onChange: (e) => Nt($t.id, e),
							onCloseRequestReady: (e) => {
								st.current = e;
							},
							onClose: vn,
							onDelete: P ? void 0 : () => Promise.resolve(r.deleteCard($t)),
							onOpenFull: !P && r.openCardFull ? () => r.openCardFull?.($t) : void 0
						})]
					})
				})]
			}),
			/* @__PURE__ */ C(kg, {
				open: De && !P,
				lanes: e.swimlanes ?? [],
				cards: t,
				portalClassName: R,
				onClose: () => Oe(!1),
				onSaveLanes: fn,
				onUpdateCards: tn,
				onShowAffected: pn
			}),
			/* @__PURE__ */ C(Sg, {
				open: Pe && !P,
				project: e.project,
				portalClassName: R,
				onClose: () => Fe(!1),
				onSave: async (e) => {
					if (P) throw Error(W._({ id: "gpGcIe" }));
					await r.setConfig({ project: e });
				}
			}),
			/* @__PURE__ */ C(Eg, {
				open: ke && !P,
				config: e,
				actions: r,
				portalClassName: R,
				onClose: () => je(!1)
			}),
			/* @__PURE__ */ C(Ag, {
				source: Ie,
				rows: en,
				open: Me && !P,
				busy: Re,
				resume: e.swimlaneMigration?.source === Ie,
				progress: Be,
				error: Ue,
				portalClassName: R,
				onClose: () => {
					Re || Ne(!1);
				},
				onConfirm: rn
			}),
			be && Te && (() => {
				let e = t.find((e) => e.id === be);
				return /* @__PURE__ */ w("div", {
					className: "pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-xl ring-1 ring-brand/40",
					style: {
						left: Te.x,
						top: Te.y
					},
					children: [e?.icon && /* @__PURE__ */ C("span", {
						className: "mr-1",
						children: e.icon
					}), e?.title]
				});
			})()
		]
	});
}
//#endregion
//#region ../../shared/components/board/types.ts
function Mg(e, t) {
	let n = (e) => e ? ((...n) => t() ? void 0 : e(...n)) : void 0;
	return {
		...e,
		moveCard: n(e.moveCard),
		createCard: n(e.createCard),
		updateCard: n(e.updateCard),
		updateCards: n(e.updateCards),
		deleteCard: n(e.deleteCard),
		deleteCards: n(e.deleteCards),
		duplicateCard: n(e.duplicateCard),
		copyCardLink: n(e.copyCardLink),
		saveAsTemplate: n(e.saveAsTemplate),
		openCardFull: n(e.openCardFull),
		reorderColumns: n(e.reorderColumns),
		addColumn: n(e.addColumn),
		renameColumn: n(e.renameColumn),
		deleteColumn: n(e.deleteColumn),
		setColumnColor: n(e.setColumnColor),
		setColumnLimit: n(e.setColumnLimit),
		toggleDoneColumn: n(e.toggleDoneColumn),
		setConfig: n(e.setConfig)
	};
}
//#endregion
//#region src/client.ts
var Ng = class extends Error {
	status;
	code;
	constructor(e, t) {
		super(`jtype API error${e ? ` ${e}` : ""}: ${t}`), this.name = "JTypeApiError", this.status = e, this.code = t;
	}
};
function Pg(e) {
	let t = (e.baseUrl ?? "").replace(/\/+$/, ""), n = e.token, r = e.fetchImpl ?? ((...e) => fetch(...e));
	if (!t) throw new Ng(0, "base_url_required");
	if (!n) throw new Ng(0, "token_required");
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
			throw new Ng(0, "network_error");
		}
		if (!a.ok) {
			let e = await a.json().catch(() => null);
			throw new Ng(a.status, e?.error || `http_${a.status}`);
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
var Fg = class extends Error {
	code;
	candidates;
	constructor(e, t, n = []) {
		super(t ? `${e}: ${t}` : e), this.name = "JTypeBoardError", this.code = e, this.candidates = n;
	}
};
function Ig(e, t) {
	let n = t.trim().replace(/^\.?\//, "");
	if (!n) throw new Fg("board_not_found", "empty boardRef");
	let r = n.toLowerCase(), i = r.endsWith(".board") ? r : `${r}.board`, a = e.filter((e) => e.relativePath.toLowerCase().endsWith(".board")), o = a.find((e) => {
		let t = e.relativePath.toLowerCase();
		return t === r || t === i;
	});
	if (o) return Lg(o);
	let s = a.filter((e) => e.relativePath.toLowerCase().endsWith(`/${i}`));
	if (s.length === 1) return Lg(s[0]);
	throw s.length > 1 ? new Fg("board_ref_ambiguous", `"${t}" matches ${s.length} boards`, s.map((e) => e.relativePath)) : new Fg("board_not_found", `no .board document matches "${t}"`);
}
function Lg(e) {
	return {
		boardDocId: e.id,
		boardRelativePath: e.relativePath,
		boardDir: e.relativePath.replace(/\.board$/i, "")
	};
}
//#endregion
//#region src/boardData.ts
function Rg(e, t) {
	return {
		title: e.title || t,
		columns: e.columns,
		project: e.project,
		doneColumn: e.doneColumn,
		colorColumns: e.colorColumns,
		viewType: e.viewType,
		calendarMode: e.calendarMode,
		fields: e.fields,
		labels: e.labels,
		ticketKey: e.ticketKey,
		swimlaneBy: ur(e.swimlaneBy),
		swimlanes: e.swimlanes,
		swimlaneMigration: e.swimlaneMigration,
		groupBy: lr(e.groupBy)
	};
}
function zg(e, t) {
	let n = An(e.content);
	if (n.data.board !== t.id) return null;
	let r = Kn(n.body);
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
		start: n.data.start || null,
		due: n.data.due || null,
		reminder: n.data.reminder || null,
		archived: [
			"true",
			"1",
			"yes"
		].includes((n.data.archived || "").toLowerCase()),
		tags: Zn(n.data.tags ? Jn(n.data.tags) : [], t.labels),
		notes: n.body,
		taskDone: r.done,
		taskTotal: r.total,
		excerpt: qn(n.body),
		attachments: n.data.attachments ? Nn(n.data.attachments) : [],
		custom: zn(n.data, t.fields),
		blockedBy: n.data.blocked_by ? Qn(n.data.blocked_by) : [],
		blocks: n.data.blocks ? Qn(n.data.blocks) : [],
		relates: n.data.relates ? Qn(n.data.relates) : [],
		parent: n.data.parent ? Qn(n.data.parent)[0] ?? null : null
	};
}
function Bg(e, t) {
	return In(e, t);
}
var Vg = 8;
async function Hg(e, t, n) {
	let r = Array(e.length), i = 0, a = async () => {
		for (; i < e.length;) {
			let t = i;
			i += 1, r[t] = await n(e[t], t);
		}
	};
	return await Promise.all(Array.from({ length: Math.min(t, e.length) }, () => a())), r;
}
async function Ug(e, t, n, r, i) {
	let a = await e.listDocuments(t), o = Ig(a, n), s = async (n, i) => {
		let a = r.get(n);
		if (a && a.contentHash === i) return a.doc;
		let o = await e.getDocument(t, n);
		return r.set(n, {
			contentHash: o.contentHash,
			doc: o
		}), o;
	}, c = a.find((e) => e.id === o.boardDocId), l = await s(c.id, c.contentHash), u;
	try {
		u = Mn(l.content, o.boardDir);
	} catch (e) {
		throw new Fg("board_config_invalid", `${o.boardRelativePath}: ${String(e)}`);
	}
	let d = await Hg(a.filter((e) => e.relativePath.toLowerCase().endsWith(".md") && (i === void 0 || e.relativePath.startsWith(`${o.boardDir}/`) || i.some((t) => e.relativePath.startsWith(`${t}/`)))), Vg, async (e) => ({
		item: e,
		doc: await s(e.id, e.contentHash)
	})), f = /* @__PURE__ */ new Map(), p = [];
	for (let { item: e, doc: t } of d) {
		let n = zg(t, u);
		n && (f.set(t.relativePath, {
			id: e.id,
			relativePath: t.relativePath,
			content: t.content,
			contentHash: t.contentHash
		}), p.push(n));
	}
	let m = new Set(a.map((e) => e.id));
	for (let e of [...r.keys()]) m.has(e) || r.delete(e);
	return {
		config: u,
		boardDocId: o.boardDocId,
		boardRelativePath: o.boardRelativePath,
		boardDir: o.boardDir,
		boardDoc: {
			content: l.content,
			contentHash: l.contentHash
		},
		cards: p,
		metaByPath: f
	};
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/env.js
var Wg = Object.defineProperty, Gg = (e, t, n) => t in e ? Wg(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Kg = (e, t, n) => (Gg(e, typeof t == "symbol" ? t : t + "", n), n), qg = new class {
	constructor() {
		Kg(this, "current", this.detect()), Kg(this, "handoffState", "pending"), Kg(this, "currentId", 0);
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
//#region node_modules/@headlessui/react/dist/utils/owner.js
function Jg(e) {
	return qg.isServer ? null : e == null ? document : e?.ownerDocument ?? document;
}
function Yg(e) {
	return qg.isServer ? null : e == null ? document : (e?.getRootNode)?.call(e) ?? document;
}
function Xg(e) {
	return Yg(e)?.activeElement ?? null;
}
function Zg(e) {
	return Xg(e) === e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/micro-task.js
function Qg(e) {
	typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((e) => setTimeout(() => {
		throw e;
	}));
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/disposables.js
function $g() {
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
			return Qg(() => {
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
			let t = $g();
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
//#region node_modules/@headlessui/react/dist/hooks/use-disposables.js
function e_() {
	let [e] = b($g);
	return f(() => () => e.dispose(), [e]), e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
var t_ = (e, t) => {
	qg.isServer ? f(e, t) : g(e, t);
};
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-latest-value.js
function n_(e) {
	let t = y(e);
	return t_(() => {
		t.current = e;
	}, [e]), t;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-event.js
var r_ = function(e) {
	let n = n_(e);
	return t.useCallback((...e) => n.current(...e), [n]);
};
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-slot.js
function i_(e) {
	return _(() => e, Object.values(e));
}
//#endregion
//#region node_modules/@headlessui/react/dist/internal/disabled.js
var a_ = i(void 0);
function o_() {
	return u(a_);
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/class-names.js
function s_(...e) {
	return Array.from(new Set(e.flatMap((e) => typeof e == "string" ? e.split(" ") : []))).filter(Boolean).join(" ");
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/match.js
function c_(e, t, ...n) {
	if (e in t) {
		let r = t[e];
		return typeof r == "function" ? r(...n) : r;
	}
	let r = /* @__PURE__ */ Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((e) => `"${e}"`).join(", ")}.`);
	throw Error.captureStackTrace && Error.captureStackTrace(r, c_), r;
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/render.js
var l_ = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(l_ || {}), u_ = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(u_ || {});
function d_() {
	let e = m_();
	return l((t) => f_({
		mergeRefs: e,
		...t
	}), [e]);
}
function f_({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: a = !0, name: o, mergeRefs: s }) {
	s ??= h_;
	let c = g_(t, e);
	if (a) return p_(c, n, r, o, s);
	let l = i ?? 0;
	if (l & 2) {
		let { static: e = !1, ...t } = c;
		if (e) return p_(t, n, r, o, s);
	}
	if (l & 1) {
		let { unmount: e = !0, ...t } = c;
		return c_(+!e, {
			0() {
				return null;
			},
			1() {
				return p_({
					...t,
					hidden: !0,
					style: { display: "none" }
				}, n, r, o, s);
			}
		});
	}
	return p_(c, n, r, o, s);
}
function p_(e, t = {}, n, i, o) {
	let { as: s = n, children: l, refName: u = "ref", ...d } = y_(e, ["unmount", "static"]), f = e.ref === void 0 ? {} : { [u]: e.ref }, p = typeof l == "function" ? l(t) : l;
	p = x_(p), "className" in d && d.className && typeof d.className == "function" && (d.className = d.className(t)), d["aria-labelledby"] && d["aria-labelledby"] === d.id && (d["aria-labelledby"] = void 0);
	let m = {};
	if (t) {
		let e = !1, n = [];
		for (let [r, i] of Object.entries(t)) typeof i == "boolean" && (e = !0), i === !0 && n.push(r.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`));
		if (e) {
			m["data-headlessui-state"] = n.join(" ");
			for (let e of n) m[`data-${e}`] = "";
		}
	}
	if (S_(s) && (Object.keys(v_(d)).length > 0 || Object.keys(v_(m)).length > 0)) if (!c(p) || Array.isArray(p) && p.length > 1 || C_(p)) {
		if (Object.keys(v_(d)).length > 0) throw Error([
			"Passing props on \"Fragment\"!",
			"",
			`The current component <${i} /> is rendering a "Fragment".`,
			"However we need to passthrough the following props:",
			Object.keys(v_(d)).concat(Object.keys(v_(m))).map((e) => `  - ${e}`).join("\n"),
			"",
			"You can apply a few solutions:",
			["Add an `as=\"...\"` prop, to ensure that we render an actual element instead of a \"Fragment\".", "Render a single element as the child so that we can forward the props onto that element."].map((e) => `  - ${e}`).join("\n")
		].join("\n"));
	} else {
		let e = p.props?.className, t = typeof e == "function" ? (...t) => s_(e(...t), d.className) : s_(e, d.className), n = t ? { className: t } : {}, i = g_(p.props, v_(y_(d, ["ref"])));
		for (let e in m) e in i && delete m[e];
		return r(p, Object.assign({}, i, m, f, { ref: o(b_(p), f.ref) }, n));
	}
	return a(s, Object.assign({}, y_(d, ["ref"]), !S_(s) && f, !S_(s) && m), p);
}
function m_() {
	let e = y([]), t = l((t) => {
		for (let n of e.current) n != null && (typeof n == "function" ? n(t) : n.current = t);
	}, []);
	return (...n) => {
		if (!n.every((e) => e == null)) return e.current = n, t;
	};
}
function h_(...e) {
	return e.every((e) => e == null) ? void 0 : (t) => {
		for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
	};
}
function g_(...e) {
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
function __(e) {
	return Object.assign(s(e), { displayName: e.displayName ?? e.name });
}
function v_(e) {
	let t = Object.assign({}, e);
	for (let e in t) t[e] === void 0 && delete t[e];
	return t;
}
function y_(e, t = []) {
	let n = Object.assign({}, e);
	for (let e of t) e in n && delete n[e];
	return n;
}
function b_(e) {
	return t.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function x_(e) {
	if (e != null && e.$$typeof === Symbol.for("react.lazy")) {
		let t = e._payload;
		if (t != null && t.status === "fulfilled") return x_(t.value);
	}
	return e;
}
function S_(e) {
	return e === n || e === Symbol.for("react.fragment");
}
function C_(e) {
	return S_(e.type);
}
//#endregion
//#region node_modules/@headlessui/react/dist/internal/hidden.js
var w_ = "span", T_ = ((e) => (e[e.None = 1] = "None", e[e.Focusable = 2] = "Focusable", e[e.Hidden = 4] = "Hidden", e))(T_ || {});
function E_(e, t) {
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
	return d_()({
		ourProps: i,
		theirProps: r,
		slot: {},
		defaultTag: w_,
		name: "Hidden"
	});
}
var D_ = __(E_);
//#endregion
//#region node_modules/@headlessui/react/dist/utils/dom.js
function O_(e) {
	return typeof e != "object" || !e ? !1 : "nodeType" in e;
}
function k_(e) {
	return O_(e) && "tagName" in e;
}
function A_(e) {
	return k_(e) && "accessKey" in e;
}
function j_(e) {
	return k_(e) && "tabIndex" in e;
}
function M_(e) {
	return k_(e) && "style" in e;
}
function N_(e) {
	return A_(e) && e.nodeName === "IFRAME";
}
function P_(e) {
	return A_(e) && e.nodeName === "INPUT";
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
var F_ = Symbol();
function I_(e, t = !0) {
	return Object.assign(e, { [F_]: t });
}
function L_(...e) {
	let t = y(e);
	f(() => {
		t.current = e;
	}, [e]);
	let n = r_((e) => {
		for (let n of t.current) n != null && (typeof n == "function" ? n(e) : n.current = e);
	});
	return e.every((e) => e == null || e?.[F_]) ? void 0 : n;
}
//#endregion
//#region node_modules/@headlessui/react/dist/components/description/description.js
var R_ = i(null);
R_.displayName = "DescriptionContext";
function z_() {
	let e = u(R_);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Description /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, z_), e;
	}
	return e;
}
function B_() {
	let [e, n] = b([]);
	return [e.length > 0 ? e.join(" ") : void 0, _(() => function(e) {
		let r = r_((e) => (n((t) => [...t, e]), () => n((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), i = _(() => ({
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
		return t.createElement(R_.Provider, { value: i }, e.children);
	}, [n])];
}
var V_ = "p";
function H_(e, t) {
	let n = h(), r = o_(), { id: i = `headlessui-description-${n}`, ...a } = e, o = z_(), s = L_(t);
	t_(() => o.register(i), [i, o.register]);
	let c = i_({
		...o.slot,
		disabled: r || !1
	}), l = {
		ref: s,
		...o.props,
		id: i
	};
	return d_()({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: V_,
		name: o.name || "Description"
	});
}
var U_ = __(H_), W_ = Object.assign(U_, {}), G_ = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(G_ || {}), K_ = i(() => {});
function q_({ value: e, children: n }) {
	return t.createElement(K_.Provider, { value: e }, n);
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/default-map.js
var J_ = class extends Map {
	constructor(e) {
		super(), this.factory = e;
	}
	get(e) {
		let t = super.get(e);
		return t === void 0 && (t = this.factory(e), this.set(e, t)), t;
	}
}, Y_ = Object.defineProperty, X_ = (e, t, n) => t in e ? Y_(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Z_ = (e, t, n) => (X_(e, typeof t == "symbol" ? t : t + "", n), n), Q_ = (e, t, n) => {
	if (!t.has(e)) throw TypeError("Cannot " + n);
}, $_ = (e, t, n) => (Q_(e, t, "read from private field"), n ? n.call(e) : t.get(e)), ev = (e, t, n) => {
	if (t.has(e)) throw TypeError("Cannot add the same private member more than once");
	t instanceof WeakSet ? t.add(e) : t.set(e, n);
}, tv = (e, t, n, r) => (Q_(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), nv, rv, iv, av = class {
	constructor(e) {
		ev(this, nv, {}), ev(this, rv, new J_(() => /* @__PURE__ */ new Set())), ev(this, iv, /* @__PURE__ */ new Set()), Z_(this, "disposables", $g()), tv(this, nv, e), qg.isServer && this.disposables.microTask(() => {
			this.dispose();
		});
	}
	dispose() {
		this.disposables.dispose();
	}
	get state() {
		return $_(this, nv);
	}
	subscribe(e, t) {
		if (qg.isServer) return () => {};
		let n = {
			selector: e,
			callback: t,
			current: e($_(this, nv))
		};
		return $_(this, iv).add(n), this.disposables.add(() => {
			$_(this, iv).delete(n);
		});
	}
	on(e, t) {
		return qg.isServer ? () => {} : ($_(this, rv).get(e).add(t), this.disposables.add(() => {
			$_(this, rv).get(e).delete(t);
		}));
	}
	send(e) {
		let t = this.reduce($_(this, nv), e);
		if (t !== $_(this, nv)) {
			tv(this, nv, t);
			for (let e of $_(this, iv)) {
				let t = e.selector($_(this, nv));
				ov(e.current, t) || (e.current = t, e.callback(t));
			}
			for (let t of $_(this, rv).get(e.type)) t($_(this, nv), e);
		}
	}
};
nv = /* @__PURE__ */ new WeakMap(), rv = /* @__PURE__ */ new WeakMap(), iv = /* @__PURE__ */ new WeakMap();
function ov(e, t) {
	return Object.is(e, t) ? !0 : typeof e != "object" || !e || typeof t != "object" || !t ? !1 : Array.isArray(e) && Array.isArray(t) ? e.length === t.length && sv(e[Symbol.iterator](), t[Symbol.iterator]()) : e instanceof Map && t instanceof Map || e instanceof Set && t instanceof Set ? e.size === t.size && sv(e.entries(), t.entries()) : cv(e) && cv(t) ? sv(Object.entries(e)[Symbol.iterator](), Object.entries(t)[Symbol.iterator]()) : !1;
}
function sv(e, t) {
	do {
		let n = e.next(), r = t.next();
		if (n.done && r.done) return !0;
		if (n.done || r.done || !Object.is(n.value, r.value)) return !1;
	} while (!0);
}
function cv(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
//#endregion
//#region node_modules/@headlessui/react/dist/machines/stack-machine.js
var lv = Object.defineProperty, uv = (e, t, n) => t in e ? lv(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, dv = (e, t, n) => (uv(e, typeof t == "symbol" ? t : t + "", n), n), fv = ((e) => (e[e.Push = 0] = "Push", e[e.Pop = 1] = "Pop", e))(fv || {}), pv = {
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
}, mv = class e extends av {
	constructor() {
		super(...arguments), dv(this, "actions", {
			push: (e) => this.send({
				type: 0,
				id: e
			}),
			pop: (e) => this.send({
				type: 1,
				id: e
			})
		}), dv(this, "selectors", {
			isTop: (e, t) => e.stack[e.stack.length - 1] === t,
			inStack: (e, t) => e.stack.includes(t)
		});
	}
	static new() {
		return new e({ stack: [] });
	}
	reduce(e, t) {
		return c_(t.type, pv, e, t);
	}
}, hv = new J_(() => mv.new());
//#endregion
//#region node_modules/@headlessui/react/dist/react-glue.js
function gv(e, t, n = ov) {
	return Xo(r_((t) => e.subscribe(_v, t)), r_(() => e.state), r_(() => e.state), r_(t), n);
}
function _v(e) {
	return e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
function vv(e, t) {
	let n = p(), r = hv.get(t), [i, a] = gv(r, l((e) => [r.selectors.isTop(e, n), r.selectors.inStack(e, n)], [r, n]));
	return t_(() => {
		if (e) return r.actions.push(n), () => r.actions.pop(n);
	}, [
		r,
		e,
		n
	]), e ? !a || i : !1;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-inert-others.js
var yv = /* @__PURE__ */ new Map(), bv = /* @__PURE__ */ new Map();
function xv(e) {
	let t = bv.get(e) ?? 0;
	return bv.set(e, t + 1), t === 0 ? (yv.set(e, {
		"aria-hidden": e.getAttribute("aria-hidden"),
		inert: e.inert
	}), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => Sv(e)) : () => Sv(e);
}
function Sv(e) {
	let t = bv.get(e) ?? 1;
	if (t === 1 ? bv.delete(e) : bv.set(e, t - 1), t !== 1) return;
	let n = yv.get(e);
	n && (n["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", n["aria-hidden"]), e.inert = n.inert, yv.delete(e));
}
function Cv(e, { allowed: t, disallowed: n } = {}) {
	let r = vv(e, "inert-others");
	t_(() => {
		if (!r) return;
		let e = $g();
		for (let t of n?.() ?? []) t && e.add(xv(t));
		let i = t?.() ?? [];
		for (let t of i) {
			if (!t) continue;
			let n = Jg(t);
			if (!n) continue;
			let r = t.parentElement;
			for (; r && r !== n.body;) {
				for (let t of r.children) i.some((e) => t.contains(e)) || e.add(xv(t));
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
//#region node_modules/@headlessui/react/dist/hooks/use-on-disappear.js
function wv(e, t, n) {
	let r = n_((e) => {
		let t = e.getBoundingClientRect();
		t.x === 0 && t.y === 0 && t.width === 0 && t.height === 0 && n();
	});
	f(() => {
		if (!e) return;
		let n = t === null ? null : A_(t) ? t : t.current;
		if (!n) return;
		let i = $g();
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
//#region node_modules/@headlessui/react/dist/utils/focus-management.js
var Tv = [
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
].map((e) => `${e}:not([tabindex='-1'])`).join(","), Ev = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(","), Dv = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(Dv || {}), Ov = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(Ov || {}), kv = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(kv || {});
function Av(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(Tv)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
function jv(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(Ev)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
var Mv = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(Mv || {});
function Nv(e, t = 0) {
	return e !== Jg(e)?.body && c_(t, {
		0() {
			return e.matches(Tv);
		},
		1() {
			let t = e;
			for (; t !== null;) {
				if (t.matches(Tv)) return !0;
				t = t.parentElement;
			}
			return !1;
		}
	});
}
var Pv = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(Pv || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
	e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
function Fv(e) {
	e?.focus({ preventScroll: !0 });
}
var Iv = ["textarea", "input"].join(",");
function Lv(e) {
	return (e?.matches)?.call(e, Iv) ?? !1;
}
function Rv(e, t = (e) => e) {
	return e.slice().sort((e, n) => {
		let r = t(e), i = t(n);
		if (r === null || i === null) return 0;
		let a = r.compareDocumentPosition(i);
		return a & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : a & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
	});
}
function zv(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
	let a = Array.isArray(e) ? e.length > 0 ? Yg(e[0]) : document : Yg(e), o = Array.isArray(e) ? n ? Rv(e) : e : t & 64 ? jv(e) : Av(e);
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
	} while (f !== Xg(f));
	return t & 6 && Lv(f) && f.select(), 2;
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/platform.js
function Bv() {
	return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function Vv() {
	return /Android/gi.test(window.navigator.userAgent);
}
function Hv() {
	return Bv() || Vv();
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-document-event.js
function Uv(e, t, n, r) {
	let i = n_(n);
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
//#region node_modules/@headlessui/react/dist/hooks/use-window-event.js
function Wv(e, t, n, r) {
	let i = n_(n);
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
//#region node_modules/@headlessui/react/dist/hooks/use-outside-click.js
var Gv = 30;
function Kv(e, t, n) {
	let r = n_(n), i = l(function(e, n) {
		if (e.defaultPrevented) return;
		let i = n(e);
		if (i === null || !i.getRootNode().contains(i) || !i.isConnected) return;
		let a = function e(t) {
			return typeof t == "function" ? e(t()) : Array.isArray(t) || t instanceof Set ? t : [t];
		}(t);
		for (let t of a) if (t !== null && (t.contains(i) || e.composed && e.composedPath().includes(t))) return;
		return !Nv(i, Mv.Loose) && i.tabIndex !== -1 && e.preventDefault(), r.current(e, i);
	}, [r, t]), a = y(null);
	Uv(e, "pointerdown", (e) => {
		Hv() || (a.current = e.composedPath?.call(e)?.[0] || e.target);
	}, !0), Uv(e, "pointerup", (e) => {
		if (Hv() || !a.current) return;
		let t = a.current;
		return a.current = null, i(e, () => t);
	}, !0);
	let o = y({
		x: 0,
		y: 0
	});
	Uv(e, "touchstart", (e) => {
		o.current.x = e.touches[0].clientX, o.current.y = e.touches[0].clientY;
	}, !0), Uv(e, "touchend", (e) => {
		let t = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if (!(Math.abs(t.x - o.current.x) >= Gv || Math.abs(t.y - o.current.y) >= Gv)) return i(e, () => j_(e.target) ? e.target : null);
	}, !0), Wv(e, "blur", (e) => i(e, () => N_(window.document.activeElement) ? window.document.activeElement : null), !0);
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-owner.js
function qv(...e) {
	return _(() => Jg(...e), [...e]);
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-event-listener.js
function Jv(e, t, n, r) {
	let i = n_(n);
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
//#region node_modules/@headlessui/react/dist/hooks/use-store.js
function Yv(e) {
	return x(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/store.js
function Xv(e, t) {
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
//#region node_modules/@headlessui/react/dist/hooks/document-overflow/adjust-scrollbar-padding.js
function Zv() {
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
//#region node_modules/@headlessui/react/dist/hooks/document-overflow/handle-ios-locking.js
function Qv() {
	return Bv() ? { before({ doc: e, d: t, meta: n }) {
		function r(e) {
			for (let t of n().containers) for (let n of t()) if (n.contains(e)) return !0;
			return !1;
		}
		t.microTask(() => {
			if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
				let n = $g();
				n.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => n.dispose()));
			}
			let n = window.scrollY ?? window.pageYOffset, i = null;
			t.addEventListener(e, "click", (t) => {
				if (j_(t.target)) try {
					let n = t.target.closest("a");
					if (!n) return;
					let { hash: a } = new URL(n.href), o = e.querySelector(a);
					j_(o) && !r(o) && (i = o);
				} catch {}
			}, !0), t.group((n) => {
				t.addEventListener(e, "touchstart", (e) => {
					if (n.dispose(), j_(e.target) && M_(e.target)) if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && r(t.parentElement);) t = t.parentElement;
						n.style(t, "overscrollBehavior", "contain");
					} else n.style(e.target, "touchAction", "none");
				});
			}), t.addEventListener(e, "touchmove", (e) => {
				if (j_(e.target)) {
					if (P_(e.target)) return;
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
//#region node_modules/@headlessui/react/dist/hooks/document-overflow/prevent-scroll.js
function $v() {
	return { before({ doc: e, d: t }) {
		t.style(e.documentElement, "overflow", "hidden");
	} };
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
function ey(e) {
	let t = {};
	for (let n of e) Object.assign(t, n(t));
	return t;
}
var ty = Xv(() => /* @__PURE__ */ new Map(), {
	PUSH(e, t) {
		let n = this.get(e) ?? {
			doc: e,
			count: 0,
			d: $g(),
			meta: /* @__PURE__ */ new Set(),
			computedMeta: {}
		};
		return n.count++, n.meta.add(t), n.computedMeta = ey(n.meta), this.set(e, n), this;
	},
	POP(e, t) {
		let n = this.get(e);
		return n && (n.count--, n.meta.delete(t), n.computedMeta = ey(n.meta)), this;
	},
	SCROLL_PREVENT(e) {
		let t = {
			doc: e.doc,
			d: e.d,
			meta() {
				return e.computedMeta;
			}
		}, n = [
			Qv(),
			Zv(),
			$v()
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
ty.subscribe(() => {
	let e = ty.getSnapshot(), t = /* @__PURE__ */ new Map();
	for (let [n] of e) t.set(n, n.documentElement.style.overflow);
	for (let n of e.values()) {
		let e = t.get(n.doc) === "hidden", r = n.count !== 0;
		(r && !e || !r && e) && ty.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && ty.dispatch("TEARDOWN", n);
	}
});
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
function ny(e, t, n = () => ({ containers: [] })) {
	let r = Yv(ty), i = t ? r.get(t) : void 0, a = i ? i.count > 0 : !1;
	return t_(() => {
		if (!(!t || !e)) return ty.dispatch("PUSH", t, n), () => ty.dispatch("POP", t, n);
	}, [e, t]), a;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
function ry(e, t, n = () => [document.body]) {
	ny(vv(e, "scroll-lock"), t, (e) => ({ containers: [...e.containers ?? [], n] }));
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-flags.js
function iy(e = 0) {
	let [t, n] = b(e);
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
var ay = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(ay || {});
function oy(e) {
	let t = {};
	for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
	return t;
}
function sy(e, t, n, r) {
	let [i, a] = b(n), { hasFlag: o, addFlag: s, removeFlag: c } = iy(e && i ? 3 : 0), l = y(!1), u = y(!1);
	return t_(() => {
		var i;
		if (e) {
			if (n && a(!0), !t) {
				n && s(3);
				return;
			}
			return (i = r?.start) == null || i.call(r, n), cy(t, {
				inFlight: l,
				prepare() {
					u.current ? u.current = !1 : u.current = l.current, l.current = !0, !u.current && (n ? (s(3), c(4)) : (s(4), c(2)));
				},
				run() {
					u.current ? n ? (c(3), s(4)) : (c(4), s(3)) : n ? c(1) : s(1);
				},
				done() {
					var e;
					u.current && dy(t) || (l.current = !1, c(7), n || a(!1), (e = r?.end) == null || e.call(r, n));
				}
			});
		}
	}, [
		e,
		n,
		t,
		e_()
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
function cy(e, { prepare: t, run: n, done: r, inFlight: i }) {
	let a = $g();
	return uy(e, {
		prepare: t,
		inFlight: i
	}), a.nextFrame(() => {
		n(), a.requestAnimationFrame(() => {
			a.add(ly(e, r));
		});
	}), a.dispose;
}
function ly(e, t) {
	let n = $g();
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
function uy(e, { inFlight: t, prepare: n }) {
	if (t != null && t.current) {
		n();
		return;
	}
	let r = e.style.transition;
	e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function dy(e) {
	return (e.getAnimations?.call(e) ?? []).some((e) => e instanceof CSSTransition && e.playState !== "finished");
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-watch.js
function fy(e, t) {
	let n = y([]), r = r_(e);
	f(() => {
		let e = [...n.current];
		for (let [i, a] of t.entries()) if (n.current[i] !== a) {
			let i = r(t, e);
			return n.current = t, i;
		}
	}, [r, ...t]);
}
//#endregion
//#region node_modules/@headlessui/react/dist/internal/open-closed.js
var py = i(null);
py.displayName = "OpenClosedContext";
var my = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(my || {});
function hy() {
	return u(py);
}
function gy({ value: e, children: n }) {
	return t.createElement(py.Provider, { value: e }, n);
}
function _y({ children: e }) {
	return t.createElement(py.Provider, { value: null }, e);
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/document-ready.js
function vy(e) {
	function t() {
		document.readyState !== "loading" && (e(), document.removeEventListener("DOMContentLoaded", t));
	}
	typeof window < "u" && typeof document < "u" && (document.addEventListener("DOMContentLoaded", t), t());
}
//#endregion
//#region node_modules/@headlessui/react/dist/utils/active-element-history.js
var yy = [];
vy(() => {
	function e(e) {
		if (!j_(e.target) || e.target === document.body || yy[0] === e.target) return;
		let t = e.target;
		t = t.closest(Tv), yy.unshift(t ?? e.target), yy = yy.filter((e) => e != null && e.isConnected), yy.splice(10);
	}
	window.addEventListener("click", e, { capture: !0 }), window.addEventListener("mousedown", e, { capture: !0 }), window.addEventListener("focus", e, { capture: !0 }), document.body.addEventListener("click", e, { capture: !0 }), document.body.addEventListener("mousedown", e, { capture: !0 }), document.body.addEventListener("focus", e, { capture: !0 });
});
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
function by(e) {
	let t = r_(e), n = y(!1);
	f(() => (n.current = !1, () => {
		n.current = !0, Qg(() => {
			n.current && t();
		});
	}), [t]);
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
function xy() {
	let t = typeof document > "u";
	return "useSyncExternalStore" in e && ((e) => e.useSyncExternalStore)(e)(() => () => {}, () => !1, () => !t);
}
function Sy() {
	let t = xy(), [n, r] = e.useState(qg.isHandoffComplete);
	return n && qg.isHandoffComplete === !1 && r(!1), e.useEffect(() => {
		n !== !0 && r(!0);
	}, [n]), e.useEffect(() => qg.handoff(), []), !t && n;
}
//#endregion
//#region node_modules/@headlessui/react/dist/internal/portal-force-root.js
var Cy = i(!1);
function wy() {
	return u(Cy);
}
function Ty(e) {
	return t.createElement(Cy.Provider, { value: e.force }, e.children);
}
//#endregion
//#region node_modules/@headlessui/react/dist/components/portal/portal.js
function Ey(e) {
	let t = wy(), n = u(jy), [r, i] = b(() => {
		if (!t && n !== null) return n.current ?? null;
		if (qg.isServer) return null;
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
var Dy = n, Oy = __(function(e, n) {
	let { ownerDocument: r = null, ...i } = e, a = y(null), o = L_(I_((e) => {
		a.current = e;
	}), n), s = qv(a.current), c = Ey(r ?? s), l = u(Ny), d = e_(), f = Sy(), p = d_();
	return by(() => {
		var e;
		c && c.childNodes.length <= 0 && ((e = c.parentElement) == null || e.removeChild(c));
	}), !c || !f ? null : E(t.createElement("div", {
		"data-headlessui-portal": "",
		ref: (e) => {
			d.dispose(), l && e && d.add(l.register(e));
		}
	}, p({
		ourProps: { ref: o },
		theirProps: i,
		slot: {},
		defaultTag: Dy,
		name: "Portal"
	})), c);
});
function ky(e, n) {
	let r = L_(n), { enabled: i = !0, ownerDocument: a, ...o } = e, s = d_();
	return i ? t.createElement(Oy, {
		...o,
		ownerDocument: a,
		ref: r
	}) : s({
		ourProps: { ref: r },
		theirProps: o,
		slot: {},
		defaultTag: Dy,
		name: "Portal"
	});
}
var Ay = n, jy = i(null);
function My(e, n) {
	let { target: r, ...i } = e, a = { ref: L_(n) }, o = d_();
	return t.createElement(jy.Provider, { value: r }, o({
		ourProps: a,
		theirProps: i,
		defaultTag: Ay,
		name: "Popover.Group"
	}));
}
var Ny = i(null);
function Py() {
	let e = u(Ny), n = y([]), r = r_((t) => (n.current.push(t), e && e.register(t), () => i(t))), i = r_((t) => {
		let r = n.current.indexOf(t);
		r !== -1 && n.current.splice(r, 1), e && e.unregister(t);
	}), a = _(() => ({
		register: r,
		unregister: i,
		portals: n
	}), [
		r,
		i,
		n
	]);
	return [n, _(() => function({ children: e }) {
		return t.createElement(Ny.Provider, { value: a }, e);
	}, [a])];
}
var Fy = __(ky), Iy = __(My), Ly = Object.assign(Fy, { Group: Iy });
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-escape.js
function Ry(e, t = typeof document < "u" ? document.defaultView : null, n) {
	let r = vv(e, "escape");
	Jv(t, "keydown", (e) => {
		r && (e.defaultPrevented || e.key === G_.Escape && n(e));
	});
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-is-touch-device.js
function zy() {
	let [e] = b(() => typeof window < "u" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [t, n] = b(e?.matches ?? !1);
	return t_(() => {
		if (!e) return;
		function t(e) {
			n(e.matches);
		}
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, [e]), t;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-root-containers.js
function By({ defaultContainers: e = [], portals: t, mainTreeNode: n } = {}) {
	let r = r_(() => {
		let r = Jg(n), i = [];
		for (let t of e) t !== null && (k_(t) ? i.push(t) : "current" in t && k_(t.current) && i.push(t.current));
		if (t != null && t.current) for (let e of t.current) i.push(e);
		for (let e of r?.querySelectorAll("html > *, body > *") ?? []) e !== document.body && e !== document.head && k_(e) && e.id !== "headlessui-portal-root" && (n && (e.contains(n) || e.contains(n?.getRootNode()?.host)) || i.some((t) => e.contains(t)) || i.push(e));
		return i;
	});
	return {
		resolveContainers: r,
		contains: r_((e) => r().some((t) => t.contains(e)))
	};
}
var Vy = i(null);
function Hy({ children: e, node: n }) {
	let [r, i] = b(null), a = Uy(n ?? r);
	return t.createElement(Vy.Provider, { value: a }, e, a === null && t.createElement(D_, {
		features: T_.Hidden,
		ref: (e) => {
			if (e) {
				for (let t of Jg(e)?.querySelectorAll("html > *, body > *") ?? []) if (t !== document.body && t !== document.head && k_(t) && t != null && t.contains(e)) {
					i(t);
					break;
				}
			}
		}
	}));
}
function Uy(e = null) {
	return u(Vy) ?? e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-is-mounted.js
function Wy() {
	let e = y(!1);
	return t_(() => (e.current = !0, () => {
		e.current = !1;
	}), []), e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/hooks/use-tab-direction.js
var Gy = ((e) => (e[e.Forwards = 0] = "Forwards", e[e.Backwards = 1] = "Backwards", e))(Gy || {});
function Ky() {
	let e = y(0);
	return Wv(!0, "keydown", (t) => {
		t.key === "Tab" && (e.current = +!!t.shiftKey);
	}, !0), e;
}
//#endregion
//#region node_modules/@headlessui/react/dist/components/focus-trap/focus-trap.js
function qy(e) {
	if (!e) return /* @__PURE__ */ new Set();
	if (typeof e == "function") return new Set(e());
	let t = /* @__PURE__ */ new Set();
	for (let n of e.current) k_(n.current) && t.add(n.current);
	return t;
}
var Jy = "div", Yy = ((e) => (e[e.None = 0] = "None", e[e.InitialFocus = 1] = "InitialFocus", e[e.TabLock = 2] = "TabLock", e[e.FocusLock = 4] = "FocusLock", e[e.RestoreFocus = 8] = "RestoreFocus", e[e.AutoFocus = 16] = "AutoFocus", e))(Yy || {});
function Xy(e, n) {
	let r = y(null), i = L_(r, n), { initialFocus: a, initialFocusFallback: o, containers: s, features: c = 15, ...l } = e;
	Sy() || (c = 0);
	let u = qv(r.current);
	eb(c, { ownerDocument: u });
	let d = tb(c, {
		ownerDocument: u,
		container: r,
		initialFocus: a,
		initialFocusFallback: o
	});
	nb(c, {
		ownerDocument: u,
		container: r,
		containers: s,
		previousActiveElement: d
	});
	let f = Ky(), p = r_((e) => {
		if (!A_(r.current)) return;
		let t = r.current;
		((e) => e())(() => {
			c_(f.current, {
				[Gy.Forwards]: () => {
					zv(t, Dv.First, { skipElements: [e.relatedTarget, o] });
				},
				[Gy.Backwards]: () => {
					zv(t, Dv.Last, { skipElements: [e.relatedTarget, o] });
				}
			});
		});
	}), m = vv(!!(c & 2), "focus-trap#tab-lock"), h = e_(), g = y(!1), _ = {
		ref: i,
		onKeyDown(e) {
			e.key == "Tab" && (g.current = !0, h.requestAnimationFrame(() => {
				g.current = !1;
			}));
		},
		onBlur(e) {
			if (!(c & 4)) return;
			let t = qy(s);
			A_(r.current) && t.add(r.current);
			let n = e.relatedTarget;
			j_(n) && n.dataset.headlessuiFocusGuard !== "true" && (rb(t, n) || (g.current ? zv(r.current, c_(f.current, {
				[Gy.Forwards]: () => Dv.Next,
				[Gy.Backwards]: () => Dv.Previous
			}) | Dv.WrapAround, { relativeTo: e.target }) : j_(e.target) && Fv(e.target)));
		}
	}, v = d_();
	return t.createElement(t.Fragment, null, m && t.createElement(D_, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: T_.Focusable
	}), v({
		ourProps: _,
		theirProps: l,
		defaultTag: Jy,
		name: "FocusTrap"
	}), m && t.createElement(D_, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: T_.Focusable
	}));
}
var Zy = __(Xy), Qy = Object.assign(Zy, { features: Yy });
function $y(e = !0) {
	let t = y(yy.slice());
	return fy(([e], [n]) => {
		n === !0 && e === !1 && Qg(() => {
			t.current.splice(0);
		}), n === !1 && e === !0 && (t.current = yy.slice());
	}, [
		e,
		yy,
		t
	]), r_(() => t.current.find((e) => e != null && e.isConnected) ?? null);
}
function eb(e, { ownerDocument: t }) {
	let n = !!(e & 8), r = $y(n);
	fy(() => {
		n || Zg(t?.body) && Fv(r());
	}, [n]), by(() => {
		n && Fv(r());
	});
}
function tb(e, { ownerDocument: t, container: n, initialFocus: r, initialFocusFallback: i }) {
	let a = y(null), o = vv(!!(e & 1), "focus-trap#initial-focus"), s = Wy();
	return fy(() => {
		if (e === 0) return;
		if (!o) {
			i != null && i.current && Fv(i.current);
			return;
		}
		let c = n.current;
		c && Qg(() => {
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
			if (r != null && r.current) Fv(r.current);
			else {
				if (e & 16) {
					if (zv(c, Dv.First | Dv.AutoFocus) !== Ov.Error) return;
				} else if (zv(c, Dv.First) !== Ov.Error) return;
				if (i != null && i.current && (Fv(i.current), t?.activeElement === i.current)) return;
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
function nb(e, { ownerDocument: t, container: n, containers: r, previousActiveElement: i }) {
	let a = Wy(), o = !!(e & 4);
	Jv(t?.defaultView, "focus", (e) => {
		if (!o || !a.current) return;
		let t = qy(r);
		A_(n.current) && t.add(n.current);
		let s = i.current;
		if (!s) return;
		let c = e.target;
		A_(c) ? rb(t, c) ? (i.current = c, Fv(c)) : (e.preventDefault(), e.stopPropagation(), Fv(s)) : Fv(i.current);
	}, !0);
}
function rb(e, t) {
	for (let n of e) if (n.contains(t)) return !0;
	return !1;
}
//#endregion
//#region node_modules/@headlessui/react/dist/components/transition/transition.js
function ib(e) {
	return !!(e.enter || e.enterFrom || e.enterTo || e.leave || e.leaveFrom || e.leaveTo) || !S_(e.as ?? fb) || t.Children.count(e.children) === 1;
}
var ab = i(null);
ab.displayName = "TransitionContext";
var ob = ((e) => (e.Visible = "visible", e.Hidden = "hidden", e))(ob || {});
function sb() {
	let e = u(ab);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
function cb() {
	let e = u(lb);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
var lb = i(null);
lb.displayName = "NestingContext";
function ub(e) {
	return "children" in e ? ub(e.children) : e.current.filter(({ el: e }) => e.current !== null).filter(({ state: e }) => e === "visible").length > 0;
}
function db(e, t) {
	let n = n_(e), r = y([]), i = Wy(), a = e_(), o = r_((e, t = u_.Hidden) => {
		let o = r.current.findIndex(({ el: t }) => t === e);
		o !== -1 && (c_(t, {
			[u_.Unmount]() {
				r.current.splice(o, 1);
			},
			[u_.Hidden]() {
				r.current[o].state = "hidden";
			}
		}), a.microTask(() => {
			var e;
			!ub(r) && i.current && ((e = n.current) == null || e.call(n));
		}));
	}), s = r_((e) => {
		let t = r.current.find(({ el: t }) => t === e);
		return t ? t.state !== "visible" && (t.state = "visible") : r.current.push({
			el: e,
			state: "visible"
		}), () => o(e, u_.Unmount);
	}), c = y([]), l = y(Promise.resolve()), u = y({
		enter: [],
		leave: []
	}), d = r_((e, n, r) => {
		c.current.splice(0), t && (t.chains.current[n] = t.chains.current[n].filter(([t]) => t !== e)), t?.chains.current[n].push([e, new Promise((e) => {
			c.current.push(e);
		})]), t?.chains.current[n].push([e, new Promise((e) => {
			Promise.all(u.current[n].map(([e, t]) => t)).then(() => e());
		})]), n === "enter" ? l.current = l.current.then(() => t?.wait.current).then(() => r(n)) : r(n);
	}), f = r_((e, t, n) => {
		Promise.all(u.current[t].splice(0).map(([e, t]) => t)).then(() => {
			var e;
			(e = c.current.shift()) == null || e();
		}).then(() => n(t));
	});
	return _(() => ({
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
var fb = n, pb = l_.RenderStrategy;
function mb(e, n) {
	var r;
	let { transition: i = !0, beforeEnter: a, afterEnter: o, beforeLeave: s, afterLeave: c, enter: l, enterFrom: u, enterTo: d, entered: p, leave: m, leaveFrom: h, leaveTo: g, ..._ } = e, [v, x] = b(null), S = y(null), C = ib(e), w = L_(...C ? [
		S,
		n,
		x
	] : n === null ? [] : [n]), T = (r = _.unmount) == null || r ? u_.Unmount : u_.Hidden, { show: E, appear: D, initial: O } = sb(), [k, A] = b(E ? "visible" : "hidden"), j = cb(), { register: M, unregister: N } = j;
	t_(() => M(S), [M, S]), t_(() => {
		if (T === u_.Hidden && S.current) {
			if (E && k !== "visible") {
				A("visible");
				return;
			}
			return c_(k, {
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
	let P = Sy();
	t_(() => {
		if (C && P && k === "visible" && S.current === null) throw Error("Did you forget to passthrough the `ref` to the actual DOM node?");
	}, [
		S,
		k,
		P,
		C
	]);
	let F = O && !D, I = D && E && O, L = y(!1), R = db(() => {
		L.current || (A("hidden"), N(S));
	}, j), ee = r_((e) => {
		L.current = !0;
		let t = e ? "enter" : "leave";
		R.onStart(S, t, (e) => {
			e === "enter" ? a?.() : e === "leave" && s?.();
		});
	}), z = r_((e) => {
		let t = e ? "enter" : "leave";
		L.current = !1, R.onStop(S, t, (e) => {
			e === "enter" ? o?.() : e === "leave" && c?.();
		}), t === "leave" && !ub(R) && (A("hidden"), N(S));
	});
	f(() => {
		C && i || (ee(E), z(E));
	}, [
		E,
		C,
		i
	]);
	let [, B] = sy(!(!i || !C || !P || F), v, E, {
		start: ee,
		end: z
	}), te = v_({
		ref: w,
		className: s_(_.className, I && l, I && u, B.enter && l, B.enter && B.closed && u, B.enter && !B.closed && d, B.leave && m, B.leave && !B.closed && h, B.leave && B.closed && g, !B.transition && E && p)?.trim() || void 0,
		...oy(B)
	}), V = 0;
	k === "visible" && (V |= my.Open), k === "hidden" && (V |= my.Closed), E && k === "hidden" && (V |= my.Opening), !E && k === "visible" && (V |= my.Closing);
	let H = d_();
	return t.createElement(lb.Provider, { value: R }, t.createElement(gy, { value: V }, H({
		ourProps: te,
		theirProps: _,
		defaultTag: fb,
		features: pb,
		visible: k === "visible",
		name: "Transition.Child"
	})));
}
function hb(e, r) {
	let { show: i, appear: a = !1, unmount: o = !0, ...s } = e, c = y(null), l = L_(...ib(e) ? [c, r] : r === null ? [] : [r]);
	Sy();
	let u = hy();
	if (i === void 0 && u !== null && (i = (u & my.Open) === my.Open), i === void 0) throw Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
	let [d, f] = b(i ? "visible" : "hidden"), p = db(() => {
		i || f("hidden");
	}), [m, h] = b(!0), g = y([i]);
	t_(() => {
		m !== !1 && g.current[g.current.length - 1] !== i && (g.current.push(i), h(!1));
	}, [g, i]);
	let v = _(() => ({
		show: i,
		appear: a,
		initial: m
	}), [
		i,
		a,
		m
	]);
	t_(() => {
		i ? f("visible") : !ub(p) && c.current !== null && f("hidden");
	}, [i, p]);
	let x = { unmount: o }, S = r_(() => {
		var t;
		m && h(!1), (t = e.beforeEnter) == null || t.call(e);
	}), C = r_(() => {
		var t;
		m && h(!1), (t = e.beforeLeave) == null || t.call(e);
	}), w = d_();
	return t.createElement(lb.Provider, { value: p }, t.createElement(ab.Provider, { value: v }, w({
		ourProps: {
			...x,
			as: n,
			children: t.createElement(vb, {
				ref: l,
				...x,
				...s,
				beforeEnter: S,
				beforeLeave: C
			})
		},
		theirProps: {},
		defaultTag: n,
		features: pb,
		visible: d === "visible",
		name: "Transition"
	})));
}
function gb(e, n) {
	let r = u(ab) !== null, i = hy() !== null;
	return t.createElement(t.Fragment, null, !r && i ? t.createElement(_b, {
		ref: n,
		...e
	}) : t.createElement(vb, {
		ref: n,
		...e
	}));
}
var _b = __(hb), vb = __(mb), yb = __(gb), bb = Object.assign(_b, {
	Child: yb,
	Root: _b
}), xb = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(xb || {}), Sb = ((e) => (e[e.SetTitleId = 0] = "SetTitleId", e))(Sb || {}), Cb = { 0(e, t) {
	return e.titleId === t.id ? e : {
		...e,
		titleId: t.id
	};
} }, wb = i(null);
wb.displayName = "DialogContext";
function Tb(e) {
	let t = u(wb);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Dialog /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Tb), t;
	}
	return t;
}
function Eb(e, t) {
	return c_(t.type, Cb, e, t);
}
var Db = __(function(e, n) {
	let r = h(), { id: i = `headlessui-dialog-${r}`, open: a, onClose: s, initialFocus: c, role: u = "dialog", autoFocus: d = !0, __demoMode: f = !1, unmount: p = !1, ...m } = e, g = y(!1);
	u = function() {
		return u === "dialog" || u === "alertdialog" ? u : (g.current || (g.current = !0, console.warn(`Invalid role [${u}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
	}();
	let b = hy();
	a === void 0 && b !== null && (a = (b & my.Open) === my.Open);
	let x = y(null), S = L_(x, n), C = qv(x.current), w = +!a, [T, E] = v(Eb, {
		titleId: null,
		descriptionId: null,
		panelRef: o()
	}), D = r_(() => s(!1)), O = r_((e) => E({
		type: 0,
		id: e
	})), k = Sy() ? w === 0 : !1, [A, j] = Py(), M = { get current() {
		return T.panelRef.current ?? x.current;
	} }, N = Uy(), { resolveContainers: P } = By({
		mainTreeNode: N,
		portals: A,
		defaultContainers: [M]
	}), F = b !== null && (b & my.Closing) === my.Closing;
	Cv(f || F ? !1 : k, {
		allowed: r_(() => [x.current?.closest("[data-headlessui-portal]") ?? null]),
		disallowed: r_(() => [N?.closest("body > *:not(#headlessui-portal-root)") ?? null])
	});
	let I = hv.get(null);
	t_(() => {
		if (k) return I.actions.push(i), () => I.actions.pop(i);
	}, [
		I,
		i,
		k
	]);
	let L = gv(I, l((e) => I.selectors.isTop(e, i), [I, i]));
	Kv(L, P, (e) => {
		e.preventDefault(), D();
	}), Ry(L, C?.defaultView, (e) => {
		e.preventDefault(), e.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), D();
	}), ry(f || F ? !1 : k, C, P), wv(k, x, D);
	let [R, ee] = B_(), z = _(() => [{
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
	]), B = i_({ open: w === 0 }), te = {
		ref: S,
		id: i,
		role: u,
		tabIndex: -1,
		"aria-modal": f ? void 0 : w === 0 || void 0,
		"aria-labelledby": T.titleId,
		"aria-describedby": R,
		unmount: p
	}, V = !zy(), H = Yy.None;
	k && !f && (H |= Yy.RestoreFocus, H |= Yy.TabLock, d && (H |= Yy.AutoFocus), V && (H |= Yy.InitialFocus));
	let ne = d_();
	return t.createElement(_y, null, t.createElement(Ty, { force: !0 }, t.createElement(Ly, null, t.createElement(wb.Provider, { value: z }, t.createElement(Iy, { target: x }, t.createElement(Ty, { force: !1 }, t.createElement(ee, { slot: B }, t.createElement(j, null, t.createElement(Qy, {
		initialFocus: c,
		initialFocusFallback: x,
		containers: P,
		features: H
	}, t.createElement(q_, { value: D }, ne({
		ourProps: te,
		theirProps: m,
		slot: B,
		defaultTag: Ob,
		features: kb,
		visible: w === 0,
		name: "Dialog"
	})))))))))));
}), Ob = "div", kb = l_.RenderStrategy | l_.Static;
function Ab(e, n) {
	let { transition: r = !1, open: i, ...a } = e, o = hy(), s = e.hasOwnProperty("open") || o !== null, c = e.hasOwnProperty("onClose");
	if (!s && !c) throw Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
	if (!s) throw Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
	if (!c) throw Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
	if (!o && typeof e.open != "boolean") throw Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e.open}`);
	if (typeof e.onClose != "function") throw Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e.onClose}`);
	return (i !== void 0 || r) && !a.static ? t.createElement(Hy, null, t.createElement(bb, {
		show: i,
		transition: r,
		unmount: a.unmount
	}, t.createElement(Db, {
		ref: n,
		...a
	}))) : t.createElement(Hy, null, t.createElement(Db, {
		ref: n,
		open: i,
		...a
	}));
}
var jb = "div";
function Mb(e, r) {
	let i = h(), { id: a = `headlessui-dialog-panel-${i}`, transition: o = !1, ...s } = e, [{ dialogState: c, unmount: l }, u] = Tb("Dialog.Panel"), d = L_(r, u.panelRef), f = i_({ open: c === 0 }), p = {
		ref: d,
		id: a,
		onClick: r_((e) => {
			e.stopPropagation();
		})
	}, m = o ? yb : n, g = o ? { unmount: l } : {}, _ = d_();
	return t.createElement(m, { ...g }, _({
		ourProps: p,
		theirProps: s,
		slot: f,
		defaultTag: jb,
		name: "Dialog.Panel"
	}));
}
var Nb = "div";
function Pb(e, r) {
	let { transition: i = !1, ...a } = e, [{ dialogState: o, unmount: s }] = Tb("Dialog.Backdrop"), c = i_({ open: o === 0 }), l = {
		ref: r,
		"aria-hidden": !0
	}, u = i ? yb : n, d = i ? { unmount: s } : {}, f = d_();
	return t.createElement(u, { ...d }, f({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: Nb,
		name: "Dialog.Backdrop"
	}));
}
var Fb = "h2";
function Ib(e, t) {
	let n = h(), { id: r = `headlessui-dialog-title-${n}`, ...i } = e, [{ dialogState: a, setTitleId: o }] = Tb("Dialog.Title"), s = L_(t);
	f(() => (o(r), () => o(null)), [r, o]);
	let c = i_({ open: a === 0 }), l = {
		ref: s,
		id: r
	};
	return d_()({
		ourProps: l,
		theirProps: i,
		slot: c,
		defaultTag: Fb,
		name: "Dialog.Title"
	});
}
var Lb = __(Ab), Rb = __(Mb), zb = __(Pb), Bb = __(Ib), Vb = Object.assign(Lb, {
	Panel: Rb,
	Title: Bb,
	Description: W_
});
//#endregion
//#region src/CardDetail.tsx
function Hb({ card: e, config: t, strings: n, supplement: r, onClose: i }) {
	let a = t.columns.find((t) => t.key === e.columnKey)?.name || e.columnKey, o = e.swimlaneKey ? t.swimlanes?.find((t) => t.key === e.swimlaneKey)?.name ?? n.unassigned : n.unassigned, s = [
		[n.status, a],
		...t.swimlaneBy === "custom" || (t.swimlanes?.length ?? 0) > 0 ? [[n.swimlane, o]] : [],
		...e.priority && e.priority !== "none" ? [[n.priority, e.priority]] : [],
		...e.assignee ? [[n.assignee, e.assignee]] : [],
		...e.start ? [[n.start, e.start]] : [],
		...e.due ? [[n.due, e.due]] : [],
		...e.reminder ? [[n.reminder, e.reminder]] : [],
		...e.archived ? [[n.archived, "✓"]] : [],
		...(t.fields ?? []).map((t) => [t.label, e.custom?.[t.key] ?? ""]).filter(([, e]) => e !== "")
	];
	return /* @__PURE__ */ w(Vb, {
		open: !0,
		onClose: i,
		className: "jtb-scope fixed inset-0 z-[70]",
		children: [/* @__PURE__ */ C(zb, { className: "fixed inset-0 bg-stone-950/12 transition-opacity" }), /* @__PURE__ */ C("div", {
			className: "fixed inset-0 flex justify-end overflow-hidden",
			children: /* @__PURE__ */ w(Rb, {
				"data-testid": "read-only-card-detail",
				className: "flex h-full w-full flex-col border-l border-black/[0.06] bg-white shadow-[-18px_0_56px_rgba(28,25,23,0.14)] sm:max-w-[26rem] sm:rounded-l-2xl",
				children: [/* @__PURE__ */ w("div", {
					className: "flex h-12 shrink-0 items-center justify-between border-b border-black/[0.05] px-4",
					children: [/* @__PURE__ */ C(Bb, {
						className: "text-xs font-semibold text-brand-gray",
						children: n.cardReadOnlyHint
					}), /* @__PURE__ */ C("button", {
						type: "button",
						autoFocus: !0,
						onClick: i,
						title: n.close,
						"aria-label": n.close,
						className: "rounded-lg p-1.5 text-stone-400 outline-none transition hover:bg-stone-100 hover:text-stone-700 focus-visible:ring-2 focus-visible:ring-brand",
						children: /* @__PURE__ */ C(H, {
							className: "h-4 w-4",
							"aria-hidden": !0
						})
					})]
				}), /* @__PURE__ */ w("div", {
					className: "min-h-0 flex-1 overflow-y-auto p-4",
					children: [
						e.ticket && /* @__PURE__ */ C("span", {
							className: "mb-1 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
							children: e.ticket
						}),
						/* @__PURE__ */ w("h2", {
							className: "text-base font-semibold text-stone-900",
							children: [e.icon && /* @__PURE__ */ C("span", {
								className: "mr-1",
								children: e.icon
							}), e.title]
						}),
						/* @__PURE__ */ w("dl", {
							className: "mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1.5",
							children: [s.map(([e, t]) => /* @__PURE__ */ w("div", {
								className: "contents",
								children: [/* @__PURE__ */ C("dt", {
									className: "truncate text-xs text-brand-gray",
									title: e,
									children: e
								}), /* @__PURE__ */ C("dd", {
									className: "text-sm text-stone-800",
									children: e === n.priority ? /* @__PURE__ */ C("span", {
										className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${Un[t] ?? "bg-stone-100 text-stone-500"}`,
										children: t
									}) : t
								})]
							}, e)), e.tags.length > 0 && /* @__PURE__ */ w("div", {
								className: "contents",
								children: [/* @__PURE__ */ C("dt", {
									className: "text-xs text-brand-gray",
									children: n.tags
								}), /* @__PURE__ */ C("dd", {
									className: "flex flex-wrap gap-1",
									children: e.tags.map((e) => /* @__PURE__ */ C("span", {
										className: "rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
										style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
										children: e.label
									}, e.label))
								})]
							})]
						}),
						(e.attachments?.length ?? 0) > 0 && /* @__PURE__ */ w("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ C("span", {
								className: "text-xs font-medium text-brand-gray",
								children: n.attachments
							}), /* @__PURE__ */ C("ul", {
								className: "mt-1 space-y-1",
								children: e.attachments.map((e) => /* @__PURE__ */ C("li", {
									className: "rounded border border-stone-200 px-2 py-1 text-xs",
									children: Rn(e) ? /* @__PURE__ */ C("a", {
										href: e,
										target: "_blank",
										rel: "noreferrer",
										className: "block truncate text-brand-dark hover:underline",
										title: e,
										children: Ln(e)
									}) : /* @__PURE__ */ w("span", {
										className: "block truncate text-stone-500",
										title: e,
										children: [
											Ln(e),
											" ",
											/* @__PURE__ */ w("span", {
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
						e.notes && e.notes.trim() !== "" && /* @__PURE__ */ w("div", {
							className: "mt-4",
							children: [/* @__PURE__ */ C("span", {
								className: "text-xs font-medium text-brand-gray",
								children: n.notes
							}), /* @__PURE__ */ C("pre", {
								className: "mt-1.5 whitespace-pre-wrap rounded-lg border border-stone-100 bg-stone-50/60 p-2 font-mono text-[12px] leading-5 text-stone-800",
								children: e.notes
							})]
						}),
						r != null && r !== !1 && r !== "" && /* @__PURE__ */ C("section", {
							"aria-label": n.additionalInformation,
							className: "mt-4 border-t border-stone-100 pt-4",
							children: r
						})
					]
				})]
			})
		})]
	});
}
//#endregion
//#region src/i18n.ts
var Ub = {
	en: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-0gKc0\":[\"Loading activity\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-AW71f\":[\"Resolved comment thread\"],\"-MNaMX\":[\"Mentioned someone\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"-yFTkm\":[\"milestone\"],\"-yOx8u\":[\"Saving changes…\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"Notes\"],\"1QfxQT\":[\"Dismiss\"],\"1YABGm\":[\"Link (Ctrl+K)\"],\"1hKEom\":[\"Priority\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"28IjHv\":[\"Archive state\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"Rename\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3ESfuy\":[\"Add a description…\"],\"3Ib6FN\":[\"Move down\"],\"3SETeK\":[\"You're caught up. New mentions, reminders, due work and blockers appear here.\"],\"3dmm5B\":[\"Press ⌘/Ctrl + Enter to create\"],\"3qkggm\":[\"Fullscreen\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4WPwlg\":[\"Archived card\"],\"4gdyen\":[\"Local (yours)\"],\"4hJhzz\":[\"Table\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[Start] --> B[End]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5OrUX9\":[\"Board view\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"Inline Code\"],\"5nNdrW\":[\"Could not save changes.\"],\"5ptOXn\":[\"Could not save project settings.\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6_Ns5U\":[\"Deleted card\"],\"6buwPb\":[\"Board settings\"],\"6gRgw8\":[\"Retry\"],\"79Yvzu\":[\"Swimlane name\"],\"7JA4uP\":[\"Project key can be at most 32 characters.\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"Confirm\"],\"7dA6V6\":[\"No assigned work\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"7z2Od5\":[\"Changed labels\"],\"8AbRER\":[\"Set due date\"],\"8PifYj\":[\"Mermaid diagram\"],\"8Tg_JR\":[\"Custom\"],\"8cwUrg\":[\"Restored card\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"Result (editable)\"],\"8lE269\":[\"Sort: Manual\"],\"8vwDbf\":[\"Project timeline\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"Could not render this Draw.io diagram.\"],\"AC9Gkf\":[\"Expand column\"],\"AL_kTn\":[\"e.g. JT\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"Could not render this PDF.\"],\"ASPlZ6\":[\"Target date\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"Drag to resize\"],\"A_X9M1\":[\"Changed status\"],\"AgvHni\":[\"Add column\"],\"AjVXBS\":[\"Calendar\"],\"AmiJYR\":[\"Add relation\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"Group: Assignee\"],\"B495Gs\":[\"Archive\"],\"B5TUF-\":[\"Priority…\"],\"BC3Pra\":[\"What outcome is this project driving?\"],\"BfMZ7w\":[\"Accept cloud\"],\"BiWlsk\":[\"Status…\"],\"Bkuvz9\":[\"Set assignee\"],\"BnmEvM\":[\"Save as template\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CdL7Vl\":[\"Changed dependencies\"],\"CdZ3-n\":[\"Parent card\"],\"Cx7myC\":[\"Clear due date\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DD5Nk7\":[\"Project summary can be at most 280 characters.\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"DXbQMt\":[\"Related cards\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"Code\"],\"EbMPZJ\":[\"Unassigned\"],\"Evdel1\":[\"Changed schedule\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"F6pfE9\":[\"Active\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"Unset done column\"],\"GKu3m4\":[\"No labels\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gp4Yi6\":[\"Inbox\"],\"Gpfctt\":[\"Due\"],\"Gpw0dJ\":[\"Inbox zero\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"HX7utX\":[\"Lightweight planning metadata shared by every board view.\"],\"H_SQFv\":[\"No color\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"Split\"],\"ICip_B\":[\"Cloud (remote)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"Open in editor\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"Set WIP limit\"],\"JKsLFA\":[\"Markdown is supported\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"Search cards\"],\"KAlhe_\":[\"Conversion stopped because card updates did not persist. Refresh and try again.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"KNKCTb\":[\"Backlog\"],\"KOXB6D\":[\"Card actions for \",[\"0\"]],\"K_F6pa\":[\"Saving…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"Kfl94N\":[\"Active and archived\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"Bold\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KqBY_x\":[\"No cards in this status\"],\"KvW1VO\":[\"Draw.io diagram\"],\"LHvIwl\":[\"Dismiss \",[\"0\"]],\"LQn6-8\":[\"Accept local\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"M0aIbs\":[\"Target date must be on or after the start date.\"],\"MHrjPM\":[\"Title\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"MeLVaU\":[\"Gantt\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"N2tLf0\":[\"Could not load activity.\"],\"N40H-G\":[\"All\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"Description\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"Tags\"],\"OepdfE\":[\"Group: Status\"],\"P5cvAA\":[\"Status name\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"PVNHB1\":[\"Unknown actor\"],\"PeXa8M\":[\"Mentioned @\",[\"0\"]],\"Pvpx7b\":[\"Paste a URL or path\"],\"Pwqkdw\":[\"Loading…\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"Clear filter\"],\"QD8opX\":[\"Board\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Write Mermaid syntax to see the diagram.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RS0o7b\":[\"State\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"comma, separated\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"TA4xJz\":[\"Assignee…\"],\"TXnokZ\":[\"Reminder due\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[\"Lane details for \",[\"0\"]],\"U0hizX\":[\"Swimlane color\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"Blank card\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"This file type can not be previewed yet.\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WAjFYI\":[\"Start date\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"Sort: Priority\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"Please enter a value.\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"Status actions\"],\"YNYued\":[\"Status ID\"],\"YOWshY\":[[\"0\"],\"/\",[\"1\"]],\"Ya7bZl\":[\"Diagram error\"],\"Z801fH\":[\"Created card\"],\"ZH7TVS\":[\"Card title\"],\"Zot9XS\":[\"No cards\"],\"_0G8xR\":[\"Reopened comment thread\"],\"_5CsXX\":[\"Done column\"],\"_BsotH\":[\"Save project\"],\"_DwR-n\":[\"Creating…\"],\"_EsjyQ\":[\"Use this\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_kpR4w\":[\"Reminder\"],\"_laW0t\":[\"Previous row missing\"],\"_zI8pq\":[\"Sign in to see personal work\"],\"a6uhHr\":[\"Bold (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"aXFOuf\":[\"No activity yet\"],\"abUZlY\":[\"Add details...\"],\"agOeRN\":[\"Could not render this API specification.\"],\"arhExE\":[\"Swimlane ID\"],\"b1MkzY\":[\"Updated card\"],\"b4hVKD\":[\"Color columns\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"Changes save automatically.\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"Add labels\"],\"cnGeoo\":[\"Delete\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP limit \",[\"0\"]],\"dEgA5A\":[\"Cancel\"],\"dMtLDE\":[\"to\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"dXoieq\":[\"Summary\"],\"ddrz1m\":[\"Overdue\"],\"dgAb2R\":[\"Add to selection\"],\"dsLT3m\":[\"Create card\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"Duplicate\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"fOP7Wy\":[\"Additional information\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"Sort: Due\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"Relations\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"Untitled card\"],\"gMAF3u\":[\"Work scope\"],\"gWlA7i\":[\"Archived cards\"],\"gpGcIe\":[\"This board is read-only.\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF document\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"Write\"],\"iROlQr\":[\"Card details\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"Templates\"],\"iYVqZq\":[\"Column name\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jXsah0\":[\"Project settings\"],\"jZlrte\":[\"Color\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid source\"],\"klk7Go\":[\"Could not create card. Try again.\"],\"kryGs-\":[\"Card\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"Refresh\"],\"lCu9N3\":[\"My Work and Inbox use your identity to find assigned cards, mentions and reminders.\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_UFPv\":[\"Properties\"],\"l_g7se\":[\"Resume conversion\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"Save merged result\"],\"lujQxb\":[\"Changed assignee\"],\"m16xKo\":[\"Add\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"Delete card\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"ntiMEf\":[\"Could not load comments.\"],\"o7J4JM\":[\"Filter\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"Custom fields\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"oesHMm\":[\"Work is blocked\"],\"ojKCLU\":[\"Assignee\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"Sort: Title\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKxJpM\":[\"Outside timeline\"],\"pKztsX\":[\"Open in full editor\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"New card\"],\"pwN6Ae\":[\"Collapse column\"],\"pzutoc\":[\"Italic\"],\"qZd_ph\":[\"Add row\"],\"qjtdW-\":[\"No scheduled cards yet\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"Lane details\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"Preview\"],\"rfI3Fa\":[\"Could not create sub-card. Try again.\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"Manage statuses\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sBe1e-\":[\"My work\"],\"sCzmvQ\":[\"cards\"],\"sPHzr3\":[\"Deleted comment\"],\"sQpDn6\":[\"Exit fullscreen\"],\"sujToP\":[\"Parent\"],\"t5Pdeu\":[\"Cards assigned to you across this project appear here.\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" Conflict\",[\"1\"],\" to Resolve\"],\"tR1uEq\":[\"Loading comments\"],\"tXkhj_\":[\"Start\"],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"Card title (Enter to add, Esc to cancel)\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"Status\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vDFCs9\":[\"Remove from selection\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"Copy failed.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"Italic (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"Set as done column\"],\"wwu18a\":[\"Icon\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xHe_7h\":[\"Dependencies\"],\"xUOPoQ\":[\"Used by\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"xt1ty_\":[\"Project key\"],\"y1eoq1\":[\"Copy link\"],\"y9cj46\":[\"Group: Priority\"],\"yEbJGs\":[\"+ Add field\"],\"yKu_3Y\":[\"Restore\"],\"yXjcFl\":[\"Edited comment\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← Back to list\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yp6eeC\":[\"Added comment\"],\"yz7wBu\":[\"Close\"],\"yzF66j\":[\"Link\"],\"z68Wjp\":[\"Back to previous card\"],\"zOc0vf\":[\"No icon\"],\"zga9sT\":[\"OK\"]}"),
	zh: JSON.parse("{\"--lIxB\":[\"被阻塞于\"],\"-0gKc0\":[\"正在加载动态\"],\"-3Qbcm\":[\"优先级：\",[\"0\"]],\"-9kYEs\":[\"横向分组缺失的卡片\"],\"-AW71f\":[\"解决了评论讨论\"],\"-MNaMX\":[\"提及了成员\"],\"-X4ual\":[\"无优先级\"],\"-b7T3G\":[\"更新\"],\"-eTfgY\":[\"泳道详情\"],\"-hwvgo\":[\"横向分组操作\"],\"-yFTkm\":[\"里程碑\"],\"-yOx8u\":[\"正在保存更改…\"],\"02N8r0\":[\"筛选卡片\"],\"0cspe_\":[\"删除横向分组\"],\"0gvHNl\":[\"状态定义卡片工作流。可自由重命名或排序；卡片始终通过状态 ID 保持映射。\"],\"1718Q-\":[\"问题\"],\"1DBGsz\":[\"备注\"],\"1QfxQT\":[\"忽略\"],\"1YABGm\":[\"链接 (Ctrl+K)\"],\"1hKEom\":[\"优先级\"],\"1iShX0\":[\"今天到期\"],\"1lWHP7\":[\"不安全\"],\"1nUGn5\":[\"添加状态\"],\"1xwZj_\":[\"上个月\"],\"23yqV0\":[\"显示受影响的卡片\"],\"28IjHv\":[\"归档状态\"],\"2BPVq8\":[\"重新排序 \",[\"0\"]],\"2aEwT_\":[\"管理自定义横向分组\"],\"2wxgft\":[\"重命名\"],\"32TndD\":[\"被阻塞\"],\"3CIp19\":[\"未来 7 天\"],\"3CtQL6\":[\"选择另一个泳道，然后先更新卡片。\"],\"3ESfuy\":[\"添加描述…\"],\"3Ib6FN\":[\"下移\"],\"3SETeK\":[\"你已处理完毕。新的提及、提醒、到期工作和阻塞项会显示在这里。\"],\"3dmm5B\":[\"按 ⌘/Ctrl + Enter 创建\"],\"3qkggm\":[\"全屏\"],\"4NY8B5\":[\"将创建的泳道\"],\"4WPwlg\":[\"归档了卡片\"],\"4gdyen\":[\"本地（我的）\"],\"4hJhzz\":[\"表格\"],\"4t8aKB\":[\"将创建的横向分组\"],\"4vd-Kd\":[\"JType 将根据当前优先级列创建独立的自定义泳道。卡片的优先级值保持不变。\"],\"54sFiP\":[\"flowchart TD\\n  A[开始] --> B[结束]\"],\"5Cawxq\":[\"泳道：自定义\"],\"5OrUX9\":[\"看板视图\"],\"5Oy0YM\":[\"标签：\",[\"0\"]],\"5Q_DQ6\":[\"行内代码\"],\"5nNdrW\":[\"无法保存更改。\"],\"5ptOXn\":[\"无法保存项目设置。\"],\"66g_UW\":[\"折叠已解决话题\"],\"6G3KzD\":[\"横向分组详情\"],\"6V3Ea3\":[\"已复制\"],\"6YtxFj\":[\"名称\"],\"6_Ns5U\":[\"删除了卡片\"],\"6buwPb\":[\"看板设置\"],\"6gRgw8\":[\"重试\"],\"79Yvzu\":[\"泳道名称\"],\"7JA4uP\":[\"项目标识最多 32 个字符。\"],\"7MGAQC\":[\"JType 会复用现有横向分组 ID，并继续完成尚未结束的卡片更新。\"],\"7VpPHA\":[\"确认\"],\"7dA6V6\":[\"暂无分配给你的工作\"],\"7dZyQU\":[\"原泳道已不存在\"],\"7pBic4\":[\"显示 \",[\"visibleCount\"],\"/\",[\"totalCount\"],\" 张卡片\"],\"7s3WlU\":[\"阻塞\"],\"7z2Od5\":[\"更改了标签\"],\"8AbRER\":[\"设置截止日期\"],\"8PifYj\":[\"Mermaid 图表\"],\"8Tg_JR\":[\"自定义\"],\"8cwUrg\":[\"恢复了卡片\"],\"8enUYo\":[\"设置状态\"],\"8hSn0h\":[\"结果（可编辑）\"],\"8lE269\":[\"排序:手动\"],\"8vwDbf\":[\"项目时间线\"],\"9L7ptC\":[\"此空横向分组将从看板中移除。\"],\"9OEgyT\":[\"添加回应\"],\"9OH3W0\":[\"解决话题\"],\"9YTdO7\":[\"被阻塞的卡片\"],\"9gx7rl\":[\"有 \",[\"missingCount\"],\" 张卡片引用了已删除的横向分组。\"],\"9gxam6\":[\"无法渲染此 Draw.io 图表。\"],\"AC9Gkf\":[\"展开列\"],\"AL_kTn\":[\"例如 JT\"],\"ANe5kn\":[\"正在更新卡片…\"],\"AS5WO9\":[\"无法渲染此 PDF。\"],\"ASPlZ6\":[\"目标日期\"],\"ATIq3Z\":[\"泳道：自定义\"],\"AVreQ5\":[\"拖动调整宽度\"],\"A_X9M1\":[\"更改了状态\"],\"AgvHni\":[\"添加列\"],\"AjVXBS\":[\"日历\"],\"AmiJYR\":[\"添加关联\"],\"AoHpbt\":[\"显示泳道缺失的卡片\"],\"AxAubu\":[\"分组:负责人\"],\"B495Gs\":[\"归档\"],\"B5TUF-\":[\"优先级…\"],\"BC3Pra\":[\"这个项目希望推动什么结果？\"],\"BfMZ7w\":[\"接受云端\"],\"BiWlsk\":[\"状态…\"],\"Bkuvz9\":[\"设置负责人\"],\"BnmEvM\":[\"存为模板\"],\"C6-ZRl\":[\"某人\"],\"CQ_dDx\":[\"泳道：状态\"],\"CXTDT_\":[\"继续泳道转换？\"],\"CdL7Vl\":[\"更改了依赖关系\"],\"CdZ3-n\":[\"父卡片\"],\"Cx7myC\":[\"清除截止日期\"],\"CxcMyt\":[\"已将 \",[\"0\"],\" 移到第 \",[\"1\"],\" 位，共 \",[\"2\"],\" 项。\"],\"DD5Nk7\":[\"项目简介最多 280 个字符。\"],\"DGEEOQ\":[\"泳道操作\"],\"DPfwMq\":[\"完成\"],\"DXbQMt\":[\"相关卡片\"],\"Db4W3_\":[\"状态\"],\"EWPtMO\":[\"代码\"],\"EbMPZJ\":[\"未分配\"],\"Evdel1\":[\"更改了计划日期\"],\"F6osRA\":[\"有 \",[\"danglingCount\"],\" 张卡片引用了已删除的横向分组。\"],\"F6pfE9\":[\"活跃\"],\"FBIuPX\":[\"清除选择\"],\"FQylcT\":[\"泳道：缺失\"],\"G4qrLy\":[\"取消完成列\"],\"GKu3m4\":[\"暂无标签\"],\"GL6e_U\":[\"当前有 \",[\"cardCount\"],\" 张卡片使用此横向分组。\"],\"GNoXOd\":[\"复制泳道 ID\"],\"Gp4Yi6\":[\"收件箱\"],\"Gpfctt\":[\"截止日期\"],\"Gpw0dJ\":[\"收件箱已清空\"],\"HTKRVa\":[\"请勿关闭此对话框。\"],\"HX7utX\":[\"由所有看板视图共享的轻量项目计划信息。\"],\"H_SQFv\":[\"无颜色\"],\"HajiZl\":[\"月\"],\"HrmW6B\":[\"添加评论…（支持 Markdown）\"],\"I6SWEy\":[\"分栏\"],\"ICip_B\":[\"云端（远程）\"],\"IdMoS6\":[\"创建第一条泳道\"],\"Ik60OC\":[\"在编辑器中打开\"],\"ImOQa9\":[\"回复\"],\"IqKCNQ\":[\"横向分组\"],\"Iw6WJa\":[\"设置 WIP 限制\"],\"JKsLFA\":[\"支持 Markdown\"],\"JPB7_s\":[\"泳道映射缺失的卡片\"],\"JTYvAw\":[\"搜索卡片\"],\"KAlhe_\":[\"卡片更新未能持久化，转换已停止。请刷新后重试。\"],\"KCszT6\":[\"添加泳道\"],\"KFiYGY\":[\"更改颜色\"],\"KGi3u9\":[\"拖动以重新排序\"],\"KNKCTb\":[\"待办列表\"],\"KOXB6D\":[[\"0\"],\" 的卡片操作\"],\"K_F6pa\":[\"保存中…\"],\"K_cST0\":[\"继续转换横向分组？\"],\"Kd6eg7\":[\"正在移动卡片…\"],\"KeYrQ5\":[\"撤回你的回应\"],\"Kfl94N\":[\"活跃与已归档\"],\"KjXDqG\":[\"泳道：无\"],\"KmydK6\":[\"粗体\"],\"KpnwJK\":[\"删除“\",[\"0\"],\"”？\"],\"KqBY_x\":[\"此状态下没有卡片\"],\"KvW1VO\":[\"Draw.io 图表\"],\"LHvIwl\":[\"忽略“\",[\"0\"],\"”\"],\"LQn6-8\":[\"接受本地\"],\"Ld9MtR\":[\"横向分组：负责人\"],\"M0aIbs\":[\"目标日期必须不早于开始日期。\"],\"MHrjPM\":[\"标题\"],\"MRsDXp\":[\"JType 将复用现有泳道 ID，并继续尚未完成的卡片更新。\"],\"MYx830\":[\"此空泳道将从看板中移除。\"],\"MeLVaU\":[\"甘特图\"],\"Mm72la\":[\"暂无评论\"],\"MmYpxT\":[\"回复…\"],\"N2tLf0\":[\"无法加载动态。\"],\"N40H-G\":[\"全部\"],\"NBdIgR\":[\"评论\"],\"NYTPDY\":[\"移动卡片并删除\"],\"NnxWLJ\":[\"创建第一个自定义横向分组\"],\"Nu4oKW\":[\"描述\"],\"O6H89R\":[\"已解决\"],\"ONWvwQ\":[\"上传\"],\"OR4WQZ\":[\"+ 添加子卡片\"],\"OYHzN1\":[\"标签\"],\"OepdfE\":[\"分组:状态\"],\"P5cvAA\":[\"状态名称\"],\"PM7yYy\":[\"横向分组 ID\"],\"PUeYA1\":[\"创建可编辑泳道\"],\"PVNHB1\":[\"未知操作者\"],\"PeXa8M\":[\"提及了 @\",[\"0\"]],\"Pvpx7b\":[\"粘贴 URL 或路径\"],\"Pwqkdw\":[\"正在加载…\"],\"Q-Pe7U\":[[\"0\"],\" 的泳道详情\"],\"Q2mGA7\":[\"清除筛选\"],\"QD8opX\":[\"看板\"],\"QRhoJb\":[\"JType 将根据当前负责人列创建独立的自定义泳道。卡片的负责人值保持不变。\"],\"QlsPZy\":[\"输入 Mermaid 语法以查看图表。\"],\"QmZYQP\":[\"取消解决\"],\"QyioBP\":[\"上移\"],\"RS0o7b\":[\"状态\"],\"RbsNko\":[\"当前有 \",[\"cardCount\"],\" 张卡片使用此泳道。\"],\"RfEZH1\":[\"JType 将根据当前负责人行创建独立泳道。卡片的负责人值不会改变。\"],\"RgO4DX\":[\"泳道 ID“\",[\"0\"],\"”重复。将使用第一条定义。\"],\"RlLl3G\":[[\"0\"],\" 的操作\"],\"RnplaY\":[[\"0\"],\" 的横向分组详情\"],\"S5Qbb1\":[\"用逗号分隔\"],\"SavliD\":[\"有 \",[\"danglingCount\"],\" 张卡片引用了已删除的泳道。\"],\"TA4xJz\":[\"负责人…\"],\"TXnokZ\":[\"提醒到期\"],\"T_nAzC\":[\"JType 将复用现有泳道 ID，并继续未完成的卡片更新。\"],\"TdfEV7\":[\"归档\"],\"Th4mIx\":[[\"0\"],\" 的泳道详情\"],\"U0hizX\":[\"泳道颜色\"],\"U95P80\":[\"将优先级横向分组转为可编辑？\"],\"UDb2YD\":[\"回应\"],\"UQOvxZ\":[\"空白卡片\"],\"URmyfc\":[\"详情\"],\"Ubl2by\":[\"右移\"],\"UouxNQ\":[\"泳道：负责人\"],\"VNa_N2\":[\"暂不支持预览此文件类型。\"],\"VXh9CK\":[\"无截止日期\"],\"VbyRUy\":[\"评论\"],\"Ve-C10\":[\"泳道：优先级\"],\"WAjFYI\":[\"开始日期\"],\"WEYdDv\":[\"推荐\"],\"WSP6v1\":[\"排序:优先级\"],\"WSbuWy\":[\"泳道缺失\"],\"WWUwTb\":[\"将负责人横向分组转为可编辑？\"],\"X03-eC\":[\"请输入内容。\"],\"XJOV1Y\":[\"活动\"],\"XicmhT\":[\"截止日期\"],\"XklovM\":[\"正在处理…\"],\"Y8bR2a\":[\"仅删除泳道。卡片引用仍可恢复。\"],\"YDa2KG\":[\"我的卡片\"],\"YFdnVT\":[\"卡片状态\"],\"YHjvGb\":[\"状态操作\"],\"YNYued\":[\"状态 ID\"],\"YOWshY\":[[\"0\"],\"/\",[\"1\"]],\"Ya7bZl\":[\"图表错误\"],\"Z801fH\":[\"创建了卡片\"],\"ZH7TVS\":[\"卡片标题\"],\"Zot9XS\":[\"暂无卡片\"],\"_0G8xR\":[\"重新打开了评论讨论\"],\"_5CsXX\":[\"完成列\"],\"_BsotH\":[\"保存项目\"],\"_DwR-n\":[\"创建中…\"],\"_EsjyQ\":[\"使用此版本\"],\"_TJomP\":[\"删除前移动卡片\"],\"_YbTQZ\":[\"JType 将根据当前优先级行创建独立泳道。卡片的优先级值不会改变。\"],\"_kh61D\":[\"显示横向分组缺失的卡片\"],\"_kpR4w\":[\"提醒\"],\"_laW0t\":[\"原横向分组已缺失\"],\"_zI8pq\":[\"登录后查看个人工作\"],\"a6uhHr\":[\"粗体 (Ctrl+B)\"],\"aDvLhk\":[\"添加评论…\"],\"aXFOuf\":[\"暂无动态\"],\"abUZlY\":[\"添加详情...\"],\"agOeRN\":[\"无法渲染此 API 规范。\"],\"arhExE\":[\"泳道 ID\"],\"b1MkzY\":[\"更新了卡片\"],\"b4hVKD\":[\"彩色列\"],\"bUNpV2\":[\"泳道 ID“\",[\"0\"],\"”重复。将使用第一个定义。\"],\"bwOqWD\":[[\"1\"],\" 张子卡中已完成 \",[\"0\"],\" 张\"],\"by_svU\":[\"将卡片保留在未分配\"],\"bzjBcL\":[\"子卡片\"],\"c-EXz1\":[\"仅删除横向分组。卡片引用仍可恢复。\"],\"c61_Lv\":[\"泳道 ID\"],\"cJ44lA\":[\"未排期\"],\"cSev-j\":[\"筛选\"],\"cUt8yN\":[\"更改会自动保存。\"],\"ceQmqN\":[\"自定义横向分组\"],\"cfaWH-\":[\"添加标签\"],\"cnGeoo\":[\"删除\"],\"d-F6q9\":[\"创建\"],\"d5z6xQ\":[\"WIP 限制 \",[\"0\"]],\"dEgA5A\":[\"取消\"],\"dMtLDE\":[\"至\"],\"dQva-y\":[\"横向分组 ID“\",[\"0\"],\"”重复。将使用第一条定义。\"],\"dXoieq\":[\"简介\"],\"ddrz1m\":[\"已逾期\"],\"dgAb2R\":[\"加入选择\"],\"dsLT3m\":[\"创建卡片\"],\"eAi4RE\":[\"JType 会根据当前优先级分组创建独立的自定义横向分组。卡片的优先级不会改变。\"],\"ecUA8p\":[\"今天\"],\"euc6Ns\":[\"复制卡片\"],\"fEqHZq\":[\"打开子卡片\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"fOP7Wy\":[\"附加信息\"],\"fOluHh\":[\"JType 会根据当前负责人分组创建独立的自定义横向分组。卡片的负责人不会改变。\"],\"fVlS4-\":[\"泳道\"],\"fYcKtB\":[\"排序:截止\"],\"fdEjOR\":[\"复制横向分组 ID\"],\"fvImQM\":[\"已选择 \",[\"0\"],\" 项\"],\"fwTn8F\":[\"横向分组颜色\"],\"g87L9j\":[\"关联\"],\"g8JmSC\":[\"下个月\"],\"gANddk\":[\"上传中…\"],\"gLDJuJ\":[\"未命名卡片\"],\"gMAF3u\":[\"工作范围\"],\"gWlA7i\":[\"已归档卡片\"],\"gpGcIe\":[\"此看板为只读。\"],\"guQk4e\":[\"列：状态\"],\"gzZWjO\":[\"没有可转换的已分配值。\"],\"h8DugX\":[\"标签\"],\"hL5-_P\":[\"横向分组\"],\"hNQgyI\":[\"列：优先级\"],\"hNmOZ7\":[\"设置优先级\"],\"he3ygx\":[\"复制\"],\"hh4sEG\":[\"相关\"],\"hnK1gR\":[\"PDF 文档\"],\"hyVzII\":[\"泳道\"],\"i4_LY_\":[\"写作\"],\"iROlQr\":[\"卡片详情\"],\"iSLA_r\":[\"左移\"],\"iTylMl\":[\"模板\"],\"iYVqZq\":[\"列名称\"],\"jUbC3Z\":[\"泳道：优先级\"],\"jXsah0\":[\"项目设置\"],\"jZlrte\":[\"颜色\"],\"jzy1b8\":[\"将泳道转为可编辑\"],\"k4b5_X\":[\"已编辑\"],\"kBRFD0\":[\"创建可编辑横向分组\"],\"kMqzL_\":[\"横向分组名称\"],\"kZlRKE\":[\"Mermaid 源码\"],\"klk7Go\":[\"无法创建卡片，请重试。\"],\"kryGs-\":[\"卡片\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"刷新\"],\"lCu9N3\":[\"我的工作和收件箱会根据你的身份查找分配给你的卡片、提及和提醒。\"],\"lEQWoB\":[\"添加稳定的横向分组，即使没有卡片也会保持显示。\"],\"lHxVTh\":[\"泳道：负责人\"],\"lUeOk0\":[\"此看板的横向分组。名称可以更改，卡片映射会保持关联。\"],\"l_UFPv\":[\"属性\"],\"l_g7se\":[\"继续转换\"],\"lqoy3F\":[\"横向分组缺失\"],\"lt2UOc\":[\"横向分组：无\"],\"ltF1xa\":[\"保存合并结果\"],\"lujQxb\":[\"更改了负责人\"],\"m16xKo\":[\"添加\"],\"mPINe9\":[\"横向分组名称“\",[\"0\"],\"”重复。名称应保持唯一。\"],\"nNGN_D\":[\"自定义泳道\"],\"nabda1\":[\"删除卡片\"],\"nfhh60\":[\"将优先级泳道转为可编辑？\"],\"njJFtc\":[\"删除评论\"],\"ntiMEf\":[\"无法加载评论。\"],\"o7J4JM\":[\"筛选\"],\"o8va6N\":[\"恢复\"],\"oPwQt4\":[\"自定义字段\"],\"obId50\":[\"筛选，已启用 \",[\"activeCount\"],\" 项\"],\"oesHMm\":[\"工作受阻\"],\"ojKCLU\":[\"负责人\"],\"p4rTvq\":[\"横向分组：优先级\"],\"p9yTeb\":[\"排序:标题\"],\"pKKcSl\":[\"显示已解决话题\"],\"pKxJpM\":[\"时间范围外\"],\"pKztsX\":[\"在完整编辑器中打开\"],\"pdVZUg\":[\"在制品 \",[\"0\"]],\"pip_Rq\":[\"管理自定义泳道\"],\"pnrmSP\":[\"新建卡片\"],\"pwN6Ae\":[\"折叠列\"],\"pzutoc\":[\"斜体\"],\"qZd_ph\":[\"添加横向分组\"],\"qjtdW-\":[\"暂无已排期卡片\"],\"qpGDiV\":[\"复制泳道 ID\"],\"rF8SEQ\":[\"编辑评论\"],\"rK_KGj\":[\"看板的可选横向分组。名称可以修改，卡片仍通过横向分组 ID 保持映射。\"],\"rRubBJ\":[\"泳道详情\"],\"rT-mCe\":[\"移除筛选：\",[\"0\"]],\"rdUucN\":[\"预览\"],\"rfI3Fa\":[\"无法创建子卡片，请重试。\"],\"rn2_2V\":[\"移除筛选\"],\"rvpMpc\":[\"管理状态\"],\"s8QaQC\":[\"此看板的纵向列。名称可以修改；卡片始终通过泳道 ID 保持映射。\"],\"sBe1e-\":[\"我的工作\"],\"sCzmvQ\":[\"张卡片\"],\"sPHzr3\":[\"删除了评论\"],\"sQpDn6\":[\"退出全屏\"],\"sujToP\":[\"父卡片\"],\"t5Pdeu\":[\"这个项目中分配给你的卡片会显示在这里。\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 个冲突\",[\"1\"],\"待解决\"],\"tR1uEq\":[\"正在加载评论\"],\"tXkhj_\":[\"开始\"],\"tYS8HY\":[\"无论作为列还是泳道使用，状态列都可以继续管理。\"],\"t_YqKh\":[\"移除\"],\"tfDRzk\":[\"保存\"],\"u2IprG\":[\"卡片标题(回车添加,Esc 取消)\"],\"u36sC2\":[\"转为可编辑横向分组\"],\"uAP6ov\":[\"删除泳道\"],\"uAQUqI\":[\"状态\"],\"uH1U8v\":[\"管理泳道\"],\"uWPalN\":[\"泳道名称“\",[\"0\"],\"”重复。名称应保持唯一。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"ucJg3u\":[\"泳道：状态\"],\"vDFCs9\":[\"从选择中移除\"],\"vIKvqQ\":[\"有 \",[\"missingCount\"],\" 张卡片引用了已删除的泳道。\"],\"vJvZPY\":[\"负责人：\",[\"0\"]],\"vMTOsC\":[\"将负责人泳道转为可编辑？\"],\"vfYjJ_\":[\"复制失败。\"],\"w7E-FA\":[\"已拦截不安全链接：\",[\"url\"]],\"wGM_xy\":[\"横向分组：自定义\"],\"w_Sphq\":[\"附件\"],\"wf6Djn\":[\"斜体 (Ctrl+I)\"],\"wp-2ZK\":[\"横向分组：状态\"],\"wtw-au\":[\"设为完成列\"],\"wwu18a\":[\"图标\"],\"x52RAh\":[\"被 \",[\"blockedCount\"],\" 张未完成卡片阻塞\"],\"xDsmP9\":[\"日程\"],\"xHe_7h\":[\"依赖关系\"],\"xUOPoQ\":[\"使用情况\"],\"xX5QVp\":[\"选择另一个横向分组，然后先更新卡片。\"],\"xt1ty_\":[\"项目标识\"],\"y1eoq1\":[\"复制链接\"],\"y9cj46\":[\"分组:优先级\"],\"yEbJGs\":[\"+ 添加字段\"],\"yKu_3Y\":[\"恢复\"],\"yXjcFl\":[\"编辑了评论\"],\"yYxB17\":[\"清除全部\"],\"ybGQtY\":[\"← 返回列表\"],\"yjeGpt\":[\"列：负责人\"],\"yp6eeC\":[\"添加了评论\"],\"yz7wBu\":[\"关闭\"],\"yzF66j\":[\"链接\"],\"z68Wjp\":[\"返回上一张卡片\"],\"zOc0vf\":[\"无图标\"],\"zga9sT\":[\"确定\"]}"),
	ja: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-0gKc0\":[\"Loading activity\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-AW71f\":[\"Resolved comment thread\"],\"-MNaMX\":[\"Mentioned someone\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"-yFTkm\":[\"milestone\"],\"-yOx8u\":[\"Saving changes…\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"問題\"],\"1DBGsz\":[\"ノート\"],\"1QfxQT\":[\"Dismiss\"],\"1YABGm\":[\"リンク (Ctrl+K)\"],\"1hKEom\":[\"優先度\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"ステータスを追加\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"影響を受けるカードを表示\"],\"28IjHv\":[\"Archive state\"],\"2BPVq8\":[[\"0\"],\"を並べ替え\"],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"名前を変更\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"別のスイムレーンを選び、先にカードを更新します。\"],\"3ESfuy\":[\"説明を追加…\"],\"3Ib6FN\":[\"下へ移動\"],\"3SETeK\":[\"You're caught up. New mentions, reminders, due work and blockers appear here.\"],\"3dmm5B\":[\"⌘/Ctrl + Enter で作成\"],\"3qkggm\":[\"全画面表示\"],\"4NY8B5\":[\"作成するスイムレーン\"],\"4WPwlg\":[\"Archived card\"],\"4gdyen\":[\"ローカル（自分の）\"],\"4hJhzz\":[\"表\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[開始] --> B[終了]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5OrUX9\":[\"Board view\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"インラインコード\"],\"5nNdrW\":[\"Could not save changes.\"],\"5ptOXn\":[\"Could not save project settings.\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"コピーしました\"],\"6YtxFj\":[\"名前\"],\"6_Ns5U\":[\"Deleted card\"],\"6buwPb\":[\"Board settings\"],\"6gRgw8\":[\"Retry\"],\"79Yvzu\":[\"スイムレーン名\"],\"7JA4uP\":[\"Project key can be at most 32 characters.\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"確認\"],\"7dA6V6\":[\"No assigned work\"],\"7dZyQU\":[\"以前のスイムレーンが見つかりません\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"7z2Od5\":[\"Changed labels\"],\"8AbRER\":[\"Set due date\"],\"8PifYj\":[\"Mermaid 図\"],\"8Tg_JR\":[\"カスタム\"],\"8cwUrg\":[\"Restored card\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"結果（編集可能）\"],\"8lE269\":[\"並べ替え：手動\"],\"8vwDbf\":[\"Project timeline\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"この Draw.io 図をレンダリングできませんでした。\"],\"AC9Gkf\":[\"列を展開\"],\"AL_kTn\":[\"e.g. JT\"],\"ANe5kn\":[\"カードを更新中…\"],\"AS5WO9\":[\"この PDF をレンダリングできませんでした。\"],\"ASPlZ6\":[\"Target date\"],\"ATIq3Z\":[\"スイムレーン：カスタム\"],\"AVreQ5\":[\"ドラッグしてサイズ変更\"],\"A_X9M1\":[\"Changed status\"],\"AgvHni\":[\"列を追加\"],\"AjVXBS\":[\"Calendar\"],\"AmiJYR\":[\"Add relation\"],\"AoHpbt\":[\"スイムレーンが見つからないカードを表示\"],\"AxAubu\":[\"グループ：担当者\"],\"B495Gs\":[\"Archive\"],\"B5TUF-\":[\"Priority…\"],\"BC3Pra\":[\"What outcome is this project driving?\"],\"BfMZ7w\":[\"クラウドを採用\"],\"BiWlsk\":[\"Status…\"],\"Bkuvz9\":[\"Set assignee\"],\"BnmEvM\":[\"テンプレートとして保存\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"スイムレーンの変換を再開しますか？\"],\"CdL7Vl\":[\"Changed dependencies\"],\"CdZ3-n\":[\"Parent card\"],\"Cx7myC\":[\"Clear due date\"],\"CxcMyt\":[[\"0\"],\"を\",[\"2\"],\"件中\",[\"1\"],\"番目に移動しました。\"],\"DD5Nk7\":[\"Project summary can be at most 280 characters.\"],\"DGEEOQ\":[\"スイムレーンの操作\"],\"DPfwMq\":[\"完了\"],\"DXbQMt\":[\"Related cards\"],\"Db4W3_\":[\"ステータス\"],\"EWPtMO\":[\"コード\"],\"EbMPZJ\":[\"未割り当て\"],\"Evdel1\":[\"Changed schedule\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"F6pfE9\":[\"Active\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"スイムレーン：不明\"],\"G4qrLy\":[\"完了列を解除\"],\"GKu3m4\":[\"ラベルなし\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gp4Yi6\":[\"Inbox\"],\"Gpfctt\":[\"期限\"],\"Gpw0dJ\":[\"Inbox zero\"],\"HTKRVa\":[\"このダイアログを閉じないでください。\"],\"HX7utX\":[\"Lightweight planning metadata shared by every board view.\"],\"H_SQFv\":[\"色なし\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"分割\"],\"ICip_B\":[\"クラウド（リモート）\"],\"IdMoS6\":[\"最初のスイムレーンを作成\"],\"Ik60OC\":[\"エディターで開く\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"WIP 制限を設定\"],\"JKsLFA\":[\"Markdown に対応\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"カードを検索\"],\"KAlhe_\":[\"カードの更新が保存されなかったため、変換を停止しました。更新して再試行してください。\"],\"KCszT6\":[\"スイムレーンを追加\"],\"KFiYGY\":[\"色を変更\"],\"KGi3u9\":[\"ドラッグして並べ替え\"],\"KNKCTb\":[\"Backlog\"],\"KOXB6D\":[\"Card actions for \",[\"0\"]],\"K_F6pa\":[\"保存中…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"カードを移動中…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"Kfl94N\":[\"Active and archived\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"太字\"],\"KpnwJK\":[\"「\",[\"0\"],\"」を削除しますか？\"],\"KqBY_x\":[\"No cards in this status\"],\"KvW1VO\":[\"Draw.io 図\"],\"LHvIwl\":[\"Dismiss \",[\"0\"]],\"LQn6-8\":[\"ローカルを採用\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"M0aIbs\":[\"Target date must be on or after the start date.\"],\"MHrjPM\":[\"タイトル\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"この空のスイムレーンをボードから削除します。\"],\"MeLVaU\":[\"Gantt\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"N2tLf0\":[\"Could not load activity.\"],\"N40H-G\":[\"All\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"カードを移動して削除\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"説明\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"タグ\"],\"OepdfE\":[\"グループ：ステータス\"],\"P5cvAA\":[\"ステータス名\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"編集可能なスイムレーンを作成\"],\"PVNHB1\":[\"Unknown actor\"],\"PeXa8M\":[\"Mentioned @\",[\"0\"]],\"Pvpx7b\":[\"Paste a URL or path\"],\"Pwqkdw\":[\"Loading…\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"フィルターをクリア\"],\"QD8opX\":[\"ボード\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Mermaid 構文を書くと図が表示されます。\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"上へ移動\"],\"RS0o7b\":[\"State\"],\"RbsNko\":[\"現在\",[\"cardCount\"],\"枚のカードがこのスイムレーンを使用しています。\"],\"RfEZH1\":[\"JType は現在の担当者行から独立したスイムレーンを作成します。カードの担当者は変更されません。\"],\"RgO4DX\":[\"スイムレーン ID「\",[\"0\"],\"」が重複しています。最初の定義を使用します。\"],\"RlLl3G\":[[\"0\"],\"の操作\"],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"カンマ区切り\"],\"SavliD\":[[\"danglingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"TA4xJz\":[\"Assignee…\"],\"TXnokZ\":[\"Reminder due\"],\"T_nAzC\":[\"JType は既存のスイムレーン ID を再利用し、未完了のカード更新を続行します。\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" のレーン詳細\"],\"U0hizX\":[\"スイムレーンの色\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"空のカード\"],\"URmyfc\":[\"詳細\"],\"Ubl2by\":[\"右へ移動\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"このファイル形式はまだプレビューできません。\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WAjFYI\":[\"Start date\"],\"WEYdDv\":[\"推奨\"],\"WSP6v1\":[\"並べ替え：優先度\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"値を入力してください。\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"処理中…\"],\"Y8bR2a\":[\"スイムレーンだけを削除します。カードの参照は復元できます。\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"ステータスの操作\"],\"YNYued\":[\"Status ID\"],\"YOWshY\":[[\"0\"],\"/\",[\"1\"]],\"Ya7bZl\":[\"図のエラー\"],\"Z801fH\":[\"Created card\"],\"ZH7TVS\":[\"カードのタイトル\"],\"Zot9XS\":[\"カードなし\"],\"_0G8xR\":[\"Reopened comment thread\"],\"_5CsXX\":[\"完了列\"],\"_BsotH\":[\"Save project\"],\"_DwR-n\":[\"作成中…\"],\"_EsjyQ\":[\"これを使用\"],\"_TJomP\":[\"削除前にカードを移動\"],\"_YbTQZ\":[\"JType は現在の優先度行から独立したスイムレーンを作成します。カードの優先度は変更されません。\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_kpR4w\":[\"Reminder\"],\"_laW0t\":[\"Previous row missing\"],\"_zI8pq\":[\"Sign in to see personal work\"],\"a6uhHr\":[\"太字 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"aXFOuf\":[\"No activity yet\"],\"abUZlY\":[\"詳細を追加...\"],\"agOeRN\":[\"この API 仕様をレンダリングできませんでした。\"],\"arhExE\":[\"Swimlane ID\"],\"b1MkzY\":[\"Updated card\"],\"b4hVKD\":[\"色付き列\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"カードを未割り当てに残す\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"スイムレーン ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"変更は自動的に保存されます。\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"ラベルを追加\"],\"cnGeoo\":[\"削除\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 制限 \",[\"0\"]],\"dEgA5A\":[\"キャンセル\"],\"dMtLDE\":[\"to\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"dXoieq\":[\"Summary\"],\"ddrz1m\":[\"Overdue\"],\"dgAb2R\":[\"Add to selection\"],\"dsLT3m\":[\"カードを作成\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"複製\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"fOP7Wy\":[\"追加情報\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"スイムレーン\"],\"fYcKtB\":[\"並べ替え：期限\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"関連\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"無題のカード\"],\"gMAF3u\":[\"Work scope\"],\"gWlA7i\":[\"Archived cards\"],\"gpGcIe\":[\"This board is read-only.\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"変換できる割り当て済みの値がありません。\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"コピー\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF ドキュメント\"],\"hyVzII\":[\"スイムレーン\"],\"i4_LY_\":[\"記述\"],\"iROlQr\":[\"カードの詳細\"],\"iSLA_r\":[\"左へ移動\"],\"iTylMl\":[\"テンプレート\"],\"iYVqZq\":[\"列名\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jXsah0\":[\"Project settings\"],\"jZlrte\":[\"カラー\"],\"jzy1b8\":[\"スイムレーンを編集可能にする\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid ソース\"],\"klk7Go\":[\"カードを作成できませんでした。もう一度お試しください。\"],\"kryGs-\":[\"カード\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"更新\"],\"lCu9N3\":[\"My Work and Inbox use your identity to find assigned cards, mentions and reminders.\"],\"lEQWoB\":[\"カードがなくても表示され続ける横方向のグループを追加します。\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"このボードの横方向グループです。名前を変更しても、カードの関連付けは維持されます。\"],\"l_UFPv\":[\"プロパティ\"],\"l_g7se\":[\"変換を再開\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"マージ結果を保存\"],\"lujQxb\":[\"Changed assignee\"],\"m16xKo\":[\"追加\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"カードを削除\"],\"nfhh60\":[\"優先度スイムレーンを編集可能にしますか？\"],\"njJFtc\":[\"Delete comment\"],\"ntiMEf\":[\"Could not load comments.\"],\"o7J4JM\":[\"フィルター\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"カスタムフィールド\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"oesHMm\":[\"Work is blocked\"],\"ojKCLU\":[\"担当者\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"並べ替え：タイトル\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKxJpM\":[\"Outside timeline\"],\"pKztsX\":[\"フルエディターで開く\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"新規カード\"],\"pwN6Ae\":[\"列を折りたたむ\"],\"pzutoc\":[\"イタリック\"],\"qZd_ph\":[\"Add row\"],\"qjtdW-\":[\"No scheduled cards yet\"],\"qpGDiV\":[\"スイムレーン ID をコピー\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"スイムレーンの詳細\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"プレビュー\"],\"rfI3Fa\":[\"サブカードを作成できませんでした。もう一度お試しください。\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"ステータスを管理\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sBe1e-\":[\"My work\"],\"sCzmvQ\":[\"枚のカード\"],\"sPHzr3\":[\"Deleted comment\"],\"sQpDn6\":[\"全画面表示を終了\"],\"sujToP\":[\"Parent\"],\"t5Pdeu\":[\"Cards assigned to you across this project appear here.\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 件の競合\",[\"1\"],\"を解決中\"],\"tR1uEq\":[\"Loading comments\"],\"tXkhj_\":[\"Start\"],\"tYS8HY\":[\"ステータス列は、列またはスイムレーンとして使用中でも管理できます。\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"カードのタイトル（Enter で追加、Esc でキャンセル）\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"スイムレーンを削除\"],\"uAQUqI\":[\"ステータス\"],\"uH1U8v\":[\"スイムレーンを管理\"],\"uWPalN\":[\"スイムレーン名「\",[\"0\"],\"」が重複しています。名前は一意にしてください。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vDFCs9\":[\"Remove from selection\"],\"vIKvqQ\":[[\"missingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"担当者スイムレーンを編集可能にしますか？\"],\"vfYjJ_\":[\"コピーに失敗しました。\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"イタリック (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"完了列に設定\"],\"wwu18a\":[\"アイコン\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xHe_7h\":[\"Dependencies\"],\"xUOPoQ\":[\"使用状況\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"xt1ty_\":[\"Project key\"],\"y1eoq1\":[\"リンクをコピー\"],\"y9cj46\":[\"グループ：優先度\"],\"yEbJGs\":[\"+ Add field\"],\"yKu_3Y\":[\"Restore\"],\"yXjcFl\":[\"Edited comment\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← リストに戻る\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yp6eeC\":[\"Added comment\"],\"yz7wBu\":[\"閉じる\"],\"yzF66j\":[\"リンク\"],\"z68Wjp\":[\"Back to previous card\"],\"zOc0vf\":[\"アイコンなし\"],\"zga9sT\":[\"OK\"]}"),
	ko: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-0gKc0\":[\"Loading activity\"],\"-3Qbcm\":[\"Priority: \",[\"0\"]],\"-9kYEs\":[\"Cards with a missing row\"],\"-AW71f\":[\"Resolved comment thread\"],\"-MNaMX\":[\"Mentioned someone\"],\"-X4ual\":[\"No priority\"],\"-b7T3G\":[\"Updated\"],\"-eTfgY\":[\"Swimlane details\"],\"-hwvgo\":[\"Row actions\"],\"-yFTkm\":[\"milestone\"],\"-yOx8u\":[\"Saving changes…\"],\"02N8r0\":[\"Filter cards\"],\"0cspe_\":[\"Delete row\"],\"0gvHNl\":[\"Statuses define the card workflow. Rename or reorder them freely; cards stay mapped by status ID.\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"노트\"],\"1QfxQT\":[\"Dismiss\"],\"1YABGm\":[\"링크 (Ctrl+K)\"],\"1hKEom\":[\"우선순위\"],\"1iShX0\":[\"Due today\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"28IjHv\":[\"Archive state\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2aEwT_\":[\"Manage custom rows\"],\"2wxgft\":[\"이름 변경\"],\"32TndD\":[\"Blocked\"],\"3CIp19\":[\"Next 7 days\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3ESfuy\":[\"설명 추가…\"],\"3Ib6FN\":[\"Move down\"],\"3SETeK\":[\"You're caught up. New mentions, reminders, due work and blockers appear here.\"],\"3dmm5B\":[\"⌘/Ctrl + Enter를 눌러 만들기\"],\"3qkggm\":[\"전체 화면\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4WPwlg\":[\"Archived card\"],\"4gdyen\":[\"로컈 (내 것)\"],\"4hJhzz\":[\"테이블\"],\"4t8aKB\":[\"Rows to create\"],\"4vd-Kd\":[\"JType will create independent custom swimlanes from the current priority columns. Card priority values will stay unchanged.\"],\"54sFiP\":[\"flowchart TD\\n  A[시작] --> B[끝]\"],\"5Cawxq\":[\"Swimlanes: Custom\"],\"5OrUX9\":[\"Board view\"],\"5Oy0YM\":[\"Labels: \",[\"0\"]],\"5Q_DQ6\":[\"인라인 코드\"],\"5nNdrW\":[\"Could not save changes.\"],\"5ptOXn\":[\"Could not save project settings.\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6G3KzD\":[\"Row details\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6_Ns5U\":[\"Deleted card\"],\"6buwPb\":[\"Board settings\"],\"6gRgw8\":[\"Retry\"],\"79Yvzu\":[\"Swimlane name\"],\"7JA4uP\":[\"Project key can be at most 32 characters.\"],\"7MGAQC\":[\"JType will reuse the existing row IDs and continue unfinished card updates.\"],\"7VpPHA\":[\"확인\"],\"7dA6V6\":[\"No assigned work\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7pBic4\":[[\"visibleCount\"],\" of \",[\"totalCount\"],\" cards shown\"],\"7s3WlU\":[\"Blocks\"],\"7z2Od5\":[\"Changed labels\"],\"8AbRER\":[\"Set due date\"],\"8PifYj\":[\"Mermaid 다이어그램\"],\"8Tg_JR\":[\"Custom\"],\"8cwUrg\":[\"Restored card\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"결과 (편집 가능)\"],\"8lE269\":[\"정렬: 수동\"],\"8vwDbf\":[\"Project timeline\"],\"9L7ptC\":[\"This empty row will be removed from the board.\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9YTdO7\":[\"Blocked cards\"],\"9gx7rl\":[[\"missingCount\"],\" card(s) refer to deleted rows.\"],\"9gxam6\":[\"이 Draw.io 다이어그램을 렌더링할 수 없습니다.\"],\"AC9Gkf\":[\"열 펼치기\"],\"AL_kTn\":[\"e.g. JT\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"이 PDF를 렌더링할 수 없습니다.\"],\"ASPlZ6\":[\"Target date\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"드래그하여 크기 조정\"],\"A_X9M1\":[\"Changed status\"],\"AgvHni\":[\"열 추가\"],\"AjVXBS\":[\"Calendar\"],\"AmiJYR\":[\"Add relation\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"그룹: 담당자\"],\"B495Gs\":[\"Archive\"],\"B5TUF-\":[\"Priority…\"],\"BC3Pra\":[\"What outcome is this project driving?\"],\"BfMZ7w\":[\"클라우드 수낙\"],\"BiWlsk\":[\"Status…\"],\"Bkuvz9\":[\"Set assignee\"],\"BnmEvM\":[\"템플릿으로 저장\"],\"C6-ZRl\":[\"Someone\"],\"CQ_dDx\":[\"Swimlanes: Status\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CdL7Vl\":[\"Changed dependencies\"],\"CdZ3-n\":[\"Parent card\"],\"Cx7myC\":[\"Clear due date\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DD5Nk7\":[\"Project summary can be at most 280 characters.\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"DXbQMt\":[\"Related cards\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"코드\"],\"EbMPZJ\":[\"미할당\"],\"Evdel1\":[\"Changed schedule\"],\"F6osRA\":[[\"danglingCount\"],\" card(s) refer to deleted rows.\"],\"F6pfE9\":[\"Active\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"완료 열 해제\"],\"GKu3m4\":[\"라벨 없음\"],\"GL6e_U\":[[\"cardCount\"],\" card(s) currently use this row.\"],\"GNoXOd\":[\"Copy swimlane ID\"],\"Gp4Yi6\":[\"Inbox\"],\"Gpfctt\":[\"마감\"],\"Gpw0dJ\":[\"Inbox zero\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"HX7utX\":[\"Lightweight planning metadata shared by every board view.\"],\"H_SQFv\":[\"색상 없음\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"스플릿\"],\"ICip_B\":[\"클라우드 (원격)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"에디터에서 열기\"],\"ImOQa9\":[\"Reply\"],\"IqKCNQ\":[\"Row\"],\"Iw6WJa\":[\"WIP 한도 설정\"],\"JKsLFA\":[\"Markdown 지원\"],\"JPB7_s\":[\"Cards with a missing swimlane\"],\"JTYvAw\":[\"카드 검색\"],\"KAlhe_\":[\"카드 업데이트가 저장되지 않아 변환을 중지했습니다. 새로 고친 후 다시 시도하세요.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"KNKCTb\":[\"Backlog\"],\"KOXB6D\":[\"Card actions for \",[\"0\"]],\"K_F6pa\":[\"저장 중…\"],\"K_cST0\":[\"Resume row conversion?\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"Kfl94N\":[\"Active and archived\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"굵게\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KqBY_x\":[\"No cards in this status\"],\"KvW1VO\":[\"Draw.io 다이어그램\"],\"LHvIwl\":[\"Dismiss \",[\"0\"]],\"LQn6-8\":[\"로컈 수낙\"],\"Ld9MtR\":[\"Rows: Assignee\"],\"M0aIbs\":[\"Target date must be on or after the start date.\"],\"MHrjPM\":[\"제목\"],\"MRsDXp\":[\"JType will reuse the existing swimlane IDs and continue unfinished card updates.\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"MeLVaU\":[\"Gantt\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"N2tLf0\":[\"Could not load activity.\"],\"N40H-G\":[\"All\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"NnxWLJ\":[\"Create your first custom row\"],\"Nu4oKW\":[\"설명\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"태그\"],\"OepdfE\":[\"그룹: 상태\"],\"P5cvAA\":[\"Status name\"],\"PM7yYy\":[\"Row ID\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"PVNHB1\":[\"Unknown actor\"],\"PeXa8M\":[\"Mentioned @\",[\"0\"]],\"Pvpx7b\":[\"Paste a URL or path\"],\"Pwqkdw\":[\"Loading…\"],\"Q-Pe7U\":[\"Swimlane details for \",[\"0\"]],\"Q2mGA7\":[\"필터 지우기\"],\"QD8opX\":[\"보드\"],\"QRhoJb\":[\"JType will create independent custom swimlanes from the current assignee columns. Card assignee values will stay unchanged.\"],\"QlsPZy\":[\"Mermaid 구문을 작성하면 다이어그램이 표시됩니다.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RS0o7b\":[\"State\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"RnplaY\":[\"Row details for \",[\"0\"]],\"S5Qbb1\":[\"쉼표로 구분\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"TA4xJz\":[\"Assignee…\"],\"TXnokZ\":[\"Reminder due\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" 레인 세부 정보\"],\"U0hizX\":[\"Swimlane color\"],\"U95P80\":[\"Make priority rows editable?\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"빈 카드\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"UouxNQ\":[\"Swimlanes: Assignee\"],\"VNa_N2\":[\"이 파일 형식은 아직 미리볼 수 없습니다.\"],\"VXh9CK\":[\"No due date\"],\"VbyRUy\":[\"Comments\"],\"Ve-C10\":[\"Swimlanes: Priority\"],\"WAjFYI\":[\"Start date\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"정렬: 우선순위\"],\"WSbuWy\":[\"Missing swimlane\"],\"WWUwTb\":[\"Make assignee rows editable?\"],\"X03-eC\":[\"값을 입력해 주세요.\"],\"XJOV1Y\":[\"Activity\"],\"XicmhT\":[\"Due date\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YDa2KG\":[\"My cards\"],\"YFdnVT\":[\"Card state\"],\"YHjvGb\":[\"Status actions\"],\"YNYued\":[\"Status ID\"],\"YOWshY\":[[\"0\"],\"/\",[\"1\"]],\"Ya7bZl\":[\"다이어그램 오류\"],\"Z801fH\":[\"Created card\"],\"ZH7TVS\":[\"카드 제목\"],\"Zot9XS\":[\"카드 없음\"],\"_0G8xR\":[\"Reopened comment thread\"],\"_5CsXX\":[\"완료 열\"],\"_BsotH\":[\"Save project\"],\"_DwR-n\":[\"만드는 중…\"],\"_EsjyQ\":[\"이것 사용\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"_kh61D\":[\"Show cards with missing rows\"],\"_kpR4w\":[\"Reminder\"],\"_laW0t\":[\"Previous row missing\"],\"_zI8pq\":[\"Sign in to see personal work\"],\"a6uhHr\":[\"굵게 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"aXFOuf\":[\"No activity yet\"],\"abUZlY\":[\"세부정보 추가...\"],\"agOeRN\":[\"이 API 명세를 렌더링할 수 없습니다.\"],\"arhExE\":[\"Swimlane ID\"],\"b1MkzY\":[\"Updated card\"],\"b4hVKD\":[\"색상 열\"],\"bUNpV2\":[\"Duplicate swimlane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c-EXz1\":[\"Delete only the row. Card references remain recoverable.\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cSev-j\":[\"Filters\"],\"cUt8yN\":[\"Changes save automatically.\"],\"ceQmqN\":[\"Custom rows\"],\"cfaWH-\":[\"라벨 추가\"],\"cnGeoo\":[\"삭제\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 한도 \",[\"0\"]],\"dEgA5A\":[\"취소\"],\"dMtLDE\":[\"to\"],\"dQva-y\":[\"Duplicate row ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"dXoieq\":[\"Summary\"],\"ddrz1m\":[\"Overdue\"],\"dgAb2R\":[\"Add to selection\"],\"dsLT3m\":[\"카드 만들기\"],\"eAi4RE\":[\"JType will create independent custom rows from the current priority groups. Card priority values will stay unchanged.\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"복제\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"fOP7Wy\":[\"추가 정보\"],\"fOluHh\":[\"JType will create independent custom rows from the current assignee groups. Card assignee values will stay unchanged.\"],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"정렬: 마감\"],\"fdEjOR\":[\"Copy row ID\"],\"fvImQM\":[[\"0\"],\" selected\"],\"fwTn8F\":[\"Row color\"],\"g87L9j\":[\"관계\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"제목 없는 카드\"],\"gMAF3u\":[\"Work scope\"],\"gWlA7i\":[\"Archived cards\"],\"gpGcIe\":[\"This board is read-only.\"],\"guQk4e\":[\"Columns: Status\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"h8DugX\":[\"Labels\"],\"hL5-_P\":[\"Rows\"],\"hNQgyI\":[\"Columns: Priority\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF 문서\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"작성\"],\"iROlQr\":[\"카드 세부 정보\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"템플릿\"],\"iYVqZq\":[\"열 이름\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jXsah0\":[\"Project settings\"],\"jZlrte\":[\"색상\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kBRFD0\":[\"Create editable rows\"],\"kMqzL_\":[\"Row name\"],\"kZlRKE\":[\"Mermaid 소스\"],\"klk7Go\":[\"카드를 만들 수 없습니다. 다시 시도해 주세요.\"],\"kryGs-\":[\"카드\"],\"kulGDO\":[\"Add attachment after creating the card\"],\"lCF0wC\":[\"새로고침\"],\"lCu9N3\":[\"My Work and Inbox use your identity to find assigned cards, mentions and reminders.\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_UFPv\":[\"속성\"],\"l_g7se\":[\"Resume conversion\"],\"lqoy3F\":[\"Missing row\"],\"lt2UOc\":[\"Rows: None\"],\"ltF1xa\":[\"병합 결과 저장\"],\"lujQxb\":[\"Changed assignee\"],\"m16xKo\":[\"Add\"],\"mPINe9\":[\"Duplicate row name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"nNGN_D\":[\"Custom swimlanes\"],\"nabda1\":[\"카드 삭제\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"ntiMEf\":[\"Could not load comments.\"],\"o7J4JM\":[\"필터\"],\"o8va6N\":[\"Restored\"],\"oPwQt4\":[\"사용자 지정 필드\"],\"obId50\":[\"Filters, \",[\"activeCount\"],\" active\"],\"oesHMm\":[\"Work is blocked\"],\"ojKCLU\":[\"담당자\"],\"p4rTvq\":[\"Rows: Priority\"],\"p9yTeb\":[\"정렬: 제목\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKxJpM\":[\"Outside timeline\"],\"pKztsX\":[\"전체 에디터에서 열기\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pip_Rq\":[\"Manage custom swimlanes\"],\"pnrmSP\":[\"새 카드\"],\"pwN6Ae\":[\"열 접기\"],\"pzutoc\":[\"기울임꼴\"],\"qZd_ph\":[\"Add row\"],\"qjtdW-\":[\"No scheduled cards yet\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rK_KGj\":[\"Optional horizontal groups for this board. Names can change; cards stay mapped by row ID.\"],\"rRubBJ\":[\"Lane details\"],\"rT-mCe\":[\"Remove filter: \",[\"0\"]],\"rdUucN\":[\"미리보기\"],\"rfI3Fa\":[\"하위 카드를 만들 수 없습니다. 다시 시도하세요.\"],\"rn2_2V\":[\"Remove filter\"],\"rvpMpc\":[\"Manage statuses\"],\"s8QaQC\":[\"Vertical columns for this board. Names can change; cards stay mapped by swimlane ID.\"],\"sBe1e-\":[\"My work\"],\"sCzmvQ\":[\"개 카드\"],\"sPHzr3\":[\"Deleted comment\"],\"sQpDn6\":[\"전체 화면 종료\"],\"sujToP\":[\"Parent\"],\"t5Pdeu\":[\"Cards assigned to you across this project appear here.\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"tK2x9T\":[\"⚠ 해결할 충돌 \",[\"0\"],\"건\",[\"1\"]],\"tR1uEq\":[\"Loading comments\"],\"tXkhj_\":[\"Start\"],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"카드 제목 (Enter로 추가, Esc로 취소)\"],\"u36sC2\":[\"Make rows editable\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"상태\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vDFCs9\":[\"Remove from selection\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vJvZPY\":[\"Assignee: \",[\"0\"]],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"복사하지 못했습니다.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"wGM_xy\":[\"Rows: Custom\"],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"기울임꼴 (Ctrl+I)\"],\"wp-2ZK\":[\"Rows: Status\"],\"wtw-au\":[\"완료 열로 설정\"],\"wwu18a\":[\"아이콘\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xHe_7h\":[\"Dependencies\"],\"xUOPoQ\":[\"Used by\"],\"xX5QVp\":[\"Choose another row, then update the cards first.\"],\"xt1ty_\":[\"Project key\"],\"y1eoq1\":[\"링크 복사\"],\"y9cj46\":[\"그룹: 우선순위\"],\"yEbJGs\":[\"+ Add field\"],\"yKu_3Y\":[\"Restore\"],\"yXjcFl\":[\"Edited comment\"],\"yYxB17\":[\"Clear all\"],\"ybGQtY\":[\"← 목록으로\"],\"yjeGpt\":[\"Columns: Assignee\"],\"yp6eeC\":[\"Added comment\"],\"yz7wBu\":[\"닫기\"],\"yzF66j\":[\"링크\"],\"z68Wjp\":[\"Back to previous card\"],\"zOc0vf\":[\"아이콘 없음\"],\"zga9sT\":[\"확인\"]}")
};
function Wb(e) {
	W.load(e, Ub[e] ?? Ub.en), W.activate(e);
}
//#endregion
//#region src/strings.ts
var Gb = {
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
		start: "Start",
		due: "Due",
		reminder: "Reminder",
		archived: "Archived",
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
		start: "开始",
		due: "截止",
		reminder: "提醒",
		archived: "已归档",
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
		start: "開始",
		due: "期限",
		reminder: "リマインダー",
		archived: "アーカイブ済み",
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
		start: "시작",
		due: "마감",
		reminder: "알림",
		archived: "보관됨",
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
function Kb(e) {
	return Gb[e] ?? Gb.en;
}
//#endregion
//#region src/JTypeBoard.tsx
var qb = 8;
function Jb(e, t, n) {
	return `${e}/${t}${n === 0 ? "" : `-${n + 1}`}.md`;
}
function Yb(e) {
	if (e instanceof Ng) return e.status === 409 || e.code.toLowerCase().includes("conflict");
	if (!e || typeof e != "object") return !1;
	let t = e;
	return t.status === 409 || typeof t.code == "string" && t.code.toLowerCase().includes("conflict");
}
function Xb(e) {
	return JSON.stringify(Hh({
		...e,
		version: 1
	}));
}
function Zb({ workspaceId: e, boardRef: t, baseUrl: n, token: r, client: i, readOnly: a = !1, currentUser: o, viewState: s, onViewStateChange: c, live: u = !0, pollIntervalMs: d = 3e4, initialCardPath: p, additionalCardRoots: m, onCardOpen: h, renderCardSupplement: g, onConnectionChange: v, locale: x, className: T, style: E }) {
	let D = x ?? "en", O = Kb(D), k = y(null);
	k.current !== D && (k.current = D, Wb(D));
	let A = i && (n || r) ? O.errPropsBoth : !i && (!n || !r) ? O.errPropsNone : null, j = _(() => A ? null : i || Pg({
		baseUrl: n,
		token: r
	}), [
		i,
		n,
		r,
		A
	]), M = Math.max(5e3, d), N = (m ?? []).map((e) => e.trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "")).filter((e) => e !== "" && !e.startsWith("/") && e.split("/").every((e) => e !== "" && e !== "." && e !== "..")).filter((e, t, n) => n.indexOf(e) === t).join("\0"), P = m !== void 0, F = _(() => P ? N ? N.split("\0") : [] : void 0, [N, P]), [I, L] = b(null), [R, z] = b(""), [B, te] = b(""), [V, H] = b("polling"), [ne, re] = b(null), [ie, ae] = b(p), [oe, se] = b({ version: 1 }), ce = _(() => I ? Uh(Rg(I.config, I.boardDir)) : { version: 1 }, [I]), le = _(() => Hh({
		...ce,
		...oe,
		...s ?? {},
		version: 1
	}), [
		s,
		oe,
		ce
	]), ue = s !== void 0, de = _(() => s ? Xb(s) : "", [s]), fe = y(""), pe = y(le);
	pe.current = le;
	let me = y(a);
	me.current = a;
	let he = y(""), ge = y(null), U = y(null), _e = y(/* @__PURE__ */ new Map()), ve = y(null), ye = y(null), be = y(v);
	be.current = v;
	let xe = y(O);
	xe.current = O, f(() => {
		ae(p);
	}, [
		j,
		e,
		t,
		p
	]), f(() => {
		fe.current = "";
	}, [
		t,
		de,
		e
	]), f(() => {
		if (!ie || !I?.cards.some((e) => e.id === ie)) return;
		let e = window.setTimeout(() => ae(void 0), 0);
		return () => window.clearTimeout(e);
	}, [ie, I]);
	let Se = (e) => {
		let n = xe.current;
		return e instanceof Fg ? e.code === "board_not_found" ? n.errBoardNotFound(t) : e.code === "board_ref_ambiguous" ? n.errBoardAmbiguous(t, e.candidates) : e.code === "board_config_invalid" ? n.errBoardConfigInvalid : n.errGeneric(e.message) : e instanceof Ng ? e.status === 401 || e.status === 403 ? n.errUnauthorized : e.status === 0 && e.code === "network_error" ? n.errNetwork : n.errGeneric(e.code) : n.errGeneric(e instanceof Error ? e.message : String(e));
	}, Ce = y(Se);
	Ce.current = Se, f(() => {
		if (!j) return;
		let n = !1, r = null, i = null, a = null, o = null, s = !1, c = !1;
		U.current = null, L(null), z(""), te(""), re(null), se({ version: 1 }), he.current = "";
		let l = (e) => {
			n || (H(e), ye.current !== e && (ye.current = e, be.current?.(e)));
		}, d = async () => {
			try {
				let r = await Ug(j, e, t, _e.current, F);
				return n ? null : (U.current = r, L(r), z(""), te(""), l(s ? "live" : "polling"), r);
			} catch (e) {
				if (n) return null;
				let t = Ce.current(e);
				return U.current ? te(t) : z(t), l("error"), null;
			}
		};
		ve.current = d;
		let f = () => {
			r = setTimeout(async () => {
				n || (s || await d(), n || f());
			}, M);
		}, p = (t) => {
			n || !u || c || !j.subscribeBoardEvents || (o = j.subscribeBoardEvents(e, t, {
				onEvent: () => {
					a && clearTimeout(a), a = setTimeout(() => void d(), 300);
				},
				onUp: () => {
					s = !0, l("live");
				},
				onDown: ({ permanent: e }) => {
					s = !1, !n && (U.current && l("polling"), e ? c = !0 : i = setTimeout(() => p(t), 3e4));
				}
			}));
		};
		return d().then((e) => {
			n || (e && p(e.config.id), f());
		}), () => {
			n = !0, r && clearTimeout(r), i && clearTimeout(i), a && clearTimeout(a), o?.(), ve.current = null;
		};
	}, [
		j,
		e,
		t,
		u,
		M,
		F
	]);
	let we = _(() => {
		let t = () => ve.current?.() ?? Promise.resolve(null), n = () => {
			if (me.current) throw Error("This board is read-only.");
		}, r = (e) => {
			let t = pe.current;
			return {
				...e.config,
				groupBy: t.groupBy ?? e.config.groupBy,
				swimlaneBy: t.swimlaneBy ?? (t.groupBy ? void 0 : e.config.swimlaneBy)
			};
		}, i = async (e) => {
			try {
				await e();
			} catch (e) {
				te(Ce.current(e));
			}
		}, a = async (t, r) => {
			let i = U.current;
			if (!i || !j) return;
			n();
			let a = i.metaByPath.get(t), o = await j.saveDocument(e, {
				relativePath: t,
				content: r,
				baseContentHash: a?.contentHash,
				baseContent: a?.content
			});
			if (a) {
				let e = U.current;
				if (!e) return;
				let n = new Map(e.metaByPath);
				n.set(t, {
					...n.get(t) ?? a,
					content: r,
					contentHash: o.contentHash
				});
				let i = {
					...e,
					metaByPath: n
				};
				U.current = i, L((t) => t === e ? i : t);
			}
		};
		return {
			refresh: () => void t(),
			setConfig: async (r) => {
				try {
					let i = U.current;
					if (!i || !j) return;
					n();
					let a = {
						...i.config,
						...r
					};
					await j.saveDocument(e, {
						relativePath: i.boardRelativePath,
						content: JSON.stringify(a, null, 2),
						baseContentHash: i.boardDoc.contentHash,
						baseContent: i.boardDoc.content
					}), await t();
				} catch (e) {
					throw te(Ce.current(e)), e;
				}
			},
			createCard: async (i, a, o) => {
				let s = U.current;
				if (!(!s || !j)) try {
					n();
					let c = r(s), l = dr(c), u = pr(l, i, o), d = s.cards.filter((e) => yr(e, c) === u).reduce((e, t) => Math.max(e, t.position), -1) + 1, f = Bg(Bg(jn("", {
						title: a,
						board: s.config.id,
						status: l === "status" ? u : s.config.columns[0]?.key ?? "todo",
						position: String(d)
					}), fr(l, u)), o ?? {}), p = sr(a), m = null;
					for (let r = 0; r < qb; r += 1) {
						n();
						let i = Jb(s.boardDir, p, r);
						if (!s.metaByPath.has(i)) try {
							return await j.saveDocument(e, {
								relativePath: i,
								content: f,
								createOnly: !0
							}), await t(), i;
						} catch (e) {
							if (!Yb(e)) throw e;
							m = e;
						}
					}
					throw m ?? /* @__PURE__ */ Error("Could not allocate a unique Card path.");
				} catch (e) {
					throw te(Ce.current(e)), e;
				}
			},
			updateCard: async (e, n) => {
				try {
					let r = U.current, i = r?.metaByPath.get(e);
					if (!r || !i) return;
					await a(e, Bg(i.content, n)), await t();
				} catch (e) {
					throw te(Ce.current(e)), e;
				}
			},
			updateCards: async (e, r) => {
				try {
					n();
					let i = U.current;
					if (!i) return;
					let o = e.find((e) => !i.metaByPath.has(e.cardId));
					if (o) throw Error(`Card metadata is missing for ${o.cardId}.`);
					let s = 0;
					for (let t of e) {
						let n = i.metaByPath.get(t.cardId);
						await a(t.cardId, Bg(n.content, t.patch)), s += 1, r?.(s, e.length);
					}
					await t();
				} catch (e) {
					throw await t(), te(Ce.current(e)), e;
				}
			},
			moveCard: (e, n, o) => i(async () => {
				let i = U.current;
				if (!i || !j) return;
				let s = r(i), c = dr(s), l = i.metaByPath.get(e);
				if (!l) return;
				if (c !== "status") {
					let r = i.cards.find((t) => t.id === e);
					if (!r || yr(r, s) === n) return;
					await a(e, Bg(l.content, fr(c, n))), await t();
					return;
				}
				let u = i.cards.filter((t) => t.columnKey === n && t.id !== e).sort((e, t) => e.position - t.position), d = i.cards.find((t) => t.id === e);
				d && u.splice(Math.max(0, Math.min(o, u.length)), 0, d);
				for (let t = 0; t < u.length; t++) {
					let r = u[t];
					if (!r) continue;
					let o = i.metaByPath.get(r.id);
					if (!o || r.id !== e && r.position === t && r.columnKey === n) continue;
					let { data: s, body: c } = An(o.content);
					await a(r.id, jn(c, {
						...s,
						status: n,
						position: String(t)
					}));
				}
				await t();
			}),
			deleteCard: async (r) => {
				let a = U.current, o = a?.metaByPath.get(r.id);
				if (!(!a || !o || !j)) {
					if (!j.deleteDocument) {
						te(xe.current.deleteUnsupported);
						return;
					}
					window.confirm(xe.current.confirmDeleteCard(r.title)) && await i(async () => {
						n(), await j.deleteDocument(e, o.id), await t();
					});
				}
			}
		};
	}, [
		j,
		e,
		a
	]), Te = _(() => Mg(we, () => me.current), [we]), Ee = _(() => I ? Rg(I.config, I.boardDir) : null, [I]);
	f(() => {
		!I || !Ee || he.current === I.config.id || (he.current = I.config.id, se(Uh(Ee)));
	}, [I, Ee]);
	let De = l((e) => {
		let t = Hh(e), n = Xb(t);
		ue || se((e) => Xb(e) === n ? e : t), fe.current !== n && (fe.current = n, c?.(t));
	}, [ue, c]), Oe = ne ? I?.cards.find((e) => e.id === ne) ?? null : null, ke = p && I && !I.cards.some((e) => e.id === p) ? O.errCardNotFound(p) : "", Ae = () => {
		re(null);
		let e = ge.current;
		ge.current = null, e && requestAnimationFrame(() => e.focus());
	}, je = h ?? (a ? (e) => {
		ge.current = document.activeElement instanceof HTMLElement ? document.activeElement : null, re(e.id);
	} : void 0), Me;
	return Me = A ? /* @__PURE__ */ C(Qb, { message: A }) : !I && R ? /* @__PURE__ */ C(Qb, {
		message: R,
		retryLabel: O.retry,
		onRetry: () => void ve.current?.()
	}) : !I || !Ee ? /* @__PURE__ */ C("div", {
		className: "flex h-full items-center justify-center bg-[#fbfdfb] p-8 text-sm text-stone-500",
		children: O.loading
	}) : /* @__PURE__ */ w(S, { children: [
		/* @__PURE__ */ C(ee, {
			i18n: W,
			children: /* @__PURE__ */ C(jg, {
				config: Ee,
				cards: I.cards,
				actions: Te,
				viewState: le,
				onViewStateChange: De,
				error: B || ke || void 0,
				initialCardId: ie,
				readOnly: a,
				currentUser: o,
				onCardOpen: je,
				peekComponent: !a && !h ? bh : void 0,
				renderCardSupplement: g,
				portalClassName: "jtb-scope"
			})
		}),
		Oe && a && !h && I && /* @__PURE__ */ C(Hb, {
			card: Oe,
			config: I.config,
			strings: O,
			supplement: g?.(Oe),
			onClose: Ae
		}),
		/* @__PURE__ */ C($b, {
			state: V,
			strings: O,
			pollSecs: Math.round(M / 1e3),
			liveWanted: u
		})
	] }), /* @__PURE__ */ C("div", {
		className: `jtb-scope jtb-root ${T ?? ""}`,
		style: E,
		"data-jtype-board": t,
		children: Me
	});
}
function Qb({ message: e, retryLabel: t, onRetry: n }) {
	return /* @__PURE__ */ w("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center",
		children: [
			/* @__PURE__ */ C(te, {
				className: "h-9 w-9 text-amber-500",
				"aria-hidden": !0
			}),
			/* @__PURE__ */ C("p", {
				className: "max-w-md break-words text-sm text-stone-600",
				children: e
			}),
			n && t && /* @__PURE__ */ C("button", {
				type: "button",
				onClick: n,
				className: "rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				children: t
			})
		]
	});
}
function $b({ state: e, strings: t, pollSecs: n, liveWanted: r }) {
	let i = e === "live" ? t.live : e === "polling" ? t.polling(n) : t.connectionError, a = e === "live" ? "bg-emerald-500" : e === "polling" ? "bg-stone-400" : "bg-red-500";
	return /* @__PURE__ */ w("div", {
		className: "pointer-events-none absolute bottom-2 right-2 z-40 inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 px-2 py-0.5 text-[11px] text-stone-500 shadow-sm",
		title: e === "polling" && r ? t.liveUnavailableHint : void 0,
		children: [/* @__PURE__ */ C("span", {
			className: `h-1.5 w-1.5 rounded-full ${a}`,
			"aria-hidden": !0
		}), i]
	});
}
//#endregion
export { Ng as JTypeApiError, Zb as JTypeBoard, Fg as JTypeBoardError, Pg as createJTypeClient, Ig as resolveBoardDoc };
