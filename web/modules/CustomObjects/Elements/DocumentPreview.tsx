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
import { Image } from 'antd';
import { FC } from 'react';

// Turns whatever documentAttached holds into a usable data URI. The field normally stores a full
// `data:<mime>;base64,…` URI, but we still sniff the mime from the base64 magic prefix as a fallback
// so a bare base64 payload (or a plain URL) also renders correctly.
export const toDataUrl = (src: string): string => {
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

const isPdf = (dataUrl: string): boolean =>
    /^data:application\/pdf/i.test(dataUrl) || /\.pdf(\?|#|$)/i.test(dataUrl);

export interface IDocumentPreviewProps {
    src?: string | null;
    title?: string;
    height?: string;
}

// Renders a documentAttached value: PDFs in an iframe, everything else as an image.
const DocumentPreview: FC<IDocumentPreviewProps> = ({ src, title, height }) => {
    if (!src) return null;
    const dataUrl = toDataUrl(src);

    if (isPdf(dataUrl)) {
        // no sandbox: matches the existing PDF preview (appointments/schedule) and keeps the
        // built-in PDF viewer working; documentAttached is trusted (admin upload / migration)
        return (
            <iframe
                src={dataUrl}
                title={title ?? 'document'}
                style={{ width: '100%', height: height ?? '70vh', border: 'none' }}
            />
        );
    }

    return <Image src={dataUrl} alt={title ?? 'document'} style={{ maxWidth: '100%' }} />;
};

DocumentPreview.displayName = 'DocumentPreview';

export { DocumentPreview };
