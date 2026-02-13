import { useCallback, useMemo, useRef, useState } from 'react';
import type { Rotation } from '../field/field-interfaces';
import type {
  RobotConfig,
  RobotConfigComponent,
  RobotConfigJoint,
} from '../field/components/robotConfigLoader';
import RobotPreview3d from './RobotPreview3d';

// ── Types ────────────────────────────────────────────────────────────────────

/** Files held in memory (blob URLs). Key = "model" | "model_0" | "model_1" … */
type GlbFileMap = Record<string, { file: File; url: string }>;

const JOINT_TYPES: RobotConfigJoint['type'][] = ['revolute', 'prismatic', 'fixed'];

/** Distinct colours used to visually identify joints in the sidebar & 3D view. */
const JOINT_COLORS = [
  '#ef5350', // red
  '#66bb6a', // green
  '#42a5f5', // blue
  '#ffa726', // orange
  '#ab47bc', // purple
  '#26c6da', // cyan
  '#ec407a', // pink
  '#d4e157', // lime
  '#8d6e63', // brown
  '#78909c', // blue-grey
  '#ffeb3b', // yellow
  '#ff7043', // deep orange
  '#ec407a', // pink
];
/** Return a stable colour for a joint index. */
function jointColor(index: number): string {
  return JOINT_COLORS[index % JOINT_COLORS.length];
}

// ── Defaults ─────────────────────────────────────────────────────────────────

function defaultConfig(): RobotConfig {
  return {
    name: 'New Robot',
    rotations: [],
    position: [0, 0, 0],
    components: [],
    joints: [],
    cameras: [],
  };
}

function defaultComponent(): RobotConfigComponent {
  return { zeroedRotations: [], zeroedPosition: [0, 0, 0] };
}

function defaultJoint(childIndex: number): RobotConfigJoint {
  return {
    type: 'revolute',
    child: childIndex,
    origin: { rotations: [], position: [0, 0, 0] },
    axis: [0, 1, 0],
    limit: { lower: -3.14159, upper: 3.14159 },
  };
}

// ── Inline styles ────────────────────────────────────────────────────────────

const S = {
  root: {
    display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif',
    color: '#e0e0e0', background: '#121212', fontSize: 13,
  } as React.CSSProperties,
  sidebar: {
    width: 360, minWidth: 320, overflowY: 'auto' as const, background: '#1a1a1a',
    borderRight: '1px solid #333', padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 10,
  } as React.CSSProperties,
  preview: { flex: 1, position: 'relative' as const },
  section: {
    background: '#222', borderRadius: 6, padding: 10, display: 'flex',
    flexDirection: 'column' as const, gap: 6,
  } as React.CSSProperties,
  sectionTitle: { fontWeight: 700, fontSize: 14, marginBottom: 2, color: '#90caf9' } as React.CSSProperties,
  label: { fontSize: 11, color: '#aaa', marginBottom: 1 } as React.CSSProperties,
  input: {
    background: '#2a2a2a', border: '1px solid #444', borderRadius: 3,
    color: '#e0e0e0', padding: '3px 6px', fontSize: 12, width: '100%', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    background: '#2a2a2a', border: '1px solid #444', borderRadius: 3,
    color: '#e0e0e0', padding: '3px 6px', fontSize: 12, width: '100%', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btn: {
    background: '#333', border: '1px solid #555', borderRadius: 4, color: '#e0e0e0',
    padding: '5px 10px', cursor: 'pointer', fontSize: 12,
  } as React.CSSProperties,
  btnPrimary: {
    background: '#1976d2', border: 'none', borderRadius: 4, color: '#fff',
    padding: '5px 10px', cursor: 'pointer', fontSize: 12,
  } as React.CSSProperties,
  btnDanger: {
    background: '#c62828', border: 'none', borderRadius: 4, color: '#fff',
    padding: '4px 8px', cursor: 'pointer', fontSize: 11,
  } as React.CSSProperties,
  row: { display: 'flex', gap: 6, alignItems: 'center' } as React.CSSProperties,
  flexGrow: { flex: 1 },
  slider: { width: '100%' } as React.CSSProperties,
  fileBtn: {
    background: '#2a2a2a', border: '1px dashed #666', borderRadius: 4,
    color: '#aaa', padding: '8px 12px', cursor: 'pointer', fontSize: 12, textAlign: 'center' as const,
  } as React.CSSProperties,
};

// ── Small reusable sub-components ────────────────────────────────────────────

function Vec3Input({ value, onChange, labels = ['X', 'Y', 'Z'] }: {
  value: [number, number, number]; onChange: (v: [number, number, number]) => void; labels?: string[];
}) {
  return (
    <div style={S.row}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={S.flexGrow}>
          <div style={S.label}>{labels[i]}</div>
          <input style={S.input} type="number" step="0.001"
            value={value[i]} onChange={(e) => {
              const v = [...value] as [number, number, number];
              v[i] = parseFloat(e.target.value) || 0;
              onChange(v);
            }} />
        </div>
      ))}
    </div>
  );
}

