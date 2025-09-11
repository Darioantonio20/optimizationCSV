import React, { useState, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, Calendar, CheckCircle, List, Wifi, Map } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import CodeConverter from './CodeConverter.jsx';
import WifiReport from './WifiReport.jsx';
import GpsReport from './GpsReport.jsx';

function App() {
  const [currentView, setCurrentView] = useState('csv'); // 'csv' or 'codes'
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

  // Function to determine funcionamiento status
  const determineFuncionamiento = (row, headers) => {
    // Find column G and I by index (0-based, so G=6, I=8)
    const columnGKey = headers[6]; // Column G (7th column, 0-indexed)
    const columnIKey = headers[8]; // Column I (9th column, 0-indexed)
    
    const columnGValue = row[columnGKey];
    const columnIValue = row[columnIKey];
    
    // Check if column G is "online"
    const isOnline = columnGValue && columnGValue.toString().toLowerCase() === 'online';
    
    // Check if column I is TRUE, "True", or 1
    const isTrueValue = columnIValue === true || 
                       columnIValue === 'True' || 
                       columnIValue === 'true' || 
                       columnIValue === 1 || 
                       columnIValue === '1';
    
    // Apply the formula: IF(AND(G="online", NOT(OR(I=TRUE, I="True", I=1))), "Funciona", "No funciona")
    if (isOnline && !isTrueValue) {
      return 'Funciona';
    } else {
      return 'No funciona';
    }
  };

  // Process CSV data and convert ISO dates
  const processCSVData = (data) => {
    if (!data || data.length === 0) return data;
    
    // Get headers from first row
    const headers = Object.keys(data[0]);
    
    return data.map(row => {
      const processedRow = {};
      const originalKeys = Object.keys(row);
      
      // Process each column in order
      originalKeys.forEach((key, index) => {
        if (index === 1) {
          // Column B becomes EQUIPO
          processedRow['EQUIPO'] = row[key];
        } else {
          processedRow[key] = row[key];
        }
      });
      
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
      
      // Add funcionamiento column
      processedRow['Funcionamiento'] = determineFuncionamiento(row, headers);
      
      // Add Status column for preview (will be added as formula in Excel)
      processedRow['Status'] = 'Fórmula BUSCARV';
      
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
      
      // Prepare data with proper headers (remove Status from data since it will be added as formula)
      const processedData = csvData.map((row, index) => {
        const newRow = { ...row };
        
        // Remove Status column from data (will be added as formula)
        delete newRow['Status'];
        
        return newRow;
      });
      
      const ws = XLSX.utils.json_to_sheet(processedData);
      
      // Add Status column with instruction text in P2
      const headers = Object.keys(processedData[0]);
      const statusColumnIndex = headers.length; // Next available column
      
      // Add Status header
      const statusHeaderCell = XLSX.utils.encode_cell({ r: 0, c: statusColumnIndex });
      ws[statusHeaderCell] = { t: 's', v: 'Status' };

      // Put instruction text with the exact formula in P2 (row index 1)
      const instructionCell = XLSX.utils.encode_cell({ r: 1, c: statusColumnIndex });
      ws[instructionCell] = {
        t: 's',
        v: "Pon esta fórmula y arrástrala hacia abajo: =BUSCARV(B2;'https://experienciasxcaret.sharepoint.com/sites/PRUEBA182-Controllogstico/Documentos compartidos/Control logístico/Control/Monitoreo 2024/[Status de unidades zonas.xlsx]Flotilla Septiembre 2025'!$A:$M;13;FALSO)"
      };

      // Auto-size columns
      const colWidths = [];
      const allHeaders = [...headers, 'Status'];
      
      allHeaders.forEach((header, index) => {
        let maxWidth = header.length;
        processedData.forEach(row => {
          const cellValue = String(row[header] || '');
          maxWidth = Math.max(maxWidth, cellValue.length);
        });
        colWidths[index] = { wch: Math.min(maxWidth + 2, 50) };
      });
      
      ws['!cols'] = colWidths;
      
      // Update range to include Status column
      const range = XLSX.utils.decode_range(ws['!ref']);
      range.e.c = statusColumnIndex;
      ws['!ref'] = XLSX.utils.encode_range(range);

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
      {/* Navigation Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <button
          onClick={() => setCurrentView('csv')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentView === 'csv' ? '#667eea' : '#f8fafc',
            color: currentView === 'csv' ? 'white' : '#64748b',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <FileSpreadsheet size={20} />
          Cámara csv - excel
        </button>
        <button
          onClick={() => setCurrentView('codes')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentView === 'codes' ? '#667eea' : '#f8fafc',
            color: currentView === 'codes' ? 'white' : '#64748b',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <List size={20} />
          Conversor Códigos Geotab
        </button>
        <button
          onClick={() => setCurrentView('wifi')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentView === 'wifi' ? '#667eea' : '#f8fafc',
            color: currentView === 'wifi' ? 'white' : '#64748b',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <Wifi size={20} />
          Reporte WIFI
        </button>
        <button
          onClick={() => setCurrentView('gps')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentView === 'gps' ? '#667eea' : '#f8fafc',
            color: currentView === 'gps' ? 'white' : '#64748b',
            border: '2px solid #667eea',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <Map size={20} />
          Reporte GPS
        </button>
      </div>

      {/* Render current view */}
      {currentView === 'codes' ? (
        <CodeConverter />
      ) : currentView === 'wifi' ? (
        <WifiReport />
      ) : currentView === 'gps' ? (
        <GpsReport />
      ) : (
        <>
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
                <h3>Vista previa de datos ({csvData.length} filas):</h3>
                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table className="preview-table">
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                      <tr>
                        {Object.keys(csvData[0]).map((header, index) => (
                          <th key={index} style={{ padding: '12px 8px', borderBottom: '2px solid #e2e8f0' }}>
                            {header.includes('ISO 8601') ? (
                              <>
                                <Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                {header.replace(' (formato ISO 8601)', '')}
                              </>
                            ) : header === 'Funcionamiento' ? (
                              <>
                                <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
                                {header}
                              </>
                            ) : header === 'Status' ? (
                              <>
                                <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px', color: '#667eea' }} />
                                {header}
                              </>
                            ) : header === 'EQUIPO' ? (
                              <>
                                <FileSpreadsheet size={16} style={{ display: 'inline', marginRight: '4px', color: '#667eea' }} />
                                {header}
                              </>
                            ) : (
                              header
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, rowIndex) => (
                        <tr key={rowIndex} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {Object.entries(row).map(([key, cell], cellIndex) => (
                            <td key={cellIndex} style={{
                              padding: '8px',
                              fontSize: '13px',
                              ...(key === 'Funcionamiento' ? {
                                color: cell === 'Funciona' ? '#10b981' : '#ef4444',
                                fontWeight: 'bold'
                              } : key === 'Status' ? {
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: '#6366f1',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              } : key === 'EQUIPO' ? {
                                fontWeight: '600',
                                color: '#374151'
                              } : {})
                            }}>
                              {cell || 'N/A'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '8px' }}>
                <h4>Características:</h4>
                <ul style={{ textAlign: 'left', color: '#666' }}>
                  <li>✅ Conversión automática de fechas ISO 8601 a formato legible</li>
                  <li>✅ Columna automática de "Funcionamiento" basada en estado online</li>
                  <li>✅ Columna "Status" con fórmula BUSCARV automática</li>
                  <li>✅ Renombrado automático de columna B a "EQUIPO"</li>
                  <li>✅ Vista previa completa de todos los datos</li>
                  <li>✅ Soporte para arrastrar y soltar archivos</li>
                  <li>✅ Columnas auto-ajustables en Excel</li>
                  <li>✅ Manejo de errores y validación de archivos</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );

}

export default App;
