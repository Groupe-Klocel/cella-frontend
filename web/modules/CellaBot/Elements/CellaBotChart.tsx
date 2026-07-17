/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/
import styled from 'styled-components';
import { CELLA_YELLOW } from '../cellaBotColors';

// Chart spec validated by the backend's render_chart tool.
export interface AiChartSpec {
    type: 'bar' | 'line' | 'kpi';
    title: string;
    labels?: string[];
    series?: Array<{ name?: string; values: number[] }>;
    value?: number;
    unit?: string;
}

const Card = styled.div`
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 10px 12px;
    background: #fff;

    svg {
        display: block;
        width: 100%;
        height: auto;
    }
`;

const Title = styled.div`
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
`;

const KpiValue = styled.div`
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;

    span {
        font-size: 13px;
        font-weight: 400;
        opacity: 0.65;
        margin-left: 6px;
    }
`;

// Series colors: brand yellow first, then neutral tones (dependency-free palette).
const SERIES_COLORS = [CELLA_YELLOW, '#597ef7', '#73d13d', '#ff7a45', '#9254de'];

const WIDTH = 360;
const HEIGHT = 160;
const PAD = { top: 8, right: 8, bottom: 22, left: 34 };

const niceMax = (value: number) => {
    if (value <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / magnitude) * magnitude;
};

/** Dependency-free inline SVG rendering of the assistant's bar / line / kpi chart specs. */
const CellaBotChart = ({ spec }: { spec: AiChartSpec }) => {
    if (!spec) return null;

    if (spec.type === 'kpi') {
        return (
            <Card>
                <Title>{spec.title}</Title>
                <KpiValue>
                    {Number(spec.value ?? 0).toLocaleString()}
                    {spec.unit ? <span>{spec.unit}</span> : null}
                </KpiValue>
            </Card>
        );
    }

    // spec is validated by the backend's render_chart tool, but it still arrives as LLM/backend
    // JSON — coerce to arrays and drop any series without a `values` array before iterating, so a
    // malformed spec renders nothing instead of throwing during render. There is no error boundary
    // around the chart, so an unguarded throw here would tear down the whole CellaBot drawer.
    const rawLabels = Array.isArray(spec.labels) ? spec.labels : [];
    const rawSeries = (Array.isArray(spec.series) ? spec.series : [])
        .filter((s) => s && Array.isArray(s.values))
        .slice(0, SERIES_COLORS.length);
    if (rawLabels.length === 0 || rawSeries.length === 0) return null;
    // A malformed spec can carry labels and series values of mismatched lengths (still valid JSON).
    // Clamp everything to the shared minimum so bars/points stay aligned to a label and no
    // `undefined` label (a longer series than labels) is rendered.
    const count = Math.min(rawLabels.length, ...rawSeries.map((s) => s.values.length));
    if (count === 0) return null;
    const labels = rawLabels.slice(0, count);
    const series = rawSeries.map((s) => ({ ...s, values: s.values.slice(0, count) }));

    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    // Coerce every value the same way for both the axis scale and the geometry: values arrive as
    // LLM/backend JSON, so a null/undefined/NaN slips through the `number[]` type. `Number(v) || 0`
    // maps all of those (and negatives, via the Math.max below) to a finite, non-negative number —
    // otherwise `yOf(NaN)` would emit NaN into a bar's y/height or a polyline's points and the shape
    // would render incorrectly or vanish.
    const safeNum = (v: number) => Math.max(Number(v) || 0, 0);
    const maxValue = niceMax(Math.max(...series.flatMap((s) => s.values.map(safeNum)), 0));
    const yOf = (v: number) => PAD.top + plotHeight - (safeNum(v) / maxValue) * plotHeight;
    const slot = plotWidth / labels.length;
    // Show at most ~8 x labels so long axes stay readable.
    const labelStep = Math.ceil(labels.length / 8);

    return (
        <Card>
            <Title>{spec.title}</Title>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={spec.title}>
                {[0, 0.5, 1].map((f) => (
                    <g key={f}>
                        <line
                            x1={PAD.left}
                            x2={WIDTH - PAD.right}
                            y1={yOf(maxValue * f)}
                            y2={yOf(maxValue * f)}
                            stroke="rgba(0,0,0,0.12)"
                            strokeWidth={1}
                        />
                        <text
                            x={PAD.left - 4}
                            y={yOf(maxValue * f) + 3}
                            fontSize={9}
                            textAnchor="end"
                            fill="rgba(0,0,0,0.55)"
                        >
                            {Math.round(maxValue * f).toLocaleString()}
                        </text>
                    </g>
                ))}
                {spec.type === 'bar'
                    ? series.map((s, si) =>
                          s.values.map((v, i) => {
                              const barWidth = (slot * 0.7) / series.length;
                              const x = PAD.left + i * slot + slot * 0.15 + si * barWidth;
                              return (
                                  <rect
                                      key={`${si}-${i}`}
                                      x={x}
                                      y={yOf(v)}
                                      width={barWidth}
                                      height={PAD.top + plotHeight - yOf(v)}
                                      fill={SERIES_COLORS[si]}
                                  >
                                      <title>{`${labels[i]}: ${v}`}</title>
                                  </rect>
                              );
                          })
                      )
                    : series.map((s, si) => (
                          <polyline
                              key={si}
                              fill="none"
                              stroke={SERIES_COLORS[si]}
                              strokeWidth={2}
                              points={s.values
                                  .map((v, i) => `${PAD.left + i * slot + slot / 2},${yOf(v)}`)
                                  .join(' ')}
                          />
                      ))}
                {labels.map((label, i) => {
                    if (i % labelStep !== 0) return null;
                    const text = String(label ?? '');
                    return (
                        <text
                            key={i}
                            x={PAD.left + i * slot + slot / 2}
                            y={HEIGHT - 8}
                            fontSize={9}
                            textAnchor="middle"
                            fill="rgba(0,0,0,0.55)"
                        >
                            {text.length > 10 ? `${text.slice(0, 9)}…` : text}
                        </text>
                    );
                })}
            </svg>
            {series.length > 1 && (
                <div style={{ fontSize: 10, marginTop: 4 }}>
                    {series.map((s, si) => (
                        <span key={si} style={{ marginRight: 10 }}>
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 8,
                                    height: 8,
                                    background: SERIES_COLORS[si],
                                    marginRight: 4,
                                    borderRadius: 2
                                }}
                            />
                            {s.name || `#${si + 1}`}
                        </span>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default CellaBotChart;
