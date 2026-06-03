import { useState } from 'react'
import { PageHeader } from '@/shared/PageHeader'
import { Card } from '@/shared/Card'
import { Button } from '@/shared/Button'
import { FileText, Download, FileSpreadsheet, FileIcon } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { getUtilityLabel } from '@/shared/OperationalContext'

export default function ReportesPage() {
  const { selectedSiteId, selectedUtilityType, selectedPeriod } = useUIStore()
  const [generating, setGenerating] = useState(false)

  const REPORTS = [
    { id: 'balance', name: 'Balance Energético', desc: 'Resumen de entradas, consumo medido y pérdidas.' },
    { id: 'enpi', name: 'Desempeño y EnPIs', desc: 'Evolución de los indicadores clave y cumplimiento de objetivos.' },
    { id: 'sgen', name: 'Evidencia SGEn', desc: 'Reporte consolidado de alcance, SEUs, auditorías, evidencias y acciones.' },
    { id: 'raw', name: 'Datos crudos (Exportación)', desc: 'Lecturas de medidores y variables en el periodo.', type: 'csv' }
  ]

  const handleGenerate = (reportId: string, type: 'pdf' | 'csv' = 'pdf') => {
    setGenerating(true)
    setTimeout(() => {
      // Simulate download
      const link = document.createElement('a')
      const blob = new Blob([`Report Data for ${reportId}`], { type: type === 'pdf' ? 'application/pdf' : 'text/csv' })
      link.href = URL.createObjectURL(blob)
      link.download = `Reporte_${reportId}_${new Date().toISOString()}.${type}`
      link.click()
      setGenerating(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-border p-6 pb-4">
        <PageHeader
          title="Reportes y Exportaciones"
          description="Genera documentos operativos y reportes gerenciales para el sitio actual."
        />
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!selectedSiteId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText size={48} className="mb-4 text-gray-300" />
            <p>Selecciona un sitio en el panel superior para generar reportes.</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm">
              <FileIcon className="text-brand-blue shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-medium text-blue-900">Contexto de Reporte</p>
                <p className="text-blue-700 mt-1">
                  Se generará el reporte utilizando el periodo de tiempo <strong>{selectedPeriod === 'monthly' ? 'Mensual' : selectedPeriod === 'weekly' ? 'Semanal' : 'Personalizado'}</strong>.
                  {selectedUtilityType && ` Filtrado para ${getUtilityLabel(selectedUtilityType)}.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORTS.map((report) => (
                <Card key={report.id} className="p-5 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-brand-blue shrink-0">
                      {report.type === 'csv' ? <FileSpreadsheet size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{report.desc}</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                    <Button
                      size="sm"
                      leftIcon={<Download size={14} />}
                      onClick={() => handleGenerate(report.id, report.type as any)}
                      loading={generating}
                    >
                      Generar {report.type === 'csv' ? 'CSV' : 'PDF'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
