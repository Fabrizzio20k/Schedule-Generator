/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Clock, MapPin, User, Trash2, Check, AlertTriangle, ArrowLeft, Upload, FileText, Download, Eye } from 'lucide-react'
import html2canvas from 'html2canvas'

interface OpcionCurso {
  tipo: string
  codigo_subseccion: string
  docente: string
  modalidad: string
  horarios: string[]
  ubicacion: string
  vacantes: number
  matriculados: number
}

interface SeccionCurso {
  numero_seccion: string
  opciones: Record<string, OpcionCurso>
}

interface Curso {
  nombre: string
  malla: string
  tipo_curso: string
  secciones: Record<string, SeccionCurso>
}

interface CursoSeleccionado {
  seccion: string
  opcion: string
  opciones: Record<string, OpcionCurso>
}

interface HorarioInfo {
  dia: number
  horaInicio: number
  horaFin: number
}

interface ClaseHorario {
  codigo: string
  nombre: string
  tipo: string
  ubicacion: string
  docente: string
  seccion: string
  esInicio: boolean
  duracion: number
  esPreview?: boolean
  tieneConflicto?: boolean
}

type CursosData = Record<string, Curso>
type HorarioSeleccionado = Record<string, CursoSeleccionado>

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7)

export default function GeneradorHorarios() {
  const [cursosData, setCursosData] = useState<CursosData>({})
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<HorarioSeleccionado>({})
  const [busqueda, setBusqueda] = useState('')
  const [cursoSeleccionando, setCursoSeleccionando] = useState<string | null>(null)
  const [opcionPrevisualizando, setOpcionPrevisualizando] = useState<{
    codigo: string
    seccion: string
    opcion: string
  } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [archivoSubido, setArchivoSubido] = useState(false)
  const [exportando, setExportando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const horarioRef = useRef<HTMLDivElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Por favor, selecciona un archivo JSON válido')
      return
    }

    setCargando(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const isValidFormat = validateJSONFormat(data)
      if (!isValidFormat) {
        alert('El formato del JSON no es válido. Asegúrate de que tenga la estructura correcta de cursos.')
        setCargando(false)
        return
      }

      setCursosData(data)
      setArchivoSubido(true)
      setHorarioSeleccionado({})
      setCursoSeleccionando(null)
      setOpcionPrevisualizando(null)
    } catch (error) {
      console.error('Error procesando archivo:', error)
      alert('Error al procesar el archivo JSON. Verifica que sea un JSON válido.')
    } finally {
      setCargando(false)
    }
  }

  const validateJSONFormat = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false

    for (const [codigo, curso] of Object.entries(data)) {
      if (typeof curso !== 'object' || !curso) return false

      const cursoObj = curso as any
      if (!cursoObj.nombre || !cursoObj.secciones || typeof cursoObj.secciones !== 'object') {
        return false
      }

      for (const [numSeccion, seccion] of Object.entries(cursoObj.secciones)) {
        if (typeof seccion !== 'object' || !seccion) return false

        const seccionObj = seccion as any
        if (!seccionObj.opciones || typeof seccionObj.opciones !== 'object') {
          return false
        }
      }
    }

    return true
  }

  const exportarHorario = async () => {
    if (!horarioRef.current) {
      alert('No se pudo acceder al horario para exportar')
      return
    }

    setExportando(true)
    try {
      console.log('Iniciando exportación...')

      // Crear un clon del elemento para evitar modificar el original
      const clonedElement = horarioRef.current.cloneNode(true) as HTMLElement

      // Limpiar estilos problemáticos
      const cleanStyles = (element: HTMLElement) => {
        element.style.background = '#ffffff'
        element.style.backgroundImage = 'none'

        // Limpiar gradientes problemáticos en elementos hijos
        const gradientElements = element.querySelectorAll('[class*="gradient"]')
        gradientElements.forEach((el: any) => {
          if (el.classList.contains('from-blue-600')) {
            el.style.background = '#2563eb'
          } else if (el.classList.contains('from-blue-500')) {
            el.style.background = '#3b82f6'
          } else if (el.classList.contains('from-green-500')) {
            el.style.background = '#10b981'
          } else if (el.classList.contains('from-gray-400')) {
            el.style.background = '#9ca3af'
          } else if (el.classList.contains('from-red-300')) {
            el.style.background = '#fca5a5'
          }
          el.style.backgroundImage = 'none'
        })
      }

      // Aplicar estilos limpios
      cleanStyles(clonedElement)

      // Crear un contenedor temporal
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.appendChild(clonedElement)
      document.body.appendChild(tempContainer)

      const canvas = await html2canvas(clonedElement, {
        background: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: false
      })

      // Limpiar el contenedor temporal
      document.body.removeChild(tempContainer)

      console.log('Canvas creado exitosamente')

      const dataURL = canvas.toDataURL('image/png', 1.0)
      const link = document.createElement('a')
      link.download = `horario-utec-${new Date().toISOString().split('T')[0]}.png`
      link.href = dataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('Exportación completada')
    } catch (error) {
      console.error('Error detallado al exportar:', error)

      // Fallback: export as text table
      try {
        await exportarHorarioTexto()
      } catch (fallbackError) {
        if (error instanceof Error) {
          alert(`Error al exportar el horario: ${error.message}. Prueba exportar como JSON.`)
        } else {
          alert('Error al exportar el horario. Prueba exportar como JSON.')
        }
      }
    } finally {
      setExportando(false)
    }
  }

  const exportarHorarioTexto = async () => {
    const horarioTexto = `
HORARIO ACADÉMICO - UTEC
========================

${Object.entries(horarioSeleccionado).map(([codigo, info]) => {
      const curso = cursosData[codigo]
      const opciones = Object.values(info.opciones)

      return `${codigo} - ${curso.nombre}
Sección: ${info.seccion}
${opciones.map(opcion => `
  ${opcion.tipo}
  Docente: ${opcion.docente}
  Horarios: ${opcion.horarios.join(', ')}
  Ubicación: ${opcion.ubicacion}
`).join('')}
${'='.repeat(50)}`
    }).join('\n\n')}

Generado el: ${new Date().toLocaleDateString('es-PE')}
    `

    const blob = new Blob([horarioTexto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `horario-utec-${new Date().toISOString().split('T')[0]}.txt`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportarHorarioAlternativo = () => {
    try {
      const horarioData = Object.entries(horarioSeleccionado).map(([codigo, info]) => {
        const curso = cursosData[codigo]
        return {
          codigo,
          nombre: curso.nombre,
          seccion: info.seccion,
          opciones: Object.entries(info.opciones).map(([key, opcion]) => ({
            tipo: opcion.tipo,
            horarios: opcion.horarios,
            docente: opcion.docente,
            ubicacion: opcion.ubicacion
          }))
        }
      })

      const jsonStr = JSON.stringify(horarioData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `horario-utec-${new Date().toISOString().split('T')[0]}.json`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exportando JSON:', error)
      alert('Error al exportar los datos del horario')
    }
  }

  const resetearApp = () => {
    setCursosData({})
    setHorarioSeleccionado({})
    setCursoSeleccionando(null)
    setOpcionPrevisualizando(null)
    setArchivoSubido(false)
    setBusqueda('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const parsearHorario = (horario: string): HorarioInfo | null => {
    const match = horario.match(/(\w+)\.\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
    if (!match) return null

    const [_, dia, horaIni, minIni, horaFin, minFin] = match
    const dias: Record<string, number> = {
      'Lun': 0, 'Mar': 1, 'Mie': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5
    }

    return {
      dia: dias[dia] || 0,
      horaInicio: parseInt(horaIni) * 60 + parseInt(minIni),
      horaFin: parseInt(horaFin) * 60 + parseInt(minFin)
    }
  }

  const hayConflictoHorario = (inicio1: number, fin1: number, inicio2: number, fin2: number): boolean => {
    return !(fin1 <= inicio2 || fin2 <= inicio1)
  }

  const obtenerHorariosOpcion = (curso: Curso, numSeccion: string, opcionKey: string): string[] => {
    const seccion = curso.secciones[numSeccion]
    if (!seccion) return []

    const opcion = seccion.opciones[opcionKey]
    if (!opcion) return []

    const horarios = [...opcion.horarios]

    if (opcion.tipo.includes('Laboratorio')) {
      const teoria = Object.values(seccion.opciones).find(opt =>
        opt.tipo.includes('Teoría') && !opt.tipo.includes('Virtual') === !opcion.tipo.includes('Virtual')
      )
      if (teoria) {
        horarios.push(...teoria.horarios)
      }
    }

    return horarios
  }

  const verificarConflictoOpcion = (codigo: string, numSeccion: string, opcionKey: string): boolean => {
    const curso = cursosData[codigo]
    if (!curso) return true

    const horariosOpcion = obtenerHorariosOpcion(curso, numSeccion, opcionKey)

    for (const horario of horariosOpcion) {
      const parsed = parsearHorario(horario)
      if (!parsed) continue

      for (const [codigoCurso, infoSeleccionada] of Object.entries(horarioSeleccionado)) {
        if (codigoCurso === codigo) continue

        for (const opcionCurso of Object.values(infoSeleccionada.opciones)) {
          for (const horarioCurso of opcionCurso.horarios) {
            const parsedCurso = parsearHorario(horarioCurso)
            if (!parsedCurso) continue

            if (parsed.dia === parsedCurso.dia &&
              hayConflictoHorario(parsed.horaInicio, parsed.horaFin, parsedCurso.horaInicio, parsedCurso.horaFin)) {
              return true
            }
          }
        }
      }
    }

    return false
  }

  const verificarConflictoCurso = (codigo: string): boolean => {
    const curso = cursosData[codigo]
    if (!curso) return true

    for (const [numSeccion, seccion] of Object.entries(curso.secciones)) {
      for (const opcionKey of Object.keys(seccion.opciones)) {
        if (!verificarConflictoOpcion(codigo, numSeccion, opcionKey)) {
          return false
        }
      }
    }
    return true
  }

  const seleccionarOpcion = (codigo: string, numSeccion: string, opcionKey: string) => {
    const curso = cursosData[codigo]
    const seccion = curso.secciones[numSeccion]

    setHorarioSeleccionado(prev => ({
      ...prev,
      [codigo]: {
        seccion: numSeccion,
        opcion: opcionKey,
        opciones: seccion.opciones
      }
    }))

    setCursoSeleccionando(null)
    setOpcionPrevisualizando(null)
  }

  const eliminarCurso = (codigo: string) => {
    setHorarioSeleccionado(prev => {
      const nueva = { ...prev }
      delete nueva[codigo]
      return nueva
    })
  }

  const limpiarHorario = () => {
    setHorarioSeleccionado({})
    setCursoSeleccionando(null)
    setOpcionPrevisualizando(null)
  }

  const obtenerClasesOcupadas = (dia: number, hora: number): ClaseHorario[] => {
    const clases: ClaseHorario[] = []

    Object.entries(horarioSeleccionado).forEach(([codigo, info]) => {
      Object.entries(info.opciones).forEach(([_, opcion]) => {
        opcion.horarios.forEach(horario => {
          const parsed = parsearHorario(horario)
          if (parsed && parsed.dia === dia) {
            const horaInicioHora = Math.floor(parsed.horaInicio / 60)
            const horaFinHora = Math.floor(parsed.horaFin / 60)

            if (hora >= horaInicioHora && hora < horaFinHora) {
              clases.push({
                codigo,
                nombre: cursosData[codigo]?.nombre || '',
                tipo: opcion.tipo,
                ubicacion: opcion.ubicacion,
                docente: opcion.docente,
                seccion: info.seccion,
                esInicio: hora === horaInicioHora,
                duracion: horaFinHora - horaInicioHora,
                esPreview: false
              })
            }
          }
        })
      })
    })

    if (opcionPrevisualizando) {
      const curso = cursosData[opcionPrevisualizando.codigo]
      const seccion = curso?.secciones[opcionPrevisualizando.seccion]
      const opcion = seccion?.opciones[opcionPrevisualizando.opcion]

      if (opcion) {
        const horariosPreview = obtenerHorariosOpcion(curso, opcionPrevisualizando.seccion, opcionPrevisualizando.opcion)
        const tieneConflicto = verificarConflictoOpcion(opcionPrevisualizando.codigo, opcionPrevisualizando.seccion, opcionPrevisualizando.opcion)

        horariosPreview.forEach(horario => {
          const parsed = parsearHorario(horario)
          if (parsed && parsed.dia === dia) {
            const horaInicioHora = Math.floor(parsed.horaInicio / 60)
            const horaFinHora = Math.floor(parsed.horaFin / 60)

            if (hora >= horaInicioHora && hora < horaFinHora) {
              clases.push({
                codigo: opcionPrevisualizando.codigo,
                nombre: curso.nombre,
                tipo: opcion.tipo,
                ubicacion: opcion.ubicacion,
                docente: opcion.docente,
                seccion: opcionPrevisualizando.seccion,
                esInicio: hora === horaInicioHora,
                duracion: horaFinHora - horaInicioHora,
                esPreview: true,
                tieneConflicto
              })
            }
          }
        })
      }
    }

    return clases
  }

  const cursosFiltrados = Object.entries(cursosData).filter(([codigo, curso]) =>
    codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    curso.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agruparOpcionesPorTipo = (opciones: Record<string, OpcionCurso>) => {
    const teorias: Array<[string, OpcionCurso]> = []
    const laboratorios: Array<[string, OpcionCurso]> = []

    Object.entries(opciones).forEach(([key, opcion]) => {
      if (opcion.tipo.includes('Laboratorio')) {
        laboratorios.push([key, opcion])
      } else if (opcion.tipo.includes('Teoría')) {
        teorias.push([key, opcion])
      }
    })

    return { teorias, laboratorios }
  }

  if (!archivoSubido) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Generador de Horarios</CardTitle>
            <p className="text-gray-600 mt-2">Sube tu archivo JSON de cursos para comenzar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Arrastra tu archivo JSON aquí o haz click para seleccionar
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={cargando}
                className="w-full"
              >
                {cargando ? 'Procesando...' : 'Seleccionar Archivo JSON'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• El archivo debe estar en formato JSON</p>
              <p>• Debe contener la estructura de cursos, secciones y opciones</p>
              <p>• Generado por el parser de horarios UTEC</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Procesando archivo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Generador de Horarios</h1>
                <p className="text-sm text-gray-600">UTEC - Periodo 2025-2</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {Object.keys(cursosData).length} cursos cargados
              </Badge>
              <Badge variant="outline" className="text-sm">
                {Object.keys(horarioSeleccionado).length} seleccionados
              </Badge>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarHorario}
                  disabled={Object.keys(horarioSeleccionado).length === 0 || exportando}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportando ? 'Exportando...' : 'IMG'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarHorarioTexto}
                  disabled={Object.keys(horarioSeleccionado).length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarHorarioAlternativo}
                  disabled={Object.keys(horarioSeleccionado).length === 0}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetearApp}
              >
                <Upload className="w-4 h-4 mr-2" />
                Nuevo JSON
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={limpiarHorario}
                disabled={Object.keys(horarioSeleccionado).length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-1">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {cursoSeleccionando ? 'Seleccionar Sección' : 'Cursos Disponibles'}
                  </CardTitle>
                  {cursoSeleccionando && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCursoSeleccionando(null)
                        setOpcionPrevisualizando(null)
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {!cursoSeleccionando && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar curso..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px] px-4">
                  {!cursoSeleccionando ? (
                    <div className="space-y-3 pb-4">
                      {cursosFiltrados.map(([codigo, curso]) => {
                        const estaSeleccionado = !!horarioSeleccionado[codigo]
                        const tieneConflicto = !estaSeleccionado && verificarConflictoCurso(codigo)

                        return (
                          <Card
                            key={codigo}
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${estaSeleccionado
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : tieneConflicto
                                ? 'ring-2 ring-red-500 bg-red-50 opacity-60'
                                : 'hover:shadow-lg hover:scale-[1.02]'
                              }`}
                            onClick={() => {
                              if (estaSeleccionado) {
                                eliminarCurso(codigo)
                              } else if (!tieneConflicto) {
                                setCursoSeleccionando(codigo)
                                setOpcionPrevisualizando(null)
                              }
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-semibold text-gray-900">{codigo}</span>
                                    {estaSeleccionado && <Check className="w-4 h-4 text-blue-600" />}
                                    {tieneConflicto && <AlertTriangle className="w-4 h-4 text-red-600" />}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{curso.nombre}</p>
                                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                                    <Badge
                                      variant={curso.tipo_curso === 'Obligatorio' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {curso.tipo_curso}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {Object.keys(curso.secciones).length} secciones
                                    </span>
                                    {estaSeleccionado && (
                                      <>
                                        <Badge variant="outline" className="text-xs">
                                          Sec. {horarioSeleccionado[codigo].seccion}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {horarioSeleccionado[codigo].opciones[horarioSeleccionado[codigo].opcion]?.tipo.split(' ')[0]}
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                  {tieneConflicto && (
                                    <p className="text-xs text-red-600 mt-1">Conflicto de horario</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      <div className="text-center p-2">
                        <h3 className="font-semibold text-gray-900">{cursoSeleccionando}</h3>
                        <p className="text-sm text-gray-600">{cursosData[cursoSeleccionando]?.nombre}</p>
                      </div>

                      {Object.entries(cursosData[cursoSeleccionando]?.secciones || {}).map(([numSeccion, seccion]) => {
                        const { teorias, laboratorios } = agruparOpcionesPorTipo(seccion.opciones)

                        return (
                          <Card key={numSeccion} className="border-2">
                            <CardHeader className="pb-2">
                              <h4 className="font-semibold text-center">Sección {numSeccion}</h4>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {teorias.length > 0 && (
                                <div>
                                  <Badge variant="outline" className="mb-2">Teorías</Badge>
                                  <div className="space-y-2">
                                    {teorias.map(([keyTeo, teoria]) => {
                                      const tieneConflicto = verificarConflictoOpcion(cursoSeleccionando, numSeccion, keyTeo)
                                      const puedeSeleccionar = laboratorios.length === 0
                                      const estaEnPreview = opcionPrevisualizando?.codigo === cursoSeleccionando &&
                                        opcionPrevisualizando?.seccion === numSeccion &&
                                        opcionPrevisualizando?.opcion === keyTeo

                                      return (
                                        <div
                                          key={keyTeo}
                                          className={`p-2 rounded border text-xs ${estaEnPreview
                                            ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                                            : tieneConflicto
                                              ? 'border-red-300 bg-red-50'
                                              : puedeSeleccionar
                                                ? 'border-blue-300 bg-blue-50 cursor-pointer hover:bg-blue-100'
                                                : 'border-gray-200 bg-gray-50'
                                            }`}
                                          onMouseEnter={() => {
                                            if (!tieneConflicto) {
                                              setOpcionPrevisualizando({
                                                codigo: cursoSeleccionando,
                                                seccion: numSeccion,
                                                opcion: keyTeo
                                              })
                                            }
                                          }}
                                          onMouseLeave={() => {
                                            setOpcionPrevisualizando(null)
                                          }}
                                          onClick={() => {
                                            if (!tieneConflicto && puedeSeleccionar) {
                                              seleccionarOpcion(cursoSeleccionando, numSeccion, keyTeo)
                                            }
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="font-medium">{teoria.tipo} {teoria.codigo_subseccion}</div>
                                            {estaEnPreview && <Eye className="w-3 h-3 text-purple-600" />}
                                          </div>
                                          <div className="text-gray-600">{teoria.horarios.join(', ')}</div>
                                          <div className="flex items-center space-x-2 mt-1">
                                            <User className="w-3 h-3" />
                                            <span>{teoria.docente}</span>
                                          </div>
                                          {tieneConflicto && (
                                            <Badge variant="destructive" className="mt-1 text-xs">Conflicto</Badge>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {laboratorios.length > 0 && (
                                <div>
                                  <Badge className="mb-2">Laboratorios</Badge>
                                  <div className="space-y-2">
                                    {laboratorios.map(([keyLab, lab]) => {
                                      const tieneConflicto = verificarConflictoOpcion(cursoSeleccionando, numSeccion, keyLab)
                                      const estaEnPreview = opcionPrevisualizando?.codigo === cursoSeleccionando &&
                                        opcionPrevisualizando?.seccion === numSeccion &&
                                        opcionPrevisualizando?.opcion === keyLab

                                      return (
                                        <div
                                          key={keyLab}
                                          className={`p-2 rounded border text-xs cursor-pointer ${estaEnPreview
                                            ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                                            : tieneConflicto
                                              ? 'border-red-300 bg-red-50 opacity-60'
                                              : 'border-green-300 bg-green-50 hover:bg-green-100'
                                            }`}
                                          onMouseEnter={() => {
                                            setOpcionPrevisualizando({
                                              codigo: cursoSeleccionando,
                                              seccion: numSeccion,
                                              opcion: keyLab
                                            })
                                          }}
                                          onMouseLeave={() => {
                                            setOpcionPrevisualizando(null)
                                          }}
                                          onClick={() => {
                                            if (!tieneConflicto) {
                                              seleccionarOpcion(cursoSeleccionando, numSeccion, keyLab)
                                            }
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="font-medium">{lab.tipo} {lab.codigo_subseccion}</div>
                                            {estaEnPreview && <Eye className="w-3 h-3 text-purple-600" />}
                                          </div>
                                          <div className="text-gray-600">{lab.horarios.join(', ')}</div>
                                          <div className="flex items-center space-x-2 mt-1">
                                            <User className="w-3 h-3" />
                                            <span>{lab.docente}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <MapPin className="w-3 h-3" />
                                            <span>{lab.ubicacion}</span>
                                          </div>
                                          {tieneConflicto && (
                                            <Badge variant="destructive" className="mt-1 text-xs">Conflicto</Badge>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-3">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Mi Horario</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div ref={horarioRef} className="grid grid-cols-7 gap-1 min-w-[800px] bg-white p-4 rounded-lg">
                    <div className="p-3 bg-gray-100 rounded-lg font-semibold text-center text-sm">
                      Hora
                    </div>
                    {DIAS.map(dia => (
                      <div key={dia} className="p-3 bg-gray-100 rounded-lg font-semibold text-center text-sm">
                        {dia}
                      </div>
                    ))}

                    {HORAS.map(hora => (
                      <div key={hora} className="contents">
                        <div className="p-3 bg-gray-50 rounded-lg text-center text-sm font-medium border">
                          {hora}:00
                        </div>
                        {DIAS.map((_, diaIndex) => {
                          const clasesEnEstaHora = obtenerClasesOcupadas(diaIndex, hora)

                          return (
                            <div
                              key={`${diaIndex}-${hora}`}
                              className="min-h-[60px] border border-gray-200 rounded-lg p-1 relative"
                            >
                              {clasesEnEstaHora.map((clase, index) => (
                                clase.esInicio && (
                                  <div
                                    key={index}
                                    className={`absolute inset-1 rounded-md p-2 text-xs text-white shadow-sm transition-all ${clase.esPreview
                                      ? clase.tieneConflicto
                                        ? 'bg-gradient-to-r from-red-300 to-red-400 opacity-60 border-2 border-red-500'
                                        : 'bg-gradient-to-r from-gray-400 to-gray-500 opacity-70 border-2 border-gray-600'
                                      : clase.tipo.includes('Teoría')
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 cursor-pointer hover:opacity-80'
                                        : 'bg-gradient-to-r from-green-500 to-green-600 cursor-pointer hover:opacity-80'
                                      }`}
                                    style={{
                                      height: `${clase.duracion * 60 - 8}px`,
                                      zIndex: clase.esPreview ? 5 : 10
                                    }}
                                    onClick={() => {
                                      if (!clase.esPreview) {
                                        eliminarCurso(clase.codigo)
                                      }
                                    }}
                                    title={clase.esPreview ? 'Vista previa' : 'Click para eliminar'}
                                  >
                                    <div className="font-semibold truncate">
                                      {clase.codigo} {clase.esPreview && '(Vista previa)'}
                                    </div>
                                    <div className="text-xs opacity-90 truncate">
                                      {clase.tipo} - Sec. {clase.seccion}
                                    </div>
                                    <div className="text-xs opacity-75 truncate flex items-center">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {clase.ubicacion.split(' ')[1] || clase.ubicacion}
                                    </div>
                                    {clase.esPreview && clase.tieneConflicto && (
                                      <div className="text-xs opacity-90 font-bold">¡CONFLICTO!</div>
                                    )}
                                  </div>
                                )
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}