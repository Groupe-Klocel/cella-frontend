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

// The files of the document history (documentHistory.binaryDocument): decoding, kind detection,
// ZPL label rendering and download. Used by the preview (list modal, detail page) and by every
// download button of the document-histories screens. Browser only: call it from handlers/effects.
//
// binaryDocument is base64: usually bare, sometimes a whole `data:<mime>;base64,…` URI (older
// rows). documentType is free text, not a MIME type (rbo_pdf, rml, zpl, txt, application/pdf,
// image/png, xlsx, '' …), so the kind is read first from the file's own signature (%PDF, PNG,
// JPEG, GIF, WebP), then from documentType and the extension of documentName.
//
// ZPL labels are rendered by the public Labelary API, as the download always did (no new
// dependency: package.json does not reach the customer repos). Three things the former download
// got wrong, fixed here for the preview and the download alike:
//  - the size: Labelary ignores ^PW / ^LL and draws on the size given in its URL, so the fixed
//    4x6" cut every longer label (^LL1600 at 8 dpmm is 7.87"). The size is now read from the
//    ZPL and is never smaller than 4x6": no label loses anything it used to show;
//  - the encoding: the ZPL was posted as an atob() string, which fetch re-encodes as UTF-8
//    ("ExpÃ©diteur" on ^CI28 labels). The bytes are now posted exactly as stored;
//  - data URIs: atob() threw on them and the download did nothing.

export type DocumentKind = 'pdf' | 'zpl' | 'image' | 'text' | 'other';

/** The documentHistory fields this file reads (list row or detail record). */
export interface DocumentFileSource {
    binaryDocument?: string | null;
    documentName?: string | null;
    documentType?: string | null;
}

export interface DocumentFile {
    bytes: Uint8Array;
    kind: DocumentKind;
    /** MIME type to give the Blob (preview and download) */
    mimeType: string;
    fileName: string;
}

// #region decoding

const DATA_URI = /^data:([^;,]*)((?:;[^;,]*)*),/i;

// how much of the file the kind detection reads: enough for every signature and for the first
// ZPL command, small enough to run on each list row at each render (1024 base64 chars = 768 B)
const HEAD_BASE64_LENGTH = 1024;

type RawDocument = { payload: string; isBase64: boolean; mimeType?: string };

const splitDataUri = (binaryDocument: string): RawDocument => {
    const value = binaryDocument.trim();
    const match = DATA_URI.exec(value);
    if (!match) return { payload: value, isBase64: true };
    return {
        payload: value.slice(match[0].length),
        isBase64: /;base64/i.test(match[2]),
        mimeType: match[1] ? match[1].toLowerCase() : undefined
    };
};

const binaryStringToBytes = (binary: string): Uint8Array => {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const decodePayload = (raw: RawDocument, base64Length?: number): Uint8Array => {
    if (raw.isBase64) {
        // whitespace and the URL-safe alphabet are tolerated; an invalid payload falls back
        // to its own text below. For a head, only the start is cleaned (twice the length
        // leaves room for line breaks): the rest of a large document is never scanned.
        const payload =
            base64Length !== undefined ? raw.payload.slice(0, base64Length * 2) : raw.payload;
        let base64 = payload.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (base64Length !== undefined && base64.length > base64Length) {
            base64 = base64.slice(0, base64Length - (base64Length % 4));
        }
        try {
            return binaryStringToBytes(atob(base64));
        } catch {
            // not base64: the document was stored as plain text
        }
    }
    let text = raw.payload;
    try {
        text = raw.isBase64 ? text : decodeURIComponent(text);
    } catch {
        // keep the payload as it is
    }
    const bytes = new TextEncoder().encode(text);
    return base64Length !== undefined ? bytes.subarray(0, (base64Length / 4) * 3) : bytes;
};

/** Text of a document: UTF-8, or Windows-1252 when the bytes are not valid UTF-8. */
export const decodeDocumentText = (bytes: Uint8Array): string => {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        // Latin-1 labels (^CI0) and legacy files
        return new TextDecoder('windows-1252').decode(bytes);
    }
};

// #endregion

// #region kind detection

const PDF_TYPES = ['pdf', 'rbo_pdf', 'rml', 'application/pdf'];
const TEXT_TYPES = ['txt', 'text', 'log', 'csv', 'json', 'xml'];
const IMAGE_EXTENSIONS: { [extension: string]: string } = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml'
};
const OTHER_MIME_TYPES: { [extension: string]: string } = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    zip: 'application/zip'
};

const extensionOf = (fileName: string): string => {
    const match = /\.([^./\\]+)$/.exec(fileName.trim());
    return match ? match[1].toLowerCase() : '';
};

