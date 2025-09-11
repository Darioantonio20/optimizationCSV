import React, { useState } from 'react';
import { Copy, CheckCircle, List, ArrowRight } from 'lucide-react';

function CodeConverter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);

  const convertCodes = () => {
    if (!inputText.trim()) {
      setOutputText('');
      return;
    }

    // Split by lines, filter empty lines, trim whitespace, and join with commas
    const codes = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(', ');

    setOutputText(codes);
  };

  const copyToClipboard = async () => {
    if (!outputText) return;

    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = outputText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Auto-convert as user types
    const value = e.target.value;
    if (value.trim()) {
      const codes = value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(', ');
      setOutputText(codes);
    } else {
      setOutputText('');
    }
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setCopied(false);
  };

  const loadExample = () => {
    const exampleCodes = `FK008
FK095
C822
FK015
FK119
JS021
SP425
SP441
SP459
FK056
FK029
FK070
FK104
SP443
SP442
SP481
SP483
C825
KH610
KK250
KK252
KK260
SP470
JS039
SP419
SP479
FK075
KK278
SP428`;
    setInputText(exampleCodes);
    handleInputChange({ target: { value: exampleCodes } });
  };

  return (
    <div className="container">
      <h1>Conversor de Códigos Geotab</h1>
      <p className="subtitle">
        Convierte listas verticales de códigos a formato separado por comas
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Input Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <List size={20} style={{ marginRight: '8px', color: '#667eea' }} />
            <h3 style={{ margin: 0 }}>Códigos (uno por línea)</h3>
          </div>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            placeholder="Pega aquí tus códigos, uno por línea:&#10;FK008&#10;FK095&#10;C822&#10;..."
            style={{
              width: '100%',
              height: '300px',
              padding: '1rem',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={loadExample}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f1f5f9';
                e.target.style.borderColor = '#cbd5e1';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Cargar ejemplo
            </button>
            <button
              onClick={clearAll}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#fef2f2';
                e.target.style.borderColor = '#fecaca';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#f8fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Limpiar todo
            </button>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <ArrowRight size={32} style={{ color: '#667eea' }} />
        </div>

        {/* Output Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <Copy size={20} style={{ marginRight: '8px', color: '#667eea' }} />
            <h3 style={{ margin: 0 }}>Resultado (separado por comas)</h3>
          </div>
          <div style={{ position: 'relative' }}>
            <textarea
              value={outputText}
              readOnly
              placeholder="El resultado aparecerá aquí automáticamente..."
              style={{
                width: '100%',
                height: '300px',
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: '#f8fafc',
                color: '#1f2937',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            {outputText && (
              <button
                onClick={copyToClipboard}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '0.5rem',
                  backgroundColor: copied ? '#10b981' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!copied) {
                    e.target.style.backgroundColor = '#5a67d8';
                  }
                }}
                onMouseOut={(e) => {
                  if (!copied) {
                    e.target.style.backgroundColor = '#667eea';
                  }
                }}
              >
                {copied ? (
                  <>
                    <CheckCircle size={16} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      {inputText && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: 'rgba(102, 126, 234, 0.05)', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-around',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
              {inputText.split('\n').filter(line => line.trim().length > 0).length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Códigos detectados</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
              {outputText.length}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Caracteres en resultado</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(102, 126, 234, 0.05)', borderRadius: '8px' }}>
        <h4>Características:</h4>
        <ul style={{ textAlign: 'left', color: '#666' }}>
          <li>✅ Conversión automática en tiempo real</li>
          <li>✅ Copia al portapapeles con un clic</li>
          <li>✅ Elimina líneas vacías automáticamente</li>
          <li>✅ Contador de códigos procesados</li>
          <li>✅ Ejemplo precargado para pruebas</li>
          <li>✅ Interfaz intuitiva y fácil de usar</li>
        </ul>
      </div>
    </div>
  );
}

export default CodeConverter;
