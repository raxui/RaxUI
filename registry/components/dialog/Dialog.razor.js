// SheenUI Dialog: the behavior the native <dialog> lacks (ADR 013). Source-owned: edit freely.

export function init(dialog) {
  // A press on the backdrop targets the <dialog> itself, outside its box; close like Radix does.
  dialog.addEventListener("pointerdown", (event) => {
    if (event.target !== dialog) return
    const box = dialog.getBoundingClientRect()
    const inside = event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom
    if (!inside) dialog.close()
  })
}

export function setOpen(dialog, open) {
  if (open && !dialog.open) dialog.showModal()
  else if (!open && dialog.open) dialog.close()
}
