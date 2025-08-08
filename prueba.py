import pdfplumber
import re
import json
from collections import defaultdict


class CursoExtractorJSON:
    def __init__(self):
        self.cursos = {}
        self.datos_raw = []

    def extraer_datos_pdf(self, archivo_pdf):
        try:
            with pdfplumber.open(archivo_pdf) as pdf:
                todos_los_datos = []

                for page in pdf.pages:
                    tables = page.extract_tables()

                    if tables:
                        for table in tables:
                            for row in table:
                                if row and self._es_fila_datos(row):
                                    fila_limpia = self._limpiar_fila(row)
                                    if fila_limpia:
                                        todos_los_datos.append(fila_limpia)
                    else:
                        text = page.extract_text()
                        if text:
                            datos_texto = self._extraer_desde_texto(text)
                            todos_los_datos.extend(datos_texto)

                self.datos_raw = todos_los_datos

        except Exception as e:
            print(f"Error procesando PDF: {e}")

    def _es_fila_datos(self, row):
        if not row or len(row) < 8:
            return False

        primer_elemento = str(row[0]).strip() if row[0] else ""
        patron_codigo = r'^[A-Z]{2}\d{4}|^[A-Z]{3}\d{3}|^[A-Z]{2}\d{3}'

        return bool(re.match(patron_codigo, primer_elemento))

    def _limpiar_fila(self, row):
        fila_limpia = []

        for cell in row:
            if cell is None:
                fila_limpia.append("")
            else:
                cell_clean = str(cell).strip().replace('\n', ' ')
                fila_limpia.append(cell_clean)

        if len(fila_limpia) >= 12:
            return fila_limpia

        return None

    def _extraer_desde_texto(self, text):
        datos = []
        lineas = text.split('\n')

        for linea in lineas:
            if linea.strip():
                if re.search(r'^[A-Z]{2}\d{4}', linea.strip()):
                    partes = self._dividir_linea_tabla(linea)
                    if partes and len(partes) >= 12:
                        datos.append(partes)

        return datos

    def _dividir_linea_tabla(self, linea):
        partes = re.split(r'\s{2,}', linea.strip())

        if len(partes) < 12:
            partes = linea.split('\t')

        return partes if len(partes) >= 12 else None

    def procesar_datos(self):
        for fila in self.datos_raw:
            try:
                if len(fila) >= 12:
                    codigo_curso = fila[0].strip()
                    nombre_curso = fila[1].strip()
                    docente = fila[2].strip() if len(fila) > 2 else ""
                    malla = fila[3].strip() if len(fila) > 3 else ""
                    tipo_curso = fila[4].strip() if len(fila) > 4 else ""
                    modalidad = fila[5].strip() if len(fila) > 5 else ""
                    seccion = fila[6].strip() if len(fila) > 6 else ""
                    sesion_grupo = fila[7].strip() if len(fila) > 7 else ""
                    horario = fila[8].strip() if len(fila) > 8 else ""
                    frecuencia = fila[9].strip() if len(fila) > 9 else ""
                    ubicacion = fila[10].strip() if len(fila) > 10 else ""
                    vacantes = fila[11].strip() if len(fila) > 11 else "0"
                    matriculados = fila[12].strip() if len(fila) > 12 else "0"

                    if codigo_curso and nombre_curso:
                        self._agregar_seccion(
                            codigo_curso, nombre_curso, docente, malla,
                            tipo_curso, modalidad, seccion, sesion_grupo,
                            horario, frecuencia, ubicacion, vacantes, matriculados
                        )

            except Exception as e:
                continue

    def _agregar_seccion(self, codigo_curso, nombre_curso, docente, malla, tipo_curso,
                         modalidad, seccion, sesion_grupo, horario, frecuencia,
                         ubicacion, vacantes, matriculados):

        if codigo_curso not in self.cursos:
            self.cursos[codigo_curso] = {
                'nombre': nombre_curso,
                'malla': malla,
                'tipo_curso': tipo_curso,
                'secciones': {}
            }

        tipo_sesion, numero_principal = self._parsear_sesion_por_numero(
            sesion_grupo)

        clave_seccion = str(seccion) if seccion else "1"

        if clave_seccion not in self.cursos[codigo_curso]['secciones']:
            self.cursos[codigo_curso]['secciones'][clave_seccion] = {
                'numero_seccion': clave_seccion,
                'opciones': {}
            }

        clave_opcion = self._generar_clave_por_numero(
            tipo_sesion, numero_principal)

        if clave_opcion not in self.cursos[codigo_curso]['secciones'][clave_seccion]['opciones']:
            self.cursos[codigo_curso]['secciones'][clave_seccion]['opciones'][clave_opcion] = {
                'tipo': self._limpiar_tipo_sesion(tipo_sesion),
                'codigo_subseccion': numero_principal.zfill(2),
                'docente': docente,
                'modalidad': modalidad,
                'horarios': [],
                'ubicacion': ubicacion,
                'vacantes': self._extraer_numero(vacantes),
                'matriculados': self._extraer_numero(matriculados)
            }

        opcion_existente = self.cursos[codigo_curso]['secciones'][clave_seccion]['opciones'][clave_opcion]

        if horario not in opcion_existente['horarios']:
            opcion_existente['horarios'].append(horario)

        es_virtual = 'virtual' in tipo_sesion.lower()
        tiene_subseccion = '.' in sesion_grupo

        if not es_virtual or not tiene_subseccion:
            if opcion_existente['docente'] != docente and docente:
                if not opcion_existente['docente']:
                    opcion_existente['docente'] = docente

            if opcion_existente['ubicacion'] != ubicacion and ubicacion:
                if opcion_existente['ubicacion'] and ubicacion not in opcion_existente['ubicacion']:
                    opcion_existente['ubicacion'] = f"{opcion_existente['ubicacion']}, {ubicacion}"
                elif not opcion_existente['ubicacion']:
                    opcion_existente['ubicacion'] = ubicacion

            opcion_existente['vacantes'] = max(
                opcion_existente['vacantes'], self._extraer_numero(vacantes))
            opcion_existente['matriculados'] = max(
                opcion_existente['matriculados'], self._extraer_numero(matriculados))

    def _parsear_sesion_por_numero(self, sesion_grupo):
        if not sesion_grupo:
            return 'Desconocido', '1'

        sesion_grupo = sesion_grupo.strip()

        patrones = [
            (r'(Teoría Virtual)\s+(\d+)(?:\.(\d+))?', 'Teoría Virtual'),
            (r'(Laboratorio Virtual)\s+(\d+)(?:\.(\d+))?', 'Laboratorio Virtual'),
            (r'(Teoría)\s+(\d+)(?:\.(\d+))?', 'Teoría'),
            (r'(Laboratorio)\s+(\d+)(?:\.(\d+))?', 'Laboratorio')
        ]

        for patron, tipo_base in patrones:
            match = re.search(patron, sesion_grupo, re.IGNORECASE)
            if match:
                tipo = match.group(1)
                numero_principal = match.group(2)
                subseccion = match.group(3)

                if 'virtual' in tipo.lower():
                    if subseccion and subseccion != '00':
                        return tipo, subseccion
                    else:
                        return tipo, numero_principal
                elif 'laboratorio' in tipo.lower():
                    if subseccion and subseccion != '00':
                        return tipo, subseccion
                    else:
                        return tipo, "01"
                else:
                    return tipo, numero_principal

        return 'Desconocido', '1'

    def _generar_clave_por_numero(self, tipo_sesion, numero_principal):
        tipo_lower = tipo_sesion.lower()

        if 'virtual' in tipo_lower:
            if 'teoría' in tipo_lower or 'teoria' in tipo_lower:
                return f"teoria_virtual_{numero_principal.zfill(2)}"
            elif 'laboratorio' in tipo_lower:
                return f"laboratorio_virtual_{numero_principal.zfill(2)}"
        else:
            if 'teoría' in tipo_lower or 'teoria' in tipo_lower:
                return f"teoria_{numero_principal.zfill(2)}"
            elif 'laboratorio' in tipo_lower:
                return f"laboratorio_{numero_principal.zfill(2)}"

        return f"desconocido_{numero_principal.zfill(2)}"

    def _limpiar_tipo_sesion(self, tipo_sesion):
        parts = tipo_sesion.split()
        if len(parts) > 2 and parts[-1].isdigit():
            return ' '.join(parts[:-1])
        return tipo_sesion

    def _extraer_numero(self, texto):
        if not texto:
            return 0

        match = re.search(r'\d+', str(texto))
        return int(match.group()) if match else 0

    def guardar_json(self, archivo_salida="cursos_horarios.json"):
        with open(archivo_salida, 'w', encoding='utf-8') as f:
            json.dump(self.cursos, f, ensure_ascii=False, indent=2)
        print(f"Datos guardados en: {archivo_salida}")

    def mostrar_estructura_ejemplo(self):
        if self.cursos:
            print("\n=== ESTRUCTURA GENERADA ===")
            for codigo, curso in self.cursos.items():
                print(f"\n{codigo}: {curso['nombre']}")
                for num_seccion, seccion in curso['secciones'].items():
                    print(f"  Sección {num_seccion}:")
                    for opcion_key, opcion in seccion['opciones'].items():
                        print(f"    {opcion_key}:")
                        print(f"      Tipo: {opcion['tipo']}")
                        print(f"      Horarios: {opcion['horarios']}")
                        print(f"      Docente: {opcion['docente']}")

    def obtener_estadisticas(self):
        total_cursos = len(self.cursos)
        total_secciones = sum(len(curso['secciones'])
                              for curso in self.cursos.values())
        total_opciones = 0

        for curso in self.cursos.values():
            for seccion in curso['secciones'].values():
                total_opciones += len(seccion['opciones'])

        stats = {
            'total_cursos': total_cursos,
            'total_secciones': total_secciones,
            'total_opciones': total_opciones
        }

        print(f"Estadísticas: {stats}")
        return stats


