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
/**
 * The visuals of the seasonal header (helpers/utils/season.ts says which season is on,
 * styles/seasons.css holds the styles and animations):
 *   - SeasonLogo: the logo, smaller and wearing the season's accessory (a Santa hat, a witch hat,
 *     bunny ears);
 *   - SeasonLeftExtras: the Halloween pumpkin and the greeting, in the font of the season;
 *   - SeasonDecorLayers: the animated scene of the season, in absolute layers under the header's
 *     content — a snowy village and the sleigh at Christmas, a haunted night at Halloween, an egg
 *     hunt at Easter;
 *   - SeasonSiderDecor: the side menu's share (components/layouts/MainLayout.tsx), over the whole
 *     height of the sider — stars and snow under a snow cap, a cobweb, a spider and a ghost, a
 *     meadow of eggs and flowers at the foot of the menu.
 * All inline SVG and CSS. The "random" positions (flakes, stars, confetti) come from a seeded
 * generator: the drawing is the same from one render to the next, the server's included. The
 * scenes are drawn 2880 px wide and cropped on the right on narrower screens. The former sober
 * levels and the lighter festive scenes are archived as a patch on the App Router branch, claude/inspiring-planck-geo5zz:
 * .claude/archive/seasonal-header-levels-1-to-4.
 */
import { Logo } from 'components/common/dumb/Logo/Logo';
import { SeasonKey, SeasonTheme } from 'helpers/utils/season';
import Head from 'next/head';
import { CSSProperties, FC, ReactNode } from 'react';

const SCENE_W = 2880;
const MODULE_W = 1440;
const H = 59;

const createRandom = (seed: number) => {
    let t = seed >>> 0;
    return () => {
        t = (t + 0x6d2b79f5) >>> 0;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
};

const px = (value: number) => String(Math.round(value * 10) / 10);

/* ─── géométrie des scènes ─────────────────────────────────────────────────────────────── */

const dripsPath = (band = 5, step = 74, radius = 4.5, seed = 7) => {
    const random = createRandom(seed);
    const parts = [`M0 0 H${SCENE_W} V${band}`];
    for (let x = SCENE_W - 30; x > 20; x -= step) {
        const length = band + 5 + random() * 17;
        const r = radius * (0.7 + 0.7 * random());
        parts.push(
            `H${px(x + r)} V${px(length)} a${px(r)} ${px(r)} 0 0 1 ${px(-2 * r)} 0 V${band}`
        );
    }
    parts.push('H0 Z');
    return parts.join(' ');
};

const grassPath = (minH: number, maxH: number, step: number, seed: number, width = MODULE_W) => {
    const random = createRandom(seed);
    const parts = [`M0 ${H} V${H - minH}`];
    for (let x = 0; x < width; x += step) {
        const h = minH + random() * (maxH - minH);
        parts.push(`L${px(x + step / 2)} ${px(H - h)} L${px(x + step)} ${px(H - minH + 1)}`);
    }
    parts.push(`H${width} V${H} Z`);
    return parts.join(' ');
};

const sagStringPath = (step: number, sag: number, y0: number) => {
    const parts = [`M0 ${y0}`];
    for (let x = 0; x < SCENE_W; x += step) {
        parts.push(`Q${px(x + step / 2)} ${px(y0 + 2 * sag)} ${px(x + step)} ${y0}`);
    }
    return parts.join(' ');
};

const quadraticPoint = (
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    t: number
) => {
    const u = 1 - t;
    return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
};

const groundWavePath = (top = 55, amp = 2.5, step = 90, width = MODULE_W) => {
    const parts = [`M0 ${H} V${top}`];
    for (let x = 0; x < width; x += step) {
        parts.push(`Q${px(x + step / 2)} ${px(top - amp)} ${px(x + step)} ${top}`);
    }
    parts.push(`H${width} V${H} Z`);
    return parts.join(' ');
};

/* ─── briques ──────────────────────────────────────────────────────────────────────────── */

const Layer: FC<{ z: number; children: ReactNode }> = ({ z, children }) => (
    <div className="ssn-layer" aria-hidden="true" style={{ zIndex: z }}>
        {children}
    </div>
);

const Scene: FC<{ children: ReactNode }> = ({ children }) => (
    <svg
        className="ssn-scene"
        viewBox={`0 0 ${SCENE_W} ${H}`}
        preserveAspectRatio="xMinYMax slice"
        aria-hidden="true"
    >
        {children}
    </svg>
);

const BAT_PATH =
    'M12 10.2c-.9 0-1.4.7-1.4 1.4C9.4 10 7.6 9 5.4 9 3.4 9 1.8 10.3 1.8 10.3s1.5-.2 2.5.6c.9.8.9 2 .9 2s.9-.7 2-.3c1.1.4 1.2 1.7 1.2 1.7s1-1.3 2.6-1.3h2c1.6 0 2.6 1.3 2.6 1.3s.1-1.3 1.2-1.7c1.1-.4 2 .3 2 .3s0-1.2.9-2c1-.8 2.5-.6 2.5-.6S20.6 9 18.6 9c-2.2 0-4 1-5.2 2.6 0-.7-.5-1.4-1.4-1.4z';

const SNOWFLAKE_BRANCH = 'M12 2v20M9.8 3.8L12 5l2.2-1.2M9.8 20.2L12 19l2.2 1.2';

const SnowflakeShape: FC = () => (
    <>
        <path d={SNOWFLAKE_BRANCH} />
        <path d={SNOWFLAKE_BRANCH} transform="rotate(60 12 12)" />
        <path d={SNOWFLAKE_BRANCH} transform="rotate(120 12 12)" />
    </>
);

const SantaHat: FC = () => (
    <svg
        className="ssn-accessory"
        viewBox="0 0 32 26"
        aria-hidden="true"
        style={{
            left: 10,
            top: -7,
            width: 32,
            height: 26,
            transform: 'rotate(12deg)',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))'
        }}
    >
        <path d="M4 19 C6 7 13 2 25 3.5 C20 7 17.5 13 18.5 19 Z" fill="#d7262d" />
        <path d="M4 19 C6 7 13 2 25 3.5" fill="none" stroke="#b11c22" strokeWidth={0.8} />
        <rect x={1.5} y={17} width={20} height={6.5} rx={3.2} fill="#ffffff" />
        <circle cx={26} cy={4.2} r={3.4} fill="#ffffff" />
    </svg>
);

