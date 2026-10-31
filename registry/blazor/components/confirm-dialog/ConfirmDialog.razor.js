// RaxUI ConfirmDialog: what the native <dialog> lacks for a confirmation (ADR 013). Source-owned: edit freely.

export function init(dialog) {
  // A press on the backdrop targets the <dialog> itself, outside its box. A confirmation stays open
  // and nudges instead, like boot-ui's AlertDialog.
  dialog.addEventListener("pointerdown", (event) => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    const inside = event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom
    if (inside) return
    dialog.removeAttribute("data-nudge")
    void dialog.offsetWidth // restart the animation
    dialog.setAttribute("data-nudge", "")
  })
  dialog.addEventListener("animationend", (event) => {
    if (event.animationName === "rax-alert-nudge") dialog.removeAttribute("data-nudge")
  })
  // Esc cannot close it while the confirm action is still running.
  dialog.addEventListener("cancel", (event) => {
    if (dialog.getAttribute("aria-busy") === "true") event.preventDefault()
  })
}

export function setOpen(dialog, open) {
  if (open && !dialog.open) dialog.showModal()
  else if (!open && dialog.open) dialog.close()
}