const startsWithBytes = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

const asciiHead = (bytes: Uint8Array, length: number): string => {
    let head = '';
    for (let i = 0; i < Math.min(length, bytes.length); i++) {
        head += String.fromCharCode(bytes[i]);
    }
    return head;
};

// the file's own signature: the most reliable clue, whatever documentType says
const sniffMimeType = (bytes: Uint8Array): string | undefined => {
    // a UTF-8 byte order mark (EF BB BF) may precede a PDF header
    const bomLength = startsWithBytes(bytes, [0xef, 0xbb, 0xbf]) ? 3 : 0;
    if (/^\s*%PDF-/.test(asciiHead(bytes.subarray(bomLength), 16))) return 'application/pdf';
    const head = asciiHead(bytes, 16);
    if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return 'image/png';
    }
    if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif';
    if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
    return undefined;
};

// a ZPL document starts with ^XA, possibly after ~ commands (~SD, ~TA, …) or blank lines
const looksLikeZpl = (bytes: Uint8Array): boolean => {
    const head = asciiHead(bytes, 512);
    return /^\s*(\^XA|~)/i.test(head) && /\^XA/i.test(head);
};

// text: no NUL byte and valid UTF-8 (a multi-byte character cut at the end of the head is fine)
const looksLikeText = (bytes: Uint8Array): boolean => {
    if (bytes.indexOf(0) !== -1) return false;
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
        return true;
    } catch {
        return false;
    }
};

const kindOf = (
    head: Uint8Array,
    raw: RawDocument,
    source: DocumentFileSource
): { kind: DocumentKind; mimeType: string } => {
    const type = (source.documentType ?? '').trim().toLowerCase();
    const extension = extensionOf(source.documentName ?? '');
    // application/octet-stream (the usual data URI) says nothing about the content
    const declared = raw.mimeType ?? (type.includes('/') ? type : undefined);
    const declaredMimeType = declared === 'application/octet-stream' ? undefined : declared;

    const sniffed = sniffMimeType(head);
    if (sniffed === 'application/pdf') return { kind: 'pdf', mimeType: sniffed };
    if (sniffed) return { kind: 'image', mimeType: sniffed };

    if (
        type === 'zpl' ||
        extension === 'zpl' ||
        declaredMimeType?.includes('zpl') ||
        looksLikeZpl(head)
    ) {
        return { kind: 'zpl', mimeType: 'text/plain;charset=utf-8' };
    }
    // rbo_pdf / rml name the template engine: a content that is plain text and not a PDF is
    // the template source (RML is XML), shown as text below
    if (
        (PDF_TYPES.includes(type) || extension === 'pdf') &&
        (asciiHead(head, head.length).includes('%PDF-') || !looksLikeText(head))
    ) {
        return { kind: 'pdf', mimeType: 'application/pdf' };
    }
    if (declaredMimeType?.startsWith('image/') || IMAGE_EXTENSIONS[extension]) {
        return {
            kind: 'image',
            mimeType: declaredMimeType?.startsWith('image/')
                ? declaredMimeType
                : IMAGE_EXTENSIONS[extension]
        };
    }
    const otherMimeType =
        OTHER_MIME_TYPES[extension] ??
        (declaredMimeType &&
        !declaredMimeType.startsWith('text/') &&
        !PDF_TYPES.includes(declaredMimeType)
            ? declaredMimeType
            : undefined);
    if (otherMimeType) return { kind: 'other', mimeType: otherMimeType };
    if (
        TEXT_TYPES.includes(type) ||
        TEXT_TYPES.includes(extension) ||
        declaredMimeType?.startsWith('text/') ||
        looksLikeText(head)
    ) {
        return { kind: 'text', mimeType: 'text/plain;charset=utf-8' };
    }
    return { kind: 'other', mimeType: declaredMimeType ?? 'application/octet-stream' };
};

/**
 * Kind of a document without decoding all of it (cheap enough for each row of a list).
 * `undefined` when the record holds no document.
 */
export const detectDocumentKind = (source: DocumentFileSource): DocumentKind | undefined => {
    if (!source.binaryDocument) return undefined;
    const raw = splitDataUri(source.binaryDocument);
    return kindOf(decodePayload(raw, HEAD_BASE64_LENGTH), raw, source).kind;
};

/** Decodes the whole document. `undefined` when the record holds no document. */
export const readDocumentFile = (source: DocumentFileSource): DocumentFile | undefined => {
    if (!source.binaryDocument) return undefined;
    const raw = splitDataUri(source.binaryDocument);
    const bytes = decodePayload(raw);
    const { kind, mimeType } = kindOf(bytes.subarray(0, (HEAD_BASE64_LENGTH / 4) * 3), raw, source);
    return { bytes, kind, mimeType, fileName: source.documentName?.trim() || 'document' };
};

