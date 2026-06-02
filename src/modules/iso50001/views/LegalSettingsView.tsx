import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { LEGAL_NOTICE } from '@/services/sgen-engine'
import { Shield, Check } from 'lucide-react'

export function LegalSettingsView() {
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('sgen_legal_notices')
        .select('acknowledged').eq('notice_type', 'legal').maybeSingle()
      setAcknowledged(data?.acknowledged || false)
      setLoading(false)
    }
    check()
  }, [])

  async function handleAcknowledge() {
    const { data: existing } = await supabase.from('sgen_legal_notices')
      .select('id').eq('notice_type', 'legal').maybeSingle()

    if (existing) {
      await supabase.from('sgen_legal_notices').update({
        acknowledged: true, acknowledged_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('sgen_legal_notices').insert({
        site_id: '00000000-0000-0000-0000-000000000000',
        notice_type: 'legal',
        title: LEGAL_NOTICE.title,
        body: LEGAL_NOTICE.body,
        version: LEGAL_NOTICE.version,
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
    }
    setAcknowledged(true)
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Cargando...</div>

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 mt-1">
          <Shield size={20} className="text-brand-blue" />
        </div>
        <div className="space-y-3 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{LEGAL_NOTICE.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{LEGAL_NOTICE.body}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            VersaEnergy no reproduce, reemplaza ni sustituye el texto oficial de ISO 50001 ni de ninguna otra norma.
            Cada organizacion es responsable de adquirir y consultar la version oficial del estandar.
            La funcionalidad SGEn describe preparacion operativa y cobertura del sistema de gestion. No implica certificacion ISO.
          </div>
          {!acknowledged ? (
            <Button size="sm" leftIcon={<Check size={14} />} onClick={handleAcknowledge}>
              He leido y entiendo
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Check size={16} />
              <span>Aviso reconocido — v{LEGAL_NOTICE.version}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
