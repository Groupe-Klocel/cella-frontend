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
import { AiDocumentAnalysisAvailability, interpolate } from './cellaBotApi';

// Files attached to a CellaBot turn. The API has no upload step: each file travels base64-encoded
// inside the chat request (`documents: [{ filename, base64 }]`), so the limits below bound the size of
// that request. The backend re-checks everything (count, size, type sniffed from the content) and
// answers a refused file with a 422 naming it; checking here first just avoids a useless upload.

// A file ready to be sent. `size` is the number of bytes actually sent (after image downscaling).
export interface AiStagedAttachment {
    filename: string;
    base64: string;
    size: number;
    mediaType: string;
}

export interface AiAttachmentLimits {
    maxFiles: number;
    maxBytesTotal: number;
}

// The backend defaults (ai/config.py), used when aiAvailability does not publish the limits.
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_BYTES_TOTAL = 8000000;

// What the backend reads (ai/documents.py): PDF, images, xlsx/xlsm spreadsheets, and text formats.
// The type is decided from the content server-side; the extension is only a first filter here.
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const ACCEPTED_EXTENSIONS = [
    'pdf',
    ...IMAGE_EXTENSIONS,
    'xlsx',
    'xlsm',
    'csv',
    'tsv',
    'txt',
    'md',
    'json',
    'xml',
    'edi',
    'log'
];
// Images the backend accepts as they are; any other image the browser can decode is re-encoded.
const NATIVE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
// Long edge of a re-encoded image (the backend downscales further to its own bound), as on iOS.
const MAX_IMAGE_EDGE = 2000;
const JPEG_QUALITY = 0.8;

export const attachmentLimits = (
    analysis?: AiDocumentAnalysisAvailability | null
): AiAttachmentLimits => ({
    maxFiles: analysis?.maxFiles && analysis.maxFiles > 0 ? analysis.maxFiles : DEFAULT_MAX_FILES,
    maxBytesTotal:
        analysis?.maxBytesTotal && analysis.maxBytesTotal > 0
            ? analysis.maxBytesTotal
            : DEFAULT_MAX_BYTES_TOTAL
});