const WitchHat: FC = () => (
    <svg
        className="ssn-accessory"
        viewBox="0 0 36 26"
        aria-hidden="true"
        style={{
            left: 3,
            top: -9,
            width: 36,
            height: 26,
            transform: 'rotate(-10deg)',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.4))'
        }}
    >
        <ellipse cx={18} cy={21} rx={16.5} ry={4} fill="#15101c" />
        <path d="M9 21 C12 12 14 7 19.5 1.5 C19 8 24 14 27 21 Z" fill="#1b1426" />
        <path
            d="M11.2 17.6 C14 19.2 22 19.4 25.4 17.4 L26.3 20.2 C22 22 13 22 10.2 20.2 Z"
            fill="#7b3fbf"
        />
        <rect
            x={16.5}
            y={17.6}
            width={4.6}
            height={3.6}
            rx={0.6}
            fill="none"
            stroke="#f2c94c"
            strokeWidth={1.1}
        />
    </svg>
);

const BunnyEars: FC = () => (
    <svg
        className="ssn-accessory"
        viewBox="0 0 36 22"
        aria-hidden="true"
        style={{ left: 3, top: -15, width: 36, height: 22 }}
    >
        <g transform="rotate(-14 12 11)">
            <ellipse
                cx={12}
                cy={11}
                rx={4.6}
                ry={11}
                fill="#ffffff"
                stroke="#e8e8e8"
                strokeWidth={0.8}
            />
            <ellipse cx={12} cy={12} rx={2.2} ry={7.5} fill="#f7b6c9" />
        </g>
        <g transform="rotate(14 24 11)">
            <ellipse
                cx={24}
                cy={11}
                rx={4.6}
                ry={11}
                fill="#ffffff"
                stroke="#e8e8e8"
                strokeWidth={0.8}
            />
            <ellipse cx={24} cy={12} rx={2.2} ry={7.5} fill="#f7b6c9" />
        </g>
    </svg>
);

const Jack: FC<{ size: number }> = ({ size }) => (
    <svg
        className="ssn-jack"
        viewBox="0 0 40 40"
        aria-hidden="true"
        style={{ width: size, height: size }}
    >
        <path
            d="M20 9.5c-2.5-2-9.5-2-11.5 4.5-1.8 5.8 1 14 6 16.5 2.2 1.1 4.2.6 5.5-.8 1.3 1.4 3.3 1.9 5.5.8 5-2.5 7.8-10.7 6-16.5-2-6.5-9-6.5-11.5-4.5z"
            fill="#ff7a1a"
            stroke="#b94e0a"
            strokeWidth={1.2}
        />
        <path
            d="M15.5 30.5c-1.5-5.5-1.6-13 .5-19M24.5 30.5c1.5-5.5 1.6-13-.5-19"
            fill="none"
            stroke="#c95c10"
            strokeWidth={1.1}
        />
        <path
            d="M20 9.5V6.3c0-1.6 1-3 2.8-3.4"
            fill="none"
            stroke="#3e7a2a"
            strokeWidth={2.2}
            strokeLinecap="round"
        />
        <g className="ssn-jackface" fill="#ffe58a">
            <path d="M11.5 19.5l4-5 3 5zM21.5 19.5l3-5 4 5zM18.3 23.4l1.7-2.6 1.7 2.6z" />
            <path d="M11 25.5l3.4 2.2 2.4-2.2 2.6 2.4 2.6-2.4 2.4 2.2 3.4-2.2c-1.5 4-4.4 6.3-8.4 6.3s-6.9-2.3-8.4-6.3z" />
        </g>
    </svg>
);

const Ghost: FC = () => (
    <svg viewBox="0 0 30 38" aria-hidden="true" style={{ width: 30, height: 38, display: 'block' }}>
        <path
            d="M15 2C7.5 2 4 8.5 4 16v18l3.6-3 3.7 3 3.7-3 3.7 3 3.7-3 3.6 3V16C26 8.5 22.5 2 15 2z"
            fill="#f7f7ff"
            stroke="#d9d9ea"
            strokeWidth={0.8}
        />
        <ellipse cx={11} cy={15} rx={2} ry={3} fill="#1b1426" />
        <ellipse cx={19} cy={15} rx={2} ry={3} fill="#1b1426" />
        <ellipse cx={15} cy={22.5} rx={2} ry={2.8} fill="#1b1426" />
    </svg>
);

const WEB_ANGLES = [196, 222, 248, 274, 300, 326];

/** Demi-toile accrochée au bord haut, centrée sur x0. */
const SpiderWeb: FC<{ color: string; x0: number; radius?: number }> = ({
    color,
    x0,
    radius = 46
}) => {
    const rays = WEB_ANGLES.map((angle) => {
        const a = (angle * Math.PI) / 180;
        return (
            <line
                key={angle}
                x1={x0}
                y1={0}
                x2={px(x0 + radius * Math.cos(a))}
                y2={px(-radius * Math.sin(a))}
            />
        );
    });
    const rings = [12, 24, 36, 46].map((r) => {
        const points = WEB_ANGLES.map((angle) => {
            const a = (angle * Math.PI) / 180;
            return [x0 + r * Math.cos(a), -r * Math.sin(a)];
        });
        let d = `M${px(points[0][0])} ${px(points[0][1])}`;
        for (let i = 1; i < points.length; i++) {
            const mx = (points[i - 1][0] + points[i][0]) / 2;
            const my = (points[i - 1][1] + points[i][1]) / 2;
            d += ` Q${px(mx + (x0 - mx) * 0.14)} ${px(my + (0 - my) * 0.14)} ${px(points[i][0])} ${px(points[i][1])}`;
        }
        return <path key={r} d={d} />;
    });
    return (
        <g fill="none" stroke={color} strokeWidth={1}>
            {rays}
            {rings}
        </g>
    );
};

