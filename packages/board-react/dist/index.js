import * as e from "react";
import t, { Fragment as n, cloneElement as r, createContext as i, createElement as a, forwardRef as o, isValidElement as s, useCallback as c, useContext as l, useDebugValue as u, useEffect as d, useId as f, useId as p, useLayoutEffect as m, useMemo as h, useRef as g, useState as _, useSyncExternalStore as v } from "react";
import { Fragment as y, jsx as b, jsxs as x } from "react/jsx-runtime";
import * as S from "react-dom";
import { createPortal as C, flushSync as w } from "react-dom";
//#region node_modules/@lingui/react/dist/shared/react.DZONiYSA.mjs
var T = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)\/>/, E = {
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
function D(e, t = {}) {
	let n = e.split(T);
	if (n.length === 1) return e;
	let i = k(0, "$lingui$"), a = [], o = n.shift();
	o && a.push(o);
	for (let [e, o, s] of O(n)) {
		let n = e === void 0 ? void 0 : t[e];
		(!n || E[n.type] && o) && (console.error(n ? `${n.type} is a void element tag therefore it must have no children` : `Can't use element at index '${e}' as it is not declared in the original translation`), n = /* @__PURE__ */ b(y, {})), Array.isArray(n) && (n = /* @__PURE__ */ b(y, { children: n })), a.push(r(n, { key: i() }, o ? D(o, t) : n.props.children)), s && a.push(s);
	}
	return a.length === 1 ? a[0] : a;
}
function O(e) {
	if (!e.length) return [];
	let [t, n, r, i] = e.slice(0, 4);
	return [[
		t || r,
		n || "",
		i
	]].concat(O(e.slice(4, e.length)));
}
var k = (e = 0, t = "") => () => `${t}_${e++}`;
function ee(e) {
	let { render: t, component: n, id: r, message: i, formats: a, lingui: { i18n: o, defaultComponent: s } } = e, { values: c, components: l } = te(e), u = o && typeof o._ == "function" ? o._(r, c, {
		message: i,
		formats: a
	}) : r, d = u ? D(u, l) : null;
	if (t === null || n === null) return d;
	let f = s || A, p = {
		id: r,
		message: i,
		translation: d,
		children: d
	};
	if (t && n) console.error("You can't use both `component` and `render` prop at the same time. `component` is ignored.");
	else if (t && typeof t != "function") console.error(`Invalid value supplied to prop \`render\`. It must be a function, provided ${t}`);
	else if (n && typeof n != "function") return console.error(`Invalid value supplied to prop \`component\`. It must be a React component, provided ${n}`), /* @__PURE__ */ b(f, {
		...p,
		children: d
	});
	return typeof t == "function" ? t(p) : /* @__PURE__ */ b(n || f, {
		...p,
		children: d
	});
}
var A = ({ children: e }) => e, te = (e) => {
	if (!e.values) return {
		values: void 0,
		components: e.components
	};
	let t = { ...e.values }, n = { ...e.components };
	return Object.entries(e.values).forEach(([e, r]) => {
		if (typeof r == "string" || typeof r == "number") return;
		let i = Object.keys(n).length;
		n[i] = /* @__PURE__ */ b(y, { children: r }), t[e] = `<${i}/>`;
	}), {
		values: t,
		components: n
	};
}, ne = i(null), j = (e) => l(ne), re = ({ i18n: e, defaultComponent: t, children: n }) => {
	let r = g(e.locale || null), i = c(() => ({
		i18n: new Proxy(e, {}),
		defaultComponent: t,
		_: e.t.bind(e)
	}), [e, t]), [a, o] = _(i);
	return d(() => {
		let t = () => {
			r.current = e.locale || null, o(i());
		}, n = e.on("change", t);
		return r.current !== e.locale && t(), n;
	}, [e, i]), r.current === null ? null : /* @__PURE__ */ b(ne.Provider, {
		value: a,
		children: n
	});
};
function M(e) {
	let t = j(void 0);
	return /* @__PURE__ */ b(ee, {
		...e,
		lingui: t
	});
}
//#endregion
//#region node_modules/@lingui/core/dist/index.mjs
var N = (e) => typeof e == "string", ie = (e) => typeof e == "function", P = /* @__PURE__ */ new Map(), ae = "en";
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
	return F(() => de("date", r, n), () => new Intl.DateTimeFormat(r, i)).format(N(t) ? new Date(t) : t);
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
	return F(() => de("number", r, n), () => new Intl.NumberFormat(r, n)).format(t);
}
function ue(e, t, n, { offset: r = 0, ...i }) {
	let a = oe(e), o = t ? F(() => de("plural-ordinal", a), () => new Intl.PluralRules(a, { type: "ordinal" })) : F(() => de("plural-cardinal", a), () => new Intl.PluralRules(a, { type: "cardinal" }));
	return i[n] ?? i[o.select(n - r)] ?? i.other;
}
function F(e, t) {
	let n = e(), r = P.get(n);
	return r || (r = t(), P.set(n, r)), r;
}
function de(e, t, n) {
	return `${e}-${t.join("-")}-${JSON.stringify(n)}`;
}
var fe = /\\u[a-fA-F0-9]{4}|\\x[a-fA-F0-9]{2}/, pe = (e) => e.replace(/\\u([a-fA-F0-9]{4})|\\x([a-fA-F0-9]{2})/g, (e, t, n) => {
	if (t) {
		let e = parseInt(t, 16);
		return String.fromCharCode(e);
	} else {
		let e = parseInt(n, 16);
		return String.fromCharCode(e);
	}
}), me = "%__lingui_octothorpe__%", he = (e, t, n = {}) => {
	let r = t || e, i = (e) => typeof e == "object" ? e : n[e], a = (e, t) => {
		let a = Object.keys(n).length ? i("number") : void 0, o = le(r, e, a);
		return t.replace(new RegExp(me, "g"), o);
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
		select: ge,
		number: (e, t) => le(r, e, i(t) || { style: t }),
		date: (e, t) => se(r, e, i(t) || t),
		time: (e, t) => ce(r, e, i(t) || t)
	};
}, ge = (e, t) => t[e] ?? t.other;
function _e(e, t, n) {
	return (r = {}, i) => {
		let a = he(t, n, i), o = (e, t = !1) => Array.isArray(e) ? e.reduce((e, n) => {
			if (n === "#" && t) return e + me;
			if (N(n)) return e + n;
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
		return N(s) && fe.test(s) ? pe(s) : N(s) ? s : s ? String(s) : "";
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
		e ||= "", N(e) || (t = e.values || t, r = e.message, e = e.id);
		let i = this.messages[e], a = i === void 0, o = this._missing;
		if (o && a) return ie(o) ? o(this._locale, e) : o;
		a && this.emit("missing", {
			id: e,
			locale: this._locale
		});
		let s = i || r || e;
		return N(s) && (this._messageCompiler ? s = this._messageCompiler(s) : console.warn(`Uncompiled message detected! Message:

> ${s}

That means you use raw catalog or your catalog doesn't have a translation for the message and fallback was used.
ICU features such as interpolation and plurals will not work properly for that message.

Please compile your catalog first.
`)), N(s) && fe.test(s) ? pe(s) : N(s) ? s : _e(s, this._locale, this._locales)(t, n?.formats);
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
var I = be(), xe = (e) => e?.ownerDocument ?? document, Se = (e) => e && "window" in e && e.window === e ? e : xe(e).defaultView || window;
function Ce(e) {
	return typeof e == "object" && !!e && "nodeType" in e && typeof e.nodeType == "number";
}
function we(e) {
	return Ce(e) && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in e;
}
//#endregion
//#region ../../node_modules/.pnpm/react-stately@3.47.0_react@19.2.7/node_modules/react-stately/dist/private/flags/flags.mjs
var Te = !1;
function Ee() {
	return Te;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function L(e, t) {
	if (!Ee()) return t && e ? e.contains(t) : !1;
	if (!e || !t) return !1;
	let n = t;
	for (; n !== null;) {
		if (n === e) return !0;
		n = n.tagName === "SLOT" && n.assignedSlot ? n.assignedSlot.parentNode : we(n) ? n.host : n.parentNode;
	}
	return !1;
}
var R = (e = document) => {
	if (!Ee()) return e.activeElement;
	let t = e.activeElement;
	for (; t && "shadowRoot" in t && t.shadowRoot?.activeElement;) t = t.shadowRoot.activeElement;
	return t;
};
function z(e) {
	if (Ee() && e.target instanceof Element && e.target.shadowRoot) {
		if ("composedPath" in e) return e.composedPath()[0] ?? null;
		if ("composedPath" in e.nativeEvent) return e.nativeEvent.composedPath()[0] ?? null;
	}
	return e.target;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function De(e) {
	if (ke()) e.focus({ preventScroll: !0 });
	else {
		let t = Ae(e);
		e.focus(), je(t);
	}
}
var Oe = null;
function ke() {
	if (Oe == null) {
		Oe = !1;
		try {
			document.createElement("div").focus({ get preventScroll() {
				return Oe = !0, !0;
			} });
		} catch {}
	}
	return Oe;
}
function Ae(e) {
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
function je(e) {
	for (let { element: t, scrollTop: n, scrollLeft: r } of e) t.scrollTop = n, t.scrollLeft = r;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var Me = typeof document < "u" ? t.useLayoutEffect : () => {};
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/utils.mjs
function Ne(e) {
	let t = e;
	return t.nativeEvent = e, t.isDefaultPrevented = () => t.defaultPrevented, t.isPropagationStopped = () => t.cancelBubble, t.persist = () => {}, t;
}
function Pe(e, t) {
	Object.defineProperty(e, "target", { value: t }), Object.defineProperty(e, "currentTarget", { value: t });
}
function Fe(e) {
	let t = g({
		isFocused: !1,
		observer: null
	});
	return Me(() => {
		let e = t.current;
		return () => {
			e.observer &&= (e.observer.disconnect(), null);
		};
	}, []), c((n) => {
		let r = z(n);
		if (r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) {
			t.current.isFocused = !0;
			let n = r;
			n.addEventListener("focusout", (r) => {
				if (t.current.isFocused = !1, n.disabled) {
					let t = Ne(r);
					e?.(t);
				}
				t.current.observer && (t.current.observer.disconnect(), t.current.observer = null);
			}, { once: !0 }), t.current.observer = new MutationObserver(() => {
				if (t.current.isFocused && n.disabled) {
					t.current.observer?.disconnect();
					let e = n === R() ? null : R();
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
function Ie(e) {
	if (typeof window > "u" || window.navigator == null) return !1;
	let t = window.navigator.userAgentData?.brands;
	return Array.isArray(t) && t.some((t) => e.test(t.brand)) || e.test(window.navigator.userAgent);
}
function Le(e) {
	return typeof window < "u" && window.navigator != null && e.test(window.navigator.userAgentData?.platform || window.navigator.platform);
}
function Re(e) {
	let t = null;
	return () => (t ??= e(), t);
}
var ze = Re(function() {
	return Le(/^Mac/i);
}), Be = Re(function() {
	return Le(/^iPad/i) || ze() && navigator.maxTouchPoints > 1;
}), Ve = Re(function() {
	return Ie(/AppleWebKit/i) && !He();
}), He = Re(function() {
	return Ie(/Chrome/i);
}), Ue = Re(function() {
	return Ie(/Android/i);
}), We = Re(function() {
	return Ie(/Firefox/i);
});
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function Ge(e) {
	return e.pointerType === "" && e.isTrusted ? !0 : Ue() && e.pointerType ? e.type === "click" && e.buttons === 1 : e.detail === 0 && !e.pointerType;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/openLink.mjs
function Ke(e, t, n = !0) {
	let { metaKey: r, ctrlKey: i, altKey: a, shiftKey: o } = t;
	We() && window.event?.type?.startsWith("key") && e.target === "_blank" && (ze() ? r = !0 : i = !0);
	let s = Ve() && ze() && !Be() ? new KeyboardEvent("keydown", {
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
	Ke.isOpening = n, De(e), e.dispatchEvent(s), Ke.isOpening = !1;
}
Ke.isOpening = !1;
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var qe = null, Je = /* @__PURE__ */ new Set(), Ye = /* @__PURE__ */ new Map(), Xe = !1, Ze = !1, Qe = {
	Tab: !0,
	Escape: !0
};
function $e(e, t) {
	for (let n of Je) n(e, t);
}
function et(e) {
	return !(e.metaKey || !ze() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function tt(e) {
	Xe = !0, !Ke.isOpening && et(e) && (qe = "keyboard", $e("keyboard", e));
}
function nt(e) {
	qe = "pointer", "pointerType" in e && e.pointerType, (e.type === "mousedown" || e.type === "pointerdown") && (Xe = !0, $e("pointer", e));
}
function rt(e) {
	!Ke.isOpening && Ge(e) && (Xe = !0, qe = "virtual");
}
function it(e) {
	let t = Se(z(e)), n = xe(z(e));
	z(e) === t || z(e) === n || !e.isTrusted || (!Xe && !Ze && (qe = "virtual", $e("virtual", e)), Xe = !1, Ze = !1);
}
function at() {
	Xe = !1, Ze = !0;
}
function ot(e) {
	if (typeof window > "u" || typeof document > "u") return;
	let t = Se(e), n = xe(e);
	if (Ye.get(t)) return;
	let r = t.HTMLElement.prototype.focus;
	t.HTMLElement.prototype.focus = function() {
		Xe = !0, r.apply(this, arguments);
	}, n.addEventListener("keydown", tt, !0), n.addEventListener("keyup", tt, !0), n.addEventListener("click", rt, !0), t.addEventListener("focus", it, !0), t.addEventListener("blur", at, !1), typeof PointerEvent < "u" && (n.addEventListener("pointerdown", nt, !0), n.addEventListener("pointermove", nt, !0), n.addEventListener("pointerup", nt, !0)), t.addEventListener("beforeunload", () => {
		st(e);
	}, { once: !0 }), Ye.set(t, { focus: r });
}
var st = (e, t) => {
	let n = Se(e), r = xe(e);
	t && r.removeEventListener("DOMContentLoaded", t), Ye.has(n) && (n.HTMLElement.prototype.focus = Ye.get(n).focus, r.removeEventListener("keydown", tt, !0), r.removeEventListener("keyup", tt, !0), r.removeEventListener("click", rt, !0), n.removeEventListener("focus", it, !0), n.removeEventListener("blur", at, !1), typeof PointerEvent < "u" && (r.removeEventListener("pointerdown", nt, !0), r.removeEventListener("pointermove", nt, !0), r.removeEventListener("pointerup", nt, !0)), Ye.delete(n));
};
function ct(e) {
	let t = xe(e), n;
	return t.readyState === "loading" ? (n = () => {
		ot(e);
	}, t.addEventListener("DOMContentLoaded", n)) : ot(e), () => st(e, n);
}
typeof document < "u" && ct();
function lt() {
	return qe !== "pointer";
}
var ut = /* @__PURE__ */ new Set([
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
function dt(e, t, n) {
	let r = n ? z(n) : void 0, i = xe(r), a = Se(r), o = a === void 0 ? HTMLInputElement : a.HTMLInputElement, s = a === void 0 ? HTMLTextAreaElement : a.HTMLTextAreaElement, c = a === void 0 ? HTMLElement : a.HTMLElement, l = a === void 0 ? KeyboardEvent : a.KeyboardEvent, u = R(i);
	return e = e || u instanceof o && !ut.has(u.type) || u instanceof s || u instanceof c && u.isContentEditable, !(e && t === "keyboard" && n instanceof l && !Qe[n.key]);
}
function ft(e, t, n) {
	ot(), d(() => {
		if (n?.enabled === !1) return;
		let t = (t, r) => {
			dt(!!n?.isTextInput, t, r) && e(lt());
		};
		return Je.add(t), () => {
			Je.delete(t);
		};
	}, t);
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocus.mjs
function pt(e) {
	let { isDisabled: t, onFocus: n, onBlur: r, onFocusChange: i } = e, a = c((e) => {
		if (z(e) === e.currentTarget) return r && r(e), i && i(!1), !0;
	}, [r, i]), o = Fe(a), s = c((e) => {
		let t = z(e), r = xe(t), a = r ? R(r) : R();
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
function mt() {
	let e = g(/* @__PURE__ */ new Map()), t = c((t, n, r, i) => {
		let a = i?.once ? (...t) => {
			e.current.delete(r), r(...t);
		} : r;
		e.current.set(r, {
			type: n,
			eventTarget: t,
			fn: a,
			options: i
		}), t.addEventListener(n, a, i);
	}, []), n = c((t, n, r, i) => {
		let a = e.current.get(r)?.fn || r;
		t.removeEventListener(n, a, i), e.current.delete(r);
	}, []), r = c(() => {
		e.current.forEach((e, t) => {
			n(e.eventTarget, e.type, t, e.options);
		});
	}, [n]);
	return d(() => r, [r]), {
		addGlobalListener: t,
		removeGlobalListener: n,
		removeAllGlobalListeners: r
	};
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusWithin.mjs
function ht(e) {
	let { isDisabled: t, onBlurWithin: n, onFocusWithin: r, onFocusWithinChange: i } = e, a = g({ isFocusWithin: !1 }), { addGlobalListener: o, removeAllGlobalListeners: s } = mt(), l = c((e) => {
		L(e.currentTarget, z(e)) && a.current.isFocusWithin && !L(e.currentTarget, e.relatedTarget) && (a.current.isFocusWithin = !1, s(), n && n(e), i && i(!1));
	}, [
		n,
		i,
		a,
		s
	]), u = Fe(l), d = c((e) => {
		if (!L(e.currentTarget, z(e))) return;
		let t = z(e), n = xe(t), s = R(n);
		if (!a.current.isFocusWithin && s === t) {
			r && r(e), i && i(!0), a.current.isFocusWithin = !0, u(e);
			let t = e.currentTarget;
			o(n, "focus", (e) => {
				let r = z(e);
				if (a.current.isFocusWithin && !L(t, r)) {
					let e = new n.defaultView.FocusEvent("blur", { relatedTarget: r });
					Pe(e, t);
					let i = Ne(e);
					l(i);
				}
			}, { capture: !0 });
		}
	}, [
		r,
		i,
		u,
		o,
		l
	]);
	return t ? { focusWithinProps: {
		onFocus: void 0,
		onBlur: void 0
	} } : { focusWithinProps: {
		onFocus: d,
		onBlur: l
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/focus/useFocusRing.mjs
function gt(e = {}) {
	let { autoFocus: t = !1, isTextInput: n, within: r } = e, i = g({
		isFocused: !1,
		isFocusVisible: t || lt()
	}), [a, o] = _(!1), [s, l] = _(() => i.current.isFocused && i.current.isFocusVisible), u = c(() => l(i.current.isFocused && i.current.isFocusVisible), []), d = c((e) => {
		i.current.isFocused = e, i.current.isFocusVisible = lt(), o(e), u();
	}, [u]);
	ft((e) => {
		i.current.isFocusVisible = e, u();
	}, [n, a], {
		enabled: a,
		isTextInput: n
	});
	let { focusProps: f } = pt({
		isDisabled: r,
		onFocusChange: d
	}), { focusWithinProps: p } = ht({
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
var _t = !1, vt = 0;
function yt() {
	_t = !0, setTimeout(() => {
		_t = !1;
	}, 500);
}
function bt(e) {
	e.pointerType === "touch" && yt();
}
function xt() {
	let e = xe(null);
	if (e !== void 0) return vt === 0 && typeof PointerEvent < "u" && e.addEventListener("pointerup", bt), vt++, () => {
		vt--, !(vt > 0) && typeof PointerEvent < "u" && e.removeEventListener("pointerup", bt);
	};
}
function St(e) {
	let { onHoverStart: t, onHoverChange: n, onHoverEnd: r, isDisabled: i } = e, [a, o] = _(!1), s = g({
		isHovered: !1,
		ignoreEmulatedMouseEvents: !1,
		pointerType: "",
		target: null
	}).current;
	d(xt, []);
	let { addGlobalListener: c, removeAllGlobalListeners: l } = mt(), { hoverProps: u, triggerHoverEnd: f } = h(() => {
		let e = (e, r) => {
			if (s.pointerType = r, i || r === "touch" || s.isHovered || !L(e.currentTarget, z(e))) return;
			s.isHovered = !0;
			let l = e.currentTarget;
			s.target = l, c(xe(z(e)), "pointerover", (e) => {
				s.isHovered && s.target && !L(s.target, z(e)) && a(e, e.pointerType);
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
			_t && t.pointerType === "mouse" || e(t, t.pointerType);
		}, u.onPointerLeave = (e) => {
			!i && L(e.currentTarget, z(e)) && a(e, e.pointerType);
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
	return d(() => {
		i && f({ currentTarget: s.target }, s.pointerType);
	}, [i]), {
		hoverProps: u,
		isHovered: a
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/env.js
var Ct = Object.defineProperty, wt = (e, t, n) => t in e ? Ct(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Tt = (e, t, n) => (wt(e, typeof t == "symbol" ? t : t + "", n), n), Et = new class {
	constructor() {
		Tt(this, "current", this.detect()), Tt(this, "handoffState", "pending"), Tt(this, "currentId", 0);
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
function Dt(e) {
	return Et.isServer ? null : e == null ? document : e?.ownerDocument ?? document;
}
function Ot(e) {
	return Et.isServer ? null : e == null ? document : (e?.getRootNode)?.call(e) ?? document;
}
function kt(e) {
	return Ot(e)?.activeElement ?? null;
}
function At(e) {
	return kt(e) === e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/micro-task.js
function jt(e) {
	typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((e) => setTimeout(() => {
		throw e;
	}));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/disposables.js
function B() {
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
			return jt(() => {
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
			let t = B();
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
function Mt() {
	let [e] = _(B);
	return d(() => () => e.dispose(), [e]), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
var V = (e, t) => {
	Et.isServer ? d(e, t) : m(e, t);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-latest-value.js
function Nt(e) {
	let t = g(e);
	return V(() => {
		t.current = e;
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event.js
var H = function(e) {
	let n = Nt(e);
	return t.useCallback((...e) => n.current(...e), [n]);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-active-press.js
function Pt(e) {
	let t = e.width / 2, n = e.height / 2;
	return {
		top: e.clientY - n,
		right: e.clientX + t,
		bottom: e.clientY + n,
		left: e.clientX - t
	};
}
function Ft(e, t) {
	return !(!e || !t || e.right < t.left || e.left > t.right || e.bottom < t.top || e.top > t.bottom);
}
function It({ disabled: e = !1 } = {}) {
	let t = g(null), [n, r] = _(!1), i = Mt(), a = H(() => {
		t.current = null, r(!1), i.dispose();
	}), o = H((e) => {
		if (i.dispose(), t.current === null) {
			t.current = e.currentTarget, r(!0);
			{
				let n = Dt(e.currentTarget);
				i.addEventListener(n, "pointerup", a, !1), i.addEventListener(n, "pointermove", (e) => {
					if (t.current) {
						let n = Pt(e);
						r(Ft(n, t.current.getBoundingClientRect()));
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
function Lt(e) {
	return h(() => e, Object.values(e));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/disabled.js
var Rt = i(void 0);
function zt() {
	return l(Rt);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/class-names.js
function Bt(...e) {
	return Array.from(new Set(e.flatMap((e) => typeof e == "string" ? e.split(" ") : []))).filter(Boolean).join(" ");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/match.js
function Vt(e, t, ...n) {
	if (e in t) {
		let r = t[e];
		return typeof r == "function" ? r(...n) : r;
	}
	let r = /* @__PURE__ */ Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((e) => `"${e}"`).join(", ")}.`);
	throw Error.captureStackTrace && Error.captureStackTrace(r, Vt), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/render.js
var Ht = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(Ht || {}), Ut = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(Ut || {});
function U() {
	let e = Kt();
	return c((t) => Wt({
		mergeRefs: e,
		...t
	}), [e]);
}
function Wt({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: a = !0, name: o, mergeRefs: s }) {
	s ??= qt;
	let c = Jt(t, e);
	if (a) return Gt(c, n, r, o, s);
	let l = i ?? 0;
	if (l & 2) {
		let { static: e = !1, ...t } = c;
		if (e) return Gt(t, n, r, o, s);
	}
	if (l & 1) {
		let { unmount: e = !0, ...t } = c;
		return Vt(+!e, {
			0() {
				return null;
			},
			1() {
				return Gt({
					...t,
					hidden: !0,
					style: { display: "none" }
				}, n, r, o, s);
			}
		});
	}
	return Gt(c, n, r, o, s);
}
function Gt(e, t = {}, n, i, o) {
	let { as: c = n, children: l, refName: u = "ref", ...d } = Zt(e, ["unmount", "static"]), f = e.ref === void 0 ? {} : { [u]: e.ref }, p = typeof l == "function" ? l(t) : l;
	p = $t(p), "className" in d && d.className && typeof d.className == "function" && (d.className = d.className(t)), d["aria-labelledby"] && d["aria-labelledby"] === d.id && (d["aria-labelledby"] = void 0);
	let m = {};
	if (t) {
		let e = !1, n = [];
		for (let [r, i] of Object.entries(t)) typeof i == "boolean" && (e = !0), i === !0 && n.push(r.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`));
		if (e) {
			m["data-headlessui-state"] = n.join(" ");
			for (let e of n) m[`data-${e}`] = "";
		}
	}
	if (en(c) && (Object.keys(Xt(d)).length > 0 || Object.keys(Xt(m)).length > 0)) if (!s(p) || Array.isArray(p) && p.length > 1 || tn(p)) {
		if (Object.keys(Xt(d)).length > 0) throw Error([
			"Passing props on \"Fragment\"!",
			"",
			`The current component <${i} /> is rendering a "Fragment".`,
			"However we need to passthrough the following props:",
			Object.keys(Xt(d)).concat(Object.keys(Xt(m))).map((e) => `  - ${e}`).join("\n"),
			"",
			"You can apply a few solutions:",
			["Add an `as=\"...\"` prop, to ensure that we render an actual element instead of a \"Fragment\".", "Render a single element as the child so that we can forward the props onto that element."].map((e) => `  - ${e}`).join("\n")
		].join("\n"));
	} else {
		let e = p.props?.className, t = typeof e == "function" ? (...t) => Bt(e(...t), d.className) : Bt(e, d.className), n = t ? { className: t } : {}, i = Jt(p.props, Xt(Zt(d, ["ref"])));
		for (let e in m) e in i && delete m[e];
		return r(p, Object.assign({}, i, m, f, { ref: o(Qt(p), f.ref) }, n));
	}
	return a(c, Object.assign({}, Zt(d, ["ref"]), !en(c) && f, !en(c) && m), p);
}
function Kt() {
	let e = g([]), t = c((t) => {
		for (let n of e.current) n != null && (typeof n == "function" ? n(t) : n.current = t);
	}, []);
	return (...n) => {
		if (!n.every((e) => e == null)) return e.current = n, t;
	};
}
function qt(...e) {
	return e.every((e) => e == null) ? void 0 : (t) => {
		for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
	};
}
function Jt(...e) {
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
function Yt(...e) {
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
function W(e) {
	return Object.assign(o(e), { displayName: e.displayName ?? e.name });
}
function Xt(e) {
	let t = Object.assign({}, e);
	for (let e in t) t[e] === void 0 && delete t[e];
	return t;
}
function Zt(e, t = []) {
	let n = Object.assign({}, e);
	for (let e of t) e in n && delete n[e];
	return n;
}
function Qt(e) {
	return t.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function $t(e) {
	if (e != null && e.$$typeof === Symbol.for("react.lazy")) {
		let t = e._payload;
		if (t != null && t.status === "fulfilled") return $t(t.value);
	}
	return e;
}
function en(e) {
	return e === n || e === Symbol.for("react.fragment");
}
function tn(e) {
	return en(e.type);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/id.js
var nn = i(void 0);
function rn() {
	return l(nn);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/dom.js
function an(e) {
	return typeof e != "object" || !e ? !1 : "nodeType" in e;
}
function on(e) {
	return an(e) && "tagName" in e;
}
function sn(e) {
	return on(e) && "accessKey" in e;
}
function cn(e) {
	return on(e) && "tabIndex" in e;
}
function ln(e) {
	return on(e) && "style" in e;
}
function un(e) {
	return sn(e) && e.nodeName === "IFRAME";
}
function dn(e) {
	return sn(e) && e.nodeName === "INPUT";
}
function fn(e) {
	return sn(e) && e.nodeName === "LABEL";
}
function pn(e) {
	return sn(e) && e.nodeName === "FIELDSET";
}
function mn(e) {
	return sn(e) && e.nodeName === "LEGEND";
}
function hn(e) {
	return on(e) ? e.matches("a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type=\"hidden\"]),label,select,textarea,video[controls]") : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/bugs.js
function gn(e) {
	let t = e.parentElement, n = null;
	for (; t && !pn(t);) mn(t) && (n = t), t = t.parentElement;
	let r = t?.getAttribute("disabled") === "";
	return r && _n(n) ? !1 : r;
}
function _n(e) {
	if (!e) return !1;
	let t = e.previousElementSibling;
	for (; t !== null;) {
		if (mn(t)) return !1;
		t = t.previousElementSibling;
	}
	return !0;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
var vn = Symbol();
function yn(e, t = !0) {
	return Object.assign(e, { [vn]: t });
}
function bn(...e) {
	let t = g(e);
	d(() => {
		t.current = e;
	}, [e]);
	let n = H((e) => {
		for (let n of t.current) n != null && (typeof n == "function" ? n(e) : n.current = e);
	});
	return e.every((e) => e == null || e?.[vn]) ? void 0 : n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/description/description.js
var xn = i(null);
xn.displayName = "DescriptionContext";
function Sn() {
	let e = l(xn);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Description /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, Sn), e;
	}
	return e;
}
function Cn() {
	let [e, n] = _([]);
	return [e.length > 0 ? e.join(" ") : void 0, h(() => function(e) {
		let r = H((e) => (n((t) => [...t, e]), () => n((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), i = h(() => ({
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
		return t.createElement(xn.Provider, { value: i }, e.children);
	}, [n])];
}
var wn = "p";
function Tn(e, t) {
	let n = p(), r = zt(), { id: i = `headlessui-description-${n}`, ...a } = e, o = Sn(), s = bn(t);
	V(() => o.register(i), [i, o.register]);
	let c = Lt({
		...o.slot,
		disabled: r || !1
	}), l = {
		ref: s,
		...o.props,
		id: i
	};
	return U()({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: wn,
		name: o.name || "Description"
	});
}
var En = W(Tn);
Object.assign(En, {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/keyboard.js
var G = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(G || {}), Dn = i(null);
Dn.displayName = "LabelContext";
function On() {
	let e = l(Dn);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Label /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, On), e;
	}
	return e;
}
function kn(e) {
	let t = l(Dn)?.value ?? void 0;
	return (e?.length ?? 0) > 0 ? [t, ...e].filter(Boolean).join(" ") : t;
}
function An({ inherit: e = !1 } = {}) {
	let n = kn(), [r, i] = _([]), a = e ? [n, ...r].filter(Boolean) : r;
	return [a.length > 0 ? a.join(" ") : void 0, h(() => function(e) {
		let n = H((e) => (i((t) => [...t, e]), () => i((t) => {
			let n = t.slice(), r = n.indexOf(e);
			return r !== -1 && n.splice(r, 1), n;
		}))), r = h(() => ({
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
		return t.createElement(Dn.Provider, { value: r }, e.children);
	}, [i])];
}
var jn = "label";
function Mn(e, t) {
	let n = p(), r = On(), i = rn(), a = zt(), { id: o = `headlessui-label-${n}`, htmlFor: s = i ?? r.props?.htmlFor, passive: c = !1, ...l } = e, u = bn(t);
	V(() => r.register(o), [o, r.register]);
	let d = H((e) => {
		let t = e.currentTarget;
		if (!(e.target !== e.currentTarget && hn(e.target)) && (fn(t) && e.preventDefault(), r.props && "onClick" in r.props && typeof r.props.onClick == "function" && r.props.onClick(e), fn(t))) {
			let e = document.getElementById(t.htmlFor);
			if (e) {
				let t = e.getAttribute("disabled");
				if (t === "true" || t === "") return;
				let n = e.getAttribute("aria-disabled");
				if (n === "true" || n === "") return;
				(dn(e) && (e.type === "file" || e.type === "radio" || e.type === "checkbox") || e.role === "radio" || e.role === "checkbox" || e.role === "switch") && e.click(), e.focus({ preventScroll: !0 });
			}
		}
	}), f = Lt({
		...r.slot,
		disabled: a || !1
	}), m = {
		ref: u,
		...r.props,
		id: o,
		htmlFor: s,
		onClick: d
	};
	return c && ("onClick" in m && (delete m.htmlFor, delete m.onClick), "onClick" in l && delete l.onClick), U()({
		ourProps: m,
		theirProps: l,
		slot: f,
		defaultTag: s ? jn : "div",
		name: r.name || "Label"
	});
}
var Nn = W(Mn);
Object.assign(Nn, {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-element-size.js
function Pn(e) {
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
function Fn(e, t, n = !1) {
	let [r, i] = _(() => Pn(t));
	return V(() => {
		if (!t || !e) return;
		let n = B();
		return n.requestAnimationFrame(function e() {
			n.requestAnimationFrame(e), i((e) => {
				let n = Pn(t);
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
var In = ((e) => (e[e.Left = 0] = "Left", e[e.Right = 2] = "Right", e))(In || {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-handle-toggle.js
function Ln(e) {
	let t = g(null);
	return {
		onPointerDown: H((n) => {
			t.current = n.pointerType, !gn(n.currentTarget) && n.pointerType === "mouse" && n.button === In.Left && (n.preventDefault(), e(n));
		}),
		onClick: H((n) => {
			t.current !== "mouse" && (gn(n.currentTarget) || e(n));
		})
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/default-map.js
var Rn = class extends Map {
	constructor(e) {
		super(), this.factory = e;
	}
	get(e) {
		let t = super.get(e);
		return t === void 0 && (t = this.factory(e), this.set(e, t)), t;
	}
}, zn = Object.defineProperty, Bn = (e, t, n) => t in e ? zn(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Vn = (e, t, n) => (Bn(e, typeof t == "symbol" ? t : t + "", n), n), Hn = (e, t, n) => {
	if (!t.has(e)) throw TypeError("Cannot " + n);
}, K = (e, t, n) => (Hn(e, t, "read from private field"), n ? n.call(e) : t.get(e)), Un = (e, t, n) => {
	if (t.has(e)) throw TypeError("Cannot add the same private member more than once");
	t instanceof WeakSet ? t.add(e) : t.set(e, n);
}, Wn = (e, t, n, r) => (Hn(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), Gn, Kn, qn, Jn = class {
	constructor(e) {
		Un(this, Gn, {}), Un(this, Kn, new Rn(() => /* @__PURE__ */ new Set())), Un(this, qn, /* @__PURE__ */ new Set()), Vn(this, "disposables", B()), Wn(this, Gn, e), Et.isServer && this.disposables.microTask(() => {
			this.dispose();
		});
	}
	dispose() {
		this.disposables.dispose();
	}
	get state() {
		return K(this, Gn);
	}
	subscribe(e, t) {
		if (Et.isServer) return () => {};
		let n = {
			selector: e,
			callback: t,
			current: e(K(this, Gn))
		};
		return K(this, qn).add(n), this.disposables.add(() => {
			K(this, qn).delete(n);
		});
	}
	on(e, t) {
		return Et.isServer ? () => {} : (K(this, Kn).get(e).add(t), this.disposables.add(() => {
			K(this, Kn).get(e).delete(t);
		}));
	}
	send(e) {
		let t = this.reduce(K(this, Gn), e);
		if (t !== K(this, Gn)) {
			Wn(this, Gn, t);
			for (let e of K(this, qn)) {
				let t = e.selector(K(this, Gn));
				Yn(e.current, t) || (e.current = t, e.callback(t));
			}
			for (let t of K(this, Kn).get(e.type)) t(K(this, Gn), e);
		}
	}
};
Gn = /* @__PURE__ */ new WeakMap(), Kn = /* @__PURE__ */ new WeakMap(), qn = /* @__PURE__ */ new WeakMap();
function Yn(e, t) {
	return Object.is(e, t) ? !0 : typeof e != "object" || !e || typeof t != "object" || !t ? !1 : Array.isArray(e) && Array.isArray(t) ? e.length === t.length && Xn(e[Symbol.iterator](), t[Symbol.iterator]()) : e instanceof Map && t instanceof Map || e instanceof Set && t instanceof Set ? e.size === t.size && Xn(e.entries(), t.entries()) : Zn(e) && Zn(t) ? Xn(Object.entries(e)[Symbol.iterator](), Object.entries(t)[Symbol.iterator]()) : !1;
}
function Xn(e, t) {
	do {
		let n = e.next(), r = t.next();
		if (n.done && r.done) return !0;
		if (n.done || r.done || !Object.is(n.value, r.value)) return !1;
	} while (!0);
}
function Zn(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
function Qn(e) {
	let [t, n] = e(), r = B();
	return (...e) => {
		t(...e), r.dispose(), r.microTask(n);
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/machines/stack-machine.js
var $n = Object.defineProperty, er = (e, t, n) => t in e ? $n(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, tr = (e, t, n) => (er(e, typeof t == "symbol" ? t : t + "", n), n), nr = ((e) => (e[e.Push = 0] = "Push", e[e.Pop = 1] = "Pop", e))(nr || {}), rr = {
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
}, ir = class e extends Jn {
	constructor() {
		super(...arguments), tr(this, "actions", {
			push: (e) => this.send({
				type: 0,
				id: e
			}),
			pop: (e) => this.send({
				type: 1,
				id: e
			})
		}), tr(this, "selectors", {
			isTop: (e, t) => e.stack[e.stack.length - 1] === t,
			inStack: (e, t) => e.stack.includes(t)
		});
	}
	static new() {
		return new e({ stack: [] });
	}
	reduce(e, t) {
		return Vt(t.type, rr, e, t);
	}
}, ar = new Rn(() => ir.new()), or = typeof Object.is == "function" ? Object.is : (e, t) => e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
function sr(e, t, n, r, i) {
	let a = g(null), o;
	a.current === null ? (o = {
		hasValue: !1,
		value: null
	}, a.current = o) : o = a.current;
	let [s, c] = h(() => {
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
			if (or(n, t)) return c;
			let l = r(t);
			return i !== void 0 && i(c, l) ? (a = t, c) : (a = t, s = l, l);
		}, l = n ?? null;
		return [() => c(t()), l === null ? void 0 : () => c(l())];
	}, [
		t,
		n,
		r,
		i
	]), l = v(e, s, c);
	return d(() => {
		o.hasValue = !0, o.value = l;
	}, [l]), u(l), l;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/react-glue.js
function cr(e, t, n = Yn) {
	return sr(H((t) => e.subscribe(lr, t)), H(() => e.state), H(() => e.state), H(t), n);
}
function lr(e) {
	return e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
function ur(e, t) {
	let n = f(), r = ar.get(t), [i, a] = cr(r, c((e) => [r.selectors.isTop(e, n), r.selectors.inStack(e, n)], [r, n]));
	return V(() => {
		if (e) return r.actions.push(n), () => r.actions.pop(n);
	}, [
		r,
		e,
		n
	]), e ? !a || i : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-inert-others.js
var dr = /* @__PURE__ */ new Map(), fr = /* @__PURE__ */ new Map();
function pr(e) {
	let t = fr.get(e) ?? 0;
	return fr.set(e, t + 1), t === 0 ? (dr.set(e, {
		"aria-hidden": e.getAttribute("aria-hidden"),
		inert: e.inert
	}), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => mr(e)) : () => mr(e);
}
function mr(e) {
	let t = fr.get(e) ?? 1;
	if (t === 1 ? fr.delete(e) : fr.set(e, t - 1), t !== 1) return;
	let n = dr.get(e);
	n && (n["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", n["aria-hidden"]), e.inert = n.inert, dr.delete(e));
}
function hr(e, { allowed: t, disallowed: n } = {}) {
	let r = ur(e, "inert-others");
	V(() => {
		if (!r) return;
		let e = B();
		for (let t of n?.() ?? []) t && e.add(pr(t));
		let i = t?.() ?? [];
		for (let t of i) {
			if (!t) continue;
			let n = Dt(t);
			if (!n) continue;
			let r = t.parentElement;
			for (; r && r !== n.body;) {
				for (let t of r.children) i.some((e) => t.contains(e)) || e.add(pr(t));
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
function gr(e, t, n) {
	let r = Nt((e) => {
		let t = e.getBoundingClientRect();
		t.x === 0 && t.y === 0 && t.width === 0 && t.height === 0 && n();
	});
	d(() => {
		if (!e) return;
		let n = t === null ? null : sn(t) ? t : t.current;
		if (!n) return;
		let i = B();
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
var _r = [
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
].map((e) => `${e}:not([tabindex='-1'])`).join(","), vr = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(","), yr = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(yr || {}), br = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(br || {}), xr = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(xr || {});
function Sr(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(_r)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
function Cr(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(vr)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
var wr = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(wr || {});
function Tr(e, t = 0) {
	return e !== Dt(e)?.body && Vt(t, {
		0() {
			return e.matches(_r);
		},
		1() {
			let t = e;
			for (; t !== null;) {
				if (t.matches(_r)) return !0;
				t = t.parentElement;
			}
			return !1;
		}
	});
}
function Er(e) {
	B().nextFrame(() => {
		let t = kt(e);
		t && cn(t) && !Tr(t, 0) && Or(e);
	});
}
var Dr = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(Dr || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
	e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
function Or(e) {
	e?.focus({ preventScroll: !0 });
}
var kr = ["textarea", "input"].join(",");
function Ar(e) {
	return (e?.matches)?.call(e, kr) ?? !1;
}
function jr(e, t = (e) => e) {
	return e.slice().sort((e, n) => {
		let r = t(e), i = t(n);
		if (r === null || i === null) return 0;
		let a = r.compareDocumentPosition(i);
		return a & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : a & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
	});
}
function Mr(e, t, n = e === null ? document.body : Ot(e)) {
	return Nr(Sr(n), t, { relativeTo: e });
}
function Nr(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
	let a = Array.isArray(e) ? e.length > 0 ? Ot(e[0]) : document : Ot(e), o = Array.isArray(e) ? n ? jr(e) : e : t & 64 ? Cr(e) : Sr(e);
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
	} while (f !== kt(f));
	return t & 6 && Ar(f) && f.select(), 2;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/platform.js
function Pr() {
	return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function Fr() {
	return /Android/gi.test(window.navigator.userAgent);
}
function Ir() {
	return Pr() || Fr();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-document-event.js
function Lr(e, t, n, r) {
	let i = Nt(n);
	d(() => {
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
function Rr(e, t, n, r) {
	let i = Nt(n);
	d(() => {
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
var zr = 30;
function Br(e, t, n) {
	let r = Nt(n), i = c(function(e, n) {
		if (e.defaultPrevented) return;
		let i = n(e);
		if (i === null || !i.getRootNode().contains(i) || !i.isConnected) return;
		let a = function e(t) {
			return typeof t == "function" ? e(t()) : Array.isArray(t) || t instanceof Set ? t : [t];
		}(t);
		for (let t of a) if (t !== null && (t.contains(i) || e.composed && e.composedPath().includes(t))) return;
		return !Tr(i, wr.Loose) && i.tabIndex !== -1 && e.preventDefault(), r.current(e, i);
	}, [r, t]), a = g(null);
	Lr(e, "pointerdown", (e) => {
		Ir() || (a.current = e.composedPath?.call(e)?.[0] || e.target);
	}, !0), Lr(e, "pointerup", (e) => {
		if (Ir() || !a.current) return;
		let t = a.current;
		return a.current = null, i(e, () => t);
	}, !0);
	let o = g({
		x: 0,
		y: 0
	});
	Lr(e, "touchstart", (e) => {
		o.current.x = e.touches[0].clientX, o.current.y = e.touches[0].clientY;
	}, !0), Lr(e, "touchend", (e) => {
		let t = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if (!(Math.abs(t.x - o.current.x) >= zr || Math.abs(t.y - o.current.y) >= zr)) return i(e, () => cn(e.target) ? e.target : null);
	}, !0), Rr(e, "blur", (e) => i(e, () => un(window.document.activeElement) ? window.document.activeElement : null), !0);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-owner.js
function Vr(...e) {
	return h(() => Dt(...e), [...e]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-quick-release.js
var Hr = ((e) => (e[e.Ignore = 0] = "Ignore", e[e.Select = 1] = "Select", e[e.Close = 2] = "Close", e))(Hr || {}), Ur = {
	Ignore: { kind: 0 },
	Select: (e) => ({
		kind: 1,
		target: e
	}),
	Close: { kind: 2 }
}, Wr = 200, Gr = 5;
function Kr(e, { trigger: t, action: n, close: r, select: i }) {
	let a = g(null), o = g(null), s = g(null);
	Lr(e && t !== null, "pointerdown", (e) => {
		an(e?.target) && t != null && t.contains(e.target) && (o.current = e.x, s.current = e.y, a.current = e.timeStamp);
	}), Lr(e && t !== null, "pointerup", (e) => {
		let t = a.current;
		if (t === null || (a.current = null, !cn(e.target)) || Math.abs(e.x - (o.current ?? e.x)) < Gr && Math.abs(e.y - (s.current ?? e.y)) < Gr) return;
		let c = n(e);
		switch (c.kind) {
			case 0: return;
			case 1:
				e.timeStamp - t > Wr && (i(c.target), r());
				break;
			case 2:
				r();
				break;
		}
	}, { capture: !0 });
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-resolve-button-type.js
function qr(e, t) {
	return h(() => {
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
function Jr(e) {
	return v(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/store.js
function Yr(e, t) {
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
function Xr() {
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
function Zr() {
	return Pr() ? { before({ doc: e, d: t, meta: n }) {
		function r(e) {
			for (let t of n().containers) for (let n of t()) if (n.contains(e)) return !0;
			return !1;
		}
		t.microTask(() => {
			if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
				let n = B();
				n.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => n.dispose()));
			}
			let n = window.scrollY ?? window.pageYOffset, i = null;
			t.addEventListener(e, "click", (t) => {
				if (cn(t.target)) try {
					let n = t.target.closest("a");
					if (!n) return;
					let { hash: a } = new URL(n.href), o = e.querySelector(a);
					cn(o) && !r(o) && (i = o);
				} catch {}
			}, !0), t.group((n) => {
				t.addEventListener(e, "touchstart", (e) => {
					if (n.dispose(), cn(e.target) && ln(e.target)) if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && r(t.parentElement);) t = t.parentElement;
						n.style(t, "overscrollBehavior", "contain");
					} else n.style(e.target, "touchAction", "none");
				});
			}), t.addEventListener(e, "touchmove", (e) => {
				if (cn(e.target)) {
					if (dn(e.target)) return;
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
function Qr() {
	return { before({ doc: e, d: t }) {
		t.style(e.documentElement, "overflow", "hidden");
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
function $r(e) {
	let t = {};
	for (let n of e) Object.assign(t, n(t));
	return t;
}
var ei = Yr(() => /* @__PURE__ */ new Map(), {
	PUSH(e, t) {
		let n = this.get(e) ?? {
			doc: e,
			count: 0,
			d: B(),
			meta: /* @__PURE__ */ new Set(),
			computedMeta: {}
		};
		return n.count++, n.meta.add(t), n.computedMeta = $r(n.meta), this.set(e, n), this;
	},
	POP(e, t) {
		let n = this.get(e);
		return n && (n.count--, n.meta.delete(t), n.computedMeta = $r(n.meta)), this;
	},
	SCROLL_PREVENT(e) {
		let t = {
			doc: e.doc,
			d: e.d,
			meta() {
				return e.computedMeta;
			}
		}, n = [
			Zr(),
			Xr(),
			Qr()
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
ei.subscribe(() => {
	let e = ei.getSnapshot(), t = /* @__PURE__ */ new Map();
	for (let [n] of e) t.set(n, n.documentElement.style.overflow);
	for (let n of e.values()) {
		let e = t.get(n.doc) === "hidden", r = n.count !== 0;
		(r && !e || !r && e) && ei.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && ei.dispatch("TEARDOWN", n);
	}
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
function ti(e, t, n = () => ({ containers: [] })) {
	let r = Jr(ei), i = t ? r.get(t) : void 0, a = i ? i.count > 0 : !1;
	return V(() => {
		if (!(!t || !e)) return ei.dispatch("PUSH", t, n), () => ei.dispatch("POP", t, n);
	}, [e, t]), a;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
function ni(e, t, n = () => [document.body]) {
	ti(ur(e, "scroll-lock"), t, (e) => ({ containers: [...e.containers ?? [], n] }));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tracked-pointer.js
function ri(e) {
	return [e.screenX, e.screenY];
}
function ii() {
	let e = g([-1, -1]);
	return {
		wasMoved(t) {
			let n = ri(t);
			return e.current[0] === n[0] && e.current[1] === n[1] ? !1 : (e.current = n, !0);
		},
		update(t) {
			e.current = ri(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-flags.js
function ai(e = 0) {
	let [t, n] = _(e);
	return {
		flags: t,
		setFlag: c((e) => n(e), []),
		addFlag: c((e) => n((t) => t | e), []),
		hasFlag: c((e) => (t & e) === e, [t]),
		removeFlag: c((e) => n((t) => t & ~e), []),
		toggleFlag: c((e) => n((t) => t ^ e), [])
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
var oi = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(oi || {});
function si(e) {
	let t = {};
	for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
	return t;
}
function ci(e, t, n, r) {
	let [i, a] = _(n), { hasFlag: o, addFlag: s, removeFlag: c } = ai(e && i ? 3 : 0), l = g(!1), u = g(!1);
	return V(() => {
		var i;
		if (e) {
			if (n && a(!0), !t) {
				n && s(3);
				return;
			}
			return (i = r?.start) == null || i.call(r, n), li(t, {
				inFlight: l,
				prepare() {
					u.current ? u.current = !1 : u.current = l.current, l.current = !0, !u.current && (n ? (s(3), c(4)) : (s(4), c(2)));
				},
				run() {
					u.current ? n ? (c(3), s(4)) : (c(4), s(3)) : n ? c(1) : s(1);
				},
				done() {
					var e;
					u.current && fi(t) || (l.current = !1, c(7), n || a(!1), (e = r?.end) == null || e.call(r, n));
				}
			});
		}
	}, [
		e,
		n,
		t,
		Mt()
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
function li(e, { prepare: t, run: n, done: r, inFlight: i }) {
	let a = B();
	return di(e, {
		prepare: t,
		inFlight: i
	}), a.nextFrame(() => {
		n(), a.requestAnimationFrame(() => {
			a.add(ui(e, r));
		});
	}), a.dispose;
}
function ui(e, t) {
	let n = B();
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
function di(e, { inFlight: t, prepare: n }) {
	if (t != null && t.current) {
		n();
		return;
	}
	let r = e.style.transition;
	e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function fi(e) {
	return (e.getAnimations?.call(e) ?? []).some((e) => e instanceof CSSTransition && e.playState !== "finished");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tree-walker.js
function pi(e, { container: t, accept: n, walk: r }) {
	let i = g(n), a = g(r);
	d(() => {
		i.current = n, a.current = r;
	}, [n, r]), V(() => {
		if (!t || !e) return;
		let n = Dt(t);
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
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function mi() {
	return typeof window < "u";
}
function hi(e) {
	return _i(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function q(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function gi(e) {
	return ((_i(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function _i(e) {
	return mi() ? e instanceof Node || e instanceof q(e).Node : !1;
}
function J(e) {
	return mi() ? e instanceof Element || e instanceof q(e).Element : !1;
}
function vi(e) {
	return mi() ? e instanceof HTMLElement || e instanceof q(e).HTMLElement : !1;
}
function yi(e) {
	return !mi() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof q(e).ShadowRoot;
}
function bi(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = ji(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function xi(e) {
	return /^(table|td|th)$/.test(hi(e));
}
function Si(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var Ci = /transform|translate|scale|rotate|perspective|filter/, wi = /paint|layout|strict|content/, Ti = (e) => !!e && e !== "none", Ei;
function Di(e) {
	let t = J(e) ? ji(e) : e;
	return Ti(t.transform) || Ti(t.translate) || Ti(t.scale) || Ti(t.rotate) || Ti(t.perspective) || !ki() && (Ti(t.backdropFilter) || Ti(t.filter)) || Ci.test(t.willChange || "") || wi.test(t.contain || "");
}
function Oi(e) {
	let t = Ni(e);
	for (; vi(t) && !Ai(t);) {
		if (Di(t)) return t;
		if (Si(t)) return null;
		t = Ni(t);
	}
	return null;
}
function ki() {
	return Ei ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), Ei;
}
function Ai(e) {
	return /^(html|body|#document)$/.test(hi(e));
}
function ji(e) {
	return q(e).getComputedStyle(e);
}
function Mi(e) {
	return J(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function Ni(e) {
	if (hi(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || yi(e) && e.host || gi(e);
	return yi(t) ? t.host : t;
}
function Pi(e) {
	let t = Ni(e);
	return Ai(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : vi(t) && bi(t) ? t : Pi(t);
}
function Fi(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = Pi(e), i = r === e.ownerDocument?.body, a = q(r);
	if (i) {
		let e = Ii(a);
		return t.concat(a, a.visualViewport || [], bi(r) ? r : [], e && n ? Fi(e) : []);
	} else return t.concat(r, Fi(r, [], n));
}
function Ii(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+react@0.26.28_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@floating-ui/react/dist/floating-ui.react.utils.mjs
function Li() {
	let e = navigator.userAgentData;
	return e && Array.isArray(e.brands) ? e.brands.map((e) => {
		let { brand: t, version: n } = e;
		return t + "/" + n;
	}).join(" ") : navigator.userAgent;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var Ri = Math.min, Y = Math.max, zi = Math.round, Bi = Math.floor, Vi = (e) => ({
	x: e,
	y: e
}), Hi = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function Ui(e, t, n) {
	return Y(e, Ri(t, n));
}
function Wi(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function Gi(e) {
	return e.split("-")[0];
}
function Ki(e) {
	return e.split("-")[1];
}
function qi(e) {
	return e === "x" ? "y" : "x";
}
function Ji(e) {
	return e === "y" ? "height" : "width";
}
function Yi(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function Xi(e) {
	return qi(Yi(e));
}
function Zi(e, t, n) {
	n === void 0 && (n = !1);
	let r = Ki(e), i = Xi(e), a = Ji(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = oa(o)), [o, oa(o)];
}
function Qi(e) {
	let t = oa(e);
	return [
		$i(e),
		t,
		$i(t)
	];
}
function $i(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var ea = ["left", "right"], ta = ["right", "left"], na = ["top", "bottom"], ra = ["bottom", "top"];
function ia(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? ta : ea : t ? ea : ta;
		case "left":
		case "right": return t ? na : ra;
		default: return [];
	}
}
function aa(e, t, n, r) {
	let i = Ki(e), a = ia(Gi(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map($i)))), a;
}
function oa(e) {
	let t = Gi(e);
	return Hi[t] + e.slice(t.length);
}
function sa(e) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...e
	};
}
function ca(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : sa(e);
}
function la(e) {
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
function ua(e, t, n) {
	let { reference: r, floating: i } = e, a = Yi(t), o = Xi(t), s = Ji(o), c = Gi(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
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
	switch (Ki(t)) {
		case "start":
			p[o] -= f * (n && l ? -1 : 1);
			break;
		case "end":
			p[o] += f * (n && l ? -1 : 1);
			break;
	}
	return p;
}
async function da(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = Wi(t, e), p = ca(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = la(await i.getClippingRect({
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
	}, y = la(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
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
var fa = 50, pa = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: da
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = ua(l, r, c), f = r, p = 0, m = {};
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
		}, x && p < fa && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = ua(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, ma = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = Wi(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = Gi(r), _ = Yi(o), v = Gi(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [oa(o)] : Qi(o)), x = p !== "none";
			!d && x && b.push(...aa(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = Zi(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (!(u === "alignment" && _ !== Yi(t)) || T.every((e) => Yi(e.placement) !== _ || e.overflows[0] > 0))) return {
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
								let t = Yi(e.placement);
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
}, ha = /*#__PURE__*/ new Set(["left", "top"]);
async function ga(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = Gi(n), s = Ki(n), c = Yi(n) === "y", l = ha.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = Wi(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
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
var _a = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await ga(t, e);
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
}, va = function(e) {
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
			} }, ...l } = Wi(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Yi(Gi(i)), p = qi(f), m = u[p], h = u[f];
			if (o) {
				let e = p === "y" ? "top" : "left", t = p === "y" ? "bottom" : "right", n = m + d[e], r = m - d[t];
				m = Ui(n, m, r);
			}
			if (s) {
				let e = f === "y" ? "top" : "left", t = f === "y" ? "bottom" : "right", n = h + d[e], r = h - d[t];
				h = Ui(n, h, r);
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
}, ya = function(e) {
	return e === void 0 && (e = {}), {
		name: "size",
		options: e,
		async fn(t) {
			var n, r;
			let { placement: i, rects: a, platform: o, elements: s } = t, { apply: c = () => {}, ...l } = Wi(e, t), u = await o.detectOverflow(t, l), d = Gi(i), f = Ki(i), p = Yi(i) === "y", { width: m, height: h } = a.floating, g, _;
			d === "top" || d === "bottom" ? (g = d, _ = f === (await (o.isRTL == null ? void 0 : o.isRTL(s.floating)) ? "start" : "end") ? "left" : "right") : (_ = d, g = f === "end" ? "top" : "bottom");
			let v = h - u.top - u.bottom, y = m - u.left - u.right, b = Ri(h - u[g], v), x = Ri(m - u[_], y), S = !t.middlewareData.shift, C = b, w = x;
			if ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y), (r = t.middlewareData.shift) != null && r.enabled.y && (C = v), S && !f) {
				let e = Y(u.left, 0), t = Y(u.right, 0), n = Y(u.top, 0), r = Y(u.bottom, 0);
				p ? w = m - 2 * (e !== 0 || t !== 0 ? e + t : Y(u.left, u.right)) : C = h - 2 * (n !== 0 || r !== 0 ? n + r : Y(u.top, u.bottom));
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
function ba(e) {
	let t = ji(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = vi(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = zi(n) !== a || zi(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function xa(e) {
	return J(e) ? e : e.contextElement;
}
function Sa(e) {
	let t = xa(e);
	if (!vi(t)) return Vi(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = ba(t), o = (a ? zi(n.width) : n.width) / r, s = (a ? zi(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var Ca = /*#__PURE__*/ Vi(0);
function wa(e) {
	let t = q(e);
	return !ki() || !t.visualViewport ? Ca : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function Ta(e, t, n) {
	return t === void 0 && (t = !1), !n || t && n !== q(e) ? !1 : t;
}
function Ea(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = xa(e), o = Vi(1);
	t && (r ? J(r) && (o = Sa(r)) : o = Sa(e));
	let s = Ta(a, n, r) ? wa(a) : Vi(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a) {
		let e = q(a), t = r && J(r) ? q(r) : r, n = e, i = Ii(n);
		for (; i && r && t !== n;) {
			let e = Sa(i), t = i.getBoundingClientRect(), r = ji(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = q(i), i = Ii(n);
		}
	}
	return la({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function Da(e, t) {
	let n = Mi(e).scrollLeft;
	return t ? t.left + n : Ea(gi(e)).left + n;
}
function Oa(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - Da(e, n),
		y: n.top + t.scrollTop
	};
}
function ka(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = gi(r), s = t ? Si(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = Vi(1), u = Vi(0), d = vi(r);
	if ((d || !d && !a) && ((hi(r) !== "body" || bi(o)) && (c = Mi(r)), d)) {
		let e = Ea(r);
		l = Sa(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? Oa(o, c) : Vi(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function Aa(e) {
	return Array.from(e.getClientRects());
}
function ja(e) {
	let t = gi(e), n = Mi(e), r = e.ownerDocument.body, i = Y(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = Y(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight), o = -n.scrollLeft + Da(e), s = -n.scrollTop;
	return ji(r).direction === "rtl" && (o += Y(t.clientWidth, r.clientWidth) - i), {
		width: i,
		height: a,
		x: o,
		y: s
	};
}
var Ma = 25;
function Na(e, t) {
	let n = q(e), r = gi(e), i = n.visualViewport, a = r.clientWidth, o = r.clientHeight, s = 0, c = 0;
	if (i) {
		a = i.width, o = i.height;
		let e = ki();
		(!e || e && t === "fixed") && (s = i.offsetLeft, c = i.offsetTop);
	}
	let l = Da(r);
	if (l <= 0) {
		let e = r.ownerDocument, t = e.body, n = getComputedStyle(t), i = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, o = Math.abs(r.clientWidth - t.clientWidth - i);
		o <= Ma && (a -= o);
	} else l <= Ma && (a += l);
	return {
		width: a,
		height: o,
		x: s,
		y: c
	};
}
function Pa(e, t) {
	let n = Ea(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = vi(e) ? Sa(e) : Vi(1);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function Fa(e, t, n) {
	let r;
	if (t === "viewport") r = Na(e, n);
	else if (t === "document") r = ja(gi(e));
	else if (J(t)) r = Pa(t, n);
	else {
		let n = wa(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return la(r);
}
function Ia(e, t) {
	let n = Ni(e);
	return n === t || !J(n) || Ai(n) ? !1 : ji(n).position === "fixed" || Ia(n, t);
}
function La(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = Fi(e, [], !1).filter((e) => J(e) && hi(e) !== "body"), i = null, a = ji(e).position === "fixed", o = a ? Ni(e) : e;
	for (; J(o) && !Ai(o);) {
		let t = ji(o), n = Di(o);
		!n && t.position === "fixed" && (i = null), (a ? !n && !i : !n && t.position === "static" && i && (i.position === "absolute" || i.position === "fixed") || bi(o) && !n && Ia(e, o)) ? r = r.filter((e) => e !== o) : i = t, o = Ni(o);
	}
	return t.set(e, r), r;
}
function Ra(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? Si(t) ? [] : La(t, this._c) : [].concat(n), r], o = Fa(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = Fa(t, a[e], i);
		s = Y(n.top, s), c = Ri(n.right, c), l = Ri(n.bottom, l), u = Y(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function za(e) {
	let { width: t, height: n } = ba(e);
	return {
		width: t,
		height: n
	};
}
function Ba(e, t, n) {
	let r = vi(t), i = gi(t), a = n === "fixed", o = Ea(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = Vi(0);
	function l() {
		c.x = Da(i);
	}
	if (r || !r && !a) if ((hi(t) !== "body" || bi(i)) && (s = Mi(t)), r) {
		let e = Ea(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	} else i && l();
	a && !r && i && l();
	let u = i && !r && !a ? Oa(i, s) : Vi(0);
	return {
		x: o.left + s.scrollLeft - c.x - u.x,
		y: o.top + s.scrollTop - c.y - u.y,
		width: o.width,
		height: o.height
	};
}
function Va(e) {
	return ji(e).position === "static";
}
function Ha(e, t) {
	if (!vi(e) || ji(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return gi(e) === n && (n = n.ownerDocument.body), n;
}
function Ua(e, t) {
	let n = q(e);
	if (Si(e)) return n;
	if (!vi(e)) {
		let t = Ni(e);
		for (; t && !Ai(t);) {
			if (J(t) && !Va(t)) return t;
			t = Ni(t);
		}
		return n;
	}
	let r = Ha(e, t);
	for (; r && xi(r) && Va(r);) r = Ha(r, t);
	return r && Ai(r) && Va(r) && !Di(r) ? n : r || Oi(e) || n;
}
var Wa = async function(e) {
	let t = this.getOffsetParent || Ua, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: Ba(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function Ga(e) {
	return ji(e).direction === "rtl";
}
var Ka = {
	convertOffsetParentRelativeRectToViewportRelativeRect: ka,
	getDocumentElement: gi,
	getClippingRect: Ra,
	getOffsetParent: Ua,
	getElementRects: Wa,
	getClientRects: Aa,
	getDimensions: za,
	getScale: Sa,
	isElement: J,
	isRTL: Ga
};
function qa(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Ja(e, t) {
	let n = null, r, i = gi(e);
	function a() {
		var e;
		clearTimeout(r), (e = n) == null || e.disconnect(), n = null;
	}
	function o(s, c) {
		s === void 0 && (s = !1), c === void 0 && (c = 1), a();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (s || t(), !f || !p) return;
		let m = Bi(d), h = Bi(i.clientWidth - (u + f)), g = Bi(i.clientHeight - (d + p)), _ = Bi(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: Y(0, Ri(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (n !== c) {
				if (!y) return o();
				n ? o(!1, n) : r = setTimeout(() => {
					o(!1, 1e-7);
				}, 1e3);
			}
			n === 1 && !qa(l, e.getBoundingClientRect()) && o(), y = !1;
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
function Ya(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = xa(e), u = i || a ? [...l ? Fi(l) : [], ...t ? Fi(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n, { passive: !0 }), a && e.addEventListener("resize", n);
	});
	let d = l && s ? Ja(l, n) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? Ea(e) : null;
	c && g();
	function g() {
		let t = Ea(e);
		h && !qa(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var Xa = da, Za = _a, Qa = va, $a = ma, eo = ya, to = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = {
		platform: Ka,
		...n
	}, a = {
		...i.platform,
		_c: r
	};
	return pa(e, t, {
		...i,
		platform: a
	});
}, no = typeof document < "u" ? m : function() {};
function ro(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (typeof e == "function" && e.toString() === t.toString()) return !0;
	let n, r, i;
	if (e && t && typeof e == "object") {
		if (Array.isArray(e)) {
			if (n = e.length, n !== t.length) return !1;
			for (r = n; r-- !== 0;) if (!ro(e[r], t[r])) return !1;
			return !0;
		}
		if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
		for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
		for (r = n; r-- !== 0;) {
			let n = i[r];
			if (!(n === "_owner" && e.$$typeof) && !ro(e[n], t[n])) return !1;
		}
		return !0;
	}
	return e !== e && t !== t;
}
function io(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function ao(e, t) {
	let n = io(e);
	return Math.round(t * n) / n;
}
function oo(t) {
	let n = e.useRef(t);
	return no(() => {
		n.current = t;
	}), n;
}
function so(t) {
	t === void 0 && (t = {});
	let { placement: n = "bottom", strategy: r = "absolute", middleware: i = [], platform: a, elements: { reference: o, floating: s } = {}, transform: c = !0, whileElementsMounted: l, open: u } = t, [d, f] = e.useState({
		x: 0,
		y: 0,
		strategy: r,
		placement: n,
		middlewareData: {},
		isPositioned: !1
	}), [p, m] = e.useState(i);
	ro(p, i) || m(i);
	let [h, g] = e.useState(null), [_, v] = e.useState(null), y = e.useCallback((e) => {
		e !== w.current && (w.current = e, g(e));
	}, []), b = e.useCallback((e) => {
		e !== T.current && (T.current = e, v(e));
	}, []), x = o || h, C = s || _, w = e.useRef(null), T = e.useRef(null), E = e.useRef(d), D = l != null, O = oo(l), k = oo(a), ee = oo(u), A = e.useCallback(() => {
		if (!w.current || !T.current) return;
		let e = {
			placement: n,
			strategy: r,
			middleware: p
		};
		k.current && (e.platform = k.current), to(w.current, T.current, e).then((e) => {
			let t = {
				...e,
				isPositioned: ee.current !== !1
			};
			te.current && !ro(E.current, t) && (E.current = t, S.flushSync(() => {
				f(t);
			}));
		});
	}, [
		p,
		n,
		r,
		k,
		ee
	]);
	no(() => {
		u === !1 && E.current.isPositioned && (E.current.isPositioned = !1, f((e) => ({
			...e,
			isPositioned: !1
		})));
	}, [u]);
	let te = e.useRef(!1);
	no(() => (te.current = !0, () => {
		te.current = !1;
	}), []), no(() => {
		if (x && (w.current = x), C && (T.current = C), x && C) {
			if (O.current) return O.current(x, C, A);
			A();
		}
	}, [
		x,
		C,
		A,
		O,
		D
	]);
	let ne = e.useMemo(() => ({
		reference: w,
		floating: T,
		setReference: y,
		setFloating: b
	}), [y, b]), j = e.useMemo(() => ({
		reference: x,
		floating: C
	}), [x, C]), re = e.useMemo(() => {
		let e = {
			position: r,
			left: 0,
			top: 0
		};
		if (!j.floating) return e;
		let t = ao(j.floating, d.x), n = ao(j.floating, d.y);
		return c ? {
			...e,
			transform: "translate(" + t + "px, " + n + "px)",
			...io(j.floating) >= 1.5 && { willChange: "transform" }
		} : {
			position: r,
			left: t,
			top: n
		};
	}, [
		r,
		c,
		j.floating,
		d.x,
		d.y
	]);
	return e.useMemo(() => ({
		...d,
		update: A,
		refs: ne,
		elements: j,
		floatingStyles: re
	}), [
		d,
		A,
		ne,
		j,
		re
	]);
}
var co = (e, t) => {
	let n = Za(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, lo = (e, t) => {
	let n = Qa(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, uo = (e, t) => {
	let n = $a(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, fo = (e, t) => {
	let n = eo(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, po = { ...e }, mo = po.useInsertionEffect || ((e) => e());
function ho(t) {
	let n = e.useRef(() => {});
	return mo(() => {
		n.current = t;
	}), e.useCallback(function() {
		var e = [...arguments];
		return n.current == null ? void 0 : n.current(...e);
	}, []);
}
var go = "ArrowUp", _o = "ArrowDown", vo = "ArrowLeft", yo = "ArrowRight", bo = typeof document < "u" ? m : d, xo = [vo, yo], So = [go, _o];
[...xo, ...So];
var Co = !1, wo = 0, To = () => "floating-ui-" + Math.random().toString(36).slice(2, 6) + wo++;
function Eo() {
	let [t, n] = e.useState(() => Co ? To() : void 0);
	return bo(() => {
		t ?? n(To());
	}, []), e.useEffect(() => {
		Co = !0;
	}, []), t;
}
var Do = po.useId || Eo;
function Oo() {
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
var ko = /*#__PURE__*/ e.createContext(null), Ao = /*#__PURE__*/ e.createContext(null), jo = () => e.useContext(ko)?.id || null, Mo = () => e.useContext(Ao), No = "data-floating-ui-focusable";
function Po(t) {
	let { open: n = !1, onOpenChange: r, elements: i } = t, a = Do(), o = e.useRef({}), [s] = e.useState(() => Oo()), c = jo() != null, [l, u] = e.useState(i.reference), d = ho((e, t, n) => {
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
function Fo(t) {
	t === void 0 && (t = {});
	let { nodeId: n } = t, r = Po({
		...t,
		elements: {
			reference: null,
			floating: null,
			...t.elements
		}
	}), i = t.rootContext || r, a = i.elements, [o, s] = e.useState(null), [c, l] = e.useState(null), u = a?.domReference || o, d = e.useRef(null), f = Mo();
	bo(() => {
		u && (d.current = u);
	}, [u]);
	let p = so({
		...t,
		elements: {
			...a,
			...c && { reference: c }
		}
	}), m = e.useCallback((e) => {
		let t = J(e) ? {
			getBoundingClientRect: () => e.getBoundingClientRect(),
			contextElement: e
		} : e;
		l(t), p.refs.setReference(t);
	}, [p.refs]), h = e.useCallback((e) => {
		(J(e) || e === null) && (d.current = e, s(e)), (J(p.refs.reference.current) || p.refs.reference.current === null || e !== null && !J(e)) && p.refs.setReference(e);
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
	return bo(() => {
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
var Io = "active", Lo = "selected";
function Ro(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = n === "item", a = e;
	if (i && e) {
		let { [Io]: t, [Lo]: n, ...r } = e;
		a = r;
	}
	return {
		...n === "floating" && {
			tabIndex: -1,
			[No]: ""
		},
		...a,
		...t.map((t) => {
			let r = t ? t[n] : null;
			return typeof r == "function" ? e ? r(e) : null : r;
		}).concat(e).reduce((e, t) => (t && Object.entries(t).forEach((t) => {
			let [n, a] = t;
			if (!(i && [Io, Lo].includes(n))) if (n.indexOf("on") === 0) {
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
function zo(t) {
	t === void 0 && (t = []);
	let n = t.map((e) => e?.reference), r = t.map((e) => e?.floating), i = t.map((e) => e?.item), a = e.useCallback((e) => Ro(e, t, "reference"), n), o = e.useCallback((e) => Ro(e, t, "floating"), r), s = e.useCallback((e) => Ro(e, t, "item"), i);
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
function Bo(e, t) {
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
var Vo = (e) => ({
	name: "inner",
	options: e,
	async fn(t) {
		let { listRef: n, overflowRef: r, onFallbackChange: i, offset: a = 0, index: o = 0, minItemsVisible: s = 4, referenceOverflowThreshold: c = 0, scrollRef: l, ...u } = Wi(e, t), { rects: d, elements: { floating: f } } = t, p = n.current[o], m = l?.current || f, h = f.clientTop || m.clientTop, g = f.clientTop !== 0, _ = m.clientTop !== 0, v = f === m;
		if (!p) return {};
		let y = {
			...t,
			...await co(-p.offsetTop - f.clientTop - d.reference.height / 2 - p.offsetHeight / 2 - a).fn(t)
		}, b = await Xa(Bo(y, m.scrollHeight + h + f.clientTop), u), x = await Xa(y, {
			...u,
			elementContext: "reference"
		}), C = Y(0, b.top), w = y.y + C, T = (m.scrollHeight > m.clientHeight ? (e) => e : zi)(Y(0, m.scrollHeight + (g && v || _ ? h * 2 : 0) - C - Y(0, b.bottom)));
		if (m.style.maxHeight = T + "px", m.scrollTop = C, i) {
			let e = m.offsetHeight < p.offsetHeight * Ri(s, n.current.length) - 1 || x.top >= -c || x.bottom >= -c;
			S.flushSync(() => i(e));
		}
		return r && (r.current = await Xa(Bo({
			...y,
			y: w
		}, m.offsetHeight + h + f.clientTop), u)), { y: w };
	}
});
function Ho(t, n) {
	let { open: r, elements: i } = t, { enabled: a = !0, overflowRef: o, scrollRef: s, onChange: c } = n, l = ho(c), u = e.useRef(!1), d = e.useRef(null), f = e.useRef(null);
	e.useEffect(() => {
		if (!a) return;
		function e(e) {
			if (e.ctrlKey || !t || o.current == null) return;
			let n = e.deltaY, r = o.current.top >= -.5, i = o.current.bottom >= -.5, a = t.scrollHeight - t.clientHeight, s = n < 0 ? -1 : 1, c = n < 0 ? "max" : "min";
			t.scrollHeight <= t.clientHeight || (!r && n > 0 || !i && n < 0 ? (e.preventDefault(), S.flushSync(() => {
				l((e) => e + Math[c](n, a * s));
			})) : /firefox/i.test(Li()) && (t.scrollTop += n));
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
					(o.current.bottom < -.5 && t < -1 || o.current.top < -.5 && t > 1) && S.flushSync(() => l((e) => e + t));
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
var Uo = i({
	styles: void 0,
	setReference: () => {},
	setFloating: () => {},
	getReferenceProps: () => ({}),
	getFloatingProps: () => ({}),
	slot: {}
});
Uo.displayName = "FloatingContext";
var Wo = i(null);
Wo.displayName = "PlacementContext";
function Go(e) {
	return h(() => e ? typeof e == "string" ? { to: e } : e : null, [e]);
}
function Ko() {
	return l(Uo).setReference;
}
function qo() {
	return l(Uo).getReferenceProps;
}
function Jo() {
	let { getFloatingProps: e, slot: t } = l(Uo);
	return c((...n) => Object.assign({}, e(...n), { "data-anchor": t.anchor }), [e, t]);
}
function Yo(e = null) {
	e === !1 && (e = null), typeof e == "string" && (e = { to: e });
	let t = l(Wo), n = h(() => e, [JSON.stringify(e, (e, t) => t?.outerHTML ?? t)]);
	V(() => {
		t?.(n ?? null);
	}, [t, n]);
	let r = l(Uo);
	return h(() => [r.setFloating, e ? r.styles : {}], [
		r.setFloating,
		e,
		r.styles
	]);
}
var Xo = 4;
function Zo({ children: t, enabled: n = !0 }) {
	let [r, i] = _(null), [a, o] = _(0), s = g(null), [c, l] = _(null);
	Qo(c);
	let u = n && r !== null && c !== null, { to: d = "bottom", gap: f = 0, offset: p = 0, padding: m = 0, inner: v } = $o(r, c), [y, b = "center"] = d.split(" ");
	V(() => {
		u && o(0);
	}, [u]);
	let { refs: x, floatingStyles: S, context: C } = Fo({
		open: u,
		placement: y === "selection" ? b === "center" ? "bottom" : `bottom-${b}` : b === "center" ? `${y}` : `${y}-${b}`,
		strategy: "absolute",
		transform: !1,
		middleware: [
			co({
				mainAxis: y === "selection" ? 0 : f,
				crossAxis: p
			}),
			lo({ padding: m }),
			y !== "selection" && uo({ padding: m }),
			y === "selection" && v ? Vo({
				...v,
				padding: m,
				overflowRef: s,
				offset: a,
				minItemsVisible: Xo,
				referenceOverflowThreshold: m,
				onFallbackChange(e) {
					if (!e) return;
					let t = C.elements.floating;
					if (!t) return;
					let n = parseFloat(getComputedStyle(t).scrollPaddingBottom) || 0, r = Math.min(Xo, t.childElementCount), i = 0, a = 0;
					for (let e of C.elements.floating?.childNodes ?? []) if (sn(e)) {
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
			fo({
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
		whileElementsMounted: Ya
	}), [w = y, T = b] = C.placement.split("-");
	y === "selection" && (w = "selection");
	let E = h(() => ({ anchor: [w, T].filter(Boolean).join(" ") }), [w, T]), { getReferenceProps: D, getFloatingProps: O } = zo([Ho(C, {
		overflowRef: s,
		onChange: o
	})]), k = H((e) => {
		l(e), x.setFloating(e);
	});
	return e.createElement(Wo.Provider, { value: i }, e.createElement(Uo.Provider, { value: {
		setFloating: k,
		setReference: x.setReference,
		styles: S,
		getReferenceProps: D,
		getFloatingProps: O,
		slot: E
	} }, t));
}
function Qo(e) {
	V(() => {
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
function $o(e, t) {
	let n = es(e?.gap ?? "var(--anchor-gap, 0)", t), r = es(e?.offset ?? "var(--anchor-offset, 0)", t), i = es(e?.padding ?? "var(--anchor-padding, 0)", t);
	return {
		...e,
		gap: n,
		offset: r,
		padding: i
	};
}
function es(e, t, n = void 0) {
	let r = Mt(), i = H((e, t) => {
		if (e == null) return [n, null];
		if (typeof e == "number") return [e, null];
		if (typeof e == "string") {
			if (!t) return [n, null];
			let i = ns(e, t);
			return [i, (n) => {
				let a = ts(e);
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
						let l = ns(e, t);
						i !== l && (n(l), i = l);
					});
				}
				return r.dispose;
			}];
		}
		return [n, null];
	}), a = h(() => i(e, t)[0], [e, t]), [o = a, s] = _();
	return V(() => {
		let [n, r] = i(e, t);
		if (s(n), r) return r(s);
	}, [e, t]), o;
}
function ts(e) {
	let t = /var\((.*)\)/.exec(e);
	if (t) {
		let e = t[1].indexOf(",");
		if (e === -1) return [t[1]];
		let n = t[1].slice(0, e).trim(), r = t[1].slice(e + 1).trim();
		return r ? [n, ...ts(r)] : [n];
	}
	return [];
}
function ns(e, t) {
	let n = document.createElement("div");
	t.appendChild(n), n.style.setProperty("margin-top", "0px", "important"), n.style.setProperty("margin-top", e, "important");
	let r = parseFloat(window.getComputedStyle(n).marginTop) || 0;
	return t.removeChild(n), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/open-closed.js
var rs = i(null);
rs.displayName = "OpenClosedContext";
var is = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(is || {});
function as() {
	return l(rs);
}
function os({ value: e, children: n }) {
	return t.createElement(rs.Provider, { value: e }, n);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/calculate-active-index.js
function ss(e) {
	throw Error("Unexpected object: " + e);
}
var X = ((e) => (e[e.First = 0] = "First", e[e.Previous = 1] = "Previous", e[e.Next = 2] = "Next", e[e.Last = 3] = "Last", e[e.Specific = 4] = "Specific", e[e.Nothing = 5] = "Nothing", e))(X || {});
function cs(e, t) {
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
		default: ss(e);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
function ls(e) {
	let t = H(e), n = g(!1);
	d(() => (n.current = !1, () => {
		n.current = !0, jt(() => {
			n.current && t();
		});
	}), [t]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
function us() {
	let t = typeof document > "u";
	return "useSyncExternalStore" in e && ((e) => e.useSyncExternalStore)(e)(() => () => {}, () => !1, () => !t);
}
function ds() {
	let t = us(), [n, r] = e.useState(Et.isHandoffComplete);
	return n && Et.isHandoffComplete === !1 && r(!1), e.useEffect(() => {
		n !== !0 && r(!0);
	}, [n]), e.useEffect(() => Et.handoff(), []), !t && n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/portal-force-root.js
var fs = i(!1);
function ps() {
	return l(fs);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/portal/portal.js
function ms(e) {
	let t = ps(), n = l(ys), [r, i] = _(() => {
		if (!t && n !== null) return n.current ?? null;
		if (Et.isServer) return null;
		let r = e?.getElementById("headlessui-portal-root");
		if (r) return r;
		if (e === null) return null;
		let i = e.createElement("div");
		return i.setAttribute("id", "headlessui-portal-root"), e.body.appendChild(i);
	});
	return d(() => {
		r !== null && (e != null && e.body.contains(r) || e == null || e.body.appendChild(r));
	}, [r, e]), d(() => {
		t || n !== null && i(n.current);
	}, [
		n,
		i,
		t
	]), r;
}
var hs = n, gs = W(function(e, n) {
	let { ownerDocument: r = null, ...i } = e, a = g(null), o = bn(yn((e) => {
		a.current = e;
	}), n), s = Vr(a.current), c = ms(r ?? s), u = l(xs), d = Mt(), f = ds(), p = U();
	return ls(() => {
		var e;
		c && c.childNodes.length <= 0 && ((e = c.parentElement) == null || e.removeChild(c));
	}), !c || !f ? null : C(t.createElement("div", {
		"data-headlessui-portal": "",
		ref: (e) => {
			d.dispose(), u && e && d.add(u.register(e));
		}
	}, p({
		ourProps: { ref: o },
		theirProps: i,
		slot: {},
		defaultTag: hs,
		name: "Portal"
	})), c);
});
function _s(e, n) {
	let r = bn(n), { enabled: i = !0, ownerDocument: a, ...o } = e, s = U();
	return i ? t.createElement(gs, {
		...o,
		ownerDocument: a,
		ref: r
	}) : s({
		ourProps: { ref: r },
		theirProps: o,
		slot: {},
		defaultTag: hs,
		name: "Portal"
	});
}
var vs = n, ys = i(null);
function bs(e, n) {
	let { target: r, ...i } = e, a = { ref: bn(n) }, o = U();
	return t.createElement(ys.Provider, { value: r }, o({
		ourProps: a,
		theirProps: i,
		defaultTag: vs,
		name: "Popover.Group"
	}));
}
var xs = i(null), Ss = W(_s), Cs = W(bs), ws = Object.assign(Ss, { Group: Cs }), Ts = {
	Idle: { kind: "Idle" },
	Tracked: (e) => ({
		kind: "Tracked",
		position: e
	}),
	Moved: { kind: "Moved" }
};
function Es(e) {
	let t = e.getBoundingClientRect();
	return `${t.x},${t.y}`;
}
function Ds(e, t, n) {
	let r = B();
	if (t.kind === "Tracked") {
		let i = function() {
			a !== Es(e) && (r.dispose(), n());
		}, { position: a } = t, o = new ResizeObserver(i);
		o.observe(e), r.add(() => o.disconnect()), r.addEventListener(window, "scroll", i, { passive: !0 }), r.addEventListener(window, "resize", i);
	}
	return () => r.dispose();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/get-text-value.js
var Os = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function ks(e) {
	let t = e.innerText ?? "", n = e.cloneNode(!0);
	if (!sn(n)) return t;
	let r = !1;
	for (let e of n.querySelectorAll("[hidden],[aria-hidden],[role=\"img\"]")) e.remove(), r = !0;
	let i = r ? n.innerText ?? "" : t;
	return Os.test(i) && (i = i.replace(Os, "")), i;
}
function As(e) {
	let t = e.getAttribute("aria-label");
	if (typeof t == "string") return t.trim();
	let n = e.getAttribute("aria-labelledby");
	if (n) {
		let e = n.split(" ").map((e) => {
			let t = document.getElementById(e);
			if (t) {
				let e = t.getAttribute("aria-label");
				return typeof e == "string" ? e.trim() : ks(t).trim();
			}
			return null;
		}).filter(Boolean);
		if (e.length > 0) return e.join(", ");
	}
	return ks(e).trim();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-text-value.js
function js(e) {
	let t = g(""), n = g("");
	return H(() => {
		let r = e.current;
		if (!r) return "";
		let i = r.innerText;
		if (t.current === i) return n.current;
		let a = As(r).trim().toLowerCase();
		return t.current = i, n.current = a, a;
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/menu/menu-machine.js
var Ms = Object.defineProperty, Ns = (e, t, n) => t in e ? Ms(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Ps = (e, t, n) => (Ns(e, typeof t == "symbol" ? t : t + "", n), n), Z = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Z || {}), Fs = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(Fs || {}), Q = ((e) => (e[e.OpenMenu = 0] = "OpenMenu", e[e.CloseMenu = 1] = "CloseMenu", e[e.GoToItem = 2] = "GoToItem", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.RegisterItems = 5] = "RegisterItems", e[e.UnregisterItems = 6] = "UnregisterItems", e[e.SetButtonElement = 7] = "SetButtonElement", e[e.SetItemsElement = 8] = "SetItemsElement", e[e.SortItems = 9] = "SortItems", e[e.MarkButtonAsMoved = 10] = "MarkButtonAsMoved", e))(Q || {});
function Is(e, t = (e) => e) {
	let n = e.activeItemIndex === null ? null : e.items[e.activeItemIndex], r = jr(t(e.items.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		items: r,
		activeItemIndex: i
	};
}
var Ls = {
	1(e) {
		if (e.menuState === 1) return e;
		let t = e.buttonElement ? Ts.Tracked(Es(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeItemIndex: null,
			pendingFocus: { focus: X.Nothing },
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
			buttonPositionState: Ts.Idle
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
		if (t.focus === X.Nothing) return {
			...n,
			activeItemIndex: null
		};
		if (t.focus === X.Specific) return {
			...n,
			activeItemIndex: e.items.findIndex((e) => e.id === t.id)
		};
		if (t.focus === X.Previous) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = cs(t, {
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
		} else if (t.focus === X.Next) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = cs(t, {
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
		let r = Is(e), i = cs(t, {
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
		return e.pendingFocus.focus !== X.Nothing && (r = cs(e.pendingFocus, {
			resolveItems: () => n,
			resolveActiveIndex: () => e.activeItemIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		})), {
			...e,
			items: n,
			activeItemIndex: r,
			pendingFocus: { focus: X.Nothing },
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
		...Is(e),
		pendingShouldSort: !1
	} : e,
	10(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: Ts.Moved
		} : e;
	}
}, Rs = class e extends Jn {
	constructor(e) {
		super(e), Ps(this, "actions", {
			registerItem: Qn(() => {
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
			unregisterItem: Qn(() => {
				let e = [];
				return [(t) => e.push(t), () => this.send({
					type: 6,
					items: e.splice(0)
				})];
			})
		}), Ps(this, "selectors", {
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
			let e = this.state.id, t = ar.get(null);
			this.disposables.add(t.on(nr.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.menuState === 0 && this.send({ type: 1 });
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(Ds(t.buttonElement, t.buttonPositionState, () => {
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
			pendingFocus: { focus: X.Nothing },
			buttonPositionState: Ts.Idle
		});
	}
	reduce(e, t) {
		return Vt(t.type, Ls, e, t);
	}
}, zs = i(null);
function Bs(e) {
	let t = l(zs);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Menu /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Vs), t;
	}
	return t;
}
function Vs({ id: e, __demoMode: t = !1 }) {
	let n = h(() => Rs.new({
		id: e,
		__demoMode: t
	}), []);
	return ls(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/menu/menu.js
var Hs = n;
function Us(e, n) {
	let r = p(), { __demoMode: i = !1, ...a } = e, o = Vs({
		id: r,
		__demoMode: i
	}), [s, l, u] = cr(o, (e) => [
		e.menuState,
		e.itemsElement,
		e.buttonElement
	]), d = bn(n), f = ar.get(null);
	Br(cr(f, c((e) => f.selectors.isTop(e, r), [f, r])), [u, l], (e, t) => {
		var n;
		o.send({ type: Q.CloseMenu }), Tr(t, wr.Loose) || (e.preventDefault(), (n = o.state.buttonElement) == null || n.focus());
	});
	let m = H(() => {
		o.send({ type: Q.CloseMenu });
	}), h = Lt({
		open: s === Z.Open,
		close: m
	}), g = { ref: d }, _ = U();
	return t.createElement(Zo, null, t.createElement(zs.Provider, { value: o }, t.createElement(os, { value: Vt(s, {
		[Z.Open]: is.Open,
		[Z.Closed]: is.Closed
	}) }, _({
		ourProps: g,
		theirProps: a,
		slot: h,
		defaultTag: Hs,
		name: "Menu"
	}))));
}
var Ws = "button";
function Gs(e, t) {
	let n = Bs("Menu.Button"), r = p(), { id: i = `headlessui-menu-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, l = g(null), u = qo(), d = bn(t, l, Ko(), H((e) => n.send({
		type: Q.SetButtonElement,
		element: e
	}))), f = H((e) => {
		switch (e.key) {
			case G.Space:
			case G.Enter:
			case G.ArrowDown:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Q.OpenMenu,
					focus: { focus: X.First }
				});
				break;
			case G.ArrowUp:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Q.OpenMenu,
					focus: { focus: X.Last }
				});
				break;
		}
	}), m = H((e) => {
		switch (e.key) {
			case G.Space:
				e.preventDefault();
				break;
		}
	}), [h, _, v] = cr(n, (e) => [
		e.menuState,
		e.buttonElement,
		e.itemsElement
	]);
	Kr(h === Z.Open, {
		trigger: _,
		action: c((e) => {
			if (_ != null && _.contains(e.target)) return Ur.Ignore;
			let t = e.target.closest("[role=\"menuitem\"]:not([data-disabled])");
			return sn(t) ? Ur.Select(t) : v != null && v.contains(e.target) ? Ur.Ignore : Ur.Close;
		}, [_, v]),
		close: c(() => n.send({ type: Q.CloseMenu }), []),
		select: c((e) => e.click(), [])
	});
	let y = Ln((e) => {
		var t;
		a || (h === Z.Open ? (w(() => n.send({ type: Q.CloseMenu })), (t = l.current) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), n.send({
			type: Q.OpenMenu,
			focus: { focus: X.Nothing },
			trigger: Fs.Pointer
		})));
	}), { isFocusVisible: b, focusProps: x } = gt({ autoFocus: o }), { isHovered: S, hoverProps: C } = St({ isDisabled: a }), { pressed: T, pressProps: E } = It({ disabled: a }), D = Lt({
		open: h === Z.Open,
		active: T || h === Z.Open,
		disabled: a,
		hover: S,
		focus: b,
		autofocus: o
	}), O = Yt(u(), {
		ref: d,
		id: i,
		type: qr(e, l.current),
		"aria-haspopup": "menu",
		"aria-controls": v?.id,
		"aria-expanded": h === Z.Open,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: f,
		onKeyUp: m
	}, y, x, C, E);
	return U()({
		ourProps: O,
		theirProps: s,
		slot: D,
		defaultTag: Ws,
		name: "Menu.Button"
	});
}
var Ks = "div", qs = Ht.RenderStrategy | Ht.Static;
function Js(e, n) {
	let r = p(), { id: i = `headlessui-menu-items-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: l = !1, ...u } = e, f = Go(a), m = Bs("Menu.Items"), [h, g] = Yo(f), v = Jo(), [y, b] = _(null), x = bn(n, f ? h : null, H((e) => m.send({
		type: Q.SetItemsElement,
		element: e
	})), b), [S, C] = cr(m, (e) => [e.menuState, e.buttonElement]), T = Vr(C), E = Vr(y);
	f && (o = !0);
	let D = as(), [O, k] = ci(l, y, D === null ? S === Z.Open : (D & is.Open) === is.Open);
	gr(O, C, () => {
		m.send({ type: Q.CloseMenu });
	});
	let ee = cr(m, (e) => e.__demoMode);
	ni(!ee && s && S === Z.Open, E), hr(!ee && s && S === Z.Open, { allowed: c(() => [C, y], [C, y]) });
	let A = !cr(m, m.selectors.didButtonMove) && O;
	d(() => {
		let e = y;
		e && S === Z.Open && (At(e) || e.focus({ preventScroll: !0 }));
	}, [S, y]), pi(S === Z.Open, {
		container: y,
		accept(e) {
			return e.getAttribute("role") === "menuitem" ? NodeFilter.FILTER_REJECT : e.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
		},
		walk(e) {
			e.setAttribute("role", "none");
		}
	});
	let te = Mt(), ne = H((e) => {
		var t, n;
		switch (te.dispose(), e.key) {
			case G.Space: if (m.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), m.send({
				type: Q.Search,
				value: e.key
			});
			case G.Enter:
				if (e.preventDefault(), e.stopPropagation(), m.state.activeItemIndex !== null) {
					let { dataRef: e } = m.state.items[m.state.activeItemIndex];
					(t = e.current?.domRef.current) == null || t.click();
				}
				m.send({ type: Q.CloseMenu }), Er(m.state.buttonElement);
				break;
			case G.ArrowDown: return e.preventDefault(), e.stopPropagation(), m.send({
				type: Q.GoToItem,
				focus: X.Next
			});
			case G.ArrowUp: return e.preventDefault(), e.stopPropagation(), m.send({
				type: Q.GoToItem,
				focus: X.Previous
			});
			case G.Home:
			case G.PageUp: return e.preventDefault(), e.stopPropagation(), m.send({
				type: Q.GoToItem,
				focus: X.First
			});
			case G.End:
			case G.PageDown: return e.preventDefault(), e.stopPropagation(), m.send({
				type: Q.GoToItem,
				focus: X.Last
			});
			case G.Escape:
				e.preventDefault(), e.stopPropagation(), w(() => m.send({ type: Q.CloseMenu })), (n = m.state.buttonElement) == null || n.focus({ preventScroll: !0 });
				break;
			case G.Tab:
				e.preventDefault(), e.stopPropagation(), w(() => m.send({ type: Q.CloseMenu })), Mr(m.state.buttonElement, e.shiftKey ? yr.Previous : yr.Next);
				break;
			default:
				e.key.length === 1 && (m.send({
					type: Q.Search,
					value: e.key
				}), te.setTimeout(() => m.send({ type: Q.ClearSearch }), 350));
				break;
		}
	}), j = H((e) => {
		switch (e.key) {
			case G.Space:
				e.preventDefault();
				break;
		}
	}), re = Lt({ open: S === Z.Open }), M = Yt(f ? v() : {}, {
		"aria-activedescendant": cr(m, m.selectors.activeDescendantId),
		"aria-labelledby": cr(m, (e) => e.buttonElement?.id),
		id: i,
		onKeyDown: ne,
		onKeyUp: j,
		role: "menu",
		tabIndex: S === Z.Open ? 0 : void 0,
		ref: x,
		style: {
			...u.style,
			...g,
			"--button-width": Fn(O, C, !0).width
		},
		...si(k)
	}), N = U();
	return t.createElement(ws, {
		enabled: o ? e.static || O : !1,
		ownerDocument: T
	}, N({
		ourProps: M,
		theirProps: u,
		slot: re,
		defaultTag: Ks,
		features: qs,
		visible: A,
		name: "Menu.Items"
	}));
}
var Ys = n;
function Xs(e, n) {
	let r = p(), { id: i = `headlessui-menu-item-${r}`, disabled: a = !1, ...o } = e, s = Bs("Menu.Item"), c = cr(s, (e) => s.selectors.isActive(e, i)), l = g(null), u = bn(n, l), d = cr(s, (e) => s.selectors.shouldScrollIntoView(e, i));
	V(() => {
		if (d) return B().requestAnimationFrame(() => {
			var e, t;
			(t = (e = l.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [d, l]);
	let f = js(l), m = g({
		disabled: a,
		domRef: l,
		get textValue() {
			return f();
		}
	});
	V(() => {
		m.current.disabled = a;
	}, [m, a]), V(() => (s.actions.registerItem(i, m), () => s.actions.unregisterItem(i)), [m, i]);
	let h = H(() => {
		s.send({ type: Q.CloseMenu });
	}), _ = H((e) => {
		if (a) return e.preventDefault();
		s.send({ type: Q.CloseMenu }), Er(s.state.buttonElement);
	}), v = H(() => {
		if (a) return s.send({
			type: Q.GoToItem,
			focus: X.Nothing
		});
		s.send({
			type: Q.GoToItem,
			focus: X.Specific,
			id: i
		});
	}), y = ii(), b = H((e) => y.update(e)), x = H((e) => {
		y.wasMoved(e) && (a || c || s.send({
			type: Q.GoToItem,
			focus: X.Specific,
			id: i,
			trigger: Fs.Pointer
		}));
	}), S = H((e) => {
		y.wasMoved(e) && (a || c && s.state.activationTrigger === Fs.Pointer && s.send({
			type: Q.GoToItem,
			focus: X.Nothing
		}));
	}), [C, w] = An(), [T, E] = Cn(), D = Lt({
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
		onClick: _,
		onFocus: v,
		onPointerEnter: b,
		onMouseEnter: b,
		onPointerMove: x,
		onMouseMove: x,
		onPointerLeave: S,
		onMouseLeave: S
	}, k = U();
	return t.createElement(w, null, t.createElement(E, null, k({
		ourProps: O,
		theirProps: o,
		slot: D,
		defaultTag: Ys,
		name: "Menu.Item"
	})));
}
var Zs = "div";
function Qs(e, n) {
	let [r, i] = An(), a = e, o = {
		ref: n,
		"aria-labelledby": r,
		role: "group"
	}, s = U();
	return t.createElement(i, null, s({
		ourProps: o,
		theirProps: a,
		slot: {},
		defaultTag: Zs,
		name: "Menu.Section"
	}));
}
var $s = "header";
function ec(e, t) {
	let n = p(), { id: r = `headlessui-menu-heading-${n}`, ...i } = e, a = On();
	V(() => a.register(r), [r, a.register]);
	let o = {
		id: r,
		ref: t,
		role: "presentation",
		...a.props
	};
	return U()({
		ourProps: o,
		theirProps: i,
		slot: {},
		defaultTag: $s,
		name: "Menu.Heading"
	});
}
var tc = "div";
function nc(e, t) {
	let n = e, r = {
		ref: t,
		role: "separator"
	};
	return U()({
		ourProps: r,
		theirProps: n,
		slot: {},
		defaultTag: tc,
		name: "Menu.Separator"
	});
}
var rc = W(Us), ic = W(Gs), ac = W(Js), $ = W(Xs), oc = W(Qs), sc = W(ec), cc = W(nc), lc = Object.assign(rc, {
	Button: ic,
	Items: ac,
	Item: $,
	Section: oc,
	Heading: sc,
	Separator: cc
});
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowPathIcon.js
function uc({ title: t, titleId: n, ...r }, i) {
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
var dc = /*#__PURE__*/ e.forwardRef(uc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingInIcon.js
function fc({ title: t, titleId: n, ...r }, i) {
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
var pc = /*#__PURE__*/ e.forwardRef(fc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingOutIcon.js
function mc({ title: t, titleId: n, ...r }, i) {
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
var hc = /*#__PURE__*/ e.forwardRef(mc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Bars3Icon.js
function gc({ title: t, titleId: n, ...r }, i) {
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
var _c = /*#__PURE__*/ e.forwardRef(gc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BarsArrowDownIcon.js
function vc({ title: t, titleId: n, ...r }, i) {
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
var yc = /*#__PURE__*/ e.forwardRef(vc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BookmarkIcon.js
function bc({ title: t, titleId: n, ...r }, i) {
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
var xc = /*#__PURE__*/ e.forwardRef(bc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CalendarDaysIcon.js
function Sc({ title: t, titleId: n, ...r }, i) {
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
var Cc = /*#__PURE__*/ e.forwardRef(Sc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckCircleIcon.js
function wc({ title: t, titleId: n, ...r }, i) {
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
var Tc = /*#__PURE__*/ e.forwardRef(wc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronLeftIcon.js
function Ec({ title: t, titleId: n, ...r }, i) {
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
var Dc = /*#__PURE__*/ e.forwardRef(Ec);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronRightIcon.js
function Oc({ title: t, titleId: n, ...r }, i) {
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
var kc = /*#__PURE__*/ e.forwardRef(Oc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Cog6ToothIcon.js
function Ac({ title: t, titleId: n, ...r }, i) {
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
var jc = /*#__PURE__*/ e.forwardRef(Ac);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/DocumentDuplicateIcon.js
function Mc({ title: t, titleId: n, ...r }, i) {
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
var Nc = /*#__PURE__*/ e.forwardRef(Mc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EllipsisHorizontalIcon.js
function Pc({ title: t, titleId: n, ...r }, i) {
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
var Fc = /*#__PURE__*/ e.forwardRef(Pc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
function Ic({ title: t, titleId: n, ...r }, i) {
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
var Lc = /*#__PURE__*/ e.forwardRef(Ic);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FunnelIcon.js
function Rc({ title: t, titleId: n, ...r }, i) {
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
var zc = /*#__PURE__*/ e.forwardRef(Rc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LinkIcon.js
function Bc({ title: t, titleId: n, ...r }, i) {
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
var Vc = /*#__PURE__*/ e.forwardRef(Bc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LockClosedIcon.js
function Hc({ title: t, titleId: n, ...r }, i) {
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
var Uc = /*#__PURE__*/ e.forwardRef(Hc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/MagnifyingGlassIcon.js
function Wc({ title: t, titleId: n, ...r }, i) {
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
var Gc = /*#__PURE__*/ e.forwardRef(Wc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilIcon.js
function Kc({ title: t, titleId: n, ...r }, i) {
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
var qc = /*#__PURE__*/ e.forwardRef(Kc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PlusIcon.js
function Jc({ title: t, titleId: n, ...r }, i) {
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
var Yc = /*#__PURE__*/ e.forwardRef(Jc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleGroupIcon.js
function Xc({ title: t, titleId: n, ...r }, i) {
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
var Zc = /*#__PURE__*/ e.forwardRef(Xc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Squares2X2Icon.js
function Qc({ title: t, titleId: n, ...r }, i) {
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
var $c = /*#__PURE__*/ e.forwardRef(Qc);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TableCellsIcon.js
function el({ title: t, titleId: n, ...r }, i) {
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
var tl = /*#__PURE__*/ e.forwardRef(el);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TagIcon.js
function nl({ title: t, titleId: n, ...r }, i) {
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
var rl = /*#__PURE__*/ e.forwardRef(nl);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TrashIcon.js
function il({ title: t, titleId: n, ...r }, i) {
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
var al = /*#__PURE__*/ e.forwardRef(il);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserIcon.js
function ol({ title: t, titleId: n, ...r }, i) {
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
var sl = /*#__PURE__*/ e.forwardRef(ol);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ViewColumnsIcon.js
function cl({ title: t, titleId: n, ...r }, i) {
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
var ll = /*#__PURE__*/ e.forwardRef(cl);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function ul({ title: t, titleId: n, ...r }, i) {
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
var dl = /*#__PURE__*/ e.forwardRef(ul);
//#endregion
//#region ../../shared/lib/board.ts
function fl(e) {
	return e.split(",").map((e) => e.trim()).filter(Boolean);
}
function pl(e) {
	return e.join(", ");
}
function ml(e) {
	let t = e.split(/[\\/]/).pop() || e;
	try {
		return decodeURIComponent(t.split("?")[0] || t);
	} catch {
		return t;
	}
}
function hl(e) {
	let t = e.trim();
	if (!t) return !1;
	let n = /^([a-z][a-z0-9+.-]*):/i.exec(t);
	if (!n) return !0;
	let r = n[1].toLowerCase();
	return r === "http" || r === "https";
}
function gl(e, t) {
	let n = {};
	if (!e || !t) return n;
	for (let r of t) {
		let t = e[r.key];
		t !== void 0 && t !== "" && (n[r.key] = t);
	}
	return n;
}
var _l = [
	"urgent",
	"high",
	"medium",
	"low",
	"none"
], vl = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4
}, yl = {
	urgent: "bg-red-100 text-red-700",
	high: "bg-amber-100 text-amber-700",
	medium: "bg-sky-100 text-sky-700",
	low: "bg-stone-100 text-stone-500"
}, bl = [
	"#ef4444",
	"#f59e0b",
	"#eab308",
	"#22c55e",
	"#0ea5e9",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#78716c"
], xl = [
	"title",
	"board",
	"status",
	"position",
	"priority",
	"assignee",
	"due",
	"tags",
	"icon",
	"blocked_by",
	"blocks",
	"relates",
	"attachments"
];
function Sl(e) {
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
function Cl(e) {
	for (let t of e.split("\n")) {
		let e = t.trim().replace(/^[#>\-*+\s]+/, "").replace(/^\[[ xX]\]\s*/, "").trim();
		if (e) return e.length > 120 ? `${e.slice(0, 120)}…` : e;
	}
	return null;
}
function wl(e) {
	return e.trim().replace(/^\[|\]$/g, "").split(",").map((e) => e.trim().replace(/^#/, "")).filter(Boolean);
}
var Tl = [
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
function El(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = Math.imul(t, 31) + e.charCodeAt(n) >>> 0;
	return Tl[t % Tl.length];
}
function Dl(e, t) {
	return e.map((e) => ({
		label: e,
		color: t?.find((t) => t.label === e)?.color ?? El(e)
	}));
}
function Ol(e) {
	return e.split(",").map((e) => e.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim()).filter(Boolean);
}
function kl(e) {
	return e.map((e) => `[[${e}]]`).join(", ");
}
function Al(e) {
	return (e.id.split(/[\\/]/).pop() ?? e.id).replace(/\.md$/i, "");
}
function jl(e, t) {
	let n = t || "done", r = /* @__PURE__ */ new Map();
	for (let t of e) r.set(Al(t), t);
	let i = (e) => !!e && e.columnKey !== n, a = /* @__PURE__ */ new Map(), o = (e, t) => {
		let n = a.get(e);
		n || a.set(e, n = /* @__PURE__ */ new Set()), n.add(t.id);
	};
	for (let t of e) for (let e of t.blockedBy ?? []) {
		let n = r.get(e);
		i(n) && n.id !== t.id && o(t.id, n);
	}
	for (let t of e) if (i(t)) for (let e of t.blocks ?? []) {
		let n = r.get(e);
		n && n.id !== t.id && o(n.id, t);
	}
	let s = /* @__PURE__ */ new Map();
	for (let [e, t] of a) s.set(e, t.size);
	return s;
}
function Ml() {
	let e = /* @__PURE__ */ new Date();
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Nl(e) {
	return e.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
function Pl(e, t) {
	return t === "priority" ? e.priority || "none" : t === "assignee" ? e.assignee || "" : e.columnKey || "";
}
function Fl(e, t, n, r) {
	if (n === "status") return e.columns;
	if (n === "priority") return _l.map((e) => ({
		key: e,
		name: e
	}));
	let i = /* @__PURE__ */ new Set();
	for (let e of t) i.add(Pl(e, n));
	return [...i].sort((e, t) => e === "" ? 1 : t === "" ? -1 : e.localeCompare(t)).map((e) => ({
		key: e,
		name: e || r
	}));
}
function Il(e, t, n) {
	let r = /* @__PURE__ */ new Map();
	for (let i of e) {
		let e = Pl(i, n), a = Pl(i, t), o = r.get(e);
		o || r.set(e, o = /* @__PURE__ */ new Map());
		let s = o.get(a);
		s || o.set(a, s = []), s.push(i);
	}
	return r;
}
function Ll(e, t) {
	return t ? t.prop === "priority" ? (e.priority || "none") === t.value : t.prop === "assignee" ? (e.assignee || "") === t.value : t.prop !== "tag" || e.tags.some((e) => e.label === t.value) : !0;
}
function Rl(e, t, n) {
	let r = t.trim().toLowerCase();
	return e.filter((e) => r && !e.title.toLowerCase().includes(r) ? !1 : Ll(e, n));
}
function zl(e, t) {
	let n = [...e];
	return t === "due" ? n.sort((e, t) => (e.due || "9999-99-99").localeCompare(t.due || "9999-99-99")) : t === "priority" ? n.sort((e, t) => (vl[e.priority || "none"] ?? 5) - (vl[t.priority || "none"] ?? 5)) : t === "title" ? n.sort((e, t) => e.title.localeCompare(t.title)) : n.sort((e, t) => e.position - t.position), n;
}
function Bl(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Vl(e) {
	return !!e && /^\d{4}-\d{2}-\d{2}$/.test(e);
}
function Hl() {
	return Ml().slice(0, 7);
}
function Ul(e, t) {
	let [n, r] = e.split("-"), i = new Date(Number(n), Number(r) - 1 + t, 1);
	return `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}`;
}
function Wl(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		if (!Vl(n.due)) continue;
		let e = t.get(n.due);
		e ? e.push(n) : t.set(n.due, [n]);
	}
	return t;
}
function Gl(e, t = 0) {
	let [n, r] = e.split("-"), i = Number(n), a = Number(r), o = (new Date(i, a - 1, 1).getDay() - t + 7) % 7, s = new Date(i, a - 1, 1 - o), c = [];
	for (let e = 0; e < 6; e++) {
		let t = [];
		for (let n = 0; n < 7; n++) t.push(Bl(new Date(s.getFullYear(), s.getMonth(), s.getDate() + e * 7 + n)));
		c.push(t);
	}
	return c;
}
//#endregion
//#region ../../shared/components/board/BoardTable.tsx
function Kl({ cards: e, statusName: t, today: n, doneKey: r, selectedId: i, onSelect: a }) {
	let o = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-brand-gray", s = "px-3 py-2 align-middle", c = /* @__PURE__ */ b("span", {
		className: "text-stone-300",
		children: "—"
	});
	return /* @__PURE__ */ b("div", {
		className: "min-h-0 flex-1 overflow-auto p-4",
		children: /* @__PURE__ */ x("table", {
			className: "w-full border-collapse text-sm",
			children: [/* @__PURE__ */ b("thead", {
				className: "sticky top-0 bg-[#fbfdfb]",
				children: /* @__PURE__ */ x("tr", {
					className: "border-b border-black/[0.08]",
					children: [
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "MHrjPM" })
						}),
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "uAQUqI" })
						}),
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "1hKEom" })
						}),
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "ojKCLU" })
						}),
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "Gpfctt" })
						}),
						/* @__PURE__ */ b("th", {
							className: o,
							children: /* @__PURE__ */ b(M, { id: "OYHzN1" })
						})
					]
				})
			}), /* @__PURE__ */ x("tbody", { children: [e.map((e) => {
				let o = e.due && e.due < n && e.columnKey !== r;
				return /* @__PURE__ */ x("tr", {
					role: "button",
					tabIndex: 0,
					onClick: () => a(e),
					onKeyDown: (t) => {
						t.key === "Enter" && a(e);
					},
					className: `cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-brand-soft/30 ${i === e.id ? "bg-brand-soft/40" : ""}`,
					children: [
						/* @__PURE__ */ b("td", {
							className: `${s} text-stone-800`,
							children: /* @__PURE__ */ x("span", {
								className: "flex items-center gap-1.5",
								children: [
									e.icon && /* @__PURE__ */ b("span", { children: e.icon }),
									/* @__PURE__ */ b("span", {
										className: "truncate",
										children: e.title
									}),
									(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ x("span", {
										className: `inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
										children: [
											/* @__PURE__ */ b(Tc, { className: "h-3 w-3" }),
											e.taskDone,
											"/",
											e.taskTotal
										]
									})
								]
							})
						}),
						/* @__PURE__ */ b("td", {
							className: `${s} text-stone-600`,
							children: t(e.columnKey)
						}),
						/* @__PURE__ */ b("td", {
							className: s,
							children: e.priority && e.priority !== "none" ? /* @__PURE__ */ b("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${yl[e.priority] ?? "bg-stone-100 text-stone-500"}`,
								children: e.priority
							}) : c
						}),
						/* @__PURE__ */ b("td", {
							className: `${s} text-stone-600`,
							children: e.assignee ? /* @__PURE__ */ x("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ b(sl, { className: "h-3.5 w-3.5 text-brand-gray" }), e.assignee]
							}) : c
						}),
						/* @__PURE__ */ b("td", {
							className: s,
							children: e.due ? /* @__PURE__ */ x("span", {
								className: `inline-flex items-center gap-1 ${o ? "font-medium text-red-600" : "text-stone-600"}`,
								children: [/* @__PURE__ */ b(Cc, { className: "h-3.5 w-3.5" }), e.due]
							}) : c
						}),
						/* @__PURE__ */ b("td", {
							className: s,
							children: e.tags.length ? /* @__PURE__ */ b("span", {
								className: "flex flex-wrap gap-1",
								children: e.tags.map((e) => /* @__PURE__ */ x("span", {
									className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
									style: { backgroundColor: e.color ? `${e.color}22` : void 0 },
									children: [/* @__PURE__ */ b(rl, { className: "h-3 w-3" }), e.label]
								}, e.label))
							}) : c
						})
					]
				}, e.id);
			}), e.length === 0 && /* @__PURE__ */ b("tr", { children: /* @__PURE__ */ b("td", {
				colSpan: 6,
				className: "px-3 py-8 text-center text-sm text-stone-400",
				children: /* @__PURE__ */ b(M, { id: "Zot9XS" })
			}) })] })]
		})
	});
}
//#endregion
//#region ../../shared/components/board/BoardCalendar.tsx
var ql = Array.from({ length: 7 }, (e, t) => new Date(2023, 0, 1 + t).toLocaleDateString(void 0, { weekday: "short" }));
function Jl({ cards: e, today: t, doneKey: n, mode: r, onModeChange: i, selectedId: a, onSelect: o }) {
	let [s, c] = _(() => Hl()), l = Wl(e), [u, d] = s.split("-"), f = new Date(Number(u), Number(d) - 1, 1).toLocaleDateString(void 0, {
		year: "numeric",
		month: "long"
	}), p = (e) => !!e.due && e.due < t && e.columnKey !== n, m = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:border-brand/40 hover:text-brand-dark", h = (e) => `rounded-md px-2 py-1 text-xs font-medium ${r === e ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`, g = (e, t) => {
		let n = p(e);
		return /* @__PURE__ */ x("button", {
			type: "button",
			onClick: () => o(e),
			title: e.title,
			className: `flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] transition-colors ${a === e.id ? "bg-brand-soft/60" : "bg-stone-100/70 hover:bg-brand-soft/40"} ${n ? "text-red-600" : "text-stone-700"}`,
			children: [
				e.priority && e.priority !== "none" && /* @__PURE__ */ b("span", { className: `h-1.5 w-1.5 shrink-0 rounded-full ${yl[e.priority]?.split(" ")[0] ?? "bg-stone-300"}` }),
				e.icon && /* @__PURE__ */ b("span", {
					className: "shrink-0",
					children: e.icon
				}),
				/* @__PURE__ */ b("span", {
					className: "truncate",
					children: e.title
				}),
				!t && (e.taskTotal ?? 0) > 0 && /* @__PURE__ */ x("span", {
					className: "ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] text-stone-400",
					children: [
						/* @__PURE__ */ b(Tc, { className: "h-2.5 w-2.5" }),
						e.taskDone,
						"/",
						e.taskTotal
					]
				})
			]
		}, e.id);
	}, v = /* @__PURE__ */ x("div", {
		className: "flex items-center gap-2 border-b border-black/[0.04] px-4 py-2",
		children: [r === "month" && /* @__PURE__ */ x(y, { children: [
			/* @__PURE__ */ b("button", {
				type: "button",
				className: m,
				title: I._({ id: "1xwZj_" }),
				"aria-label": I._({ id: "1xwZj_" }),
				onClick: () => c((e) => Ul(e, -1)),
				children: /* @__PURE__ */ b(Dc, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ b("button", {
				type: "button",
				className: m,
				title: I._({ id: "g8JmSC" }),
				"aria-label": I._({ id: "g8JmSC" }),
				onClick: () => c((e) => Ul(e, 1)),
				children: /* @__PURE__ */ b(kc, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ b("span", {
				className: "min-w-[8rem] text-sm font-medium text-brand-dark",
				children: f
			}),
			/* @__PURE__ */ b("button", {
				type: "button",
				className: "rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				onClick: () => c(Hl()),
				children: /* @__PURE__ */ b(M, { id: "ecUA8p" })
			})
		] }), /* @__PURE__ */ x("div", {
			className: "ml-auto inline-flex items-center rounded-lg border border-stone-200 p-0.5",
			children: [/* @__PURE__ */ b("button", {
				type: "button",
				className: h("month"),
				onClick: () => i("month"),
				children: /* @__PURE__ */ b(M, { id: "HajiZl" })
			}), /* @__PURE__ */ b("button", {
				type: "button",
				className: h("agenda"),
				onClick: () => i("agenda"),
				children: /* @__PURE__ */ b(M, { id: "xDsmP9" })
			})]
		})]
	});
	if (r === "agenda") {
		let n = zl(e, "due"), r = n.filter((e) => Vl(e.due)), i = n.filter((e) => !Vl(e.due)), a = "";
		return /* @__PURE__ */ x("div", {
			className: "flex min-h-0 flex-1 flex-col",
			children: [v, /* @__PURE__ */ x("div", {
				className: "min-h-0 flex-1 overflow-auto p-4",
				children: [
					r.length === 0 && i.length === 0 && /* @__PURE__ */ b("div", {
						className: "px-3 py-8 text-center text-sm text-stone-400",
						children: /* @__PURE__ */ b(M, { id: "Zot9XS" })
					}),
					r.map((e) => {
						let n = e.due !== a;
						return a = e.due, /* @__PURE__ */ x("div", { children: [n && /* @__PURE__ */ x("div", {
							className: `mt-3 mb-1 text-xs font-medium ${e.due === t ? "text-brand-dark" : "text-brand-gray"}`,
							children: [e.due, e.due === t && /* @__PURE__ */ b("span", {
								className: "ml-1 rounded bg-brand-soft px-1 text-[10px] text-brand-dark",
								children: /* @__PURE__ */ b(M, { id: "ecUA8p" })
							})]
						}), /* @__PURE__ */ b("div", {
							className: "max-w-xl",
							children: g(e, !1)
						})] }, e.id);
					}),
					i.length > 0 && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b("div", {
						className: "mt-4 mb-1 text-xs font-medium text-stone-400",
						children: /* @__PURE__ */ b(M, { id: "cJ44lA" })
					}), /* @__PURE__ */ b("div", {
						className: "max-w-xl space-y-0.5",
						children: i.map((e) => g(e, !1))
					})] })
				]
			})]
		});
	}
	let S = Gl(s);
	return /* @__PURE__ */ x("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			v,
			/* @__PURE__ */ b("div", {
				className: "grid grid-cols-7 border-b border-black/[0.04] bg-[#fbfdfb]",
				children: ql.map((e) => /* @__PURE__ */ b("div", {
					className: "px-2 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-brand-gray",
					children: e
				}, e))
			}),
			/* @__PURE__ */ b("div", {
				className: "grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto",
				children: S.flat().map((e) => {
					let n = e.slice(0, 7) === s, r = e === t, i = l.get(e) ?? [];
					return /* @__PURE__ */ x("div", {
						className: `flex min-h-[5.5rem] flex-col gap-0.5 border-b border-r border-black/[0.04] p-1 ${n ? "" : "bg-stone-50/60"}`,
						children: [/* @__PURE__ */ b("div", {
							className: `mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${r ? "bg-brand text-white" : n ? "text-stone-500" : "text-stone-300"}`,
							children: Number(e.slice(8, 10))
						}), /* @__PURE__ */ x("div", {
							className: "flex flex-col gap-0.5 overflow-hidden",
							children: [i.slice(0, 4).map((e) => g(e, !0)), i.length > 4 && /* @__PURE__ */ x("span", {
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
//#region ../../shared/components/board/BoardSwimlanes.tsx
function Yl({ cards: e, columns: t, lanes: n, groupKey: r, swimlaneKey: i, today: a, doneKey: o, selectedId: s, onSelect: c }) {
	let l = Il(e, r, i), u = { gridTemplateColumns: `repeat(${Math.max(t.length, 1)}, minmax(11rem, 1fr))` }, d = (e) => {
		let t = e.due && e.due < a && e.columnKey !== o;
		return /* @__PURE__ */ x("button", {
			type: "button",
			onClick: () => c(e),
			title: e.title,
			className: `block w-full rounded-lg bg-white p-2 text-left text-sm shadow-sm ring-1 transition hover:ring-brand/30 ${s === e.id ? "ring-brand/60" : "ring-black/[0.04]"}`,
			children: [/* @__PURE__ */ x("span", {
				className: "block truncate text-stone-800",
				children: [e.icon && /* @__PURE__ */ b("span", {
					className: "mr-1",
					children: e.icon
				}), e.title]
			}), (e.priority && e.priority !== "none" || e.due || (e.taskTotal ?? 0) > 0) && /* @__PURE__ */ x("span", {
				className: "mt-1 flex flex-wrap items-center gap-1.5",
				children: [
					e.priority && e.priority !== "none" && /* @__PURE__ */ b("span", {
						className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${yl[e.priority] ?? "bg-stone-100 text-stone-500"}`,
						children: e.priority
					}),
					(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ x("span", {
						className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
						children: [
							/* @__PURE__ */ b(Tc, { className: "h-3 w-3" }),
							e.taskDone,
							"/",
							e.taskTotal
						]
					}),
					e.due && /* @__PURE__ */ x("span", {
						className: `inline-flex items-center gap-0.5 text-[11px] ${t ? "font-medium text-red-600" : "text-brand-gray"}`,
						children: [/* @__PURE__ */ b(Cc, { className: "h-3 w-3" }), e.due]
					})
				]
			})]
		}, e.id);
	};
	return /* @__PURE__ */ b("div", {
		className: "min-h-0 flex-1 overflow-auto p-4",
		children: /* @__PURE__ */ x("div", {
			className: "min-w-max",
			children: [
				/* @__PURE__ */ b("div", {
					className: "sticky top-0 z-10 grid gap-3 bg-[#fbfdfb] pb-1.5",
					style: u,
					children: t.map((e) => /* @__PURE__ */ b("div", {
						className: "px-1 text-[11px] font-medium uppercase tracking-wide text-brand-gray",
						children: e.name
					}, e.key))
				}),
				n.map((e) => {
					let n = l.get(e.key), i = n ? [...n.values()].reduce((e, t) => e + t.length, 0) : 0;
					return /* @__PURE__ */ x("div", {
						className: "mb-2",
						children: [/* @__PURE__ */ x("div", {
							className: "flex items-center gap-2 py-1.5",
							children: [/* @__PURE__ */ b("span", {
								className: "text-xs font-semibold text-brand-dark",
								children: e.name
							}), /* @__PURE__ */ b("span", {
								className: "rounded-full bg-stone-100 px-1.5 text-[11px] text-stone-400",
								children: i
							})]
						}), /* @__PURE__ */ b("div", {
							className: "grid items-start gap-3",
							style: u,
							children: t.map((e) => /* @__PURE__ */ b("div", {
								className: "min-h-[3rem] space-y-2 rounded-lg bg-[#f6faf7] p-1.5",
								children: zl((n?.get(e.key) ?? []).filter((t) => Pl(t, r) === e.key), "manual").map((e) => d(e))
							}, e.key))
						})]
					}, e.key);
				}),
				n.length === 0 && /* @__PURE__ */ b("div", {
					className: "px-3 py-8 text-center text-sm text-stone-400",
					children: /* @__PURE__ */ b(M, { id: "Zot9XS" })
				})
			]
		})
	});
}
//#endregion
//#region ../../shared/components/board/BoardSurface.tsx
function Xl({ config: e, cards: t, actions: r, error: i, templates: a, createFromTemplate: o, assigneeOptions: s, tagOptions: c, loadNotes: l, onUploadAttachment: u, loadComments: f, addComment: p, deleteComment: m, currentUser: v, loadActivity: S, fullscreen: C, onToggleFullscreen: w, onOpenSettings: T, readOnly: E, onCardOpen: D, peekComponent: O, portalClassName: k }) {
	let [ee, A] = _(null), [te, ne] = _(null), [j, re] = _(null), [N, ie] = _(/* @__PURE__ */ new Set()), [P, ae] = _(null), [oe, se] = _(""), [ce, le] = _(!1), [ue, F] = _(""), [de, fe] = _(""), [pe, me] = _("manual"), [he, ge] = _(null), [_e, ve] = _(360), [ye, be] = _(null), [xe, Se] = _(null), [Ce, we] = _(null), Te = g(null), Ee = g(null), L = e.groupBy ?? "status", R = L === "status", z = e.viewType ?? "board", De = e.doneColumn ?? "done", Oe = (e.colorColumns ?? !1) && R && z === "board", ke = pe === "manual" && R && z === "board", Ae = Ml();
	d(() => {
		if (!C || !w) return;
		let e = (e) => {
			e.key === "Escape" && !ee && w();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [
		C,
		ee,
		w
	]);
	let je = h(() => Fl(e, t, L, I._({ id: "EbMPZJ" })), [
		e,
		t,
		L
	]), Me = e.swimlaneBy && e.swimlaneBy !== L ? e.swimlaneBy : null, Ne = z === "board" && !!Me, Pe = h(() => Me ? Fl(e, t, Me, I._({ id: "EbMPZJ" })) : [], [
		e,
		t,
		Me
	]), Fe = h(() => Rl(t, de, he), [
		t,
		de,
		he
	]), Ie = h(() => jl(t, e.doneColumn), [t, e.doneColumn]), Le = h(() => [...new Set(t.map((e) => e.assignee).filter(Boolean))], [t]), Re = h(() => [...new Set(t.flatMap((e) => e.tags.map((e) => e.label)))], [t]), ze = (t) => e.columns.find((e) => e.key === t)?.name || t || I._({ id: "EbMPZJ" }), Be = ee ? t.find((e) => e.id === ee) ?? null : null, Ve = "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", He = k ? ` ${k}` : "", Ue = (e) => {
		D ? D(e) : A(e.id);
	}, We = !!(r.renameColumn || r.toggleDoneColumn || r.setColumnLimit || r.setColumnColor || r.deleteColumn), Ge = (e, t) => {
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
	}, Ke = (e, t) => (document.elementFromPoint(e, t)?.closest("[data-col-key]"))?.dataset.colKey ?? null, qe = (e, t) => {
		if (e.button === 0) {
			Te.current = {
				id: t.id,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, Je = (e, t) => {
		if (E) return;
		let n = Te.current;
		if (!(!n || n.id !== t.id)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, be(t.id);
			}
			we({
				x: e.clientX,
				y: e.clientY
			}), ne(Ge(e.clientX, e.clientY));
		}
	}, Ye = (e, t) => {
		let n = Te.current;
		Te.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (be(null), we(null), ne(null), n?.moved) {
			let n = Ge(e.clientX, e.clientY);
			n && r.moveCard(t.id, n.col, n.index);
		} else n && Ue(t);
	}, Xe = (e, t) => {
		if (!(!R || !r.reorderColumns || e.button !== 0) && !e.target.closest("button")) {
			Ee.current = {
				key: t.key,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, Ze = (e, t) => {
		let n = Ee.current;
		if (!(!n || n.key !== t.key)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, Se(t.key);
			}
			re(Ke(e.clientX, e.clientY));
		}
	}, Qe = (e, t) => {
		let n = Ee.current;
		Ee.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (Se(null), re(null), n?.moved) {
			let n = Ke(e.clientX, e.clientY);
			n && n !== t.key && r.reorderColumns?.(t.key, n);
		}
	}, $e = (e) => ie((t) => {
		let n = new Set(t);
		return n.has(e) ? n.delete(e) : n.add(e), n;
	}), et = async (e, t) => {
		let n = t.trim();
		if (!n) return;
		let i = await r.createCard(e, n);
		typeof i == "string" && !D && A(i);
	};
	return i && e.columns.length === 0 ? /* @__PURE__ */ x("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center",
		children: [/* @__PURE__ */ b(Lc, { className: "h-9 w-9 text-amber-500" }), /* @__PURE__ */ b("p", {
			className: "max-w-md break-words text-sm text-stone-600",
			children: i
		})]
	}) : /* @__PURE__ */ x("div", {
		className: "relative flex h-full min-h-0 bg-[#fbfdfb]",
		children: [
			/* @__PURE__ */ x("div", {
				className: "flex min-h-0 min-w-0 flex-1 flex-col",
				children: [
					/* @__PURE__ */ x("div", {
						className: "flex flex-wrap items-center gap-2.5 border-b border-black/[0.05] bg-white/70 px-5 py-2.5",
						children: [
							/* @__PURE__ */ b("span", {
								className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ b(ll, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ x("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ b("p", {
									className: "truncate text-sm font-semibold text-stone-900",
									children: e.title
								}), /* @__PURE__ */ x("p", {
									className: "truncate text-xs text-brand-gray",
									children: [
										/* @__PURE__ */ b(M, { id: "QD8opX" }),
										/* @__PURE__ */ b("span", {
											"aria-hidden": !0,
											children: " · "
										}),
										Fe.length,
										Fe.length === t.length ? "" : `/${t.length}`,
										" ",
										/* @__PURE__ */ b(M, { id: "sCzmvQ" })
									]
								})]
							}),
							/* @__PURE__ */ x("div", {
								className: "flex items-center gap-2.5 max-md:w-full",
								children: [
									/* @__PURE__ */ x("div", {
										className: "inline-flex items-center rounded-lg border border-stone-200 p-0.5",
										children: [
											/* @__PURE__ */ x("button", {
												type: "button",
												onClick: () => void r.setConfig({ viewType: "board" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${z === "board" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ b(ll, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "QD8opX" })]
											}),
											/* @__PURE__ */ x("button", {
												type: "button",
												onClick: () => void r.setConfig({ viewType: "table" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${z === "table" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ b(tl, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "4hJhzz" })]
											}),
											/* @__PURE__ */ x("button", {
												type: "button",
												onClick: () => void r.setConfig({ viewType: "calendar" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${z === "calendar" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ b(Cc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "AjVXBS" })]
											})
										]
									}),
									R && z === "board" && !E && /* @__PURE__ */ x("button", {
										type: "button",
										className: `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${Oe ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: () => void r.setConfig({ colorColumns: !e.colorColumns }),
										title: I._({ id: "b4hVKD" }),
										children: [/* @__PURE__ */ b($c, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "jZlrte" })]
									}),
									r.refresh && /* @__PURE__ */ x("button", {
										type: "button",
										className: "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: () => void r.refresh?.(),
										title: I._({ id: "lCF0wC" }),
										children: [/* @__PURE__ */ b(dc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "lCF0wC" })]
									}),
									T && /* @__PURE__ */ b("button", {
										type: "button",
										className: "inline-flex items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: T,
										title: I._({ id: "6buwPb" }),
										"aria-label": I._({ id: "6buwPb" }),
										children: /* @__PURE__ */ b(jc, { className: "h-3.5 w-3.5" })
									}),
									w && /* @__PURE__ */ b("button", {
										type: "button",
										className: `inline-flex items-center justify-center rounded-lg border p-1.5 ${C ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: w,
										title: C ? I._({ id: "sQpDn6" }) : I._({ id: "3qkggm" }),
										"aria-label": C ? I._({ id: "sQpDn6" }) : I._({ id: "3qkggm" }),
										"aria-pressed": C,
										children: b(C ? pc : hc, { className: "h-3.5 w-3.5" })
									})
								]
							})
						]
					}),
					/* @__PURE__ */ x("div", {
						className: "flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-white/40 px-5 py-1.5",
						children: [
							z === "board" && /* @__PURE__ */ x("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ b(Zc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ x("select", {
									className: Ve,
									value: L,
									onChange: (e) => void r.setConfig({ groupBy: e.target.value }),
									children: [
										/* @__PURE__ */ b("option", {
											value: "status",
											children: I._({ id: "OepdfE" })
										}),
										/* @__PURE__ */ b("option", {
											value: "priority",
											children: I._({ id: "y9cj46" })
										}),
										/* @__PURE__ */ b("option", {
											value: "assignee",
											children: I._({ id: "AxAubu" })
										})
									]
								})]
							}),
							z === "board" && /* @__PURE__ */ x("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ b(_c, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ x("select", {
									className: Ve,
									value: Me ?? "",
									onChange: (e) => void r.setConfig({ swimlaneBy: e.target.value || void 0 }),
									children: [/* @__PURE__ */ b("option", {
										value: "",
										children: I._({ id: "KjXDqG" })
									}), [
										"status",
										"priority",
										"assignee"
									].filter((e) => e !== L).map((e) => /* @__PURE__ */ b("option", {
										value: e,
										children: e === "status" ? I._({ id: "ucJg3u" }) : e === "priority" ? I._({ id: "jUbC3Z" }) : I._({ id: "lHxVTh" })
									}, e))]
								})]
							}),
							z !== "calendar" && /* @__PURE__ */ x("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ b(yc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ x("select", {
									className: Ve,
									value: pe,
									onChange: (e) => me(e.target.value),
									children: [
										/* @__PURE__ */ b("option", {
											value: "manual",
											children: I._({ id: "8lE269" })
										}),
										/* @__PURE__ */ b("option", {
											value: "due",
											children: I._({ id: "fYcKtB" })
										}),
										/* @__PURE__ */ b("option", {
											value: "priority",
											children: I._({ id: "WSP6v1" })
										}),
										/* @__PURE__ */ b("option", {
											value: "title",
											children: I._({ id: "p9yTeb" })
										})
									]
								})]
							}),
							/* @__PURE__ */ x(lc, {
								as: "div",
								className: "relative",
								children: [/* @__PURE__ */ x(ic, {
									className: `inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs ${he ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40"}`,
									children: [/* @__PURE__ */ b(zc, { className: "h-3.5 w-3.5" }), he ? `${he.prop}: ${he.value || I._({ id: "EbMPZJ" })}` : /* @__PURE__ */ b(M, { id: "o7J4JM" })]
								}), /* @__PURE__ */ x(ac, {
									anchor: "bottom start",
									className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${He}`,
									children: [
										he && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
											type: "button",
											className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => ge(null),
											children: [/* @__PURE__ */ b(dl, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "Q2mGA7" })]
										}) }), /* @__PURE__ */ b("div", { className: "my-1 border-t border-black/[0.05]" })] }),
										/* @__PURE__ */ b("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ b(M, { id: "1hKEom" })
										}),
										_l.map((e) => /* @__PURE__ */ b($, { children: /* @__PURE__ */ b("button", {
											type: "button",
											className: "flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => ge({
												prop: "priority",
												value: e
											}),
											children: e
										}) }, e)),
										Le.length > 0 && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ b(M, { id: "ojKCLU" })
										}), Le.map((e) => /* @__PURE__ */ b($, { children: /* @__PURE__ */ b("button", {
											type: "button",
											className: "flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => ge({
												prop: "assignee",
												value: e
											}),
											children: e
										}) }, e))] }),
										Re.length > 0 && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ b(M, { id: "OYHzN1" })
										}), Re.map((e) => /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
											type: "button",
											className: "flex w-full items-center gap-1 px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => ge({
												prop: "tag",
												value: e
											}),
											children: [/* @__PURE__ */ b(rl, { className: "h-3 w-3" }), e]
										}) }, e))] })
									]
								})]
							}),
							/* @__PURE__ */ x("div", {
								className: "relative ml-auto",
								children: [/* @__PURE__ */ b(Gc, { className: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" }), /* @__PURE__ */ b("input", {
									className: `${Ve} w-44 pl-7`,
									placeholder: I._({ id: "JTYvAw" }),
									value: de,
									onChange: (e) => fe(e.target.value)
								})]
							})
						]
					}),
					i && /* @__PURE__ */ b("div", {
						className: "bg-amber-50 px-5 py-1.5 text-xs text-amber-700",
						children: /* @__PURE__ */ b("span", {
							className: "truncate",
							children: i
						})
					}),
					z === "table" ? /* @__PURE__ */ b(Kl, {
						cards: zl(Fe, pe),
						statusName: ze,
						today: Ae,
						doneKey: De,
						selectedId: Be?.id,
						onSelect: Ue
					}) : z === "calendar" ? /* @__PURE__ */ b(Jl, {
						cards: Fe,
						today: Ae,
						doneKey: De,
						mode: e.calendarMode ?? "month",
						onModeChange: (e) => void r.setConfig({ calendarMode: e }),
						selectedId: Be?.id,
						onSelect: Ue
					}) : Ne && Me ? /* @__PURE__ */ b(Yl, {
						cards: Fe,
						columns: je,
						lanes: Pe,
						groupKey: L,
						swimlaneKey: Me,
						today: Ae,
						doneKey: De,
						selectedId: Be?.id,
						onSelect: Ue
					}) : /* @__PURE__ */ x("div", {
						className: "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4",
						children: [je.map((e, t) => {
							let i = zl(Fe.filter((t) => Pl(t, L) === e.key), pe), s = (t) => !!ye && ke && te?.col === e.key && te.index === t, c = R && De === e.key, l = j === e.key, u = R && e.limit != null && i.length > e.limit, d = e.color ?? bl[t % bl.length];
							return N.has(e.key) ? /* @__PURE__ */ x("button", {
								type: "button",
								"data-col-key": e.key,
								onClick: () => $e(e.key),
								title: I._({ id: "AC9Gkf" }),
								className: `flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-[#f6faf7] py-2 text-stone-500 hover:border-brand/40 ${l ? "border-brand/60" : "border-black/[0.05]"}`,
								children: [
									/* @__PURE__ */ b(kc, { className: "h-4 w-4" }),
									(Oe || e.color) && /* @__PURE__ */ b("span", {
										className: "h-2 w-2 rounded-full",
										style: { backgroundColor: d },
										"aria-hidden": !0
									}),
									/* @__PURE__ */ b("span", {
										className: "rounded-full bg-white px-1.5 text-[11px] text-stone-400",
										children: i.length
									}),
									/* @__PURE__ */ b("span", {
										className: "mt-1 whitespace-nowrap text-xs font-medium text-stone-600 [writing-mode:vertical-rl]",
										children: e.name
									})
								]
							}, e.key) : /* @__PURE__ */ x("div", {
								"data-col-key": e.key,
								className: `flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-[#f6faf7] transition-opacity ${xe === e.key ? "opacity-50" : ""} ${l ? "border-brand/60" : te?.col === e.key ? "border-brand/40" : "border-black/[0.05]"}`,
								children: [/* @__PURE__ */ x("div", {
									className: "flex items-center justify-between gap-1 rounded-t-xl px-3 py-2",
									style: Oe ? { backgroundColor: `${d}1f` } : void 0,
									children: [/* @__PURE__ */ x("div", {
										onPointerDown: (t) => Xe(t, e),
										onPointerMove: (t) => Ze(t, e),
										onPointerUp: (t) => Qe(t, e),
										className: `flex min-w-0 flex-1 select-none items-center gap-1.5 text-sm font-medium text-stone-700 ${R && r.reorderColumns ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
										children: [
											/* @__PURE__ */ b("button", {
												type: "button",
												onClick: () => $e(e.key),
												title: I._({ id: "pwN6Ae" }),
												className: "-ml-1 rotate-90 rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
												children: /* @__PURE__ */ b(kc, { className: "h-3.5 w-3.5" })
											}),
											(Oe || e.color) && /* @__PURE__ */ b("span", {
												className: "h-2 w-2 rounded-full",
												style: { backgroundColor: d },
												"aria-hidden": !0
											}),
											/* @__PURE__ */ b("span", {
												className: "truncate",
												children: e.name || I._({ id: "EbMPZJ" })
											}),
											c && /* @__PURE__ */ b(Tc, {
												className: "h-3.5 w-3.5 shrink-0 text-emerald-500",
												title: I._({ id: "_5CsXX" })
											}),
											/* @__PURE__ */ x("span", {
												className: `rounded-full px-1.5 text-xs ${u ? "bg-red-100 font-medium text-red-600" : "bg-white text-stone-400"}`,
												title: e.limit == null ? void 0 : I._({
													id: "d5z6xQ",
													values: { 0: e.limit }
												}),
												children: [i.length, e.limit == null ? "" : `/${e.limit}`]
											})
										]
									}), R && !E && We && /* @__PURE__ */ x(lc, {
										as: "div",
										className: "relative shrink-0",
										children: [/* @__PURE__ */ b(ic, {
											className: "rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
											children: /* @__PURE__ */ b(Fc, { className: "h-4 w-4" })
										}), /* @__PURE__ */ x(ac, {
											anchor: "bottom end",
											className: `z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${He}`,
											children: [
												r.renameColumn && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.renameColumn?.(e.key),
													children: [/* @__PURE__ */ b(qc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "2wxgft" })]
												}) }),
												r.toggleDoneColumn && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.toggleDoneColumn?.(e.key),
													children: [/* @__PURE__ */ b(Tc, { className: "h-3.5 w-3.5" }), c ? /* @__PURE__ */ b(M, { id: "G4qrLy" }) : /* @__PURE__ */ b(M, { id: "wtw-au" })]
												}) }),
												r.setColumnLimit && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.setColumnLimit?.(e.key),
													children: [/* @__PURE__ */ b(zc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "Iw6WJa" })]
												}) }),
												r.setColumnColor && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ x("div", {
													className: "px-3 py-1",
													children: [/* @__PURE__ */ b("span", {
														className: "text-[11px] text-brand-gray",
														children: /* @__PURE__ */ b(M, { id: "jZlrte" })
													}), /* @__PURE__ */ x("div", {
														className: "mt-1 flex flex-wrap items-center gap-1.5",
														children: [bl.map((t) => /* @__PURE__ */ b("button", {
															type: "button",
															title: t,
															onClick: () => void r.setColumnColor?.(e.key, t),
															className: `h-4 w-4 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-offset-1 ring-stone-500" : ""}`,
															style: { backgroundColor: t }
														}, t)), /* @__PURE__ */ b("button", {
															type: "button",
															title: I._({ id: "H_SQFv" }),
															onClick: () => void r.setColumnColor?.(e.key, null),
															className: `flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${e.color ? "" : "ring-2 ring-offset-1 ring-stone-500"}`,
															children: /* @__PURE__ */ b("span", { className: "h-2 w-2 rounded-full bg-stone-300" })
														})]
													})]
												})] }),
												r.deleteColumn && /* @__PURE__ */ x(y, { children: [/* @__PURE__ */ b("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
													type: "button",
													disabled: je.length <= 1,
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 disabled:opacity-40 data-[focus]:bg-red-50",
													onClick: () => void r.deleteColumn?.(e.key),
													children: [/* @__PURE__ */ b(al, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "cnGeoo" })]
												}) })] })
											]
										})]
									})]
								}), /* @__PURE__ */ x("div", {
									className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2",
									children: [
										i.map((e, t) => {
											let i = e.due && e.due < Ae && e.columnKey !== De, a = Ie.get(e.id) ?? 0, o = e.priority && e.priority !== "none" || e.assignee || e.due || (e.taskTotal ?? 0) > 0 || e.tags.length > 0 || a > 0;
											return /* @__PURE__ */ x(n, { children: [s(t) && /* @__PURE__ */ b("div", { className: "mx-1 h-0.5 rounded bg-brand" }), /* @__PURE__ */ x("div", {
												role: "button",
												tabIndex: 0,
												"data-card-id": e.id,
												"data-card-index": t,
												onPointerDown: (t) => qe(t, e),
												onPointerMove: (t) => Je(t, e),
												onPointerUp: (t) => Ye(t, e),
												onKeyDown: (t) => {
													t.key === "Enter" && Ue(e);
												},
												className: `group relative block w-full cursor-pointer touch-none select-none rounded-lg bg-white p-2.5 text-left shadow-sm ring-1 transition hover:ring-brand/30 ${ye === e.id ? "opacity-40" : ""} ${Be?.id === e.id ? "ring-brand/60" : "ring-black/[0.04]"}`,
												children: [
													!E && /* @__PURE__ */ b("div", {
														className: "absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
														onClick: (e) => e.stopPropagation(),
														onMouseDown: (e) => e.stopPropagation(),
														onPointerDown: (e) => e.stopPropagation(),
														children: /* @__PURE__ */ x(lc, {
															as: "div",
															children: [/* @__PURE__ */ b(ic, {
																className: "rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
																children: /* @__PURE__ */ b(Fc, { className: "h-4 w-4" })
															}), /* @__PURE__ */ x(ac, {
																anchor: "bottom end",
																className: `z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${He}`,
																children: [
																	r.openCardFull && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => r.openCardFull?.(e),
																		children: [/* @__PURE__ */ b(hc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "Ik60OC" })]
																	}) }),
																	r.copyCardLink && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.copyCardLink?.(e),
																		children: [/* @__PURE__ */ b(Vc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "y1eoq1" })]
																	}) }),
																	r.duplicateCard && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.duplicateCard?.(e),
																		children: [/* @__PURE__ */ b(Nc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "euc6Ns" })]
																	}) }),
																	r.saveAsTemplate && /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.saveAsTemplate?.(e),
																		children: [/* @__PURE__ */ b(xc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "BnmEvM" })]
																	}) }),
																	/* @__PURE__ */ b("div", { className: "my-1 border-t border-black/[0.05]" }),
																	/* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 data-[focus]:bg-red-50",
																		onClick: () => void r.deleteCard(e),
																		children: [/* @__PURE__ */ b(al, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "cnGeoo" })]
																	}) })
																]
															})]
														})
													}),
													e.ticket && /* @__PURE__ */ b("span", {
														className: "mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
														children: e.ticket
													}),
													/* @__PURE__ */ x("span", {
														className: "block pr-5 text-sm text-stone-800",
														children: [e.icon && /* @__PURE__ */ b("span", {
															className: "mr-1",
															children: e.icon
														}), e.title]
													}),
													e.excerpt && e.excerpt !== e.title && /* @__PURE__ */ b("span", {
														className: "mt-0.5 block truncate text-[11px] text-stone-400",
														children: e.excerpt
													}),
													o && /* @__PURE__ */ x("span", {
														className: "mt-1.5 flex flex-wrap items-center gap-1.5",
														children: [
															a > 0 && /* @__PURE__ */ x("span", {
																className: "inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600",
																title: I._({
																	id: "x52RAh",
																	values: { blockedCount: a }
																}),
																children: [/* @__PURE__ */ b(Uc, { className: "h-3 w-3" }), a]
															}),
															e.priority && e.priority !== "none" && /* @__PURE__ */ b("span", {
																className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${yl[e.priority] ?? "bg-stone-100 text-stone-500"}`,
																children: e.priority
															}),
															(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ x("span", {
																className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																children: [
																	/* @__PURE__ */ b(Tc, { className: "h-3 w-3" }),
																	e.taskDone,
																	"/",
																	e.taskTotal
																]
															}),
															e.tags.map((e) => /* @__PURE__ */ x("span", {
																className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
																style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
																children: [/* @__PURE__ */ b(rl, { className: "h-3 w-3" }), e.label]
															}, e.label)),
															e.assignee && /* @__PURE__ */ x("span", {
																className: "inline-flex items-center gap-0.5 text-[11px] text-brand-gray",
																children: [/* @__PURE__ */ b(sl, { className: "h-3 w-3" }), e.assignee]
															}),
															e.due && /* @__PURE__ */ x("span", {
																className: `inline-flex items-center gap-0.5 text-[11px] ${i ? "font-medium text-red-600" : "text-brand-gray"}`,
																children: [/* @__PURE__ */ b(Cc, { className: "h-3 w-3" }), e.due]
															})
														]
													})
												]
											})] }, e.id);
										}),
										i.length === 0 ? ye && te?.col === e.key && /* @__PURE__ */ b("div", { className: "mx-1 h-14 rounded-lg border-2 border-dashed border-brand/50 bg-brand-soft/30" }) : s(i.length) && /* @__PURE__ */ b("div", { className: "mx-1 h-0.5 rounded bg-brand" }),
										E ? null : P === e.key ? /* @__PURE__ */ b("textarea", {
											autoFocus: !0,
											rows: 2,
											className: "w-full resize-none rounded-lg bg-white p-2 text-sm text-stone-800 shadow-sm ring-1 ring-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40",
											placeholder: I._({ id: "u2IprG" }),
											value: oe,
											onChange: (e) => se(e.target.value),
											onKeyDown: (t) => {
												if (t.key === "Enter" && !t.shiftKey) {
													t.preventDefault();
													let n = oe;
													se(""), ae(null), et(e.key, n);
												}
												t.key === "Escape" && (se(""), ae(null));
											},
											onBlur: () => {
												oe.trim() && et(e.key, oe), se(""), ae(null);
											}
										}) : a && a.length > 0 && o ? /* @__PURE__ */ x(lc, {
											as: "div",
											className: "relative",
											children: [/* @__PURE__ */ x(ic, {
												className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
												children: [/* @__PURE__ */ b(Yc, { className: "h-4 w-4" }), /* @__PURE__ */ b(M, { id: "pnrmSP" })]
											}), /* @__PURE__ */ x(ac, {
												anchor: "bottom start",
												className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${He}`,
												children: [
													/* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => {
															se(""), ae(e.key);
														},
														children: [/* @__PURE__ */ b(qc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b(M, { id: "UQOvxZ" })]
													}) }),
													/* @__PURE__ */ b("div", { className: "my-1 border-t border-black/[0.05]" }),
													/* @__PURE__ */ b("div", {
														className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
														children: /* @__PURE__ */ b(M, { id: "iTylMl" })
													}),
													a.map((t) => /* @__PURE__ */ b($, { children: /* @__PURE__ */ x("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void o(e.key, t.id),
														children: [/* @__PURE__ */ b(xc, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ b("span", {
															className: "truncate",
															children: t.name
														})]
													}) }, t.id))
												]
											})]
										}) : /* @__PURE__ */ x("button", {
											type: "button",
											className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
											onClick: () => {
												se(""), ae(e.key);
											},
											children: [/* @__PURE__ */ b(Yc, { className: "h-4 w-4" }), /* @__PURE__ */ b(M, { id: "pnrmSP" })]
										})
									]
								})]
							}, e.key);
						}), R && !E && r.addColumn && (ce ? /* @__PURE__ */ b("input", {
							autoFocus: !0,
							className: "w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40",
							placeholder: I._({ id: "iYVqZq" }),
							value: ue,
							onChange: (e) => F(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									let e = ue.trim();
									F(""), le(!1), e && r.addColumn?.(e);
								}
								e.key === "Escape" && (F(""), le(!1));
							},
							onBlur: () => {
								let e = ue.trim();
								e && r.addColumn?.(e), F(""), le(!1);
							}
						}) : /* @__PURE__ */ x("button", {
							type: "button",
							className: "flex w-44 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 hover:border-brand/40 hover:text-brand-dark",
							onClick: () => {
								F(""), le(!0);
							},
							children: [/* @__PURE__ */ b(Yc, { className: "h-4 w-4" }), /* @__PURE__ */ b(M, { id: "AgvHni" })]
						}))]
					})
				]
			}),
			Be && O && /* @__PURE__ */ x("div", {
				className: "absolute right-0 top-0 z-30 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.07)]",
				style: { width: _e },
				children: [/* @__PURE__ */ b("div", {
					onMouseDown: (e) => {
						e.preventDefault();
						let t = e.clientX, n = _e, r = (e) => ve(Math.min(640, Math.max(300, n + (t - e.clientX)))), i = () => {
							window.removeEventListener("mousemove", r), window.removeEventListener("mouseup", i);
						};
						window.addEventListener("mousemove", r), window.addEventListener("mouseup", i);
					},
					title: I._({ id: "AVreQ5" }),
					className: "absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-brand/40"
				}), /* @__PURE__ */ b(O, {
					card: Be,
					statusOptions: e.columns.map((e) => ({
						value: e.key,
						label: e.name
					})),
					assigneeOptions: s,
					tagOptions: c,
					fields: e.fields,
					onAddField: (t) => {
						let n = /* @__PURE__ */ new Set([...xl, ...(e.fields ?? []).map((e) => e.key)]), i = Nl(t);
						if (n.has(i)) {
							let e = 2;
							for (; n.has(`${i}-${e}`);) e += 1;
							i = `${i}-${e}`;
						}
						r.setConfig({ fields: [...e.fields ?? [], {
							key: i,
							label: t
						}] });
					},
					dependencyCards: t.filter((e) => e.id !== Be.id).map((e) => ({
						slug: Al(e),
						title: e.title
					})),
					loadNotes: l,
					onUploadAttachment: u,
					loadComments: f,
					addComment: p,
					deleteComment: m,
					currentUser: v,
					loadActivity: S,
					onChange: (e) => void r.updateCard(Be.id, e),
					onClose: () => A(null),
					onDelete: () => void r.deleteCard(Be),
					onOpenFull: r.openCardFull ? () => r.openCardFull?.(Be) : void 0
				})]
			}),
			ye && Ce && (() => {
				let e = t.find((e) => e.id === ye);
				return /* @__PURE__ */ x("div", {
					className: "pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-xl ring-1 ring-brand/40",
					style: {
						left: Ce.x,
						top: Ce.y
					},
					children: [e?.icon && /* @__PURE__ */ b("span", {
						className: "mr-1",
						children: e.icon
					}), e?.title]
				});
			})()
		]
	});
}
//#endregion
//#region ../../shared/lib/frontmatter.ts
function Zl(e) {
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
function Ql(e, t) {
	let n = Zl(e), r = {
		...n.data,
		...t
	};
	return `---\n${Object.entries(r).filter(([, e]) => e !== "").map(([e, t]) => `${e}: ${t}`).join("\n")}\n---\n\n${n.body.trimStart()}`;
}
//#endregion
//#region src/client.ts
var $l = class extends Error {
	status;
	code;
	constructor(e, t) {
		super(`jtype API error${e ? ` ${e}` : ""}: ${t}`), this.name = "JTypeApiError", this.status = e, this.code = t;
	}
};
function eu(e) {
	let t = (e.baseUrl ?? "").replace(/\/+$/, ""), n = e.token, r = e.fetchImpl ?? ((...e) => fetch(...e));
	if (!t) throw new $l(0, "base_url_required");
	if (!n) throw new $l(0, "token_required");
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
			throw new $l(0, "network_error");
		}
		if (!a.ok) {
			let e = await a.json().catch(() => null);
			throw new $l(a.status, e?.error || `http_${a.status}`);
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
var tu = class extends Error {
	code;
	candidates;
	constructor(e, t, n = []) {
		super(t ? `${e}: ${t}` : e), this.name = "JTypeBoardError", this.code = e, this.candidates = n;
	}
};
function nu(e, t) {
	let n = t.trim().replace(/^\.?\//, "");
	if (!n) throw new tu("board_not_found", "empty boardRef");
	let r = n.toLowerCase(), i = r.endsWith(".board") ? r : `${r}.board`, a = e.filter((e) => e.relativePath.toLowerCase().endsWith(".board")), o = a.find((e) => {
		let t = e.relativePath.toLowerCase();
		return t === r || t === i;
	});
	if (o) return ru(o);
	let s = a.filter((e) => e.relativePath.toLowerCase().endsWith(`/${i}`));
	if (s.length === 1) return ru(s[0]);
	throw s.length > 1 ? new tu("board_ref_ambiguous", `"${t}" matches ${s.length} boards`, s.map((e) => e.relativePath)) : new tu("board_not_found", `no .board document matches "${t}"`);
}
function ru(e) {
	return {
		boardDocId: e.id,
		boardRelativePath: e.relativePath,
		boardDir: e.relativePath.replace(/\.board$/i, "")
	};
}
//#endregion
//#region src/boardData.ts
function iu(e, t) {
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
		swimlaneBy: e.swimlaneBy,
		groupBy: e.groupBy || "status"
	};
}
function au(e, t) {
	let n = Zl(e.content);
	if (n.data.board !== t.id) return null;
	let r = Sl(n.body);
	return {
		id: e.relativePath,
		columnKey: n.data.status || "",
		position: Number(n.data.position ?? 0),
		title: n.data.title || e.title || e.relativePath,
		icon: n.data.icon || null,
		priority: n.data.priority || null,
		assignee: n.data.assignee || null,
		due: n.data.due || null,
		tags: Dl(n.data.tags ? wl(n.data.tags) : [], t.labels),
		notes: n.body,
		taskDone: r.done,
		taskTotal: r.total,
		excerpt: Cl(n.body),
		attachments: n.data.attachments ? fl(n.data.attachments) : [],
		custom: gl(n.data, t.fields),
		blockedBy: n.data.blocked_by ? Ol(n.data.blocked_by) : [],
		blocks: n.data.blocks ? Ol(n.data.blocks) : [],
		relates: n.data.relates ? Ol(n.data.relates) : []
	};
}
function ou(e, t) {
	let { data: n, body: r } = Zl(e), i = { ...n };
	if (t.title !== void 0 && (i.title = t.title), t.columnKey !== void 0 && (i.status = t.columnKey), t.priority !== void 0 && (i.priority = t.priority ?? ""), t.assignee !== void 0 && (i.assignee = t.assignee ?? ""), t.due !== void 0 && (i.due = t.due ?? ""), t.icon !== void 0 && (i.icon = t.icon ?? ""), t.tags !== void 0 && (i.tags = t.tags.map((e) => e.label).join(", ")), t.attachments !== void 0 && (i.attachments = pl(t.attachments)), t.custom !== void 0) for (let [e, n] of Object.entries(t.custom)) i[e] = n ?? "";
	return t.blockedBy !== void 0 && (i.blocked_by = kl(t.blockedBy)), t.blocks !== void 0 && (i.blocks = kl(t.blocks)), t.relates !== void 0 && (i.relates = kl(t.relates)), Ql(t.notes === void 0 ? r : t.notes, i);
}
var su = [
	"viewType",
	"groupBy",
	"swimlaneBy",
	"calendarMode"
];
function cu(e, t) {
	let n = { ...e };
	for (let e of su) e in t && (n[e] = t[e]);
	return n;
}
async function lu(e, t, n, r) {
	let i = await e.listDocuments(t), a = nu(i, n), o = async (n, i) => {
		let a = r.get(n);
		if (a && a.contentHash === i) return a.doc;
		let o = await e.getDocument(t, n);
		return r.set(n, {
			contentHash: o.contentHash,
			doc: o
		}), o;
	}, s = i.find((e) => e.id === a.boardDocId), c = await o(s.id, s.contentHash), l;
	try {
		if (l = JSON.parse(c.content), !l || typeof l != "object" || !Array.isArray(l.columns)) throw Error("missing columns");
	} catch (e) {
		throw new tu("board_config_invalid", `${a.boardRelativePath}: ${String(e)}`);
	}
	let u = i.filter((e) => e.relativePath.startsWith(`${a.boardDir}/`) && e.relativePath.toLowerCase().endsWith(".md")), d = await Promise.all(u.map(async (e) => ({
		item: e,
		doc: await o(e.id, e.contentHash)
	}))), f = /* @__PURE__ */ new Map(), p = [];
	for (let { item: e, doc: t } of d) {
		let n = au(t, l);
		n && (f.set(t.relativePath, {
			id: e.id,
			relativePath: t.relativePath,
			content: t.content,
			contentHash: t.contentHash
		}), p.push(n));
	}
	let m = new Set(i.map((e) => e.id));
	for (let e of [...r.keys()]) m.has(e) || r.delete(e);
	return {
		config: l,
		boardDocId: a.boardDocId,
		boardRelativePath: a.boardRelativePath,
		boardDir: a.boardDir,
		boardDoc: {
			content: c.content,
			contentHash: c.contentHash
		},
		cards: p,
		metaByPath: f
	};
}
//#endregion
//#region src/CardDetail.tsx
function uu({ card: e, config: t, strings: n, onClose: r }) {
	d(() => {
		let e = (e) => {
			e.key === "Escape" && r();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [r]);
	let i = t.columns.find((t) => t.key === e.columnKey)?.name || e.columnKey, a = [
		[n.status, i],
		...e.priority && e.priority !== "none" ? [[n.priority, e.priority]] : [],
		...e.assignee ? [[n.assignee, e.assignee]] : [],
		...e.due ? [[n.due, e.due]] : [],
		...(t.fields ?? []).map((t) => [t.label, e.custom?.[t.key] ?? ""]).filter(([, e]) => e !== "")
	];
	return /* @__PURE__ */ x("aside", {
		className: "absolute right-0 top-0 z-40 flex h-full w-[360px] max-w-[92%] flex-col border-l border-black/[0.06] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.07)]",
		"aria-label": n.cardReadOnlyHint,
		children: [/* @__PURE__ */ x("div", {
			className: "flex items-center justify-between border-b border-black/[0.05] px-3 py-2",
			children: [/* @__PURE__ */ b("span", {
				className: "text-xs font-medium text-brand-gray",
				children: n.cardReadOnlyHint
			}), /* @__PURE__ */ b("button", {
				type: "button",
				onClick: r,
				title: n.close,
				"aria-label": n.close,
				className: "rounded p-1 text-stone-400 hover:bg-stone-100",
				children: /* @__PURE__ */ b("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.5",
					className: "h-4 w-4",
					"aria-hidden": !0,
					children: /* @__PURE__ */ b("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						d: "M6 18 18 6M6 6l12 12"
					})
				})
			})]
		}), /* @__PURE__ */ x("div", {
			className: "min-h-0 flex-1 overflow-y-auto p-3",
			children: [
				e.ticket && /* @__PURE__ */ b("span", {
					className: "mb-1 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
					children: e.ticket
				}),
				/* @__PURE__ */ x("h2", {
					className: "text-base font-semibold text-stone-900",
					children: [e.icon && /* @__PURE__ */ b("span", {
						className: "mr-1",
						children: e.icon
					}), e.title]
				}),
				/* @__PURE__ */ x("dl", {
					className: "mt-3 grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1.5",
					children: [a.map(([e, t]) => /* @__PURE__ */ x("div", {
						className: "contents",
						children: [/* @__PURE__ */ b("dt", {
							className: "truncate text-xs text-brand-gray",
							title: e,
							children: e
						}), /* @__PURE__ */ b("dd", {
							className: "text-sm text-stone-800",
							children: e === n.priority ? /* @__PURE__ */ b("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${yl[t] ?? "bg-stone-100 text-stone-500"}`,
								children: t
							}) : t
						})]
					}, e)), e.tags.length > 0 && /* @__PURE__ */ x("div", {
						className: "contents",
						children: [/* @__PURE__ */ b("dt", {
							className: "text-xs text-brand-gray",
							children: n.tags
						}), /* @__PURE__ */ b("dd", {
							className: "flex flex-wrap gap-1",
							children: e.tags.map((e) => /* @__PURE__ */ b("span", {
								className: "rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
								style: { backgroundColor: e.color ? `${e.color}22` : "rgba(0,136,132,0.10)" },
								children: e.label
							}, e.label))
						})]
					})]
				}),
				(e.attachments?.length ?? 0) > 0 && /* @__PURE__ */ x("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ b("span", {
						className: "text-xs font-medium text-brand-gray",
						children: n.attachments
					}), /* @__PURE__ */ b("ul", {
						className: "mt-1 space-y-1",
						children: e.attachments.map((e) => /* @__PURE__ */ b("li", {
							className: "rounded border border-stone-200 px-2 py-1 text-xs",
							children: hl(e) ? /* @__PURE__ */ b("a", {
								href: e,
								target: "_blank",
								rel: "noreferrer",
								className: "block truncate text-brand-dark hover:underline",
								title: e,
								children: ml(e)
							}) : /* @__PURE__ */ x("span", {
								className: "block truncate text-stone-500",
								title: e,
								children: [
									ml(e),
									" ",
									/* @__PURE__ */ x("span", {
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
				e.notes && e.notes.trim() !== "" && /* @__PURE__ */ x("div", {
					className: "mt-4",
					children: [/* @__PURE__ */ b("span", {
						className: "text-xs font-medium text-brand-gray",
						children: n.notes
					}), /* @__PURE__ */ b("pre", {
						className: "mt-1.5 whitespace-pre-wrap rounded-lg border border-stone-100 bg-stone-50/60 p-2 font-mono text-[12px] leading-5 text-stone-800",
						children: e.notes
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/i18n.ts
var du = {
	en: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1DBGsz\":[\"Notes\"],\"1YABGm\":[\"Link (Ctrl+K)\"],\"1hKEom\":[\"Priority\"],\"1lWHP7\":[\"unsafe\"],\"1xwZj_\":[\"Previous month\"],\"2wxgft\":[\"Rename\"],\"3qkggm\":[\"Fullscreen\"],\"4gdyen\":[\"Local (yours)\"],\"4hJhzz\":[\"Table\"],\"54sFiP\":[\"flowchart TD\\n  A[Start] --> B[End]\"],\"5Q_DQ6\":[\"Inline Code\"],\"7VpPHA\":[\"Confirm\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid diagram\"],\"8hSn0h\":[\"Result (editable)\"],\"8lE269\":[\"Sort: Manual\"],\"9gxam6\":[\"Could not render this Draw.io diagram.\"],\"AC9Gkf\":[\"Expand column\"],\"AS5WO9\":[\"Could not render this PDF.\"],\"AVreQ5\":[\"Drag to resize\"],\"AgvHni\":[\"Add column\"],\"AjVXBS\":[\"Calendar\"],\"AxAubu\":[\"Group: Assignee\"],\"BfMZ7w\":[\"Accept cloud\"],\"BnmEvM\":[\"Save as template\"],\"C6-ZRl\":[\"Someone\"],\"EWPtMO\":[\"Code\"],\"EbMPZJ\":[\"Unassigned\"],\"G4qrLy\":[\"Unset done column\"],\"GKu3m4\":[\"No labels\"],\"Gpfctt\":[\"Due\"],\"H_SQFv\":[\"No color\"],\"HajiZl\":[\"Month\"],\"I6SWEy\":[\"Split\"],\"ICip_B\":[\"Cloud (remote)\"],\"Ik60OC\":[\"Open in editor\"],\"Iw6WJa\":[\"Set WIP limit\"],\"JTYvAw\":[\"Search cards\"],\"K_F6pa\":[\"Saving…\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"Bold\"],\"KvW1VO\":[\"Draw.io diagram\"],\"LQn6-8\":[\"Accept local\"],\"MHrjPM\":[\"Title\"],\"Mm72la\":[\"No comments yet\"],\"NBdIgR\":[\"Comment\"],\"ONWvwQ\":[\"Upload\"],\"OYHzN1\":[\"Tags\"],\"OepdfE\":[\"Group: Status\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"Clear filter\"],\"QD8opX\":[\"Board\"],\"QlsPZy\":[\"Write Mermaid syntax to see the diagram.\"],\"S5Qbb1\":[\"comma, separated\"],\"TdfEV7\":[\"Archived\"],\"UQOvxZ\":[\"Blank card\"],\"VNa_N2\":[\"This file type can not be previewed yet.\"],\"VbyRUy\":[\"Comments\"],\"WSP6v1\":[\"Sort: Priority\"],\"X03-eC\":[\"Please enter a value.\"],\"XJOV1Y\":[\"Activity\"],\"Ya7bZl\":[\"Diagram error\"],\"Zot9XS\":[\"No cards\"],\"_5CsXX\":[\"Done column\"],\"_EsjyQ\":[\"Use this\"],\"a6uhHr\":[\"Bold (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"Add details...\"],\"agOeRN\":[\"Could not render this API specification.\"],\"b4hVKD\":[\"Color columns\"],\"cJ44lA\":[\"Unscheduled\"],\"cfaWH-\":[\"Add labels\"],\"cnGeoo\":[\"Delete\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP limit \",[\"0\"]],\"dEgA5A\":[\"Cancel\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"Duplicate\"],\"fYcKtB\":[\"Sort: Due\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"Untitled card\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF document\"],\"i4_LY_\":[\"Write\"],\"iTylMl\":[\"Templates\"],\"iYVqZq\":[\"Column name\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"Color\"],\"kZlRKE\":[\"Mermaid source\"],\"kryGs-\":[\"Card\"],\"lCF0wC\":[\"Refresh\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"ltF1xa\":[\"Save merged result\"],\"nabda1\":[\"Delete card\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"Filter\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"Assignee\"],\"p9yTeb\":[\"Sort: Title\"],\"pKztsX\":[\"Open in full editor\"],\"pnrmSP\":[\"New card\"],\"pwN6Ae\":[\"Collapse column\"],\"pzutoc\":[\"Italic\"],\"rdUucN\":[\"Preview\"],\"sCzmvQ\":[\"cards\"],\"sQpDn6\":[\"Exit fullscreen\"],\"tK2x9T\":[\"⚠ \",[\"0\"],\" Conflict\",[\"1\"],\" to Resolve\"],\"t_YqKh\":[\"Remove\"],\"u2IprG\":[\"Card title (Enter to add, Esc to cancel)\"],\"uAQUqI\":[\"Status\"],\"ucJg3u\":[\"Swimlane: Status\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"Italic (Ctrl+I)\"],\"wtw-au\":[\"Set as done column\"],\"wwu18a\":[\"Icon\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"y1eoq1\":[\"Copy link\"],\"y9cj46\":[\"Group: Priority\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← Back to list\"],\"yz7wBu\":[\"Close\"],\"yzF66j\":[\"Link\"],\"zOc0vf\":[\"No icon\"],\"zga9sT\":[\"OK\"]}"),
	zh: JSON.parse("{\"--lIxB\":[\"被阻塞于\"],\"-b7T3G\":[\"更新\"],\"1DBGsz\":[\"备注\"],\"1YABGm\":[\"链接 (Ctrl+K)\"],\"1hKEom\":[\"优先级\"],\"1lWHP7\":[\"不安全\"],\"1xwZj_\":[\"上个月\"],\"2wxgft\":[\"重命名\"],\"3qkggm\":[\"全屏\"],\"4gdyen\":[\"本地（我的）\"],\"4hJhzz\":[\"表格\"],\"54sFiP\":[\"flowchart TD\\n  A[开始] --> B[结束]\"],\"5Q_DQ6\":[\"行内代码\"],\"7VpPHA\":[\"确认\"],\"7s3WlU\":[\"阻塞\"],\"8PifYj\":[\"Mermaid 图表\"],\"8hSn0h\":[\"结果（可编辑）\"],\"8lE269\":[\"排序:手动\"],\"9gxam6\":[\"无法渲染此 Draw.io 图表。\"],\"AC9Gkf\":[\"展开列\"],\"AS5WO9\":[\"无法渲染此 PDF。\"],\"AVreQ5\":[\"拖动调整宽度\"],\"AgvHni\":[\"添加列\"],\"AjVXBS\":[\"日历\"],\"AxAubu\":[\"分组:负责人\"],\"BfMZ7w\":[\"接受云端\"],\"BnmEvM\":[\"存为模板\"],\"C6-ZRl\":[\"某人\"],\"EWPtMO\":[\"代码\"],\"EbMPZJ\":[\"未分配\"],\"G4qrLy\":[\"取消完成列\"],\"GKu3m4\":[\"暂无标签\"],\"Gpfctt\":[\"截止日期\"],\"H_SQFv\":[\"无颜色\"],\"HajiZl\":[\"月\"],\"I6SWEy\":[\"分栏\"],\"ICip_B\":[\"云端（远程）\"],\"Ik60OC\":[\"在编辑器中打开\"],\"Iw6WJa\":[\"设置 WIP 限制\"],\"JTYvAw\":[\"搜索卡片\"],\"K_F6pa\":[\"保存中…\"],\"KjXDqG\":[\"泳道：无\"],\"KmydK6\":[\"粗体\"],\"KvW1VO\":[\"Draw.io 图表\"],\"LQn6-8\":[\"接受本地\"],\"MHrjPM\":[\"标题\"],\"Mm72la\":[\"暂无评论\"],\"NBdIgR\":[\"评论\"],\"ONWvwQ\":[\"上传\"],\"OYHzN1\":[\"标签\"],\"OepdfE\":[\"分组:状态\"],\"Pvpx7b\":[\"粘贴 URL 或路径\"],\"Q2mGA7\":[\"清除筛选\"],\"QD8opX\":[\"看板\"],\"QlsPZy\":[\"输入 Mermaid 语法以查看图表。\"],\"S5Qbb1\":[\"用逗号分隔\"],\"TdfEV7\":[\"归档\"],\"UQOvxZ\":[\"空白卡片\"],\"VNa_N2\":[\"暂不支持预览此文件类型。\"],\"VbyRUy\":[\"评论\"],\"WSP6v1\":[\"排序:优先级\"],\"X03-eC\":[\"请输入内容。\"],\"XJOV1Y\":[\"活动\"],\"Ya7bZl\":[\"图表错误\"],\"Zot9XS\":[\"暂无卡片\"],\"_5CsXX\":[\"完成列\"],\"_EsjyQ\":[\"使用此版本\"],\"a6uhHr\":[\"粗体 (Ctrl+B)\"],\"aDvLhk\":[\"添加评论…\"],\"abUZlY\":[\"添加详情...\"],\"agOeRN\":[\"无法渲染此 API 规范。\"],\"b4hVKD\":[\"彩色列\"],\"cJ44lA\":[\"未排期\"],\"cfaWH-\":[\"添加标签\"],\"cnGeoo\":[\"删除\"],\"d-F6q9\":[\"创建\"],\"d5z6xQ\":[\"WIP 限制 \",[\"0\"]],\"dEgA5A\":[\"取消\"],\"ecUA8p\":[\"今天\"],\"euc6Ns\":[\"复制卡片\"],\"fYcKtB\":[\"排序:截止\"],\"g8JmSC\":[\"下个月\"],\"gANddk\":[\"上传中…\"],\"gLDJuJ\":[\"未命名卡片\"],\"hh4sEG\":[\"相关\"],\"hnK1gR\":[\"PDF 文档\"],\"i4_LY_\":[\"写作\"],\"iTylMl\":[\"模板\"],\"iYVqZq\":[\"列名称\"],\"jUbC3Z\":[\"泳道：优先级\"],\"jZlrte\":[\"颜色\"],\"kZlRKE\":[\"Mermaid 源码\"],\"kryGs-\":[\"卡片\"],\"lCF0wC\":[\"刷新\"],\"lHxVTh\":[\"泳道：负责人\"],\"ltF1xa\":[\"保存合并结果\"],\"nabda1\":[\"删除卡片\"],\"njJFtc\":[\"删除评论\"],\"o7J4JM\":[\"筛选\"],\"o8va6N\":[\"恢复\"],\"ojKCLU\":[\"负责人\"],\"p9yTeb\":[\"排序:标题\"],\"pKztsX\":[\"在完整编辑器中打开\"],\"pnrmSP\":[\"新建卡片\"],\"pwN6Ae\":[\"折叠列\"],\"pzutoc\":[\"斜体\"],\"rdUucN\":[\"预览\"],\"sCzmvQ\":[\"张卡片\"],\"sQpDn6\":[\"退出全屏\"],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 个冲突\",[\"1\"],\"待解决\"],\"t_YqKh\":[\"移除\"],\"u2IprG\":[\"卡片标题(回车添加,Esc 取消)\"],\"uAQUqI\":[\"状态\"],\"ucJg3u\":[\"泳道：状态\"],\"w7E-FA\":[\"已拦截不安全链接：\",[\"url\"]],\"w_Sphq\":[\"附件\"],\"wf6Djn\":[\"斜体 (Ctrl+I)\"],\"wtw-au\":[\"设为完成列\"],\"wwu18a\":[\"图标\"],\"x52RAh\":[\"被 \",[\"blockedCount\"],\" 张未完成卡片阻塞\"],\"xDsmP9\":[\"日程\"],\"y1eoq1\":[\"复制链接\"],\"y9cj46\":[\"分组:优先级\"],\"yEbJGs\":[\"+ 添加字段\"],\"ybGQtY\":[\"← 返回列表\"],\"yz7wBu\":[\"关闭\"],\"yzF66j\":[\"链接\"],\"zOc0vf\":[\"无图标\"],\"zga9sT\":[\"确定\"]}"),
	ja: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1DBGsz\":[\"ノート\"],\"1YABGm\":[\"リンク (Ctrl+K)\"],\"1hKEom\":[\"優先度\"],\"1lWHP7\":[\"unsafe\"],\"1xwZj_\":[\"Previous month\"],\"2wxgft\":[\"名前を変更\"],\"3qkggm\":[\"全画面表示\"],\"4gdyen\":[\"ローカル（自分の）\"],\"4hJhzz\":[\"表\"],\"54sFiP\":[\"flowchart TD\\n  A[開始] --> B[終了]\"],\"5Q_DQ6\":[\"インラインコード\"],\"7VpPHA\":[\"確認\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 図\"],\"8hSn0h\":[\"結果（編集可能）\"],\"8lE269\":[\"並べ替え：手動\"],\"9gxam6\":[\"この Draw.io 図をレンダリングできませんでした。\"],\"AC9Gkf\":[\"列を展開\"],\"AS5WO9\":[\"この PDF をレンダリングできませんでした。\"],\"AVreQ5\":[\"ドラッグしてサイズ変更\"],\"AgvHni\":[\"列を追加\"],\"AjVXBS\":[\"Calendar\"],\"AxAubu\":[\"グループ：担当者\"],\"BfMZ7w\":[\"クラウドを採用\"],\"BnmEvM\":[\"テンプレートとして保存\"],\"C6-ZRl\":[\"Someone\"],\"EWPtMO\":[\"コード\"],\"EbMPZJ\":[\"未割り当て\"],\"G4qrLy\":[\"完了列を解除\"],\"GKu3m4\":[\"ラベルなし\"],\"Gpfctt\":[\"期限\"],\"H_SQFv\":[\"色なし\"],\"HajiZl\":[\"Month\"],\"I6SWEy\":[\"分割\"],\"ICip_B\":[\"クラウド（リモート）\"],\"Ik60OC\":[\"エディターで開く\"],\"Iw6WJa\":[\"WIP 制限を設定\"],\"JTYvAw\":[\"カードを検索\"],\"K_F6pa\":[\"保存中…\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"太字\"],\"KvW1VO\":[\"Draw.io 図\"],\"LQn6-8\":[\"ローカルを採用\"],\"MHrjPM\":[\"タイトル\"],\"Mm72la\":[\"No comments yet\"],\"NBdIgR\":[\"Comment\"],\"ONWvwQ\":[\"Upload\"],\"OYHzN1\":[\"タグ\"],\"OepdfE\":[\"グループ：ステータス\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"フィルターをクリア\"],\"QD8opX\":[\"ボード\"],\"QlsPZy\":[\"Mermaid 構文を書くと図が表示されます。\"],\"S5Qbb1\":[\"カンマ区切り\"],\"TdfEV7\":[\"Archived\"],\"UQOvxZ\":[\"空のカード\"],\"VNa_N2\":[\"このファイル形式はまだプレビューできません。\"],\"VbyRUy\":[\"Comments\"],\"WSP6v1\":[\"並べ替え：優先度\"],\"X03-eC\":[\"値を入力してください。\"],\"XJOV1Y\":[\"Activity\"],\"Ya7bZl\":[\"図のエラー\"],\"Zot9XS\":[\"カードなし\"],\"_5CsXX\":[\"完了列\"],\"_EsjyQ\":[\"これを使用\"],\"a6uhHr\":[\"太字 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"詳細を追加...\"],\"agOeRN\":[\"この API 仕様をレンダリングできませんでした。\"],\"b4hVKD\":[\"色付き列\"],\"cJ44lA\":[\"Unscheduled\"],\"cfaWH-\":[\"ラベルを追加\"],\"cnGeoo\":[\"削除\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 制限 \",[\"0\"]],\"dEgA5A\":[\"キャンセル\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"複製\"],\"fYcKtB\":[\"並べ替え：期限\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"無題のカード\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF ドキュメント\"],\"i4_LY_\":[\"記述\"],\"iTylMl\":[\"テンプレート\"],\"iYVqZq\":[\"列名\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"カラー\"],\"kZlRKE\":[\"Mermaid ソース\"],\"kryGs-\":[\"カード\"],\"lCF0wC\":[\"更新\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"ltF1xa\":[\"マージ結果を保存\"],\"nabda1\":[\"カードを削除\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"フィルター\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"担当者\"],\"p9yTeb\":[\"並べ替え：タイトル\"],\"pKztsX\":[\"フルエディターで開く\"],\"pnrmSP\":[\"新規カード\"],\"pwN6Ae\":[\"列を折りたたむ\"],\"pzutoc\":[\"イタリック\"],\"rdUucN\":[\"プレビュー\"],\"sCzmvQ\":[\"枚のカード\"],\"sQpDn6\":[\"全画面表示を終了\"],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 件の競合\",[\"1\"],\"を解決中\"],\"t_YqKh\":[\"Remove\"],\"u2IprG\":[\"カードのタイトル（Enter で追加、Esc でキャンセル）\"],\"uAQUqI\":[\"ステータス\"],\"ucJg3u\":[\"Swimlane: Status\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"イタリック (Ctrl+I)\"],\"wtw-au\":[\"完了列に設定\"],\"wwu18a\":[\"アイコン\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"y1eoq1\":[\"リンクをコピー\"],\"y9cj46\":[\"グループ：優先度\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← リストに戻る\"],\"yz7wBu\":[\"閉じる\"],\"yzF66j\":[\"リンク\"],\"zOc0vf\":[\"アイコンなし\"],\"zga9sT\":[\"OK\"]}"),
	ko: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1DBGsz\":[\"노트\"],\"1YABGm\":[\"링크 (Ctrl+K)\"],\"1hKEom\":[\"우선순위\"],\"1lWHP7\":[\"unsafe\"],\"1xwZj_\":[\"Previous month\"],\"2wxgft\":[\"이름 변경\"],\"3qkggm\":[\"전체 화면\"],\"4gdyen\":[\"로컈 (내 것)\"],\"4hJhzz\":[\"테이블\"],\"54sFiP\":[\"flowchart TD\\n  A[시작] --> B[끝]\"],\"5Q_DQ6\":[\"인라인 코드\"],\"7VpPHA\":[\"확인\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 다이어그램\"],\"8hSn0h\":[\"결과 (편집 가능)\"],\"8lE269\":[\"정렬: 수동\"],\"9gxam6\":[\"이 Draw.io 다이어그램을 렌더링할 수 없습니다.\"],\"AC9Gkf\":[\"열 펼치기\"],\"AS5WO9\":[\"이 PDF를 렌더링할 수 없습니다.\"],\"AVreQ5\":[\"드래그하여 크기 조정\"],\"AgvHni\":[\"열 추가\"],\"AjVXBS\":[\"Calendar\"],\"AxAubu\":[\"그룹: 담당자\"],\"BfMZ7w\":[\"클라우드 수낙\"],\"BnmEvM\":[\"템플릿으로 저장\"],\"C6-ZRl\":[\"Someone\"],\"EWPtMO\":[\"코드\"],\"EbMPZJ\":[\"미할당\"],\"G4qrLy\":[\"완료 열 해제\"],\"GKu3m4\":[\"라벨 없음\"],\"Gpfctt\":[\"마감\"],\"H_SQFv\":[\"색상 없음\"],\"HajiZl\":[\"Month\"],\"I6SWEy\":[\"스플릿\"],\"ICip_B\":[\"클라우드 (원격)\"],\"Ik60OC\":[\"에디터에서 열기\"],\"Iw6WJa\":[\"WIP 한도 설정\"],\"JTYvAw\":[\"카드 검색\"],\"K_F6pa\":[\"저장 중…\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"굵게\"],\"KvW1VO\":[\"Draw.io 다이어그램\"],\"LQn6-8\":[\"로컈 수낙\"],\"MHrjPM\":[\"제목\"],\"Mm72la\":[\"No comments yet\"],\"NBdIgR\":[\"Comment\"],\"ONWvwQ\":[\"Upload\"],\"OYHzN1\":[\"태그\"],\"OepdfE\":[\"그룹: 상태\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"필터 지우기\"],\"QD8opX\":[\"보드\"],\"QlsPZy\":[\"Mermaid 구문을 작성하면 다이어그램이 표시됩니다.\"],\"S5Qbb1\":[\"쉼표로 구분\"],\"TdfEV7\":[\"Archived\"],\"UQOvxZ\":[\"빈 카드\"],\"VNa_N2\":[\"이 파일 형식은 아직 미리볼 수 없습니다.\"],\"VbyRUy\":[\"Comments\"],\"WSP6v1\":[\"정렬: 우선순위\"],\"X03-eC\":[\"값을 입력해 주세요.\"],\"XJOV1Y\":[\"Activity\"],\"Ya7bZl\":[\"다이어그램 오류\"],\"Zot9XS\":[\"카드 없음\"],\"_5CsXX\":[\"완료 열\"],\"_EsjyQ\":[\"이것 사용\"],\"a6uhHr\":[\"굵게 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"세부정보 추가...\"],\"agOeRN\":[\"이 API 명세를 렌더링할 수 없습니다.\"],\"b4hVKD\":[\"색상 열\"],\"cJ44lA\":[\"Unscheduled\"],\"cfaWH-\":[\"라벨 추가\"],\"cnGeoo\":[\"삭제\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 한도 \",[\"0\"]],\"dEgA5A\":[\"취소\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"복제\"],\"fYcKtB\":[\"정렬: 마감\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"제목 없는 카드\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF 문서\"],\"i4_LY_\":[\"작성\"],\"iTylMl\":[\"템플릿\"],\"iYVqZq\":[\"열 이름\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"색상\"],\"kZlRKE\":[\"Mermaid 소스\"],\"kryGs-\":[\"카드\"],\"lCF0wC\":[\"새로고침\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"ltF1xa\":[\"병합 결과 저장\"],\"nabda1\":[\"카드 삭제\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"필터\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"담당자\"],\"p9yTeb\":[\"정렬: 제목\"],\"pKztsX\":[\"전체 에디터에서 열기\"],\"pnrmSP\":[\"새 카드\"],\"pwN6Ae\":[\"열 접기\"],\"pzutoc\":[\"기울임꼴\"],\"rdUucN\":[\"미리보기\"],\"sCzmvQ\":[\"개 카드\"],\"sQpDn6\":[\"전체 화면 종료\"],\"tK2x9T\":[\"⚠ 해결할 충돌 \",[\"0\"],\"건\",[\"1\"]],\"t_YqKh\":[\"Remove\"],\"u2IprG\":[\"카드 제목 (Enter로 추가, Esc로 취소)\"],\"uAQUqI\":[\"상태\"],\"ucJg3u\":[\"Swimlane: Status\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"기울임꼴 (Ctrl+I)\"],\"wtw-au\":[\"완료 열로 설정\"],\"wwu18a\":[\"아이콘\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"y1eoq1\":[\"링크 복사\"],\"y9cj46\":[\"그룹: 우선순위\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← 목록으로\"],\"yz7wBu\":[\"닫기\"],\"yzF66j\":[\"링크\"],\"zOc0vf\":[\"아이콘 없음\"],\"zga9sT\":[\"확인\"]}")
};
function fu(e) {
	I.load(e, du[e] ?? du.en), I.activate(e);
}
//#endregion
//#region src/strings.ts
var pu = {
	en: {
		loading: "Loading board…",
		live: "Live",
		polling: (e) => `Auto-refresh · ${e}s`,
		connectionError: "Connection error",
		liveUnavailableHint: "Live updates are not available for this token — refreshing by polling.",
		retry: "Retry",
		close: "Close",
		cardReadOnlyHint: "Read-only card view",
		status: "Status",
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
		status: "状态",
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
		status: "ステータス",
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
		status: "상태",
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
		errUnauthorized: "토큰이 거부되었습니다(무효, 만료 또는 권한 없음).",
		errNetwork: "jtype 서버에 연결할 수 없습니다.",
		errGeneric: (e) => `보드를 불러오지 못했습니다: ${e}`
	}
};
function mu(e) {
	return pu[e] ?? pu.en;
}
//#endregion
//#region src/JTypeBoard.tsx
function hu() {
	return Math.random().toString(36).slice(2, 6);
}
function gu({ workspaceId: e, boardRef: t, baseUrl: n, token: r, client: i, readOnly: a = !1, live: o = !0, pollIntervalMs: s = 3e4, onCardOpen: c, onConnectionChange: l, locale: u, className: f, style: p }) {
	let m = u ?? "en", v = mu(m), S = g(null);
	S.current !== m && (S.current = m, fu(m));
	let C = i && (n || r) ? v.errPropsBoth : !i && (!n || !r) ? v.errPropsNone : null, w = h(() => C ? null : i || eu({
		baseUrl: n,
		token: r
	}), [
		i,
		n,
		r,
		C
	]), T = Math.max(5e3, s), [E, D] = _(null), [O, k] = _(""), [ee, A] = _(""), [te, ne] = _("polling"), [j, M] = _(null), [N, ie] = _({}), P = g(null), ae = g(/* @__PURE__ */ new Map()), oe = g(null), se = g(null), ce = g(l);
	ce.current = l;
	let le = g(v);
	le.current = v;
	let ue = (e) => {
		let n = le.current;
		return e instanceof tu ? e.code === "board_not_found" ? n.errBoardNotFound(t) : e.code === "board_ref_ambiguous" ? n.errBoardAmbiguous(t, e.candidates) : e.code === "board_config_invalid" ? n.errBoardConfigInvalid : n.errGeneric(e.message) : e instanceof $l ? e.status === 401 || e.status === 403 ? n.errUnauthorized : e.status === 0 && e.code === "network_error" ? n.errNetwork : n.errGeneric(e.code) : n.errGeneric(e instanceof Error ? e.message : String(e));
	}, F = g(ue);
	F.current = ue, d(() => {
		if (!w) return;
		let n = !1, r = null, i = null, a = null, s = null, c = !1, l = !1;
		P.current = null, D(null), k(""), A(""), M(null), ie({});
		let u = (e) => {
			n || (ne(e), se.current !== e && (se.current = e, ce.current?.(e)));
		}, d = async () => {
			try {
				let r = await lu(w, e, t, ae.current);
				return n ? null : (P.current = r, D(r), k(""), A(""), u(c ? "live" : "polling"), r);
			} catch (e) {
				if (n) return null;
				let t = F.current(e);
				return P.current ? A(t) : k(t), u("error"), null;
			}
		};
		oe.current = d;
		let f = () => {
			r = setTimeout(async () => {
				n || (c || await d(), n || f());
			}, T);
		}, p = (t) => {
			n || !o || l || !w.subscribeBoardEvents || (s = w.subscribeBoardEvents(e, t, {
				onEvent: () => {
					a && clearTimeout(a), a = setTimeout(() => void d(), 300);
				},
				onUp: () => {
					c = !0, u("live");
				},
				onDown: ({ permanent: e }) => {
					c = !1, !n && (P.current && u("polling"), e ? l = !0 : i = setTimeout(() => p(t), 3e4));
				}
			}));
		};
		return d().then((e) => {
			n || (e && p(e.config.id), f());
		}), () => {
			n = !0, r && clearTimeout(r), i && clearTimeout(i), a && clearTimeout(a), s?.(), oe.current = null;
		};
	}, [
		w,
		e,
		t,
		o,
		T
	]);
	let de = h(() => {
		let t = () => oe.current?.() ?? Promise.resolve(null), n = async (e) => {
			try {
				await e();
			} catch (e) {
				A(F.current(e));
			}
		}, r = async (t, n) => {
			let r = P.current;
			if (!r || !w) return;
			let i = r.metaByPath.get(t);
			await w.saveDocument(e, {
				relativePath: t,
				content: n,
				baseContentHash: i?.contentHash,
				baseContent: i?.content
			});
		};
		return {
			refresh: () => void t(),
			setConfig: (r) => n(async () => {
				let n = P.current;
				if (!n || !w) return;
				if (a) {
					ie((e) => cu(e, r));
					return;
				}
				let i = {
					...n.config,
					...r
				};
				await w.saveDocument(e, {
					relativePath: n.boardRelativePath,
					content: JSON.stringify(i, null, 2),
					baseContentHash: n.boardDoc.contentHash,
					baseContent: n.boardDoc.content
				}), await t();
			}),
			createCard: async (n, r) => {
				let i = P.current;
				if (!(!i || !w)) try {
					let a = i.config.groupBy || "status", o = i.cards.filter((e) => (a === "status" ? e.columnKey : a === "priority" ? e.priority || "none" : e.assignee || "") === n).reduce((e, t) => Math.max(e, t.position), -1) + 1, s = {
						title: r,
						board: i.config.id,
						status: a === "status" ? n : i.config.columns[0]?.key ?? "todo",
						position: String(o)
					};
					a !== "status" && (s[a] = n);
					let c = `${i.boardDir}/${Nl(r)}.md`;
					return i.metaByPath.has(c) && (c = `${i.boardDir}/${Nl(r)}-${hu()}.md`), await w.saveDocument(e, {
						relativePath: c,
						content: Ql("", s)
					}), await t(), c;
				} catch (e) {
					A(F.current(e));
					return;
				}
			},
			updateCard: (e, i) => n(async () => {
				let n = P.current, a = n?.metaByPath.get(e);
				!n || !a || (await r(e, ou(a.content, i)), await t());
			}),
			moveCard: (e, i, a) => n(async () => {
				let n = P.current;
				if (!n || !w) return;
				let o = n.config.groupBy || "status", s = n.metaByPath.get(e);
				if (!s) return;
				if (o !== "status") {
					let a = n.cards.find((t) => t.id === e);
					if ((o === "priority" ? a?.priority || "none" : a?.assignee || "") === i) return;
					let { data: c, body: l } = Zl(s.content);
					await r(e, Ql(l, {
						...c,
						[o]: i
					})), await t();
					return;
				}
				let c = n.cards.filter((t) => t.columnKey === i && t.id !== e).sort((e, t) => e.position - t.position), l = n.cards.find((t) => t.id === e);
				l && c.splice(Math.max(0, Math.min(a, c.length)), 0, l);
				for (let t = 0; t < c.length; t++) {
					let a = c[t];
					if (!a) continue;
					let o = n.metaByPath.get(a.id);
					if (!o || a.id !== e && a.position === t && a.columnKey === i) continue;
					let { data: s, body: l } = Zl(o.content);
					await r(a.id, Ql(l, {
						...s,
						status: i,
						position: String(t)
					}));
				}
				await t();
			}),
			deleteCard: async (r) => {
				let i = P.current, a = i?.metaByPath.get(r.id);
				if (!(!i || !a || !w)) {
					if (!w.deleteDocument) {
						A(le.current.deleteUnsupported);
						return;
					}
					window.confirm(le.current.confirmDeleteCard(r.title)) && await n(async () => {
						await w.deleteDocument(e, a.id), await t();
					});
				}
			}
		};
	}, [
		w,
		e,
		a
	]), fe = h(() => E ? a ? {
		...E.config,
		...N
	} : E.config : null, [
		E,
		a,
		N
	]), pe = h(() => E && fe ? iu(fe, E.boardDir) : null, [E, fe]), me = j ? E?.cards.find((e) => e.id === j) ?? null : null, he = c ?? ((e) => M(e.id)), ge;
	return ge = C ? /* @__PURE__ */ b(_u, { message: C }) : !E && O ? /* @__PURE__ */ b(_u, {
		message: O,
		retryLabel: v.retry,
		onRetry: () => void oe.current?.()
	}) : !E || !pe ? /* @__PURE__ */ b("div", {
		className: "flex h-full items-center justify-center bg-[#fbfdfb] p-8 text-sm text-stone-500",
		children: v.loading
	}) : /* @__PURE__ */ x(y, { children: [
		/* @__PURE__ */ b(re, {
			i18n: I,
			children: /* @__PURE__ */ b(Xl, {
				config: pe,
				cards: E.cards,
				actions: de,
				error: ee || void 0,
				readOnly: a,
				onCardOpen: he,
				portalClassName: "jtb-scope"
			})
		}),
		me && !c && fe && /* @__PURE__ */ b(uu, {
			card: me,
			config: fe,
			strings: v,
			onClose: () => M(null)
		}),
		/* @__PURE__ */ b(vu, {
			state: te,
			strings: v,
			pollSecs: Math.round(T / 1e3),
			liveWanted: o
		})
	] }), /* @__PURE__ */ b("div", {
		className: `jtb-scope jtb-root ${f ?? ""}`,
		style: p,
		"data-jtype-board": t,
		children: ge
	});
}
function _u({ message: e, retryLabel: t, onRetry: n }) {
	return /* @__PURE__ */ x("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center",
		children: [
			/* @__PURE__ */ b("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				className: "h-9 w-9 text-amber-500",
				"aria-hidden": !0,
				children: /* @__PURE__ */ b("path", {
					strokeLinecap: "round",
					strokeLinejoin: "round",
					d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
				})
			}),
			/* @__PURE__ */ b("p", {
				className: "max-w-md break-words text-sm text-stone-600",
				children: e
			}),
			n && t && /* @__PURE__ */ b("button", {
				type: "button",
				onClick: n,
				className: "rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				children: t
			})
		]
	});
}
function vu({ state: e, strings: t, pollSecs: n, liveWanted: r }) {
	let i = e === "live" ? t.live : e === "polling" ? t.polling(n) : t.connectionError, a = e === "live" ? "bg-emerald-500" : e === "polling" ? "bg-stone-400" : "bg-red-500";
	return /* @__PURE__ */ x("div", {
		className: "pointer-events-none absolute bottom-2 right-2 z-40 inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/90 px-2 py-0.5 text-[11px] text-stone-500 shadow-sm",
		title: e === "polling" && r ? t.liveUnavailableHint : void 0,
		children: [/* @__PURE__ */ b("span", {
			className: `h-1.5 w-1.5 rounded-full ${a}`,
			"aria-hidden": !0
		}), i]
	});
}
//#endregion
export { $l as JTypeApiError, gu as JTypeBoard, tu as JTypeBoardError, eu as createJTypeClient, nu as resolveBoardDoc };
