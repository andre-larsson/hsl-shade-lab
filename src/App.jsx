import { useId, useMemo, useState } from 'react'
import './App.css'

const MIN_SHADES = 2
const MAX_SHADES = 24

const initialStart = { h: 204, s: 72, l: 46 }
const initialEnd = { h: 16, s: 88, l: 58 }

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max)
}

function normalizeHue(value) {
  return ((Math.round(Number(value) || 0) % 360) + 360) % 360
}

function round(value) {
  return Math.round(value)
}

function getHueDelta(start, end, mode) {
  const direct = end - start

  if (mode === 'clockwise') {
    return direct >= 0 ? direct : direct + 360
  }

  if (mode === 'counterclockwise') {
    return direct <= 0 ? direct : direct - 360
  }

  return ((direct + 540) % 360) - 180
}

function buildPalette(start, end, count, hueMode) {
  const steps = clamp(count, MIN_SHADES, MAX_SHADES)
  const hueDelta = getHueDelta(start.h, end.h, hueMode)

  return Array.from({ length: steps }, (_, index) => {
    const ratio = steps === 1 ? 0 : index / (steps - 1)

    return {
      h: normalizeHue(start.h + hueDelta * ratio),
      s: round(start.s + (end.s - start.s) * ratio),
      l: round(start.l + (end.l - start.l) * ratio),
    }
  })
}

function hslString(color) {
  return `hsl(${color.h} ${color.s}% ${color.l}%)`
}

function hslToHex(color) {
  const h = color.h / 60
  const s = color.s / 100
  const l = color.l / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = l - c / 2

  let rgb

  if (h >= 0 && h < 1) rgb = [c, x, 0]
  else if (h >= 1 && h < 2) rgb = [x, c, 0]
  else if (h >= 2 && h < 3) rgb = [0, c, x]
  else if (h >= 3 && h < 4) rgb = [0, x, c]
  else if (h >= 4 && h < 5) rgb = [x, 0, c]
  else rgb = [c, 0, x]

  return `#${rgb
    .map((channel) => {
      const value = Math.round((channel + m) * 255)
      return value.toString(16).padStart(2, '0')
    })
    .join('')}`
}

function updateColorValue(color, key, value) {
  if (key === 'h') {
    return { ...color, h: normalizeHue(value) }
  }

  return { ...color, [key]: clamp(value, 0, 100) }
}

function HslField({ label, max, unit = '', value, onChange }) {
  const inputId = useId()

  return (
    <label className="hsl-field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="number-wrap">
        <input
          type="number"
          min="0"
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {unit && <span>{unit}</span>}
      </span>
    </label>
  )
}

function HslControlGroup({ title, color, onChange, compact = false }) {
  return (
    <fieldset className={compact ? 'hsl-group compact' : 'hsl-group'}>
      <legend>{title}</legend>
      <div className="hsl-preview" style={{ background: hslString(color) }}>
        <span>{hslToHex(color)}</span>
      </div>
      <div className="hsl-inputs">
        <HslField
          label="Hue"
          max={359}
          value={color.h}
          onChange={(value) => onChange(updateColorValue(color, 'h', value))}
        />
        <HslField
          label="Sat"
          max={100}
          unit="%"
          value={color.s}
          onChange={(value) => onChange(updateColorValue(color, 's', value))}
        />
        <HslField
          label="Light"
          max={100}
          unit="%"
          value={color.l}
          onChange={(value) => onChange(updateColorValue(color, 'l', value))}
        />
      </div>
    </fieldset>
  )
}

function App() {
  const [startColor, setStartColor] = useState(initialStart)
  const [endColor, setEndColor] = useState(initialEnd)
  const [shadeCount, setShadeCount] = useState(8)
  const [hueMode, setHueMode] = useState('shortest')
  const [copied, setCopied] = useState('')
  const [shades, setShades] = useState(() =>
    buildPalette(initialStart, initialEnd, 8, 'shortest'),
  )

  const gradient = useMemo(
    () => `linear-gradient(90deg, ${shades.map(hslString).join(', ')})`,
    [shades],
  )

  const cssTokens = useMemo(
    () =>
      shades
        .map((shade, index) => `--shade-${String(index + 1).padStart(2, '0')}: ${hslString(shade)};`)
        .join('\n'),
    [shades],
  )

  function generatePalette() {
    setShades(buildPalette(startColor, endColor, shadeCount, hueMode))
    setCopied('')
  }

  function updateShade(index, nextColor) {
    setShades((current) =>
      current.map((shade, shadeIndex) => (shadeIndex === index ? nextColor : shade)),
    )
  }

  async function copyText(label, text) {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(text)
    setCopied(label)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">HSL shade system</p>
          <h1>HSL Shade Lab</h1>
        </div>
        <div className="top-actions">
          <button type="button" onClick={generatePalette}>
            Generate
          </button>
          <button type="button" className="secondary" onClick={() => copyText('css', cssTokens)}>
            {copied === 'css' ? 'Copied' : 'Copy CSS'}
          </button>
        </div>
      </header>

      <section className="control-band" aria-label="Palette controls">
        <div className="endpoint-grid">
          <HslControlGroup title="Start" color={startColor} onChange={setStartColor} />
          <HslControlGroup title="End" color={endColor} onChange={setEndColor} />
          <fieldset className="generation-panel">
            <legend>Range</legend>
            <label className="count-control" htmlFor="shade-count">
              <span>Shades</span>
              <input
                id="shade-count"
                type="range"
                min={MIN_SHADES}
                max={MAX_SHADES}
                value={shadeCount}
                onChange={(event) => setShadeCount(Number(event.target.value))}
              />
              <input
                type="number"
                min={MIN_SHADES}
                max={MAX_SHADES}
                value={shadeCount}
                onChange={(event) =>
                  setShadeCount(clamp(event.target.value, MIN_SHADES, MAX_SHADES))
                }
              />
            </label>
            <label className="select-control" htmlFor="hue-mode">
              <span>Hue path</span>
              <select
                id="hue-mode"
                value={hueMode}
                onChange={(event) => setHueMode(event.target.value)}
              >
                <option value="shortest">Shortest</option>
                <option value="clockwise">Clockwise</option>
                <option value="counterclockwise">Counterclockwise</option>
              </select>
            </label>
          </fieldset>
        </div>
        <div className="gradient-strip" style={{ background: gradient }}>
          {shades.map((shade, index) => (
            <span key={`${shade.h}-${shade.s}-${shade.l}-${index}`} />
          ))}
        </div>
      </section>

      <section className="workspace" aria-label="Generated shades">
        <div className="palette-grid">
          {shades.map((shade, index) => (
            <article className="shade-card" key={index}>
              <div
                className="swatch"
                style={{
                  background: hslString(shade),
                  color: shade.l > 58 ? '#161615' : '#ffffff',
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() => copyText(`shade-${index}`, hslString(shade))}
                >
                  {copied === `shade-${index}` ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="shade-meta">
                <strong>{hslToHex(shade)}</strong>
                <span>{hslString(shade)}</span>
              </div>
              <HslControlGroup
                title={`Tune ${String(index + 1).padStart(2, '0')}`}
                color={shade}
                compact
                onChange={(nextColor) => updateShade(index, nextColor)}
              />
            </article>
          ))}
        </div>

        <aside className="token-panel" aria-label="CSS tokens">
          <div className="token-header">
            <h2>CSS Tokens</h2>
            <button type="button" onClick={() => copyText('css', cssTokens)}>
              {copied === 'css' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre>{cssTokens}</pre>
        </aside>
      </section>
    </main>
  )
}

export default App