const Spider: FC<{ color: string; x: number }> = ({ color, x }) => (
    <g className="ssn-spider" style={{ transformOrigin: `${x}px 0` }}>
        <line x1={x} y1={0} x2={x} y2={22} stroke={color} strokeWidth={0.8} />
        <g fill={color} stroke={color} strokeWidth={1.2} strokeLinecap="round">
            <circle cx={x} cy={27} r={4.2} />
            <circle cx={x} cy={21.5} r={2.4} />
            <path
                d={`M${x - 3} 25l-6-5-2 2M${x - 3.5} 27.5l-7-1.5-1.5 2.5M${x - 3} 29.5l-6 3-1 3M${x - 2} 31l-3.5 5 .5 3`}
            />
            <path
                d={`M${x + 3} 25l6-5 2 2M${x + 3.5} 27.5l7-1.5 1.5 2.5M${x + 3} 29.5l6 3 1 3M${x + 2} 31l3.5 5-.5 3`}
            />
        </g>
    </g>
);

/** Village en papier découpé (480 px), répété sur toute la largeur ; les fenêtres vacillent. */
const Village: FC = () => (
    <>
        <g id="ssn-village" fill="#eef3fb">
            <path d="M0 59V54Q60 50 120 54T240 54T360 54T480 54V59Z" />
            <path d="M28 54V38L48 24L68 38V54Z" />
            <rect x={56} y={26} width={6} height={9} />
            <rect className="ssn-win" x={40} y={42} width={4} height={5} />
            <rect className="ssn-win" x={52} y={42} width={4} height={5} />
            {[92, 108, 300, 318].map((x) => (
                <path
                    key={x}
                    d={`M${x} 55L${x - 9} 55L${x - 3} 46L${x - 7} 46L${x} 32L${x + 7} 46L${x + 3} 46L${x + 9} 55Z`}
                />
            ))}
            <path d="M140 54V40L156 28L172 40V54Z" />
            <path d="M172 54V40H204V54Z" />
            <path d="M168 40L204 40L204 36L190 30L172 36Z" />
            <rect className="ssn-win" x={150} y={44} width={4} height={5} />
            <rect className="ssn-win" x={180} y={44} width={4} height={5} />
            <rect className="ssn-win" x={192} y={44} width={4} height={5} />
            <path d="M226 54V34L240 22L254 34V54Z" />
            <rect x={254} y={30} width={14} height={24} />
            <path d="M252 30L261 8L270 30Z" />
            <rect className="ssn-win" x={238} y={40} width={4} height={7} />
            <rect className="ssn-win" x={259} y={34} width={3} height={4} />
            <path d="M372 54V42L386 30L400 42V54Z" />
            <rect x={392} y={32} width={5} height={7} />
            <rect className="ssn-win" x={380} y={45} width={4} height={5} />
            <circle cx={436} cy={50} r={5} />
            <circle cx={436} cy={42} r={3.5} />
        </g>
        {[1, 2, 3, 4, 5].map((i) => (
            <use key={i} href="#ssn-village" x={480 * i} />
        ))}
    </>
);

/** Manoir, arbres morts, tombes et barrière en silhouette (module de 1440 px, répété une fois). */
const Haunted: FC = () => (
    <>
        <g id="ssn-haunted" fill="#07040c">
            <path d={groundWavePath(55, 2.5, 90)} />
            <path d="M600 56V34l9-9 9 9v-4h8v-7l6-9 7 9v19h22V28l10-11 10 11v28z" />
            <path d="M636 20l-5 3 4 1z" />
            <g className="ssn-win" fill="#ffb03a">
                <rect x={606} y={40} width={4} height={6} />
                <rect x={626} y={36} width={4} height={5} />
                <rect x={654} y={34} width={4} height={6} />
                <rect x={668} y={44} width={4} height={6} />
            </g>
            {[
                [250, 1],
                [1010, 0.8],
                [1120, 0.6]
            ].map(([x, s]) => (
                <g
                    key={x}
                    transform={`translate(${x} 59) scale(${s})`}
                    fill="none"
                    stroke="#07040c"
                    strokeLinecap="round"
                >
                    <path d="M0 0V-24" strokeWidth={3} />
                    <path
                        d="M0-14l-9-9M0-18l7-8M-9-23l-4-6M7-26l6-3M0-24l-3-7M0-24l4-5"
                        strokeWidth={1.6}
                    />
                </g>
            ))}
            {[120, 150, 420, 470, 860, 905, 1300].map((x) => (
                <path key={x} d={`M${x} 57V49a6 6 0 0 1 12 0v8z`} />
            ))}
            <path d="M156 57V51l10-3v9z" />
            {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={700 + i * 10} y={48} width={2} height={9} />
            ))}
            <rect x={700} y={50} width={120} height={1.5} />
            <rect x={700} y={54} width={120} height={1.5} />
        </g>
        <use href="#ssn-haunted" x={MODULE_W} />
    </>
);

type EggPattern = 'stripes' | 'dots' | 'zigzag' | 'flowers';
const EGG_PATH = 'M10 1C4.5 1 1 10 1 15.5a9 9 0 0 0 18 0C19 10 15.5 1 10 1z';

