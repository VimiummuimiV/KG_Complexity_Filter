// ==UserScript==
// @name          KG_Complexity_Filter
// @namespace     klavogonki
// @version      1.0.0
// @description   Filters games by complexity on the game page
// @match         *://klavogonki.ru/g/*
// @author        Patcher
// @icon          https://www.google.com/s2/favicons?sz=64&domain=klavogonki.ru
// ==/UserScript==

(()=>{"use strict";const e=new URL(location.href).searchParams.get("gmid")??/\/g\/(?<id>\d+)/.exec(location.pathname)?.groups.id;e&&(async e=>{const t=new URLSearchParams({need_text:"1"}),o=await fetch(`${location.origin}/g/${e}.info`,{method:"POST",body:t}),n=await o.json();return n.text?.text??null})(e).then((e=>{e?console.log("[KG] text ->",e):console.warn("[KG] no text in response")})).catch((e=>console.error("[KG] error ->",e.message)))})();