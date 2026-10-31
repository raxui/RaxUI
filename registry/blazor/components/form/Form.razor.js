// After interactive validation, wait for all Field components to render their ARIA state.
// Static SSR does not import this module and retains normal browser form behavior.
export function focusFirstInvalid(root) {
  requestAnimationFrame(() => {
    const control = root.querySelector("input.is-invalid, select.is-invalid, textarea.is-invalid, [aria-invalid='true']:not(.rax-field):not(fieldset), fieldset[aria-invalid='true']")
    if (!control) return
    const focusable = control.matches("input, select, textarea, button, [tabindex]")
      ? control : control.querySelector("input, select, textarea, button, [tabindex]:not([tabindex='-1'])")
    focusable?.focus({ preventScroll: true })
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    control.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" })
    const field = control.closest(".rax-field, .rax-fieldset")
    if (!field || reduced) return
    field.removeAttribute("data-shake")
    void field.offsetWidth // restart the animation on repeated submissions
    field.setAttribute("data-shake", "")
    field.addEventListener("animationend", () => field.removeAttribute("data-shake"), { once: true })
  })
}