/** The `accept` attribute of the file input. */
export const attachmentAccept = (analysis?: AiDocumentAnalysisAvailability | null): string =>
    Array.from(
        new Set([
            ...ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`),
            'image/*',
            ...(analysis?.supportedMediaTypes ?? [])
        ])
    ).join(',');

const extensionOf = (filename: string): string =>
    (filename.match(/\.([^./]+)$/)?.[1] ?? '').toLowerCase();

const isImage = (file: File): boolean =>
    file.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extensionOf(file.name));

const isAccepted = (file: File, analysis?: AiDocumentAnalysisAvailability | null): boolean =>
    ACCEPTED_EXTENSIONS.includes(extensionOf(file.name)) ||
    file.type.startsWith('image/') ||
    Boolean(file.type && analysis?.supportedMediaTypes?.includes(file.type));

/** Decimal units, like the backend's limit (8,000,000 bytes = "8 MB"). */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1000) return `${bytes} B`;
    if (bytes < 1000000) return `${Math.round(bytes / 1000)} kB`;
    return `${(bytes / 1000000).toFixed(1).replace(/\.0$/, '')} MB`;
};

export type AttachmentKind = 'pdf' | 'image' | 'spreadsheet' | 'text';

export const attachmentKind = (filename: string, mediaType?: string | null): AttachmentKind => {
    const ext = extensionOf(filename);
    if (ext === 'pdf' || mediaType === 'application/pdf') return 'pdf';
    if ((mediaType ?? '').startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (['xlsx', 'xlsm', 'csv', 'tsv'].includes(ext)) return 'spreadsheet';
    return 'text';
};

const readAsBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result ?? '');
            resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

/**
 * Re-encode an image to JPEG when it is larger than MAX_IMAGE_EDGE or in a format the backend does
 * not take (bmp, avif...). Returns null when the image can be sent as it is. Throws when the browser
 * cannot decode it (e.g. HEIC outside Safari).
 */
const normalizeImage = async (file: File): Promise<Blob | null> => {
    const native = NATIVE_IMAGE_TYPES.includes(file.type);
    if (typeof createImageBitmap !== 'function') {
        if (native) return null;
        throw new Error('Image decoding unavailable');
    }
    // createImageBitmap applies the EXIF orientation, so a phone photo keeps its orientation.
    const bitmap = await createImageBitmap(file);
    try {
        const longEdge = Math.max(bitmap.width, bitmap.height);
        if (native && longEdge <= MAX_IMAGE_EDGE) return null;
        const scale = Math.min(1, MAX_IMAGE_EDGE / longEdge);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        // JPEG has no alpha channel: paint transparent areas white instead of black.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
        );
        if (!blob) throw new Error('Image encoding failed');
        return blob;
    } finally {
        bitmap.close();
    }
};

const readAttachment = async (file: File): Promise<AiStagedAttachment> => {
    if (isImage(file)) {
        const converted = await normalizeImage(file);
        if (converted) {
            const stem = file.name.replace(/\.[^./]+$/, '') || 'image';
            return {
                filename: `${stem}.jpg`,
                base64: await readAsBase64(converted),
                size: converted.size,
                mediaType: 'image/jpeg'
            };
        }
    }
    return {
        filename: file.name,
        base64: await readAsBase64(file),
        size: file.size,
        mediaType: file.type
    };
};

/**
 * Validate and encode the files the user picked, on top of the ones already staged. Returns the
 * files to add and one readable error per refused file (translated through `tt`).
 */
export const prepareAttachments = async (
    files: Array<File>,
    staged: Array<AiStagedAttachment>,
    analysis: AiDocumentAnalysisAvailability | null | undefined,
    tt: (key: string, def: string) => string
): Promise<{ added: Array<AiStagedAttachment>; errors: Array<string> }> => {
    const limits = attachmentLimits(analysis);
    const added: Array<AiStagedAttachment> = [];
    const errors: Array<string> = [];
    let total = staged.reduce((sum, attachment) => sum + attachment.size, 0);

    for (const file of files) {
        if (staged.length + added.length >= limits.maxFiles) {
            errors.push(
                interpolate(
                    tt('common:cellabot-attach-too-many', '{{count}} files maximum per message.'),
                    { count: limits.maxFiles }
                )
            );
            break;
        }
        if (extensionOf(file.name) === 'xls') {
            errors.push(
                interpolate(
                    tt(
                        'common:cellabot-attach-xls',
                        '"{{name}}": .xls files are not supported, save it as .xlsx.'
                    ),
                    { name: file.name }
                )
            );
            continue;
        }
        if (!isAccepted(file, analysis) || file.size === 0) {
            errors.push(
                interpolate(
                    tt('common:cellabot-attach-unsupported', '"{{name}}": unsupported file.'),
                    { name: file.name }
                )
            );
            continue;
        }
        const tooLarge = () =>
            interpolate(
                tt(
                    'common:cellabot-attach-too-large',
                    '"{{name}}" exceeds the {{size}} limit per message.'
                ),
                { name: file.name, size: formatBytes(limits.maxBytesTotal) }
            );
        // Only an image can shrink (re-encoding): any other file over the remaining budget is
        // refused before it is read, so a huge file is never loaded into memory for nothing.
        if (!isImage(file) && total + file.size > limits.maxBytesTotal) {
            errors.push(tooLarge());
            continue;
        }
        let attachment: AiStagedAttachment;
        try {
            attachment = await readAttachment(file);
        } catch (error) {
            errors.push(
                interpolate(
                    tt('common:cellabot-attach-unreadable', '"{{name}}" could not be read.'),
                    { name: file.name }
                )
            );
            continue;
        }
        if (total + attachment.size > limits.maxBytesTotal) {
            errors.push(tooLarge());
            continue;
        }
        total += attachment.size;
        added.push(attachment);
    }
    return { added, errors };
};