const Egg: FC<{
    id: string;
    x: number;
    y: number;
    scale: number;
    base: string;
    color: string;
    pattern: EggPattern;
    wobbleDelay?: number;
}> = ({ id, x, y, scale, base, color, pattern, wobbleDelay }) => {
    const clipId = `ssn-egg-${id}`;
    let decoration: ReactNode;
    switch (pattern) {
        case 'stripes':
            decoration = (
                <g clipPath={`url(#${clipId})`} stroke={color} strokeWidth={2.4}>
                    <path d="M0 8H20M0 13H20M0 18H20" />
                </g>
            );
            break;
        case 'dots':
            decoration = (
                <g clipPath={`url(#${clipId})`} fill={color}>
                    {[
                        [6, 7],
                        [12, 6],
                        [4, 13],
                        [10, 12],
                        [16, 13],
                        [7, 19],
                        [13, 19]
                    ].map(([cx, cy]) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.5} />
                    ))}
                </g>
            );
            break;
        case 'zigzag':
            decoration = (
                <g clipPath={`url(#${clipId})`} fill="none" stroke={color} strokeWidth={1.8}>
                    <path d="M0 11l3-3 3 3 3-3 3 3 3-3 3 3 3-3M0 18l3-3 3 3 3-3 3 3 3-3 3 3 3-3" />
                </g>
            );
            break;
        default:
            decoration = (
                <g clipPath={`url(#${clipId})`} fill={color}>
                    {[
                        [5, 9],
                        [11, 14],
                        [13, 6]
                    ].map(([cx, cy]) => (
                        <g key={`${cx}-${cy}`}>
                            <circle cx={cx} cy={cy} r={1.3} />
                            <circle cx={cx + 2.4} cy={cy} r={1.3} />
                            <circle cx={cx + 1.2} cy={cy - 2} r={1.3} />
                            <circle cx={cx + 1.2} cy={cy + 2} r={1.3} />
                        </g>
                    ))}
                </g>
            );
    }
    return (
        <g
            className={wobbleDelay === undefined ? undefined : 'ssn-egg'}
            style={wobbleDelay === undefined ? undefined : { animationDelay: `${wobbleDelay}s` }}
            transform={`translate(${x} ${y}) scale(${scale})`}
        >
            <clipPath id={clipId}>
                <path d={EGG_PATH} />
            </clipPath>
            <path d={EGG_PATH} fill={base} stroke="rgba(0,0,0,.18)" strokeWidth={0.8} />
            {decoration}
        </g>
    );
};

const Tulip: FC<{ x: number; y: number; color: string; scale?: number }> = ({
    x,
    y,
    color,
    scale = 1
}) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M7 28V12" stroke="#3f9a4a" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M7 24C3 22 1 19 2 16c3 1 5 3 5 8zM7 22c4-2 6-5 5-8-3 1-5 3-5 8z" fill="#4caf50" />
        <path d="M7 2L2 8v4.5C4 14.5 10 14.5 12 12.5V8z" fill={color} />
        <path d="M7 2L4.6 8.5M7 2l2.4 6.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={0.9} />
    </g>
);

const Daisy: FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M0 18V5" stroke="#3f9a4a" strokeWidth={1.4} strokeLinecap="round" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
                key={angle}
                cx={0}
                cy={-5}
                rx={1.8}
                ry={4.2}
                fill="#ffffff"
                stroke="#e6e6e6"
                strokeWidth={0.4}
                transform={`rotate(${angle})`}
            />
        ))}
        <circle r={2.4} fill="#ffcc33" />
    </g>
);

const WHITE_FUR = { fill: '#ffffff', stroke: '#dcdcdc', strokeWidth: 0.7 };

const Bunny: FC = () => (
    <svg
        viewBox="0 0 48 36"
        aria-hidden="true"
        style={{ width: 48, height: 36, display: 'block', overflow: 'visible' }}
    >
        <g transform="rotate(-8 30 6)">
            <ellipse cx={30} cy={6} rx={3.2} ry={8} {...WHITE_FUR} />
            <ellipse cx={30} cy={7} rx={1.4} ry={5.5} fill="#f7b6c9" />
        </g>
        <g transform="rotate(12 37 6)">
            <ellipse cx={37} cy={6} rx={3.2} ry={8} {...WHITE_FUR} />
            <ellipse cx={37} cy={7} rx={1.4} ry={5.5} fill="#f7b6c9" />
        </g>
        <ellipse cx={18} cy={25} rx={14} ry={10} {...WHITE_FUR} />
        <circle cx={6} cy={22} r={4.2} {...WHITE_FUR} />
        <circle cx={33} cy={18} r={8.5} {...WHITE_FUR} />
        <ellipse cx={14} cy={34} rx={6} ry={2.2} {...WHITE_FUR} />
        <ellipse cx={27} cy={34} rx={5} ry={2} {...WHITE_FUR} />
        <circle cx={36} cy={16} r={1.3} fill="#1f2a37" />
        <ellipse cx={41} cy={19.5} rx={1.6} ry={1.1} fill="#f08aa8" />
        <path d="M41 20.5l-2 2M41 20.5l2.2 1.6" stroke="#1f2a37" strokeWidth={0.6} fill="none" />
    </svg>
);

const Chick: FC = () => (
    <svg viewBox="0 0 22 22" aria-hidden="true" style={{ width: 22, height: 22, display: 'block' }}>
        <circle cx={11} cy={14} r={7} fill="#ffd93b" stroke="#e6b800" strokeWidth={0.7} />
        <circle cx={11} cy={7} r={5} fill="#ffd93b" stroke="#e6b800" strokeWidth={0.7} />
        <ellipse cx={5.5} cy={14} rx={2.6} ry={4} fill="#ffcc1a" transform="rotate(20 5.5 14)" />
        <circle cx={13} cy={6} r={0.9} fill="#1f2a37" />
        <path d="M15.5 7.5l3.5 1-3.5 1.4z" fill="#ff8c1a" />
        <path
            d="M8 21v-1.5M13.5 21v-1.5"
            stroke="#ff8c1a"
            strokeWidth={1.2}
            strokeLinecap="round"
        />
    </svg>
);

const GOLD = '#f8d775';

const Reindeer: FC = () => (
    <g fill={GOLD}>
        <ellipse cx={20} cy={28} rx={11} ry={5.5} />
        <circle cx={31} cy={22} r={4} />
        <path
            d="M34 20l5-5M31 18l1-6"
            stroke={GOLD}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
        />
        <path
            d="M39 15l-3-1M39 15l1-3M32 12l-2-2M32 12l2-3"
            stroke={GOLD}
            strokeWidth={1.2}
            strokeLinecap="round"
            fill="none"
        />
        <path
            d="M12 32l-3 9M17 33l1 9M24 33l-2 9M28 32l4 8"
            stroke={GOLD}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
        />
    </g>
);