// #endregion

// #region ZPL rendering

// 8 dpmm (203 dpi): the density the screen has always rendered with
const LABEL_DPMM = 8;
const MIN_LABEL_INCHES = { width: 4, height: 6 };
// Labelary refuses larger labels (HTTP 400)
const MAX_LABEL_INCHES = 15;
const LABELARY_PRINTERS_URL = 'https://api.labelary.com/v1/printers';

const largestDots = (zpl: string, command: 'PW' | 'LL'): number => {
    const pattern = new RegExp(`\\^${command}\\s*(\\d+)`, 'gi');
    let largest = 0;
    let match = pattern.exec(zpl);
    while (match) {
        largest = Math.max(largest, parseInt(match[1], 10));
        match = pattern.exec(zpl);
    }
    return largest;
};

/**
 * Size, in inches, of the labels of a ZPL document at the given density: the largest print
 * width (^PW) and label length (^LL) it declares, never less than 4x6" nor more than 15".
 */
export const zplLabelSize = (
    zpl: string,
    dpmm: number = LABEL_DPMM
): { width: number; height: number } => {
    const dotsPerInch = dpmm * 25.4;
    const inches = (dots: number, minimum: number) =>
        Math.min(MAX_LABEL_INCHES, Math.max(minimum, Math.ceil((dots / dotsPerInch) * 100) / 100));
    return {
        width: inches(largestDots(zpl, 'PW'), MIN_LABEL_INCHES.width),
        height: inches(largestDots(zpl, 'LL'), MIN_LABEL_INCHES.height)
    };
};

// rendered labels, by ZPL: the preview and the download that follows it call Labelary once
const renderedLabels = new Map<string, Promise<Blob>>();
const RENDERED_LABELS_KEPT = 20;

/**
 * Renders a ZPL document into a PDF (one page per label) through the Labelary API.
 * Rejects when Labelary fails or when the content holds no label.
 */
export const renderZplToPdf = (zplBytes: Uint8Array): Promise<Blob> => {
    // ZPL commands are ASCII: a single-byte reading is enough for the size and the cache key
    const zpl = new TextDecoder('windows-1252').decode(zplBytes);
    const cached = renderedLabels.get(zpl);
    if (cached) return cached;

    const { width, height } = zplLabelSize(zpl);
    const rendering = fetch(
        `${LABELARY_PRINTERS_URL}/${LABEL_DPMM}dpmm/labels/${width}x${height}/`,
        {
            method: 'POST',
            headers: {
                Accept: 'application/pdf',
                // Labelary reads the body as raw ZPL with this content type (no URL decoding)
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            // the bytes as stored: a string body would be re-encoded as UTF-8 by fetch
            body: new Blob([zplBytes])
        }
    ).then(async (response) => {
        if (!response.ok) {
            throw new Error(`Labelary HTTP ${response.status}: ${await response.text()}`);
        }
        // Labelary answers an empty PDF, with a count of 0, when there is no label to draw
        if (response.headers.get('X-Total-Count') === '0') {
            throw new Error('Labelary rendered no label');
        }
        return new Blob([await response.arrayBuffer()], { type: 'application/pdf' });
    });

    renderedLabels.set(zpl, rendering);
    // a failed rendering is not kept: the next attempt calls Labelary again
    rendering.catch(() => renderedLabels.delete(zpl));
    if (renderedLabels.size > RENDERED_LABELS_KEPT) {
        renderedLabels.delete(renderedLabels.keys().next().value as string);
    }
    return rendering;
};

// #endregion

// #region download

const withExtension = (fileName: string, extension: string): string =>
    extensionOf(fileName)
        ? fileName.replace(/\.[^./\\]+$/, `.${extension}`)
        : `${fileName}.${extension}`;

/** Saves a Blob under the given file name through the browser's download. */
export const saveBlobAs = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // released once the browser has taken the file
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Downloads a document of the document history: a ZPL label as the PDF rendered by Labelary
 * (as the screen always did), any other document as it is stored.
 */
export const downloadDocumentFile = async (source: DocumentFileSource): Promise<void> => {
    const file = readDocumentFile(source);
    if (!file) throw new Error('The record holds no document');
    if (file.kind === 'zpl') {
        saveBlobAs(await renderZplToPdf(file.bytes), withExtension(file.fileName, 'pdf'));
        return;
    }
    saveBlobAs(new Blob([file.bytes], { type: file.mimeType }), file.fileName);
};

// #endregion
