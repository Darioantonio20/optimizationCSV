import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Map, Upload } from 'lucide-react';

function GpsReport() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  // Helpers to normalize headers and auto-detect column names
  const normalize = (s = '') =>
    String(s)
      .replace(/\u00A0/g, ' ') // non-breaking space
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  const detectColumns = (data) => {
    const keys = Object.keys(data[0] || {});
    const normalizedMap = new Map(keys.map(k => [normalize(k), k]));

    // vehiculo
    const vehiculoKey =
      normalizedMap.get('vehiculo') ||
      Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('vehiculo'))?.[1];

    // estado (prefer "estado", then "estado del dispositivo", then "informacion adicional de estado")
    const estadoKey =
      normalizedMap.get('estado') ||
      Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('estado del dispositivo'))?.[1] ||
      Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('informacion adicional de estado'))?.[1];

    // dias desde comunicacion
    const diasCommKey =
      normalizedMap.get('dias desde que se recibio la comunicacion') ||
      Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('dias') && nk.includes('comunic'))?.[1];

    // ultima fecha de comunicacion (para derivar dias si no existe columna de dias)
    const lastCommDateKey =
      normalizedMap.get('ultima fecha de comunicacion') ||
      Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('ultima') && nk.includes('comunicacion'))?.[1];

    // extras
    const grupoKey =
      normalizedMap.get('grupo') || Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('grupo'))?.[1];
    const serieKey =
      normalizedMap.get('numero de serie') || Array.from(normalizedMap.entries()).find(([nk]) => nk.includes('numero de serie'))?.[1];

    return { vehiculoKey, estadoKey, diasCommKey, lastCommDateKey, grupoKey, serieKey };
  };

  // Find header row in 2D arrays by looking for expected column names
  const findHeaderRowIndex = (rows2D) => {
    if (!Array.isArray(rows2D)) return -1;
    for (let i = 0; i < rows2D.length; i++) {
      const row = rows2D[i] || [];
      const joined = (row.map((c) => normalize(c)).join(' ')).trim();
      const score = [
        /vehiculo/.test(joined),
        /estado( del dispositivo)?/.test(joined),
        /dias .*comunic/.test(joined),
        /numero de serie/.test(joined),
      ].filter(Boolean).length;
      if (score >= 2) return i; // header row found
    }
    return -1;
  };

  const buildObjectsFrom2D = (rows2D, headerIndex) => {
    const headers = (rows2D[headerIndex] || []).map((h) => String(h || '').trim());
    const out = [];
    for (let r = headerIndex + 1; r < rows2D.length; r++) {
      const row = rows2D[r] || [];
      // stop if entirely empty
      if (row.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx]; });
      out.push(obj);
    }
    return out;
  };

  const parseDurationToDays = (value) => {
    if (!value) return 0;
    const v = String(value).trim();
    // Support English and Spanish forms
    // Examples: "78 Days", "1 Day", "11 Minutes", "2 Hours", "78 Días", "2 Horas", "11 Minutos", "1 Día"
    const reNum = '(\\d+[\\.,]?\\d*)';
    const toNum = (m) => (m ? parseFloat(m[1].replace(',', '.')) : 0);

    const mDays = v.match(new RegExp(`${reNum}\\s*(?:Days|Day|Días|Día)`, 'i'));
    if (mDays) return toNum(mDays);

    const mHours = v.match(new RegExp(`${reNum}\\s*(?:Hours|Hour|Horas|Hora)`, 'i'));
    if (mHours) return toNum(mHours) / 24;

    const mMinutes = v.match(new RegExp(`${reNum}\\s*(?:Minutes|Minute|Minutos|Minuto)`, 'i'));
    if (mMinutes) return toNum(mMinutes) / (24 * 60);

    // Numeric-like
    const n = Number(v.replace(',', '.'));
    if (!Number.isNaN(n)) return n;
    return 0;
  };

  const analyze = (data) => {
    if (!data || data.length === 0) {
      setSummary(null);
      return;
    }

    const { vehiculoKey, estadoKey, diasCommKey, lastCommDateKey, grupoKey, serieKey } = detectColumns(data);
    if (!vehiculoKey && !estadoKey && !diasCommKey) {
      setSummary(null);
      setError('No se encontraron encabezados esperados (Vehículo, Estado, Días desde que se recibió la comunicación). Verifica el archivo.');
      return;
    }

    // Count by Estado
    const estadoCounts = data.reduce((acc, r) => {
      const key = (estadoKey ? r[estadoKey] : '') || 'N/A';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Vehicle with max days without communication (using diasUltComm)
    let maxRow = null;
    let maxDays = -1;
    data.forEach((r) => {
      const d = diasCommKey ? parseDurationToDays(r[diasCommKey]) : daysBetweenNow(lastCommDateKey ? r[lastCommDateKey] : null);
      if (d > maxDays) {
        maxDays = d;
        maxRow = r;
      }
    });

    // Helper: detect if Estado indicates disconnected
    const isEstadoDesconectado = (estado) => {
      if (!estado) return false;
      const s = String(estado).toLowerCase();
      return s.includes('sin conexión') || s.includes('desconect') || s.includes('offline');
    };

    // Units with >= 1 day without communication OR Estado indicates disconnected
    const oneDayOrMore = data
      .map((r) => ({
        vehiculo: vehiculoKey ? (r[vehiculoKey] ?? 'N/A') : 'N/A',
        estado: estadoKey ? (r[estadoKey] ?? 'N/A') : 'N/A',
        dias: diasCommKey ? parseDurationToDays(r[diasCommKey]) : daysBetweenNow(lastCommDateKey ? r[lastCommDateKey] : null),
        grupo: grupoKey ? (r[grupoKey] ?? '') : '',
        serie: serieKey ? (r[serieKey] ?? '') : '',
      }))
      .filter((o) => o.dias >= 1 || isEstadoDesconectado(o.estado))
      .sort((a, b) => b.dias - a.dias);

    const desconectadas = oneDayOrMore.length;

    setSummary({ estadoCounts, maxRow, maxDays, oneDayOrMore, desconectadas });
  };

  const handleFile = async (_file) => {
    // Funcionalidad deshabilitada temporalmente por solicitud del usuario.
    return;
  };

  return (
    <div className="container">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Map size={22} style={{ color: '#667eea' }} /> Reporte GPS
      </h1>
      <p className="subtitle">Sube el archivo exportado de Geotab (CSV o Excel) y te mostramos el análisis.</p>

      <div
        style={{
          marginTop: 16,
          padding: '2rem',
          border: '2px dashed #e2e8f0',
          borderRadius: 12,
          textAlign: 'center',
          background: '#f8fafc',
        }}
      >
        <Upload size={40} style={{ color: '#667eea', marginBottom: 12 }} />
        <div style={{ marginBottom: 12 }}>Arrastra y suelta tu archivo aquí o haz clic para seleccionarlo</div>
        <label htmlFor="gpsCsv" style={{ display: 'inline-block', cursor: 'pointer', background: '#667eea', color: 'white', padding: '10px 14px', borderRadius: 8 }}>
          Seleccionar archivo (CSV / Excel)
        </label>
        <input id="gpsCsv" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div className="error" style={{ marginTop: 16 }}>{error}</div>
      )}

      {summary && (
        <div style={{ marginTop: 24 }}>
          <h3>Resultados</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 12 }}>
            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <strong>Vehículo con más días sin comunicación</strong>
              <div style={{ marginTop: 8 }}>
                {summary.maxRow ? (
                  <>
                    <div><strong>Vehículo:</strong> {(() => { const { vehiculoKey } = detectColumns(rows); return vehiculoKey ? (summary.maxRow[vehiculoKey] || 'N/A') : 'N/A'; })()}</div>
                    <div><strong>Días sin comunicación:</strong> {summary.maxDays.toFixed(2)}</div>
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>

            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <strong>Conteo por Estado</strong>
              <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                {Object.entries(summary.estadoCounts).map(([estado, cnt]) => (
                  <li key={estado}>{estado}: {cnt}</li>
                ))}
              </ul>
            </div>

            <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <strong>Unidades con ≥ 1 día sin comunicación</strong>
              <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
                {summary.oneDayOrMore.length === 0 ? (
                  <div>Sin resultados</div>
                ) : (
                  <table className="preview-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Vehículo</th>
                        <th style={{ textAlign: 'left' }}>Estado</th>
                        <th style={{ textAlign: 'right' }}>Días</th>
                        <th style={{ textAlign: 'left' }}>Grupo</th>
                        <th style={{ textAlign: 'left' }}>Número de serie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.oneDayOrMore.map((r, i) => (
                        <tr key={i}>
                          <td>{r.vehiculo}</td>
                          <td>{r.estado}</td>
                          <td style={{ textAlign: 'right' }}>{r.dias.toFixed(2)}</td>
                          <td>{r.grupo}</td>
                          <td>{r.serie}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Debug breve de columnas detectadas */}
          <div style={{ marginTop: 16, color: '#6b7280', fontSize: 12 }}>
            Columnas detectadas: {(() => { const { vehiculoKey, estadoKey, diasCommKey, lastCommDateKey } = detectColumns(rows); return `Vehículo: ${vehiculoKey || 'N/A'} · Estado: ${estadoKey || 'N/A'} · DíasCom: ${diasCommKey || 'N/A'} · ÚltimaCom: ${lastCommDateKey || 'N/A'}`; })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default GpsReport;