const Sleigh: FC = () => (
    <svg
        viewBox="0 0 150 44"
        aria-hidden="true"
        style={{
            width: 150,
            height: 44,
            display: 'block',
            overflow: 'visible',
            filter: 'drop-shadow(0 0 4px rgba(255,228,140,.8))'
        }}
    >
        {/* the sleigh flies to the right (ssn-sleigh): the reindeer pull it, ahead of it */}
        <g transform="translate(-88 0)">
            <path
                d="M95 40c-4 0-6-3-5-6h50c1 3-1 6-5 6zM92 34l3-12c1-3 3-4 6-4h26l6 16z"
                fill={GOLD}
            />
            <path
                d="M127 18c4-6 9-6 11-2 1 3-2 5-5 4"
                fill="none"
                stroke={GOLD}
                strokeWidth={2.5}
                strokeLinecap="round"
            />
            <circle cx={117} cy={15} r={4} fill={GOLD} />
            <path d="M111 24c0-6 12-6 12 0z" fill={GOLD} />
            <path d="M86 36h54" stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
        </g>
        <g transform="translate(58 0)">
            <Reindeer />
        </g>
        <g transform="translate(100 0)">
            <Reindeer />
        </g>
        {/* the reins: the sleigh's front to the first reindeer, then to the second */}
        <path
            d="M46 22c7 2 14 4 21 5M89 26c7 0 13 1 20 1"
            stroke={GOLD}
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
        />
    </svg>
);

/* ─── couches ──────────────────────────────────────────────────────────────────────────── */

const SnowLayer: FC<{ count: number; glyphs: number; seed: number; z: number }> = ({
    count,
    glyphs,
    seed,
    z
}) => {
    const random = createRandom(seed);
    const flakes = Array.from({ length: count }, (_, i) => {
        const size = 2 + random() * 3.2;
        return (
            <span
                key={`f${i}`}
                className="ssn-flake"
                style={{
                    left: `${px(random() * 100)}%`,
                    width: px(size) + 'px',
                    height: px(size) + 'px',
                    opacity: 0.55 + random() * 0.4,
                    animationDuration: `${px(6 + random() * 7)}s`,
                    animationDelay: `-${px(random() * 12)}s`
                }}
            />
        );
    });
    const big = Array.from({ length: glyphs }, (_, i) => {
        const size = 10 + random() * 6;
        return (
            <span
                key={`g${i}`}
                className="ssn-flakeglyph"
                style={{
                    left: `${px(random() * 100)}%`,
                    animationDuration: `${px(9 + random() * 6)}s`,
                    animationDelay: `-${px(random() * 12)}s`
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    style={{
                        width: size,
                        height: size,
                        opacity: 0.85,
                        animationDuration: `${px(5 + random() * 5)}s`
                    }}
                >
                    <SnowflakeShape />
                </svg>
            </span>
        );
    });
    return (
        <Layer z={z}>
            {flakes}
            {big}
        </Layer>
    );
};

const BULB_COLORS = ['#ff4d4f', '#ffd666', '#73d13d', '#40a9ff', '#ff85c0', '#ffffff'];

const LightsLayer: FC<{ z: number; wire: string }> = ({ z, wire }) => {
    const step = 96;
    const sag = 7;
    const y0 = 1;
    const bulbs: ReactNode[] = [];
    let k = 0;
    for (let x = 0; x < SCENE_W; x += step) {
        for (const t of [0.22, 0.5, 0.78]) {
            const [bx, by] = quadraticPoint(x, y0, x + step / 2, y0 + 2 * sag, x + step, y0, t);
            const color = BULB_COLORS[k % BULB_COLORS.length];
            bulbs.push(
                <g
                    key={k}
                    className="ssn-bulb"
                    style={{
                        color,
                        animationDuration: `${px(1.1 + (k % 5) * 0.35)}s`,
                        animationDelay: `-${px((k * 0.37) % 2)}s`
                    }}
                >
                    <rect x={px(bx - 1.4)} y={px(by)} width={2.8} height={2.4} fill="#2a2a2a" />
                    <ellipse cx={px(bx)} cy={px(by + 6)} rx={2.7} ry={3.8} fill={color} />
                </g>
            );
            k += 1;
        }
    }
    return (
        <Layer z={z}>
            <Scene>
                <path
                    d={sagStringPath(step, sag, y0)}
                    fill="none"
                    stroke={wire}
                    strokeWidth={1.4}
                />
                {bulbs}
            </Scene>
        </Layer>
    );
};

const StarsLayer: FC<{ count: number; seed: number; z: number }> = ({ count, seed, z }) => {
    const random = createRandom(seed);
    return (
        <Layer z={z}>
            {Array.from({ length: count }, (_, i) => {
                const size = 1.4 + random() * 1.6;
                return (
                    <span
                        key={i}
                        className="ssn-star"
                        style={{
                            left: `${px(random() * 100)}%`,
                            top: px(random() * 34) + 'px',
                            width: px(size) + 'px',
                            height: px(size) + 'px',
                            animationDuration: `${px(1.6 + random() * 2.4)}s`,
                            animationDelay: `-${px(random() * 3)}s`
                        }}
                    />
                );
            })}
        </Layer>
    );
};

type BatSpec = [top: number, size: number, duration: number, delay: number, bob: number];

const BatsLayer: FC<{ specs: BatSpec[]; color: string; z: number }> = ({ specs, color, z }) => (
    <Layer z={z}>
        {specs.map(([top, size, duration, delay, bob], i) => (
            <div
                key={i}
                className="ssn-flyer"
                style={{ top, animationDuration: `${duration}s`, animationDelay: `-${delay}s` }}
            >
                <div className="ssn-bob" style={{ animationDuration: `${bob}s` }}>
                    <svg
                        className="ssn-flap"
                        viewBox="0 0 24 24"
                        fill={color}
                        aria-hidden="true"
                        style={{ width: size, height: size }}
                    >
                        <path d={BAT_PATH} />
                    </svg>
                </div>
            </div>
        ))}
    </Layer>
);

const CONFETTI_COLORS = ['#ff6b9d', '#ffb347', '#6cc24a', '#4fa3f7', '#b48cf2', '#ffd93b'];

const ConfettiLayer: FC<{ count: number; seed: number; z: number }> = ({ count, seed, z }) => {
    const random = createRandom(seed);
    return (
        <Layer z={z}>
            {Array.from({ length: count }, (_, i) => (
                <span
                    key={i}
                    className="ssn-conf"
                    style={{
                        left: `${px(random() * 100)}%`,
                        animationDuration: `${px(5 + random() * 5)}s`,
                        animationDelay: `-${px(random() * 10)}s`
                    }}
                >
                    <i
                        style={{
                            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                            animationDuration: `${px(1 + random() * 1.5)}s`,
                            width: px(4 + random() * 3) + 'px',
                            height: px(6 + random() * 4) + 'px'
                        }}
                    />
                </span>
            ))}
        </Layer>
    );
};

/* ─── scènes ───────────────────────────────────────────────────────────────────────────── */

const ChristmasNight: FC = () => (
    <>
        <StarsLayer count={60} seed={5} z={0} />
        <Layer z={0}>
            <div
                style={{
                    position: 'absolute',
                    right: 150,
                    top: 4,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 38% 38%, #fffbe6, #f2e3a3)',
                    boxShadow: '0 0 18px 5px rgba(246,231,178,.45)'
                }}
            />
        </Layer>
        <Layer z={1}>
            <Scene>
                <Village />
            </Scene>
        </Layer>
        <Layer z={2}>
            <div className="ssn-sleigh">
                <Sleigh />
            </div>
        </Layer>
        <SnowLayer count={46} glyphs={9} seed={19} z={3} />
        <LightsLayer z={4} wire="#0b2a4a" />
    </>
);

const HalloweenNight: FC = () => (
    <>
        <StarsLayer count={44} seed={9} z={0} />
        <Layer z={0}>
            <div
                style={{
                    position: 'absolute',
                    right: 160,
                    top: 6,
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 40%, #fff6cf, #f1dc9a 70%, #e5c97d)',
                    boxShadow: '0 0 26px 8px rgba(241,220,154,.5)'
                }}
            >
                <span
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: 14,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,.08)'
                    }}
                />
                <span
                    style={{
                        position: 'absolute',
                        left: 28,
                        top: 26,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,.08)'
                    }}
                />
            </div>
        </Layer>
        <BatsLayer
            specs={[
                [10, 22, 18, 3, 1.4],
                [24, 16, 24, 11, 1.1],
                [6, 12, 29, 17, 1.6]
            ]}
            color="#000000"
            z={1}
        />
        <Layer z={2}>
            <Scene>
                <Haunted />
            </Scene>
        </Layer>
        <Layer z={3}>
            <div className="ssn-fog" style={{ left: 80, width: 300, animationDuration: '16s' }} />
            <div
                className="ssn-fog"
                style={{ left: 560, width: 360, animationDuration: '21s', animationDelay: '-7s' }}
            />
            <div
                className="ssn-fog"
                style={{ left: 1000, width: 300, animationDuration: '18s', animationDelay: '-3s' }}
            />
            <Scene>
                <path d={dripsPath(5, 90, 4, 13)} fill="#6fdc6f" />
                <path d={dripsPath(5, 90, 4, 13)} fill="none" stroke="#3f9f3f" strokeWidth={0.8} />
                <SpiderWeb color="rgba(255,255,255,.6)" x0={1090} />
                <Spider color="#f3f3f3" x={1040} />
            </Scene>
        </Layer>
        <Layer z={4}>
            <div className="ssn-ghost" style={{ left: 880, top: 10 }}>
                <Ghost />
            </div>
        </Layer>
    </>
);

