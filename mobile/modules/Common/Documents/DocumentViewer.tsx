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

// Shared viewer for the truck-driver / visitor safety documents. Each document is the
// `documentAttached` value of a custom object (a base64 data URI). Images render inline with a
// zoomable preview; PDFs render in an iframe (RF handhelds have no native image preview for PDF).

import { Image } from 'antd';
import { FC } from 'react';

// URLs/data-URIs pass through; a bare base64 payload -> data-URI, MIME sniffed from the magic prefix
// (PNG/GIF/PDF, JPEG otherwise). Kept in sync with the web DocumentPreview element.
export const toDocumentSrc = (src: string): string => {
    if (!src) return src;
    if (/^(https?:|data:|blob:)/i.test(src)) return src;
    const mime = src.startsWith('iVBOR')
        ? 'image/png'
        : src.startsWith('R0lGOD')
          ? 'image/gif'
          : src.startsWith('JVBER')
            ? 'application/pdf'
            : 'image/jpeg';
    return `data:${mime};base64,${src}`;
};

const isPdf = (src: string): boolean =>
    /^data:application\/pdf/i.test(src) || /\.pdf(\?|#|$)/i.test(src);

export interface IDocumentViewerProps {
    // list of documentAttached data URIs to display, in order
    documents: string[];
}

const DocumentViewer: FC<IDocumentViewerProps> = ({ documents }) => {
    return (
        <Image.PreviewGroup>
            {documents.map((doc, idx) => {
                const src = toDocumentSrc(doc);
                if (isPdf(src)) {
                    // no sandbox: keeps the built-in PDF viewer working (matches the web
                    // appointments/schedule preview); documentAttached is trusted base64
                    return (
                        <div key={idx} style={{ width: '100%', marginBottom: 8 }}>
                            <iframe
                                src={src}
                                title={`document-${idx}`}
                                style={{ width: '100%', height: '60vh', border: 'none' }}
                            />
                        </div>
                    );
                }
                return (
                    <div key={idx} style={{ width: '100%', textAlign: 'center', marginBottom: 8 }}>
                        <Image src={src} width="80%" style={{ borderRadius: 4 }} />
                    </div>
                );
            })}
        </Image.PreviewGroup>
    );
};

DocumentViewer.displayName = 'DocumentViewer';

export { DocumentViewer };
