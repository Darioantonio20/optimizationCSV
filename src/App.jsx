import React, { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, Calendar, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function App() {
  const [csvData, setCsvData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to format ISO 8601 dates to readable format (date only)
  const formatISO8601Date = (isoString) => {
    if (!isoString || isoString === '' || isoString === 'N/A') {
      return isoString;
    }
    
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return isoString; // Return original if not a valid date
      }
      
      // Format to: DD/MM/YYYY (date only, no time)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return isoString; // Return original if error
    }
  };

  // Process CSV data and convert ISO dates
  const processCSVData = (data) => {
    return data.map(row => {
      const processedRow = { ...row };
      
      // Convert ISO 8601 dates for specific columns
      if (processedRow['Última hora registrada (formato ISO 8601)']) {
        processedRow['Última hora registrada'] = formatISO8601Date(
          processedRow['Última hora registrada (formato ISO 8601)']
        );
        delete processedRow['Última hora registrada (formato ISO 8601)'];
      }
      
      if (processedRow['Hora de la última vista (formato ISO 8601)']) {
        processedRow['Hora de la última vista'] = formatISO8601Date(
          processedRow['Hora de la última vista (formato ISO 8601)']
        );
        delete processedRow['Hora de la última vista (formato ISO 8601)'];
      }
      
      return processedRow;
    });
  };

  const handleFileUpload = useCallback((file) => {
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor, selecciona un archivo CSV válido.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            setError('Error al procesar el archivo CSV: ' + results.errors[0].message);
            setIsLoading(false);
            return;
          }

          const processedData = processCSVData(results.data);
          setCsvData(processedData);
          setSuccess(`Archivo CSV cargado exitosamente. ${processedData.length} filas encontradas.`);
        } catch (err) {
          setError('Error al procesar los datos: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      },
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8'
    });
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const convertToExcel = () => {
    if (!csvData || csvData.length === 0) {
      setError('No hay datos para convertir.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(csvData);

      // Auto-size columns
      const colWidths = [];
      const headers = Object.keys(csvData[0]);
      
      headers.forEach((header, index) => {
        let maxWidth = header.length;
        csvData.forEach(row => {
          const cellValue = String(row[header] || '');
          maxWidth = Math.max(maxWidth, cellValue.length);
        });
        colWidths[index] = { wch: Math.min(maxWidth + 2, 50) };
      });
      
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');

      // Generate Excel file and download
      const excelFileName = fileName.replace('.csv', '.xlsx');
      XLSX.writeFile(wb, excelFileName);
      
      setSuccess(`Archivo Excel generado y descargado: ${excelFileName}`);
    } catch (err) {
      setError('Error al generar el archivo Excel: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Conversor CSV a Excel</h1>
      <p className="subtitle">
        Convierte archivos CSV a Excel con formato de fechas mejorado
      </p>

      <div
        className={`upload-area ${isLoading ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isLoading && document.getElementById('fileInput').click()}
      >
        <Upload size={48} style={{ color: '#667eea', marginBottom: '1rem' }} />
        <h3>Arrastra tu archivo CSV aquí</h3>
        <p>o haz clic para seleccionar un archivo</p>
        <input
          id="fileInput"
          type="file"
          accept=".csv"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          className="file-input"
          disabled={isLoading}
        />
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Procesando archivo...</span>
        </div>
      )}

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="success">
          <CheckCircle size={20} style={{ display: 'inline', marginRight: '8px' }} />
          {success}
        </div>
      )}

      {fileName && (
        <div className="file-info">
          <FileSpreadsheet size={20} style={{ display: 'inline', marginRight: '8px' }} />
          <strong>Archivo seleccionado:</strong> {fileName}
        </div>
      )}

      {csvData && csvData.length > 0 && (
        <>
          <button
            className="convert-button"
            onClick={convertToExcel}
            disabled={isLoading}
          >
            <Download size={20} />
            Convertir a Excel
          </button>

          <div style={{ marginTop: '2rem' }}>
            <h3>Vista previa de datos (primeras 5 filas):</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    {Object.keys(csvData[0]).map((header, index) => (
                      <th key={index}>
                        {header.includes('ISO 8601') ? (
                          <>
                            <Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} />
                            {header.replace(' (formato ISO 8601)', '')}
                          </>
                        ) : (
                          header
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {Object.values(row).map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell || 'N/A'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvData.length > 5 && (
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                ... y {csvData.length - 5} filas más
              </p>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '8px' }}>
        <h4>Características:</h4>
        <ul style={{ textAlign: 'left', color: '#666' }}>
          <li>✅ Conversión automática de fechas ISO 8601 a formato legible</li>
          <li>✅ Soporte para arrastrar y soltar archivos</li>
          <li>✅ Vista previa de datos antes de la conversión</li>
          <li>✅ Columnas auto-ajustables en Excel</li>
          <li>✅ Manejo de errores y validación de archivos</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