const HuntField: FC = () => (
    <>
        <g id="ssn-hunt">
            <path d={grassPath(5, 12, 7, 5)} fill="#5cb648" />
            <path d={grassPath(3, 8, 6, 12)} fill="#7fd065" />
            <Egg
                id="h1"
                x={380}
                y={16}
                scale={1.5}
                base="#ffd1dc"
                color="#e0528c"
                pattern="stripes"
                wobbleDelay={0}
            />
            <Egg
                id="h2"
                x={520}
                y={20}
                scale={1.3}
                base="#c9f1d5"
                color="#3fa65b"
                pattern="dots"
                wobbleDelay={0.4}
            />
            <Egg
                id="h3"
                x={700}
                y={14}
                scale={1.6}
                base="#cfe8ff"
                color="#3b8fd8"
                pattern="zigzag"
                wobbleDelay={0.8}
            />
            <Egg
                id="h4"
                x={860}
                y={22}
                scale={1.2}
                base="#fff1b8"
                color="#f08a24"
                pattern="flowers"
                wobbleDelay={1.2}
            />
            <Egg
                id="h5"
                x={1040}
                y={16}
                scale={1.45}
                base="#e6d6ff"
                color="#8a63d2"
                pattern="stripes"
                wobbleDelay={0.2}
            />
            <Egg
                id="h6"
                x={1380}
                y={20}
                scale={1.3}
                base="#ffe4c4"
                color="#e8524a"
                pattern="dots"
                wobbleDelay={0.6}
            />
            <Tulip x={300} y={30} color="#e8524a" />
            <Tulip x={1190} y={31} color="#ffd93b" scale={0.9} />
            <Daisy x={620} y={41} />
            <Daisy x={960} y={42} scale={0.9} />
            <Daisy x={1300} y={41} scale={0.9} />
        </g>
        <use href="#ssn-hunt" x={MODULE_W} />
    </>
);

const EasterHunt: FC = () => (
    <>
        <Layer z={0}>
            <div className="ssn-candy" />
        </Layer>
        <Layer z={1}>
            <Scene>
                <HuntField />
            </Scene>
        </Layer>
        <Layer z={2}>
            <div className="ssn-chick" style={{ left: 460, bottom: 6, animationDelay: '-.3s' }}>
                <Chick />
            </div>
            <div className="ssn-chick" style={{ left: 1120, bottom: 6, animationDelay: '-.8s' }}>
                <Chick />
            </div>
        </Layer>
        <ConfettiLayer count={50} seed={21} z={3} />
        <Layer z={4}>
            <div className="ssn-hopper">
                <div className="ssn-hop">
                    <Bunny />
                </div>
            </div>
        </Layer>
    </>
);