function RotationsEditor({ rotations, onChange }: {
  rotations: Rotation[]; onChange: (r: Rotation[]) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rotations.map((rot, i) => (
        <div key={i} style={S.row}>
          <select style={{ ...S.select, width: 50 }} value={rot.axis}
            onChange={(e) => {
              const copy = [...rotations];
              copy[i] = { ...rot, axis: e.target.value as 'x' | 'y' | 'z' };
              onChange(copy);
            }}>
            <option value="x">X</option><option value="y">Y</option><option value="z">Z</option>
          </select>
          <input style={{ ...S.input, width: 70 }} type="number" step="0.1" value={rot.degrees}
            onChange={(e) => {
              const copy = [...rotations];
              copy[i] = { ...rot, degrees: parseFloat(e.target.value) || 0 };
              onChange(copy);
            }} />
          <span style={{ fontSize: 11, color: '#888' }}>°</span>
          <button style={S.btnDanger} onClick={() => onChange(rotations.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button style={S.btn} onClick={() => onChange([...rotations, { axis: 'x', degrees: 0 }])}>+ Rotation</button>
    </div>
  );
}

// ── Main Editor ──────────────────────────────────────────────────────────────

export default function RobotConfigEditor() {
  const [config, setConfig] = useState<RobotConfig>(defaultConfig);
  const [glbFiles, setGlbFiles] = useState<GlbFileMap>({});
  const [jointValues, setJointValues] = useState<Record<string, number>>({});
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [showJointHelpers, setShowJointHelpers] = useState(true);

  const toggleModelVisibility = useCallback((linkName: string) => {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(linkName)) next.delete(linkName); else next.add(linkName);
      return next;
    });
  }, []);

  // Helpers to update config immutably
  const patch = useCallback((partial: Partial<RobotConfig>) => setConfig((c) => ({ ...c, ...partial })), []);

  // Build URL map for preview
  const urlMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [key, entry] of Object.entries(glbFiles)) m[key] = entry.url;
    return m;
  }, [glbFiles]);

  // File input refs
  const baseFileRef = useRef<HTMLInputElement>(null);
  const compFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // ── File handlers ────────────────────────────────────────────────────────

  const handleBaseModelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke old URL
    if (glbFiles['model']) URL.revokeObjectURL(glbFiles['model'].url);
    const url = URL.createObjectURL(file);
    setGlbFiles((prev) => ({ ...prev, model: { file, url } }));
  }, [glbFiles]);

  const handleComponentModelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = (config.components ?? []).length;
    const key = `model_${idx}`;
    if (glbFiles[key]) URL.revokeObjectURL(glbFiles[key].url);
    const url = URL.createObjectURL(file);
    setGlbFiles((prev) => ({ ...prev, [key]: { file, url } }));
    // Also add a component entry
    patch({ components: [...(config.components ?? []), defaultComponent()] });
    // Reset file input
    if (compFileRef.current) compFileRef.current.value = '';
  }, [config.components, glbFiles, patch]);

  const removeComponent = useCallback((idx: number) => {
    const comps = [...(config.components ?? [])];
    comps.splice(idx, 1);
    // Remove GLB and shift keys
    const newFiles = { ...glbFiles };
    const key = `model_${idx}`;
    if (newFiles[key]) { URL.revokeObjectURL(newFiles[key].url); delete newFiles[key]; }
    // Shift higher indices down
    for (let i = idx + 1; i <= (config.components ?? []).length; i++) {
      const oldKey = `model_${i}`;
      const newKey = `model_${i - 1}`;
      if (newFiles[oldKey]) { newFiles[newKey] = newFiles[oldKey]; delete newFiles[oldKey]; }
    }
    setGlbFiles(newFiles);
    // Also remove/update joints referencing this component
    const joints = (config.joints ?? []).filter((j) => j.child !== idx).map((j) => ({
      ...j,
      child: j.child > idx ? j.child - 1 : j.child,
      parent: j.parent !== undefined ? (j.parent === idx ? undefined : j.parent > idx ? j.parent - 1 : j.parent) : undefined,
    }));
    patch({ components: comps, joints });
  }, [config.components, config.joints, glbFiles, patch]);

  // Component update helper
  const updateComponent = useCallback((idx: number, partial: Partial<RobotConfigComponent>) => {
    const comps = [...(config.components ?? [])];
    comps[idx] = { ...comps[idx], ...partial };
    patch({ components: comps });
  }, [config.components, patch]);

  // Joint helpers
  const addJoint = useCallback(() => {
    const childIdx = (config.components ?? []).length > 0 ? 0 : 0;
    patch({ joints: [...(config.joints ?? []), defaultJoint(childIdx)] });
  }, [config.components, config.joints, patch]);

  const updateJoint = useCallback((idx: number, partial: Partial<RobotConfigJoint>) => {
    const joints = [...(config.joints ?? [])];
    joints[idx] = { ...joints[idx], ...partial };
    patch({ joints });
  }, [config.joints, patch]);

  const removeJoint = useCallback((idx: number) => {
    patch({ joints: (config.joints ?? []).filter((_, i) => i !== idx) });
  }, [config.joints, patch]);

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Revoke old blob URLs
    Object.values(glbFiles).forEach((entry) => URL.revokeObjectURL(entry.url));

    let newConfig: RobotConfig | null = null;
    const newGlbFiles: GlbFileMap = {};

    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase();
      if (name === 'config.json') {
        try {
          const text = await file.text();
          newConfig = JSON.parse(text) as RobotConfig;
        } catch { console.error('Failed to parse config.json'); }
      } else if (name.endsWith('.glb')) {
        // Determine key from filename: model.glb -> "model", model_0.glb -> "model_0"
        const key = name.replace('.glb', '');
        const url = URL.createObjectURL(file);
        newGlbFiles[key] = { file, url };
      }
    }

    if (newConfig) {
      setConfig(newConfig);
      setGlbFiles(newGlbFiles);
      setJointValues({});
    }
    if (importFileRef.current) importFileRef.current.value = '';
  }, [glbFiles]);

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    // Build config.json (strip cameras if empty)
    const exportConfig: RobotConfig = { ...config };
    if (!exportConfig.cameras?.length) delete exportConfig.cameras;
    if (!exportConfig.components?.length) delete exportConfig.components;
    if (!exportConfig.joints?.length) delete exportConfig.joints;
    const configBlob = new Blob([JSON.stringify(exportConfig, null, 2)], { type: 'application/json' });

    // Try File System Access API for folder export
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        // Write config.json
        const configFile = await dirHandle.getFileHandle('config.json', { create: true });
        const configWriter = await configFile.createWritable();
        await configWriter.write(configBlob);
        await configWriter.close();
        // Write GLB files with correct names
        if (glbFiles['model']) {
          const fh = await dirHandle.getFileHandle('model.glb', { create: true });
          const w = await fh.createWritable();
          await w.write(glbFiles['model'].file);
          await w.close();
        }
        for (const [key, entry] of Object.entries(glbFiles)) {
          if (key === 'model') continue;
          const fh = await dirHandle.getFileHandle(`${key}.glb`, { create: true });
          const w = await fh.createWritable();
          await w.write(entry.file);
          await w.close();
        }
        alert('Robot exported successfully!');
        return;
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return; // User cancelled
        console.warn('File System Access API failed, falling back to downloads', err);
      }
    }
    // Fallback: download files individually
    const downloadFile = (blob: Blob, name: string) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    downloadFile(configBlob, 'config.json');
    if (glbFiles['model']) downloadFile(glbFiles['model'].file, 'model.glb');
    for (const [key, entry] of Object.entries(glbFiles)) {
      if (key === 'model') continue;
      downloadFile(entry.file, `${key}.glb`);
    }
  }, [config, glbFiles]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      {/* Hidden file inputs */}
      <input ref={baseFileRef} type="file" accept=".glb" style={{ display: 'none' }} onChange={handleBaseModelUpload} />
      <input ref={compFileRef} type="file" accept=".glb" style={{ display: 'none' }} onChange={handleComponentModelUpload} />
      <input ref={importFileRef} type="file" accept=".json,.glb" multiple
        {...{ webkitdirectory: '', directory: '' } as any}
        style={{ display: 'none' }} onChange={handleImport} />

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Robot Config Editor</div>

        {/* ── Import / Export ── */}
        <div style={{ ...S.row, gap: 8 }}>
          <button style={S.btnPrimary} onClick={() => importFileRef.current?.click()}>Import Robot</button>
          <button style={S.btnPrimary} onClick={handleExport}>Export Robot</button>
        </div>

        {/* ── Base Model ── */}
        <div style={S.section}>
          <div style={{ ...S.row, marginBottom: 2 }}>
            <span style={S.sectionTitle}>Base Model</span>
            <span style={{ flex: 1 }} />
            <button
              style={{ ...S.btn, padding: '2px 6px', fontSize: 14, opacity: hiddenModels.has('model') ? 0.4 : 1 }}
              title={hiddenModels.has('model') ? 'Show base model' : 'Hide base model'}
              onClick={() => toggleModelVisibility('model')}
            >{hiddenModels.has('model') ? '🙈' : '👁'}</button>
          </div>
          <div style={S.label}>Name</div>
          <input style={S.input} value={config.name} onChange={(e) => patch({ name: e.target.value })} />
          <div style={S.label}>Model File</div>
          <div style={S.fileBtn} onClick={() => baseFileRef.current?.click()}>
            {glbFiles['model'] ? `✓ ${glbFiles['model'].file.name}` : 'Upload model.glb'}
          </div>
          <div style={S.label}>Rotations</div>
          <RotationsEditor rotations={config.rotations} onChange={(r) => patch({ rotations: r })} />
          <div style={S.label}>Position</div>
          <Vec3Input value={config.position} onChange={(p) => patch({ position: p })} />
        </div>

        {/* ── Components ── */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Components ({(config.components ?? []).length})</div>
          {(config.components ?? []).map((comp, idx) => {
            const linkName = `model_${idx}`;
            const hidden = hiddenModels.has(linkName);
            return (
            <div key={idx} style={{ background: '#2a2a2a', borderRadius: 4, padding: 8, marginBottom: 4 }}>
              <div style={{ ...S.row, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>model_{idx}</span>
                <span style={{ flex: 1, fontSize: 11, color: '#888', textAlign: 'right' as const }}>
                  {glbFiles[linkName] ? glbFiles[linkName].file.name : 'no file'}
                </span>
                <button
                  style={{ ...S.btn, padding: '2px 6px', fontSize: 14, opacity: hidden ? 0.4 : 1 }}
                  title={hidden ? `Show ${linkName}` : `Hide ${linkName}`}
                  onClick={() => toggleModelVisibility(linkName)}
                >{hidden ? '🙈' : '👁'}</button>
                <button style={S.btnDanger} onClick={() => removeComponent(idx)}>✕</button>
              </div>
              <div style={S.label}>Zeroed Rotations</div>
              <RotationsEditor rotations={comp.zeroedRotations}
                onChange={(r) => updateComponent(idx, { zeroedRotations: r })} />
              <div style={S.label}>Zeroed Position</div>
              <Vec3Input value={comp.zeroedPosition}
                onChange={(p) => updateComponent(idx, { zeroedPosition: p })} />
            </div>
            );
          })}
          <button style={S.btnPrimary} onClick={() => compFileRef.current?.click()}>+ Add Component (GLB)</button>
        </div>

        {/* ── Joints ── */}
        <div style={S.section}>
          <div style={{ ...S.row, marginBottom: 2 }}>
            <span style={S.sectionTitle}>Joints ({(config.joints ?? []).length})</span>
            <span style={{ flex: 1 }} />
            <button
              style={{ ...S.btn, padding: '2px 6px', fontSize: 14, opacity: showJointHelpers ? 1 : 0.4 }}
              title={showJointHelpers ? 'Hide joint helpers' : 'Show joint helpers'}
              onClick={() => setShowJointHelpers((v) => !v)}
            >{showJointHelpers ? '👁' : '🙈'}</button>
          </div>
          {(config.joints ?? []).map((joint, idx) => (
            <div key={idx} style={{ background: '#2a2a2a', borderRadius: 4, padding: 8, marginBottom: 4 }}>
              <div style={{ ...S.row, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: jointColor(idx), flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 12, marginLeft: 6 }}>joint_{idx}</span>
                <span style={{ flex: 1 }} />
                <button style={S.btnDanger} onClick={() => removeJoint(idx)}>✕</button>
              </div>
              <div style={S.row}>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Type</div>
                  <select style={S.select} value={joint.type}
                    onChange={(e) => updateJoint(idx, { type: e.target.value as RobotConfigJoint['type'] })}>
                    {JOINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Parent</div>
                  <select style={S.select} value={joint.parent ?? 'base'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateJoint(idx, { parent: val === 'base' ? undefined : parseInt(val) });
                    }}>
                    <option value="base">base (model)</option>
                    {(config.components ?? []).map((_, ci) => (
                      <option key={ci} value={ci}>model_{ci}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Child</div>
                  <select style={S.select} value={joint.child}
                    onChange={(e) => updateJoint(idx, { child: parseInt(e.target.value) })}>
                    {(config.components ?? []).map((_, ci) => (
                      <option key={ci} value={ci}>model_{ci}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={S.label}>Origin Position</div>
              <Vec3Input value={joint.origin.position}
                onChange={(p) => updateJoint(idx, { origin: { ...joint.origin, position: p } })} />
              <div style={S.label}>Origin Rotations</div>
              <RotationsEditor rotations={joint.origin.rotations}
                onChange={(r) => updateJoint(idx, { origin: { ...joint.origin, rotations: r } })} />
              {joint.type !== 'fixed' && (
                <>
                  <div style={S.label}>Axis</div>
                  <Vec3Input value={joint.axis ?? [0, 1, 0]}
                    onChange={(a) => updateJoint(idx, { axis: a })} />
                </>
              )}
              {(joint.type === 'revolute' || joint.type === 'prismatic') && (
                <>
                  <div style={S.label}>Limits</div>
                  <div style={S.row}>
                    <div style={{ flex: 1 }}>
                      <div style={S.label}>Lower</div>
                      <input style={S.input} type="number" step="0.01"
                        value={joint.limit?.lower ?? 0}
                        onChange={(e) => updateJoint(idx, {
                          limit: { lower: parseFloat(e.target.value) || 0, upper: joint.limit?.upper ?? 0 },
                        })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={S.label}>Upper</div>
                      <input style={S.input} type="number" step="0.01"
                        value={joint.limit?.upper ?? 0}
                        onChange={(e) => updateJoint(idx, {
                          limit: { lower: joint.limit?.lower ?? 0, upper: parseFloat(e.target.value) || 0 },
                        })} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
          <button style={S.btnPrimary} onClick={addJoint}
            disabled={(config.components ?? []).length === 0}>+ Add Joint</button>
        </div>

        {/* ── Joint Testing ── */}
        {(config.joints ?? []).length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Joint Testing</div>
            {(config.joints ?? []).map((joint, idx) => {
              const name = `joint_${idx}`;
              const isPrismatic = joint.type === 'prismatic';
              const min = joint.limit?.lower ?? (isPrismatic ? 0 : -3.14159);
              const max = joint.limit?.upper ?? (isPrismatic ? 1 : 3.14159);
              const val = jointValues[name] ?? 0;
              return (
                <div key={idx}>
                  <div style={{ ...S.row, marginBottom: 2 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: jointColor(idx), flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 6 }}>{name}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: '#aaa' }}>{val.toFixed(3)}</span>
                  </div>
                  <input type="range" style={S.slider} min={min} max={max} step={0.001}
                    value={val}
                    onChange={(e) => setJointValues((prev) => ({ ...prev, [name]: parseFloat(e.target.value) }))} />
                </div>
              );
            })}
            <button style={S.btn} onClick={() => setJointValues({})}>Reset All</button>
          </div>
        )}
      </div>

      {/* 3D Preview */}
      <div style={S.preview}>
        <RobotPreview3d
          urlMap={urlMap}
          modelRotations={config.rotations}
          modelPosition={config.position}
          components={config.components ?? []}
          joints={config.joints ?? []}
          jointValues={jointValues}
          hiddenModels={hiddenModels}
          showJointHelpers={showJointHelpers}
          jointColors={(config.joints ?? []).map((_, idx) => jointColor(idx))}
        />
      </div>
    </div>
  );
}

