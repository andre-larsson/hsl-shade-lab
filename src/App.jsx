import { useId, useMemo, useState } from 'react'
import './App.css'

const MIN_SHADES = 2
const MAX_SHADES = 24

const initialHue = 204
const initialLightShade = { s: 38, l: 94 }
const initialDarkShade = { s: 86, l: 20 }
const MAX_MID_SATURATION_BOOST = 10

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max)
}

function normalizeHue(value) {
  return ((Math.round(Number(value) || 0) % 360) + 360) % 360
}

function round(value) {
  return Math.round(value)
}

function lerp(start, end, ratio) {
  return start + (end - start) * ratio
}

function smoothstep(ratio) {
  return ratio * ratio * (3 - 2 * ratio)
}

function getSaturationBoost(lightShade, darkShade) {
  const saturationHeadroom = 100 - Math.max(lightShade.s, darkShade.s)

  return clamp(saturationHeadroom * 0.35, 0, MAX_MID_SATURATION_BOOST)
}

function buildShades(hue, lightShade, darkShade, count) {
  const steps = clamp(count, MIN_SHADES, MAX_SHADES)
  const saturationBoost = getSaturationBoost(lightShade, darkShade)

  return Array.from({ length: steps }, (_, index) => {
    const ratio = steps === 1 ? 0 : index / (steps - 1)
    const easedRatio = smoothstep(ratio)
    const midBoost = saturationBoost * Math.sin(Math.PI * ratio)

    return {
      h: normalizeHue(hue),
      s: round(clamp(lerp(lightShade.s, darkShade.s, easedRatio) + midBoost, 0, 100)),
      l: round(lerp(lightShade.l, darkShade.l, easedRatio)),
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

function updateShadeValue(shade, key, value) {
  return { ...shade, [key]: clamp(value, 0, 100) }
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

function ShadeControlGroup({ title, hue, shade, onChange, compact = false }) {
  const color = { ...shade, h: hue }

  return (
    <fieldset className={compact ? 'hsl-group compact' : 'hsl-group'}>
      <legend>{title}</legend>
      <div className="hsl-preview" style={{ background: hslString(color) }}>
        <span>{hslToHex(color)}</span>
      </div>
      <div className="hsl-inputs">
        <HslField
          label="Sat"
          max={100}
          unit="%"
          value={shade.s}
          onChange={(value) => onChange(updateShadeValue(shade, 's', value))}
        />
        <HslField
          label="Light"
          max={100}
          unit="%"
          value={shade.l}
          onChange={(value) => onChange(updateShadeValue(shade, 'l', value))}
        />
      </div>
    </fieldset>
  )
}

function App() {
  const [hue, setHue] = useState(initialHue)
  const [lightShade, setLightShade] = useState(initialLightShade)
  const [darkShade, setDarkShade] = useState(initialDarkShade)
  const [shadeCount, setShadeCount] = useState(8)
  const [copied, setCopied] = useState('')
  const [shades, setShades] = useState(() =>
    buildShades(initialHue, initialLightShade, initialDarkShade, 8),
  )

  const gradient = useMemo(
    () => `linear-gradient(90deg, ${shades.map(hslString).join(', ')})`,
    [shades],
  )

  const cssTokens = useMemo(
    () =>
      shades
        .map(
          (shade, index) =>
            `--shade-${String(index + 1).padStart(2, '0')}: ${hslString(shade)};`,
        )
        .join('\n'),
    [shades],
  )

  function generatePalette() {
    setShades(buildShades(hue, lightShade, darkShade, shadeCount))
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
          <p className="eyebrow">Fixed-hue shade system</p>
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
          <ShadeControlGroup
            title="Light"
            hue={hue}
            shade={lightShade}
            onChange={setLightShade}
          />
          <ShadeControlGroup title="Dark" hue={hue} shade={darkShade} onChange={setDarkShade} />
          <fieldset className="generation-panel">
            <legend>Range</legend>
            <HslField
              label="Hue"
              max={359}
              value={hue}
              onChange={(value) => setHue(normalizeHue(value))}
            />
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
              <ShadeControlGroup
                title={`Tune ${String(index + 1).padStart(2, '0')}`}
                hue={shade.h}
                shade={shade}
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