/* ─── the components the header renders ─────────────────────────────────────────────── */

/** The animated scene of the season, in absolute layers under the header's content. */
export const SeasonDecorLayers: FC<{ theme: SeasonTheme }> = ({ theme }) => {
    if (theme.season === 'christmas') {
        return <ChristmasNight />;
    }
    if (theme.season === 'halloween') {
        return <HalloweenNight />;
    }
    return <EasterHunt />;
};

const ACCESSORIES: Record<
    SeasonKey,
    { logoSize: number; paddingTop: number; accessory: ReactNode }
> = {
    christmas: { logoSize: 36, paddingTop: 4, accessory: <SantaHat /> },
    halloween: { logoSize: 36, paddingTop: 6, accessory: <WitchHat /> },
    easter: { logoSize: 34, paddingTop: 10, accessory: <BunnyEars /> }
};

/** The header's logo: as it is without a season, smaller and wearing the accessory with one. */
export const SeasonLogo: FC<{ theme: SeasonTheme | null }> = ({ theme }) => {
    if (!theme) {
        return <Logo width={45} />;
    }
    const { logoSize, paddingTop, accessory } = ACCESSORIES[theme.season];
    return (
        <span className="ssn-logo" style={{ paddingTop }}>
            <Logo width={logoSize} />
            {accessory}
        </span>
    );
};

const SEASON_FONTS: Record<SeasonKey, { family: string; href: string }> = {
    christmas: {
        family: "'Mountains of Christmas', cursive",
        href: 'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap'
    },
    halloween: {
        family: "'Creepster', cursive",
        href: 'https://fonts.googleapis.com/css2?family=Creepster&display=swap'
    },
    easter: {
        family: "'Fredoka', sans-serif",
        href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@700&display=swap'
    }
};

const EASTER_LETTER_COLORS = ['#e0528c', '#3fa65b', '#3b8fd8', '#f08a24', '#8a63d2'];

const colouredLetters = (text: string) => {
    let index = 0;
    return Array.from(text).map((char, i) => {
        if (char === ' ') {
            return <span key={i} style={{ width: '.3em' }} />;
        }
        const style: CSSProperties = {
            color: EASTER_LETTER_COLORS[index % EASTER_LETTER_COLORS.length],
            animationDelay: `${px(index * 0.08)}s`
        };
        index += 1;
        return (
            <span key={i} style={style}>
                {char}
            </span>
        );
    });
};

/** The greeting, in the font of the season (loaded on demand from Google Fonts). */
const Greeting: FC<{ theme: SeasonTheme; text: string }> = ({ theme, text }) => {
    if (!text) {
        return null;
    }
    const font = SEASON_FONTS[theme.season];
    let className = 'ssn-greeting';
    const style: CSSProperties = { fontFamily: font.family, fontWeight: 700, fontSize: 26 };
    let content: ReactNode = text;
    if (theme.season === 'christmas') {
        style.color = '#ffd666';
        style.textShadow = '0 0 10px rgba(255,214,102,.75), 0 1px 0 #5a3b00';
    } else if (theme.season === 'halloween') {
        style.letterSpacing = 1;
        style.fontWeight = 400;
        style.color = '#ff8a1f';
        className += ' ssn-glowtext';
    } else {
        className += ' ssn-bounce';
        style.textShadow = '0 1px 0 rgba(255,255,255,.8)';
        content = colouredLetters(text);
    }
    return (
        <span className={className} style={style}>
            {/* next/head puts the stylesheet in the document's head, once (its key) */}
            <Head>
                <link key="season-font" rel="stylesheet" href={font.href} />
            </Head>
            {content}
        </span>
    );
};

/**
 * Right of the logo: the Halloween pumpkin and the greeting. `greeting` comes from the DB
 * translations; empty, nothing shows. One inline row: the header's Space sees this component as
 * one item, and the pumpkin (a block) would otherwise stack above the greeting, beyond the
 * header's height.
 */
export const SeasonLeftExtras: FC<{ theme: SeasonTheme; greeting: string }> = ({
    theme,
    greeting
}) => (
    <span className="ssn-extras">
        {theme.season === 'halloween' && <Jack size={40} />}
        <Greeting theme={theme} text={greeting} />
    </span>
);

/* ─── the side menu (components/layouts/MainLayout.tsx) ────────────────────────────── */

const SIDER_W = 250;

/** Snow over the whole height of the side menu (the header's flakes fall 74 px). */
const SiderSnow: FC<{ count: number; seed: number }> = ({ count, seed }) => {
    const random = createRandom(seed);
    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                const size = 2 + random() * 3;
                return (
                    <span
                        key={i}
                        className="ssn-sflake"
                        style={{
                            left: `${px(random() * 100)}%`,
                            width: px(size) + 'px',
                            height: px(size) + 'px',
                            opacity: 0.5 + random() * 0.4,
                            animationDuration: `${px(14 + random() * 12)}s`,
                            animationDelay: `-${px(random() * 26)}s`
                        }}
                    />
                );
            })}
        </>
    );
};

/** Stars over the top of the side menu, the sky going on under the header. */
const SiderStars: FC<{ count: number; seed: number }> = ({ count, seed }) => {
    const random = createRandom(seed);
    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                const size = 1.4 + random() * 1.6;
                return (
                    <span
                        key={i}
                        className="ssn-star"
                        style={{
                            left: `${px(random() * 100)}%`,
                            top: px(random() * 170) + 'px',
                            width: px(size) + 'px',
                            height: px(size) + 'px',
                            animationDuration: `${px(1.6 + random() * 2.4)}s`,
                            animationDelay: `-${px(random() * 3)}s`
                        }}
                    />
                );
            })}
        </>
    );
};

/** The snow spilled over the header's ledge onto the top of the side menu: a scalloped layer
 * (mounds 16 to 32px wide, 2 to 5px deep under a 2.5px band) and a few icicles hanging between
 * them, the whole drawing inside SNOW_CAP_H — the icon of the first entry starts 14px under the
 * top of the sider, and the cap must not run over it. Drawn for the width of the sider, expanded
 * or collapsed, so that nothing is cut at its edge; a pale rim one pixel under the white gives
 * it its volume. */
