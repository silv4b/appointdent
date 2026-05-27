"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

export interface Field {
  name: string
  label: string
  type?: "text" | "email" | "number" | "date" | "tel" | "color" | "hidden"
  placeholder?: string
  defaultValue?: string
  required?: boolean
  step?: string
}

interface EntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  fields: Field[]
  action: (formData: FormData) => Promise<{ error?: string } | null | undefined>
  successMessage?: string
}

export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  action,
  successMessage,
}: EntityDialogProps) {
  const [state, formAction, isPending] = useActionState(
    async (_: { error?: string } | null, formData: FormData) => {
      const result = await action(formData)
      if (!result?.error) {
        if (successMessage) toast.success(successMessage)
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
      return result ?? null
    },
    null,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          {fields.map((field) =>
            field.type === "hidden" ? (
              <input
                key={field.name}
                type="hidden"
                name={field.name}
                defaultValue={field.defaultValue}
              />
            ) : (
              <div key={field.name} className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  required={field.required}
                  step={field.step}
                  key={`${field.name}:${field.defaultValue ?? ""}`}
                />
              </div>
            ),
          )}
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function useEntityDialog() {
  const [open, setOpen] = useState(false)
  return { open, setOpen, dialogProps: { open, onOpenChange: setOpen } }
}
