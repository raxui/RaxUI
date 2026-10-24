"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form"

import {
  Field,
  FieldControl,
  FieldDefaultsProvider,
  FieldDescription,
  FieldError,
  FieldLabel,
  focusFirstInvalid,
  useField,
} from "@/components/ui/field"

// -----------------------------------------------------------------------------
// Form — react-hook-form on top of Field:
//
//   const form = useForm<Values>({ resolver: zodResolver(schema), mode: "onTouched" })
//   <Form {...form} schema={schema}>
//     <form onSubmit={form.handleSubmit(onSubmit)}>
//       <FormField control={form.control} name="email" render={({ field }) => (
//         <FormItem>
//           <FormLabel>Email</FormLabel>
//           <FormControl><Input {...field} /></FormControl>
//           <FormDescription>…</FormDescription>
//           <FormMessage />
//         </FormItem>
//       )} />
//
// FormField feeds invalid / error / required to whatever Field is inside it,
// so FormRow (iOS rows) works the same as FormItem. Pass `schema` to Form and
// required fields get their asterisk from the zod schema automatically.
// -----------------------------------------------------------------------------

// ---- Required-ness from a zod (v3 or v4) schema -----------------------------------

type AnySchema = {
  safeParse?: (v: unknown) => { success: boolean }
  shape?: Record<string, AnySchema>
  _def?: Record<string, unknown>
  _zod?: { def?: Record<string, unknown> }
}

const defOf = (s: AnySchema) => (s._zod?.def ?? s._def ?? {}) as Record<string, AnySchema | undefined>

/** Peel effects / pipes / defaults until we reach an object, array or leaf. */
function unwrap(schema: AnySchema | undefined): AnySchema | undefined {
  let s = schema
  for (let i = 0; s && i < 12; i++) {
    if (s.shape || defOf(s).element) return s
    const def = defOf(s)
    const inner = def.schema ?? def.innerType ?? def.in
    if (!inner) return s
    s = inner
  }
  return s
}

function schemaAt(schema: unknown, path: string): AnySchema | undefined {
  let s = schema as AnySchema | undefined
  for (const key of path.split(".")) {
    s = unwrap(s)
    if (!s) return undefined
    s = /^\d+$/.test(key) ? defOf(s).element : s.shape?.[key]
  }
  return s
}

/**
 * A field is required when none of the "empty" values pass its schema:
 * z.string().min(1) / .email(), z.literal(true), z.date(), z.enum(), z.array().min(1)
 * are required; z.string(), z.boolean(), .optional(), .nullable() are not.
 */
export function isRequiredInSchema(schema: unknown, name: string): boolean | undefined {
  const s = schemaAt(schema, name)
  if (!s?.safeParse) return undefined
  return ![undefined, "", false, [], null].some((empty) => s.safeParse!(empty).success)
}

// ---- Form -------------------------------------------------------------------------

const SchemaContext = React.createContext<unknown>(undefined)

export type FormProps<TFieldValues extends FieldValues, TContext = unknown, TTransformed = TFieldValues> = UseFormReturn<
  TFieldValues,
  TContext,
  TTransformed
> & {
  /** The zod schema, to mark required fields (asterisk + aria-required) automatically. */
  schema?: unknown
  children: React.ReactNode
}

function Form<TFieldValues extends FieldValues, TContext = unknown, TTransformed = TFieldValues>({
  schema,
  children,
  ...methods
}: FormProps<TFieldValues, TContext, TTransformed>) {
  return (
    <FormProvider {...(methods as UseFormReturn<TFieldValues, TContext, TTransformed>)}>
      <SchemaContext.Provider value={schema}>
        <SubmitFeedback />
        {children}
      </SchemaContext.Provider>
    </FormProvider>
  )
}

/** After a submit with errors: focus the first invalid control and give its field a shake. */
function SubmitFeedback() {
  const { submitCount, errors } = useFormState()
  const lastForm = React.useRef<HTMLFormElement | null>(null)

  // Remember which <form> was submitted (react-hook-form doesn't tell us).
  React.useEffect(() => {
    const onSubmit = (event: Event) => (lastForm.current = event.target as HTMLFormElement)
    document.addEventListener("submit", onSubmit, true)
    return () => document.removeEventListener("submit", onSubmit, true)
  }, [])

  React.useEffect(() => {
    if (!submitCount || Object.keys(errors).length === 0) return
    const frame = requestAnimationFrame(() => focusFirstInvalid(lastForm.current))
    return () => cancelAnimationFrame(frame)
    // Only on a new submit attempt, not on every error change while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount])

  return null
}

// ---- FormField --------------------------------------------------------------------

interface FormFieldContextValue {
  name: string
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = ControllerProps<TFieldValues, TName, TTransformedValues> & {
  /** Override the required-ness read from the schema. */
  required?: boolean
}

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({ required, render, ...props }: FormFieldProps<TFieldValues, TName, TTransformedValues>) {
  const schema = React.useContext(SchemaContext)
  const isRequired = required ?? isRequiredInSchema(schema, props.name)

  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller
        {...props}
        render={(args) => (
          <FieldDefaultsProvider
            value={{
              invalid: !!args.fieldState.error,
              error: args.fieldState.error?.message,
              required: isRequired,
              disabled: args.field.disabled,
            }}
          >
            {render(args)}
          </FieldDefaultsProvider>
        )}
      />
    </FormFieldContext.Provider>
  )
}
FormField.displayName = "FormField"

/** Field state for the surrounding FormField, plus the ids that wire it. */
function useFormField() {
  const formField = React.useContext(FormFieldContext)
  const field = useField()
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: formField?.name })
  if (!formField) throw new Error("useFormField must be used inside <FormField>")
  const fieldState = getFieldState(formField.name, formState)
  return {
    name: formField.name,
    formItemId: field?.controlId,
    formDescriptionId: field?.descriptionId,
    formMessageId: field?.errorId,
    ...fieldState,
  }
}

// ---- Parts: the Field components under Form names -----------------------------------

/** One field: label, control, description, message. A Field fed by the surrounding FormField. */
const FormItem = Field
const FormLabel = FieldLabel
const FormControl = FieldControl
const FormDescription = FieldDescription
/** Shows the field's validation message (or its own children). */
const FormMessage = FieldError

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, useFormField }
