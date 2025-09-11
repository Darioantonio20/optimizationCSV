import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Wifi, Upload, CheckCircle } from 'lucide-react';

function WifiReport() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parseText = useCallback((text) => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    const data = lines.map((l, i) => ({ index: i + 1, valor: l }));
    setRows(data);
  }, []);

  const onTextChange = () => {};

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Selecciona un archivo CSV válido');
      return;
    }
    setError('');
    setSuccess('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          setError(res.errors[0].message);
          return;
        }
        setRows(res.data);
        // Export immediately to Excel
        exportToExcel(res.data, file.name);
        setSuccess(`Archivo Excel generado a partir de ${file.name}`);
      }
    });
  };

  const copyCSV = async () => {};

  const exportToExcel = (dataArg, sourceName) => {
    const data = dataArg ?? rows;
    if (!data || data.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();
      // Ensure we have consistent keys
      const headers = Object.keys(data[0] || { valor: '' });
      const normalized = data.map(r => {
        const obj = {};
        headers.forEach(h => { obj[h] = r[h] ?? ''; });
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(normalized);

      // Auto-size columns
      const colWidths = headers.map(h => {
        let max = String(h).length;
        normalized.forEach(r => {
          const len = String(r[h] ?? '').length;
          if (len > max) max = len;
        });
        return { wch: Math.min(max + 2, 60) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'WIFI');

      const fileName = sourceName ? sourceName.replace(/\.csv$/i, '_wifi.xlsx') : 'reporte_wifi.xlsx';
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error('Error exportando a Excel', e);
      setError('Error al exportar a Excel: ' + (e?.message || e));
    }
  };

  return (
    <div className="container">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wifi size={22} style={{ color: '#667eea' }} /> Reporte WIFI
      </h1>
      <p className="subtitle">Sube tu archivo CSV de WIFI y lo convertimos automáticamente a Excel.</p>

      <div
        style={{
          marginTop: 16,
          padding: '2rem',
          border: '2px dashed #e2e8f0',
          borderRadius: 12,
          textAlign: 'center',
          background: '#f8fafc'
        }}
      >
        <Upload size={40} style={{ color: '#667eea', marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>Arrastra y suelta tu CSV aquí o haz clic para seleccionarlo</div>
        <label htmlFor="wifiCsv" style={{ display: 'inline-block', cursor: 'pointer', background: '#667eea', color: 'white', padding: '10px 14px', borderRadius: 8 }}>
          Seleccionar archivo CSV
        </label>
        <input id="wifiCsv" type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {success && (
        <div className="success" style={{ marginTop: 16 }}>
          <CheckCircle size={18} style={{ display: 'inline', marginRight: 8 }} /> {success}
        </div>
      )}

      {error && (
        <div className="error" style={{ marginTop: 16 }}>{error}</div>
      )}
    </div>
  );
}

export default WifiReport;
