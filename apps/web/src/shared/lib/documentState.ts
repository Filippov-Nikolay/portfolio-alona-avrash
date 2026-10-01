export const PRELOADER_SEEN_ATTRIBUTE = "data-preloader-seen";

export function hasSeenPreloaderBefore(): boolean {
    return document.documentElement.hasAttribute(PRELOADER_SEEN_ATTRIBUTE);
}

export const DOCUMENT_STATE_SCRIPT = `(function(){var d=document.documentElement;function c(n){var m=document.cookie.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?m[1]:null}function s(k){try{return localStorage.getItem(k)}catch(e){return null}}var t=s("site-theme")||c("site-theme");if(t==="dark"||t==="light")d.setAttribute("data-theme",t);if(c("site-preloader")==="1"||s("site:preloader")==="1")d.setAttribute("${PRELOADER_SEEN_ATTRIBUTE}","")})()`;
