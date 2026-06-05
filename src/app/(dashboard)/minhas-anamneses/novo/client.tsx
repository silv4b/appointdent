"use client"

import { DynamicCard } from "@/components/dynamic-card"
import { DynamicField } from "@/components/dynamic-field"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createAnamnesisTemplate } from "@/lib/actions/anamnesis-templates"
import { Loader2, Plus, ArrowLeft } from "lucide-react"
import { useRef, useState, useCallback } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function NovoModeloClient() {
  const router = useRouter()
  const [templateName, setTemplateName] = useState("")
  const [templateFields, setTemplateFields] = useState<{ _id: number; label: string; description: string; defaultContent: string }[]>([{ _id: 0, label: "", description: "", defaultContent: "" }])
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const fieldInputsRef = useRef<(HTMLInputElement | null)[]>([])
  const fieldIdCounter = useRef(1)

  const addField = () => {
    const id = fieldIdCounter.current++
    setTemplateFields([{ _id: id, label: "", description: "", defaultContent: "" }, ...templateFields])
    setTimeout(() => {
      fieldInputsRef.current[0]?.focus()
    }, 0)
  }
  const removeField = (i: number) => {
    if (templateFields.length <= 1) return
    setTemplateFields(templateFields.filter((_, j) => j !== i))
  }
  const updateField = (i: number, key: "label" | "description" | "defaultContent", v: string) => {
    const next = [...templateFields]
    next[i] = { ...next[i], [key]: v }
    setTemplateFields(next)
  }

  const handleCreate = async () => {
    if (!templateName.trim()) {
      toast.error("Informe um nome para o modelo")
      return
    }
    const validFields = templateFields.filter((f) => f.label.trim())
    if (validFields.length === 0) {
      toast.error("Adicione pelo menos um campo")
      return
    }

    setSaving(true)
    const form = new FormData()
    form.set("name", templateName.trim())
    form.set("fields", JSON.stringify(validFields.map((f) => ({ label: f.label.trim(), description: f.description.trim(), defaultContent: f.defaultContent }))))
    const result = await createAnamnesisTemplate(form)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Modelo criado")
      router.push("/minhas-anamneses")
    }
    setSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/minhas-anamneses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Novo Modelo de Anamnese</h1>
        <p className="mt-1 text-muted-foreground">Defina os campos que farão parte deste modelo.</p>
      </div>

      <div className="space-y-6">
        <DynamicField
          type="text"
          label="Nome do Modelo"
          value={templateName}
          onChange={setTemplateName}
          placeholder="Ex: Avaliação Inicial"
          inputRef={nameRef}
        />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-base">Campos</Label>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adicionar Campo
            </Button>
          </div>
          <div className="space-y-4">
            {templateFields.map((field, i) => (
              <DynamicCard
                key={field._id}
                title={`Campo ${templateFields.length - i}`}
                fields={[
                  { name: "label", label: "Nome do campo", type: "text", placeholder: "Ex: Histórico Familiar" },
                  { name: "description", label: "Descrição (informativa)", type: "text", placeholder: "Ex: Perguntar sobre doenças hereditárias na família" },
                  { name: "defaultContent", label: "Conteúdo padrão", type: "richtext" },
                ]}
                values={{ label: field.label, description: field.description, defaultContent: field.defaultContent }}
                onChange={(name, value) => updateField(i, name as "label" | "description" | "defaultContent", value)}
                onRemove={() => removeField(i)}
                canRemove={templateFields.length > 1}
                inputRefs={{ label: (el) => { fieldInputsRef.current[i] = el } }}
                richTextMinHeight="100px"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button size="lg" onClick={handleCreate} disabled={saving || !templateName.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Modelo
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.push("/minhas-anamneses")} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
