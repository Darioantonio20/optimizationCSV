# CSV to Excel Converter

Una aplicación web moderna construida con React y Vite que permite convertir archivos CSV a formato Excel con conversión automática de fechas ISO 8601 a formato legible.

## Características

- ✅ **Conversión CSV a Excel**: Convierte archivos CSV a formato .xlsx
- ✅ **Formato de fechas mejorado**: Convierte automáticamente fechas ISO 8601 a formato DD/MM/YYYY HH:MM:SS
- ✅ **Interfaz moderna**: UI atractiva con efectos visuales y animaciones
- ✅ **Drag & Drop**: Arrastra y suelta archivos CSV directamente
- ✅ **Vista previa**: Muestra una vista previa de los datos antes de convertir
- ✅ **Columnas auto-ajustables**: Las columnas en Excel se ajustan automáticamente al contenido
- ✅ **Manejo de errores**: Validación completa de archivos y manejo de errores

## Columnas soportadas

La aplicación está optimizada para trabajar con las siguientes columnas:

- ID
- Activo
- Número de serie
- Socio
- Modelo de cámara
- ID de la cámara
- Estado del dispositivo
- Incorporado
- Dispositivo eliminado
- VIN
- Grupos
- Último estado de grabación
- **Última hora registrada (formato ISO 8601)** → Se convierte a formato legible
- **Hora de la última vista (formato ISO 8601)** → Se convierte a formato legible

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor de desarrollo:
```bash
npm run dev
```

3. Abre tu navegador en `http://localhost:5173`

## Uso

1. **Subir archivo**: Arrastra un archivo CSV a la zona de carga o haz clic para seleccionar
2. **Vista previa**: Revisa los datos en la tabla de vista previa
3. **Convertir**: Haz clic en "Convertir a Excel" para generar y descargar el archivo .xlsx

## Tecnologías utilizadas

- **React 18**: Framework de interfaz de usuario
- **Vite**: Herramienta de construcción rápida
- **PapaParse**: Librería para parsear archivos CSV
- **SheetJS (xlsx)**: Librería para generar archivos Excel
- **Lucide React**: Iconos modernos
- **CSS3**: Estilos modernos con gradientes y animaciones

## Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run preview`: Vista previa de la construcción de producción
- `npm run lint`: Ejecuta el linter de código

## Formato de fechas

Las fechas en formato ISO 8601 (ejemplo: `2023-12-25T14:30:00.000Z`) se convierten automáticamente a formato legible español (ejemplo: `25/12/2023 14:30:00`).
