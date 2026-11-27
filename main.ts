// Broadsheet: The World on Friday 27 November 2026.
// A one-page newspaper drawn from scratch with Node's standard library
// only. It renders 30 verified stories from 27 November 2026 across six
// continents, with one clear lead, and writes a deterministic PNG.
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it with MAKEFUN_OUTPUT_DIR set to its own output dir;
// with the variable unset it falls back to /output, as the kit starter does.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- canvas

const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 242, 231];
const INK: [number, number, number] = [24, 24, 24];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [172, 32, 32];
const GREY: [number, number, number] = [96, 90, 80];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function dot(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dot(i, j, c);
}

function hline(x: number, y: number, w: number, c: [number, number, number], t = 1): void {
  rect(x, y, w, t, c);
}

// ------------------------------------------------------- 5x7 bitmap font
// Every glyph is seven rows of five bits, written here by hand. Only the
// characters the broadsheet needs: capitals, digits and plain punctuation.

const GLYPHS: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ',': [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  ':': [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ';': [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  '?': [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '-': [0, 0, 0, 0b01110, 0, 0, 0],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '/': [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  '%': [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  '+': [0, 0b00100, 0b00100, 0b01110, 0b00100, 0b00100, 0],
  '=': [0, 0, 0b11111, 0, 0b11111, 0, 0],
  '"': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  '*': [0, 0b10101, 0b01110, 0b10101, 0, 0, 0],
};

const CHAR_W = 6; // 5 glyph columns + 1 space, before scaling
const CHAR_H = 7;

function textWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}

function drawChar(x: number, y: number, ch: string, scale: number, c: [number, number, number]): void {
  const g = GLYPHS[ch] ?? GLYPHS['?'];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if ((g[r] >> (4 - col)) & 1) rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  // The bitmap font carries capitals only; the broadsheet is set in caps.
  s = s.toUpperCase();
  for (let i = 0; i < s.length; i++) drawChar(x + i * CHAR_W * scale, y, s[i], scale, c);
}

function drawCentred(y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(Math.round((W - textWidth(s, scale)) / 2), y, s, scale, c);
}

// Greedy word wrap to a character budget per line.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// Draw wrapped text, return the y just below the last line.
function drawWrapped(x: number, y: number, s: string, maxChars: number, scale: number,
    c: [number, number, number], leading: number): number {
  const lines = wrap(s, maxChars);
  for (const ln of lines) {
    drawText(x, y, ln, scale, c);
    y += leading;
  }
  return y;
}

// ------------------------------------------------------------- the stories
// All 30 were first reported on Friday 27 November 2026 (checked against
// NYT, BBC, Reuters, India Today, Mint, The Hindu, Newstalk ZB feeds).

type Story = { head: string; deck: string };

const LEAD: Story = {
  head: 'DRONE STRIKE IN KUWAIT KILLS TWO ITALIANS',
  deck: 'Kuwait says an Iranian drone hit a work site; Tehran denies any role and Rome demands answers.',
};

const COLUMNS: { section: string; stories: Story[] }[][] = [
  [
    {
      section: 'WORLD',
      stories: [
        { head: 'HAMAS WEIGHS REPLY AS ISRAEL KILLS 10 IN GAZA', deck: 'Reuters: ten dead in strikes; mediators wait on Hamas answer.' },
        { head: 'RUSSIAN MISSILES HIT KYIV, MAYOR SAYS', deck: 'Ballistic strikes reported overnight in the Ukrainian capital.' },
        { head: 'SAUDIS INTERCEPT TWO HOUTHI MISSILES', deck: 'Both ballistic missiles fired toward Riyadh shot down.' },
        { head: 'KIM VOWS MORE NUCLEAR WEAPONS', deck: 'North Korea leader snubs Trump overture, pledges bigger arsenal.' },
        { head: 'INDIA-CHINA BORDER "GENERALLY STABLE"', deck: 'Beijing plays down tensions along the disputed frontier.' },
      ],
    },
    {
      section: 'EUROPE',
      stories: [
        { head: 'UK NET MIGRATION LOWEST SINCE 1997', deck: 'Lowest level since 1997, excluding the pandemic years.' },
        { head: 'DEPARDIEU TO STAND TRIAL OVER 2018 RAPE CLAIM', deck: 'French court orders trial of actor Gerard Depardieu.' },
        { head: 'TANKER CAPSIZES OFF IBIZA, ONE DEAD', deck: 'Diesel tanker carrying up to 7,000 tonnes goes down.' },
        { head: 'UK TO PAY EU "PARTICIPATION" FEE', deck: 'Fee unlocks delivery of post-Brexit EU deals, BBC reports.' },
      ],
    },
  ],
  [
    {
      section: 'ASIA',
      stories: [
        { head: 'FIRE AT BANGKOK OIL REFINERY', deck: 'Blast injures several; Bangchak shuts every unit at the plant.' },
        { head: 'INDIA TOP COURT: JUDGE MUST SIT ON PMLA BENCH', deck: 'Judicial member required to confirm an attachment, court rules.' },
        { head: 'COURT QUASHES EX-MP ANAND MOHAN RELEASE', deck: 'Bihar move to free former MP early ruled illegal.' },
        { head: 'CABINET CLEARS RS 11,000-CRORE EQUIPMENT PLAN', deck: 'Scheme to boost domestic construction equipment making.' },
        { head: 'GUKESH, SINDAROV DRAW MARATHON GAME 3', deck: 'World Chess Championship still level after three games.' },
        { head: 'KARACHI BUILDING COLLAPSE KILLS THREE', deck: 'Six-storey block falls; 14 injured in rescue operation.' },
        { head: 'NINE MINERS DEAD IN WEST JAVA PIT', deck: 'Flooded mine leaves 17 more missing, 100 metres down.' },
      ],
    },
    {
      section: 'AFRICA',
      stories: [
        { head: 'RAMAPHOSA WINS BID TO OVERTURN IMPEACHMENT REPORT', deck: 'South Africa court backs president against the report.' },
        { head: 'DR CONGO EBOLA PASSES 12,000 CASES', deck: 'Epidemic tops 12,000 cases and 5,900 deaths; responders pull out.' },
        { head: 'AU BACKS ETHIOPIA PEACE PLAN FOR SUDAN', deck: 'Khartoum rebuffs the African Union proposal for talks.' },
      ],
    },
  ],
  [
    {
      section: 'AMERICAS',
      stories: [
        { head: 'US GDP REVISED UP TO 4.3 PERCENT', deck: 'Q3 growth beats first estimate; Trump demands "fake" figures probe.' },
        { head: 'STORM POSTPONES 100TH MACY PARADE', deck: 'Thanksgiving storm cuts power to 500,000; flights cancelled.' },
        { head: 'BRAZIL WEIGHS SNUBBING MILEI AT LULA SWEARING-IN', deck: 'Brasilia may invite another Argentine official instead.' },
        { head: 'MUSK: EVERY US CHILD GETS TWO SPACEX SHARES', deck: 'Elon Musk pledges shares for every child in America.' },
      ],
    },
    {
      section: 'OCEANIA',
      stories: [
        { head: 'NZ FINAL ELECTION RESULTS OUT TODAY', deck: 'Coalition holds slim majority, 67 of 131 seats, after specials.' },
        { head: 'AUSTRALIA BRACES FOR SEVERE BUSHFIRE SEASON', deck: 'Fire crews on alert as hot, dry summer approaches.' },
      ],
    },
    {
      section: 'BUSINESS AND TECH',
      stories: [
        { head: 'SPACEX WINS FCC NOD FOR 1M AI SATELLITES', deck: 'First approval for an orbital AI data-centre constellation.' },
        { head: 'APPLE ENTERS THE AI AGENT RACE', deck: 'Apple takes on OpenAI, Anthropic and Meta, analysts say.' },
        { head: 'CLAUDE TURNS ARTIFACTS INTO APPS', deck: 'Anthropic lets users turn chatbot artifacts into working apps.' },
      ],
    },
    {
      section: 'SPORT',
      stories: [
        { head: 'LILLE HAND BAYERN FIRST DEFEAT OF SEASON', deck: 'Lille win 2-1; Bayern lose for the first time this season.' },
      ],
    },
  ],
];

// ------------------------------------------------------------------ layout

const MARGIN = 24;
const COL_W = 312;
const COL_X = [MARGIN, MARGIN + COL_W + 20, MARGIN + 2 * (COL_W + 20)];

// Masthead.
hline(MARGIN, 18, W - 2 * MARGIN, INK, 4);
drawCentred(30, 'THE WORLD TODAY', 6, INK);
// Small red diamonds flank the date line, marking the paper's one-day scope.
const dateW = textWidth('FRIDAY 27 NOVEMBER 2026', 3);
rect(Math.round((W - dateW) / 2) - 22, 100, 10, 10, RED);
rect(Math.round((W + dateW) / 2) + 12, 100, 10, 10, RED);
hline(MARGIN, 30 + 7 * 6 + 8, W - 2 * MARGIN, INK, 2);
drawText(MARGIN, 92, '30 STORIES', 2, GREY);
drawCentred(92, 'FRIDAY 27 NOVEMBER 2026', 3, RED);
const rightTag = '6 CONTINENTS';
drawText(W - MARGIN - textWidth(rightTag, 2), 92, rightTag, 2, GREY);
hline(MARGIN, 118, W - 2 * MARGIN, INK, 4);

// Lead story: inverted black box.
const LEAD_Y = 130;
const LEAD_H = 140;
rect(MARGIN, LEAD_Y, W - 2 * MARGIN, LEAD_H, INK);
drawText(MARGIN + 16, LEAD_Y + 14, 'LEAD STORY - KUWAIT - MIDDLE EAST', 2, [255, 214, 120]);
const leadLines = wrap(LEAD.head, 44);
let ly = LEAD_Y + 44;
for (const ln of leadLines) {
  drawText(MARGIN + 16, ly, ln, 3, WHITE);
  ly += 7 * 3 + 4;
}
drawWrapped(MARGIN + 16, ly + 4, LEAD.deck, 74, 2, [225, 225, 225], 7 * 2 + 4);

// Columns of sections.
let colBottom = 0;
for (let c = 0; c < 3; c++) {
  let y = LEAD_Y + LEAD_H + 22;
  for (const sec of COLUMNS[c]) {
    drawText(COL_X[c], y, sec.section, 2, RED);
    hline(COL_X[c], y + 7 * 2 + 4, COL_W, INK, 2);
    y += 7 * 2 + 10;
    for (const st of sec.stories) {
      y = drawWrapped(COL_X[c], y, st.head, 25, 2, INK, 7 * 2 + 1);
      y = drawWrapped(COL_X[c], y + 2, st.deck, 50, 1, GREY, 7 + 1);
      y += 8;
    }
    y += 4;
  }
  if (y > colBottom) colBottom = y;
}

// Footer.
const FOOT_Y = 988;
hline(MARGIN, FOOT_Y - 12, W - 2 * MARGIN, INK, 2);
drawCentred(FOOT_Y, 'COMPILED FROM REPORTS FIRST PUBLISHED FRIDAY 27 NOVEMBER 2026', 1, GREY);

if (colBottom > FOOT_Y - 16) {
  throw new Error(`layout overflow: columns end at y=${colBottom}, footer at ${FOOT_Y}`);
}

// ------------------------------------------------------------ PNG encoding
// Hand-rolled PNG: IHDR + one IDAT (zlib, filter 0 per row) + IEND.
// Deterministic: same pixels always produce the same bytes.

const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- output
// The kit starter's convention: MAKEFUN_OUTPUT_DIR, else /output.

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePng());
