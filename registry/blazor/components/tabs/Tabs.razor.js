// RaxUI tabs. Source-owned: edit freely. Observers and listeners belong to this instance.
const instances = new WeakMap();
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function withoutTransition(element, apply) {
    if (!element) return apply();
    element.style.transition = "none";
    apply();
    void element.getBoundingClientRect();
    element.style.transition = "";
}
export function init(root) {
    if (!root?.isConnected) return;
    if (instances.has(root)) { instances.get(root).measure(); return; }
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let shown = null;
    // A scrolling list keeps the active tab in view without scrolling the page. Box edges rather
    // than scrollLeft, so the same sums work in RTL, where scrollLeft counts negative.
    const reveal = tab => {
        if (root.scrollWidth <= root.clientWidth) return;
        const list = root.getBoundingClientRect(), item = tab.getBoundingClientRect(), gap = 16;
        const left = item.left - gap - list.left, right = item.right + gap - list.right;
        const delta = left < 0 ? left : right > 0 ? right : 0;
        if (delta) root.scrollBy({ left: delta, behavior: reduced() || !root.hasAttribute("data-animate") ? "instant" : "smooth" });
    };
    const measure = () => {
        const elements = root.querySelectorAll("[role=tab]");
        for (const element of elements) resizes.observe(element);
        const active = root.querySelector("[aria-selected=true]");
        if (!active) { root.removeAttribute("data-ready"); return; }
        const place = () => {
            root.style.setProperty("--rax-tabs-indicator-x", `${active.offsetLeft}px`);
            root.style.setProperty("--rax-tabs-indicator-y", `${active.offsetTop}px`);
            root.style.setProperty("--rax-tabs-indicator-width", `${active.offsetWidth}px`);
            root.style.setProperty("--rax-tabs-indicator-height", `${active.offsetHeight}px`);
            root.setAttribute("data-ready", "");
        };
        if (!root.hasAttribute("data-ready") || reduced()) withoutTransition(root.querySelector(".rax-tabs-indicator"), place);
        else place();
        // Only when the selection changes, so resizing doesn't undo a manual scroll.
        if (active !== shown) { reveal(active); shown = active; }
        root.setAttribute("data-animate", "");
    };
    const keydown = event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const tabs = Array.from(root.querySelectorAll('[role="tab"]:not(:disabled)'));
        const index = tabs.indexOf(event.target);
        if (index < 0) return;
        const vertical = root.getAttribute("aria-orientation") === "vertical";
        const rtl = getComputedStyle(root).direction === "rtl";
        let next;
        if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else if (event.key === (vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight")) next = (index + 1) % tabs.length;
        else if (event.key === (vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft")) next = (index + tabs.length - 1) % tabs.length;
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].focus({ preventScroll: true });
        tabs[next].click();
    };
    const motionChanged = () => measure();
    const resizes = new ResizeObserver(measure);
    const mutations = new MutationObserver(measure);
    resizes.observe(root);
    mutations.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "disabled"] });
    root.addEventListener("keydown", keydown);
    media.addEventListener("change", motionChanged);
    instances.set(root, { measure, dispose() {
        mutations.disconnect(); resizes.disconnect();
        root.removeEventListener("keydown", keydown);
        media.removeEventListener("change", motionChanged);
    } });
    measure();
}
export function dispose(root) { instances.get(root)?.dispose(); instances.delete(root); }
