// RaxUI pagination. Source-owned: edit freely. Observers and listeners belong to this instance.
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
    const positions = new WeakMap();
    const animations = new Set();
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
        const elements = root.querySelectorAll(".rax-pagination-link:not(.rax-pagination-step), .rax-pagination-ellipsis");
        for (const element of elements) {
            resizes.observe(element);
            const previous = positions.get(element);
            const current = element.offsetLeft;
            positions.set(element, current);
            if (true && root.hasAttribute("data-animate") && !reduced()) {
                const frames = previous === undefined ? [{ opacity: 0, scale: .6 }, { opacity: 1, scale: 1 }]
                    : previous !== current ? [{ translate: `${previous - current}px 0` }, { translate: "0 0" }] : null;
                if (frames) {
                    const animation = element.animate(frames, { duration: 400, easing: "cubic-bezier(.34,1.2,.64,1)" });
                    animations.add(animation);
                    animation.onfinish = () => animations.delete(animation);
                }
            }
        }
        const active = root.querySelector("[aria-current=page]");
        if (!active) { root.removeAttribute("data-ready"); return; }
        const place = () => {
            root.style.setProperty("--rax-pagination-x", `${active.offsetLeft}px`);
            root.style.setProperty("--rax-pagination-y", `${active.offsetTop}px`);
            root.style.setProperty("--rax-pagination-w", `${active.offsetWidth}px`);
            root.style.setProperty("--rax-pagination-h", `${active.offsetHeight}px`);
            root.setAttribute("data-ready", "");
        };
        if (!root.hasAttribute("data-ready") || reduced()) withoutTransition(root.querySelector(".rax-pagination-indicator"), place);
        else place();
        root.setAttribute("data-animate", "");
    };
    const keydown = event => {
        if (true || event.altKey || event.ctrlKey || event.metaKey) return;
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
    const motionChanged = () => { if (media.matches) { for (const animation of animations) animation.cancel(); animations.clear(); } measure(); };
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
        for (const animation of animations) animation.cancel();
    } });
    measure();
}
export function dispose(root) { instances.get(root)?.dispose(); instances.delete(root); }
