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
//#region node_modules/@lingui/core/dist/index.mjs
var R = (e) => typeof e == "string", te = (e) => typeof e == "function", z = /* @__PURE__ */ new Map(), ne = "en";
function re(e) {
	return [...Array.isArray(e) ? e : [e], ne];
}
function ie(e, t, n) {
	let r = re(e);
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
	return ce(() => le("date", r, n), () => new Intl.DateTimeFormat(r, i)).format(R(t) ? new Date(t) : t);
}
function ae(e, t, n) {
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
	return ie(e, t, r);
}
function oe(e, t, n) {
	let r = re(e);
	return ce(() => le("number", r, n), () => new Intl.NumberFormat(r, n)).format(t);
}
function se(e, t, n, { offset: r = 0, ...i }) {
	let a = re(e), o = t ? ce(() => le("plural-ordinal", a), () => new Intl.PluralRules(a, { type: "ordinal" })) : ce(() => le("plural-cardinal", a), () => new Intl.PluralRules(a, { type: "cardinal" }));
	return i[n] ?? i[o.select(n - r)] ?? i.other;
}
function ce(e, t) {
	let n = e(), r = z.get(n);
	return r || (r = t(), z.set(n, r)), r;
}
function le(e, t, n) {
	return `${e}-${t.join("-")}-${JSON.stringify(n)}`;
}
var ue = /\\u[a-fA-F0-9]{4}|\\x[a-fA-F0-9]{2}/, de = (e) => e.replace(/\\u([a-fA-F0-9]{4})|\\x([a-fA-F0-9]{2})/g, (e, t, n) => {
	if (t) {
		let e = parseInt(t, 16);
		return String.fromCharCode(e);
	} else {
		let e = parseInt(n, 16);
		return String.fromCharCode(e);
	}
}), fe = "%__lingui_octothorpe__%", pe = (e, t, n = {}) => {
	let r = t || e, i = (e) => typeof e == "object" ? e : n[e], a = (e, t) => {
		let a = Object.keys(n).length ? i("number") : void 0, o = oe(r, e, a);
		return t.replace(new RegExp(fe, "g"), o);
	};
	return {
		plural: (e, t) => {
			let { offset: n = 0 } = t, i = se(r, !1, e, t);
			return a(e - n, i);
		},
		selectordinal: (e, t) => {
			let { offset: n = 0 } = t, i = se(r, !0, e, t);
			return a(e - n, i);
		},
		select: me,
		number: (e, t) => oe(r, e, i(t) || { style: t }),
		date: (e, t) => ie(r, e, i(t) || t),
		time: (e, t) => ae(r, e, i(t) || t)
	};
}, me = (e, t) => t[e] ?? t.other;
function he(e, t, n) {
	return (r = {}, i) => {
		let a = pe(t, n, i), o = (e, t = !1) => Array.isArray(e) ? e.reduce((e, n) => {
			if (n === "#" && t) return e + fe;
			if (R(n)) return e + n;
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
		return R(s) && ue.test(s) ? de(s) : R(s) ? s : s ? String(s) : "";
	};
}
var ge = class {
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
}, _e = class extends ge {
	_locale = "";
	_locales;
	_messages = {};
	_missing;
	_messageCompiler;
	constructor(e) {
		super(), e.missing != null && (this._missing = e.missing), e.messages != null && this.load(e.messages), (typeof e.locale == "string" || e.locales) && this.activate(e.locale ?? ne, e.locales);
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
		e ||= "", R(e) || (t = e.values || t, r = e.message, e = e.id);
		let i = this.messages[e], a = i === void 0, o = this._missing;
		if (o && a) return te(o) ? o(this._locale, e) : o;
		a && this.emit("missing", {
			id: e,
			locale: this._locale
		});
		let s = i || r || e;
		return R(s) && (this._messageCompiler ? s = this._messageCompiler(s) : console.warn(`Uncompiled message detected! Message:

> ${s}

That means you use raw catalog or your catalog doesn't have a translation for the message and fallback was used.
ICU features such as interpolation and plurals will not work properly for that message.

Please compile your catalog first.
`)), R(s) && ue.test(s) ? de(s) : R(s) ? s : he(s, this._locale, this._locales)(t, n?.formats);
	}
	t = this._.bind(this);
	date(e, t) {
		return ie(this._locales || this._locale, e, t);
	}
	number(e, t) {
		return oe(this._locales || this._locale, e, t);
	}
};
function ve(e = {}) {
	return new _e(e);
}
var B = ve(), ye = (e) => e?.ownerDocument ?? document, be = (e) => e && "window" in e && e.window === e ? e : ye(e).defaultView || window;
function xe(e) {
	return typeof e == "object" && !!e && "nodeType" in e && typeof e.nodeType == "number";
}
function Se(e) {
	return xe(e) && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in e;
}
//#endregion
//#region ../../node_modules/.pnpm/react-stately@3.47.0_react@19.2.7/node_modules/react-stately/dist/private/flags/flags.mjs
var Ce = !1;
function we() {
	return Ce;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function Te(e, t) {
	if (!we()) return t && e ? e.contains(t) : !1;
	if (!e || !t) return !1;
	let n = t;
	for (; n !== null;) {
		if (n === e) return !0;
		n = n.tagName === "SLOT" && n.assignedSlot ? n.assignedSlot.parentNode : Se(n) ? n.host : n.parentNode;
	}
	return !1;
}
var Ee = (e = document) => {
	if (!we()) return e.activeElement;
	let t = e.activeElement;
	for (; t && "shadowRoot" in t && t.shadowRoot?.activeElement;) t = t.shadowRoot.activeElement;
	return t;
};
function De(e) {
	if (we() && e.target instanceof Element && e.target.shadowRoot) {
		if ("composedPath" in e) return e.composedPath()[0] ?? null;
		if ("composedPath" in e.nativeEvent) return e.nativeEvent.composedPath()[0] ?? null;
	}
	return e.target;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function Oe(e) {
	if (Ae()) e.focus({ preventScroll: !0 });
	else {
		let t = je(e);
		e.focus(), Me(t);
	}
}
var ke = null;
function Ae() {
	if (ke == null) {
		ke = !1;
		try {
			document.createElement("div").focus({ get preventScroll() {
				return ke = !0, !0;
			} });
		} catch {}
	}
	return ke;
}
function je(e) {
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
function Me(e) {
	for (let { element: t, scrollTop: n, scrollLeft: r } of e) t.scrollTop = n, t.scrollLeft = r;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var Ne = typeof document < "u" ? t.useLayoutEffect : () => {};
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/utils.mjs
function Pe(e) {
	let t = e;
	return t.nativeEvent = e, t.isDefaultPrevented = () => t.defaultPrevented, t.isPropagationStopped = () => t.cancelBubble, t.persist = () => {}, t;
}
function Fe(e, t) {
	Object.defineProperty(e, "target", { value: t }), Object.defineProperty(e, "currentTarget", { value: t });
}
function Ie(e) {
	let t = v({
		isFocused: !1,
		observer: null
	});
	return Ne(() => {
		let e = t.current;
		return () => {
			e.observer &&= (e.observer.disconnect(), null);
		};
	}, []), l((n) => {
		let r = De(n);
		if (r instanceof HTMLButtonElement || r instanceof HTMLInputElement || r instanceof HTMLTextAreaElement || r instanceof HTMLSelectElement) {
			t.current.isFocused = !0;
			let n = r;
			n.addEventListener("focusout", (r) => {
				if (t.current.isFocused = !1, n.disabled) {
					let t = Pe(r);
					e?.(t);
				}
				t.current.observer && (t.current.observer.disconnect(), t.current.observer = null);
			}, { once: !0 }), t.current.observer = new MutationObserver(() => {
				if (t.current.isFocused && n.disabled) {
					t.current.observer?.disconnect();
					let e = n === Ee() ? null : Ee();
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
function Le(e) {
	if (typeof window > "u" || window.navigator == null) return !1;
	let t = window.navigator.userAgentData?.brands;
	return Array.isArray(t) && t.some((t) => e.test(t.brand)) || e.test(window.navigator.userAgent);
}
function Re(e) {
	return typeof window < "u" && window.navigator != null && e.test(window.navigator.userAgentData?.platform || window.navigator.platform);
}
function ze(e) {
	let t = null;
	return () => (t ??= e(), t);
}
var Be = ze(function() {
	return Re(/^Mac/i);
}), Ve = ze(function() {
	return Re(/^iPad/i) || Be() && navigator.maxTouchPoints > 1;
}), He = ze(function() {
	return Le(/AppleWebKit/i) && !Ue();
}), Ue = ze(function() {
	return Le(/Chrome/i);
}), We = ze(function() {
	return Le(/Android/i);
}), Ge = ze(function() {
	return Le(/Firefox/i);
});
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function Ke(e) {
	return e.pointerType === "" && e.isTrusted ? !0 : We() && e.pointerType ? e.type === "click" && e.buttons === 1 : e.detail === 0 && !e.pointerType;
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/utils/openLink.mjs
function qe(e, t, n = !0) {
	let { metaKey: r, ctrlKey: i, altKey: a, shiftKey: o } = t;
	Ge() && window.event?.type?.startsWith("key") && e.target === "_blank" && (Be() ? r = !0 : i = !0);
	let s = He() && Be() && !Ve() ? new KeyboardEvent("keydown", {
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
	qe.isOpening = n, Oe(e), e.dispatchEvent(s), qe.isOpening = !1;
}
qe.isOpening = !1;
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var Je = null, Ye = /* @__PURE__ */ new Set(), Xe = /* @__PURE__ */ new Map(), Ze = !1, Qe = !1, $e = {
	Tab: !0,
	Escape: !0
};
function et(e, t) {
	for (let n of Ye) n(e, t);
}
function tt(e) {
	return !(e.metaKey || !Be() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function nt(e) {
	Ze = !0, !qe.isOpening && tt(e) && (Je = "keyboard", et("keyboard", e));
}
function rt(e) {
	Je = "pointer", "pointerType" in e && e.pointerType, (e.type === "mousedown" || e.type === "pointerdown") && (Ze = !0, et("pointer", e));
}
function it(e) {
	!qe.isOpening && Ke(e) && (Ze = !0, Je = "virtual");
}
function at(e) {
	let t = be(De(e)), n = ye(De(e));
	De(e) === t || De(e) === n || !e.isTrusted || (!Ze && !Qe && (Je = "virtual", et("virtual", e)), Ze = !1, Qe = !1);
}
function ot() {
	Ze = !1, Qe = !0;
}
function st(e) {
	if (typeof window > "u" || typeof document > "u") return;
	let t = be(e), n = ye(e);
	if (Xe.get(t)) return;
	let r = t.HTMLElement.prototype.focus;
	t.HTMLElement.prototype.focus = function() {
		Ze = !0, r.apply(this, arguments);
	}, n.addEventListener("keydown", nt, !0), n.addEventListener("keyup", nt, !0), n.addEventListener("click", it, !0), t.addEventListener("focus", at, !0), t.addEventListener("blur", ot, !1), typeof PointerEvent < "u" && (n.addEventListener("pointerdown", rt, !0), n.addEventListener("pointermove", rt, !0), n.addEventListener("pointerup", rt, !0)), t.addEventListener("beforeunload", () => {
		ct(e);
	}, { once: !0 }), Xe.set(t, { focus: r });
}
var ct = (e, t) => {
	let n = be(e), r = ye(e);
	t && r.removeEventListener("DOMContentLoaded", t), Xe.has(n) && (n.HTMLElement.prototype.focus = Xe.get(n).focus, r.removeEventListener("keydown", nt, !0), r.removeEventListener("keyup", nt, !0), r.removeEventListener("click", it, !0), n.removeEventListener("focus", at, !0), n.removeEventListener("blur", ot, !1), typeof PointerEvent < "u" && (r.removeEventListener("pointerdown", rt, !0), r.removeEventListener("pointermove", rt, !0), r.removeEventListener("pointerup", rt, !0)), Xe.delete(n));
};
function lt(e) {
	let t = ye(e), n;
	return t.readyState === "loading" ? (n = () => {
		st(e);
	}, t.addEventListener("DOMContentLoaded", n)) : st(e), () => ct(e, n);
}
typeof document < "u" && lt();
function ut() {
	return Je !== "pointer";
}
var dt = /* @__PURE__ */ new Set([
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
function ft(e, t, n) {
	let r = n ? De(n) : void 0, i = ye(r), a = be(r), o = a === void 0 ? HTMLInputElement : a.HTMLInputElement, s = a === void 0 ? HTMLTextAreaElement : a.HTMLTextAreaElement, c = a === void 0 ? HTMLElement : a.HTMLElement, l = a === void 0 ? KeyboardEvent : a.KeyboardEvent, u = Ee(i);
	return e = e || u instanceof o && !dt.has(u.type) || u instanceof s || u instanceof c && u.isContentEditable, !(e && t === "keyboard" && n instanceof l && !$e[n.key]);
}
function pt(e, t, n) {
	st(), f(() => {
		if (n?.enabled === !1) return;
		let t = (t, r) => {
			ft(!!n?.isTextInput, t, r) && e(ut());
		};
		return Ye.add(t), () => {
			Ye.delete(t);
		};
	}, t);
}
//#endregion
//#region ../../node_modules/.pnpm/react-aria@3.49.0_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/react-aria/dist/private/interactions/useFocus.mjs
function mt(e) {
	let { isDisabled: t, onFocus: n, onBlur: r, onFocusChange: i } = e, a = l((e) => {
		if (De(e) === e.currentTarget) return r && r(e), i && i(!1), !0;
	}, [r, i]), o = Ie(a), s = l((e) => {
		let t = De(e), r = ye(t), a = r ? Ee(r) : Ee();
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
function ht() {
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
function gt(e) {
	let { isDisabled: t, onBlurWithin: n, onFocusWithin: r, onFocusWithinChange: i } = e, a = v({ isFocusWithin: !1 }), { addGlobalListener: o, removeAllGlobalListeners: s } = ht(), c = l((e) => {
		Te(e.currentTarget, De(e)) && a.current.isFocusWithin && !Te(e.currentTarget, e.relatedTarget) && (a.current.isFocusWithin = !1, s(), n && n(e), i && i(!1));
	}, [
		n,
		i,
		a,
		s
	]), u = Ie(c), d = l((e) => {
		if (!Te(e.currentTarget, De(e))) return;
		let t = De(e), n = ye(t), s = Ee(n);
		if (!a.current.isFocusWithin && s === t) {
			r && r(e), i && i(!0), a.current.isFocusWithin = !0, u(e);
			let t = e.currentTarget;
			o(n, "focus", (e) => {
				let r = De(e);
				if (a.current.isFocusWithin && !Te(t, r)) {
					let e = new n.defaultView.FocusEvent("blur", { relatedTarget: r });
					Fe(e, t);
					let i = Pe(e);
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
function _t(e = {}) {
	let { autoFocus: t = !1, isTextInput: n, within: r } = e, i = v({
		isFocused: !1,
		isFocusVisible: t || ut()
	}), [a, o] = y(!1), [s, c] = y(() => i.current.isFocused && i.current.isFocusVisible), u = l(() => c(i.current.isFocused && i.current.isFocusVisible), []), d = l((e) => {
		i.current.isFocused = e, i.current.isFocusVisible = ut(), o(e), u();
	}, [u]);
	pt((e) => {
		i.current.isFocusVisible = e, u();
	}, [n, a], {
		enabled: a,
		isTextInput: n
	});
	let { focusProps: f } = mt({
		isDisabled: r,
		onFocusChange: d
	}), { focusWithinProps: p } = gt({
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
var vt = !1, yt = 0;
function bt() {
	vt = !0, setTimeout(() => {
		vt = !1;
	}, 500);
}
function xt(e) {
	e.pointerType === "touch" && bt();
}
function St() {
	let e = ye(null);
	if (e !== void 0) return yt === 0 && typeof PointerEvent < "u" && e.addEventListener("pointerup", xt), yt++, () => {
		yt--, !(yt > 0) && typeof PointerEvent < "u" && e.removeEventListener("pointerup", xt);
	};
}
function Ct(e) {
	let { onHoverStart: t, onHoverChange: n, onHoverEnd: r, isDisabled: i } = e, [a, o] = y(!1), s = v({
		isHovered: !1,
		ignoreEmulatedMouseEvents: !1,
		pointerType: "",
		target: null
	}).current;
	f(St, []);
	let { addGlobalListener: c, removeAllGlobalListeners: l } = ht(), { hoverProps: u, triggerHoverEnd: d } = g(() => {
		let e = (e, r) => {
			if (s.pointerType = r, i || r === "touch" || s.isHovered || !Te(e.currentTarget, De(e))) return;
			s.isHovered = !0;
			let l = e.currentTarget;
			s.target = l, c(ye(De(e)), "pointerover", (e) => {
				s.isHovered && s.target && !Te(s.target, De(e)) && a(e, e.pointerType);
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
			vt && t.pointerType === "mouse" || e(t, t.pointerType);
		}, u.onPointerLeave = (e) => {
			!i && Te(e.currentTarget, De(e)) && a(e, e.pointerType);
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
var wt = Object.defineProperty, Tt = (e, t, n) => t in e ? wt(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Et = (e, t, n) => (Tt(e, typeof t == "symbol" ? t : t + "", n), n), Dt = new class {
	constructor() {
		Et(this, "current", this.detect()), Et(this, "handoffState", "pending"), Et(this, "currentId", 0);
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
function Ot(e) {
	return Dt.isServer ? null : e == null ? document : e?.ownerDocument ?? document;
}
function kt(e) {
	return Dt.isServer ? null : e == null ? document : (e?.getRootNode)?.call(e) ?? document;
}
function At(e) {
	return kt(e)?.activeElement ?? null;
}
function jt(e) {
	return At(e) === e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/micro-task.js
function Mt(e) {
	typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((e) => setTimeout(() => {
		throw e;
	}));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/disposables.js
function Nt() {
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
			return Mt(() => {
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
			let t = Nt();
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
function Pt() {
	let [e] = y(Nt);
	return f(() => () => e.dispose(), [e]), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
var V = (e, t) => {
	Dt.isServer ? f(e, t) : h(e, t);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-latest-value.js
function Ft(e) {
	let t = v(e);
	return V(() => {
		t.current = e;
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event.js
var H = function(e) {
	let n = Ft(e);
	return t.useCallback((...e) => n.current(...e), [n]);
};
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-active-press.js
function It(e) {
	let t = e.width / 2, n = e.height / 2;
	return {
		top: e.clientY - n,
		right: e.clientX + t,
		bottom: e.clientY + n,
		left: e.clientX - t
	};
}
function Lt(e, t) {
	return !(!e || !t || e.right < t.left || e.left > t.right || e.bottom < t.top || e.top > t.bottom);
}
function Rt({ disabled: e = !1 } = {}) {
	let t = v(null), [n, r] = y(!1), i = Pt(), a = H(() => {
		t.current = null, r(!1), i.dispose();
	}), o = H((e) => {
		if (i.dispose(), t.current === null) {
			t.current = e.currentTarget, r(!0);
			{
				let n = Ot(e.currentTarget);
				i.addEventListener(n, "pointerup", a, !1), i.addEventListener(n, "pointermove", (e) => {
					if (t.current) {
						let n = It(e);
						r(Lt(n, t.current.getBoundingClientRect()));
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
function U(e) {
	return g(() => e, Object.values(e));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/disabled.js
var zt = i(void 0);
function Bt() {
	return u(zt);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/class-names.js
function Vt(...e) {
	return Array.from(new Set(e.flatMap((e) => typeof e == "string" ? e.split(" ") : []))).filter(Boolean).join(" ");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/match.js
function Ht(e, t, ...n) {
	if (e in t) {
		let r = t[e];
		return typeof r == "function" ? r(...n) : r;
	}
	let r = /* @__PURE__ */ Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((e) => `"${e}"`).join(", ")}.`);
	throw Error.captureStackTrace && Error.captureStackTrace(r, Ht), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/render.js
var Ut = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(Ut || {}), Wt = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(Wt || {});
function W() {
	let e = qt();
	return l((t) => Gt({
		mergeRefs: e,
		...t
	}), [e]);
}
function Gt({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: a = !0, name: o, mergeRefs: s }) {
	s ??= Jt;
	let c = Yt(t, e);
	if (a) return Kt(c, n, r, o, s);
	let l = i ?? 0;
	if (l & 2) {
		let { static: e = !1, ...t } = c;
		if (e) return Kt(t, n, r, o, s);
	}
	if (l & 1) {
		let { unmount: e = !0, ...t } = c;
		return Ht(+!e, {
			0() {
				return null;
			},
			1() {
				return Kt({
					...t,
					hidden: !0,
					style: { display: "none" }
				}, n, r, o, s);
			}
		});
	}
	return Kt(c, n, r, o, s);
}
function Kt(e, t = {}, n, i, o) {
	let { as: s = n, children: l, refName: u = "ref", ...d } = Qt(e, ["unmount", "static"]), f = e.ref === void 0 ? {} : { [u]: e.ref }, p = typeof l == "function" ? l(t) : l;
	p = en(p), "className" in d && d.className && typeof d.className == "function" && (d.className = d.className(t)), d["aria-labelledby"] && d["aria-labelledby"] === d.id && (d["aria-labelledby"] = void 0);
	let m = {};
	if (t) {
		let e = !1, n = [];
		for (let [r, i] of Object.entries(t)) typeof i == "boolean" && (e = !0), i === !0 && n.push(r.replace(/([A-Z])/g, (e) => `-${e.toLowerCase()}`));
		if (e) {
			m["data-headlessui-state"] = n.join(" ");
			for (let e of n) m[`data-${e}`] = "";
		}
	}
	if (tn(s) && (Object.keys(Zt(d)).length > 0 || Object.keys(Zt(m)).length > 0)) if (!c(p) || Array.isArray(p) && p.length > 1 || nn(p)) {
		if (Object.keys(Zt(d)).length > 0) throw Error([
			"Passing props on \"Fragment\"!",
			"",
			`The current component <${i} /> is rendering a "Fragment".`,
			"However we need to passthrough the following props:",
			Object.keys(Zt(d)).concat(Object.keys(Zt(m))).map((e) => `  - ${e}`).join("\n"),
			"",
			"You can apply a few solutions:",
			["Add an `as=\"...\"` prop, to ensure that we render an actual element instead of a \"Fragment\".", "Render a single element as the child so that we can forward the props onto that element."].map((e) => `  - ${e}`).join("\n")
		].join("\n"));
	} else {
		let e = p.props?.className, t = typeof e == "function" ? (...t) => Vt(e(...t), d.className) : Vt(e, d.className), n = t ? { className: t } : {}, i = Yt(p.props, Zt(Qt(d, ["ref"])));
		for (let e in m) e in i && delete m[e];
		return r(p, Object.assign({}, i, m, f, { ref: o($t(p), f.ref) }, n));
	}
	return a(s, Object.assign({}, Qt(d, ["ref"]), !tn(s) && f, !tn(s) && m), p);
}
function qt() {
	let e = v([]), t = l((t) => {
		for (let n of e.current) n != null && (typeof n == "function" ? n(t) : n.current = t);
	}, []);
	return (...n) => {
		if (!n.every((e) => e == null)) return e.current = n, t;
	};
}
function Jt(...e) {
	return e.every((e) => e == null) ? void 0 : (t) => {
		for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
	};
}
function Yt(...e) {
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
function Xt(...e) {
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
function G(e) {
	return Object.assign(s(e), { displayName: e.displayName ?? e.name });
}
function Zt(e) {
	let t = Object.assign({}, e);
	for (let e in t) t[e] === void 0 && delete t[e];
	return t;
}
function Qt(e, t = []) {
	let n = Object.assign({}, e);
	for (let e of t) e in n && delete n[e];
	return n;
}
function $t(e) {
	return t.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function en(e) {
	if (e != null && e.$$typeof === Symbol.for("react.lazy")) {
		let t = e._payload;
		if (t != null && t.status === "fulfilled") return en(t.value);
	}
	return e;
}
function tn(e) {
	return e === n || e === Symbol.for("react.fragment");
}
function nn(e) {
	return tn(e.type);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-controllable.js
function rn(e, t, n) {
	let [r, i] = y(n), a = e !== void 0, o = v(a), s = v(!1), c = v(!1);
	return a && !o.current && !s.current ? (s.current = !0, o.current = a, console.error("A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.")) : !a && o.current && !c.current && (c.current = !0, o.current = a, console.error("A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.")), [a ? e : r, H((e) => (a || E(() => i(e)), t?.(e)))];
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-default-value.js
function an(e) {
	let [t] = y(e);
	return t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/form.js
function on(e = {}, t = null, n = []) {
	for (let [r, i] of Object.entries(e)) cn(n, sn(t, r), i);
	return n;
}
function sn(e, t) {
	return e ? e + "[" + t + "]" : t;
}
function cn(e, t, n) {
	if (Array.isArray(n)) for (let [r, i] of n.entries()) cn(e, sn(t, r.toString()), i);
	else n instanceof Date ? e.push([t, n.toISOString()]) : typeof n == "boolean" ? e.push([t, n ? "1" : "0"]) : typeof n == "string" ? e.push([t, n]) : typeof n == "number" ? e.push([t, `${n}`]) : n == null ? e.push([t, ""]) : un(n) && !c(n) && on(n, t, e);
}
function ln(e) {
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
function un(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/hidden.js
var dn = "span", fn = ((e) => (e[e.None = 1] = "None", e[e.Focusable = 2] = "Focusable", e[e.Hidden = 4] = "Hidden", e))(fn || {});
function pn(e, t) {
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
	return W()({
		ourProps: i,
		theirProps: r,
		slot: {},
		defaultTag: dn,
		name: "Hidden"
	});
}
var mn = G(pn), hn = i(null);
function gn({ children: e }) {
	let n = u(hn);
	if (!n) return t.createElement(t.Fragment, null, e);
	let { target: r } = n;
	return r ? T(t.createElement(t.Fragment, null, e), r) : null;
}
function _n({ data: e, form: n, disabled: r, onReset: i, overrides: a }) {
	let [o, s] = y(null), c = Pt();
	return f(() => {
		if (i && o) return c.addEventListener(o, "reset", i);
	}, [
		o,
		n,
		i
	]), t.createElement(gn, null, t.createElement(vn, {
		setForm: s,
		formId: n
	}), on(e).map(([e, i]) => t.createElement(mn, {
		features: fn.Hidden,
		...Zt({
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
function vn({ setForm: e, formId: n }) {
	return f(() => {
		if (n) {
			let t = document.getElementById(n);
			t && e(t);
		}
	}, [e, n]), n ? null : t.createElement(mn, {
		features: fn.Hidden,
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
var yn = i(void 0);
function bn() {
	return u(yn);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/dom.js
function xn(e) {
	return typeof e != "object" || !e ? !1 : "nodeType" in e;
}
function Sn(e) {
	return xn(e) && "tagName" in e;
}
function Cn(e) {
	return Sn(e) && "accessKey" in e;
}
function wn(e) {
	return Sn(e) && "tabIndex" in e;
}
function Tn(e) {
	return Sn(e) && "style" in e;
}
function En(e) {
	return Cn(e) && e.nodeName === "IFRAME";
}
function Dn(e) {
	return Cn(e) && e.nodeName === "INPUT";
}
function On(e) {
	return Cn(e) && e.nodeName === "LABEL";
}
function kn(e) {
	return Cn(e) && e.nodeName === "FIELDSET";
}
function An(e) {
	return Cn(e) && e.nodeName === "LEGEND";
}
function jn(e) {
	return Sn(e) ? e.matches("a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type=\"hidden\"]),label,select,textarea,video[controls]") : !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/bugs.js
function Mn(e) {
	let t = e.parentElement, n = null;
	for (; t && !kn(t);) An(t) && (n = t), t = t.parentElement;
	let r = t?.getAttribute("disabled") === "";
	return r && Nn(n) ? !1 : r;
}
function Nn(e) {
	if (!e) return !1;
	let t = e.previousElementSibling;
	for (; t !== null;) {
		if (An(t)) return !1;
		t = t.previousElementSibling;
	}
	return !0;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
var Pn = Symbol();
function Fn(e, t = !0) {
	return Object.assign(e, { [Pn]: t });
}
function K(...e) {
	let t = v(e);
	f(() => {
		t.current = e;
	}, [e]);
	let n = H((e) => {
		for (let n of t.current) n != null && (typeof n == "function" ? n(e) : n.current = e);
	});
	return e.every((e) => e == null || e?.[Pn]) ? void 0 : n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/description/description.js
var In = i(null);
In.displayName = "DescriptionContext";
function Ln() {
	let e = u(In);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Description /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, Ln), e;
	}
	return e;
}
function Rn() {
	return u(In)?.value ?? void 0;
}
function zn() {
	let [e, n] = y([]);
	return [e.length > 0 ? e.join(" ") : void 0, g(() => function(e) {
		let r = H((e) => (n((t) => [...t, e]), () => n((t) => {
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
		return t.createElement(In.Provider, { value: i }, e.children);
	}, [n])];
}
var Bn = "p";
function Vn(e, t) {
	let n = m(), r = Bt(), { id: i = `headlessui-description-${n}`, ...a } = e, o = Ln(), s = K(t);
	V(() => o.register(i), [i, o.register]);
	let c = U({
		...o.slot,
		disabled: r || !1
	}), l = {
		ref: s,
		...o.props,
		id: i
	};
	return W()({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: Bn,
		name: o.name || "Description"
	});
}
var Hn = G(Vn), Un = Object.assign(Hn, {}), q = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(q || {}), Wn = i(null);
Wn.displayName = "LabelContext";
function Gn() {
	let e = u(Wn);
	if (e === null) {
		let e = /* @__PURE__ */ Error("You used a <Label /> component, but it is not inside a relevant parent.");
		throw Error.captureStackTrace && Error.captureStackTrace(e, Gn), e;
	}
	return e;
}
function Kn(e) {
	let t = u(Wn)?.value ?? void 0;
	return (e?.length ?? 0) > 0 ? [t, ...e].filter(Boolean).join(" ") : t;
}
function qn({ inherit: e = !1 } = {}) {
	let n = Kn(), [r, i] = y([]), a = e ? [n, ...r].filter(Boolean) : r;
	return [a.length > 0 ? a.join(" ") : void 0, g(() => function(e) {
		let n = H((e) => (i((t) => [...t, e]), () => i((t) => {
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
		return t.createElement(Wn.Provider, { value: r }, e.children);
	}, [i])];
}
var Jn = "label";
function Yn(e, t) {
	let n = m(), r = Gn(), i = bn(), a = Bt(), { id: o = `headlessui-label-${n}`, htmlFor: s = i ?? r.props?.htmlFor, passive: c = !1, ...l } = e, u = K(t);
	V(() => r.register(o), [o, r.register]);
	let d = H((e) => {
		let t = e.currentTarget;
		if (!(e.target !== e.currentTarget && jn(e.target)) && (On(t) && e.preventDefault(), r.props && "onClick" in r.props && typeof r.props.onClick == "function" && r.props.onClick(e), On(t))) {
			let e = document.getElementById(t.htmlFor);
			if (e) {
				let t = e.getAttribute("disabled");
				if (t === "true" || t === "") return;
				let n = e.getAttribute("aria-disabled");
				if (n === "true" || n === "") return;
				(Dn(e) && (e.type === "file" || e.type === "radio" || e.type === "checkbox") || e.role === "radio" || e.role === "checkbox" || e.role === "switch") && e.click(), e.focus({ preventScroll: !0 });
			}
		}
	}), f = U({
		...r.slot,
		disabled: a || !1
	}), p = {
		ref: u,
		...r.props,
		id: o,
		htmlFor: s,
		onClick: d
	};
	return c && ("onClick" in p && (delete p.htmlFor, delete p.onClick), "onClick" in l && delete l.onClick), W()({
		ourProps: p,
		theirProps: l,
		slot: f,
		defaultTag: s ? Jn : "div",
		name: r.name || "Label"
	});
}
var Xn = G(Yn), Zn = Object.assign(Xn, {}), Qn = i(() => {});
function $n({ value: e, children: n }) {
	return t.createElement(Qn.Provider, { value: e }, n);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-by-comparator.js
function er(e, t) {
	return e !== null && t !== null && typeof e == "object" && typeof t == "object" && "id" in e && "id" in t ? e.id === t.id : e === t;
}
function tr(e = er) {
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
function nr(e) {
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
function rr(e, t, n = !1) {
	let [r, i] = y(() => nr(t));
	return V(() => {
		if (!t || !e) return;
		let n = Nt();
		return n.requestAnimationFrame(function e() {
			n.requestAnimationFrame(e), i((e) => {
				let n = nr(t);
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
var ir = ((e) => (e[e.Left = 0] = "Left", e[e.Right = 2] = "Right", e))(ir || {});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-handle-toggle.js
function ar(e) {
	let t = v(null);
	return {
		onPointerDown: H((n) => {
			t.current = n.pointerType, !Mn(n.currentTarget) && n.pointerType === "mouse" && n.button === ir.Left && (n.preventDefault(), e(n));
		}),
		onClick: H((n) => {
			t.current !== "mouse" && (Mn(n.currentTarget) || e(n));
		})
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/default-map.js
var or = class extends Map {
	constructor(e) {
		super(), this.factory = e;
	}
	get(e) {
		let t = super.get(e);
		return t === void 0 && (t = this.factory(e), this.set(e, t)), t;
	}
}, sr = Object.defineProperty, cr = (e, t, n) => t in e ? sr(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, lr = (e, t, n) => (cr(e, typeof t == "symbol" ? t : t + "", n), n), ur = (e, t, n) => {
	if (!t.has(e)) throw TypeError("Cannot " + n);
}, dr = (e, t, n) => (ur(e, t, "read from private field"), n ? n.call(e) : t.get(e)), fr = (e, t, n) => {
	if (t.has(e)) throw TypeError("Cannot add the same private member more than once");
	t instanceof WeakSet ? t.add(e) : t.set(e, n);
}, pr = (e, t, n, r) => (ur(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), mr, hr, gr, _r = class {
	constructor(e) {
		fr(this, mr, {}), fr(this, hr, new or(() => /* @__PURE__ */ new Set())), fr(this, gr, /* @__PURE__ */ new Set()), lr(this, "disposables", Nt()), pr(this, mr, e), Dt.isServer && this.disposables.microTask(() => {
			this.dispose();
		});
	}
	dispose() {
		this.disposables.dispose();
	}
	get state() {
		return dr(this, mr);
	}
	subscribe(e, t) {
		if (Dt.isServer) return () => {};
		let n = {
			selector: e,
			callback: t,
			current: e(dr(this, mr))
		};
		return dr(this, gr).add(n), this.disposables.add(() => {
			dr(this, gr).delete(n);
		});
	}
	on(e, t) {
		return Dt.isServer ? () => {} : (dr(this, hr).get(e).add(t), this.disposables.add(() => {
			dr(this, hr).get(e).delete(t);
		}));
	}
	send(e) {
		let t = this.reduce(dr(this, mr), e);
		if (t !== dr(this, mr)) {
			pr(this, mr, t);
			for (let e of dr(this, gr)) {
				let t = e.selector(dr(this, mr));
				vr(e.current, t) || (e.current = t, e.callback(t));
			}
			for (let t of dr(this, hr).get(e.type)) t(dr(this, mr), e);
		}
	}
};
mr = /* @__PURE__ */ new WeakMap(), hr = /* @__PURE__ */ new WeakMap(), gr = /* @__PURE__ */ new WeakMap();
function vr(e, t) {
	return Object.is(e, t) ? !0 : typeof e != "object" || !e || typeof t != "object" || !t ? !1 : Array.isArray(e) && Array.isArray(t) ? e.length === t.length && yr(e[Symbol.iterator](), t[Symbol.iterator]()) : e instanceof Map && t instanceof Map || e instanceof Set && t instanceof Set ? e.size === t.size && yr(e.entries(), t.entries()) : br(e) && br(t) ? yr(Object.entries(e)[Symbol.iterator](), Object.entries(t)[Symbol.iterator]()) : !1;
}
function yr(e, t) {
	do {
		let n = e.next(), r = t.next();
		if (n.done && r.done) return !0;
		if (n.done || r.done || !Object.is(n.value, r.value)) return !1;
	} while (!0);
}
function br(e) {
	if (Object.prototype.toString.call(e) !== "[object Object]") return !1;
	let t = Object.getPrototypeOf(e);
	return t === null || Object.getPrototypeOf(t) === null;
}
function xr(e) {
	let [t, n] = e(), r = Nt();
	return (...e) => {
		t(...e), r.dispose(), r.microTask(n);
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/machines/stack-machine.js
var Sr = Object.defineProperty, Cr = (e, t, n) => t in e ? Sr(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, wr = (e, t, n) => (Cr(e, typeof t == "symbol" ? t : t + "", n), n), Tr = ((e) => (e[e.Push = 0] = "Push", e[e.Pop = 1] = "Pop", e))(Tr || {}), Er = {
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
}, Dr = class e extends _r {
	constructor() {
		super(...arguments), wr(this, "actions", {
			push: (e) => this.send({
				type: 0,
				id: e
			}),
			pop: (e) => this.send({
				type: 1,
				id: e
			})
		}), wr(this, "selectors", {
			isTop: (e, t) => e.stack[e.stack.length - 1] === t,
			inStack: (e, t) => e.stack.includes(t)
		});
	}
	static new() {
		return new e({ stack: [] });
	}
	reduce(e, t) {
		return Ht(t.type, Er, e, t);
	}
}, Or = new or(() => Dr.new()), kr = typeof Object.is == "function" ? Object.is : (e, t) => e === t && (e !== 0 || 1 / e == 1 / t) || e !== e && t !== t;
function Ar(e, t, n, r, i) {
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
			if (kr(n, t)) return c;
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
function J(e, t, n = vr) {
	return Ar(H((t) => e.subscribe(jr, t)), H(() => e.state), H(() => e.state), H(t), n);
}
function jr(e) {
	return e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
function Mr(e, t) {
	let n = p(), r = Or.get(t), [i, a] = J(r, l((e) => [r.selectors.isTop(e, n), r.selectors.inStack(e, n)], [r, n]));
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
var Nr = /* @__PURE__ */ new Map(), Pr = /* @__PURE__ */ new Map();
function Fr(e) {
	let t = Pr.get(e) ?? 0;
	return Pr.set(e, t + 1), t === 0 ? (Nr.set(e, {
		"aria-hidden": e.getAttribute("aria-hidden"),
		inert: e.inert
	}), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => Ir(e)) : () => Ir(e);
}
function Ir(e) {
	let t = Pr.get(e) ?? 1;
	if (t === 1 ? Pr.delete(e) : Pr.set(e, t - 1), t !== 1) return;
	let n = Nr.get(e);
	n && (n["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", n["aria-hidden"]), e.inert = n.inert, Nr.delete(e));
}
function Lr(e, { allowed: t, disallowed: n } = {}) {
	let r = Mr(e, "inert-others");
	V(() => {
		if (!r) return;
		let e = Nt();
		for (let t of n?.() ?? []) t && e.add(Fr(t));
		let i = t?.() ?? [];
		for (let t of i) {
			if (!t) continue;
			let n = Ot(t);
			if (!n) continue;
			let r = t.parentElement;
			for (; r && r !== n.body;) {
				for (let t of r.children) i.some((e) => t.contains(e)) || e.add(Fr(t));
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
function Rr(e, t, n) {
	let r = Ft((e) => {
		let t = e.getBoundingClientRect();
		t.x === 0 && t.y === 0 && t.width === 0 && t.height === 0 && n();
	});
	f(() => {
		if (!e) return;
		let n = t === null ? null : Cn(t) ? t : t.current;
		if (!n) return;
		let i = Nt();
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
var zr = [
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
].map((e) => `${e}:not([tabindex='-1'])`).join(","), Br = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(","), Y = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(Y || {}), Vr = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(Vr || {}), Hr = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(Hr || {});
function Ur(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(zr)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
function Wr(e = document.body) {
	return e == null ? [] : Array.from(e.querySelectorAll(Br)).sort((e, t) => Math.sign((e.tabIndex || 2 ** 53 - 1) - (t.tabIndex || 2 ** 53 - 1)));
}
var Gr = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(Gr || {});
function Kr(e, t = 0) {
	return e !== Ot(e)?.body && Ht(t, {
		0() {
			return e.matches(zr);
		},
		1() {
			let t = e;
			for (; t !== null;) {
				if (t.matches(zr)) return !0;
				t = t.parentElement;
			}
			return !1;
		}
	});
}
function qr(e) {
	Nt().nextFrame(() => {
		let t = At(e);
		t && wn(t) && !Kr(t, 0) && Yr(e);
	});
}
var Jr = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(Jr || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
	e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
function Yr(e) {
	e?.focus({ preventScroll: !0 });
}
var Xr = ["textarea", "input"].join(",");
function Zr(e) {
	return (e?.matches)?.call(e, Xr) ?? !1;
}
function Qr(e, t = (e) => e) {
	return e.slice().sort((e, n) => {
		let r = t(e), i = t(n);
		if (r === null || i === null) return 0;
		let a = r.compareDocumentPosition(i);
		return a & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : a & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
	});
}
function $r(e, t, n = e === null ? document.body : kt(e)) {
	return ei(Ur(n), t, { relativeTo: e });
}
function ei(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
	let a = Array.isArray(e) ? e.length > 0 ? kt(e[0]) : document : kt(e), o = Array.isArray(e) ? n ? Qr(e) : e : t & 64 ? Wr(e) : Ur(e);
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
	} while (f !== At(f));
	return t & 6 && Zr(f) && f.select(), 2;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/platform.js
function ti() {
	return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function ni() {
	return /Android/gi.test(window.navigator.userAgent);
}
function ri() {
	return ti() || ni();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-document-event.js
function ii(e, t, n, r) {
	let i = Ft(n);
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
function ai(e, t, n, r) {
	let i = Ft(n);
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
var oi = 30;
function si(e, t, n) {
	let r = Ft(n), i = l(function(e, n) {
		if (e.defaultPrevented) return;
		let i = n(e);
		if (i === null || !i.getRootNode().contains(i) || !i.isConnected) return;
		let a = function e(t) {
			return typeof t == "function" ? e(t()) : Array.isArray(t) || t instanceof Set ? t : [t];
		}(t);
		for (let t of a) if (t !== null && (t.contains(i) || e.composed && e.composedPath().includes(t))) return;
		return !Kr(i, Gr.Loose) && i.tabIndex !== -1 && e.preventDefault(), r.current(e, i);
	}, [r, t]), a = v(null);
	ii(e, "pointerdown", (e) => {
		ri() || (a.current = e.composedPath?.call(e)?.[0] || e.target);
	}, !0), ii(e, "pointerup", (e) => {
		if (ri() || !a.current) return;
		let t = a.current;
		return a.current = null, i(e, () => t);
	}, !0);
	let o = v({
		x: 0,
		y: 0
	});
	ii(e, "touchstart", (e) => {
		o.current.x = e.touches[0].clientX, o.current.y = e.touches[0].clientY;
	}, !0), ii(e, "touchend", (e) => {
		let t = {
			x: e.changedTouches[0].clientX,
			y: e.changedTouches[0].clientY
		};
		if (!(Math.abs(t.x - o.current.x) >= oi || Math.abs(t.y - o.current.y) >= oi)) return i(e, () => wn(e.target) ? e.target : null);
	}, !0), ai(e, "blur", (e) => i(e, () => En(window.document.activeElement) ? window.document.activeElement : null), !0);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-owner.js
function ci(...e) {
	return g(() => Ot(...e), [...e]);
}
function li(...e) {
	return g(() => kt(...e), [...e]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-quick-release.js
var ui = ((e) => (e[e.Ignore = 0] = "Ignore", e[e.Select = 1] = "Select", e[e.Close = 2] = "Close", e))(ui || {}), di = {
	Ignore: { kind: 0 },
	Select: (e) => ({
		kind: 1,
		target: e
	}),
	Close: { kind: 2 }
}, fi = 200, pi = 5;
function mi(e, { trigger: t, action: n, close: r, select: i }) {
	let a = v(null), o = v(null), s = v(null);
	ii(e && t !== null, "pointerdown", (e) => {
		xn(e?.target) && t != null && t.contains(e.target) && (o.current = e.x, s.current = e.y, a.current = e.timeStamp);
	}), ii(e && t !== null, "pointerup", (e) => {
		let t = a.current;
		if (t === null || (a.current = null, !wn(e.target)) || Math.abs(e.x - (o.current ?? e.x)) < pi && Math.abs(e.y - (s.current ?? e.y)) < pi) return;
		let c = n(e);
		switch (c.kind) {
			case 0: return;
			case 1:
				e.timeStamp - t > fi && (i(c.target), r());
				break;
			case 2:
				r();
				break;
		}
	}, { capture: !0 });
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-event-listener.js
function hi(e, t, n, r) {
	let i = Ft(n);
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
function gi(e, t) {
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
function _i(e) {
	return b(e.subscribe, e.getSnapshot, e.getSnapshot);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/store.js
function vi(e, t) {
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
function yi() {
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
function bi() {
	return ti() ? { before({ doc: e, d: t, meta: n }) {
		function r(e) {
			for (let t of n().containers) for (let n of t()) if (n.contains(e)) return !0;
			return !1;
		}
		t.microTask(() => {
			if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
				let n = Nt();
				n.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => n.dispose()));
			}
			let n = window.scrollY ?? window.pageYOffset, i = null;
			t.addEventListener(e, "click", (t) => {
				if (wn(t.target)) try {
					let n = t.target.closest("a");
					if (!n) return;
					let { hash: a } = new URL(n.href), o = e.querySelector(a);
					wn(o) && !r(o) && (i = o);
				} catch {}
			}, !0), t.group((n) => {
				t.addEventListener(e, "touchstart", (e) => {
					if (n.dispose(), wn(e.target) && Tn(e.target)) if (r(e.target)) {
						let t = e.target;
						for (; t.parentElement && r(t.parentElement);) t = t.parentElement;
						n.style(t, "overscrollBehavior", "contain");
					} else n.style(e.target, "touchAction", "none");
				});
			}), t.addEventListener(e, "touchmove", (e) => {
				if (wn(e.target)) {
					if (Dn(e.target)) return;
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
function xi() {
	return { before({ doc: e, d: t }) {
		t.style(e.documentElement, "overflow", "hidden");
	} };
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
function Si(e) {
	let t = {};
	for (let n of e) Object.assign(t, n(t));
	return t;
}
var Ci = vi(() => /* @__PURE__ */ new Map(), {
	PUSH(e, t) {
		let n = this.get(e) ?? {
			doc: e,
			count: 0,
			d: Nt(),
			meta: /* @__PURE__ */ new Set(),
			computedMeta: {}
		};
		return n.count++, n.meta.add(t), n.computedMeta = Si(n.meta), this.set(e, n), this;
	},
	POP(e, t) {
		let n = this.get(e);
		return n && (n.count--, n.meta.delete(t), n.computedMeta = Si(n.meta)), this;
	},
	SCROLL_PREVENT(e) {
		let t = {
			doc: e.doc,
			d: e.d,
			meta() {
				return e.computedMeta;
			}
		}, n = [
			bi(),
			yi(),
			xi()
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
Ci.subscribe(() => {
	let e = Ci.getSnapshot(), t = /* @__PURE__ */ new Map();
	for (let [n] of e) t.set(n, n.documentElement.style.overflow);
	for (let n of e.values()) {
		let e = t.get(n.doc) === "hidden", r = n.count !== 0;
		(r && !e || !r && e) && Ci.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && Ci.dispatch("TEARDOWN", n);
	}
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
function wi(e, t, n = () => ({ containers: [] })) {
	let r = _i(Ci), i = t ? r.get(t) : void 0, a = i ? i.count > 0 : !1;
	return V(() => {
		if (!(!t || !e)) return Ci.dispatch("PUSH", t, n), () => Ci.dispatch("POP", t, n);
	}, [e, t]), a;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
function Ti(e, t, n = () => [document.body]) {
	wi(Mr(e, "scroll-lock"), t, (e) => ({ containers: [...e.containers ?? [], n] }));
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tracked-pointer.js
function Ei(e) {
	return [e.screenX, e.screenY];
}
function Di() {
	let e = v([-1, -1]);
	return {
		wasMoved(t) {
			let n = Ei(t);
			return e.current[0] === n[0] && e.current[1] === n[1] ? !1 : (e.current = n, !0);
		},
		update(t) {
			e.current = Ei(t);
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-flags.js
function Oi(e = 0) {
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
var ki = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(ki || {});
function Ai(e) {
	let t = {};
	for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
	return t;
}
function ji(e, t, n, r) {
	let [i, a] = y(n), { hasFlag: o, addFlag: s, removeFlag: c } = Oi(e && i ? 3 : 0), l = v(!1), u = v(!1);
	return V(() => {
		var i;
		if (e) {
			if (n && a(!0), !t) {
				n && s(3);
				return;
			}
			return (i = r?.start) == null || i.call(r, n), Mi(t, {
				inFlight: l,
				prepare() {
					u.current ? u.current = !1 : u.current = l.current, l.current = !0, !u.current && (n ? (s(3), c(4)) : (s(4), c(2)));
				},
				run() {
					u.current ? n ? (c(3), s(4)) : (c(4), s(3)) : n ? c(1) : s(1);
				},
				done() {
					var e;
					u.current && Fi(t) || (l.current = !1, c(7), n || a(!1), (e = r?.end) == null || e.call(r, n));
				}
			});
		}
	}, [
		e,
		n,
		t,
		Pt()
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
function Mi(e, { prepare: t, run: n, done: r, inFlight: i }) {
	let a = Nt();
	return Pi(e, {
		prepare: t,
		inFlight: i
	}), a.nextFrame(() => {
		n(), a.requestAnimationFrame(() => {
			a.add(Ni(e, r));
		});
	}), a.dispose;
}
function Ni(e, t) {
	let n = Nt();
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
function Pi(e, { inFlight: t, prepare: n }) {
	if (t != null && t.current) {
		n();
		return;
	}
	let r = e.style.transition;
	e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function Fi(e) {
	return (e.getAnimations?.call(e) ?? []).some((e) => e instanceof CSSTransition && e.playState !== "finished");
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tree-walker.js
function Ii(e, { container: t, accept: n, walk: r }) {
	let i = v(n), a = v(r);
	f(() => {
		i.current = n, a.current = r;
	}, [n, r]), V(() => {
		if (!t || !e) return;
		let n = Ot(t);
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
function Li(e, t) {
	let n = v([]), r = H(e);
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
function Ri() {
	return typeof window < "u";
}
function zi(e) {
	return Hi(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Bi(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Vi(e) {
	return ((Hi(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function Hi(e) {
	return Ri() ? e instanceof Node || e instanceof Bi(e).Node : !1;
}
function Ui(e) {
	return Ri() ? e instanceof Element || e instanceof Bi(e).Element : !1;
}
function Wi(e) {
	return Ri() ? e instanceof HTMLElement || e instanceof Bi(e).HTMLElement : !1;
}
function Gi(e) {
	return !Ri() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Bi(e).ShadowRoot;
}
function Ki(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = ra(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function qi(e) {
	return /^(table|td|th)$/.test(zi(e));
}
function Ji(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var Yi = /transform|translate|scale|rotate|perspective|filter/, Xi = /paint|layout|strict|content/, Zi = (e) => !!e && e !== "none", Qi;
function $i(e) {
	let t = Ui(e) ? ra(e) : e;
	return Zi(t.transform) || Zi(t.translate) || Zi(t.scale) || Zi(t.rotate) || Zi(t.perspective) || !ta() && (Zi(t.backdropFilter) || Zi(t.filter)) || Yi.test(t.willChange || "") || Xi.test(t.contain || "");
}
function ea(e) {
	let t = aa(e);
	for (; Wi(t) && !na(t);) {
		if ($i(t)) return t;
		if (Ji(t)) return null;
		t = aa(t);
	}
	return null;
}
function ta() {
	return Qi ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), Qi;
}
function na(e) {
	return /^(html|body|#document)$/.test(zi(e));
}
function ra(e) {
	return Bi(e).getComputedStyle(e);
}
function ia(e) {
	return Ui(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function aa(e) {
	if (zi(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || Gi(e) && e.host || Vi(e);
	return Gi(t) ? t.host : t;
}
function oa(e) {
	let t = aa(e);
	return na(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : Wi(t) && Ki(t) ? t : oa(t);
}
function sa(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = oa(e), i = r === e.ownerDocument?.body, a = Bi(r);
	if (i) {
		let e = ca(a);
		return t.concat(a, a.visualViewport || [], Ki(r) ? r : [], e && n ? sa(e) : []);
	} else return t.concat(r, sa(r, [], n));
}
function ca(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+react@0.26.28_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@floating-ui/react/dist/floating-ui.react.utils.mjs
function la() {
	let e = navigator.userAgentData;
	return e && Array.isArray(e.brands) ? e.brands.map((e) => {
		let { brand: t, version: n } = e;
		return t + "/" + n;
	}).join(" ") : navigator.userAgent;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
var ua = Math.min, da = Math.max, fa = Math.round, pa = Math.floor, ma = (e) => ({
	x: e,
	y: e
}), ha = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function ga(e, t, n) {
	return da(e, ua(t, n));
}
function _a(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function va(e) {
	return e.split("-")[0];
}
function ya(e) {
	return e.split("-")[1];
}
function ba(e) {
	return e === "x" ? "y" : "x";
}
function xa(e) {
	return e === "y" ? "height" : "width";
}
function Sa(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function Ca(e) {
	return ba(Sa(e));
}
function wa(e, t, n) {
	n === void 0 && (n = !1);
	let r = ya(e), i = Ca(e), a = xa(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = Na(o)), [o, Na(o)];
}
function Ta(e) {
	let t = Na(e);
	return [
		Ea(e),
		t,
		Ea(t)
	];
}
function Ea(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var Da = ["left", "right"], Oa = ["right", "left"], ka = ["top", "bottom"], Aa = ["bottom", "top"];
function ja(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? Oa : Da : t ? Da : Oa;
		case "left":
		case "right": return t ? ka : Aa;
		default: return [];
	}
}
function Ma(e, t, n, r) {
	let i = ya(e), a = ja(va(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(Ea)))), a;
}
function Na(e) {
	let t = va(e);
	return ha[t] + e.slice(t.length);
}
function Pa(e) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...e
	};
}
function Fa(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : Pa(e);
}
function Ia(e) {
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
function La(e, t, n) {
	let { reference: r, floating: i } = e, a = Sa(t), o = Ca(t), s = xa(o), c = va(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
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
	switch (ya(t)) {
		case "start":
			p[o] -= f * (n && l ? -1 : 1);
			break;
		case "end":
			p[o] += f * (n && l ? -1 : 1);
			break;
	}
	return p;
}
async function Ra(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = _a(t, e), p = Fa(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = Ia(await i.getClippingRect({
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
	}, y = Ia(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
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
var za = 50, Ba = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: Ra
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = La(l, r, c), f = r, p = 0, m = {};
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
		}, x && p < za && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = La(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, Va = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = _a(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = va(r), _ = Sa(o), v = va(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [Na(o)] : Ta(o)), x = p !== "none";
			!d && x && b.push(...Ma(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = wa(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (!(u === "alignment" && _ !== Sa(t)) || T.every((e) => Sa(e.placement) !== _ || e.overflows[0] > 0))) return {
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
								let t = Sa(e.placement);
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
}, Ha = /*#__PURE__*/ new Set(["left", "top"]);
async function Ua(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = va(n), s = ya(n), c = Sa(n) === "y", l = Ha.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = _a(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
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
var Wa = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await Ua(t, e);
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
}, Ga = function(e) {
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
			} }, ...l } = _a(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Sa(va(i)), p = ba(f), m = u[p], h = u[f];
			if (o) {
				let e = p === "y" ? "top" : "left", t = p === "y" ? "bottom" : "right", n = m + d[e], r = m - d[t];
				m = ga(n, m, r);
			}
			if (s) {
				let e = f === "y" ? "top" : "left", t = f === "y" ? "bottom" : "right", n = h + d[e], r = h - d[t];
				h = ga(n, h, r);
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
}, Ka = function(e) {
	return e === void 0 && (e = {}), {
		name: "size",
		options: e,
		async fn(t) {
			var n, r;
			let { placement: i, rects: a, platform: o, elements: s } = t, { apply: c = () => {}, ...l } = _a(e, t), u = await o.detectOverflow(t, l), d = va(i), f = ya(i), p = Sa(i) === "y", { width: m, height: h } = a.floating, g, _;
			d === "top" || d === "bottom" ? (g = d, _ = f === (await (o.isRTL == null ? void 0 : o.isRTL(s.floating)) ? "start" : "end") ? "left" : "right") : (_ = d, g = f === "end" ? "top" : "bottom");
			let v = h - u.top - u.bottom, y = m - u.left - u.right, b = ua(h - u[g], v), x = ua(m - u[_], y), S = !t.middlewareData.shift, C = b, w = x;
			if ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y), (r = t.middlewareData.shift) != null && r.enabled.y && (C = v), S && !f) {
				let e = da(u.left, 0), t = da(u.right, 0), n = da(u.top, 0), r = da(u.bottom, 0);
				p ? w = m - 2 * (e !== 0 || t !== 0 ? e + t : da(u.left, u.right)) : C = h - 2 * (n !== 0 || r !== 0 ? n + r : da(u.top, u.bottom));
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
function qa(e) {
	let t = ra(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = Wi(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = fa(n) !== a || fa(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function Ja(e) {
	return Ui(e) ? e : e.contextElement;
}
function Ya(e) {
	let t = Ja(e);
	if (!Wi(t)) return ma(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = qa(t), o = (a ? fa(n.width) : n.width) / r, s = (a ? fa(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var Xa = /*#__PURE__*/ ma(0);
function Za(e) {
	let t = Bi(e);
	return !ta() || !t.visualViewport ? Xa : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function Qa(e, t, n) {
	return t === void 0 && (t = !1), !n || t && n !== Bi(e) ? !1 : t;
}
function $a(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = Ja(e), o = ma(1);
	t && (r ? Ui(r) && (o = Ya(r)) : o = Ya(e));
	let s = Qa(a, n, r) ? Za(a) : ma(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a) {
		let e = Bi(a), t = r && Ui(r) ? Bi(r) : r, n = e, i = ca(n);
		for (; i && r && t !== n;) {
			let e = Ya(i), t = i.getBoundingClientRect(), r = ra(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = Bi(i), i = ca(n);
		}
	}
	return Ia({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function eo(e, t) {
	let n = ia(e).scrollLeft;
	return t ? t.left + n : $a(Vi(e)).left + n;
}
function to(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - eo(e, n),
		y: n.top + t.scrollTop
	};
}
function no(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = Vi(r), s = t ? Ji(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = ma(1), u = ma(0), d = Wi(r);
	if ((d || !d && !a) && ((zi(r) !== "body" || Ki(o)) && (c = ia(r)), d)) {
		let e = $a(r);
		l = Ya(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? to(o, c) : ma(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function ro(e) {
	return Array.from(e.getClientRects());
}
function io(e) {
	let t = Vi(e), n = ia(e), r = e.ownerDocument.body, i = da(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = da(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight), o = -n.scrollLeft + eo(e), s = -n.scrollTop;
	return ra(r).direction === "rtl" && (o += da(t.clientWidth, r.clientWidth) - i), {
		width: i,
		height: a,
		x: o,
		y: s
	};
}
var ao = 25;
function oo(e, t) {
	let n = Bi(e), r = Vi(e), i = n.visualViewport, a = r.clientWidth, o = r.clientHeight, s = 0, c = 0;
	if (i) {
		a = i.width, o = i.height;
		let e = ta();
		(!e || e && t === "fixed") && (s = i.offsetLeft, c = i.offsetTop);
	}
	let l = eo(r);
	if (l <= 0) {
		let e = r.ownerDocument, t = e.body, n = getComputedStyle(t), i = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, o = Math.abs(r.clientWidth - t.clientWidth - i);
		o <= ao && (a -= o);
	} else l <= ao && (a += l);
	return {
		width: a,
		height: o,
		x: s,
		y: c
	};
}
function so(e, t) {
	let n = $a(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = Wi(e) ? Ya(e) : ma(1);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function co(e, t, n) {
	let r;
	if (t === "viewport") r = oo(e, n);
	else if (t === "document") r = io(Vi(e));
	else if (Ui(t)) r = so(t, n);
	else {
		let n = Za(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return Ia(r);
}
function lo(e, t) {
	let n = aa(e);
	return n === t || !Ui(n) || na(n) ? !1 : ra(n).position === "fixed" || lo(n, t);
}
function uo(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = sa(e, [], !1).filter((e) => Ui(e) && zi(e) !== "body"), i = null, a = ra(e).position === "fixed", o = a ? aa(e) : e;
	for (; Ui(o) && !na(o);) {
		let t = ra(o), n = $i(o);
		!n && t.position === "fixed" && (i = null), (a ? !n && !i : !n && t.position === "static" && i && (i.position === "absolute" || i.position === "fixed") || Ki(o) && !n && lo(e, o)) ? r = r.filter((e) => e !== o) : i = t, o = aa(o);
	}
	return t.set(e, r), r;
}
function fo(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? Ji(t) ? [] : uo(t, this._c) : [].concat(n), r], o = co(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = co(t, a[e], i);
		s = da(n.top, s), c = ua(n.right, c), l = ua(n.bottom, l), u = da(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function po(e) {
	let { width: t, height: n } = qa(e);
	return {
		width: t,
		height: n
	};
}
function mo(e, t, n) {
	let r = Wi(t), i = Vi(t), a = n === "fixed", o = $a(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = ma(0);
	function l() {
		c.x = eo(i);
	}
	if (r || !r && !a) if ((zi(t) !== "body" || Ki(i)) && (s = ia(t)), r) {
		let e = $a(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	} else i && l();
	a && !r && i && l();
	let u = i && !r && !a ? to(i, s) : ma(0);
	return {
		x: o.left + s.scrollLeft - c.x - u.x,
		y: o.top + s.scrollTop - c.y - u.y,
		width: o.width,
		height: o.height
	};
}
function ho(e) {
	return ra(e).position === "static";
}
function go(e, t) {
	if (!Wi(e) || ra(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return Vi(e) === n && (n = n.ownerDocument.body), n;
}
function _o(e, t) {
	let n = Bi(e);
	if (Ji(e)) return n;
	if (!Wi(e)) {
		let t = aa(e);
		for (; t && !na(t);) {
			if (Ui(t) && !ho(t)) return t;
			t = aa(t);
		}
		return n;
	}
	let r = go(e, t);
	for (; r && qi(r) && ho(r);) r = go(r, t);
	return r && na(r) && ho(r) && !$i(r) ? n : r || ea(e) || n;
}
var vo = async function(e) {
	let t = this.getOffsetParent || _o, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: mo(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function yo(e) {
	return ra(e).direction === "rtl";
}
var bo = {
	convertOffsetParentRelativeRectToViewportRelativeRect: no,
	getDocumentElement: Vi,
	getClippingRect: fo,
	getOffsetParent: _o,
	getElementRects: vo,
	getClientRects: ro,
	getDimensions: po,
	getScale: Ya,
	isElement: Ui,
	isRTL: yo
};
function xo(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function So(e, t) {
	let n = null, r, i = Vi(e);
	function a() {
		var e;
		clearTimeout(r), (e = n) == null || e.disconnect(), n = null;
	}
	function o(s, c) {
		s === void 0 && (s = !1), c === void 0 && (c = 1), a();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (s || t(), !f || !p) return;
		let m = pa(d), h = pa(i.clientWidth - (u + f)), g = pa(i.clientHeight - (d + p)), _ = pa(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: da(0, ua(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (n !== c) {
				if (!y) return o();
				n ? o(!1, n) : r = setTimeout(() => {
					o(!1, 1e-7);
				}, 1e3);
			}
			n === 1 && !xo(l, e.getBoundingClientRect()) && o(), y = !1;
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
function Co(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = Ja(e), u = i || a ? [...l ? sa(l) : [], ...t ? sa(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n, { passive: !0 }), a && e.addEventListener("resize", n);
	});
	let d = l && s ? So(l, n) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? $a(e) : null;
	c && g();
	function g() {
		let t = $a(e);
		h && !xo(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var wo = Ra, To = Wa, Eo = Ga, Do = Va, Oo = Ka, ko = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = {
		platform: bo,
		...n
	}, a = {
		...i.platform,
		_c: r
	};
	return Ba(e, t, {
		...i,
		platform: a
	});
}, Ao = typeof document < "u" ? h : function() {};
function jo(e, t) {
	if (e === t) return !0;
	if (typeof e != typeof t) return !1;
	if (typeof e == "function" && e.toString() === t.toString()) return !0;
	let n, r, i;
	if (e && t && typeof e == "object") {
		if (Array.isArray(e)) {
			if (n = e.length, n !== t.length) return !1;
			for (r = n; r-- !== 0;) if (!jo(e[r], t[r])) return !1;
			return !0;
		}
		if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length) return !1;
		for (r = n; r-- !== 0;) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
		for (r = n; r-- !== 0;) {
			let n = i[r];
			if (!(n === "_owner" && e.$$typeof) && !jo(e[n], t[n])) return !1;
		}
		return !0;
	}
	return e !== e && t !== t;
}
function Mo(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function No(e, t) {
	let n = Mo(e);
	return Math.round(t * n) / n;
}
function Po(t) {
	let n = e.useRef(t);
	return Ao(() => {
		n.current = t;
	}), n;
}
function Fo(t) {
	t === void 0 && (t = {});
	let { placement: n = "bottom", strategy: r = "absolute", middleware: i = [], platform: a, elements: { reference: o, floating: s } = {}, transform: c = !0, whileElementsMounted: l, open: u } = t, [d, f] = e.useState({
		x: 0,
		y: 0,
		strategy: r,
		placement: n,
		middlewareData: {},
		isPositioned: !1
	}), [p, m] = e.useState(i);
	jo(p, i) || m(i);
	let [h, g] = e.useState(null), [_, v] = e.useState(null), y = e.useCallback((e) => {
		e !== C.current && (C.current = e, g(e));
	}, []), b = e.useCallback((e) => {
		e !== T.current && (T.current = e, v(e));
	}, []), x = o || h, S = s || _, C = e.useRef(null), T = e.useRef(null), E = e.useRef(d), D = l != null, O = Po(l), k = Po(a), A = Po(u), j = e.useCallback(() => {
		if (!C.current || !T.current) return;
		let e = {
			placement: n,
			strategy: r,
			middleware: p
		};
		k.current && (e.platform = k.current), ko(C.current, T.current, e).then((e) => {
			let t = {
				...e,
				isPositioned: A.current !== !1
			};
			M.current && !jo(E.current, t) && (E.current = t, w.flushSync(() => {
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
	Ao(() => {
		u === !1 && E.current.isPositioned && (E.current.isPositioned = !1, f((e) => ({
			...e,
			isPositioned: !1
		})));
	}, [u]);
	let M = e.useRef(!1);
	Ao(() => (M.current = !0, () => {
		M.current = !1;
	}), []), Ao(() => {
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
		let t = No(P.floating, d.x), n = No(P.floating, d.y);
		return c ? {
			...e,
			transform: "translate(" + t + "px, " + n + "px)",
			...Mo(P.floating) >= 1.5 && { willChange: "transform" }
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
var Io = (e, t) => {
	let n = To(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Lo = (e, t) => {
	let n = Eo(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Ro = (e, t) => {
	let n = Do(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, zo = (e, t) => {
	let n = Oo(e);
	return {
		name: n.name,
		fn: n.fn,
		options: [e, t]
	};
}, Bo = { ...e }, Vo = Bo.useInsertionEffect || ((e) => e());
function Ho(t) {
	let n = e.useRef(() => {});
	return Vo(() => {
		n.current = t;
	}), e.useCallback(function() {
		var e = [...arguments];
		return n.current == null ? void 0 : n.current(...e);
	}, []);
}
var Uo = "ArrowUp", Wo = "ArrowDown", Go = "ArrowLeft", Ko = "ArrowRight", qo = typeof document < "u" ? h : f, Jo = [Go, Ko], Yo = [Uo, Wo];
[...Jo, ...Yo];
var Xo = !1, Zo = 0, Qo = () => "floating-ui-" + Math.random().toString(36).slice(2, 6) + Zo++;
function $o() {
	let [t, n] = e.useState(() => Xo ? Qo() : void 0);
	return qo(() => {
		t ?? n(Qo());
	}, []), e.useEffect(() => {
		Xo = !0;
	}, []), t;
}
var es = Bo.useId || $o;
function ts() {
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
var ns = /*#__PURE__*/ e.createContext(null), rs = /*#__PURE__*/ e.createContext(null), is = () => e.useContext(ns)?.id || null, as = () => e.useContext(rs), os = "data-floating-ui-focusable";
function ss(t) {
	let { open: n = !1, onOpenChange: r, elements: i } = t, a = es(), o = e.useRef({}), [s] = e.useState(() => ts()), c = is() != null, [l, u] = e.useState(i.reference), d = Ho((e, t, n) => {
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
function cs(t) {
	t === void 0 && (t = {});
	let { nodeId: n } = t, r = ss({
		...t,
		elements: {
			reference: null,
			floating: null,
			...t.elements
		}
	}), i = t.rootContext || r, a = i.elements, [o, s] = e.useState(null), [c, l] = e.useState(null), u = a?.domReference || o, d = e.useRef(null), f = as();
	qo(() => {
		u && (d.current = u);
	}, [u]);
	let p = Fo({
		...t,
		elements: {
			...a,
			...c && { reference: c }
		}
	}), m = e.useCallback((e) => {
		let t = Ui(e) ? {
			getBoundingClientRect: () => e.getBoundingClientRect(),
			contextElement: e
		} : e;
		l(t), p.refs.setReference(t);
	}, [p.refs]), h = e.useCallback((e) => {
		(Ui(e) || e === null) && (d.current = e, s(e)), (Ui(p.refs.reference.current) || p.refs.reference.current === null || e !== null && !Ui(e)) && p.refs.setReference(e);
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
	return qo(() => {
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
var ls = "active", us = "selected";
function ds(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i = n === "item", a = e;
	if (i && e) {
		let { [ls]: t, [us]: n, ...r } = e;
		a = r;
	}
	return {
		...n === "floating" && {
			tabIndex: -1,
			[os]: ""
		},
		...a,
		...t.map((t) => {
			let r = t ? t[n] : null;
			return typeof r == "function" ? e ? r(e) : null : r;
		}).concat(e).reduce((e, t) => (t && Object.entries(t).forEach((t) => {
			let [n, a] = t;
			if (!(i && [ls, us].includes(n))) if (n.indexOf("on") === 0) {
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
function fs(t) {
	t === void 0 && (t = []);
	let n = t.map((e) => e?.reference), r = t.map((e) => e?.floating), i = t.map((e) => e?.item), a = e.useCallback((e) => ds(e, t, "reference"), n), o = e.useCallback((e) => ds(e, t, "floating"), r), s = e.useCallback((e) => ds(e, t, "item"), i);
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
function ps(e, t) {
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
var ms = (e) => ({
	name: "inner",
	options: e,
	async fn(t) {
		let { listRef: n, overflowRef: r, onFallbackChange: i, offset: a = 0, index: o = 0, minItemsVisible: s = 4, referenceOverflowThreshold: c = 0, scrollRef: l, ...u } = _a(e, t), { rects: d, elements: { floating: f } } = t, p = n.current[o], m = l?.current || f, h = f.clientTop || m.clientTop, g = f.clientTop !== 0, _ = m.clientTop !== 0, v = f === m;
		if (!p) return {};
		let y = {
			...t,
			...await Io(-p.offsetTop - f.clientTop - d.reference.height / 2 - p.offsetHeight / 2 - a).fn(t)
		}, b = await wo(ps(y, m.scrollHeight + h + f.clientTop), u), x = await wo(y, {
			...u,
			elementContext: "reference"
		}), S = da(0, b.top), C = y.y + S, T = (m.scrollHeight > m.clientHeight ? (e) => e : fa)(da(0, m.scrollHeight + (g && v || _ ? h * 2 : 0) - S - da(0, b.bottom)));
		if (m.style.maxHeight = T + "px", m.scrollTop = S, i) {
			let e = m.offsetHeight < p.offsetHeight * ua(s, n.current.length) - 1 || x.top >= -c || x.bottom >= -c;
			w.flushSync(() => i(e));
		}
		return r && (r.current = await wo(ps({
			...y,
			y: C
		}, m.offsetHeight + h + f.clientTop), u)), { y: C };
	}
});
function hs(t, n) {
	let { open: r, elements: i } = t, { enabled: a = !0, overflowRef: o, scrollRef: s, onChange: c } = n, l = Ho(c), u = e.useRef(!1), d = e.useRef(null), f = e.useRef(null);
	e.useEffect(() => {
		if (!a) return;
		function e(e) {
			if (e.ctrlKey || !t || o.current == null) return;
			let n = e.deltaY, r = o.current.top >= -.5, i = o.current.bottom >= -.5, a = t.scrollHeight - t.clientHeight, s = n < 0 ? -1 : 1, c = n < 0 ? "max" : "min";
			t.scrollHeight <= t.clientHeight || (!r && n > 0 || !i && n < 0 ? (e.preventDefault(), w.flushSync(() => {
				l((e) => e + Math[c](n, a * s));
			})) : /firefox/i.test(la()) && (t.scrollTop += n));
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
var gs = i({
	styles: void 0,
	setReference: () => {},
	setFloating: () => {},
	getReferenceProps: () => ({}),
	getFloatingProps: () => ({}),
	slot: {}
});
gs.displayName = "FloatingContext";
var _s = i(null);
_s.displayName = "PlacementContext";
function vs(e) {
	return g(() => e ? typeof e == "string" ? { to: e } : e : null, [e]);
}
function ys() {
	return u(gs).setReference;
}
function bs() {
	return u(gs).getReferenceProps;
}
function xs() {
	let { getFloatingProps: e, slot: t } = u(gs);
	return l((...n) => Object.assign({}, e(...n), { "data-anchor": t.anchor }), [e, t]);
}
function Ss(e = null) {
	e === !1 && (e = null), typeof e == "string" && (e = { to: e });
	let t = u(_s), n = g(() => e, [JSON.stringify(e, (e, t) => t?.outerHTML ?? t)]);
	V(() => {
		t?.(n ?? null);
	}, [t, n]);
	let r = u(gs);
	return g(() => [r.setFloating, e ? r.styles : {}], [
		r.setFloating,
		e,
		r.styles
	]);
}
var Cs = 4;
function ws({ children: t, enabled: n = !0 }) {
	let [r, i] = y(null), [a, o] = y(0), s = v(null), [c, l] = y(null);
	Ts(c);
	let u = n && r !== null && c !== null, { to: d = "bottom", gap: f = 0, offset: p = 0, padding: m = 0, inner: h } = Es(r, c), [_, b = "center"] = d.split(" ");
	V(() => {
		u && o(0);
	}, [u]);
	let { refs: x, floatingStyles: S, context: C } = cs({
		open: u,
		placement: _ === "selection" ? b === "center" ? "bottom" : `bottom-${b}` : b === "center" ? `${_}` : `${_}-${b}`,
		strategy: "absolute",
		transform: !1,
		middleware: [
			Io({
				mainAxis: _ === "selection" ? 0 : f,
				crossAxis: p
			}),
			Lo({ padding: m }),
			_ !== "selection" && Ro({ padding: m }),
			_ === "selection" && h ? ms({
				...h,
				padding: m,
				overflowRef: s,
				offset: a,
				minItemsVisible: Cs,
				referenceOverflowThreshold: m,
				onFallbackChange(e) {
					if (!e) return;
					let t = C.elements.floating;
					if (!t) return;
					let n = parseFloat(getComputedStyle(t).scrollPaddingBottom) || 0, r = Math.min(Cs, t.childElementCount), i = 0, a = 0;
					for (let e of C.elements.floating?.childNodes ?? []) if (Cn(e)) {
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
			zo({
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
		whileElementsMounted: Co
	}), [w = _, T = b] = C.placement.split("-");
	_ === "selection" && (w = "selection");
	let E = g(() => ({ anchor: [w, T].filter(Boolean).join(" ") }), [w, T]), { getReferenceProps: D, getFloatingProps: O } = fs([hs(C, {
		overflowRef: s,
		onChange: o
	})]), k = H((e) => {
		l(e), x.setFloating(e);
	});
	return e.createElement(_s.Provider, { value: i }, e.createElement(gs.Provider, { value: {
		setFloating: k,
		setReference: x.setReference,
		styles: S,
		getReferenceProps: D,
		getFloatingProps: O,
		slot: E
	} }, t));
}
function Ts(e) {
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
function Es(e, t) {
	let n = Ds(e?.gap ?? "var(--anchor-gap, 0)", t), r = Ds(e?.offset ?? "var(--anchor-offset, 0)", t), i = Ds(e?.padding ?? "var(--anchor-padding, 0)", t);
	return {
		...e,
		gap: n,
		offset: r,
		padding: i
	};
}
function Ds(e, t, n = void 0) {
	let r = Pt(), i = H((e, t) => {
		if (e == null) return [n, null];
		if (typeof e == "number") return [e, null];
		if (typeof e == "string") {
			if (!t) return [n, null];
			let i = ks(e, t);
			return [i, (n) => {
				let a = Os(e);
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
						let l = ks(e, t);
						i !== l && (n(l), i = l);
					});
				}
				return r.dispose;
			}];
		}
		return [n, null];
	}), a = g(() => i(e, t)[0], [e, t]), [o = a, s] = y();
	return V(() => {
		let [n, r] = i(e, t);
		if (s(n), r) return r(s);
	}, [e, t]), o;
}
function Os(e) {
	let t = /var\((.*)\)/.exec(e);
	if (t) {
		let e = t[1].indexOf(",");
		if (e === -1) return [t[1]];
		let n = t[1].slice(0, e).trim(), r = t[1].slice(e + 1).trim();
		return r ? [n, ...Os(r)] : [n];
	}
	return [];
}
function ks(e, t) {
	let n = document.createElement("div");
	t.appendChild(n), n.style.setProperty("margin-top", "0px", "important"), n.style.setProperty("margin-top", e, "important");
	let r = parseFloat(window.getComputedStyle(n).marginTop) || 0;
	return t.removeChild(n), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/frozen.js
function As({ children: e, freeze: n }, i) {
	let a = js(n, e);
	return c(a) ? r(a, { ref: i }) : t.createElement(t.Fragment, null, a);
}
t.forwardRef(As);
function js(e, t) {
	let [n, r] = y(t);
	return !e && n !== t && r(t), e ? n : t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/open-closed.js
var Ms = i(null);
Ms.displayName = "OpenClosedContext";
var X = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(X || {});
function Ns() {
	return u(Ms);
}
function Ps({ value: e, children: n }) {
	return t.createElement(Ms.Provider, { value: e }, n);
}
function Fs({ children: e }) {
	return t.createElement(Ms.Provider, { value: null }, e);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/document-ready.js
function Is(e) {
	function t() {
		document.readyState !== "loading" && (e(), document.removeEventListener("DOMContentLoaded", t));
	}
	typeof window < "u" && typeof document < "u" && (document.addEventListener("DOMContentLoaded", t), t());
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/active-element-history.js
var Ls = [];
Is(() => {
	function e(e) {
		if (!wn(e.target) || e.target === document.body || Ls[0] === e.target) return;
		let t = e.target;
		t = t.closest(zr), Ls.unshift(t ?? e.target), Ls = Ls.filter((e) => e != null && e.isConnected), Ls.splice(10);
	}
	window.addEventListener("click", e, { capture: !0 }), window.addEventListener("mousedown", e, { capture: !0 }), window.addEventListener("focus", e, { capture: !0 }), document.body.addEventListener("click", e, { capture: !0 }), document.body.addEventListener("mousedown", e, { capture: !0 }), document.body.addEventListener("focus", e, { capture: !0 });
});
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/utils/calculate-active-index.js
function Rs(e) {
	throw Error("Unexpected object: " + e);
}
var Z = ((e) => (e[e.First = 0] = "First", e[e.Previous = 1] = "Previous", e[e.Next = 2] = "Next", e[e.Last = 3] = "Last", e[e.Specific = 4] = "Specific", e[e.Nothing = 5] = "Nothing", e))(Z || {});
function zs(e, t) {
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
		default: Rs(e);
	}
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
function Bs(e) {
	let t = H(e), n = v(!1);
	f(() => (n.current = !1, () => {
		n.current = !0, Mt(() => {
			n.current && t();
		});
	}), [t]);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
function Vs() {
	let t = typeof document > "u";
	return "useSyncExternalStore" in e && ((e) => e.useSyncExternalStore)(e)(() => () => {}, () => !1, () => !t);
}
function Hs() {
	let t = Vs(), [n, r] = e.useState(Dt.isHandoffComplete);
	return n && Dt.isHandoffComplete === !1 && r(!1), e.useEffect(() => {
		n !== !0 && r(!0);
	}, [n]), e.useEffect(() => Dt.handoff(), []), !t && n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/internal/portal-force-root.js
var Us = i(!1);
function Ws() {
	return u(Us);
}
function Gs(e) {
	return t.createElement(Us.Provider, { value: e.force }, e.children);
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/portal/portal.js
function Ks(e) {
	let t = Ws(), n = u(Zs), [r, i] = y(() => {
		if (!t && n !== null) return n.current ?? null;
		if (Dt.isServer) return null;
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
var qs = n, Js = G(function(e, n) {
	let { ownerDocument: r = null, ...i } = e, a = v(null), o = K(Fn((e) => {
		a.current = e;
	}), n), s = ci(a.current), c = Ks(r ?? s), l = u($s), d = Pt(), f = Hs(), p = W();
	return Bs(() => {
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
		defaultTag: qs,
		name: "Portal"
	})), c);
});
function Ys(e, n) {
	let r = K(n), { enabled: i = !0, ownerDocument: a, ...o } = e, s = W();
	return i ? t.createElement(Js, {
		...o,
		ownerDocument: a,
		ref: r
	}) : s({
		ourProps: { ref: r },
		theirProps: o,
		slot: {},
		defaultTag: qs,
		name: "Portal"
	});
}
var Xs = n, Zs = i(null);
function Qs(e, n) {
	let { target: r, ...i } = e, a = { ref: K(n) }, o = W();
	return t.createElement(Zs.Provider, { value: r }, o({
		ourProps: a,
		theirProps: i,
		defaultTag: Xs,
		name: "Popover.Group"
	}));
}
var $s = i(null);
function ec() {
	let e = u($s), n = v([]), r = H((t) => (n.current.push(t), e && e.register(t), () => i(t))), i = H((t) => {
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
		return t.createElement($s.Provider, { value: a }, e);
	}, [a])];
}
var tc = G(Ys), nc = G(Qs), rc = Object.assign(tc, { Group: nc }), ic = {
	Idle: { kind: "Idle" },
	Tracked: (e) => ({
		kind: "Tracked",
		position: e
	}),
	Moved: { kind: "Moved" }
};
function ac(e) {
	let t = e.getBoundingClientRect();
	return `${t.x},${t.y}`;
}
function oc(e, t, n) {
	let r = Nt();
	if (t.kind === "Tracked") {
		let i = function() {
			a !== ac(e) && (r.dispose(), n());
		}, { position: a } = t, o = new ResizeObserver(i);
		o.observe(e), r.add(() => o.disconnect()), r.addEventListener(window, "scroll", i, { passive: !0 }), r.addEventListener(window, "resize", i);
	}
	return () => r.dispose();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-escape.js
function sc(e, t = typeof document < "u" ? document.defaultView : null, n) {
	let r = Mr(e, "escape");
	hi(t, "keydown", (e) => {
		r && (e.defaultPrevented || e.key === q.Escape && n(e));
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-touch-device.js
function cc() {
	let [e] = y(() => typeof window < "u" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [t, n] = y(e?.matches ?? !1);
	return V(() => {
		if (!e) return;
		function t(e) {
			n(e.matches);
		}
		return e.addEventListener("change", t), () => e.removeEventListener("change", t);
	}, [e]), t;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-root-containers.js
function lc({ defaultContainers: e = [], portals: t, mainTreeNode: n } = {}) {
	let r = H(() => {
		let r = Ot(n), i = [];
		for (let t of e) t !== null && (Sn(t) ? i.push(t) : "current" in t && Sn(t.current) && i.push(t.current));
		if (t != null && t.current) for (let e of t.current) i.push(e);
		for (let e of r?.querySelectorAll("html > *, body > *") ?? []) e !== document.body && e !== document.head && Sn(e) && e.id !== "headlessui-portal-root" && (n && (e.contains(n) || e.contains(n?.getRootNode()?.host)) || i.some((t) => e.contains(t)) || i.push(e));
		return i;
	});
	return {
		resolveContainers: r,
		contains: H((e) => r().some((t) => t.contains(e)))
	};
}
var uc = i(null);
function dc({ children: e, node: n }) {
	let [r, i] = y(null), a = fc(n ?? r);
	return t.createElement(uc.Provider, { value: a }, e, a === null && t.createElement(mn, {
		features: fn.Hidden,
		ref: (e) => {
			if (e) {
				for (let t of Ot(e)?.querySelectorAll("html > *, body > *") ?? []) if (t !== document.body && t !== document.head && Sn(t) && t != null && t.contains(e)) {
					i(t);
					break;
				}
			}
		}
	}));
}
function fc(e = null) {
	return u(uc) ?? e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-is-mounted.js
function pc() {
	let e = v(!1);
	return V(() => (e.current = !0, () => {
		e.current = !1;
	}), []), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-tab-direction.js
var mc = ((e) => (e[e.Forwards = 0] = "Forwards", e[e.Backwards = 1] = "Backwards", e))(mc || {});
function hc() {
	let e = v(0);
	return ai(!0, "keydown", (t) => {
		t.key === "Tab" && (e.current = +!!t.shiftKey);
	}, !0), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/focus-trap/focus-trap.js
function gc(e) {
	if (!e) return /* @__PURE__ */ new Set();
	if (typeof e == "function") return new Set(e());
	let t = /* @__PURE__ */ new Set();
	for (let n of e.current) Sn(n.current) && t.add(n.current);
	return t;
}
var _c = "div", vc = ((e) => (e[e.None = 0] = "None", e[e.InitialFocus = 1] = "InitialFocus", e[e.TabLock = 2] = "TabLock", e[e.FocusLock = 4] = "FocusLock", e[e.RestoreFocus = 8] = "RestoreFocus", e[e.AutoFocus = 16] = "AutoFocus", e))(vc || {});
function yc(e, n) {
	let r = v(null), i = K(r, n), { initialFocus: a, initialFocusFallback: o, containers: s, features: c = 15, ...l } = e;
	Hs() || (c = 0);
	let u = ci(r.current);
	Cc(c, { ownerDocument: u });
	let d = wc(c, {
		ownerDocument: u,
		container: r,
		initialFocus: a,
		initialFocusFallback: o
	});
	Tc(c, {
		ownerDocument: u,
		container: r,
		containers: s,
		previousActiveElement: d
	});
	let f = hc(), p = H((e) => {
		if (!Cn(r.current)) return;
		let t = r.current;
		((e) => e())(() => {
			Ht(f.current, {
				[mc.Forwards]: () => {
					ei(t, Y.First, { skipElements: [e.relatedTarget, o] });
				},
				[mc.Backwards]: () => {
					ei(t, Y.Last, { skipElements: [e.relatedTarget, o] });
				}
			});
		});
	}), m = Mr(!!(c & 2), "focus-trap#tab-lock"), h = Pt(), g = v(!1), _ = {
		ref: i,
		onKeyDown(e) {
			e.key == "Tab" && (g.current = !0, h.requestAnimationFrame(() => {
				g.current = !1;
			}));
		},
		onBlur(e) {
			if (!(c & 4)) return;
			let t = gc(s);
			Cn(r.current) && t.add(r.current);
			let n = e.relatedTarget;
			wn(n) && n.dataset.headlessuiFocusGuard !== "true" && (Ec(t, n) || (g.current ? ei(r.current, Ht(f.current, {
				[mc.Forwards]: () => Y.Next,
				[mc.Backwards]: () => Y.Previous
			}) | Y.WrapAround, { relativeTo: e.target }) : wn(e.target) && Yr(e.target)));
		}
	}, y = W();
	return t.createElement(t.Fragment, null, m && t.createElement(mn, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: fn.Focusable
	}), y({
		ourProps: _,
		theirProps: l,
		defaultTag: _c,
		name: "FocusTrap"
	}), m && t.createElement(mn, {
		as: "button",
		type: "button",
		"data-headlessui-focus-guard": !0,
		onFocus: p,
		features: fn.Focusable
	}));
}
var bc = G(yc), xc = Object.assign(bc, { features: vc });
function Sc(e = !0) {
	let t = v(Ls.slice());
	return Li(([e], [n]) => {
		n === !0 && e === !1 && Mt(() => {
			t.current.splice(0);
		}), n === !1 && e === !0 && (t.current = Ls.slice());
	}, [
		e,
		Ls,
		t
	]), H(() => t.current.find((e) => e != null && e.isConnected) ?? null);
}
function Cc(e, { ownerDocument: t }) {
	let n = !!(e & 8), r = Sc(n);
	Li(() => {
		n || jt(t?.body) && Yr(r());
	}, [n]), Bs(() => {
		n && Yr(r());
	});
}
function wc(e, { ownerDocument: t, container: n, initialFocus: r, initialFocusFallback: i }) {
	let a = v(null), o = Mr(!!(e & 1), "focus-trap#initial-focus"), s = pc();
	return Li(() => {
		if (e === 0) return;
		if (!o) {
			i != null && i.current && Yr(i.current);
			return;
		}
		let c = n.current;
		c && Mt(() => {
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
			if (r != null && r.current) Yr(r.current);
			else {
				if (e & 16) {
					if (ei(c, Y.First | Y.AutoFocus) !== Vr.Error) return;
				} else if (ei(c, Y.First) !== Vr.Error) return;
				if (i != null && i.current && (Yr(i.current), t?.activeElement === i.current)) return;
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
function Tc(e, { ownerDocument: t, container: n, containers: r, previousActiveElement: i }) {
	let a = pc(), o = !!(e & 4);
	hi(t?.defaultView, "focus", (e) => {
		if (!o || !a.current) return;
		let t = gc(r);
		Cn(n.current) && t.add(n.current);
		let s = i.current;
		if (!s) return;
		let c = e.target;
		Cn(c) ? Ec(t, c) ? (i.current = c, Yr(c)) : (e.preventDefault(), e.stopPropagation(), Yr(s)) : Yr(i.current);
	}, !0);
}
function Ec(e, t) {
	for (let n of e) if (n.contains(t)) return !0;
	return !1;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/transition/transition.js
function Dc(e) {
	return !!(e.enter || e.enterFrom || e.enterTo || e.leave || e.leaveFrom || e.leaveTo) || !tn(e.as ?? Fc) || t.Children.count(e.children) === 1;
}
var Oc = i(null);
Oc.displayName = "TransitionContext";
var kc = ((e) => (e.Visible = "visible", e.Hidden = "hidden", e))(kc || {});
function Ac() {
	let e = u(Oc);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
function jc() {
	let e = u(Mc);
	if (e === null) throw Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
	return e;
}
var Mc = i(null);
Mc.displayName = "NestingContext";
function Nc(e) {
	return "children" in e ? Nc(e.children) : e.current.filter(({ el: e }) => e.current !== null).filter(({ state: e }) => e === "visible").length > 0;
}
function Pc(e, t) {
	let n = Ft(e), r = v([]), i = pc(), a = Pt(), o = H((e, t = Wt.Hidden) => {
		let o = r.current.findIndex(({ el: t }) => t === e);
		o !== -1 && (Ht(t, {
			[Wt.Unmount]() {
				r.current.splice(o, 1);
			},
			[Wt.Hidden]() {
				r.current[o].state = "hidden";
			}
		}), a.microTask(() => {
			var e;
			!Nc(r) && i.current && ((e = n.current) == null || e.call(n));
		}));
	}), s = H((e) => {
		let t = r.current.find(({ el: t }) => t === e);
		return t ? t.state !== "visible" && (t.state = "visible") : r.current.push({
			el: e,
			state: "visible"
		}), () => o(e, Wt.Unmount);
	}), c = v([]), l = v(Promise.resolve()), u = v({
		enter: [],
		leave: []
	}), d = H((e, n, r) => {
		c.current.splice(0), t && (t.chains.current[n] = t.chains.current[n].filter(([t]) => t !== e)), t?.chains.current[n].push([e, new Promise((e) => {
			c.current.push(e);
		})]), t?.chains.current[n].push([e, new Promise((e) => {
			Promise.all(u.current[n].map(([e, t]) => t)).then(() => e());
		})]), n === "enter" ? l.current = l.current.then(() => t?.wait.current).then(() => r(n)) : r(n);
	}), f = H((e, t, n) => {
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
var Fc = n, Ic = Ut.RenderStrategy;
function Lc(e, n) {
	var r;
	let { transition: i = !0, beforeEnter: a, afterEnter: o, beforeLeave: s, afterLeave: c, enter: l, enterFrom: u, enterTo: d, entered: p, leave: m, leaveFrom: h, leaveTo: g, ..._ } = e, [b, x] = y(null), S = v(null), C = Dc(e), w = K(...C ? [
		S,
		n,
		x
	] : n === null ? [] : [n]), T = (r = _.unmount) == null || r ? Wt.Unmount : Wt.Hidden, { show: E, appear: D, initial: O } = Ac(), [k, A] = y(E ? "visible" : "hidden"), j = jc(), { register: M, unregister: N } = j;
	V(() => M(S), [M, S]), V(() => {
		if (T === Wt.Hidden && S.current) {
			if (E && k !== "visible") {
				A("visible");
				return;
			}
			return Ht(k, {
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
	let P = Hs();
	V(() => {
		if (C && P && k === "visible" && S.current === null) throw Error("Did you forget to passthrough the `ref` to the actual DOM node?");
	}, [
		S,
		k,
		P,
		C
	]);
	let F = O && !D, I = D && E && O, ee = v(!1), L = Pc(() => {
		ee.current || (A("hidden"), N(S));
	}, j), R = H((e) => {
		ee.current = !0;
		let t = e ? "enter" : "leave";
		L.onStart(S, t, (e) => {
			e === "enter" ? a?.() : e === "leave" && s?.();
		});
	}), te = H((e) => {
		let t = e ? "enter" : "leave";
		ee.current = !1, L.onStop(S, t, (e) => {
			e === "enter" ? o?.() : e === "leave" && c?.();
		}), t === "leave" && !Nc(L) && (A("hidden"), N(S));
	});
	f(() => {
		C && i || (R(E), te(E));
	}, [
		E,
		C,
		i
	]);
	let [, z] = ji(!(!i || !C || !P || F), b, E, {
		start: R,
		end: te
	}), ne = Zt({
		ref: w,
		className: Vt(_.className, I && l, I && u, z.enter && l, z.enter && z.closed && u, z.enter && !z.closed && d, z.leave && m, z.leave && !z.closed && h, z.leave && z.closed && g, !z.transition && E && p)?.trim() || void 0,
		...Ai(z)
	}), re = 0;
	k === "visible" && (re |= X.Open), k === "hidden" && (re |= X.Closed), E && k === "hidden" && (re |= X.Opening), !E && k === "visible" && (re |= X.Closing);
	let ie = W();
	return t.createElement(Mc.Provider, { value: L }, t.createElement(Ps, { value: re }, ie({
		ourProps: ne,
		theirProps: _,
		defaultTag: Fc,
		features: Ic,
		visible: k === "visible",
		name: "Transition.Child"
	})));
}
function Rc(e, r) {
	let { show: i, appear: a = !1, unmount: o = !0, ...s } = e, c = v(null), l = K(...Dc(e) ? [c, r] : r === null ? [] : [r]);
	Hs();
	let u = Ns();
	if (i === void 0 && u !== null && (i = (u & X.Open) === X.Open), i === void 0) throw Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
	let [d, f] = y(i ? "visible" : "hidden"), p = Pc(() => {
		i || f("hidden");
	}), [m, h] = y(!0), _ = v([i]);
	V(() => {
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
	V(() => {
		i ? f("visible") : !Nc(p) && c.current !== null && f("hidden");
	}, [i, p]);
	let x = { unmount: o }, S = H(() => {
		var t;
		m && h(!1), (t = e.beforeEnter) == null || t.call(e);
	}), C = H(() => {
		var t;
		m && h(!1), (t = e.beforeLeave) == null || t.call(e);
	}), w = W();
	return t.createElement(Mc.Provider, { value: p }, t.createElement(Oc.Provider, { value: b }, w({
		ourProps: {
			...x,
			as: n,
			children: t.createElement(Vc, {
				ref: l,
				...x,
				...s,
				beforeEnter: S,
				beforeLeave: C
			})
		},
		theirProps: {},
		defaultTag: n,
		features: Ic,
		visible: d === "visible",
		name: "Transition"
	})));
}
function zc(e, n) {
	let r = u(Oc) !== null, i = Ns() !== null;
	return t.createElement(t.Fragment, null, !r && i ? t.createElement(Bc, {
		ref: n,
		...e
	}) : t.createElement(Vc, {
		ref: n,
		...e
	}));
}
var Bc = G(Rc), Vc = G(Lc), Hc = G(zc), Uc = Object.assign(Bc, {
	Child: Hc,
	Root: Bc
}), Wc = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Wc || {}), Gc = ((e) => (e[e.SetTitleId = 0] = "SetTitleId", e))(Gc || {}), Kc = { 0(e, t) {
	return e.titleId === t.id ? e : {
		...e,
		titleId: t.id
	};
} }, qc = i(null);
qc.displayName = "DialogContext";
function Jc(e) {
	let t = u(qc);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Dialog /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Jc), t;
	}
	return t;
}
function Yc(e, t) {
	return Ht(t.type, Kc, e, t);
}
var Xc = G(function(e, n) {
	let r = m(), { id: i = `headlessui-dialog-${r}`, open: a, onClose: s, initialFocus: c, role: u = "dialog", autoFocus: d = !0, __demoMode: f = !1, unmount: p = !1, ...h } = e, y = v(!1);
	u = function() {
		return u === "dialog" || u === "alertdialog" ? u : (y.current || (y.current = !0, console.warn(`Invalid role [${u}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
	}();
	let b = Ns();
	a === void 0 && b !== null && (a = (b & X.Open) === X.Open);
	let x = v(null), S = K(x, n), C = ci(x.current), w = +!a, [T, E] = _(Yc, {
		titleId: null,
		descriptionId: null,
		panelRef: o()
	}), D = H(() => s(!1)), O = H((e) => E({
		type: 0,
		id: e
	})), k = Hs() ? w === 0 : !1, [A, j] = ec(), M = { get current() {
		return T.panelRef.current ?? x.current;
	} }, N = fc(), { resolveContainers: P } = lc({
		mainTreeNode: N,
		portals: A,
		defaultContainers: [M]
	}), F = b !== null && (b & X.Closing) === X.Closing;
	Lr(f || F ? !1 : k, {
		allowed: H(() => [x.current?.closest("[data-headlessui-portal]") ?? null]),
		disallowed: H(() => [N?.closest("body > *:not(#headlessui-portal-root)") ?? null])
	});
	let I = Or.get(null);
	V(() => {
		if (k) return I.actions.push(i), () => I.actions.pop(i);
	}, [
		I,
		i,
		k
	]);
	let ee = J(I, l((e) => I.selectors.isTop(e, i), [I, i]));
	si(ee, P, (e) => {
		e.preventDefault(), D();
	}), sc(ee, C?.defaultView, (e) => {
		e.preventDefault(), e.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), D();
	}), Ti(f || F ? !1 : k, C, P), Rr(k, x, D);
	let [L, R] = zn(), te = g(() => [{
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
	]), z = U({ open: w === 0 }), ne = {
		ref: S,
		id: i,
		role: u,
		tabIndex: -1,
		"aria-modal": f ? void 0 : w === 0 || void 0,
		"aria-labelledby": T.titleId,
		"aria-describedby": L,
		unmount: p
	}, re = !cc(), ie = vc.None;
	k && !f && (ie |= vc.RestoreFocus, ie |= vc.TabLock, d && (ie |= vc.AutoFocus), re && (ie |= vc.InitialFocus));
	let ae = W();
	return t.createElement(Fs, null, t.createElement(Gs, { force: !0 }, t.createElement(rc, null, t.createElement(qc.Provider, { value: te }, t.createElement(nc, { target: x }, t.createElement(Gs, { force: !1 }, t.createElement(R, { slot: z }, t.createElement(j, null, t.createElement(xc, {
		initialFocus: c,
		initialFocusFallback: x,
		containers: P,
		features: ie
	}, t.createElement($n, { value: D }, ae({
		ourProps: ne,
		theirProps: h,
		slot: z,
		defaultTag: Zc,
		features: Qc,
		visible: w === 0,
		name: "Dialog"
	})))))))))));
}), Zc = "div", Qc = Ut.RenderStrategy | Ut.Static;
function $c(e, n) {
	let { transition: r = !1, open: i, ...a } = e, o = Ns(), s = e.hasOwnProperty("open") || o !== null, c = e.hasOwnProperty("onClose");
	if (!s && !c) throw Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
	if (!s) throw Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
	if (!c) throw Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
	if (!o && typeof e.open != "boolean") throw Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e.open}`);
	if (typeof e.onClose != "function") throw Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e.onClose}`);
	return (i !== void 0 || r) && !a.static ? t.createElement(dc, null, t.createElement(Uc, {
		show: i,
		transition: r,
		unmount: a.unmount
	}, t.createElement(Xc, {
		ref: n,
		...a
	}))) : t.createElement(dc, null, t.createElement(Xc, {
		ref: n,
		open: i,
		...a
	}));
}
var el = "div";
function tl(e, r) {
	let i = m(), { id: a = `headlessui-dialog-panel-${i}`, transition: o = !1, ...s } = e, [{ dialogState: c, unmount: l }, u] = Jc("Dialog.Panel"), d = K(r, u.panelRef), f = U({ open: c === 0 }), p = {
		ref: d,
		id: a,
		onClick: H((e) => {
			e.stopPropagation();
		})
	}, h = o ? Hc : n, g = o ? { unmount: l } : {}, _ = W();
	return t.createElement(h, { ...g }, _({
		ourProps: p,
		theirProps: s,
		slot: f,
		defaultTag: el,
		name: "Dialog.Panel"
	}));
}
var nl = "div";
function rl(e, r) {
	let { transition: i = !1, ...a } = e, [{ dialogState: o, unmount: s }] = Jc("Dialog.Backdrop"), c = U({ open: o === 0 }), l = {
		ref: r,
		"aria-hidden": !0
	}, u = i ? Hc : n, d = i ? { unmount: s } : {}, f = W();
	return t.createElement(u, { ...d }, f({
		ourProps: l,
		theirProps: a,
		slot: c,
		defaultTag: nl,
		name: "Dialog.Backdrop"
	}));
}
var il = "h2";
function al(e, t) {
	let n = m(), { id: r = `headlessui-dialog-title-${n}`, ...i } = e, [{ dialogState: a, setTitleId: o }] = Jc("Dialog.Title"), s = K(t);
	f(() => (o(r), () => o(null)), [r, o]);
	let c = U({ open: a === 0 }), l = {
		ref: s,
		id: r
	};
	return W()({
		ourProps: l,
		theirProps: i,
		slot: c,
		defaultTag: il,
		name: "Dialog.Title"
	});
}
var ol = G($c), sl = G(tl), cl = G(rl), ll = G(al), ul = Object.assign(ol, {
	Panel: sl,
	Title: ll,
	Description: Un
}), dl = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function fl(e) {
	let t = e.innerText ?? "", n = e.cloneNode(!0);
	if (!Cn(n)) return t;
	let r = !1;
	for (let e of n.querySelectorAll("[hidden],[aria-hidden],[role=\"img\"]")) e.remove(), r = !0;
	let i = r ? n.innerText ?? "" : t;
	return dl.test(i) && (i = i.replace(dl, "")), i;
}
function pl(e) {
	let t = e.getAttribute("aria-label");
	if (typeof t == "string") return t.trim();
	let n = e.getAttribute("aria-labelledby");
	if (n) {
		let e = n.split(" ").map((e) => {
			let t = document.getElementById(e);
			if (t) {
				let e = t.getAttribute("aria-label");
				return typeof e == "string" ? e.trim() : fl(t).trim();
			}
			return null;
		}).filter(Boolean);
		if (e.length > 0) return e.join(", ");
	}
	return fl(e).trim();
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/hooks/use-text-value.js
function ml(e) {
	let t = v(""), n = v("");
	return H(() => {
		let r = e.current;
		if (!r) return "";
		let i = r.innerText;
		if (t.current === i) return n.current;
		let a = pl(r).trim().toLowerCase();
		return t.current = i, n.current = a, a;
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox-machine.js
var hl = Object.defineProperty, gl = (e, t, n) => t in e ? hl(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, _l = (e, t, n) => (gl(e, typeof t == "symbol" ? t : t + "", n), n), vl = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(vl || {}), yl = ((e) => (e[e.Single = 0] = "Single", e[e.Multi = 1] = "Multi", e))(yl || {}), bl = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(bl || {}), xl = ((e) => (e[e.OpenListbox = 0] = "OpenListbox", e[e.CloseListbox = 1] = "CloseListbox", e[e.GoToOption = 2] = "GoToOption", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.SelectOption = 5] = "SelectOption", e[e.RegisterOptions = 6] = "RegisterOptions", e[e.UnregisterOptions = 7] = "UnregisterOptions", e[e.SetButtonElement = 8] = "SetButtonElement", e[e.SetOptionsElement = 9] = "SetOptionsElement", e[e.SortOptions = 10] = "SortOptions", e[e.MarkButtonAsMoved = 11] = "MarkButtonAsMoved", e))(xl || {});
function Sl(e, t = (e) => e) {
	let n = e.activeOptionIndex === null ? null : e.options[e.activeOptionIndex], r = Qr(t(e.options.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		options: r,
		activeOptionIndex: i
	};
}
var Cl = {
	1(e) {
		if (e.dataRef.current.disabled || e.listboxState === 1) return e;
		let t = e.buttonElement ? ic.Tracked(ac(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeOptionIndex: null,
			pendingFocus: { focus: Z.Nothing },
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
			buttonPositionState: ic.Idle
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
		if (t.focus === Z.Nothing) return {
			...n,
			activeOptionIndex: null
		};
		if (t.focus === Z.Specific) return {
			...n,
			activeOptionIndex: e.options.findIndex((e) => e.id === t.id)
		};
		if (t.focus === Z.Previous) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = zs(t, {
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
		} else if (t.focus === Z.Next) {
			let r = e.activeOptionIndex;
			if (r !== null) {
				let i = e.options[r].dataRef.current.domRef, a = zs(t, {
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
		let r = Sl(e), i = zs(t, {
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
		if (e.pendingFocus.focus !== Z.Nothing && (r = zs(e.pendingFocus, {
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
			pendingFocus: { focus: Z.Nothing },
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
		...Sl(e),
		pendingShouldSort: !1
	} : e,
	11(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: ic.Moved
		} : e;
	}
}, wl = class e extends _r {
	constructor(e) {
		super(e), _l(this, "actions", {
			onChange: (e) => {
				let { onChange: t, compare: n, mode: r, value: i } = this.state.dataRef.current;
				return Ht(r, {
					0: () => t?.(e),
					1: () => {
						let r = i.slice(), a = r.findIndex((t) => n(t, e));
						return a === -1 ? r.push(e) : r.splice(a, 1), t?.(r);
					}
				});
			},
			registerOption: xr(() => {
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
			unregisterOption: xr(() => {
				let e = [];
				return [(t) => e.push(t), () => {
					this.send({
						type: 7,
						options: e.splice(0)
					});
				}];
			}),
			goToOption: xr(() => {
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
		}), _l(this, "selectors", {
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
			let e = this.state.id, t = Or.get(null);
			this.disposables.add(t.on(Tr.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.listboxState === 0 && this.actions.closeListbox();
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(oc(t.buttonElement, t.buttonPositionState, () => {
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
			pendingFocus: { focus: Z.Nothing },
			frozenValue: !1,
			__demoMode: n,
			buttonPositionState: ic.Idle
		});
	}
	reduce(e, t) {
		return Ht(t.type, Cl, e, t);
	}
}, Tl = i(null);
function El(e) {
	let t = u(Tl);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Dl), t;
	}
	return t;
}
function Dl({ id: e, __demoMode: t = !1 }) {
	let n = g(() => wl.new({
		id: e,
		__demoMode: t
	}), []);
	return Bs(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/listbox/listbox.js
var Ol = i(null);
Ol.displayName = "ListboxDataContext";
function kl(e) {
	let t = u(Ol);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Listbox /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, kl), t;
	}
	return t;
}
var Al = n;
function jl(e, n) {
	let r = m(), i = Bt(), { value: a, defaultValue: o, form: s, name: c, onChange: u, by: d, invalid: f = !1, disabled: p = i || !1, horizontal: h = !1, multiple: g = !1, __demoMode: _ = !1, ...y } = e, b = h ? "horizontal" : "vertical", x = K(n), S = an(o), [C = g ? [] : void 0, w] = rn(a, u, S), T = Dl({
		id: r,
		__demoMode: _
	}), E = v({
		static: !1,
		hold: !1
	}), D = v(/* @__PURE__ */ new Map()), O = tr(d), k = l((e) => Ht(A.mode, {
		[yl.Multi]: () => C.some((t) => O(t, e)),
		[yl.Single]: () => O(C, e)
	}), [C]), A = U({
		value: C,
		disabled: p,
		invalid: f,
		mode: g ? yl.Multi : yl.Single,
		orientation: b,
		onChange: w,
		compare: O,
		isSelected: k,
		optionsPropsRef: E,
		listRef: D
	});
	V(() => {
		T.state.dataRef.current = A;
	}, [A]);
	let j = J(T, (e) => e.listboxState), M = Or.get(null), N = J(M, l((e) => M.selectors.isTop(e, r), [M, r])), [P, F] = J(T, (e) => [e.buttonElement, e.optionsElement]);
	si(N, [P, F], (e, t) => {
		T.send({ type: xl.CloseListbox }), Kr(t, Gr.Loose) || (e.preventDefault(), P?.focus());
	});
	let I = U({
		open: j === vl.Open,
		disabled: p,
		invalid: f,
		value: C
	}), [ee, L] = qn({ inherit: !0 }), R = { ref: x }, te = l(() => {
		if (S !== void 0) return w?.(S);
	}, [w, S]), z = W();
	return t.createElement(L, {
		value: ee,
		props: { htmlFor: P?.id },
		slot: {
			open: j === vl.Open,
			disabled: p
		}
	}, t.createElement(ws, null, t.createElement(Tl.Provider, { value: T }, t.createElement(Ol.Provider, { value: A }, t.createElement(Ps, { value: Ht(j, {
		[vl.Open]: X.Open,
		[vl.Closed]: X.Closed
	}) }, c != null && C != null && t.createElement(_n, {
		disabled: p,
		data: { [c]: C },
		form: s,
		onReset: te
	}), z({
		ourProps: R,
		theirProps: y,
		slot: I,
		defaultTag: Al,
		name: "Listbox"
	}))))));
}
var Ml = "button";
function Nl(e, t) {
	let n = m(), r = bn(), i = kl("Listbox.Button"), a = El("Listbox.Button"), { id: o = r || `headlessui-listbox-button-${n}`, disabled: s = i.disabled || !1, autoFocus: c = !1, ...u } = e, d = K(t, ys(), a.actions.setButtonElement), f = bs(), [p, h, g] = J(a, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement
	]);
	mi(p === vl.Open, {
		trigger: h,
		action: l((e) => {
			if (h != null && h.contains(e.target)) return di.Ignore;
			let t = e.target.closest("[role=\"option\"]:not([data-disabled])");
			return Cn(t) ? di.Select(t) : g != null && g.contains(e.target) ? di.Ignore : di.Close;
		}, [h, g]),
		close: a.actions.closeListbox,
		select: a.actions.selectActiveOption
	});
	let _ = H((e) => {
		switch (e.key) {
			case q.Enter:
				ln(e.currentTarget);
				break;
			case q.Space:
			case q.ArrowDown:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? Z.Nothing : Z.First });
				break;
			case q.ArrowUp:
				e.preventDefault(), a.actions.openListbox({ focus: i.value ? Z.Nothing : Z.Last });
				break;
		}
	}), v = H((e) => {
		switch (e.key) {
			case q.Space:
				e.preventDefault();
				break;
		}
	}), y = ar((e) => {
		var t;
		a.state.listboxState === vl.Open ? (E(() => a.actions.closeListbox()), (t = a.state.buttonElement) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), a.actions.openListbox({ focus: Z.Nothing }));
	}), b = H((e) => e.preventDefault()), x = Kn([o]), S = Rn(), { isFocusVisible: C, focusProps: w } = _t({ autoFocus: c }), { isHovered: T, hoverProps: D } = Ct({ isDisabled: s }), { pressed: O, pressProps: k } = Rt({ disabled: s }), A = U({
		open: p === vl.Open,
		active: O || p === vl.Open,
		disabled: s,
		invalid: i.invalid,
		value: i.value,
		hover: T,
		focus: C,
		autofocus: c
	}), j = J(a, (e) => e.listboxState === vl.Open), M = Xt(f(), {
		ref: d,
		id: o,
		type: gi(e, h),
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
	return W()({
		ourProps: M,
		theirProps: u,
		slot: A,
		defaultTag: Ml,
		name: "Listbox.Button"
	});
}
var Pl = i(!1), Fl = "div", Il = Ut.RenderStrategy | Ut.Static;
function Ll(e, n) {
	let r = m(), { id: i = `headlessui-listbox-options-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = vs(a), [p, h] = y(null);
	d && (o = !0);
	let _ = kl("Listbox.Options"), v = El("Listbox.Options"), [b, x, S, C] = J(v, (e) => [
		e.listboxState,
		e.buttonElement,
		e.optionsElement,
		e.__demoMode
	]), w = ci(x), T = ci(S), D = Ns(), [O, k] = ji(c, p, D === null ? b === vl.Open : (D & X.Open) === X.Open);
	Rr(O, x, v.actions.closeListbox), Ti(!C && s && b === vl.Open, T), Lr(!C && s && b === vl.Open, { allowed: l(() => [x, S], [x, S]) });
	let A = !J(v, v.selectors.didButtonMove) && O, j = js(J(v, v.selectors.hasFrozenValue) && !e.static, _.value), M = l((e) => _.compare(j, e), [_.compare, j]), N = J(v, (e) => {
		var t;
		if (d == null || !((t = d?.to) != null && t.includes("selection"))) return null;
		let n = e.options.findIndex((e) => M(e.dataRef.current.value));
		return n === -1 && (n = 0), n;
	}), [P, F] = Ss((() => {
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
	})()), I = xs(), ee = K(n, d ? P : null, v.actions.setOptionsElement, h), L = Pt();
	f(() => {
		let e = S;
		e && b === vl.Open && (jt(e) || e == null || e.focus({ preventScroll: !0 }));
	}, [b, S]);
	let R = H((e) => {
		var t;
		switch (L.dispose(), e.key) {
			case q.Space: if (v.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), v.actions.search(e.key);
			case q.Enter:
				e.preventDefault(), e.stopPropagation(), v.actions.selectActiveOption();
				break;
			case Ht(_.orientation, {
				vertical: q.ArrowDown,
				horizontal: q.ArrowRight
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Z.Next });
			case Ht(_.orientation, {
				vertical: q.ArrowUp,
				horizontal: q.ArrowLeft
			}): return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Z.Previous });
			case q.Home:
			case q.PageUp: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Z.First });
			case q.End:
			case q.PageDown: return e.preventDefault(), e.stopPropagation(), v.actions.goToOption({ focus: Z.Last });
			case q.Escape:
				e.preventDefault(), e.stopPropagation(), E(() => v.actions.closeListbox()), (t = v.state.buttonElement) == null || t.focus({ preventScroll: !0 });
				return;
			case q.Tab:
				e.preventDefault(), e.stopPropagation(), E(() => v.actions.closeListbox()), $r(v.state.buttonElement, e.shiftKey ? Y.Previous : Y.Next);
				break;
			default:
				e.key.length === 1 && (v.actions.search(e.key), L.setTimeout(() => v.actions.clearSearch(), 350));
				break;
		}
	}), te = J(v, (e) => e.buttonElement?.id), z = U({ open: b === vl.Open }), ne = Xt(d ? I() : {}, {
		id: i,
		ref: ee,
		"aria-activedescendant": J(v, v.selectors.activeDescendantId),
		"aria-multiselectable": _.mode === yl.Multi || void 0,
		"aria-labelledby": te,
		"aria-orientation": _.orientation,
		onKeyDown: R,
		role: "listbox",
		tabIndex: b === vl.Open ? 0 : void 0,
		style: {
			...u.style,
			...F,
			"--button-width": rr(O, x, !0).width
		},
		...Ai(k)
	}), re = W(), ie = g(() => _.mode === yl.Multi ? _ : {
		..._,
		isSelected: M
	}, [_, M]);
	return t.createElement(rc, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, t.createElement(Ol.Provider, { value: ie }, re({
		ourProps: ne,
		theirProps: u,
		slot: z,
		defaultTag: Fl,
		features: Il,
		visible: A,
		name: "Listbox.Options"
	})));
}
var Rl = "div";
function zl(e, t) {
	let n = m(), { id: r = `headlessui-listbox-option-${n}`, disabled: i = !1, value: a, ...o } = e, s = u(Pl) === !0, c = kl("Listbox.Option"), l = El("Listbox.Option"), d = J(l, (e) => l.selectors.isActive(e, r)), f = c.isSelected(a), p = v(null), h = ml(p), g = Ft({
		disabled: i,
		value: a,
		domRef: p,
		get textValue() {
			return h();
		}
	}), _ = K(t, p, (e) => {
		e ? c.listRef.current.set(r, e) : c.listRef.current.delete(r);
	}), y = J(l, (e) => l.selectors.shouldScrollIntoView(e, r));
	V(() => {
		if (y) return Nt().requestAnimationFrame(() => {
			var e, t;
			(t = (e = p.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [y, p]), V(() => {
		if (!s) return l.actions.registerOption(r, g), () => l.actions.unregisterOption(r);
	}, [
		g,
		r,
		s
	]);
	let b = H((e) => {
		if (i) return e.preventDefault();
		l.actions.selectOption(a);
	}), x = H(() => {
		if (i) return l.actions.goToOption({ focus: Z.Nothing });
		l.actions.goToOption({
			focus: Z.Specific,
			id: r
		});
	}), S = Di(), C = H((e) => S.update(e)), w = H((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === bl.Pointer || l.actions.goToOption({
			focus: Z.Specific,
			id: r
		}, bl.Pointer));
	}), T = H((e) => {
		S.wasMoved(e) && (i || d && l.state.activationTrigger === bl.Pointer && l.actions.goToOption({ focus: Z.Nothing }));
	}), E = U({
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
	}, O = W();
	return !f && s ? null : O({
		ourProps: D,
		theirProps: o,
		slot: E,
		defaultTag: Rl,
		name: "Listbox.Option"
	});
}
var Bl = n;
function Vl(e, n) {
	let { options: r, placeholder: i, ...a } = e, o = { ref: K(n) }, s = kl("ListboxSelectedOption"), c = U({}), l = s.value === void 0 || s.value === null || s.mode === yl.Multi && Array.isArray(s.value) && s.value.length === 0, u = W();
	return t.createElement(Pl.Provider, { value: !0 }, u({
		ourProps: o,
		theirProps: {
			...a,
			children: t.createElement(t.Fragment, null, i && l ? i : r)
		},
		slot: c,
		defaultTag: Bl,
		name: "ListboxSelectedOption"
	}));
}
var Hl = G(jl), Ul = G(Nl), Wl = Zn, Gl = G(Ll), Kl = G(zl), ql = G(Vl), Jl = Object.assign(Hl, {
	Button: Ul,
	Label: Wl,
	Options: Gl,
	Option: Kl,
	SelectedOption: ql
}), Yl = Object.defineProperty, Xl = (e, t, n) => t in e ? Yl(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Zl = (e, t, n) => (Xl(e, typeof t == "symbol" ? t : t + "", n), n), Ql = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Ql || {}), $l = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))($l || {}), Q = ((e) => (e[e.OpenMenu = 0] = "OpenMenu", e[e.CloseMenu = 1] = "CloseMenu", e[e.GoToItem = 2] = "GoToItem", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.RegisterItems = 5] = "RegisterItems", e[e.UnregisterItems = 6] = "UnregisterItems", e[e.SetButtonElement = 7] = "SetButtonElement", e[e.SetItemsElement = 8] = "SetItemsElement", e[e.SortItems = 9] = "SortItems", e[e.MarkButtonAsMoved = 10] = "MarkButtonAsMoved", e))(Q || {});
function eu(e, t = (e) => e) {
	let n = e.activeItemIndex === null ? null : e.items[e.activeItemIndex], r = Qr(t(e.items.slice()), (e) => e.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
	return i === -1 && (i = null), {
		items: r,
		activeItemIndex: i
	};
}
var tu = {
	1(e) {
		if (e.menuState === 1) return e;
		let t = e.buttonElement ? ic.Tracked(ac(e.buttonElement)) : e.buttonPositionState;
		return {
			...e,
			activeItemIndex: null,
			pendingFocus: { focus: Z.Nothing },
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
			buttonPositionState: ic.Idle
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
		if (t.focus === Z.Nothing) return {
			...n,
			activeItemIndex: null
		};
		if (t.focus === Z.Specific) return {
			...n,
			activeItemIndex: e.items.findIndex((e) => e.id === t.id)
		};
		if (t.focus === Z.Previous) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = zs(t, {
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
		} else if (t.focus === Z.Next) {
			let r = e.activeItemIndex;
			if (r !== null) {
				let i = e.items[r].dataRef.current.domRef, a = zs(t, {
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
		let r = eu(e), i = zs(t, {
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
		return e.pendingFocus.focus !== Z.Nothing && (r = zs(e.pendingFocus, {
			resolveItems: () => n,
			resolveActiveIndex: () => e.activeItemIndex,
			resolveId: (e) => e.id,
			resolveDisabled: (e) => e.dataRef.current.disabled
		})), {
			...e,
			items: n,
			activeItemIndex: r,
			pendingFocus: { focus: Z.Nothing },
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
		...eu(e),
		pendingShouldSort: !1
	} : e,
	10(e) {
		return e.buttonPositionState.kind === "Tracked" ? {
			...e,
			buttonPositionState: ic.Moved
		} : e;
	}
}, nu = class e extends _r {
	constructor(e) {
		super(e), Zl(this, "actions", {
			registerItem: xr(() => {
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
			unregisterItem: xr(() => {
				let e = [];
				return [(t) => e.push(t), () => this.send({
					type: 6,
					items: e.splice(0)
				})];
			})
		}), Zl(this, "selectors", {
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
			let e = this.state.id, t = Or.get(null);
			this.disposables.add(t.on(Tr.Push, (n) => {
				!t.selectors.isTop(n, e) && this.state.menuState === 0 && this.send({ type: 1 });
			})), this.on(0, () => t.actions.push(e)), this.on(1, () => t.actions.pop(e));
		}
		this.disposables.group((e) => {
			this.on(1, (t) => {
				t.buttonElement && (e.dispose(), e.add(oc(t.buttonElement, t.buttonPositionState, () => {
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
			pendingFocus: { focus: Z.Nothing },
			buttonPositionState: ic.Idle
		});
	}
	reduce(e, t) {
		return Ht(t.type, tu, e, t);
	}
}, ru = i(null);
function iu(e) {
	let t = u(ru);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Menu /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, au), t;
	}
	return t;
}
function au({ id: e, __demoMode: t = !1 }) {
	let n = g(() => nu.new({
		id: e,
		__demoMode: t
	}), []);
	return Bs(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/menu/menu.js
var ou = n;
function su(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = au({
		id: r,
		__demoMode: i
	}), [s, c, u] = J(o, (e) => [
		e.menuState,
		e.itemsElement,
		e.buttonElement
	]), d = K(n), f = Or.get(null);
	si(J(f, l((e) => f.selectors.isTop(e, r), [f, r])), [u, c], (e, t) => {
		var n;
		o.send({ type: Q.CloseMenu }), Kr(t, Gr.Loose) || (e.preventDefault(), (n = o.state.buttonElement) == null || n.focus());
	});
	let p = H(() => {
		o.send({ type: Q.CloseMenu });
	}), h = U({
		open: s === Ql.Open,
		close: p
	}), g = { ref: d }, _ = W();
	return t.createElement(ws, null, t.createElement(ru.Provider, { value: o }, t.createElement(Ps, { value: Ht(s, {
		[Ql.Open]: X.Open,
		[Ql.Closed]: X.Closed
	}) }, _({
		ourProps: g,
		theirProps: a,
		slot: h,
		defaultTag: ou,
		name: "Menu"
	}))));
}
var cu = "button";
function lu(e, t) {
	let n = iu("Menu.Button"), r = m(), { id: i = `headlessui-menu-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = v(null), u = bs(), d = K(t, c, ys(), H((e) => n.send({
		type: Q.SetButtonElement,
		element: e
	}))), f = H((e) => {
		switch (e.key) {
			case q.Space:
			case q.Enter:
			case q.ArrowDown:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Q.OpenMenu,
					focus: { focus: Z.First }
				});
				break;
			case q.ArrowUp:
				e.preventDefault(), e.stopPropagation(), n.send({
					type: Q.OpenMenu,
					focus: { focus: Z.Last }
				});
				break;
		}
	}), p = H((e) => {
		switch (e.key) {
			case q.Space:
				e.preventDefault();
				break;
		}
	}), [h, g, _] = J(n, (e) => [
		e.menuState,
		e.buttonElement,
		e.itemsElement
	]);
	mi(h === Ql.Open, {
		trigger: g,
		action: l((e) => {
			if (g != null && g.contains(e.target)) return di.Ignore;
			let t = e.target.closest("[role=\"menuitem\"]:not([data-disabled])");
			return Cn(t) ? di.Select(t) : _ != null && _.contains(e.target) ? di.Ignore : di.Close;
		}, [g, _]),
		close: l(() => n.send({ type: Q.CloseMenu }), []),
		select: l((e) => e.click(), [])
	});
	let y = ar((e) => {
		var t;
		a || (h === Ql.Open ? (E(() => n.send({ type: Q.CloseMenu })), (t = c.current) == null || t.focus({ preventScroll: !0 })) : (e.preventDefault(), n.send({
			type: Q.OpenMenu,
			focus: { focus: Z.Nothing },
			trigger: $l.Pointer
		})));
	}), { isFocusVisible: b, focusProps: x } = _t({ autoFocus: o }), { isHovered: S, hoverProps: C } = Ct({ isDisabled: a }), { pressed: w, pressProps: T } = Rt({ disabled: a }), D = U({
		open: h === Ql.Open,
		active: w || h === Ql.Open,
		disabled: a,
		hover: S,
		focus: b,
		autofocus: o
	}), O = Xt(u(), {
		ref: d,
		id: i,
		type: gi(e, c.current),
		"aria-haspopup": "menu",
		"aria-controls": _?.id,
		"aria-expanded": h === Ql.Open,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: f,
		onKeyUp: p
	}, y, x, C, T);
	return W()({
		ourProps: O,
		theirProps: s,
		slot: D,
		defaultTag: cu,
		name: "Menu.Button"
	});
}
var uu = "div", du = Ut.RenderStrategy | Ut.Static;
function fu(e, n) {
	let r = m(), { id: i = `headlessui-menu-items-${r}`, anchor: a, portal: o = !1, modal: s = !0, transition: c = !1, ...u } = e, d = vs(a), p = iu("Menu.Items"), [h, g] = Ss(d), _ = xs(), [v, b] = y(null), x = K(n, d ? h : null, H((e) => p.send({
		type: Q.SetItemsElement,
		element: e
	})), b), [S, C] = J(p, (e) => [e.menuState, e.buttonElement]), w = ci(C), T = ci(v);
	d && (o = !0);
	let D = Ns(), [O, k] = ji(c, v, D === null ? S === Ql.Open : (D & X.Open) === X.Open);
	Rr(O, C, () => {
		p.send({ type: Q.CloseMenu });
	});
	let A = J(p, (e) => e.__demoMode);
	Ti(!A && s && S === Ql.Open, T), Lr(!A && s && S === Ql.Open, { allowed: l(() => [C, v], [C, v]) });
	let j = !J(p, p.selectors.didButtonMove) && O;
	f(() => {
		let e = v;
		e && S === Ql.Open && (jt(e) || e.focus({ preventScroll: !0 }));
	}, [S, v]), Ii(S === Ql.Open, {
		container: v,
		accept(e) {
			return e.getAttribute("role") === "menuitem" ? NodeFilter.FILTER_REJECT : e.hasAttribute("role") ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
		},
		walk(e) {
			e.setAttribute("role", "none");
		}
	});
	let M = Pt(), N = H((e) => {
		var t, n;
		switch (M.dispose(), e.key) {
			case q.Space: if (p.state.searchQuery !== "") return e.preventDefault(), e.stopPropagation(), p.send({
				type: Q.Search,
				value: e.key
			});
			case q.Enter:
				if (e.preventDefault(), e.stopPropagation(), p.state.activeItemIndex !== null) {
					let { dataRef: e } = p.state.items[p.state.activeItemIndex];
					(t = e.current?.domRef.current) == null || t.click();
				}
				p.send({ type: Q.CloseMenu }), qr(p.state.buttonElement);
				break;
			case q.ArrowDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Q.GoToItem,
				focus: Z.Next
			});
			case q.ArrowUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Q.GoToItem,
				focus: Z.Previous
			});
			case q.Home:
			case q.PageUp: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Q.GoToItem,
				focus: Z.First
			});
			case q.End:
			case q.PageDown: return e.preventDefault(), e.stopPropagation(), p.send({
				type: Q.GoToItem,
				focus: Z.Last
			});
			case q.Escape:
				e.preventDefault(), e.stopPropagation(), E(() => p.send({ type: Q.CloseMenu })), (n = p.state.buttonElement) == null || n.focus({ preventScroll: !0 });
				break;
			case q.Tab:
				e.preventDefault(), e.stopPropagation(), E(() => p.send({ type: Q.CloseMenu })), $r(p.state.buttonElement, e.shiftKey ? Y.Previous : Y.Next);
				break;
			default:
				e.key.length === 1 && (p.send({
					type: Q.Search,
					value: e.key
				}), M.setTimeout(() => p.send({ type: Q.ClearSearch }), 350));
				break;
		}
	}), P = H((e) => {
		switch (e.key) {
			case q.Space:
				e.preventDefault();
				break;
		}
	}), F = U({ open: S === Ql.Open }), I = Xt(d ? _() : {}, {
		"aria-activedescendant": J(p, p.selectors.activeDescendantId),
		"aria-labelledby": J(p, (e) => e.buttonElement?.id),
		id: i,
		onKeyDown: N,
		onKeyUp: P,
		role: "menu",
		tabIndex: S === Ql.Open ? 0 : void 0,
		ref: x,
		style: {
			...u.style,
			...g,
			"--button-width": rr(O, C, !0).width
		},
		...Ai(k)
	}), ee = W();
	return t.createElement(rc, {
		enabled: o ? e.static || O : !1,
		ownerDocument: w
	}, ee({
		ourProps: I,
		theirProps: u,
		slot: F,
		defaultTag: uu,
		features: du,
		visible: j,
		name: "Menu.Items"
	}));
}
var pu = n;
function mu(e, n) {
	let r = m(), { id: i = `headlessui-menu-item-${r}`, disabled: a = !1, ...o } = e, s = iu("Menu.Item"), c = J(s, (e) => s.selectors.isActive(e, i)), l = v(null), u = K(n, l), d = J(s, (e) => s.selectors.shouldScrollIntoView(e, i));
	V(() => {
		if (d) return Nt().requestAnimationFrame(() => {
			var e, t;
			(t = (e = l.current)?.scrollIntoView) == null || t.call(e, { block: "nearest" });
		});
	}, [d, l]);
	let f = ml(l), p = v({
		disabled: a,
		domRef: l,
		get textValue() {
			return f();
		}
	});
	V(() => {
		p.current.disabled = a;
	}, [p, a]), V(() => (s.actions.registerItem(i, p), () => s.actions.unregisterItem(i)), [p, i]);
	let h = H(() => {
		s.send({ type: Q.CloseMenu });
	}), g = H((e) => {
		if (a) return e.preventDefault();
		s.send({ type: Q.CloseMenu }), qr(s.state.buttonElement);
	}), _ = H(() => {
		if (a) return s.send({
			type: Q.GoToItem,
			focus: Z.Nothing
		});
		s.send({
			type: Q.GoToItem,
			focus: Z.Specific,
			id: i
		});
	}), y = Di(), b = H((e) => y.update(e)), x = H((e) => {
		y.wasMoved(e) && (a || c || s.send({
			type: Q.GoToItem,
			focus: Z.Specific,
			id: i,
			trigger: $l.Pointer
		}));
	}), S = H((e) => {
		y.wasMoved(e) && (a || c && s.state.activationTrigger === $l.Pointer && s.send({
			type: Q.GoToItem,
			focus: Z.Nothing
		}));
	}), [C, w] = qn(), [T, E] = zn(), D = U({
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
	}, k = W();
	return t.createElement(w, null, t.createElement(E, null, k({
		ourProps: O,
		theirProps: o,
		slot: D,
		defaultTag: pu,
		name: "Menu.Item"
	})));
}
var hu = "div";
function gu(e, n) {
	let [r, i] = qn(), a = e, o = {
		ref: n,
		"aria-labelledby": r,
		role: "group"
	}, s = W();
	return t.createElement(i, null, s({
		ourProps: o,
		theirProps: a,
		slot: {},
		defaultTag: hu,
		name: "Menu.Section"
	}));
}
var _u = "header";
function vu(e, t) {
	let n = m(), { id: r = `headlessui-menu-heading-${n}`, ...i } = e, a = Gn();
	V(() => a.register(r), [r, a.register]);
	let o = {
		id: r,
		ref: t,
		role: "presentation",
		...a.props
	};
	return W()({
		ourProps: o,
		theirProps: i,
		slot: {},
		defaultTag: _u,
		name: "Menu.Heading"
	});
}
var yu = "div";
function bu(e, t) {
	let n = e, r = {
		ref: t,
		role: "separator"
	};
	return W()({
		ourProps: r,
		theirProps: n,
		slot: {},
		defaultTag: yu,
		name: "Menu.Separator"
	});
}
var xu = G(su), Su = G(lu), Cu = G(fu), $ = G(mu), wu = G(gu), Tu = G(vu), Eu = G(bu), Du = Object.assign(xu, {
	Button: Su,
	Items: Cu,
	Item: $,
	Section: wu,
	Heading: Tu,
	Separator: Eu
}), Ou = Object.defineProperty, ku = (e, t, n) => t in e ? Ou(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, Au = (e, t, n) => (ku(e, typeof t == "symbol" ? t : t + "", n), n), ju = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(ju || {}), Mu = ((e) => (e[e.OpenPopover = 0] = "OpenPopover", e[e.ClosePopover = 1] = "ClosePopover", e[e.SetButton = 2] = "SetButton", e[e.SetButtonId = 3] = "SetButtonId", e[e.SetPanel = 4] = "SetPanel", e[e.SetPanelId = 5] = "SetPanelId", e))(Mu || {}), Nu = {
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
}, Pu = class e extends _r {
	constructor(e) {
		super(e), Au(this, "actions", {
			close: () => this.send({ type: 1 }),
			refocusableClose: (e) => {
				this.actions.close(), (e ? Cn(e) ? e : "current" in e && Cn(e.current) ? e.current : this.state.button : this.state.button)?.focus();
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
		}), Au(this, "selectors", { isPortalled: (e) => {
			if (!e.button || !e.panel) return !1;
			let t = Ot(e.button) ?? document;
			for (let n of t.querySelectorAll("body > *")) if (Number(n?.contains(e.button)) ^ Number(n?.contains(e.panel))) return !0;
			let n = Ur(t), r = n.indexOf(e.button), i = (r + n.length - 1) % n.length, a = (r + 1) % n.length, o = n[i], s = n[a];
			return !e.panel.contains(o) && !e.panel.contains(s);
		} });
		{
			let e = this.state.id, t = Or.get(null);
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
		return Ht(t.type, Nu, e, t);
	}
}, Fu = i(null);
function Iu(e) {
	let t = u(Fu);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <Popover /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, Iu), t;
	}
	return t;
}
function Lu({ id: e, __demoMode: t = !1 }) {
	let n = g(() => Pu.new({
		id: e,
		__demoMode: t
	}), []);
	return Bs(() => n.dispose()), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@headlessui+react@2.2.10_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/@headlessui/react/dist/components/popover/popover.js
var Ru = i(null);
Ru.displayName = "PopoverGroupContext";
function zu() {
	return u(Ru);
}
var Bu = i(null);
Bu.displayName = "PopoverPanelContext";
function Vu() {
	return u(Bu);
}
var Hu = "div";
function Uu(e, n) {
	let r = m(), { __demoMode: i = !1, ...a } = e, o = Lu({
		id: r,
		__demoMode: i
	}), s = v(null), c = K(n, Fn((e) => {
		s.current = e;
	})), [u, d, p, h, _] = J(o, l((e) => [
		e.popoverState,
		e.button,
		e.panel,
		e.buttonId,
		e.panelId
	], [])), y = li(s.current ?? d), b = Ft(h), x = Ft(_), S = g(() => ({
		buttonId: b,
		panelId: x,
		close: o.actions.close
	}), [
		b,
		x,
		o
	]), C = zu(), w = C?.registerPopover, T = H(() => {
		let e = At(s.current ?? d);
		return C?.isFocusWithinPopoverGroup() ?? (e && (d?.contains(e) || p?.contains(e)));
	});
	f(() => w?.(S), [w, S]);
	let [E, D] = ec(), O = fc(d), k = lc({
		mainTreeNode: O,
		portals: E,
		defaultContainers: [{ get current() {
			return o.state.button;
		} }, { get current() {
			return o.state.panel;
		} }]
	});
	hi(y, "focus", (e) => {
		var t, n, r, i, a, s;
		e.target !== window && wn(e.target) && o.state.popoverState === ju.Open && (T() || o.state.button && o.state.panel && (k.contains(e.target) || (n = (t = o.state.beforePanelSentinel.current)?.contains) != null && n.call(t, e.target) || (i = (r = o.state.afterPanelSentinel.current)?.contains) != null && i.call(r, e.target) || (s = (a = o.state.afterButtonSentinel.current)?.contains) != null && s.call(a, e.target) || o.actions.close()));
	}, !0), si(u === ju.Open, k.resolveContainers, (e, t) => {
		o.actions.close(), Kr(t, Gr.Loose) || (e.preventDefault(), d?.focus());
	});
	let A = U({
		open: u === ju.Open,
		close: o.actions.refocusableClose
	}), j = J(o, l((e) => Ht(e.popoverState, {
		[ju.Open]: X.Open,
		[ju.Closed]: X.Closed
	}), [])), M = { ref: c }, N = W();
	return t.createElement(dc, { node: O }, t.createElement(ws, null, t.createElement(Bu.Provider, { value: null }, t.createElement(Fu.Provider, { value: o }, t.createElement($n, { value: o.actions.refocusableClose }, t.createElement(Ps, { value: j }, t.createElement(D, null, N({
		ourProps: M,
		theirProps: a,
		slot: A,
		defaultTag: Hu,
		name: "Popover"
	}))))))));
}
var Wu = "button";
function Gu(e, n) {
	let r = m(), { id: i = `headlessui-popover-button-${r}`, disabled: a = !1, autoFocus: o = !1, ...s } = e, c = Iu("Popover.Button"), [u, d, p, h, g, _, b] = J(c, l((e) => [
		e.popoverState,
		c.selectors.isPortalled(e),
		e.button,
		e.buttonId,
		e.panel,
		e.panelId,
		e.afterButtonSentinel
	], [])), x = v(null), S = `headlessui-focus-sentinel-${m()}`, C = zu()?.closeOthers, w = Vu() !== null;
	f(() => {
		if (!w) return c.actions.setButtonId(i), () => c.actions.setButtonId(null);
	}, [
		w,
		i,
		c
	]);
	let [T] = y(() => Symbol()), E = K(x, n, ys(), H((e) => {
		if (!w) {
			if (e) c.state.buttons.current.push(T);
			else {
				let e = c.state.buttons.current.indexOf(T);
				e !== -1 && c.state.buttons.current.splice(e, 1);
			}
			c.state.buttons.current.length > 1 && console.warn("You are already using a <Popover.Button /> but only 1 <Popover.Button /> is supported."), e && c.actions.setButton(e);
		}
	})), D = K(x, n), O = H((e) => {
		var t, n, r;
		if (w) {
			if (c.state.popoverState === ju.Closed) return;
			switch (e.key) {
				case q.Space:
				case q.Enter:
					e.preventDefault(), (n = (t = e.target).click) == null || n.call(t), c.actions.close(), (r = c.state.button) == null || r.focus();
					break;
			}
		} else switch (e.key) {
			case q.Space:
			case q.Enter:
				e.preventDefault(), e.stopPropagation(), c.state.popoverState === ju.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close();
				break;
			case q.Escape:
				if (c.state.popoverState !== ju.Open) return C?.(c.state.buttonId);
				if (!x.current) return;
				let t = At(x.current);
				if (t && !x.current.contains(t)) return;
				e.preventDefault(), e.stopPropagation(), c.actions.close();
				break;
		}
	}), k = H((e) => {
		w || e.key === q.Space && e.preventDefault();
	}), A = H((e) => {
		var t, n;
		Mn(e.currentTarget) || a || (w ? (c.actions.close(), (t = c.state.button) == null || t.focus()) : (e.preventDefault(), e.stopPropagation(), c.state.popoverState === ju.Closed ? (C?.(c.state.buttonId), c.actions.open()) : c.actions.close(), (n = c.state.button) == null || n.focus()));
	}), j = H((e) => {
		e.preventDefault(), e.stopPropagation();
	}), { isFocusVisible: M, focusProps: N } = _t({ autoFocus: o }), { isHovered: P, hoverProps: F } = Ct({ isDisabled: a }), { pressed: I, pressProps: ee } = Rt({ disabled: a }), L = u === ju.Open, R = U({
		open: L,
		active: I || L,
		disabled: a,
		hover: P,
		focus: M,
		autofocus: o
	}), te = gi(e, p), z = Xt(w ? {
		ref: D,
		type: te,
		onKeyDown: O,
		onClick: A,
		disabled: a || void 0,
		autoFocus: o
	} : {
		ref: E,
		id: h,
		type: te,
		"aria-expanded": u === ju.Open,
		"aria-controls": g ? _ : void 0,
		disabled: a || void 0,
		autoFocus: o,
		onKeyDown: O,
		onKeyUp: k,
		onClick: A,
		onMouseDown: j
	}, N, F, ee), ne = hc(), re = H(() => {
		if (!Cn(c.state.panel)) return;
		let e = c.state.panel;
		function t() {
			Ht(ne.current, {
				[mc.Forwards]: () => ei(e, Y.First),
				[mc.Backwards]: () => ei(e, Y.Last)
			}) === Vr.Error && ei(Ur(kt(c.state.button)).filter((e) => e.dataset.headlessuiFocusGuard !== "true"), Ht(ne.current, {
				[mc.Forwards]: Y.Next,
				[mc.Backwards]: Y.Previous
			}), { relativeTo: c.state.button });
		}
		t();
	}), ie = W();
	return t.createElement(t.Fragment, null, ie({
		ourProps: z,
		theirProps: s,
		slot: R,
		defaultTag: Wu,
		name: "Popover.Button"
	}), L && !w && d && t.createElement(mn, {
		id: S,
		ref: b,
		features: fn.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: re
	}));
}
var Ku = "div", qu = Ut.RenderStrategy | Ut.Static;
function Ju(e, t) {
	let n = m(), { id: r = `headlessui-popover-backdrop-${n}`, transition: i = !1, ...a } = e, o = Iu("Popover.Backdrop"), s = J(o, l((e) => e.popoverState, [])), [c, u] = y(null), d = K(t, u), f = Ns(), [p, h] = ji(i, c, f === null ? s === ju.Open : (f & X.Open) === X.Open), g = H((e) => {
		if (Mn(e.currentTarget)) return e.preventDefault();
		o.actions.close();
	}), _ = U({ open: s === ju.Open }), v = {
		ref: d,
		id: r,
		"aria-hidden": !0,
		onClick: g,
		...Ai(h)
	};
	return W()({
		ourProps: v,
		theirProps: a,
		slot: _,
		defaultTag: Ku,
		features: qu,
		visible: p,
		name: "Popover.Backdrop"
	});
}
var Yu = "div", Xu = Ut.RenderStrategy | Ut.Static;
function Zu(e, n) {
	let r = m(), { id: i = `headlessui-popover-panel-${r}`, focus: a = !1, anchor: o, portal: s = !1, modal: c = !1, transition: u = !1, ...d } = e, p = Iu("Popover.Panel"), h = J(p, p.selectors.isPortalled), [g, _, b, x, S] = J(p, l((e) => [
		e.popoverState,
		e.button,
		e.__demoMode,
		e.beforePanelSentinel,
		e.afterPanelSentinel
	], [])), C = `headlessui-focus-sentinel-before-${r}`, w = `headlessui-focus-sentinel-after-${r}`, T = v(null), E = vs(o), [D, O] = Ss(E), k = xs();
	E && (s = !0);
	let [A, j] = y(null), M = K(T, n, E ? D : null, p.actions.setPanel, j), N = ci(_), P = ci(T.current);
	V(() => (p.actions.setPanelId(i), () => p.actions.setPanelId(null)), [i, p]);
	let F = Ns(), [I, ee] = ji(u, A, F === null ? g === ju.Open : (F & X.Open) === X.Open);
	Rr(I, _, p.actions.close), Ti(!b && c && I, P);
	let L = H((e) => {
		var t;
		switch (e.key) {
			case q.Escape:
				if (p.state.popoverState !== ju.Open || !T.current) return;
				let n = At(T.current);
				if (n && !T.current.contains(n)) return;
				e.preventDefault(), e.stopPropagation(), p.actions.close(), (t = p.state.button) == null || t.focus();
				break;
		}
	});
	f(() => {
		var t;
		e.static || g === ju.Closed && ((t = e.unmount) == null || t) && p.actions.setPanel(null);
	}, [
		g,
		e.unmount,
		e.static,
		p
	]), f(() => {
		if (b || !a || g !== ju.Open || !T.current) return;
		let e = At(T.current);
		T.current.contains(e) || ei(T.current, Y.First);
	}, [
		b,
		a,
		T.current,
		g
	]);
	let R = U({
		open: g === ju.Open,
		close: p.actions.refocusableClose
	}), te = Xt(E ? k() : {}, {
		ref: M,
		id: i,
		onKeyDown: L,
		onBlur: a && g === ju.Open ? (e) => {
			var t, n, r, i, a;
			let o = e.relatedTarget;
			o && T.current && ((t = T.current) != null && t.contains(o) || (p.actions.close(), ((r = (n = x.current)?.contains) != null && r.call(n, o) || (a = (i = S.current)?.contains) != null && a.call(i, o)) && o.focus({ preventScroll: !0 })));
		} : void 0,
		tabIndex: -1,
		style: {
			...d.style,
			...O,
			"--button-width": rr(I, _, !0).width
		},
		...Ai(ee)
	}), z = hc(), ne = H(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			Ht(z.current, {
				[mc.Forwards]: () => {
					var t;
					ei(e, Y.First) === Vr.Error && ((t = p.state.afterPanelSentinel.current) == null || t.focus());
				},
				[mc.Backwards]: () => {
					var e;
					(e = p.state.button) == null || e.focus({ preventScroll: !0 });
				}
			});
		}
		t();
	}), re = H(() => {
		let e = T.current;
		if (!e) return;
		function t() {
			Ht(z.current, {
				[mc.Forwards]: () => {
					if (!p.state.button) return;
					let e = Ur(kt(p.state.button) ?? document.body), t = e.indexOf(p.state.button), n = e.slice(0, t + 1), r = [...e.slice(t + 1), ...n];
					for (let e of r.slice()) if (e.dataset.headlessuiFocusGuard === "true" || A != null && A.contains(e)) {
						let t = r.indexOf(e);
						t !== -1 && r.splice(t, 1);
					}
					ei(r, Y.First, { sorted: !1 });
				},
				[mc.Backwards]: () => {
					var t;
					ei(e, Y.Previous) === Vr.Error && ((t = p.state.button) == null || t.focus());
				}
			});
		}
		t();
	}), ie = W();
	return t.createElement(Fs, null, t.createElement(Bu.Provider, { value: i }, t.createElement($n, { value: p.actions.refocusableClose }, t.createElement(rc, {
		enabled: s ? e.static || I : !1,
		ownerDocument: N
	}, I && h && t.createElement(mn, {
		id: C,
		ref: x,
		features: fn.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: ne
	}), ie({
		ourProps: te,
		theirProps: d,
		slot: R,
		defaultTag: Yu,
		features: Xu,
		visible: I,
		name: "Popover.Panel"
	}), I && h && t.createElement(mn, {
		id: w,
		ref: S,
		features: fn.Focusable,
		"data-headlessui-focus-guard": !0,
		as: "button",
		type: "button",
		onFocus: re
	})))));
}
var Qu = "div";
function $u(e, n) {
	let r = v(null), i = K(r, n), [a, o] = y([]), s = H((e) => {
		o((t) => {
			let n = t.indexOf(e);
			if (n !== -1) {
				let e = t.slice();
				return e.splice(n, 1), e;
			}
			return t;
		});
	}), c = H((e) => (o((t) => [...t, e]), () => s(e))), l = H(() => {
		var e;
		let t = kt(r.current);
		if (!t) return !1;
		let n = At(r.current);
		return (e = r.current) != null && e.contains(n) ? !0 : a.some((e) => t.getElementById(e.buttonId.current)?.contains(n) || t.getElementById(e.panelId.current)?.contains(n));
	}), u = H((e) => {
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
	]), f = U({}), p = e, m = { ref: i }, h = W();
	return t.createElement(dc, null, t.createElement(Ru.Provider, { value: d }, h({
		ourProps: m,
		theirProps: p,
		slot: f,
		defaultTag: Qu,
		name: "Popover.Group"
	})));
}
var ed = G(Uu), td = G(Gu), nd = G(Ju), rd = G(Ju), id = G(Zu), ad = G($u), od = Object.assign(ed, {
	Button: td,
	Backdrop: rd,
	Overlay: nd,
	Panel: id,
	Group: ad
}), sd = ((e) => (e[e.RegisterOption = 0] = "RegisterOption", e[e.UnregisterOption = 1] = "UnregisterOption", e))(sd || {}), cd = {
	0(e, t) {
		let n = [...e.options, {
			id: t.id,
			element: t.element,
			propsRef: t.propsRef
		}];
		return {
			...e,
			options: Qr(n, (e) => e.element.current)
		};
	},
	1(e, t) {
		let n = e.options.slice(), r = e.options.findIndex((e) => e.id === t.id);
		return r === -1 ? e : (n.splice(r, 1), {
			...e,
			options: n
		});
	}
}, ld = i(null);
ld.displayName = "RadioGroupDataContext";
function ud(e) {
	let t = u(ld);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, ud), t;
	}
	return t;
}
var dd = i(null);
dd.displayName = "RadioGroupActionsContext";
function fd(e) {
	let t = u(dd);
	if (t === null) {
		let t = /* @__PURE__ */ Error(`<${e} /> is missing a parent <RadioGroup /> component.`);
		throw Error.captureStackTrace && Error.captureStackTrace(t, fd), t;
	}
	return t;
}
function pd(e, t) {
	return Ht(t.type, cd, e, t);
}
var md = "div";
function hd(e, n) {
	let r = m(), i = Bt(), { id: a = `headlessui-radiogroup-${r}`, value: o, form: s, name: c, onChange: u, by: d, disabled: f = i || !1, defaultValue: p, tabIndex: h = 0, ...y } = e, b = tr(d), [x, S] = _(pd, { options: [] }), C = x.options, [w, T] = qn(), [E, D] = zn(), O = v(null), k = K(O, n), A = an(p), [j, M] = rn(o, u, A), N = g(() => C.find((e) => !e.propsRef.current.disabled), [C]), P = g(() => C.some((e) => b(e.propsRef.current.value, j)), [C, j]), F = H((e) => {
		if (f || b(e, j)) return !1;
		let t = C.find((t) => b(t.propsRef.current.value, e))?.propsRef.current;
		return t != null && t.disabled ? !1 : (M?.(e), !0);
	}), I = H((e) => {
		if (!O.current) return;
		let t = C.filter((e) => e.propsRef.current.disabled === !1).map((e) => e.element.current);
		switch (e.key) {
			case q.Enter:
				ln(e.currentTarget);
				break;
			case q.ArrowLeft:
			case q.ArrowUp:
				if (e.preventDefault(), e.stopPropagation(), ei(t, Y.Previous | Y.WrapAround) === Vr.Success) {
					let e = C.find((e) => jt(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case q.ArrowRight:
			case q.ArrowDown:
				if (e.preventDefault(), e.stopPropagation(), ei(t, Y.Next | Y.WrapAround) === Vr.Success) {
					let e = C.find((e) => jt(e.element.current));
					e && F(e.propsRef.current.value);
				}
				break;
			case q.Space:
				{
					e.preventDefault(), e.stopPropagation();
					let t = C.find((e) => jt(e.element.current));
					t && F(t.propsRef.current.value);
				}
				break;
		}
	}), ee = H((e) => (S({
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
	}), [ee, F]), te = {
		ref: k,
		id: a,
		role: "radiogroup",
		"aria-labelledby": w,
		"aria-describedby": E,
		onKeyDown: I
	}, z = U({ value: j }), ne = l(() => {
		if (A !== void 0) return F(A);
	}, [F, A]), re = W();
	return t.createElement(D, { name: "RadioGroup.Description" }, t.createElement(T, { name: "RadioGroup.Label" }, t.createElement(dd.Provider, { value: R }, t.createElement(ld.Provider, { value: L }, c != null && t.createElement(_n, {
		disabled: f,
		data: { [c]: j || "on" },
		overrides: {
			type: "radio",
			checked: j != null
		},
		form: s,
		onReset: ne
	}), re({
		ourProps: te,
		theirProps: y,
		slot: z,
		defaultTag: md,
		name: "RadioGroup"
	})))));
}
var gd = "div";
function _d(e, n) {
	let r = ud("RadioGroup.Option"), i = fd("RadioGroup.Option"), a = m(), { id: o = `headlessui-radiogroup-option-${a}`, value: s, disabled: c = r.disabled || !1, autoFocus: l = !1, ...u } = e, d = v(null), f = K(d, n), [p, h] = qn(), [g, _] = zn(), y = Ft({
		value: s,
		disabled: c
	});
	V(() => i.registerOption({
		id: o,
		element: d,
		propsRef: y
	}), [
		o,
		i,
		d,
		y
	]);
	let b = H((e) => {
		var t;
		if (Mn(e.currentTarget)) return e.preventDefault();
		i.change(s) && ((t = d.current) == null || t.focus());
	}), x = r.firstOption?.id === o, { isFocusVisible: S, focusProps: C } = _t({ autoFocus: l }), { isHovered: w, hoverProps: T } = Ct({ isDisabled: c }), E = r.compare(r.value, s), D = Xt({
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
	}, C, T), O = U({
		checked: E,
		disabled: c,
		active: S,
		hover: w,
		focus: S,
		autofocus: l
	}), k = W();
	return t.createElement(_, { name: "RadioGroup.Description" }, t.createElement(h, { name: "RadioGroup.Label" }, k({
		ourProps: D,
		theirProps: u,
		slot: O,
		defaultTag: gd,
		name: "RadioGroup.Option"
	})));
}
var vd = "span";
function yd(e, t) {
	let n = ud("Radio"), r = fd("Radio"), i = m(), a = bn(), o = Bt(), { id: s = a || `headlessui-radio-${i}`, value: c, disabled: l = n.disabled || o || !1, autoFocus: u = !1, ...d } = e, f = v(null), p = K(f, t), h = Kn(), g = Rn(), _ = Ft({
		value: c,
		disabled: l
	});
	V(() => r.registerOption({
		id: s,
		element: f,
		propsRef: _
	}), [
		s,
		r,
		f,
		_
	]);
	let y = H((e) => {
		var t;
		if (Mn(e.currentTarget)) return e.preventDefault();
		r.change(c) && ((t = f.current) == null || t.focus());
	}), { isFocusVisible: b, focusProps: x } = _t({ autoFocus: u }), { isHovered: S, hoverProps: C } = Ct({ isDisabled: l }), w = n.firstOption?.id === s, T = n.compare(n.value, c), E = Xt({
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
	}, x, C), D = U({
		checked: T,
		disabled: l,
		hover: S,
		focus: b,
		autofocus: u
	});
	return W()({
		ourProps: E,
		theirProps: d,
		slot: D,
		defaultTag: vd,
		name: "Radio"
	});
}
var bd = G(hd), xd = G(_d), Sd = G(yd), Cd = Object.assign(bd, {
	Option: xd,
	Radio: Sd,
	Label: Zn,
	Description: Un
});
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/AdjustmentsHorizontalIcon.js
function wd({ title: t, titleId: n, ...r }, i) {
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
var Td = /*#__PURE__*/ e.forwardRef(wd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowDownIcon.js
function Ed({ title: t, titleId: n, ...r }, i) {
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
var Dd = /*#__PURE__*/ e.forwardRef(Ed);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowLeftIcon.js
function Od({ title: t, titleId: n, ...r }, i) {
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
var kd = /*#__PURE__*/ e.forwardRef(Od);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowPathIcon.js
function Ad({ title: t, titleId: n, ...r }, i) {
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
var jd = /*#__PURE__*/ e.forwardRef(Ad);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowRightIcon.js
function Md({ title: t, titleId: n, ...r }, i) {
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
var Nd = /*#__PURE__*/ e.forwardRef(Md);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowUpIcon.js
function Pd({ title: t, titleId: n, ...r }, i) {
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
var Fd = /*#__PURE__*/ e.forwardRef(Pd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingInIcon.js
function Id({ title: t, titleId: n, ...r }, i) {
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
var Ld = /*#__PURE__*/ e.forwardRef(Id);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ArrowsPointingOutIcon.js
function Rd({ title: t, titleId: n, ...r }, i) {
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
var zd = /*#__PURE__*/ e.forwardRef(Rd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Bars3Icon.js
function Bd({ title: t, titleId: n, ...r }, i) {
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
var Vd = /*#__PURE__*/ e.forwardRef(Bd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BarsArrowDownIcon.js
function Hd({ title: t, titleId: n, ...r }, i) {
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
var Ud = /*#__PURE__*/ e.forwardRef(Hd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/BookmarkIcon.js
function Wd({ title: t, titleId: n, ...r }, i) {
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
var Gd = /*#__PURE__*/ e.forwardRef(Wd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CalendarDaysIcon.js
function Kd({ title: t, titleId: n, ...r }, i) {
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
var qd = /*#__PURE__*/ e.forwardRef(Kd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckCircleIcon.js
function Jd({ title: t, titleId: n, ...r }, i) {
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
var Yd = /*#__PURE__*/ e.forwardRef(Jd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/CheckIcon.js
function Xd({ title: t, titleId: n, ...r }, i) {
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
var Zd = /*#__PURE__*/ e.forwardRef(Xd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronLeftIcon.js
function Qd({ title: t, titleId: n, ...r }, i) {
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
var $d = /*#__PURE__*/ e.forwardRef(Qd);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronRightIcon.js
function ef({ title: t, titleId: n, ...r }, i) {
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
var tf = /*#__PURE__*/ e.forwardRef(ef);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ChevronUpDownIcon.js
function nf({ title: t, titleId: n, ...r }, i) {
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
var rf = /*#__PURE__*/ e.forwardRef(nf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ClipboardDocumentIcon.js
function af({ title: t, titleId: n, ...r }, i) {
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
var of = /*#__PURE__*/ e.forwardRef(af);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Cog6ToothIcon.js
function sf({ title: t, titleId: n, ...r }, i) {
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
var cf = /*#__PURE__*/ e.forwardRef(sf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/DocumentDuplicateIcon.js
function lf({ title: t, titleId: n, ...r }, i) {
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
var uf = /*#__PURE__*/ e.forwardRef(lf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/EllipsisHorizontalIcon.js
function df({ title: t, titleId: n, ...r }, i) {
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
var ff = /*#__PURE__*/ e.forwardRef(df);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ExclamationTriangleIcon.js
function pf({ title: t, titleId: n, ...r }, i) {
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
var mf = /*#__PURE__*/ e.forwardRef(pf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/FunnelIcon.js
function hf({ title: t, titleId: n, ...r }, i) {
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
var gf = /*#__PURE__*/ e.forwardRef(hf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/InformationCircleIcon.js
function _f({ title: t, titleId: n, ...r }, i) {
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
var vf = /*#__PURE__*/ e.forwardRef(_f);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LinkIcon.js
function yf({ title: t, titleId: n, ...r }, i) {
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
var bf = /*#__PURE__*/ e.forwardRef(yf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/LockClosedIcon.js
function xf({ title: t, titleId: n, ...r }, i) {
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
var Sf = /*#__PURE__*/ e.forwardRef(xf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/MagnifyingGlassIcon.js
function Cf({ title: t, titleId: n, ...r }, i) {
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
var wf = /*#__PURE__*/ e.forwardRef(Cf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PencilIcon.js
function Tf({ title: t, titleId: n, ...r }, i) {
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
var Ef = /*#__PURE__*/ e.forwardRef(Tf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/PlusIcon.js
function Df({ title: t, titleId: n, ...r }, i) {
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
var Of = /*#__PURE__*/ e.forwardRef(Df);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/RectangleGroupIcon.js
function kf({ title: t, titleId: n, ...r }, i) {
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
var Af = /*#__PURE__*/ e.forwardRef(kf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/Squares2X2Icon.js
function jf({ title: t, titleId: n, ...r }, i) {
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
var Mf = /*#__PURE__*/ e.forwardRef(jf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TableCellsIcon.js
function Nf({ title: t, titleId: n, ...r }, i) {
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
var Pf = /*#__PURE__*/ e.forwardRef(Nf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TagIcon.js
function Ff({ title: t, titleId: n, ...r }, i) {
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
var If = /*#__PURE__*/ e.forwardRef(Ff);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/TrashIcon.js
function Lf({ title: t, titleId: n, ...r }, i) {
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
var Rf = /*#__PURE__*/ e.forwardRef(Lf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/UserIcon.js
function zf({ title: t, titleId: n, ...r }, i) {
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
var Bf = /*#__PURE__*/ e.forwardRef(zf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/ViewColumnsIcon.js
function Vf({ title: t, titleId: n, ...r }, i) {
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
var Hf = /*#__PURE__*/ e.forwardRef(Vf);
//#endregion
//#region ../../node_modules/.pnpm/@heroicons+react@2.2.0_react@19.2.7/node_modules/@heroicons/react/24/outline/esm/XMarkIcon.js
function Uf({ title: t, titleId: n, ...r }, i) {
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
var Wf = /*#__PURE__*/ e.forwardRef(Uf);
//#endregion
//#region ../../shared/lib/frontmatter.ts
function Gf(e) {
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
function Kf(e, t) {
	let n = Gf(e), r = {
		...n.data,
		...t
	};
	return `---\n${Object.entries(r).filter(([, e]) => e !== "").map(([e, t]) => `${e}: ${t}`).join("\n")}\n---\n\n${n.body.trimStart()}`;
}
//#endregion
//#region ../../shared/lib/board.ts
function qf(e) {
	return e.split(",").map((e) => e.trim()).filter(Boolean);
}
function Jf(e) {
	return e.join(", ");
}
var Yf = /* @__PURE__ */ new Set([
	"id",
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
function Xf(e, t) {
	let { data: n, body: r } = Gf(e), i = { ...n };
	if (t.title !== void 0 && (i.title = t.title), t.columnKey !== void 0 && (i.status = t.columnKey), t.priority !== void 0 && (i.priority = t.priority ?? ""), t.assignee !== void 0 && (i.assignee = t.assignee ?? ""), t.swimlaneKey !== void 0 && (i.swimlane = t.swimlaneKey ?? ""), t.due !== void 0 && (i.due = t.due ?? ""), t.icon !== void 0 && (i.icon = t.icon ?? ""), t.tags !== void 0 && (i.tags = t.tags.map((e) => e.label).join(", ")), t.attachments !== void 0 && (i.attachments = Jf(t.attachments)), t.custom !== void 0) for (let [e, n] of Object.entries(t.custom)) Yf.has(e) || (i[e] = n ?? "");
	return t.blockedBy !== void 0 && (i.blocked_by = fp(t.blockedBy)), t.blocks !== void 0 && (i.blocks = fp(t.blocks)), t.relates !== void 0 && (i.relates = fp(t.relates)), t.parent !== void 0 && (i.parent = t.parent ? fp([t.parent]) : ""), Kf(t.notes === void 0 ? r : t.notes, i);
}
function Zf(e) {
	let t = e.split(/[\\/]/).pop() || e;
	try {
		return decodeURIComponent(t.split("?")[0] || t);
	} catch {
		return t;
	}
}
function Qf(e) {
	let t = e.trim();
	if (!t) return !1;
	let n = /^([a-z][a-z0-9+.-]*):/i.exec(t);
	if (!n) return !0;
	let r = n[1].toLowerCase();
	return r === "http" || r === "https";
}
function $f(e, t) {
	let n = {};
	if (!e || !t) return n;
	for (let r of t) {
		let t = e[r.key];
		t !== void 0 && t !== "" && (n[r.key] = t);
	}
	return n;
}
var ep = [
	"urgent",
	"high",
	"medium",
	"low",
	"none"
], tp = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4
}, np = {
	urgent: "bg-red-100 text-red-700",
	high: "bg-amber-100 text-amber-700",
	medium: "bg-sky-100 text-sky-700",
	low: "bg-stone-100 text-stone-500"
}, rp = [
	"#ef4444",
	"#f59e0b",
	"#eab308",
	"#22c55e",
	"#0ea5e9",
	"#6366f1",
	"#a855f7",
	"#ec4899",
	"#78716c"
], ip = [
	"title",
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
function ap(e) {
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
function op(e) {
	for (let t of e.split("\n")) {
		let e = t.trim().replace(/^[#>\-*+\s]+/, "").replace(/^\[[ xX]\]\s*/, "").trim();
		if (e) return e.length > 120 ? `${e.slice(0, 120)}…` : e;
	}
	return null;
}
function sp(e) {
	return e.trim().replace(/^\[|\]$/g, "").split(",").map((e) => e.trim().replace(/^#/, "")).filter(Boolean);
}
var cp = [
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
function lp(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) t = Math.imul(t, 31) + e.charCodeAt(n) >>> 0;
	return cp[t % cp.length];
}
function up(e, t) {
	return e.map((e) => ({
		label: e,
		color: t?.find((t) => t.label === e)?.color ?? lp(e)
	}));
}
function dp(e) {
	return e.split(",").map((e) => e.trim().replace(/^\[\[/, "").replace(/\]\]$/, "").trim()).filter(Boolean);
}
function fp(e) {
	return e.map((e) => `[[${e}]]`).join(", ");
}
function pp(e) {
	return (e.id.split(/[\\/]/).pop() ?? e.id).replace(/\.md$/i, "");
}
function mp(e, t) {
	let n = t || "done", r = /* @__PURE__ */ new Map();
	for (let t of e) r.set(pp(t), t);
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
function hp(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) t.set(pp(n), n);
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		if (!r.parent) continue;
		let e = t.get(r.parent);
		if (!e || e.id === r.id) continue;
		let i = n.get(e.id);
		i ? i.push(r) : n.set(e.id, [r]);
	}
	return n;
}
function gp(e, t) {
	let n = t || "done";
	return {
		done: e.filter((e) => e.columnKey === n).length,
		total: e.length
	};
}
function _p() {
	let e = /* @__PURE__ */ new Date();
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function vp(e) {
	return e.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}
var yp = /* @__PURE__ */ new Set([
	"status",
	"priority",
	"assignee"
]);
function bp(e) {
	return typeof e == "string" && yp.has(e) ? e : "status";
}
function xp(e) {
	return e === "custom" ? "custom" : typeof e == "string" && yp.has(e) ? e : void 0;
}
function Sp(e, t = []) {
	let n = new Set(t), r = `lane_${vp(e).replace(/-/g, "_")}`;
	for (let e = 0; e < 20; e += 1) {
		let e = `${r}_${typeof globalThis.crypto?.randomUUID == "function" ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
		if (!n.has(e)) return e;
	}
	return `${r}_${Date.now().toString(36)}`;
}
function Cp(e, t, n) {
	let r = e.trim();
	return r ? r.length > 80 ? "Swimlane names can be at most 80 characters." : t.some((e) => e.key !== n && e.name.trim().toLocaleLowerCase() === r.toLocaleLowerCase()) ? "Swimlane names must be unique on this board." : null : "Swimlane name is required.";
}
function wp(e) {
	return e.swimlaneKey || "";
}
function Tp(e, t) {
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
		let t = wp(e);
		t && !i.has(t) && c.set(t, (c.get(t) ?? 0) + 1);
	}
	for (let [e, t] of c) n.push({
		kind: "dangling_swimlane",
		key: e,
		cardCount: t
	});
	return n;
}
function Ep(e, t) {
	return t === "custom" ? wp(e) : t === "priority" ? e.priority || "none" : t === "assignee" ? e.assignee || "" : e.columnKey || "";
}
function Dp(e, t, n, r) {
	if (n === "status") return e.columns;
	if (n === "priority") return ep.map((e) => ({
		key: e,
		name: e === "none" ? r : `${e.charAt(0).toUpperCase()}${e.slice(1)}`
	}));
	let i = /* @__PURE__ */ new Set();
	for (let e of t) i.add(Ep(e, n));
	return [...i].sort((e, t) => e === "" ? 1 : t === "" ? -1 : e.localeCompare(t)).map((e) => ({
		key: e,
		name: e || r
	}));
}
function Op(e, t) {
	let n = e.swimlaneKey;
	return !!n && !(t ?? []).some((e) => e.key === n);
}
function kp(e, t, n, r) {
	if (n !== "custom") return Dp(e, t, n, r);
	let i = /* @__PURE__ */ new Set(), a = (e.swimlanes ?? []).filter((e) => i.has(e.key) ? !1 : (i.add(e.key), !0)), o = new Set(a.map((e) => e.key)), s = t.some((e) => !e.swimlaneKey || !o.has(e.swimlaneKey));
	return [...a.map((e) => ({
		key: e.key,
		name: e.name,
		color: e.color
	})), ...s ? [{
		key: "",
		name: r
	}] : []];
}
function Ap(e, t, n, r) {
	let i = /* @__PURE__ */ new Map(), a = n === "custom" ? new Set((r ?? []).map((e) => e.key)) : null;
	for (let r of e) {
		let e = Ep(r, n), o = n === "custom" && (!e || !a?.has(e)) ? "" : e, s = Ep(r, t), c = i.get(o);
		c || i.set(o, c = /* @__PURE__ */ new Map());
		let l = c.get(s);
		l || c.set(s, l = []), l.push(r);
	}
	return i;
}
function jp(e, t, n) {
	return t ? t.prop === "swimlaneIssue" ? Op(e, n?.swimlanes) : t.prop === "priority" ? (e.priority || "none") === t.value : t.prop === "assignee" ? (e.assignee || "") === t.value : t.prop !== "tag" || e.tags.some((e) => e.label === t.value) : !0;
}
function Mp(e, t) {
	return !!(e.title.toLowerCase().includes(t) || e.ticket && e.ticket.toLowerCase().includes(t) || e.assignee && e.assignee.toLowerCase().includes(t) || e.tags.some((e) => e.label.toLowerCase().includes(t)) || e.notes && e.notes.toLowerCase().includes(t) || !e.notes && e.excerpt && e.excerpt.toLowerCase().includes(t));
}
function Np(e, t, n, r) {
	let i = t.trim().toLowerCase();
	return e.filter((e) => i && !Mp(e, i) ? !1 : jp(e, n, r));
}
function Pp(e, t) {
	let n = [...e];
	return t === "due" ? n.sort((e, t) => (e.due || "9999-99-99").localeCompare(t.due || "9999-99-99")) : t === "priority" ? n.sort((e, t) => (tp[e.priority || "none"] ?? 5) - (tp[t.priority || "none"] ?? 5)) : t === "title" ? n.sort((e, t) => e.title.localeCompare(t.title)) : n.sort((e, t) => e.position - t.position), n;
}
function Fp(e) {
	return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function Ip(e) {
	return !!e && /^\d{4}-\d{2}-\d{2}$/.test(e);
}
function Lp() {
	return _p().slice(0, 7);
}
function Rp(e, t) {
	let [n, r] = e.split("-"), i = new Date(Number(n), Number(r) - 1 + t, 1);
	return `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}`;
}
function zp(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e) {
		if (!Ip(n.due)) continue;
		let e = t.get(n.due);
		e ? e.push(n) : t.set(n.due, [n]);
	}
	return t;
}
function Bp(e, t = 0) {
	let [n, r] = e.split("-"), i = Number(n), a = Number(r), o = (new Date(i, a - 1, 1).getDay() - t + 7) % 7, s = new Date(i, a - 1, 1 - o), c = [];
	for (let e = 0; e < 6; e++) {
		let t = [];
		for (let n = 0; n < 7; n++) t.push(Fp(new Date(s.getFullYear(), s.getMonth(), s.getDate() + e * 7 + n)));
		c.push(t);
	}
	return c;
}
//#endregion
//#region ../../shared/components/board/BoardTable.tsx
function Vp({ cards: e, statusName: t, today: n, doneKey: r, selectedId: i, onSelect: a }) {
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
											/* @__PURE__ */ S(Yd, { className: "h-3 w-3" }),
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
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${np[e.priority] ?? "bg-stone-100 text-stone-500"}`,
								children: e.priority
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: `${s} text-stone-600`,
							children: e.assignee ? /* @__PURE__ */ C("span", {
								className: "inline-flex items-center gap-1",
								children: [/* @__PURE__ */ S(Bf, { className: "h-3.5 w-3.5 text-brand-gray" }), e.assignee]
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: s,
							children: e.due ? /* @__PURE__ */ C("span", {
								className: `inline-flex items-center gap-1 ${o ? "font-medium text-red-600" : "text-stone-600"}`,
								children: [/* @__PURE__ */ S(qd, { className: "h-3.5 w-3.5" }), e.due]
							}) : c
						}),
						/* @__PURE__ */ S("td", {
							className: s,
							children: e.tags.length ? /* @__PURE__ */ S("span", {
								className: "flex flex-wrap gap-1",
								children: e.tags.map((e) => /* @__PURE__ */ C("span", {
									className: "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-brand-dark",
									style: { backgroundColor: e.color ? `${e.color}22` : void 0 },
									children: [/* @__PURE__ */ S(If, { className: "h-3 w-3" }), e.label]
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
var Hp = Array.from({ length: 7 }, (e, t) => new Date(2023, 0, 1 + t).toLocaleDateString(void 0, { weekday: "short" }));
function Up({ cards: e, today: t, doneKey: n, mode: r, onModeChange: i, selectedId: a, onSelect: o }) {
	let [s, c] = y(() => Lp()), l = zp(e), [u, d] = s.split("-"), f = new Date(Number(u), Number(d) - 1, 1).toLocaleDateString(void 0, {
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
				e.priority && e.priority !== "none" && /* @__PURE__ */ S("span", { className: `h-1.5 w-1.5 shrink-0 rounded-full ${np[e.priority]?.split(" ")[0] ?? "bg-stone-300"}` }),
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
						/* @__PURE__ */ S(Yd, { className: "h-2.5 w-2.5" }),
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
				title: B._({ id: "1xwZj_" }),
				"aria-label": B._({ id: "1xwZj_" }),
				onClick: () => c((e) => Rp(e, -1)),
				children: /* @__PURE__ */ S($d, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ S("button", {
				type: "button",
				className: m,
				title: B._({ id: "g8JmSC" }),
				"aria-label": B._({ id: "g8JmSC" }),
				onClick: () => c((e) => Rp(e, 1)),
				children: /* @__PURE__ */ S(tf, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ S("span", {
				className: "min-w-[8rem] text-sm font-medium text-brand-dark",
				children: f
			}),
			/* @__PURE__ */ S("button", {
				type: "button",
				className: "rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:border-brand/40 hover:text-brand-dark",
				onClick: () => c(Lp()),
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
		let n = Pp(e, "due"), r = n.filter((e) => Ip(e.due)), i = n.filter((e) => !Ip(e.due)), a = "";
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
	let v = Bp(s);
	return /* @__PURE__ */ C("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [
			_,
			/* @__PURE__ */ S("div", {
				className: "grid grid-cols-7 border-b border-black/[0.04] bg-[#fbfdfb]",
				children: Hp.map((e) => /* @__PURE__ */ S("div", {
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
//#region ../../shared/components/board/LaneDetailsPopover.tsx
function Wp({ lane: e, cardCount: t, portalClassName: n, buttonClassName: r = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
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
	return /* @__PURE__ */ C(od, {
		className: "relative shrink-0",
		children: [/* @__PURE__ */ S(td, {
			title: B._({ id: "rRubBJ" }),
			"aria-label": B._({
				id: "Th4mIx",
				values: { 0: e.name }
			}),
			className: r,
			children: /* @__PURE__ */ S(vf, { className: "h-4 w-4" })
		}), /* @__PURE__ */ C(id, {
			anchor: "bottom end",
			className: `z-50 w-80 rounded-xl border border-line bg-white p-4 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${s}`,
			children: [
				/* @__PURE__ */ C("p", {
					className: "flex items-center gap-2 text-xs font-semibold text-stone-800",
					children: [/* @__PURE__ */ S(vf, { className: "h-4 w-4 text-brand-dark" }), /* @__PURE__ */ S(L, { id: "rRubBJ" })]
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
							children: /* @__PURE__ */ S(L, { id: "c61_Lv" })
						}),
						/* @__PURE__ */ C("dd", {
							className: "flex min-w-0 items-center gap-1.5",
							children: [/* @__PURE__ */ S("code", {
								className: "min-w-0 flex-1 truncate rounded bg-stone-100 px-1.5 py-1 text-[10px] text-stone-600",
								children: e.key
							}), /* @__PURE__ */ C("button", {
								type: "button",
								title: B._({ id: "qpGDiV" }),
								"aria-label": B._({ id: "qpGDiV" }),
								onClick: () => void c(),
								className: "inline-flex h-7 items-center gap-1 rounded-lg border border-stone-200 px-2 text-[10px] font-medium text-brand-dark hover:border-brand/30",
								children: [/* @__PURE__ */ S(of, { className: "h-3.5 w-3.5" }), i === "copied" ? B._({ id: "6V3Ea3" }) : B._({ id: "he3ygx" })]
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
//#region ../../shared/components/board/StatusActionsMenu.tsx
function Gp({ column: e, siblings: t, actions: n, doneKey: r, orientation: i, portalClassName: a, buttonClassName: o = "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600" }) {
	let s = t.findIndex((t) => t.key === e.key), c = r === e.key;
	if (!(n.renameColumn || n.reorderColumns || n.toggleDoneColumn || n.setColumnLimit || n.setColumnColor || n.deleteColumn)) return null;
	let l = a ? ` ${a}` : "", u = s > 0 ? t[s - 1] : void 0, d = s >= 0 && s < t.length - 1 ? t[s + 1] : void 0;
	return /* @__PURE__ */ C(Du, {
		as: "div",
		className: "relative shrink-0",
		children: [/* @__PURE__ */ S(Su, {
			title: B._({ id: "YHjvGb" }),
			"aria-label": B._({
				id: "RlLl3G",
				values: { 0: e.name }
			}),
			className: o,
			children: /* @__PURE__ */ S(ff, { className: "h-4 w-4" })
		}), /* @__PURE__ */ C(Cu, {
			anchor: "bottom end",
			className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${l}`,
			children: [
				n.renameColumn && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.renameColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(Ef, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
				}) }),
				n.reorderColumns && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: !u,
					"aria-disabled": !u,
					onClick: () => {
						u && n.reorderColumns?.(e.key, u.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [S(i === "horizontal" ? kd : Fd, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ S(L, { id: "iSLA_r" }) : /* @__PURE__ */ S(L, { id: "QyioBP" })]
				}) }), /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: !d,
					"aria-disabled": !d,
					onClick: () => {
						d && n.reorderColumns?.(e.key, d.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
					children: [S(i === "horizontal" ? Nd : Dd, { className: "h-3.5 w-3.5" }), i === "horizontal" ? /* @__PURE__ */ S(L, { id: "Ubl2by" }) : /* @__PURE__ */ S(L, { id: "3Ib6FN" })]
				}) })] }),
				n.toggleDoneColumn && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.toggleDoneColumn?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(Yd, { className: "h-3.5 w-3.5" }), c ? /* @__PURE__ */ S(L, { id: "G4qrLy" }) : /* @__PURE__ */ S(L, { id: "wtw-au" })]
				}) }),
				n.setColumnLimit && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					onClick: () => void n.setColumnLimit?.(e.key),
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
					children: [/* @__PURE__ */ S(gf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Iw6WJa" })]
				}) }),
				n.setColumnColor && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ C("div", {
					className: "px-3 py-2",
					children: [/* @__PURE__ */ S("span", {
						className: "text-[11px] text-brand-gray",
						children: /* @__PURE__ */ S(L, { id: "jZlrte" })
					}), /* @__PURE__ */ C("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [rp.map((t) => /* @__PURE__ */ S("button", {
							type: "button",
							onClick: () => void n.setColumnColor?.(e.key, t),
							title: t,
							className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
							style: { backgroundColor: t }
						}, t)), /* @__PURE__ */ S("button", {
							type: "button",
							title: B._({ id: "H_SQFv" }),
							onClick: () => void n.setColumnColor?.(e.key, null),
							className: "flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10",
							children: /* @__PURE__ */ S(Wf, { className: "h-3 w-3 text-stone-400" })
						})]
					})]
				})] }),
				n.deleteColumn && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }), /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
					type: "button",
					disabled: t.length <= 1,
					"aria-disabled": t.length <= 1,
					onClick: () => {
						t.length > 1 && n.deleteColumn?.(e.key);
					},
					className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 aria-disabled:opacity-40 data-[focus]:bg-red-50",
					children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
				}) })] })
			]
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardSwimlanes.tsx
function Kp({ cards: e, columns: t, lanes: r, config: i, groupKey: a, swimlaneKey: o, sortBy: s, today: c, doneKey: l, selectedId: u, actions: d, readOnly: f, customLaneMutationPending: p, portalClassName: m, onSelect: h, onOpenManager: _, onManageLane: v, onMoveCustomLane: b, onSetCustomLaneColor: x, onShowMissing: w }) {
	let [T, E] = y(!1), [D, O] = y(""), k = m ? ` ${m}` : "", A = g(() => Ap(e, a, o, i.swimlanes), [
		e,
		i.swimlanes,
		a,
		o
	]), j = { gridTemplateColumns: `9rem repeat(${Math.max(t.length, 1)}, minmax(15rem, 1fr))` }, M = g(() => (i.swimlanes ?? []).filter((e, t, n) => n.findIndex((t) => t.key === e.key) === t), [i.swimlanes]), N = g(() => new Map(M.map((e) => [e.key, e])), [M]), P = o === "custom" ? e.filter((e) => !!e.swimlaneKey && !N.has(e.swimlaneKey)).length : 0, F = g(() => {
		let e = /* @__PURE__ */ new Map();
		for (let [t, n] of A) e.set(t, [...n.values()].reduce((e, t) => e + t.length, 0));
		return e;
	}, [A]), I = g(() => {
		let e = new Map(t.map((e) => [e.key, 0]));
		for (let t of A.values()) for (let [n, r] of t) e.has(n) && e.set(n, (e.get(n) ?? 0) + r.length);
		return e;
	}, [t, A]), ee = (e) => F.get(e) ?? 0, R = r.filter((e) => e.key !== "" || ee(e.key) > 0), te = (e) => {
		let t = e.due && e.due < c && e.columnKey !== l;
		return /* @__PURE__ */ C("button", {
			type: "button",
			onClick: () => h(e),
			title: e.title,
			"data-card-id": e.id,
			className: `block w-full rounded-lg bg-white p-2 text-left text-sm shadow-sm ring-1 transition hover:ring-brand/30 focus:outline-none focus:ring-2 focus:ring-brand/40 ${u === e.id ? "ring-brand/60" : "ring-black/[0.04]"}`,
			children: [
				e.ticket && /* @__PURE__ */ S("span", {
					className: "mb-0.5 inline-block rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] font-medium tracking-tight text-stone-500",
					children: e.ticket
				}),
				/* @__PURE__ */ C("span", {
					className: "block truncate text-stone-800",
					children: [e.icon && /* @__PURE__ */ S("span", {
						className: "mr-1",
						children: e.icon
					}), e.title]
				}),
				(e.priority && e.priority !== "none" || e.due || (e.taskTotal ?? 0) > 0) && /* @__PURE__ */ C("span", {
					className: "mt-1 flex flex-wrap items-center gap-1.5",
					children: [
						e.priority && e.priority !== "none" && /* @__PURE__ */ S("span", {
							className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${np[e.priority] ?? "bg-stone-100 text-stone-500"}`,
							children: e.priority
						}),
						(e.taskTotal ?? 0) > 0 && /* @__PURE__ */ C("span", {
							className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${e.taskDone === e.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
							children: [
								/* @__PURE__ */ S(Yd, { className: "h-3 w-3" }),
								e.taskDone,
								"/",
								e.taskTotal
							]
						}),
						e.due && /* @__PURE__ */ C("span", {
							className: `inline-flex items-center gap-0.5 text-[11px] ${t ? "font-medium text-red-600" : "text-brand-gray"}`,
							children: [/* @__PURE__ */ S(qd, { className: "h-3 w-3" }), e.due]
						})
					]
				})
			]
		}, e.id);
	}, z = (e, t) => {
		let n = N.get(e.key);
		return !n || f ? null : /* @__PURE__ */ C(Du, {
			as: "div",
			className: "relative shrink-0",
			children: [/* @__PURE__ */ S(Su, {
				disabled: p,
				title: B._({ id: "DGEEOQ" }),
				"aria-label": B._({
					id: "RlLl3G",
					values: { 0: e.name }
				}),
				className: "flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-white hover:text-stone-600 disabled:cursor-wait disabled:opacity-40",
				children: /* @__PURE__ */ S(ff, { className: "h-4 w-4" })
			}), /* @__PURE__ */ C(Cu, {
				anchor: "bottom end",
				className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${k}`,
				children: [
					/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
						type: "button",
						onClick: () => v({
							laneKey: e.key,
							action: "rename"
						}),
						className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
						children: [/* @__PURE__ */ S(Ef, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
					}) }),
					/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
						type: "button",
						disabled: t === 0 || p,
						"aria-disabled": t === 0 || p,
						onClick: () => b(e.key, -1),
						className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
						children: [/* @__PURE__ */ S(Fd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "QyioBP" })]
					}) }),
					/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
						type: "button",
						disabled: t === M.length - 1 || p,
						"aria-disabled": t === M.length - 1 || p,
						onClick: () => b(e.key, 1),
						className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
						children: [/* @__PURE__ */ S(Dd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "3Ib6FN" })]
					}) }),
					/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }),
					/* @__PURE__ */ C("div", {
						className: "px-3 py-2",
						children: [/* @__PURE__ */ S("span", {
							className: "text-[11px] text-brand-gray",
							children: /* @__PURE__ */ S(L, { id: "jZlrte" })
						}), /* @__PURE__ */ C("div", {
							className: "mt-2 flex flex-wrap gap-2",
							children: [rp.map((t) => /* @__PURE__ */ S("button", {
								type: "button",
								disabled: p,
								onClick: () => x(e.key, t),
								title: t,
								className: `h-5 w-5 rounded-full ring-1 ring-black/10 disabled:cursor-wait disabled:opacity-40 ${n.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
								style: { backgroundColor: t }
							}, t)), /* @__PURE__ */ S("button", {
								type: "button",
								disabled: p,
								title: B._({ id: "H_SQFv" }),
								onClick: () => x(e.key, null),
								className: "flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 disabled:cursor-wait disabled:opacity-40",
								children: /* @__PURE__ */ S(Wf, { className: "h-3 w-3 text-stone-400" })
							})]
						})]
					}),
					/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }),
					/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
						type: "button",
						onClick: () => v({
							laneKey: e.key,
							action: "delete"
						}),
						className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 data-[focus]:bg-red-50",
						children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
					}) })
				]
			})]
		});
	};
	return o === "custom" && M.length === 0 ? /* @__PURE__ */ S("div", {
		className: "flex min-h-0 flex-1 items-center justify-center overflow-auto bg-stone-50 p-6",
		children: /* @__PURE__ */ C("section", {
			className: "w-full max-w-md rounded-2xl bg-white px-8 py-10 text-center shadow-lg shadow-emerald-950/10 ring-1 ring-black/[0.05]",
			children: [
				/* @__PURE__ */ S("span", {
					className: "mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
					children: /* @__PURE__ */ S(Af, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ S("h2", {
					className: "mt-4 text-base font-semibold tracking-tight text-stone-900",
					children: /* @__PURE__ */ S(L, { id: "IdMoS6" })
				}),
				/* @__PURE__ */ S("p", {
					className: "mx-auto mt-2 max-w-sm text-xs leading-5 text-brand-gray",
					children: /* @__PURE__ */ S(L, { id: "lEQWoB" })
				}),
				!f && /* @__PURE__ */ C("button", {
					type: "button",
					onClick: _,
					className: "mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white hover:bg-brand",
					children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "KCszT6" })]
				})
			]
		})
	}) : /* @__PURE__ */ S("div", {
		className: "min-h-0 flex-1 overflow-auto bg-stone-50 p-3",
		"data-swimlane-scrollport": !0,
		children: /* @__PURE__ */ C("div", {
			className: "grid min-w-max items-stretch gap-2",
			style: j,
			children: [
				/* @__PURE__ */ C("div", {
					className: "sticky left-0 top-0 z-30 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-sm",
					children: [/* @__PURE__ */ C("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ S("span", {
							className: "block text-[10px] font-semibold text-stone-600",
							children: /* @__PURE__ */ S(L, { id: "fVlS4-" })
						}), /* @__PURE__ */ S("span", {
							className: "block truncate text-[9px] text-brand-gray",
							children: o === "custom" ? B._({ id: "8Tg_JR" }) : o === "status" ? B._({ id: "uAQUqI" }) : o === "priority" ? B._({ id: "1hKEom" }) : B._({ id: "ojKCLU" })
						})]
					}), a === "status" && d.addColumn && !f && /* @__PURE__ */ S("button", {
						type: "button",
						onClick: () => E(!0),
						title: B._({ id: "1nUGn5" }),
						"aria-label": B._({ id: "1nUGn5" }),
						className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-dark hover:bg-brand-soft",
						children: /* @__PURE__ */ S(Of, { className: "h-4 w-4" })
					})]
				}),
				t.map((e) => {
					let n = I.get(e.key) ?? 0, r = e.limit != null && n > e.limit;
					return /* @__PURE__ */ C("div", {
						className: "sticky top-0 z-20 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 shadow-sm",
						style: e.color ? { boxShadow: `inset 0 2px 0 ${e.color}` } : void 0,
						children: [
							/* @__PURE__ */ S("span", {
								className: "min-w-0 flex-1 truncate text-xs font-semibold text-stone-700",
								children: e.name
							}),
							l === e.key && a === "status" && /* @__PURE__ */ S(Yd, {
								className: "h-3.5 w-3.5 shrink-0 text-emerald-500",
								title: B._({ id: "_5CsXX" })
							}),
							/* @__PURE__ */ C("span", {
								className: `shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${r ? "bg-red-100 font-semibold text-red-600" : "bg-stone-100 text-brand-gray"}`,
								children: [n, e.limit == null ? "" : `/${e.limit}`]
							}),
							a === "status" && !f && /* @__PURE__ */ S(Gp, {
								column: e,
								siblings: t,
								actions: d,
								doneKey: l,
								orientation: "horizontal",
								portalClassName: m
							})
						]
					}, `head-${e.key}`);
				}),
				T && /* @__PURE__ */ C("form", {
					className: "sticky left-0 z-10 col-span-full flex min-h-11 items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/30 px-3",
					onSubmit: (e) => {
						e.preventDefault();
						let t = D.trim();
						t && (E(!1), O(""), d.addColumn?.(t));
					},
					children: [
						/* @__PURE__ */ S(Of, { className: "h-4 w-4 text-brand-dark" }),
						/* @__PURE__ */ S("input", {
							autoFocus: !0,
							value: D,
							onChange: (e) => O(e.target.value),
							onKeyDown: (e) => {
								e.key === "Escape" && (E(!1), O(""));
							},
							placeholder: B._({ id: "P5cvAA" }),
							"aria-label": B._({ id: "P5cvAA" }),
							className: "h-8 w-56 rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
						}),
						/* @__PURE__ */ S("button", {
							type: "submit",
							className: "h-8 rounded-lg bg-brand-dark px-3 text-xs font-semibold text-white",
							children: /* @__PURE__ */ S(L, { id: "m16xKo" })
						}),
						/* @__PURE__ */ S("button", {
							type: "button",
							onClick: () => {
								E(!1), O("");
							},
							className: "h-8 rounded-lg px-2 text-xs text-brand-gray hover:bg-white",
							children: /* @__PURE__ */ S(L, { id: "dEgA5A" })
						})
					]
				}),
				R.map((e) => {
					let r = A.get(e.key), i = ee(e.key), a = e.key === "", c = M.findIndex((t) => t.key === e.key);
					return /* @__PURE__ */ C(n, { children: [/* @__PURE__ */ C("section", {
						"aria-labelledby": `swimlane-${e.key || "unassigned"}`,
						"data-swimlane-unassigned": a ? "true" : void 0,
						className: "sticky left-0 z-10 flex min-h-24 items-start gap-2 rounded-xl border border-line bg-stone-100 p-3",
						children: [
							/* @__PURE__ */ S("span", {
								className: `mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${a ? "bg-transparent" : "bg-stone-300"}`,
								style: e.color ? { backgroundColor: e.color } : void 0,
								"aria-hidden": !0
							}),
							/* @__PURE__ */ C("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ C("h2", {
									id: `swimlane-${e.key || "unassigned"}`,
									className: `truncate text-xs font-semibold ${a ? "text-brand-gray" : "text-stone-800"}`,
									title: e.name,
									children: [a && P > 0 && /* @__PURE__ */ S("button", {
										type: "button",
										onClick: w,
										title: B._({
											id: "vIKvqQ",
											values: { missingCount: P }
										}),
										"aria-label": B._({ id: "AoHpbt" }),
										className: "mr-1 inline-flex align-[-2px] text-amber-600 hover:text-amber-700",
										children: /* @__PURE__ */ S(mf, { className: "h-3.5 w-3.5" })
									}), e.name]
								}), /* @__PURE__ */ S("span", {
									className: "mt-1 block text-[10px] tabular-nums text-brand-gray",
									children: /* @__PURE__ */ S(L, {
										id: "uaR_cz",
										values: { total: i }
									})
								})]
							}),
							o === "custom" && !a && z(e, c),
							o === "custom" && !a && N.get(e.key) && /* @__PURE__ */ S(Wp, {
								lane: N.get(e.key),
								cardCount: i,
								portalClassName: m
							}),
							o === "status" && !f && /* @__PURE__ */ S(Gp, {
								column: e,
								siblings: R,
								actions: d,
								doneKey: l,
								orientation: "vertical",
								portalClassName: m
							})
						]
					}), t.map((t) => /* @__PURE__ */ S("div", {
						className: "min-h-24 space-y-2 rounded-xl border border-line bg-stone-100/60 p-2",
						children: Pp(r?.get(t.key) ?? [], s).map(te)
					}, `${e.key || "unassigned"}-${t.key}`))] }, `row-${e.key || "unassigned"}`);
				})
			]
		})
	});
}
//#endregion
//#region ../../shared/components/board/StatusManagerDialog.tsx
function qp({ open: e, config: t, actions: n, portalClassName: r, onClose: i }) {
	let [a, o] = y(!1), [s, c] = y(""), l = r ? ` ${r}` : "", u = t.doneColumn ?? "done";
	return /* @__PURE__ */ C(ul, {
		open: e,
		onClose: i,
		className: `relative z-40${l}`,
		children: [/* @__PURE__ */ S(cl, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${l}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${l}`,
			children: /* @__PURE__ */ C(sl, {
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${l}`,
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ S("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ S(Af, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ C("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ S(ll, {
									className: "text-base font-semibold tracking-tight text-stone-900",
									children: /* @__PURE__ */ S(L, { id: "rvpMpc" })
								}), /* @__PURE__ */ S("p", {
									className: "mt-1 text-xs leading-5 text-brand-gray",
									children: /* @__PURE__ */ S(L, { id: "tYS8HY" })
								})]
							}),
							/* @__PURE__ */ S("button", {
								type: "button",
								onClick: i,
								title: B._({ id: "yz7wBu" }),
								"aria-label": B._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
								children: /* @__PURE__ */ S(Wf, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [/* @__PURE__ */ S("ul", {
							className: "space-y-1",
							"aria-label": B._({ id: "Db4W3_" }),
							children: t.columns.map((e) => {
								let i = u === e.key;
								return /* @__PURE__ */ C("li", {
									className: "group flex min-h-12 items-center gap-2 rounded-xl px-2 hover:bg-stone-50",
									children: [
										/* @__PURE__ */ S("span", {
											className: "h-4 w-4 shrink-0 rounded-full bg-stone-300 ring-1 ring-black/10",
											style: e.color ? { backgroundColor: e.color } : void 0
										}),
										/* @__PURE__ */ S("span", {
											className: "min-w-0 flex-1 truncate text-xs font-semibold text-stone-800",
											children: e.name
										}),
										e.limit != null && /* @__PURE__ */ S("span", {
											className: "rounded bg-stone-100 px-1.5 py-0.5 text-[10px] tabular-nums text-brand-gray",
											children: B._({
												id: "pdVZUg",
												values: { 0: e.limit }
											})
										}),
										i && /* @__PURE__ */ S(Yd, {
											className: "h-4 w-4 text-emerald-500",
											title: B._({ id: "_5CsXX" })
										}),
										/* @__PURE__ */ S(Gp, {
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
								/* @__PURE__ */ S(Of, { className: "h-4 w-4 text-brand-dark" }),
								/* @__PURE__ */ S("input", {
									autoFocus: !0,
									value: s,
									onChange: (e) => c(e.target.value),
									onKeyDown: (e) => {
										e.key === "Escape" && (o(!1), c(""));
									},
									placeholder: B._({ id: "P5cvAA" }),
									"aria-label": B._({ id: "P5cvAA" }),
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
							children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "1nUGn5" })]
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
//#region ../../shared/components/board/controls.tsx
var Jp = "rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
function Yp({ value: e, options: t, onChange: n, disabled: r = !1 }) {
	let i = t.find((t) => t.value === e);
	return /* @__PURE__ */ C(Jl, {
		value: e,
		onChange: n,
		disabled: r,
		children: [/* @__PURE__ */ C(Ul, {
			className: `${Jp} flex w-full items-center justify-between gap-1 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60`,
			children: [/* @__PURE__ */ C("span", {
				className: "flex min-w-0 items-center gap-1.5",
				children: [i?.warning ? /* @__PURE__ */ S(mf, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : i?.color ? /* @__PURE__ */ S("span", {
					className: "h-2.5 w-2.5 shrink-0 rounded-full",
					style: { backgroundColor: i.color },
					"aria-hidden": !0
				}) : null, /* @__PURE__ */ S("span", {
					className: "truncate",
					children: i?.label ?? e
				})]
			}), /* @__PURE__ */ S(rf, { className: "h-3.5 w-3.5 shrink-0 text-stone-400" })]
		}), /* @__PURE__ */ S(Gl, {
			anchor: "bottom start",
			className: "z-[60] w-[var(--button-width)] rounded-md border border-black/[0.06] bg-white py-1 text-xs shadow-lg [--anchor-gap:4px] focus:outline-none",
			children: t.map((t) => /* @__PURE__ */ C(Kl, {
				value: t.value,
				className: "flex cursor-pointer items-center justify-between gap-1 px-2 py-1 text-stone-700 data-[focus]:bg-stone-100",
				children: [/* @__PURE__ */ C("span", {
					className: "flex min-w-0 items-center gap-1.5",
					children: [t.warning ? /* @__PURE__ */ S(mf, { className: "h-3.5 w-3.5 shrink-0 text-amber-500" }) : t.color ? /* @__PURE__ */ S("span", {
						className: "h-2.5 w-2.5 shrink-0 rounded-full",
						style: { backgroundColor: t.color },
						"aria-hidden": !0
					}) : null, /* @__PURE__ */ S("span", {
						className: "truncate",
						children: t.label
					})]
				}), t.value === e && /* @__PURE__ */ S(Zd, { className: "h-3.5 w-3.5 shrink-0 text-brand" })]
			}, t.value))
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneDeleteDialog.tsx
function Xp({ lane: e, cardCount: t, targets: n, busy: r, progress: i, error: a, portalClassName: o, onClose: s, onConfirm: c }) {
	let [l, u] = y("keep"), [d, p] = y(""), m = v(null), h = n.length > 0;
	f(() => {
		let t = e?.key ?? null, r = m.current !== t;
		m.current = t, r && u("keep"), p((e) => r || !n.some((t) => t.value === e) ? n[0]?.value ?? "" : e);
	}, [e?.key, n]);
	let g = o ? ` ${o}` : "", _ = () => {
		r || s();
	};
	return /* @__PURE__ */ C(ul, {
		open: !!e,
		onClose: _,
		className: `relative z-50${g}`,
		children: [/* @__PURE__ */ S(cl, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${g}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${g}`,
			children: /* @__PURE__ */ S(sl, {
				"aria-describedby": "swimlane-delete-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${g}`,
				children: e && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ C("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ S(ll, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: B._({
								id: "KpnwJK",
								values: { 0: e.name }
							})
						}),
						/* @__PURE__ */ S("p", {
							id: "swimlane-delete-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: t > 0 ? B._({
								id: "RbsNko",
								values: { cardCount: t }
							}) : B._({ id: "MYx830" })
						}),
						t > 0 && /* @__PURE__ */ C(Cd, {
							value: l,
							onChange: u,
							className: "mt-4 space-y-2",
							children: [/* @__PURE__ */ C(Sd, {
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
							}), /* @__PURE__ */ C(Sd, {
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
							children: /* @__PURE__ */ S(Yp, {
								value: d,
								options: n,
								disabled: l !== "move",
								onChange: p
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
							children: [/* @__PURE__ */ S(mf, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: a })]
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
						children: r ? B._({ id: "XklovM" }) : t > 0 && l === "move" ? B._({ id: "NYTPDY" }) : B._({ id: "uAP6ov" })
					})]
				})] })
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/SwimlaneManagerDialog.tsx
function Zp({ open: e, lanes: t, cards: n, focusRequest: r, portalClassName: i, onClose: a, onSaveLanes: o, onUpdateCards: s, onShowAffected: c }) {
	let [l, u] = y(!1), [d, p] = y(""), [m, h] = y(null), [_, b] = y(""), [w, T] = y(null), [E, D] = y(!1), [O, k] = y(null), [A, j] = y(!1), [M, N] = y(""), [P, F] = y(null), [I, ee] = y(""), R = v(null), [te, z] = y(null), ne = v(!1), re = v(null);
	f(() => {
		e || (u(!1), p(""), h(null), T(null), k(null), N(""), F(null), ee(""));
	}, [e]), f(() => {
		if (!e || !r || re.current === r.id) return;
		let n = t.find((e) => e.key === r.laneKey);
		n && (re.current = r.id, r.action === "rename" ? (h(n.key), b(n.name), T(null)) : (N(""), F(null), k(n)));
	}, [
		r?.id,
		e,
		t
	]);
	let ie = i ? ` ${i}` : "", ae = g(() => {
		let e = /* @__PURE__ */ new Map();
		for (let t of n) t.swimlaneKey && e.set(t.swimlaneKey, (e.get(t.swimlaneKey) ?? 0) + 1);
		return e;
	}, [n]), oe = g(() => Tp({ swimlanes: t }, n), [t, n]), se = oe.filter((e) => e.kind === "dangling_swimlane").reduce((e, t) => e + t.cardCount, 0), ce = oe.filter((e) => e.kind !== "dangling_swimlane"), le = async (e, t = "dialog") => {
		if (!ne.current) {
			ne.current = !0, D(!0), T(null);
			try {
				await o(e);
			} catch (e) {
				throw T({
					key: t,
					message: e instanceof Error ? e.message : String(e)
				}), e;
			} finally {
				ne.current = !1, D(!1);
			}
		}
	}, ue = (e, n) => {
		let r = t.findIndex((t) => t.key === e), i = r + n;
		if (r < 0 || i < 0 || i >= t.length || E) return;
		let a = [...t], [o] = a.splice(r, 1);
		o && (a.splice(i, 0, o), le(a, e).then(() => ee(B._({
			id: "CxcMyt",
			values: {
				0: o.name,
				1: i + 1,
				2: t.length
			}
		}))).catch(() => void 0));
	}, de = (e, n) => {
		if (e === n || E) return;
		let r = [...t], i = r.findIndex((t) => t.key === e), a = r.findIndex((e) => e.key === n);
		if (i < 0 || a < 0) return;
		let [o] = r.splice(i, 1);
		o && (r.splice(a, 0, o), le(r, e).then(() => ee(B._({
			id: "CxcMyt",
			values: {
				0: o.name,
				1: a + 1,
				2: t.length
			}
		}))).catch(() => void 0));
	}, fe = (e, t) => {
		e.button !== 0 || E || (R.current = {
			key: t,
			x: e.clientX,
			y: e.clientY,
			moved: !1
		}, e.currentTarget.setPointerCapture?.(e.pointerId));
	}, pe = (e, t) => {
		let n = R.current;
		if (!(!n || n.key !== t) && !n.moved) {
			if (Math.abs(e.clientX - n.x) < 4 && Math.abs(e.clientY - n.y) < 4) return;
			n.moved = !0, z(t);
		}
	}, me = (e, t) => {
		let n = R.current;
		R.current = null, z(null);
		try {
			e.currentTarget.releasePointerCapture?.(e.pointerId);
		} catch {}
		if (!n?.moved || n.key !== t) return;
		let r = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-swimlane-row]")?.dataset.swimlaneRow;
		r && de(t, r);
	}, he = (e) => {
		T(null), h(e.key), b(e.name);
	}, ge = async (e) => {
		let n = Cp(_, t, e.key);
		if (n) {
			T({
				key: e.key,
				message: n
			});
			return;
		}
		let r = _.trim();
		h(null), r !== e.name && await le(t.map((t) => t.key === e.key ? {
			...t,
			name: r
		} : t), e.key).catch(() => {
			h(e.key);
		});
	}, _e = async () => {
		let e = Cp(d, t);
		if (e) {
			T({
				key: "new",
				message: e
			});
			return;
		}
		let r = d.trim(), i = {
			key: Sp(r, [...t.map((e) => e.key), ...n.map((e) => e.swimlaneKey).filter((e) => !!e)]),
			name: r
		};
		u(!1), p(""), await le([...t, i], "new").catch(() => {
			u(!0), p(r);
		});
	}, ve = (e, n) => {
		E || le(t.map((t) => t.key === e.key ? {
			...t,
			color: n
		} : t), e.key).catch(() => void 0);
	}, ye = async (e) => {
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
	}, be = O ? [{
		value: "",
		label: B._({ id: "EbMPZJ" })
	}, ...t.filter((e) => e.key !== O.key).map((e) => ({
		value: e.key,
		label: e.name,
		color: e.color
	}))] : [];
	return /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ C(ul, {
		open: e,
		onClose: () => {
			!E && !A && a();
		},
		className: `relative z-40${ie}`,
		children: [/* @__PURE__ */ S(cl, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${ie}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4${ie}`,
			children: /* @__PURE__ */ C(sl, {
				"aria-describedby": "swimlane-manager-description",
				className: `flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06] sm:rounded-2xl${ie}`,
				children: [
					/* @__PURE__ */ C("div", {
						className: "flex items-start gap-3 border-b border-line px-5 pb-4 pt-5",
						children: [
							/* @__PURE__ */ S("span", {
								className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark",
								children: /* @__PURE__ */ S(Vd, { className: "h-4.5 w-4.5" })
							}),
							/* @__PURE__ */ C("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ S(ll, {
										className: "text-base font-semibold tracking-tight text-stone-900",
										children: /* @__PURE__ */ S(L, { id: "uH1U8v" })
									}),
									/* @__PURE__ */ S("p", {
										id: "swimlane-manager-description",
										className: "mt-1 text-xs leading-5 text-brand-gray",
										children: /* @__PURE__ */ S(L, { id: "lUeOk0" })
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
								title: B._({ id: "yz7wBu" }),
								"aria-label": B._({ id: "yz7wBu" }),
								className: "rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
								children: /* @__PURE__ */ S(Wf, { className: "h-4 w-4" })
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "min-h-0 flex-1 overflow-y-auto px-4 py-3",
						children: [
							/* @__PURE__ */ S("ul", {
								"aria-label": B._({ id: "hyVzII" }),
								className: "space-y-1",
								children: t.map((e, n) => {
									let r = w?.key === e.key ? w.message : null;
									return /* @__PURE__ */ C("li", {
										"data-swimlane-row": e.key,
										className: `rounded-xl transition ${te === e.key ? "opacity-50" : ""}`,
										children: [/* @__PURE__ */ C("div", {
											className: "group flex min-h-12 items-center gap-2 px-2 hover:bg-stone-50 focus-within:bg-stone-50",
											children: [
												/* @__PURE__ */ S("button", {
													type: "button",
													onPointerDown: (t) => fe(t, e.key),
													onPointerMove: (t) => pe(t, e.key),
													onPointerUp: (t) => me(t, e.key),
													title: B._({ id: "KGi3u9" }),
													"aria-label": B._({
														id: "2BPVq8",
														values: { 0: e.name }
													}),
													className: "hidden h-9 w-7 shrink-0 touch-none items-center justify-center rounded-lg text-stone-300 hover:bg-white hover:text-stone-500 active:cursor-grabbing md:flex md:cursor-grab",
													children: /* @__PURE__ */ S(Vd, { className: "h-4 w-4" })
												}),
												/* @__PURE__ */ C(od, {
													className: "relative shrink-0",
													children: [/* @__PURE__ */ S(td, {
														title: B._({ id: "KFiYGY" }),
														className: "flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30",
														children: /* @__PURE__ */ S("span", {
															className: "h-4 w-4 rounded-full bg-stone-300 ring-1 ring-black/10",
															style: e.color ? { backgroundColor: e.color } : void 0,
															"aria-hidden": !0
														})
													}), /* @__PURE__ */ C(id, {
														anchor: "bottom start",
														className: `z-50 w-52 rounded-xl border border-line bg-white p-3 shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${ie}`,
														children: [/* @__PURE__ */ S("p", {
															className: "text-[11px] font-medium text-brand-gray",
															children: /* @__PURE__ */ S(L, { id: "U0hizX" })
														}), /* @__PURE__ */ C("div", {
															className: "mt-2 flex flex-wrap gap-2",
															children: [rp.map((t) => /* @__PURE__ */ S("button", {
																type: "button",
																onClick: () => ve(e, t),
																title: t,
																className: `h-5 w-5 rounded-full ring-1 ring-black/10 ${e.color === t ? "ring-2 ring-brand ring-offset-2" : ""}`,
																style: { backgroundColor: t }
															}, t)), /* @__PURE__ */ S("button", {
																type: "button",
																onClick: () => ve(e, null),
																title: B._({ id: "H_SQFv" }),
																className: `flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${e.color ? "" : "ring-2 ring-brand ring-offset-2"}`,
																children: /* @__PURE__ */ S(Wf, { className: "h-3 w-3 text-stone-400" })
															})]
														})]
													})]
												}),
												m === e.key ? /* @__PURE__ */ S("form", {
													className: "min-w-0 flex-1",
													onSubmit: (t) => {
														t.preventDefault(), ge(e);
													},
													children: /* @__PURE__ */ S("input", {
														autoFocus: !0,
														value: _,
														maxLength: 80,
														onChange: (e) => b(e.target.value),
														onBlur: () => void ge(e),
														onKeyDown: (e) => {
															e.key === "Escape" && (h(null), T(null));
														},
														"aria-label": B._({ id: "79Yvzu" }),
														className: "h-8 w-full rounded-lg border border-brand/40 bg-white px-2 text-xs font-medium text-stone-800 outline-none ring-2 ring-brand/10"
													})
												}) : /* @__PURE__ */ S("button", {
													type: "button",
													onDoubleClick: () => he(e),
													className: "min-w-0 flex-1 truncate text-left text-xs font-semibold text-stone-800",
													title: e.name,
													children: e.name
												}),
												/* @__PURE__ */ S("span", {
													className: "shrink-0 tabular-nums text-[11px] text-brand-gray",
													children: /* @__PURE__ */ S(L, {
														id: "fFAIng",
														values: { 0: ae.get(e.key) ?? 0 }
													})
												}),
												/* @__PURE__ */ C(Du, {
													as: "div",
													className: "relative shrink-0",
													children: [/* @__PURE__ */ S(Su, {
														title: B._({ id: "DGEEOQ" }),
														"aria-label": B._({
															id: "RlLl3G",
															values: { 0: e.name }
														}),
														className: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100",
														children: /* @__PURE__ */ S(ff, { className: "h-4 w-4" })
													}), /* @__PURE__ */ C(Cu, {
														anchor: "bottom end",
														className: `z-50 w-48 rounded-xl border border-line bg-white py-1 text-xs shadow-lg shadow-emerald-950/10 [--anchor-gap:4px] focus:outline-none${ie}`,
														children: [
															/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => he(e),
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Ef, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
															}) }),
															/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => ue(e.key, -1),
																disabled: n === 0 || E,
																"aria-disabled": n === 0 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Fd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "QyioBP" })]
															}) }),
															/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => ue(e.key, 1),
																disabled: n === t.length - 1 || E,
																"aria-disabled": n === t.length - 1 || E,
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-stone-700 aria-disabled:opacity-40 data-[focus]:bg-stone-100",
																children: [/* @__PURE__ */ S(Dd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "3Ib6FN" })]
															}) }),
															/* @__PURE__ */ S("div", { className: "my-1 border-t border-line" }),
															/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																type: "button",
																onClick: () => {
																	N(""), F(null), k(e);
																},
																className: "flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 data-[focus]:bg-red-50",
																children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
															}) })
														]
													})]
												}),
												/* @__PURE__ */ S(Wp, {
													lane: e,
													cardCount: ae.get(e.key) ?? 0,
													portalClassName: i,
													buttonClassName: "flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 opacity-100 hover:bg-white hover:text-stone-600 md:opacity-0 md:group-hover:opacity-100 md:data-[open]:opacity-100"
												})
											]
										}), r && /* @__PURE__ */ C("div", {
											className: "mx-2 mb-1 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800",
											role: "alert",
											children: [/* @__PURE__ */ S(mf, { className: "h-3.5 w-3.5 shrink-0" }), r]
										})]
									}, e.key);
								})
							}),
							l ? /* @__PURE__ */ C("form", {
								className: "mt-2 rounded-xl border border-dashed border-brand/30 bg-brand-soft/20 p-2",
								onSubmit: (e) => {
									e.preventDefault(), _e();
								},
								children: [/* @__PURE__ */ C("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ S("span", {
											className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-dark",
											children: /* @__PURE__ */ S(Of, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ S("input", {
											autoFocus: !0,
											value: d,
											maxLength: 80,
											onChange: (e) => p(e.target.value),
											onKeyDown: (e) => {
												e.key === "Escape" && (u(!1), p(""), T(null));
											},
											placeholder: B._({ id: "79Yvzu" }),
											"aria-label": B._({ id: "79Yvzu" }),
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
								children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "KCszT6" })]
							}),
							(ce.length > 0 || se > 0) && /* @__PURE__ */ C("section", {
								className: "mt-4 border-t border-line pt-3",
								"aria-labelledby": "swimlane-issues-title",
								children: [/* @__PURE__ */ S("h3", {
									id: "swimlane-issues-title",
									className: "text-[10px] font-semibold uppercase tracking-wider text-brand-gray",
									children: /* @__PURE__ */ S(L, { id: "1718Q-" })
								}), /* @__PURE__ */ C("div", {
									className: "mt-2 space-y-2",
									children: [ce.map((e) => /* @__PURE__ */ C("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										role: "alert",
										children: [/* @__PURE__ */ S(mf, { className: "h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: e.kind === "duplicate_swimlane_key" ? B._({
											id: "RgO4DX",
											values: { 0: e.key }
										}) : B._({
											id: "uWPalN",
											values: { 0: e.name }
										}) })]
									}, `${e.kind}-${e.kind === "duplicate_swimlane_key" ? e.key : e.name}`)), se > 0 && /* @__PURE__ */ C("div", {
										className: "flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs text-amber-800",
										children: [
											/* @__PURE__ */ S(mf, { className: "h-4 w-4 shrink-0" }),
											/* @__PURE__ */ S("span", {
												className: "min-w-0 flex-1",
												children: B._({
													id: "SavliD",
													values: { danglingCount: se }
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
							children: E ? B._({ id: "K_F6pa" }) : B._({ id: "cUt8yN" })
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
	}), /* @__PURE__ */ S(Xp, {
		lane: O,
		cardCount: O ? ae.get(O.key) ?? 0 : 0,
		targets: be,
		busy: A,
		progress: P,
		error: M,
		portalClassName: i,
		onClose: () => {
			A || k(null);
		},
		onConfirm: ye
	})] });
}
//#endregion
//#region ../../shared/components/board/SwimlaneConversionDialog.tsx
function Qp({ source: e, rows: t, open: n, busy: r, resume: i, progress: a, error: o, portalClassName: s, onClose: c, onConfirm: l }) {
	let u = s ? ` ${s}` : "", d = () => {
		r || c();
	};
	return /* @__PURE__ */ C(ul, {
		open: n,
		onClose: d,
		className: `relative z-50${u}`,
		children: [/* @__PURE__ */ S(cl, { className: `fixed inset-0 bg-stone-950/30 backdrop-blur-sm${u}` }), /* @__PURE__ */ S("div", {
			className: `fixed inset-0 flex items-center justify-center overflow-y-auto p-4${u}`,
			children: /* @__PURE__ */ C(sl, {
				"aria-describedby": "swimlane-conversion-description",
				className: `w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-black/[0.06]${u}`,
				children: [/* @__PURE__ */ C("div", {
					className: "px-5 pb-4 pt-5",
					children: [
						/* @__PURE__ */ S(ll, {
							className: "text-base font-semibold tracking-tight text-stone-900",
							children: i ? B._({ id: "CXTDT_" }) : e === "priority" ? B._({ id: "nfhh60" }) : B._({ id: "vMTOsC" })
						}),
						/* @__PURE__ */ S("p", {
							id: "swimlane-conversion-description",
							className: "mt-1 text-xs leading-5 text-brand-gray",
							children: i ? B._({ id: "T_nAzC" }) : e === "priority" ? B._({ id: "_YbTQZ" }) : B._({ id: "RfEZH1" })
						}),
						/* @__PURE__ */ C("ul", {
							className: "mt-4 divide-y divide-line",
							"aria-label": B._({ id: "4NY8B5" }),
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
									children: [/* @__PURE__ */ S(jd, { className: "h-3.5 w-3.5 animate-spin" }), /* @__PURE__ */ S(L, { id: "ANe5kn" })]
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
							children: [/* @__PURE__ */ S(mf, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ S("span", { children: o })]
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
						children: r ? B._({ id: "XklovM" }) : i ? B._({ id: "l_g7se" }) : B._({ id: "PUeYA1" })
					})]
				})]
			})
		})]
	});
}
//#endregion
//#region ../../shared/components/board/BoardSurface.tsx
function $p({ config: e, cards: t, actions: r, error: i, templates: a, createFromTemplate: o, assigneeOptions: s, tagOptions: c, loadNotes: l, onUploadAttachment: u, loadComments: d, addComment: p, updateComment: m, deleteComment: h, toggleReaction: _, resolveComment: b, currentUser: w, loadActivity: T, fullscreen: E, onToggleFullscreen: D, onOpenSettings: O, readOnly: k, onCardOpen: A, peekComponent: j, portalClassName: M }) {
	let [N, P] = y(null), [F, I] = y(/* @__PURE__ */ new Set()), [ee, R] = y(null), [te, z] = y(null), [ne, re] = y(/* @__PURE__ */ new Set()), [ie, ae] = y(null), [oe, se] = y(""), [ce, le] = y(!1), [ue, de] = y(""), [fe, pe] = y(""), [me, he] = y("manual"), [ge, _e] = y(null), [ve, ye] = y(360), [be, xe] = y(null), [Se, Ce] = y(null), [we, Te] = y(null), [Ee, De] = y(!1), [Oe, ke] = y(!1), [Ae, je] = y(), [Me, Ne] = y(!1), [Pe, Fe] = y("priority"), [Ie, Le] = y(!1), [Re, ze] = y(null), [Be, Ve] = y(""), [He, Ue] = y(0), [We, Ge] = y(!1), Ke = v(null), qe = v(null), Je = v(!1), Ye = v(null), Xe = v(!1), Ze = e.groupBy ?? "status", Qe = Ze === "status", $e = e.viewType ?? "board", et = e.doneColumn ?? "done", tt = (e.colorColumns ?? !1) && Qe && $e === "board", nt = me === "manual" && Qe && $e === "board" && !fe.trim() && !ge, rt = _p();
	f(() => {
		if (!E || !D) return;
		let e = (e) => {
			e.key === "Escape" && !N && F.size === 0 && D();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [
		E,
		N,
		F.size,
		D
	]), f(() => {
		if (F.size === 0) return;
		let e = (e) => {
			e.key === "Escape" && I(/* @__PURE__ */ new Set());
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [F.size]);
	let it = g(() => Dp(e, t, Ze, B._({ id: "EbMPZJ" })), [
		e,
		t,
		Ze
	]), at = xp(e.swimlaneBy), ot = at && at !== Ze ? at : null, st = $e === "board" && !!ot, ct = g(() => ot ? kp(e, t, ot, B._({ id: "EbMPZJ" })) : [], [
		e,
		t,
		ot
	]), lt = g(() => Np(t, fe, ge, e), [
		t,
		fe,
		ge,
		e
	]), ut = g(() => mp(t, e.doneColumn), [t, e.doneColumn]), dt = g(() => hp(t), [t]), ft = g(() => [...new Set(t.map((e) => e.assignee).filter(Boolean))], [t]), pt = g(() => [...new Set(t.flatMap((e) => e.tags.map((e) => e.label)))], [t]), mt = (t) => e.columns.find((e) => e.key === t)?.name || t || B._({ id: "EbMPZJ" }), ht = N ? t.find((e) => e.id === N) ?? null : null, gt = g(() => Dp(e, t, Pe, B._({ id: "EbMPZJ" })).filter((e) => Pe === "priority" ? e.key !== "none" : e.key !== "").map((e, n) => ({
		value: e.key,
		name: e.name,
		color: e.color ?? rp[n % rp.length],
		cardCount: t.filter((t) => Ep(t, Pe) === e.key).length
	})), [
		t,
		e,
		Pe
	]), _t = async (e, t) => {
		if (r.updateCards) {
			await r.updateCards(e, t);
			return;
		}
		let n = 0;
		for (let i of e) await r.updateCard(i.cardId, i.patch), n += 1, t?.(n, e.length);
	}, vt = async () => {
		if (!Ie) {
			if (Ve(""), Ye.current = null, !(e.swimlaneMigration?.source === Pe && e.swimlaneMigration)) {
				let n = /* @__PURE__ */ new Set([...(e.swimlanes ?? []).map((e) => e.key), ...t.map((e) => e.swimlaneKey).filter((e) => !!e)]), i = gt.map((e) => {
					let t = Sp(e.name, n);
					return n.add(t), {
						value: e.value,
						swimlaneKey: t
					};
				}), a = [...e.swimlanes ?? [], ...i.map((e, t) => ({
					key: e.swimlaneKey,
					name: gt[t]?.name ?? e.value,
					color: gt[t]?.color
				}))], o = {
					version: 1,
					source: Pe,
					mapping: i
				};
				try {
					await r.setConfig({
						swimlanes: a,
						swimlaneMigration: o
					});
				} catch (e) {
					Ve(e instanceof Error ? e.message : String(e));
					return;
				}
			}
			ze(null), Le(!0);
		}
	};
	f(() => {
		if (!Ie || Je.current) return;
		let n = e.swimlaneMigration;
		!n || n.source !== Pe || (Je.current = !0, (async () => {
			try {
				let i = [...n.mapping], a = [...e.swimlanes ?? []], o = new Set(i.map((e) => e.value)), s = new Set(a.map((e) => e.key)), c = /* @__PURE__ */ new Set([
					...s,
					...i.map((e) => e.swimlaneKey),
					...t.map((e) => e.swimlaneKey).filter((e) => !!e)
				]), l = [...new Set(t.map((e) => Ep(e, n.source)).filter((e) => n.source === "priority" ? e !== "none" : e !== ""))], u = !1;
				for (let e of l) if (!o.has(e)) {
					let t = Sp(e, c);
					c.add(t), i.push({
						value: e,
						swimlaneKey: t
					}), o.add(e), u = !0;
				}
				for (let e of i) if (!s.has(e.swimlaneKey)) {
					let t = gt.find((t) => t.value === e.value), n = Math.max(0, l.indexOf(e.value));
					a.push({
						key: e.swimlaneKey,
						name: t?.name ?? e.value,
						color: t?.color ?? rp[n % rp.length]
					}), s.add(e.swimlaneKey), u = !0;
				}
				if (u) {
					Ye.current = null, await r.setConfig({
						swimlanes: a,
						swimlaneMigration: {
							...n,
							mapping: i
						}
					});
					return;
				}
				let d = new Map(i.map((e) => [e.value, e.swimlaneKey])), f = t.flatMap((e) => {
					let t = Ep(e, n.source), r = d.get(t);
					return r && e.swimlaneKey !== r ? [{
						cardId: e.id,
						patch: { swimlaneKey: r }
					}] : [];
				});
				if (f.length > 0) {
					let e = f.map((e) => `${e.cardId}:${String(e.patch.swimlaneKey ?? "")}`).sort().join("\n"), t = Ye.current;
					if (t?.signature === e && t.writes >= 2) throw Error(B._({ id: "KAlhe_" }));
					Ye.current = {
						signature: e,
						writes: t?.signature === e ? t.writes + 1 : 1
					}, ze({
						completed: 0,
						total: f.length
					}), await _t(f, (e, t) => ze({
						completed: e,
						total: t
					}));
					return;
				}
				await r.setConfig({
					swimlanes: a,
					swimlaneBy: "custom",
					swimlaneMigration: void 0
				}), Ye.current = null, Le(!1), ze(null), Ne(!1);
			} catch (e) {
				Ve(e instanceof Error ? e.message : String(e)), ze(null), Le(!1);
			} finally {
				Je.current = !1, Ue((e) => e + 1);
			}
		})());
	}, [
		r,
		t,
		e.swimlaneMigration,
		e.swimlanes,
		He,
		Ie,
		gt,
		Pe
	]);
	let yt = "h-7 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand", bt = M ? ` ${M}` : "", xt = (e) => {
		Ie || Promise.resolve(r.setConfig(e)).catch(() => {});
	}, St = async (e) => {
		await r.setConfig({ swimlanes: e });
	}, Ct = (t, n) => {
		if (Xe.current) return;
		let i = [...e.swimlanes ?? []], a = i.findIndex((e) => e.key === t), o = a + n;
		if (a < 0 || o < 0 || o >= i.length) return;
		let [s] = i.splice(a, 1);
		s && (i.splice(o, 0, s), Xe.current = !0, Ge(!0), Promise.resolve(r.setConfig({ swimlanes: i })).catch(() => {}).finally(() => {
			Xe.current = !1, Ge(!1);
		}));
	}, wt = (t, n) => {
		Xe.current || (Xe.current = !0, Ge(!0), Promise.resolve(r.setConfig({ swimlanes: (e.swimlanes ?? []).map((e) => e.key === t ? {
			...e,
			color: n
		} : e) })).catch(() => {}).finally(() => {
			Xe.current = !1, Ge(!1);
		}));
	}, Tt = () => {
		_e({
			prop: "swimlaneIssue",
			value: "dangling"
		}), window.setTimeout(() => {
			document.querySelector("[data-swimlane-unassigned]")?.scrollIntoView({
				block: "nearest",
				inline: "nearest",
				behavior: "smooth"
			});
		}, 80);
	}, Et = (e) => {
		A ? A(e) : P(e.id);
	}, Dt = !!(r.renameColumn || r.toggleDoneColumn || r.setColumnLimit || r.setColumnColor || r.deleteColumn), Ot = (e, t) => {
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
	}, kt = (e, t) => (document.elementFromPoint(e, t)?.closest("[data-col-key]"))?.dataset.colKey ?? null, At = (e, t) => {
		if (e.button === 0) {
			Ke.current = {
				id: t.id,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, jt = (e, t) => {
		if (k) return;
		let n = Ke.current;
		if (!(!n || n.id !== t.id)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, xe(t.id);
			}
			Te({
				x: e.clientX,
				y: e.clientY
			}), R(Ot(e.clientX, e.clientY));
		}
	}, Mt = (e, n) => {
		let i = Ke.current;
		Ke.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (xe(null), Te(null), R(null), i?.moved) {
			let i = Ot(e.clientX, e.clientY);
			if (i) {
				let e = Qe && !nt ? t.filter((e) => e.id !== n.id && Ep(e, Ze) === i.col).length : i.index;
				r.moveCard(n.id, i.col, e);
			}
		} else if (i) {
			if ((e.metaKey || e.ctrlKey) && !k) {
				I((e) => {
					let t = new Set(e);
					return t.has(n.id) ? t.delete(n.id) : t.add(n.id), t;
				});
				return;
			}
			Et(n);
		}
	}, Nt = (e) => {
		for (let n of F) t.some((e) => e.id === n) && r.updateCard(n, e);
	}, Pt = (e, t) => {
		if (!(!Qe || !r.reorderColumns || e.button !== 0) && !e.target.closest("button")) {
			qe.current = {
				key: t.key,
				startX: e.clientX,
				startY: e.clientY,
				moved: !1
			};
			try {
				e.currentTarget.setPointerCapture(e.pointerId);
			} catch {}
		}
	}, V = (e, t) => {
		let n = qe.current;
		if (!(!n || n.key !== t.key)) {
			if (!n.moved) {
				if (Math.abs(e.clientX - n.startX) < 4 && Math.abs(e.clientY - n.startY) < 4) return;
				n.moved = !0, Ce(t.key);
			}
			z(kt(e.clientX, e.clientY));
		}
	}, Ft = (e, t) => {
		let n = qe.current;
		qe.current = null;
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {}
		if (Ce(null), z(null), n?.moved) {
			let n = kt(e.clientX, e.clientY);
			n && n !== t.key && r.reorderColumns?.(t.key, n);
		}
	}, H = (e) => re((t) => {
		let n = new Set(t);
		return n.has(e) ? n.delete(e) : n.add(e), n;
	}), It = async (e, t) => {
		let n = t.trim();
		if (!n) return;
		let i = await r.createCard(e, n);
		typeof i == "string" && !A && P(i);
	};
	return i && e.columns.length === 0 ? /* @__PURE__ */ C("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-stone-50 p-8 text-center",
		children: [/* @__PURE__ */ S(mf, { className: "h-9 w-9 text-amber-500" }), /* @__PURE__ */ S("p", {
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
								children: /* @__PURE__ */ S(Hf, { className: "h-4 w-4" })
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
										lt.length,
										lt.length === t.length ? "" : `/${t.length}`,
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
												onClick: () => xt({ viewType: "board" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${$e === "board" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S(Hf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "QD8opX" })]
											}),
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => xt({ viewType: "table" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${$e === "table" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S(Pf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "4hJhzz" })]
											}),
											/* @__PURE__ */ C("button", {
												type: "button",
												onClick: () => xt({ viewType: "calendar" }),
												className: `inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${$e === "calendar" ? "bg-brand-soft text-brand-dark" : "text-stone-500 hover:text-brand-dark"}`,
												children: [/* @__PURE__ */ S(qd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "AjVXBS" })]
											})
										]
									}),
									Qe && $e === "board" && !k && /* @__PURE__ */ C("button", {
										type: "button",
										className: `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${tt ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: () => xt({ colorColumns: !e.colorColumns }),
										title: B._({ id: "b4hVKD" }),
										children: [/* @__PURE__ */ S(Mf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "jZlrte" })]
									}),
									r.refresh && /* @__PURE__ */ C("button", {
										type: "button",
										className: "inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: () => void r.refresh?.(),
										title: B._({ id: "lCF0wC" }),
										children: [/* @__PURE__ */ S(jd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "lCF0wC" })]
									}),
									O && /* @__PURE__ */ S("button", {
										type: "button",
										className: "inline-flex items-center justify-center rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:border-brand/40 hover:text-brand-dark",
										onClick: O,
										title: B._({ id: "6buwPb" }),
										"aria-label": B._({ id: "6buwPb" }),
										children: /* @__PURE__ */ S(cf, { className: "h-3.5 w-3.5" })
									}),
									D && /* @__PURE__ */ S("button", {
										type: "button",
										className: `inline-flex items-center justify-center rounded-lg border p-1.5 ${E ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40 hover:text-brand-dark"}`,
										onClick: D,
										title: E ? B._({ id: "sQpDn6" }) : B._({ id: "3qkggm" }),
										"aria-label": E ? B._({ id: "sQpDn6" }) : B._({ id: "3qkggm" }),
										"aria-pressed": E,
										children: S(E ? Ld : zd, { className: "h-3.5 w-3.5" })
									})
								]
							})
						]
					}),
					/* @__PURE__ */ C("div", {
						className: "flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-white/40 px-5 py-1.5",
						children: [
							$e === "board" && /* @__PURE__ */ C("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ S(Af, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("select", {
									className: yt,
									value: Ze,
									disabled: Ie,
									onChange: (e) => xt({ groupBy: e.target.value }),
									children: [
										/* @__PURE__ */ S("option", {
											value: "status",
											children: B._({ id: "OepdfE" })
										}),
										/* @__PURE__ */ S("option", {
											value: "priority",
											children: B._({ id: "y9cj46" })
										}),
										/* @__PURE__ */ S("option", {
											value: "assignee",
											children: B._({ id: "AxAubu" })
										})
									]
								})]
							}),
							$e === "board" && /* @__PURE__ */ C("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ S(Vd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("select", {
									className: yt,
									value: ot ?? "",
									disabled: Ie,
									onChange: (t) => {
										let n = t.target.value || void 0;
										Promise.resolve(r.setConfig({ swimlaneBy: n })).then(() => {
											n === "custom" && (e.swimlanes?.length ?? 0) === 0 && !k && De(!0);
										}).catch(() => {});
									},
									children: [
										/* @__PURE__ */ S("option", {
											value: "",
											children: B._({ id: "KjXDqG" })
										}),
										[
											"status",
											"priority",
											"assignee"
										].filter((e) => e !== Ze).map((e) => /* @__PURE__ */ S("option", {
											value: e,
											children: e === "status" ? B._({ id: "ucJg3u" }) : e === "priority" ? B._({ id: "jUbC3Z" }) : B._({ id: "lHxVTh" })
										}, e)),
										/* @__PURE__ */ S("option", {
											value: "custom",
											children: B._({ id: "ATIq3Z" })
										})
									]
								})]
							}),
							$e === "board" && ot && !k && /* @__PURE__ */ S("button", {
								type: "button",
								disabled: Ie,
								onClick: () => {
									ot === "custom" ? De(!0) : ot === "status" ? ke(!0) : (Fe(e.swimlaneMigration?.source ?? ot), Ve(""), Ne(!0));
								},
								title: ot === "custom" ? B._({ id: "uH1U8v" }) : ot === "status" ? B._({ id: "rvpMpc" }) : B._({ id: "jzy1b8" }),
								"aria-label": ot === "custom" ? B._({ id: "uH1U8v" }) : ot === "status" ? B._({ id: "rvpMpc" }) : B._({ id: "jzy1b8" }),
								className: "inline-flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500 transition hover:border-brand/40 hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
								children: /* @__PURE__ */ S(Td, { className: "h-3.5 w-3.5" })
							}),
							$e !== "calendar" && /* @__PURE__ */ C("label", {
								className: "inline-flex items-center gap-1 text-xs text-brand-gray",
								children: [/* @__PURE__ */ S(Ud, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ C("select", {
									className: yt,
									value: me,
									onChange: (e) => he(e.target.value),
									children: [
										/* @__PURE__ */ S("option", {
											value: "manual",
											children: B._({ id: "8lE269" })
										}),
										/* @__PURE__ */ S("option", {
											value: "due",
											children: B._({ id: "fYcKtB" })
										}),
										/* @__PURE__ */ S("option", {
											value: "priority",
											children: B._({ id: "WSP6v1" })
										}),
										/* @__PURE__ */ S("option", {
											value: "title",
											children: B._({ id: "p9yTeb" })
										})
									]
								})]
							}),
							/* @__PURE__ */ C(Du, {
								as: "div",
								className: "relative",
								children: [/* @__PURE__ */ C(Su, {
									className: `inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs ${ge ? "border-brand/40 bg-brand-soft/50 text-brand-dark" : "border-stone-200 text-stone-600 hover:border-brand/40"}`,
									children: [/* @__PURE__ */ S(gf, { className: "h-3.5 w-3.5" }), ge ? ge.prop === "swimlaneIssue" ? B._({ id: "FQylcT" }) : `${ge.prop}: ${ge.value || B._({ id: "EbMPZJ" })}` : /* @__PURE__ */ S(L, { id: "o7J4JM" })]
								}), /* @__PURE__ */ C(Cu, {
									anchor: "bottom start",
									className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${bt}`,
									children: [
										ge && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
											type: "button",
											className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => _e(null),
											children: [/* @__PURE__ */ S(Wf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Q2mGA7" })]
										}) }), /* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" })] }),
										/* @__PURE__ */ S("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ S(L, { id: "1hKEom" })
										}),
										ep.map((e) => /* @__PURE__ */ S($, { children: /* @__PURE__ */ S("button", {
											type: "button",
											className: "flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => _e({
												prop: "priority",
												value: e
											}),
											children: e
										}) }, e)),
										ft.length > 0 && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ S(L, { id: "ojKCLU" })
										}), ft.map((e) => /* @__PURE__ */ S($, { children: /* @__PURE__ */ S("button", {
											type: "button",
											className: "flex w-full items-center px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => _e({
												prop: "assignee",
												value: e
											}),
											children: e
										}) }, e))] }),
										pt.length > 0 && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", {
											className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
											children: /* @__PURE__ */ S(L, { id: "OYHzN1" })
										}), pt.map((e) => /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
											type: "button",
											className: "flex w-full items-center gap-1 px-3 py-1 text-left text-stone-700 data-[focus]:bg-stone-100",
											onClick: () => _e({
												prop: "tag",
												value: e
											}),
											children: [/* @__PURE__ */ S(If, { className: "h-3 w-3" }), e]
										}) }, e))] })
									]
								})]
							}),
							/* @__PURE__ */ C("div", {
								className: "relative ml-auto",
								children: [/* @__PURE__ */ S(wf, { className: "pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" }), /* @__PURE__ */ S("input", {
									className: `${yt} w-44 pl-7`,
									placeholder: B._({ id: "JTYvAw" }),
									value: fe,
									onChange: (e) => pe(e.target.value)
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
					$e === "table" ? /* @__PURE__ */ S(Vp, {
						cards: Pp(lt, me),
						statusName: mt,
						today: rt,
						doneKey: et,
						selectedId: ht?.id,
						onSelect: Et
					}) : $e === "calendar" ? /* @__PURE__ */ S(Up, {
						cards: lt,
						today: rt,
						doneKey: et,
						mode: e.calendarMode ?? "month",
						onModeChange: (e) => xt({ calendarMode: e }),
						selectedId: ht?.id,
						onSelect: Et
					}) : st && ot ? /* @__PURE__ */ S(Kp, {
						cards: lt,
						columns: it,
						lanes: ct,
						config: e,
						groupKey: Ze,
						swimlaneKey: ot,
						sortBy: me,
						today: rt,
						doneKey: et,
						selectedId: ht?.id,
						actions: r,
						readOnly: k || Ie,
						customLaneMutationPending: We,
						portalClassName: M,
						onSelect: Et,
						onOpenManager: () => De(!0),
						onManageLane: ({ laneKey: e, action: t }) => {
							je({
								id: Date.now(),
								laneKey: e,
								action: t
							}), De(!0);
						},
						onMoveCustomLane: Ct,
						onSetCustomLaneColor: wt,
						onShowMissing: Tt
					}) : /* @__PURE__ */ C("div", {
						className: "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto p-4",
						children: [it.map((t, i) => {
							let s = Pp(lt.filter((e) => Ep(e, Ze) === t.key), me), c = (e) => !!be && nt && ee?.col === t.key && ee.index === e, l = Qe && et === t.key, u = te === t.key, d = Qe && t.limit != null && s.length > t.limit, f = t.color ?? rp[i % rp.length];
							return ne.has(t.key) ? /* @__PURE__ */ C("button", {
								type: "button",
								"data-col-key": t.key,
								onClick: () => H(t.key),
								title: B._({ id: "AC9Gkf" }),
								className: `flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-xl border bg-stone-100/60 py-2 text-stone-500 hover:border-brand/40 ${u ? "border-brand/60" : "border-black/[0.05]"}`,
								children: [
									/* @__PURE__ */ S(tf, { className: "h-4 w-4" }),
									(tt || t.color) && /* @__PURE__ */ S("span", {
										className: "h-2 w-2 rounded-full",
										style: { backgroundColor: f },
										"aria-hidden": !0
									}),
									/* @__PURE__ */ S("span", {
										className: "rounded-full bg-white px-1.5 text-[11px] text-stone-400",
										children: s.length
									}),
									/* @__PURE__ */ S("span", {
										className: "mt-1 whitespace-nowrap text-xs font-medium text-stone-600 [writing-mode:vertical-rl]",
										children: t.name
									})
								]
							}, t.key) : /* @__PURE__ */ C("div", {
								"data-col-key": t.key,
								className: `flex max-h-full w-72 shrink-0 flex-col rounded-xl border bg-stone-100/60 transition-opacity ${Se === t.key ? "opacity-50" : ""} ${u ? "border-brand/60" : ee?.col === t.key ? "border-brand/40" : "border-black/[0.05]"}`,
								children: [/* @__PURE__ */ C("div", {
									className: "flex items-center justify-between gap-1 rounded-t-xl px-3 py-2",
									style: tt ? { backgroundColor: `${f}1f` } : void 0,
									children: [/* @__PURE__ */ C("div", {
										onPointerDown: (e) => Pt(e, t),
										onPointerMove: (e) => V(e, t),
										onPointerUp: (e) => Ft(e, t),
										className: `flex min-w-0 flex-1 select-none items-center gap-1.5 text-sm font-medium text-stone-700 ${Qe && r.reorderColumns ? "cursor-grab touch-none active:cursor-grabbing" : ""}`,
										children: [
											/* @__PURE__ */ S("button", {
												type: "button",
												onClick: () => H(t.key),
												title: B._({ id: "pwN6Ae" }),
												className: "-ml-1 rotate-90 rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
												children: /* @__PURE__ */ S(tf, { className: "h-3.5 w-3.5" })
											}),
											(tt || t.color) && /* @__PURE__ */ S("span", {
												className: "h-2 w-2 rounded-full",
												style: { backgroundColor: f },
												"aria-hidden": !0
											}),
											/* @__PURE__ */ S("span", {
												className: "truncate",
												children: t.name || B._({ id: "EbMPZJ" })
											}),
											l && /* @__PURE__ */ S(Yd, {
												className: "h-3.5 w-3.5 shrink-0 text-emerald-500",
												title: B._({ id: "_5CsXX" })
											}),
											/* @__PURE__ */ C("span", {
												className: `rounded-full px-1.5 text-xs ${d ? "bg-red-100 font-medium text-red-600" : "bg-white text-stone-400"}`,
												title: t.limit == null ? void 0 : B._({
													id: "d5z6xQ",
													values: { 0: t.limit }
												}),
												children: [s.length, t.limit == null ? "" : `/${t.limit}`]
											})
										]
									}), Qe && !k && Dt && /* @__PURE__ */ C(Du, {
										as: "div",
										className: "relative shrink-0",
										children: [/* @__PURE__ */ S(Su, {
											className: "rounded p-0.5 text-stone-400 hover:bg-white hover:text-stone-600",
											children: /* @__PURE__ */ S(ff, { className: "h-4 w-4" })
										}), /* @__PURE__ */ C(Cu, {
											anchor: "bottom end",
											className: `z-30 w-48 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${bt}`,
											children: [
												r.renameColumn && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.renameColumn?.(t.key),
													children: [/* @__PURE__ */ S(Ef, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "2wxgft" })]
												}) }),
												r.toggleDoneColumn && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.toggleDoneColumn?.(t.key),
													children: [/* @__PURE__ */ S(Yd, { className: "h-3.5 w-3.5" }), l ? /* @__PURE__ */ S(L, { id: "G4qrLy" }) : /* @__PURE__ */ S(L, { id: "wtw-au" })]
												}) }),
												r.setColumnLimit && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
													type: "button",
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
													onClick: () => void r.setColumnLimit?.(t.key),
													children: [/* @__PURE__ */ S(gf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Iw6WJa" })]
												}) }),
												r.setColumnColor && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ C("div", {
													className: "px-3 py-1",
													children: [/* @__PURE__ */ S("span", {
														className: "text-[11px] text-brand-gray",
														children: /* @__PURE__ */ S(L, { id: "jZlrte" })
													}), /* @__PURE__ */ C("div", {
														className: "mt-1 flex flex-wrap items-center gap-1.5",
														children: [rp.map((e) => /* @__PURE__ */ S("button", {
															type: "button",
															title: e,
															onClick: () => void r.setColumnColor?.(t.key, e),
															className: `h-4 w-4 rounded-full ring-1 ring-black/10 ${t.color === e ? "ring-2 ring-offset-1 ring-stone-500" : ""}`,
															style: { backgroundColor: e }
														}, e)), /* @__PURE__ */ S("button", {
															type: "button",
															title: B._({ id: "H_SQFv" }),
															onClick: () => void r.setColumnColor?.(t.key, null),
															className: `flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-black/10 ${t.color ? "" : "ring-2 ring-offset-1 ring-stone-500"}`,
															children: /* @__PURE__ */ S("span", { className: "h-2 w-2 rounded-full bg-stone-300" })
														})]
													})]
												})] }),
												r.deleteColumn && /* @__PURE__ */ C(x, { children: [/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }), /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
													type: "button",
													disabled: it.length <= 1,
													className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 disabled:opacity-40 data-[focus]:bg-red-50",
													onClick: () => void r.deleteColumn?.(t.key),
													children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
												}) })] })
											]
										})]
									})]
								}), /* @__PURE__ */ C("div", {
									className: "min-h-0 flex-1 space-y-2 overflow-y-auto p-2",
									children: [
										s.map((t, i) => {
											let a = t.due && t.due < rt && t.columnKey !== et, o = ut.get(t.id) ?? 0, s = dt.get(t.id), l = t.priority && t.priority !== "none" || t.assignee || t.due || (t.taskTotal ?? 0) > 0 || t.tags.length > 0 || o > 0 || (s?.length ?? 0) > 0;
											return /* @__PURE__ */ C(n, { children: [c(i) && /* @__PURE__ */ S("div", { className: "mx-1 h-0.5 rounded bg-brand" }), /* @__PURE__ */ C("div", {
												role: "button",
												tabIndex: 0,
												"data-card-id": t.id,
												"data-card-index": i,
												onPointerDown: (e) => At(e, t),
												onPointerMove: (e) => jt(e, t),
												onPointerUp: (e) => Mt(e, t),
												onKeyDown: (e) => {
													e.key === "Enter" && Et(t);
												},
												className: `group relative block w-full cursor-pointer touch-none select-none rounded-lg bg-white p-2.5 text-left shadow-sm transition hover:ring-brand/30 ${be === t.id ? "opacity-40" : ""} ${F.has(t.id) ? "ring-2 ring-brand/70" : ht?.id === t.id ? "ring-1 ring-brand/60" : "ring-1 ring-black/[0.04]"}`,
												children: [
													!k && /* @__PURE__ */ S("div", {
														className: "absolute right-1 top-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
														onClick: (e) => e.stopPropagation(),
														onMouseDown: (e) => e.stopPropagation(),
														onPointerDown: (e) => e.stopPropagation(),
														children: /* @__PURE__ */ C(Du, {
															as: "div",
															children: [/* @__PURE__ */ S(Su, {
																className: "rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600",
																children: /* @__PURE__ */ S(ff, { className: "h-4 w-4" })
															}), /* @__PURE__ */ C(Cu, {
																anchor: "bottom end",
																className: `z-30 w-44 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${bt}`,
																children: [
																	r.openCardFull && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => r.openCardFull?.(t),
																		children: [/* @__PURE__ */ S(zd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "Ik60OC" })]
																	}) }),
																	r.copyCardLink && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.copyCardLink?.(t),
																		children: [/* @__PURE__ */ S(bf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "y1eoq1" })]
																	}) }),
																	r.duplicateCard && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.duplicateCard?.(t),
																		children: [/* @__PURE__ */ S(uf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "euc6Ns" })]
																	}) }),
																	r.saveAsTemplate && /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
																		onClick: () => void r.saveAsTemplate?.(t),
																		children: [/* @__PURE__ */ S(Gd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "BnmEvM" })]
																	}) }),
																	/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }),
																	/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
																		type: "button",
																		className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 data-[focus]:bg-red-50",
																		onClick: () => void r.deleteCard(t),
																		children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
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
																title: B._({
																	id: "x52RAh",
																	values: { blockedCount: o }
																}),
																children: [/* @__PURE__ */ S(Sf, { className: "h-3 w-3" }), o]
															}),
															t.priority && t.priority !== "none" && /* @__PURE__ */ S("span", {
																className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${np[t.priority] ?? "bg-stone-100 text-stone-500"}`,
																children: t.priority
															}),
															(t.taskTotal ?? 0) > 0 && /* @__PURE__ */ C("span", {
																className: `inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.taskDone === t.taskTotal ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																children: [
																	/* @__PURE__ */ S(Yd, { className: "h-3 w-3" }),
																	t.taskDone,
																	"/",
																	t.taskTotal
																]
															}),
															s && s.length > 0 && (() => {
																let t = gp(s, e.doneColumn), n = 2 * Math.PI * 6;
																return /* @__PURE__ */ C("span", {
																	className: `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${t.done === t.total ? "bg-emerald-50 text-emerald-600" : "bg-stone-100 text-stone-500"}`,
																	title: B._({
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
																children: [/* @__PURE__ */ S(If, { className: "h-3 w-3" }), e.label]
															}, e.label)),
															t.assignee && /* @__PURE__ */ C("span", {
																className: "inline-flex items-center gap-0.5 text-[11px] text-brand-gray",
																children: [/* @__PURE__ */ S(Bf, { className: "h-3 w-3" }), t.assignee]
															}),
															t.due && /* @__PURE__ */ C("span", {
																className: `inline-flex items-center gap-0.5 text-[11px] ${a ? "font-medium text-red-600" : "text-brand-gray"}`,
																children: [/* @__PURE__ */ S(qd, { className: "h-3 w-3" }), t.due]
															})
														]
													})
												]
											})] }, t.id);
										}),
										s.length === 0 ? be && ee?.col === t.key && /* @__PURE__ */ S("div", { className: "mx-1 h-14 rounded-lg border-2 border-dashed border-brand/50 bg-brand-soft/30" }) : c(s.length) && /* @__PURE__ */ S("div", { className: "mx-1 h-0.5 rounded bg-brand" }),
										k ? null : ie === t.key ? /* @__PURE__ */ S("textarea", {
											autoFocus: !0,
											rows: 2,
											className: "w-full resize-none rounded-lg bg-white p-2 text-sm text-stone-800 shadow-sm ring-1 ring-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40",
											placeholder: B._({ id: "u2IprG" }),
											value: oe,
											onChange: (e) => se(e.target.value),
											onKeyDown: (e) => {
												if (e.key === "Enter" && !e.shiftKey) {
													e.preventDefault();
													let n = oe;
													se(""), ae(null), It(t.key, n);
												}
												e.key === "Escape" && (se(""), ae(null));
											},
											onBlur: () => {
												oe.trim() && It(t.key, oe), se(""), ae(null);
											}
										}) : a && a.length > 0 && o ? /* @__PURE__ */ C(Du, {
											as: "div",
											className: "relative",
											children: [/* @__PURE__ */ C(Su, {
												className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
												children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "pnrmSP" })]
											}), /* @__PURE__ */ C(Cu, {
												anchor: "bottom start",
												className: `z-30 w-52 rounded-lg border border-black/[0.06] bg-white py-1 text-sm shadow-lg [--anchor-gap:4px] focus:outline-none${bt}`,
												children: [
													/* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => {
															se(""), ae(t.key);
														},
														children: [/* @__PURE__ */ S(Ef, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "UQOvxZ" })]
													}) }),
													/* @__PURE__ */ S("div", { className: "my-1 border-t border-black/[0.05]" }),
													/* @__PURE__ */ S("div", {
														className: "px-3 py-0.5 text-[11px] uppercase tracking-wide text-stone-400",
														children: /* @__PURE__ */ S(L, { id: "iTylMl" })
													}),
													a.map((e) => /* @__PURE__ */ S($, { children: /* @__PURE__ */ C("button", {
														type: "button",
														className: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-stone-700 data-[focus]:bg-stone-100",
														onClick: () => void o(t.key, e.id),
														children: [/* @__PURE__ */ S(Gd, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S("span", {
															className: "truncate",
															children: e.name
														})]
													}) }, e.id))
												]
											})]
										}) : /* @__PURE__ */ C("button", {
											type: "button",
											className: "flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-stone-400 hover:bg-white hover:text-brand-dark",
											onClick: () => {
												se(""), ae(t.key);
											},
											children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "pnrmSP" })]
										})
									]
								})]
							}, t.key);
						}), Qe && !k && r.addColumn && (ce ? /* @__PURE__ */ S("input", {
							autoFocus: !0,
							className: "w-44 shrink-0 self-start rounded-xl border border-brand/40 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand/40",
							placeholder: B._({ id: "iYVqZq" }),
							value: ue,
							onChange: (e) => de(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									let e = ue.trim();
									de(""), le(!1), e && r.addColumn?.(e);
								}
								e.key === "Escape" && (de(""), le(!1));
							},
							onBlur: () => {
								let e = ue.trim();
								e && r.addColumn?.(e), de(""), le(!1);
							}
						}) : /* @__PURE__ */ C("button", {
							type: "button",
							className: "flex w-44 shrink-0 self-start items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-400 hover:border-brand/40 hover:text-brand-dark",
							onClick: () => {
								de(""), le(!0);
							},
							children: [/* @__PURE__ */ S(Of, { className: "h-4 w-4" }), /* @__PURE__ */ S(L, { id: "AgvHni" })]
						}))]
					})
				]
			}),
			F.size > 0 && !k && /* @__PURE__ */ C("div", {
				className: "absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-3 py-2 shadow-xl backdrop-blur",
				children: [
					/* @__PURE__ */ S("span", {
						className: "text-xs font-medium text-stone-600",
						children: /* @__PURE__ */ S(L, {
							id: "fvImQM",
							values: { 0: F.size }
						})
					}),
					/* @__PURE__ */ C("select", {
						className: yt,
						value: "",
						"aria-label": B._({ id: "8enUYo" }),
						onChange: (e) => {
							e.target.value && Nt({ columnKey: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ S("option", {
							value: "",
							disabled: !0,
							children: B._({ id: "BiWlsk" })
						}), e.columns.map((e) => /* @__PURE__ */ S("option", {
							value: e.key,
							children: e.name
						}, e.key))]
					}),
					/* @__PURE__ */ C("select", {
						className: yt,
						value: "",
						"aria-label": B._({ id: "hNmOZ7" }),
						onChange: (e) => {
							e.target.value && Nt({ priority: e.target.value }), e.target.value = "";
						},
						children: [/* @__PURE__ */ S("option", {
							value: "",
							disabled: !0,
							children: B._({ id: "B5TUF-" })
						}), ep.map((e) => /* @__PURE__ */ S("option", {
							value: e,
							children: e
						}, e))]
					}),
					r.deleteCards && /* @__PURE__ */ C("button", {
						type: "button",
						className: "inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50",
						onClick: () => {
							let e = t.filter((e) => F.has(e.id));
							I(/* @__PURE__ */ new Set()), r.deleteCards?.(e);
						},
						children: [/* @__PURE__ */ S(Rf, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ S(L, { id: "cnGeoo" })]
					}),
					/* @__PURE__ */ S("button", {
						type: "button",
						className: "rounded p-1 text-stone-400 hover:bg-stone-100",
						title: B._({ id: "FBIuPX" }),
						"aria-label": B._({ id: "FBIuPX" }),
						onClick: () => I(/* @__PURE__ */ new Set()),
						children: /* @__PURE__ */ S(Wf, { className: "h-4 w-4" })
					})
				]
			}),
			ht && j && /* @__PURE__ */ C("div", {
				className: "absolute right-0 top-0 z-30 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.07)]",
				style: { width: ve },
				children: [/* @__PURE__ */ S("div", {
					onMouseDown: (e) => {
						e.preventDefault();
						let t = e.clientX, n = ve, r = (e) => ye(Math.min(640, Math.max(300, n + (t - e.clientX)))), i = () => {
							window.removeEventListener("mousemove", r), window.removeEventListener("mouseup", i);
						};
						window.addEventListener("mousemove", r), window.addEventListener("mouseup", i);
					},
					title: B._({ id: "AVreQ5" }),
					className: "absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-col-resize transition-colors hover:bg-brand/40"
				}), /* @__PURE__ */ S(j, {
					card: ht,
					statusOptions: e.columns.map((e) => ({
						value: e.key,
						label: e.name
					})),
					swimlaneOptions: e.swimlaneBy === "custom" || (e.swimlanes?.length ?? 0) > 0 ? [
						{
							value: "",
							label: B._({ id: "EbMPZJ" })
						},
						...(e.swimlanes ?? []).map((e) => ({
							value: e.key,
							label: e.name,
							color: e.color
						})),
						...ht.swimlaneKey && !(e.swimlanes ?? []).some((e) => e.key === ht.swimlaneKey) ? [{
							value: ht.swimlaneKey,
							label: B._({ id: "7dZyQU" }),
							warning: !0
						}] : []
					] : void 0,
					swimlaneDisabled: Ie,
					assigneeOptions: s,
					tagOptions: c,
					fields: e.fields,
					onAddField: (t) => {
						let n = /* @__PURE__ */ new Set([...ip, ...(e.fields ?? []).map((e) => e.key)]), r = vp(t);
						if (n.has(r)) {
							let e = 2;
							for (; n.has(`${r}-${e}`);) e += 1;
							r = `${r}-${e}`;
						}
						xt({ fields: [...e.fields ?? [], {
							key: r,
							label: t
						}] });
					},
					dependencyCards: t.filter((e) => e.id !== ht.id).map((e) => ({
						slug: pp(e),
						title: e.title
					})),
					childCards: (dt.get(ht.id) ?? []).map((e) => ({
						id: e.id,
						title: e.title,
						icon: e.icon,
						statusName: mt(e.columnKey),
						done: e.columnKey === et
					})),
					onOpenCard: (e) => P(e),
					onAddChild: k ? void 0 : async (t) => {
						let n = Qe ? e.columns[0]?.key ?? ht.columnKey : ht.columnKey, i = await r.createCard(n, t);
						typeof i == "string" && await r.updateCard(i, { parent: pp(ht) });
					},
					loadNotes: l,
					onUploadAttachment: u,
					loadComments: d,
					addComment: p,
					updateComment: m,
					deleteComment: h,
					toggleReaction: _,
					resolveComment: b,
					currentUser: w,
					loadActivity: T,
					onChange: (e) => void r.updateCard(ht.id, e),
					onClose: () => P(null),
					onDelete: () => void r.deleteCard(ht),
					onOpenFull: r.openCardFull ? () => r.openCardFull?.(ht) : void 0
				})]
			}),
			/* @__PURE__ */ S(Zp, {
				open: Ee,
				lanes: e.swimlanes ?? [],
				cards: t,
				focusRequest: Ae,
				portalClassName: M,
				onClose: () => {
					De(!1), je(void 0);
				},
				onSaveLanes: St,
				onUpdateCards: _t,
				onShowAffected: Tt
			}),
			/* @__PURE__ */ S(qp, {
				open: Oe,
				config: e,
				actions: r,
				portalClassName: M,
				onClose: () => ke(!1)
			}),
			/* @__PURE__ */ S(Qp, {
				source: Pe,
				rows: gt,
				open: Me,
				busy: Ie,
				resume: e.swimlaneMigration?.source === Pe,
				progress: Re,
				error: Be,
				portalClassName: M,
				onClose: () => {
					Ie || Ne(!1);
				},
				onConfirm: vt
			}),
			be && we && (() => {
				let e = t.find((e) => e.id === be);
				return /* @__PURE__ */ C("div", {
					className: "pointer-events-none fixed z-[60] max-w-[260px] -translate-x-1/2 -translate-y-1/2 truncate rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-xl ring-1 ring-brand/40",
					style: {
						left: we.x,
						top: we.y
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
var em = class extends Error {
	status;
	code;
	constructor(e, t) {
		super(`jtype API error${e ? ` ${e}` : ""}: ${t}`), this.name = "JTypeApiError", this.status = e, this.code = t;
	}
};
function tm(e) {
	let t = (e.baseUrl ?? "").replace(/\/+$/, ""), n = e.token, r = e.fetchImpl ?? ((...e) => fetch(...e));
	if (!t) throw new em(0, "base_url_required");
	if (!n) throw new em(0, "token_required");
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
			throw new em(0, "network_error");
		}
		if (!a.ok) {
			let e = await a.json().catch(() => null);
			throw new em(a.status, e?.error || `http_${a.status}`);
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
var nm = class extends Error {
	code;
	candidates;
	constructor(e, t, n = []) {
		super(t ? `${e}: ${t}` : e), this.name = "JTypeBoardError", this.code = e, this.candidates = n;
	}
};
function rm(e, t) {
	let n = t.trim().replace(/^\.?\//, "");
	if (!n) throw new nm("board_not_found", "empty boardRef");
	let r = n.toLowerCase(), i = r.endsWith(".board") ? r : `${r}.board`, a = e.filter((e) => e.relativePath.toLowerCase().endsWith(".board")), o = a.find((e) => {
		let t = e.relativePath.toLowerCase();
		return t === r || t === i;
	});
	if (o) return im(o);
	let s = a.filter((e) => e.relativePath.toLowerCase().endsWith(`/${i}`));
	if (s.length === 1) return im(s[0]);
	throw s.length > 1 ? new nm("board_ref_ambiguous", `"${t}" matches ${s.length} boards`, s.map((e) => e.relativePath)) : new nm("board_not_found", `no .board document matches "${t}"`);
}
function im(e) {
	return {
		boardDocId: e.id,
		boardRelativePath: e.relativePath,
		boardDir: e.relativePath.replace(/\.board$/i, "")
	};
}
//#endregion
//#region src/boardData.ts
function am(e, t) {
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
		swimlaneBy: xp(e.swimlaneBy),
		swimlanes: e.swimlanes,
		swimlaneMigration: e.swimlaneMigration,
		groupBy: bp(e.groupBy)
	};
}
function om(e, t) {
	let n = Gf(e.content);
	if (n.data.board !== t.id) return null;
	let r = ap(n.body);
	return {
		id: e.relativePath,
		columnKey: n.data.status || "",
		position: Number(n.data.position ?? 0),
		title: n.data.title || e.title || e.relativePath,
		icon: n.data.icon || null,
		priority: n.data.priority || null,
		assignee: n.data.assignee || null,
		swimlaneKey: n.data.swimlane || null,
		due: n.data.due || null,
		tags: up(n.data.tags ? sp(n.data.tags) : [], t.labels),
		notes: n.body,
		taskDone: r.done,
		taskTotal: r.total,
		excerpt: op(n.body),
		attachments: n.data.attachments ? qf(n.data.attachments) : [],
		custom: $f(n.data, t.fields),
		blockedBy: n.data.blocked_by ? dp(n.data.blocked_by) : [],
		blocks: n.data.blocks ? dp(n.data.blocks) : [],
		relates: n.data.relates ? dp(n.data.relates) : [],
		parent: n.data.parent ? dp(n.data.parent)[0] ?? null : null
	};
}
function sm(e, t) {
	return Xf(e, t);
}
var cm = [
	"viewType",
	"groupBy",
	"swimlaneBy",
	"calendarMode"
];
function lm(e, t) {
	let n = { ...e };
	for (let e of cm) e in t && (n[e] = t[e]);
	return n;
}
async function um(e, t, n, r) {
	let i = await e.listDocuments(t), a = rm(i, n), o = async (n, i) => {
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
		throw new nm("board_config_invalid", `${a.boardRelativePath}: ${String(e)}`);
	}
	let u = i.filter((e) => e.relativePath.startsWith(`${a.boardDir}/`) && e.relativePath.toLowerCase().endsWith(".md")), d = await Promise.all(u.map(async (e) => ({
		item: e,
		doc: await o(e.id, e.contentHash)
	}))), f = /* @__PURE__ */ new Map(), p = [];
	for (let { item: e, doc: t } of d) {
		let n = om(t, l);
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
function dm({ card: e, config: t, strings: n, onClose: r }) {
	f(() => {
		let e = (e) => {
			e.key === "Escape" && r();
		};
		return window.addEventListener("keydown", e), () => window.removeEventListener("keydown", e);
	}, [r]);
	let i = t.columns.find((t) => t.key === e.columnKey)?.name || e.columnKey, a = e.swimlaneKey ? t.swimlanes?.find((t) => t.key === e.swimlaneKey)?.name ?? n.unassigned : n.unassigned, o = [
		[n.status, i],
		...t.swimlaneBy === "custom" || (t.swimlanes?.length ?? 0) > 0 ? [[n.swimlane, a]] : [],
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
				onClick: r,
				title: n.close,
				"aria-label": n.close,
				className: "rounded p-1 text-stone-400 hover:bg-stone-100",
				children: /* @__PURE__ */ S("svg", {
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.5",
					className: "h-4 w-4",
					"aria-hidden": !0,
					children: /* @__PURE__ */ S("path", {
						strokeLinecap: "round",
						strokeLinejoin: "round",
						d: "M6 18 18 6M6 6l12 12"
					})
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
					children: [o.map(([e, t]) => /* @__PURE__ */ C("div", {
						className: "contents",
						children: [/* @__PURE__ */ S("dt", {
							className: "truncate text-xs text-brand-gray",
							title: e,
							children: e
						}), /* @__PURE__ */ S("dd", {
							className: "text-sm text-stone-800",
							children: e === n.priority ? /* @__PURE__ */ S("span", {
								className: `rounded px-1.5 py-0.5 text-[11px] font-medium ${np[t] ?? "bg-stone-100 text-stone-500"}`,
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
							children: Qf(e) ? /* @__PURE__ */ S("a", {
								href: e,
								target: "_blank",
								rel: "noreferrer",
								className: "block truncate text-brand-dark hover:underline",
								title: e,
								children: Zf(e)
							}) : /* @__PURE__ */ C("span", {
								className: "block truncate text-stone-500",
								title: e,
								children: [
									Zf(e),
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
				})
			]
		})]
	});
}
//#endregion
//#region src/i18n.ts
var fm = {
	en: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"Notes\"],\"1YABGm\":[\"Link (Ctrl+K)\"],\"1hKEom\":[\"Priority\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2wxgft\":[\"Rename\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3Ib6FN\":[\"Move down\"],\"3qkggm\":[\"Fullscreen\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4gdyen\":[\"Local (yours)\"],\"4hJhzz\":[\"Table\"],\"54sFiP\":[\"flowchart TD\\n  A[Start] --> B[End]\"],\"5Q_DQ6\":[\"Inline Code\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"Swimlane name\"],\"7VpPHA\":[\"Confirm\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid diagram\"],\"8Tg_JR\":[\"Custom\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"Result (editable)\"],\"8lE269\":[\"Sort: Manual\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9gxam6\":[\"Could not render this Draw.io diagram.\"],\"AC9Gkf\":[\"Expand column\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"Could not render this PDF.\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"Drag to resize\"],\"AgvHni\":[\"Add column\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"Group: Assignee\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"Accept cloud\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"Save as template\"],\"C6-ZRl\":[\"Someone\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"Code\"],\"EbMPZJ\":[\"Unassigned\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"Unset done column\"],\"GKu3m4\":[\"No labels\"],\"Gpfctt\":[\"Due\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"H_SQFv\":[\"No color\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"Split\"],\"ICip_B\":[\"Cloud (remote)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"Open in editor\"],\"ImOQa9\":[\"Reply\"],\"Iw6WJa\":[\"Set WIP limit\"],\"JTYvAw\":[\"Search cards\"],\"KAlhe_\":[\"Conversion stopped because card updates did not persist. Refresh and try again.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"K_F6pa\":[\"Saving…\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"Bold\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KvW1VO\":[\"Draw.io diagram\"],\"LQn6-8\":[\"Accept local\"],\"MHrjPM\":[\"Title\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"Tags\"],\"OepdfE\":[\"Group: Status\"],\"P5cvAA\":[\"Status name\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"Clear filter\"],\"QD8opX\":[\"Board\"],\"QlsPZy\":[\"Write Mermaid syntax to see the diagram.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"S5Qbb1\":[\"comma, separated\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[\"Lane details for \",[\"0\"]],\"U0hizX\":[\"Swimlane color\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"Blank card\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"VNa_N2\":[\"This file type can not be previewed yet.\"],\"VbyRUy\":[\"Comments\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"Sort: Priority\"],\"X03-eC\":[\"Please enter a value.\"],\"XJOV1Y\":[\"Activity\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YHjvGb\":[\"Status actions\"],\"Ya7bZl\":[\"Diagram error\"],\"Zot9XS\":[\"No cards\"],\"_5CsXX\":[\"Done column\"],\"_EsjyQ\":[\"Use this\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"a6uhHr\":[\"Bold (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"Add details...\"],\"agOeRN\":[\"Could not render this API specification.\"],\"b4hVKD\":[\"Color columns\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cUt8yN\":[\"Changes save automatically.\"],\"cfaWH-\":[\"Add labels\"],\"cnGeoo\":[\"Delete\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP limit \",[\"0\"]],\"dEgA5A\":[\"Cancel\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"Duplicate\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"Sort: Due\"],\"fvImQM\":[[\"0\"],\" selected\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"Untitled card\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF document\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"Write\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"Templates\"],\"iYVqZq\":[\"Column name\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"Color\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kZlRKE\":[\"Mermaid source\"],\"kryGs-\":[\"Card\"],\"lCF0wC\":[\"Refresh\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_g7se\":[\"Resume conversion\"],\"ltF1xa\":[\"Save merged result\"],\"m16xKo\":[\"Add\"],\"nabda1\":[\"Delete card\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"Filter\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"Assignee\"],\"p9yTeb\":[\"Sort: Title\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"Open in full editor\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pnrmSP\":[\"New card\"],\"pwN6Ae\":[\"Collapse column\"],\"pzutoc\":[\"Italic\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rRubBJ\":[\"Lane details\"],\"rdUucN\":[\"Preview\"],\"rvpMpc\":[\"Manage statuses\"],\"sCzmvQ\":[\"cards\"],\"sQpDn6\":[\"Exit fullscreen\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" Conflict\",[\"1\"],\" to Resolve\"],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"Card title (Enter to add, Esc to cancel)\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"Status\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" card\"],\"other\":[\"#\",\" cards\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"Copy failed.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"Italic (Ctrl+I)\"],\"wtw-au\":[\"Set as done column\"],\"wwu18a\":[\"Icon\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"Used by\"],\"y1eoq1\":[\"Copy link\"],\"y9cj46\":[\"Group: Priority\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← Back to list\"],\"yz7wBu\":[\"Close\"],\"yzF66j\":[\"Link\"],\"zOc0vf\":[\"No icon\"],\"zga9sT\":[\"OK\"]}"),
	zh: JSON.parse("{\"--lIxB\":[\"被阻塞于\"],\"-b7T3G\":[\"更新\"],\"1718Q-\":[\"问题\"],\"1DBGsz\":[\"备注\"],\"1YABGm\":[\"链接 (Ctrl+K)\"],\"1hKEom\":[\"优先级\"],\"1lWHP7\":[\"不安全\"],\"1nUGn5\":[\"添加状态\"],\"1xwZj_\":[\"上个月\"],\"23yqV0\":[\"显示受影响的卡片\"],\"2BPVq8\":[\"重新排序 \",[\"0\"]],\"2wxgft\":[\"重命名\"],\"3CtQL6\":[\"选择另一个泳道，然后先更新卡片。\"],\"3Ib6FN\":[\"下移\"],\"3qkggm\":[\"全屏\"],\"4NY8B5\":[\"将创建的泳道\"],\"4gdyen\":[\"本地（我的）\"],\"4hJhzz\":[\"表格\"],\"54sFiP\":[\"flowchart TD\\n  A[开始] --> B[结束]\"],\"5Q_DQ6\":[\"行内代码\"],\"66g_UW\":[\"折叠已解决话题\"],\"6V3Ea3\":[\"已复制\"],\"6YtxFj\":[\"名称\"],\"6buwPb\":[\"看板设置\"],\"79Yvzu\":[\"泳道名称\"],\"7VpPHA\":[\"确认\"],\"7dZyQU\":[\"原泳道已不存在\"],\"7s3WlU\":[\"阻塞\"],\"8PifYj\":[\"Mermaid 图表\"],\"8Tg_JR\":[\"自定义\"],\"8enUYo\":[\"设置状态\"],\"8hSn0h\":[\"结果（可编辑）\"],\"8lE269\":[\"排序:手动\"],\"9OEgyT\":[\"添加回应\"],\"9OH3W0\":[\"解决话题\"],\"9gxam6\":[\"无法渲染此 Draw.io 图表。\"],\"AC9Gkf\":[\"展开列\"],\"ANe5kn\":[\"正在更新卡片…\"],\"AS5WO9\":[\"无法渲染此 PDF。\"],\"ATIq3Z\":[\"泳道：自定义\"],\"AVreQ5\":[\"拖动调整宽度\"],\"AgvHni\":[\"添加列\"],\"AjVXBS\":[\"日历\"],\"AoHpbt\":[\"显示泳道缺失的卡片\"],\"AxAubu\":[\"分组:负责人\"],\"B5TUF-\":[\"优先级…\"],\"BfMZ7w\":[\"接受云端\"],\"BiWlsk\":[\"状态…\"],\"BnmEvM\":[\"存为模板\"],\"C6-ZRl\":[\"某人\"],\"CXTDT_\":[\"继续泳道转换？\"],\"CxcMyt\":[\"已将 \",[\"0\"],\" 移到第 \",[\"1\"],\" 位，共 \",[\"2\"],\" 项。\"],\"DGEEOQ\":[\"泳道操作\"],\"DPfwMq\":[\"完成\"],\"Db4W3_\":[\"状态\"],\"EWPtMO\":[\"代码\"],\"EbMPZJ\":[\"未分配\"],\"FBIuPX\":[\"清除选择\"],\"FQylcT\":[\"泳道：缺失\"],\"G4qrLy\":[\"取消完成列\"],\"GKu3m4\":[\"暂无标签\"],\"Gpfctt\":[\"截止日期\"],\"HTKRVa\":[\"请勿关闭此对话框。\"],\"H_SQFv\":[\"无颜色\"],\"HajiZl\":[\"月\"],\"HrmW6B\":[\"添加评论…（支持 Markdown）\"],\"I6SWEy\":[\"分栏\"],\"ICip_B\":[\"云端（远程）\"],\"IdMoS6\":[\"创建第一条泳道\"],\"Ik60OC\":[\"在编辑器中打开\"],\"ImOQa9\":[\"回复\"],\"Iw6WJa\":[\"设置 WIP 限制\"],\"JTYvAw\":[\"搜索卡片\"],\"KAlhe_\":[\"卡片更新未能持久化，转换已停止。请刷新后重试。\"],\"KCszT6\":[\"添加泳道\"],\"KFiYGY\":[\"更改颜色\"],\"KGi3u9\":[\"拖动以重新排序\"],\"K_F6pa\":[\"保存中…\"],\"Kd6eg7\":[\"正在移动卡片…\"],\"KeYrQ5\":[\"撤回你的回应\"],\"KjXDqG\":[\"泳道：无\"],\"KmydK6\":[\"粗体\"],\"KpnwJK\":[\"删除“\",[\"0\"],\"”？\"],\"KvW1VO\":[\"Draw.io 图表\"],\"LQn6-8\":[\"接受本地\"],\"MHrjPM\":[\"标题\"],\"MYx830\":[\"此空泳道将从看板中移除。\"],\"Mm72la\":[\"暂无评论\"],\"MmYpxT\":[\"回复…\"],\"NBdIgR\":[\"评论\"],\"NYTPDY\":[\"移动卡片并删除\"],\"O6H89R\":[\"已解决\"],\"ONWvwQ\":[\"上传\"],\"OR4WQZ\":[\"+ 添加子卡片\"],\"OYHzN1\":[\"标签\"],\"OepdfE\":[\"分组:状态\"],\"P5cvAA\":[\"状态名称\"],\"PUeYA1\":[\"创建可编辑泳道\"],\"Pvpx7b\":[\"粘贴 URL 或路径\"],\"Q2mGA7\":[\"清除筛选\"],\"QD8opX\":[\"看板\"],\"QlsPZy\":[\"输入 Mermaid 语法以查看图表。\"],\"QmZYQP\":[\"取消解决\"],\"QyioBP\":[\"上移\"],\"RbsNko\":[\"当前有 \",[\"cardCount\"],\" 张卡片使用此泳道。\"],\"RfEZH1\":[\"JType 将根据当前负责人行创建独立泳道。卡片的负责人值不会改变。\"],\"RgO4DX\":[\"泳道 ID“\",[\"0\"],\"”重复。将使用第一条定义。\"],\"RlLl3G\":[[\"0\"],\" 的操作\"],\"S5Qbb1\":[\"用逗号分隔\"],\"SavliD\":[\"有 \",[\"danglingCount\"],\" 张卡片引用了已删除的泳道。\"],\"T_nAzC\":[\"JType 将复用现有泳道 ID，并继续未完成的卡片更新。\"],\"TdfEV7\":[\"归档\"],\"Th4mIx\":[[\"0\"],\" 的泳道详情\"],\"U0hizX\":[\"泳道颜色\"],\"UDb2YD\":[\"回应\"],\"UQOvxZ\":[\"空白卡片\"],\"URmyfc\":[\"详情\"],\"Ubl2by\":[\"右移\"],\"VNa_N2\":[\"暂不支持预览此文件类型。\"],\"VbyRUy\":[\"评论\"],\"WEYdDv\":[\"推荐\"],\"WSP6v1\":[\"排序:优先级\"],\"X03-eC\":[\"请输入内容。\"],\"XJOV1Y\":[\"活动\"],\"XklovM\":[\"正在处理…\"],\"Y8bR2a\":[\"仅删除泳道。卡片引用仍可恢复。\"],\"YHjvGb\":[\"状态操作\"],\"Ya7bZl\":[\"图表错误\"],\"Zot9XS\":[\"暂无卡片\"],\"_5CsXX\":[\"完成列\"],\"_EsjyQ\":[\"使用此版本\"],\"_TJomP\":[\"删除前移动卡片\"],\"_YbTQZ\":[\"JType 将根据当前优先级行创建独立泳道。卡片的优先级值不会改变。\"],\"a6uhHr\":[\"粗体 (Ctrl+B)\"],\"aDvLhk\":[\"添加评论…\"],\"abUZlY\":[\"添加详情...\"],\"agOeRN\":[\"无法渲染此 API 规范。\"],\"b4hVKD\":[\"彩色列\"],\"bwOqWD\":[[\"1\"],\" 张子卡中已完成 \",[\"0\"],\" 张\"],\"by_svU\":[\"将卡片保留在未分配\"],\"bzjBcL\":[\"子卡片\"],\"c61_Lv\":[\"泳道 ID\"],\"cJ44lA\":[\"未排期\"],\"cUt8yN\":[\"更改会自动保存。\"],\"cfaWH-\":[\"添加标签\"],\"cnGeoo\":[\"删除\"],\"d-F6q9\":[\"创建\"],\"d5z6xQ\":[\"WIP 限制 \",[\"0\"]],\"dEgA5A\":[\"取消\"],\"ecUA8p\":[\"今天\"],\"euc6Ns\":[\"复制卡片\"],\"fEqHZq\":[\"打开子卡片\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"fVlS4-\":[\"泳道\"],\"fYcKtB\":[\"排序:截止\"],\"fvImQM\":[\"已选择 \",[\"0\"],\" 项\"],\"g8JmSC\":[\"下个月\"],\"gANddk\":[\"上传中…\"],\"gLDJuJ\":[\"未命名卡片\"],\"gzZWjO\":[\"没有可转换的已分配值。\"],\"hNmOZ7\":[\"设置优先级\"],\"he3ygx\":[\"复制\"],\"hh4sEG\":[\"相关\"],\"hnK1gR\":[\"PDF 文档\"],\"hyVzII\":[\"泳道\"],\"i4_LY_\":[\"写作\"],\"iSLA_r\":[\"左移\"],\"iTylMl\":[\"模板\"],\"iYVqZq\":[\"列名称\"],\"jUbC3Z\":[\"泳道：优先级\"],\"jZlrte\":[\"颜色\"],\"jzy1b8\":[\"将泳道转为可编辑\"],\"k4b5_X\":[\"已编辑\"],\"kZlRKE\":[\"Mermaid 源码\"],\"kryGs-\":[\"卡片\"],\"lCF0wC\":[\"刷新\"],\"lEQWoB\":[\"添加稳定的横向分组，即使没有卡片也会保持显示。\"],\"lHxVTh\":[\"泳道：负责人\"],\"lUeOk0\":[\"此看板的横向分组。名称可以更改，卡片映射会保持关联。\"],\"l_g7se\":[\"继续转换\"],\"ltF1xa\":[\"保存合并结果\"],\"m16xKo\":[\"添加\"],\"nabda1\":[\"删除卡片\"],\"nfhh60\":[\"将优先级泳道转为可编辑？\"],\"njJFtc\":[\"删除评论\"],\"o7J4JM\":[\"筛选\"],\"o8va6N\":[\"恢复\"],\"ojKCLU\":[\"负责人\"],\"p9yTeb\":[\"排序:标题\"],\"pKKcSl\":[\"显示已解决话题\"],\"pKztsX\":[\"在完整编辑器中打开\"],\"pdVZUg\":[\"在制品 \",[\"0\"]],\"pnrmSP\":[\"新建卡片\"],\"pwN6Ae\":[\"折叠列\"],\"pzutoc\":[\"斜体\"],\"qpGDiV\":[\"复制泳道 ID\"],\"rF8SEQ\":[\"编辑评论\"],\"rRubBJ\":[\"泳道详情\"],\"rdUucN\":[\"预览\"],\"rvpMpc\":[\"管理状态\"],\"sCzmvQ\":[\"张卡片\"],\"sQpDn6\":[\"退出全屏\"],\"sujToP\":[\"父卡片\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 个冲突\",[\"1\"],\"待解决\"],\"tYS8HY\":[\"无论作为列还是泳道使用，状态列都可以继续管理。\"],\"t_YqKh\":[\"移除\"],\"tfDRzk\":[\"保存\"],\"u2IprG\":[\"卡片标题(回车添加,Esc 取消)\"],\"uAP6ov\":[\"删除泳道\"],\"uAQUqI\":[\"状态\"],\"uH1U8v\":[\"管理泳道\"],\"uWPalN\":[\"泳道名称“\",[\"0\"],\"”重复。名称应保持唯一。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 张卡片\"],\"other\":[\"#\",\" 张卡片\"]}]],\"ucJg3u\":[\"泳道：状态\"],\"vIKvqQ\":[\"有 \",[\"missingCount\"],\" 张卡片引用了已删除的泳道。\"],\"vMTOsC\":[\"将负责人泳道转为可编辑？\"],\"vfYjJ_\":[\"复制失败。\"],\"w7E-FA\":[\"已拦截不安全链接：\",[\"url\"]],\"w_Sphq\":[\"附件\"],\"wf6Djn\":[\"斜体 (Ctrl+I)\"],\"wtw-au\":[\"设为完成列\"],\"wwu18a\":[\"图标\"],\"x52RAh\":[\"被 \",[\"blockedCount\"],\" 张未完成卡片阻塞\"],\"xDsmP9\":[\"日程\"],\"xUOPoQ\":[\"使用情况\"],\"y1eoq1\":[\"复制链接\"],\"y9cj46\":[\"分组:优先级\"],\"yEbJGs\":[\"+ 添加字段\"],\"ybGQtY\":[\"← 返回列表\"],\"yz7wBu\":[\"关闭\"],\"yzF66j\":[\"链接\"],\"zOc0vf\":[\"无图标\"],\"zga9sT\":[\"确定\"]}"),
	ja: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1718Q-\":[\"問題\"],\"1DBGsz\":[\"ノート\"],\"1YABGm\":[\"リンク (Ctrl+K)\"],\"1hKEom\":[\"優先度\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"ステータスを追加\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"影響を受けるカードを表示\"],\"2BPVq8\":[[\"0\"],\"を並べ替え\"],\"2wxgft\":[\"名前を変更\"],\"3CtQL6\":[\"別のスイムレーンを選び、先にカードを更新します。\"],\"3Ib6FN\":[\"下へ移動\"],\"3qkggm\":[\"全画面表示\"],\"4NY8B5\":[\"作成するスイムレーン\"],\"4gdyen\":[\"ローカル（自分の）\"],\"4hJhzz\":[\"表\"],\"54sFiP\":[\"flowchart TD\\n  A[開始] --> B[終了]\"],\"5Q_DQ6\":[\"インラインコード\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6V3Ea3\":[\"コピーしました\"],\"6YtxFj\":[\"名前\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"スイムレーン名\"],\"7VpPHA\":[\"確認\"],\"7dZyQU\":[\"以前のスイムレーンが見つかりません\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 図\"],\"8Tg_JR\":[\"カスタム\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"結果（編集可能）\"],\"8lE269\":[\"並べ替え：手動\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9gxam6\":[\"この Draw.io 図をレンダリングできませんでした。\"],\"AC9Gkf\":[\"列を展開\"],\"ANe5kn\":[\"カードを更新中…\"],\"AS5WO9\":[\"この PDF をレンダリングできませんでした。\"],\"ATIq3Z\":[\"スイムレーン：カスタム\"],\"AVreQ5\":[\"ドラッグしてサイズ変更\"],\"AgvHni\":[\"列を追加\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"スイムレーンが見つからないカードを表示\"],\"AxAubu\":[\"グループ：担当者\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"クラウドを採用\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"テンプレートとして保存\"],\"C6-ZRl\":[\"Someone\"],\"CXTDT_\":[\"スイムレーンの変換を再開しますか？\"],\"CxcMyt\":[[\"0\"],\"を\",[\"2\"],\"件中\",[\"1\"],\"番目に移動しました。\"],\"DGEEOQ\":[\"スイムレーンの操作\"],\"DPfwMq\":[\"完了\"],\"Db4W3_\":[\"ステータス\"],\"EWPtMO\":[\"コード\"],\"EbMPZJ\":[\"未割り当て\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"スイムレーン：不明\"],\"G4qrLy\":[\"完了列を解除\"],\"GKu3m4\":[\"ラベルなし\"],\"Gpfctt\":[\"期限\"],\"HTKRVa\":[\"このダイアログを閉じないでください。\"],\"H_SQFv\":[\"色なし\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"分割\"],\"ICip_B\":[\"クラウド（リモート）\"],\"IdMoS6\":[\"最初のスイムレーンを作成\"],\"Ik60OC\":[\"エディターで開く\"],\"ImOQa9\":[\"Reply\"],\"Iw6WJa\":[\"WIP 制限を設定\"],\"JTYvAw\":[\"カードを検索\"],\"KAlhe_\":[\"カードの更新が保存されなかったため、変換を停止しました。更新して再試行してください。\"],\"KCszT6\":[\"スイムレーンを追加\"],\"KFiYGY\":[\"色を変更\"],\"KGi3u9\":[\"ドラッグして並べ替え\"],\"K_F6pa\":[\"保存中…\"],\"Kd6eg7\":[\"カードを移動中…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"太字\"],\"KpnwJK\":[\"「\",[\"0\"],\"」を削除しますか？\"],\"KvW1VO\":[\"Draw.io 図\"],\"LQn6-8\":[\"ローカルを採用\"],\"MHrjPM\":[\"タイトル\"],\"MYx830\":[\"この空のスイムレーンをボードから削除します。\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"カードを移動して削除\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"タグ\"],\"OepdfE\":[\"グループ：ステータス\"],\"P5cvAA\":[\"ステータス名\"],\"PUeYA1\":[\"編集可能なスイムレーンを作成\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"フィルターをクリア\"],\"QD8opX\":[\"ボード\"],\"QlsPZy\":[\"Mermaid 構文を書くと図が表示されます。\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"上へ移動\"],\"RbsNko\":[\"現在\",[\"cardCount\"],\"枚のカードがこのスイムレーンを使用しています。\"],\"RfEZH1\":[\"JType は現在の担当者行から独立したスイムレーンを作成します。カードの担当者は変更されません。\"],\"RgO4DX\":[\"スイムレーン ID「\",[\"0\"],\"」が重複しています。最初の定義を使用します。\"],\"RlLl3G\":[[\"0\"],\"の操作\"],\"S5Qbb1\":[\"カンマ区切り\"],\"SavliD\":[[\"danglingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"T_nAzC\":[\"JType は既存のスイムレーン ID を再利用し、未完了のカード更新を続行します。\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" のレーン詳細\"],\"U0hizX\":[\"スイムレーンの色\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"空のカード\"],\"URmyfc\":[\"詳細\"],\"Ubl2by\":[\"右へ移動\"],\"VNa_N2\":[\"このファイル形式はまだプレビューできません。\"],\"VbyRUy\":[\"Comments\"],\"WEYdDv\":[\"推奨\"],\"WSP6v1\":[\"並べ替え：優先度\"],\"X03-eC\":[\"値を入力してください。\"],\"XJOV1Y\":[\"Activity\"],\"XklovM\":[\"処理中…\"],\"Y8bR2a\":[\"スイムレーンだけを削除します。カードの参照は復元できます。\"],\"YHjvGb\":[\"ステータスの操作\"],\"Ya7bZl\":[\"図のエラー\"],\"Zot9XS\":[\"カードなし\"],\"_5CsXX\":[\"完了列\"],\"_EsjyQ\":[\"これを使用\"],\"_TJomP\":[\"削除前にカードを移動\"],\"_YbTQZ\":[\"JType は現在の優先度行から独立したスイムレーンを作成します。カードの優先度は変更されません。\"],\"a6uhHr\":[\"太字 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"詳細を追加...\"],\"agOeRN\":[\"この API 仕様をレンダリングできませんでした。\"],\"b4hVKD\":[\"色付き列\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"カードを未割り当てに残す\"],\"bzjBcL\":[\"Sub-cards\"],\"c61_Lv\":[\"スイムレーン ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cUt8yN\":[\"変更は自動的に保存されます。\"],\"cfaWH-\":[\"ラベルを追加\"],\"cnGeoo\":[\"削除\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 制限 \",[\"0\"]],\"dEgA5A\":[\"キャンセル\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"複製\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"fVlS4-\":[\"スイムレーン\"],\"fYcKtB\":[\"並べ替え：期限\"],\"fvImQM\":[[\"0\"],\" selected\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"無題のカード\"],\"gzZWjO\":[\"変換できる割り当て済みの値がありません。\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"コピー\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF ドキュメント\"],\"hyVzII\":[\"スイムレーン\"],\"i4_LY_\":[\"記述\"],\"iSLA_r\":[\"左へ移動\"],\"iTylMl\":[\"テンプレート\"],\"iYVqZq\":[\"列名\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"カラー\"],\"jzy1b8\":[\"スイムレーンを編集可能にする\"],\"k4b5_X\":[\"edited\"],\"kZlRKE\":[\"Mermaid ソース\"],\"kryGs-\":[\"カード\"],\"lCF0wC\":[\"更新\"],\"lEQWoB\":[\"カードがなくても表示され続ける横方向のグループを追加します。\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"このボードの横方向グループです。名前を変更しても、カードの関連付けは維持されます。\"],\"l_g7se\":[\"変換を再開\"],\"ltF1xa\":[\"マージ結果を保存\"],\"m16xKo\":[\"追加\"],\"nabda1\":[\"カードを削除\"],\"nfhh60\":[\"優先度スイムレーンを編集可能にしますか？\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"フィルター\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"担当者\"],\"p9yTeb\":[\"並べ替え：タイトル\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"フルエディターで開く\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pnrmSP\":[\"新規カード\"],\"pwN6Ae\":[\"列を折りたたむ\"],\"pzutoc\":[\"イタリック\"],\"qpGDiV\":[\"スイムレーン ID をコピー\"],\"rF8SEQ\":[\"Edit comment\"],\"rRubBJ\":[\"スイムレーンの詳細\"],\"rdUucN\":[\"プレビュー\"],\"rvpMpc\":[\"ステータスを管理\"],\"sCzmvQ\":[\"枚のカード\"],\"sQpDn6\":[\"全画面表示を終了\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"tK2x9T\":[\"⚠ \",[\"0\"],\" 件の競合\",[\"1\"],\"を解決中\"],\"tYS8HY\":[\"ステータス列は、列またはスイムレーンとして使用中でも管理できます。\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"カードのタイトル（Enter で追加、Esc でキャンセル）\"],\"uAP6ov\":[\"スイムレーンを削除\"],\"uAQUqI\":[\"ステータス\"],\"uH1U8v\":[\"スイムレーンを管理\"],\"uWPalN\":[\"スイムレーン名「\",[\"0\"],\"」が重複しています。名前は一意にしてください。\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"#\",\" 件のカード\"],\"other\":[\"#\",\" 件のカード\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\"枚のカードが削除済みのスイムレーンを参照しています。\"],\"vMTOsC\":[\"担当者スイムレーンを編集可能にしますか？\"],\"vfYjJ_\":[\"コピーに失敗しました。\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"イタリック (Ctrl+I)\"],\"wtw-au\":[\"完了列に設定\"],\"wwu18a\":[\"アイコン\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"使用状況\"],\"y1eoq1\":[\"リンクをコピー\"],\"y9cj46\":[\"グループ：優先度\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← リストに戻る\"],\"yz7wBu\":[\"閉じる\"],\"yzF66j\":[\"リンク\"],\"zOc0vf\":[\"アイコンなし\"],\"zga9sT\":[\"OK\"]}"),
	ko: JSON.parse("{\"--lIxB\":[\"Blocked by\"],\"-b7T3G\":[\"Updated\"],\"1718Q-\":[\"Issues\"],\"1DBGsz\":[\"노트\"],\"1YABGm\":[\"링크 (Ctrl+K)\"],\"1hKEom\":[\"우선순위\"],\"1lWHP7\":[\"unsafe\"],\"1nUGn5\":[\"Add status\"],\"1xwZj_\":[\"Previous month\"],\"23yqV0\":[\"Show affected cards\"],\"2BPVq8\":[\"Reorder \",[\"0\"]],\"2wxgft\":[\"이름 변경\"],\"3CtQL6\":[\"Choose another swimlane, then update the cards first.\"],\"3Ib6FN\":[\"Move down\"],\"3qkggm\":[\"전체 화면\"],\"4NY8B5\":[\"Swimlanes to create\"],\"4gdyen\":[\"로컈 (내 것)\"],\"4hJhzz\":[\"테이블\"],\"54sFiP\":[\"flowchart TD\\n  A[시작] --> B[끝]\"],\"5Q_DQ6\":[\"인라인 코드\"],\"66g_UW\":[\"Collapse resolved thread\"],\"6V3Ea3\":[\"Copied\"],\"6YtxFj\":[\"Name\"],\"6buwPb\":[\"Board settings\"],\"79Yvzu\":[\"Swimlane name\"],\"7VpPHA\":[\"확인\"],\"7dZyQU\":[\"Previous swimlane missing\"],\"7s3WlU\":[\"Blocks\"],\"8PifYj\":[\"Mermaid 다이어그램\"],\"8Tg_JR\":[\"Custom\"],\"8enUYo\":[\"Set status\"],\"8hSn0h\":[\"결과 (편집 가능)\"],\"8lE269\":[\"정렬: 수동\"],\"9OEgyT\":[\"Add reaction\"],\"9OH3W0\":[\"Resolve thread\"],\"9gxam6\":[\"이 Draw.io 다이어그램을 렌더링할 수 없습니다.\"],\"AC9Gkf\":[\"열 펼치기\"],\"ANe5kn\":[\"Updating cards…\"],\"AS5WO9\":[\"이 PDF를 렌더링할 수 없습니다.\"],\"ATIq3Z\":[\"Swimlane: Custom\"],\"AVreQ5\":[\"드래그하여 크기 조정\"],\"AgvHni\":[\"열 추가\"],\"AjVXBS\":[\"Calendar\"],\"AoHpbt\":[\"Show cards with missing swimlanes\"],\"AxAubu\":[\"그룹: 담당자\"],\"B5TUF-\":[\"Priority…\"],\"BfMZ7w\":[\"클라우드 수낙\"],\"BiWlsk\":[\"Status…\"],\"BnmEvM\":[\"템플릿으로 저장\"],\"C6-ZRl\":[\"Someone\"],\"CXTDT_\":[\"Resume swimlane conversion?\"],\"CxcMyt\":[[\"0\"],\" moved to position \",[\"1\"],\" of \",[\"2\"],\".\"],\"DGEEOQ\":[\"Swimlane actions\"],\"DPfwMq\":[\"Done\"],\"Db4W3_\":[\"Statuses\"],\"EWPtMO\":[\"코드\"],\"EbMPZJ\":[\"미할당\"],\"FBIuPX\":[\"Clear selection\"],\"FQylcT\":[\"Swimlane: Missing\"],\"G4qrLy\":[\"완료 열 해제\"],\"GKu3m4\":[\"라벨 없음\"],\"Gpfctt\":[\"마감\"],\"HTKRVa\":[\"Do not close this dialog.\"],\"H_SQFv\":[\"색상 없음\"],\"HajiZl\":[\"Month\"],\"HrmW6B\":[\"Add a comment… (Markdown supported)\"],\"I6SWEy\":[\"스플릿\"],\"ICip_B\":[\"클라우드 (원격)\"],\"IdMoS6\":[\"Create your first swimlane\"],\"Ik60OC\":[\"에디터에서 열기\"],\"ImOQa9\":[\"Reply\"],\"Iw6WJa\":[\"WIP 한도 설정\"],\"JTYvAw\":[\"카드 검색\"],\"KAlhe_\":[\"카드 업데이트가 저장되지 않아 변환을 중지했습니다. 새로 고친 후 다시 시도하세요.\"],\"KCszT6\":[\"Add swimlane\"],\"KFiYGY\":[\"Change color\"],\"KGi3u9\":[\"Drag to reorder\"],\"K_F6pa\":[\"저장 중…\"],\"Kd6eg7\":[\"Moving cards…\"],\"KeYrQ5\":[\"Remove your reaction\"],\"KjXDqG\":[\"Swimlane: None\"],\"KmydK6\":[\"굵게\"],\"KpnwJK\":[\"Delete \\\"\",[\"0\"],\"\\\"?\"],\"KvW1VO\":[\"Draw.io 다이어그램\"],\"LQn6-8\":[\"로컈 수낙\"],\"MHrjPM\":[\"제목\"],\"MYx830\":[\"This empty swimlane will be removed from the board.\"],\"Mm72la\":[\"No comments yet\"],\"MmYpxT\":[\"Reply…\"],\"NBdIgR\":[\"Comment\"],\"NYTPDY\":[\"Move cards and delete\"],\"O6H89R\":[\"Resolved\"],\"ONWvwQ\":[\"Upload\"],\"OR4WQZ\":[\"+ Add sub-card\"],\"OYHzN1\":[\"태그\"],\"OepdfE\":[\"그룹: 상태\"],\"P5cvAA\":[\"Status name\"],\"PUeYA1\":[\"Create editable swimlanes\"],\"Pvpx7b\":[\"Paste a URL or path\"],\"Q2mGA7\":[\"필터 지우기\"],\"QD8opX\":[\"보드\"],\"QlsPZy\":[\"Mermaid 구문을 작성하면 다이어그램이 표시됩니다.\"],\"QmZYQP\":[\"Unresolve thread\"],\"QyioBP\":[\"Move up\"],\"RbsNko\":[[\"cardCount\"],\" card(s) currently use this swimlane.\"],\"RfEZH1\":[\"JType will create independent swimlanes from the current assignee rows. Card assignee values will stay unchanged.\"],\"RgO4DX\":[\"Duplicate lane ID \\\"\",[\"0\"],\"\\\". The first definition is used.\"],\"RlLl3G\":[\"Actions for \",[\"0\"]],\"S5Qbb1\":[\"쉼표로 구분\"],\"SavliD\":[[\"danglingCount\"],\" card(s) refer to deleted swimlanes.\"],\"T_nAzC\":[\"JType will reuse the existing lane IDs and continue unfinished card updates.\"],\"TdfEV7\":[\"Archived\"],\"Th4mIx\":[[\"0\"],\" 레인 세부 정보\"],\"U0hizX\":[\"Swimlane color\"],\"UDb2YD\":[\"React\"],\"UQOvxZ\":[\"빈 카드\"],\"URmyfc\":[\"Details\"],\"Ubl2by\":[\"Move right\"],\"VNa_N2\":[\"이 파일 형식은 아직 미리볼 수 없습니다.\"],\"VbyRUy\":[\"Comments\"],\"WEYdDv\":[\"Recommended\"],\"WSP6v1\":[\"정렬: 우선순위\"],\"X03-eC\":[\"값을 입력해 주세요.\"],\"XJOV1Y\":[\"Activity\"],\"XklovM\":[\"Working…\"],\"Y8bR2a\":[\"Delete only the swimlane. Card references remain recoverable.\"],\"YHjvGb\":[\"Status actions\"],\"Ya7bZl\":[\"다이어그램 오류\"],\"Zot9XS\":[\"카드 없음\"],\"_5CsXX\":[\"완료 열\"],\"_EsjyQ\":[\"이것 사용\"],\"_TJomP\":[\"Move cards before deleting\"],\"_YbTQZ\":[\"JType will create independent swimlanes from the current priority rows. Card priority values will stay unchanged.\"],\"a6uhHr\":[\"굵게 (Ctrl+B)\"],\"aDvLhk\":[\"Add a comment…\"],\"abUZlY\":[\"세부정보 추가...\"],\"agOeRN\":[\"이 API 명세를 렌더링할 수 없습니다.\"],\"b4hVKD\":[\"색상 열\"],\"bwOqWD\":[[\"0\"],\" of \",[\"1\"],\" sub-cards done\"],\"by_svU\":[\"Keep cards in Unassigned\"],\"bzjBcL\":[\"Sub-cards\"],\"c61_Lv\":[\"Lane ID\"],\"cJ44lA\":[\"Unscheduled\"],\"cUt8yN\":[\"Changes save automatically.\"],\"cfaWH-\":[\"라벨 추가\"],\"cnGeoo\":[\"삭제\"],\"d-F6q9\":[\"Created\"],\"d5z6xQ\":[\"WIP 한도 \",[\"0\"]],\"dEgA5A\":[\"취소\"],\"ecUA8p\":[\"Today\"],\"euc6Ns\":[\"복제\"],\"fEqHZq\":[\"Open sub-card\"],\"fFAIng\":[[\"0\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"fVlS4-\":[\"Swimlane\"],\"fYcKtB\":[\"정렬: 마감\"],\"fvImQM\":[[\"0\"],\" selected\"],\"g8JmSC\":[\"Next month\"],\"gANddk\":[\"Uploading…\"],\"gLDJuJ\":[\"제목 없는 카드\"],\"gzZWjO\":[\"No assigned values to convert.\"],\"hNmOZ7\":[\"Set priority\"],\"he3ygx\":[\"Copy\"],\"hh4sEG\":[\"Relates\"],\"hnK1gR\":[\"PDF 문서\"],\"hyVzII\":[\"Swimlanes\"],\"i4_LY_\":[\"작성\"],\"iSLA_r\":[\"Move left\"],\"iTylMl\":[\"템플릿\"],\"iYVqZq\":[\"열 이름\"],\"jUbC3Z\":[\"Swimlane: Priority\"],\"jZlrte\":[\"색상\"],\"jzy1b8\":[\"Make swimlanes editable\"],\"k4b5_X\":[\"edited\"],\"kZlRKE\":[\"Mermaid 소스\"],\"kryGs-\":[\"카드\"],\"lCF0wC\":[\"새로고침\"],\"lEQWoB\":[\"Add stable horizontal groups that stay visible even when they have no cards.\"],\"lHxVTh\":[\"Swimlane: Assignee\"],\"lUeOk0\":[\"Horizontal groups for this board. Names can change; card mapping stays attached.\"],\"l_g7se\":[\"Resume conversion\"],\"ltF1xa\":[\"병합 결과 저장\"],\"m16xKo\":[\"Add\"],\"nabda1\":[\"카드 삭제\"],\"nfhh60\":[\"Make priority swimlanes editable?\"],\"njJFtc\":[\"Delete comment\"],\"o7J4JM\":[\"필터\"],\"o8va6N\":[\"Restored\"],\"ojKCLU\":[\"담당자\"],\"p9yTeb\":[\"정렬: 제목\"],\"pKKcSl\":[\"Show resolved thread\"],\"pKztsX\":[\"전체 에디터에서 열기\"],\"pdVZUg\":[\"WIP \",[\"0\"]],\"pnrmSP\":[\"새 카드\"],\"pwN6Ae\":[\"열 접기\"],\"pzutoc\":[\"기울임꼴\"],\"qpGDiV\":[\"Copy lane ID\"],\"rF8SEQ\":[\"Edit comment\"],\"rRubBJ\":[\"Lane details\"],\"rdUucN\":[\"미리보기\"],\"rvpMpc\":[\"Manage statuses\"],\"sCzmvQ\":[\"개 카드\"],\"sQpDn6\":[\"전체 화면 종료\"],\"sujToP\":[\"Parent\"],\"tF-_sn\":[[\"cardCount\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"tK2x9T\":[\"⚠ 해결할 충돌 \",[\"0\"],\"건\",[\"1\"]],\"tYS8HY\":[\"Status columns stay available when they are used as columns or swimlanes.\"],\"t_YqKh\":[\"Remove\"],\"tfDRzk\":[\"Save\"],\"u2IprG\":[\"카드 제목 (Enter로 추가, Esc로 취소)\"],\"uAP6ov\":[\"Delete swimlane\"],\"uAQUqI\":[\"상태\"],\"uH1U8v\":[\"Manage swimlanes\"],\"uWPalN\":[\"Duplicate swimlane name \\\"\",[\"0\"],\"\\\". Names should be unique.\"],\"uaR_cz\":[[\"total\",\"plural\",{\"one\":[\"카드 \",\"#\",\"개\"],\"other\":[\"카드 \",\"#\",\"개\"]}]],\"ucJg3u\":[\"Swimlane: Status\"],\"vIKvqQ\":[[\"missingCount\"],\" card(s) refer to deleted swimlanes.\"],\"vMTOsC\":[\"Make assignee swimlanes editable?\"],\"vfYjJ_\":[\"복사하지 못했습니다.\"],\"w7E-FA\":[\"Unsafe link blocked: \",[\"url\"]],\"w_Sphq\":[\"Attachments\"],\"wf6Djn\":[\"기울임꼴 (Ctrl+I)\"],\"wtw-au\":[\"완료 열로 설정\"],\"wwu18a\":[\"아이콘\"],\"x52RAh\":[\"Blocked by \",[\"blockedCount\"],\" unfinished card(s)\"],\"xDsmP9\":[\"Agenda\"],\"xUOPoQ\":[\"Used by\"],\"y1eoq1\":[\"링크 복사\"],\"y9cj46\":[\"그룹: 우선순위\"],\"yEbJGs\":[\"+ Add field\"],\"ybGQtY\":[\"← 목록으로\"],\"yz7wBu\":[\"닫기\"],\"yzF66j\":[\"링크\"],\"zOc0vf\":[\"아이콘 없음\"],\"zga9sT\":[\"확인\"]}")
};
function pm(e) {
	B.load(e, fm[e] ?? fm.en), B.activate(e);
}
//#endregion
//#region src/strings.ts
var mm = {
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
		errUnauthorized: "토큰이 거부되었습니다(무효, 만료 또는 권한 없음).",
		errNetwork: "jtype 서버에 연결할 수 없습니다.",
		errGeneric: (e) => `보드를 불러오지 못했습니다: ${e}`
	}
};
function hm(e) {
	return mm[e] ?? mm.en;
}
//#endregion
//#region src/JTypeBoard.tsx
function gm() {
	return Math.random().toString(36).slice(2, 6);
}
function _m({ workspaceId: e, boardRef: t, baseUrl: n, token: r, client: i, readOnly: a = !1, live: o = !0, pollIntervalMs: s = 3e4, onCardOpen: c, onConnectionChange: l, locale: u, className: d, style: p }) {
	let m = u ?? "en", h = hm(m), _ = v(null);
	_.current !== m && (_.current = m, pm(m));
	let b = i && (n || r) ? h.errPropsBoth : !i && (!n || !r) ? h.errPropsNone : null, w = g(() => b ? null : i || tm({
		baseUrl: n,
		token: r
	}), [
		i,
		n,
		r,
		b
	]), T = Math.max(5e3, s), [E, D] = y(null), [O, k] = y(""), [A, j] = y(""), [M, N] = y("polling"), [P, F] = y(null), [I, L] = y({}), R = v(null), te = v(/* @__PURE__ */ new Map()), z = v(null), ne = v(null), re = v(l);
	re.current = l;
	let ie = v(h);
	ie.current = h;
	let ae = (e) => {
		let n = ie.current;
		return e instanceof nm ? e.code === "board_not_found" ? n.errBoardNotFound(t) : e.code === "board_ref_ambiguous" ? n.errBoardAmbiguous(t, e.candidates) : e.code === "board_config_invalid" ? n.errBoardConfigInvalid : n.errGeneric(e.message) : e instanceof em ? e.status === 401 || e.status === 403 ? n.errUnauthorized : e.status === 0 && e.code === "network_error" ? n.errNetwork : n.errGeneric(e.code) : n.errGeneric(e instanceof Error ? e.message : String(e));
	}, oe = v(ae);
	oe.current = ae, f(() => {
		if (!w) return;
		let n = !1, r = null, i = null, a = null, s = null, c = !1, l = !1;
		R.current = null, D(null), k(""), j(""), F(null), L({});
		let u = (e) => {
			n || (N(e), ne.current !== e && (ne.current = e, re.current?.(e)));
		}, d = async () => {
			try {
				let r = await um(w, e, t, te.current);
				return n ? null : (R.current = r, D(r), k(""), j(""), u(c ? "live" : "polling"), r);
			} catch (e) {
				if (n) return null;
				let t = oe.current(e);
				return R.current ? j(t) : k(t), u("error"), null;
			}
		};
		z.current = d;
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
					c = !1, !n && (R.current && u("polling"), e ? l = !0 : i = setTimeout(() => p(t), 3e4));
				}
			}));
		};
		return d().then((e) => {
			n || (e && p(e.config.id), f());
		}), () => {
			n = !0, r && clearTimeout(r), i && clearTimeout(i), a && clearTimeout(a), s?.(), z.current = null;
		};
	}, [
		w,
		e,
		t,
		o,
		T
	]);
	let se = g(() => {
		let t = () => z.current?.() ?? Promise.resolve(null), n = async (e) => {
			try {
				await e();
			} catch (e) {
				j(oe.current(e));
			}
		}, r = async (t, n) => {
			let r = R.current;
			if (!r || !w) return;
			let i = r.metaByPath.get(t), a = await w.saveDocument(e, {
				relativePath: t,
				content: n,
				baseContentHash: i?.contentHash,
				baseContent: i?.content
			});
			if (i) {
				let e = R.current;
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
				R.current = o, D((t) => t === e ? o : t);
			}
		};
		return {
			refresh: () => void t(),
			setConfig: async (n) => {
				try {
					let r = R.current;
					if (!r || !w) return;
					if (a) {
						L((e) => lm(e, n));
						return;
					}
					let i = {
						...r.config,
						...n
					};
					await w.saveDocument(e, {
						relativePath: r.boardRelativePath,
						content: JSON.stringify(i, null, 2),
						baseContentHash: r.boardDoc.contentHash,
						baseContent: r.boardDoc.content
					}), await t();
				} catch (e) {
					throw j(oe.current(e)), e;
				}
			},
			createCard: async (n, r) => {
				let i = R.current;
				if (!(!i || !w)) try {
					let a = i.config.groupBy || "status", o = i.cards.filter((e) => (a === "status" ? e.columnKey : a === "priority" ? e.priority || "none" : e.assignee || "") === n).reduce((e, t) => Math.max(e, t.position), -1) + 1, s = {
						title: r,
						board: i.config.id,
						status: a === "status" ? n : i.config.columns[0]?.key ?? "todo",
						position: String(o)
					};
					a !== "status" && (s[a] = n);
					let c = `${i.boardDir}/${vp(r)}.md`;
					return i.metaByPath.has(c) && (c = `${i.boardDir}/${vp(r)}-${gm()}.md`), await w.saveDocument(e, {
						relativePath: c,
						content: Kf("", s)
					}), await t(), c;
				} catch (e) {
					j(oe.current(e));
					return;
				}
			},
			updateCard: (e, i) => n(async () => {
				let n = R.current, a = n?.metaByPath.get(e);
				!n || !a || (await r(e, sm(a.content, i)), await t());
			}),
			updateCards: async (e, n) => {
				try {
					if (a) return;
					let i = R.current;
					if (!i) return;
					let o = e.find((e) => !i.metaByPath.has(e.cardId));
					if (o) throw Error(`Card metadata is missing for ${o.cardId}.`);
					let s = 0;
					for (let t of e) {
						let a = i.metaByPath.get(t.cardId);
						await r(t.cardId, sm(a.content, t.patch)), s += 1, n?.(s, e.length);
					}
					await t();
				} catch (e) {
					throw await t(), j(oe.current(e)), e;
				}
			},
			moveCard: (e, i, a) => n(async () => {
				let n = R.current;
				if (!n || !w) return;
				let o = n.config.groupBy || "status", s = n.metaByPath.get(e);
				if (!s) return;
				if (o !== "status") {
					let a = n.cards.find((t) => t.id === e);
					if ((o === "priority" ? a?.priority || "none" : a?.assignee || "") === i) return;
					let { data: c, body: l } = Gf(s.content);
					await r(e, Kf(l, {
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
					let { data: s, body: l } = Gf(o.content);
					await r(a.id, Kf(l, {
						...s,
						status: i,
						position: String(t)
					}));
				}
				await t();
			}),
			deleteCard: async (r) => {
				let i = R.current, a = i?.metaByPath.get(r.id);
				if (!(!i || !a || !w)) {
					if (!w.deleteDocument) {
						j(ie.current.deleteUnsupported);
						return;
					}
					window.confirm(ie.current.confirmDeleteCard(r.title)) && await n(async () => {
						await w.deleteDocument(e, a.id), await t();
					});
				}
			}
		};
	}, [
		w,
		e,
		a
	]), ce = g(() => E ? a ? {
		...E.config,
		...I
	} : E.config : null, [
		E,
		a,
		I
	]), le = g(() => E && ce ? am(ce, E.boardDir) : null, [E, ce]), ue = P ? E?.cards.find((e) => e.id === P) ?? null : null, de = c ?? ((e) => F(e.id)), fe;
	return fe = b ? /* @__PURE__ */ S(vm, { message: b }) : !E && O ? /* @__PURE__ */ S(vm, {
		message: O,
		retryLabel: h.retry,
		onRetry: () => void z.current?.()
	}) : !E || !le ? /* @__PURE__ */ S("div", {
		className: "flex h-full items-center justify-center bg-[#fbfdfb] p-8 text-sm text-stone-500",
		children: h.loading
	}) : /* @__PURE__ */ C(x, { children: [
		/* @__PURE__ */ S(ee, {
			i18n: B,
			children: /* @__PURE__ */ S($p, {
				config: le,
				cards: E.cards,
				actions: se,
				error: A || void 0,
				readOnly: a,
				onCardOpen: de,
				portalClassName: "jtb-scope"
			})
		}),
		ue && !c && ce && /* @__PURE__ */ S(dm, {
			card: ue,
			config: ce,
			strings: h,
			onClose: () => F(null)
		}),
		/* @__PURE__ */ S(ym, {
			state: M,
			strings: h,
			pollSecs: Math.round(T / 1e3),
			liveWanted: o
		})
	] }), /* @__PURE__ */ S("div", {
		className: `jtb-scope jtb-root ${d ?? ""}`,
		style: p,
		"data-jtype-board": t,
		children: fe
	});
}
function vm({ message: e, retryLabel: t, onRetry: n }) {
	return /* @__PURE__ */ C("div", {
		className: "flex h-full flex-col items-center justify-center gap-3 bg-[#fbfdfb] p-8 text-center",
		children: [
			/* @__PURE__ */ S("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				className: "h-9 w-9 text-amber-500",
				"aria-hidden": !0,
				children: /* @__PURE__ */ S("path", {
					strokeLinecap: "round",
					strokeLinejoin: "round",
					d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
				})
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
function ym({ state: e, strings: t, pollSecs: n, liveWanted: r }) {
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
export { em as JTypeApiError, _m as JTypeBoard, nm as JTypeBoardError, tm as createJTypeClient, rm as resolveBoardDoc };
