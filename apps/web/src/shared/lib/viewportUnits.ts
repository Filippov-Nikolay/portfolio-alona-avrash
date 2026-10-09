// In-app browsers built on WKWebView (the Google and Facebook apps) often skip
// setMinimumViewportInset, so svh, lvh and vh all track the visible height and
// change while their toolbars slide (WebKit bug 255852). Every svh-based scroll
// runway then changes the page length mid-scroll and the sections jump.
//
// Runs in <head> on touch devices before the first paint. A browser that keeps
// svh below lvh is left alone. One that reports them equal, or whose svh moves
// on a height-only resize, gets --svh/--lvh frozen in pixels; the mixins'
// svh()/lvh() read them. A width change (rotation) measures again.
export const VIEWPORT_UNITS_SCRIPT = `(function(){var d=document.documentElement,w=window;if(!w.matchMedia||!w.matchMedia("(hover: none) and (pointer: coarse)").matches)return;var s=0,l=0,width=0,frozen=false;function probe(h){var e=document.createElement("div");e.style.cssText="position:absolute;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:"+h;d.appendChild(e);var v=e.getBoundingClientRect().height;d.removeChild(e);return v}function freeze(){d.style.setProperty("--svh",s/100+"px");d.style.setProperty("--lvh",l/100+"px");frozen=true}function measure(){d.style.removeProperty("--svh");d.style.removeProperty("--lvh");frozen=false;width=w.innerWidth;s=probe("100svh");l=probe("100lvh");if(Math.abs(l-s)<1)freeze()}measure();w.addEventListener("resize",function(){if(Math.abs(w.innerWidth-width)>1){measure();return}if(!frozen&&Math.abs(probe("100svh")-s)>1)freeze()})})()`;