const SNOW_CAP_H = 12;
const SIDER_COLLAPSED_W = 80;
const snowCapPaths = (width: number) => {
    const random = createRandom(width);
    const band = 2.5;
    const count = Math.max(1, Math.round(width / 22));
    const shares = Array.from({ length: count }, () => 0.7 + random() * 0.6);
    const total = shares.reduce((sum, share) => sum + share, 0);
    let x = 0;
    let cap = `M0 ${band}`;
    const cusps: number[] = [];
    shares.forEach((share, index) => {
        const w = (share / total) * width;
        const depth = 2 + random() * 3;
        cap += `Q${(x + w / 2).toFixed(1)} ${(band + 2 * depth).toFixed(1)} ${(x + w).toFixed(1)} ${band}`;
        x += w;
        if (index < count - 1) cusps.push(x);
    });
    cap += `V0H0Z`;
    const icicles = cusps
        .filter((_, index) => index % 3 === 1)
        .map((c) => {
            const length = 6 + random() * 2.5;
            const tip = (band + length).toFixed(1);
            const waist = (band + length * 0.65).toFixed(1);
            return `M${(c - 1.4).toFixed(1)} ${band}Q${(c - 1.1).toFixed(1)} ${waist} ${c.toFixed(1)} ${tip}Q${(c + 1.1).toFixed(1)} ${waist} ${(c + 1.4).toFixed(1)} ${band}Z`;
        })
        .join('');
    return { cap, icicles };
};
const SNOW_CAPS = {
    expanded: snowCapPaths(SIDER_W),
    collapsed: snowCapPaths(SIDER_COLLAPSED_W)
};
const SnowCap: FC<{ collapsed: boolean }> = ({ collapsed }) => {
    const width = collapsed ? SIDER_COLLAPSED_W : SIDER_W;
    const { cap, icicles } = collapsed ? SNOW_CAPS.collapsed : SNOW_CAPS.expanded;
    return (
        <svg
            className="ssn-snowcap"
            viewBox={`0 0 ${width} ${SNOW_CAP_H}`}
            preserveAspectRatio="none"
        >
            <g fill="#c9dcf0" opacity={0.85} transform="translate(0 1)">
                <path d={cap} />
                <path d={icicles} />
            </g>
            <g fill="#ffffff" opacity={0.95}>
                <path d={cap} />
                <path d={icicles} />
            </g>
        </svg>
    );
};

const ChristmasSider: FC<{ collapsed: boolean }> = ({ collapsed }) => (
    <>
        <SiderStars count={26} seed={41} />
        <SiderSnow count={22} seed={42} />
        <SnowCap collapsed={collapsed} />
    </>
);

const HalloweenSider: FC = () => (
    <>
        <svg className="ssn-sweb" viewBox="0 0 64 64">
            <SpiderWeb color="rgba(255,255,255,.5)" x0={63} radius={60} />
        </svg>
        <svg className="ssn-sspider" viewBox="0 0 40 46">
            <Spider color="#ddd6ee" x={20} />
        </svg>
        <div className="ssn-sghost">
            <Ghost />
        </div>
        <span
            className="ssn-fog"
            style={{ left: -30, bottom: 56, width: 200, animationDuration: '9s' }}
        />
    </>
);

const SIDER_GRASS_H = 70;

const siderGrassPath = (minH: number, maxH: number, step: number, seed: number) => {
    const random = createRandom(seed);
    const parts = [`M0 ${SIDER_GRASS_H} V${SIDER_GRASS_H - minH}`];
    for (let x = 0; x < SIDER_W; x += step) {
        const h = minH + random() * (maxH - minH);
        parts.push(
            `L${px(x + step / 2)} ${px(SIDER_GRASS_H - h)} L${px(x + step)} ${px(SIDER_GRASS_H - minH + 1)}`
        );
    }
    parts.push(`H${SIDER_W} V${SIDER_GRASS_H} Z`);
    return parts.join(' ');
};

/** A meadow at the foot of the side menu: the first 80 px hold an egg and a tulip, for the collapsed menu. */
const EasterSider: FC = () => (
    <svg
        className="ssn-smeadow"
        viewBox={`0 0 ${SIDER_W} ${SIDER_GRASS_H}`}
        preserveAspectRatio="xMinYMax slice"
    >
        <path d={siderGrassPath(10, 22, 9, 51)} fill="#3f9a4a" />
        <path d={siderGrassPath(5, 14, 7, 52)} fill="#5fbf6a" />
        <Tulip x={8} y={30} color="#ff6b8a" scale={1.1} />
        <Egg id="s1" x={34} y={42} scale={1} base="#9bd6ff" color="#2f6fd6" pattern="stripes" />
        <Daisy x={66} y={52} />
        <Egg
            id="s2"
            x={96}
            y={44}
            scale={0.9}
            base="#ffe08a"
            color="#e0528c"
            pattern="dots"
            wobbleDelay={0.6}
        />
        <Tulip x={130} y={28} color="#ffb347" />
        <Egg
            id="s3"
            x={160}
            y={43}
            scale={0.95}
            base="#d5c1ff"
            color="#3fa65b"
            pattern="zigzag"
            wobbleDelay={1.1}
        />
        <Daisy x={200} y={50} scale={0.9} />
        <Tulip x={222} y={32} color="#e0528c" scale={0.9} />
    </svg>
);

/**
 * The side menu's decorations, a layer over the sider (MainLayout renders it beside the Sider,
 * positioned over it; `collapsed`: the sider is 80 px wide). Clicks go through.
 */
export const SeasonSiderDecor: FC<{ theme: SeasonTheme; collapsed: boolean }> = ({
    theme,
    collapsed
}) => (
    <div
        className="ssn-sider"
        data-season={theme.season}
        data-collapsed={collapsed ? 'true' : 'false'}
        aria-hidden="true"
    >
        {theme.season === 'christmas' ? (
            <ChristmasSider collapsed={collapsed} />
        ) : theme.season === 'halloween' ? (
            <HalloweenSider />
        ) : (
            <EasterSider />
        )}
    </div>
);