def procesar_datos_manuales():
    extractor = CursoExtractorJSON()

    datos_ejemplo = [
        ["CS5101", "Proyecto Final de Ciencia de la Computación I", "Fiestas Iquira, Jose Antonio", "CS-2021-1", "Obligatorio",
            "Sincronico", "1", "Teoría Virtual 1.04", "Mie. 15:00 - 18:00", "Semana General", "UTEC-BA Virtual 121", "7", "0"],
        ["CS5101", "Proyecto Final de Ciencia de la Computación I", "Villegas Suárez, Ariana Mirella", "CS-2021-1", "Obligatorio",
            "Sincronico", "1", "Teoría Virtual 1.05", "Jue. 16:00 - 19:00", "Semana General", "UTEC-BA Virtual 121", "7", "0"],
        ["CS5101", "Proyecto Final de Ciencia de la Computación I", "Lopez Del Alamo, Cristian Jose", "CS-2021-1", "Obligatorio",
            "Sincronico", "1", "Teoría Virtual 1.02", "Mie. 16:00 - 19:00", "Semana General", "UTEC-BA Virtual 114", "7", "2"],
        ["CS5101", "Proyecto Final de Ciencia de la Computación I", "Mora Cloque, Rensso Victor Hugo", "CS-2021-1", "Obligatorio",
            "Sincronico", "1", "Teoría Virtual 1", "Lun. 15:00 - 16:00", "Semana General", "UTEC-BA Virtual 105", "49", "4"],
        ["GI5101", "Estrategia y Organizaciones", "Gutierrez Zevallos, Cristian", "CS-2021-1", "Obligatorio",
            "Presencial", "3", "Teoría 3", "Jue. 16:00 - 18:00", "Semana General", "UTEC-BA A706(44)", "30", "8"],
        ["GI5101", "Estrategia y Organizaciones", "Gutierrez Zevallos, Cristian", "CS-2021-1", "Obligatorio",
            "Presencial", "3", "Teoría 3.01", "Mie. 10:00 - 11:00", "Semana General", "UTEC-BA A1002(44)", "30", "8"],
        ["GI5101", "Estrategia y Organizaciones", "Estrada Merino, Alfredo", "CS-2021-1", "Obligatorio",
            "Presencial", "5", "Teoría 5", "Lun. 08:00 - 10:00", "Semana General", "UTEC-BA A903(46)", "30", "0"],
        ["GI5101", "Estrategia y Organizaciones", "Estrada Merino, Alfredo", "CS-2021-1", "Obligatorio",
            "Presencial", "5", "Teoría 5.01", "Jue. 18:00 - 19:00", "Semana General", "UTEC-BA A903(46)", "30", "0"],
        ["GI5101", "Estrategia y Organizaciones", "Estrada Merino, Alfredo", "CS-2021-1", "Obligatorio",
            "Presencial", "8", "Teoría 8", "Lun. 20:00 - 22:00", "Semana General", "UTEC-BA A905(44)", "30", "3"],
        ["GI5101", "Estrategia y Organizaciones", "Estrada Merino, Alfredo", "CS-2021-1", "Obligatorio",
            "Presencial", "8", "Teoría 8", "Vie. 16:00 - 17:00", "Semana General", "UTEC-BA A701(44)", "30", "3"],
        ["CS4052", "Computación Paralela y Distribuida", "Fiestas Iquira, Jose Antonio", "CS-2021-1", "Obligatorio",
            "Presencial", "1", "Laboratorio 1.01", "Mar. 16:00 - 18:00", "Semana General", "UTEC-BA M803(45)", "43", "0"],
        ["CS4052", "Computación Paralela y Distribuida", "Fiestas Iquira, Jose Antonio", "CS-2021-1", "Obligatorio",
            "Presencial", "1", "Laboratorio 1.01", "Jue. 16:00 - 18:00", "Semana General", "UTEC-BA M801(45)", "43", "0"],
        ["CS4052", "Computación Paralela y Distribuida", "Fiestas Iquira, Jose Antonio", "CS-2021-1", "Obligatorio",
            "Presencial", "1", "Laboratorio 1.02", "Vie. 18:00 - 20:00", "Semana General", "UTEC-BA M805(45)", "43", "0"]
    ]

    extractor.datos_raw = datos_ejemplo
    extractor.procesar_datos()

    print("\n=== RESULTADO ESPERADO ===")
    print("CS5101 Sección 1 debería tener:")
    print("- teoria_virtual_04 (para Teoría Virtual 1.04)")
    print("- teoria_virtual_05 (para Teoría Virtual 1.05)")
    print("- teoria_virtual_02 (para Teoría Virtual 1.02)")
    print("- teoria_virtual_01 (para Teoría Virtual 1)")
    print("GI5101 debería tener:")
    print("- teoria_03 (para Teoría 3 y 3.01 AGRUPADOS)")
    print("- teoria_05 (para Teoría 5 y 5.01 AGRUPADOS)")
    print("- teoria_08 (para ambos Teoría 8 AGRUPADOS)")
    print("CS4052 debería tener:")
    print("- laboratorio_01 (para ambos Laboratorio 1.01 AGRUPADOS)")
    print("- laboratorio_02 (para Laboratorio 1.02)")

    return extractor


def main():
    archivo_pdf = "a.pdf"

    print("=== PROBANDO AGRUPACIÓN POR NUMERO ===")
    extractor_prueba = procesar_datos_manuales()
    extractor_prueba.mostrar_estructura_ejemplo()

    try:
        extractor = CursoExtractorJSON()
        extractor.extraer_datos_pdf(archivo_pdf)
        extractor.procesar_datos()

        extractor.obtener_estadisticas()
        extractor.guardar_json()
        extractor.mostrar_estructura_ejemplo()

        return extractor

    except FileNotFoundError:
        print(
            f"\nArchivo {archivo_pdf} no encontrado. Usando datos de ejemplo...")
        extractor_prueba.guardar_json()
        return extractor_prueba
    except Exception as e:
        print(f"Error: {e}")
        return None


if __name__ == "__main__":
    extractor = main()
