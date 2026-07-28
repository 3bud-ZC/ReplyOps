import { PDFParse } from 'pdf-parse';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse/sync';
import readXlsxFile from 'read-excel-file/node';
import fetch from 'node-fetch';
import SSRFReqFilter from 'ssrf-req-filter';

const MAX_URL_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

export async function parseText(buffer: Buffer): Promise<string> {
  return buffer.toString('utf8');
}

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseCsv(buffer: Buffer): Promise<string> {
  const content = buffer.toString('utf8');
  const records = csvParse(content, {
    skip_empty_lines: true,
  });
  return records.map((row: any[]) => row.join(' ')).join('\n');
}

export async function parseXlsx(buffer: Buffer): Promise<string> {
  const sheets = await readXlsxFile(buffer);
  return sheets
    .map((sheet) =>
      sheet.data
        .map((row) => row.map((cell) => cell == null ? '' : String(cell)).join(' '))
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n');
}

function isBlockedIp(address: string): boolean {
  if (address === '169.254.169.254') return true;
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
  }
  return true;
}

async function assertFetchableHttpUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are allowed');
  }

  const records = await lookup(parsed.hostname, { all: true, verbatim: true });
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    throw new Error('URL resolves to a blocked address');
  }

  return parsed;
}

export async function fetchUrlSafely(url: string, redirects = 0): Promise<string> {
  if (redirects > MAX_REDIRECTS) {
    throw new Error('Too many redirects');
  }

  const parsed = await assertFetchableHttpUrl(url);
  const agent = SSRFReqFilter(parsed.toString());
  const res = await fetch(parsed.toString(), {
    agent,
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });

  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const location = res.headers.get('location');
    if (!location) throw new Error('Redirect missing location');
    return fetchUrlSafely(new URL(location, parsed).toString(), redirects + 1);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.statusText}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error('Unsupported URL content type');
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > MAX_URL_BYTES) {
    throw new Error('URL response is too large');
  }

  const html = await res.text();
  if (Buffer.byteLength(html, 'utf8') > MAX_URL_BYTES) {
    throw new Error('URL response is too large');
  }
  // Basic HTML tag stripping
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s\s+/g, ' ');
}

export function normalizeArabicText(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, ''); // Remove diacritics
}
