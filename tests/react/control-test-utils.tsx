import * as React from "react"
import { expect } from "vitest"
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "../../registry/react/components/field/field"

export function Wired({ children }: { children: React.ReactElement }) {
  return <Field id="control" invalid required>
    <FieldLabel>Control</FieldLabel><FieldControl>{children}</FieldControl>
    <FieldDescription>Hint</FieldDescription><FieldError>Required</FieldError>
  </Field>
}

export function expectWiring(control: HTMLElement) {
  expect(control).toHaveAttribute("id", "control")
  expect(control).toHaveAttribute("aria-labelledby", "control-label")
  expect(control).toHaveAttribute("aria-describedby", "control-description control-error")
  expect(control).toHaveAttribute("aria-invalid", "true")
  expect(control).toHaveAttribute("aria-required", "true")
}
