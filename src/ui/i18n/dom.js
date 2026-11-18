'use strict';
(function () {
  const lang = window.apkstartLang || 'zh';
  if (!window.I18N || lang === 'zh') return;
  const tr = (s) => window.I18N.tr(s, lang);
  const HAN = /[㐀-鿿]/;
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-tip'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);

  document.documentElement.lang = lang;

  function fixText(node) {
    const v = node.nodeValue;
    if (!v || !HAN.test(v)) return;
    if (node.parentNode && SKIP.has(node.parentNode.nodeName)) return;
    let t = tr(v);
    if (t === v) return;
    if (node.previousSibling && /^[\p{L}\p{N}("]/u.test(t)) t = ` ${t}`;
    if (node.nextSibling && /[\p{L}\p{N})"]$/u.test(t)) t = `${t} `;
    node.nodeValue = t;
  }

  function fixAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v || !HAN.test(v)) continue;
      const t = tr(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }

  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) { fixText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (SKIP.has(root.nodeName)) return;
    if (root.nodeType === Node.ELEMENT_NODE) fixAttrs(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n = it.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) fixText(n);
      else if (!SKIP.has(n.nodeName)) fixAttrs(n);
      n = it.nextNode();
    }
  }

  walk(document.documentElement);
  if (HAN.test(document.title)) document.title = tr(document.title);

  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') fixText(r.target);
      else if (r.type === 'attributes') fixAttrs(r.target);
      else r.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS,
  });

  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);
  const nativeAlert = window.alert.bind(window);
  window.confirm = (msg) => nativeConfirm(tr(String(msg)));
  window.prompt = (msg, def) => nativePrompt(tr(String(msg)), def);
  window.alert = (msg) => nativeAlert(tr(String(msg)));
})();
