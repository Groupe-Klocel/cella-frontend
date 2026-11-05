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
import { TableOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Button } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';
import { interpolate } from '../cellaBotApi';
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

const DataTable = styled.div`
    max-height: 220px;
    overflow: auto;
    margin-top: 4px;

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
    }
    th,
    td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding: 2px 6px;
        text-align: right;
        white-space: nowrap;
    }
    th:first-child,
    td:first-child {
        text-align: left;
        white-space: normal;
    }
    th {
        position: sticky;
        top: 0;
        background: #fafafa;
        font-weight: 600;
    }
`;

// Series colors: brand yellow first, then neutral tones (dependency-free palette).
const SERIES_COLORS = [CELLA_YELLOW, '#597ef7', '#73d13d', '#ff7a45', '#9254de'];

const WIDTH = 360;
const HEIGHT = 160;
const PAD = { top: 8, right: 8, bottom: 22, left: 38 };
// Above this many points a line shows no markers (they would overlap).
const MAX_POINT_MARKERS = 20;

// Round a magnitude up to 1, 2, 3... × its power of ten, for a readable axis bound.
const niceBound = (value: number) => {
    if (value <= 0) return 0;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    return Math.ceil(value / magnitude) * magnitude;
};

// Values arrive as LLM/backend JSON: a null/undefined/NaN/Infinity slips through the `number[]`
// type. Map all of those to 0 so the geometry never receives NaN (a bar or line would vanish).
const finite = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/** Dependency-free inline SVG rendering of the assistant's bar / line / kpi chart specs. */
const CellaBotChart = ({ spec }: { spec: AiChartSpec }) => {
    const { t, lang } = useTranslation();
    const tt = (key: string, def: string) => {
        const v = t(key);
        return v && v !== key ? v : def;
    };
    const [showData, setShowData] = useState(false);

    if (!spec) return null;

    if (spec.type === 'kpi') {
        return (
            <Card>
                <Title>{spec.title}</Title>
                <KpiValue>
                    {new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(
                        finite(spec.value)
                    )}
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
    const labels = rawLabels.slice(0, count).map((label) => String(label ?? ''));
    const series = rawSeries.map((s, si) => ({
        name:
            s.name ||
            interpolate(tt('common:cellabot-chart-series', 'Series {{number}}'), {
                number: si + 1
            }),
        values: s.values.slice(0, count).map(finite)
    }));

    const plotWidth = WIDTH - PAD.left - PAD.right;
    const plotHeight = HEIGHT - PAD.top - PAD.bottom;
    // The axis always contains 0 and extends below it when a value is negative (a stock variance,
    // a delta...): bars then grow up or down from the zero line.
    const allValues = series.flatMap((s) => s.values);
    const min = Math.min(...allValues, 0);
    const bottom = min < 0 ? -niceBound(-min) : 0;
    // All values at 0: keep a unit axis rather than a flat (zero-height) one.
    const top = niceBound(Math.max(...allValues, 0)) || (bottom < 0 ? 0 : 1);
    const span = top - bottom;
    const yOf = (v: number) => PAD.top + ((top - v) / span) * plotHeight;
    const ticks = bottom < 0 && top > 0 ? [bottom, 0, top] : [bottom, (bottom + top) / 2, top];
    const slot = plotWidth / labels.length;
    // Show at most ~8 x labels so long axes stay readable.
    const labelStep = Math.ceil(labels.length / 8);
    const axisFormat = new Intl.NumberFormat(lang, {
        notation: 'compact',
        maximumFractionDigits: 1
    });
    const valueFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
    // The data table shows the figures as received (locale separators only, no rounding).
    const exactFormat = new Intl.NumberFormat(lang, { maximumFractionDigits: 20 });

    return (
        <Card>
            <Title>{spec.title}</Title>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={spec.title}>
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PAD.left}
                            x2={WIDTH - PAD.right}
                            y1={yOf(tick)}
                            y2={yOf(tick)}
                            stroke={tick === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)'}
                            strokeWidth={1}
                        />
                        <text
                            x={PAD.left - 4}
                            y={yOf(tick) + 3}
                            fontSize={9}
                            textAnchor="end"
                            fill="rgba(0,0,0,0.55)"
                        >
                            {axisFormat.format(tick)}
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
                                      y={Math.min(yOf(v), yOf(0))}
                                      width={barWidth}
                                      height={Math.abs(yOf(v) - yOf(0))}
                                      fill={SERIES_COLORS[si]}
                                  >
                                      <title>{`${labels[i]}: ${valueFormat.format(v)}`}</title>
                                  </rect>
                              );
                          })
                      )
                    : series.map((s, si) => (
                          <g key={si}>
                              <polyline
                                  fill="none"
                                  stroke={SERIES_COLORS[si]}
                                  strokeWidth={2}
                                  points={s.values
                                      .map((v, i) => `${PAD.left + i * slot + slot / 2},${yOf(v)}`)
                                      .join(' ')}
                              />
                              {labels.length <= MAX_POINT_MARKERS &&
                                  s.values.map((v, i) => (
                                      <circle
                                          key={i}
                                          cx={PAD.left + i * slot + slot / 2}
                                          cy={yOf(v)}
                                          r={2.5}
                                          fill={SERIES_COLORS[si]}
                                      >
                                          <title>{`${labels[i]}: ${valueFormat.format(v)}`}</title>
                                      </circle>
                                  ))}
                          </g>
                      ))}
                {labels.map((label, i) => {
                    if (i % labelStep !== 0) return null;
                    return (
                        <text
                            key={i}
                            x={PAD.left + i * slot + slot / 2}
                            y={HEIGHT - 8}
                            fontSize={9}
                            textAnchor="middle"
                            fill="rgba(0,0,0,0.55)"
                        >
                            {label.length > 10 ? `${label.slice(0, 9)}…` : label}
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
                            {s.name}
                        </span>
                    ))}
                </div>
            )}
            {/* The exact figures behind the chart (axis labels are rounded and thinned out). */}
            <Button
                type="link"
                size="small"
                icon={<TableOutlined />}
                onClick={() => setShowData((v) => !v)}
                aria-expanded={showData}
                style={{ padding: 0, height: 'auto', fontSize: 12 }}
            >
                {showData
                    ? tt('common:cellabot-chart-hide-data', 'Hide data')
                    : tt('common:cellabot-chart-show-data', 'Show data')}
            </Button>
            {showData && (
                <DataTable>
                    <table>
                        <thead>
                            <tr>
                                <th />
                                {series.map((s, si) => (
                                    <th key={si}>{s.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((label, i) => (
                                <tr key={i}>
                                    <td>{label}</td>
                                    {series.map((s, si) => (
                                        <td key={si}>{exactFormat.format(s.values[i])}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DataTable>
            )}
        </Card>
    );
};

export default CellaBotChart;
