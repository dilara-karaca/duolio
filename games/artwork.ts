const stroke = `fill="none" stroke="#2a2444" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`;

const coloring: Record<string, string> = {
  house: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" ${stroke}><path d="M140 310 L400 130 L660 310"/><path d="M190 300 V510 H610 V300"/><path d="M355 510 V370 H445 V510"/><rect x="230" y="350" width="90" height="70" rx="8"/><rect x="480" y="350" width="90" height="70" rx="8"/><path d="M250 385 H300 M275 360 V420"/><path d="M500 385 H550 M525 360 V420"/><circle cx="400" cy="250" r="28"/><path d="M400 222 V278 M372 250 H428"/><path d="M120 510 H680"/></svg>`,
  cat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" ${stroke}><path d="M270 250 L230 130 L350 220"/><path d="M530 250 L570 130 L450 220"/><circle cx="400" cy="280" r="120"/><circle cx="355" cy="270" r="12"/><circle cx="445" cy="270" r="12"/><path d="M400 295 L386 320 L414 320 Z"/><path d="M378 338 Q400 356 422 338"/><path d="M280 275 H170 M275 310 H160 M520 275 H630 M525 310 H640"/><ellipse cx="400" cy="500" rx="150" ry="70"/><path d="M530 470 Q640 400 610 540"/></svg>`,
  flower: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" ${stroke}><circle cx="400" cy="230" r="34"/><circle cx="400" cy="130" r="52"/><circle cx="498" cy="185" r="52"/><circle cx="460" cy="300" r="52"/><circle cx="340" cy="300" r="52"/><circle cx="302" cy="185" r="52"/><path d="M400 340 V530"/><path d="M400 410 Q280 380 230 470"/><path d="M400 460 Q530 430 590 510"/></svg>`,
  boat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" ${stroke}><circle cx="170" cy="140" r="36"/><path d="M400 360 V150"/><path d="M408 175 L580 340 H408"/><path d="M392 210 L240 345 H392"/><path d="M150 370 H650 L590 470 H210 Z"/><path d="M70 520 Q150 480 230 520 T390 520 T550 520 T710 520"/><path d="M40 560 Q120 520 200 560 T360 560 T520 560 T680 560"/></svg>`,
};

const puzzles: Record<string, string> = {
  coast: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c5cfc"/><stop offset="60%" stop-color="#f6a6c1"/><stop offset="100%" stop-color="#ffd29d"/></linearGradient></defs><rect width="300" height="300" fill="url(#sky)"/><circle cx="220" cy="70" r="28" fill="#ffe08a"/><path d="M0 168 C70 140 110 190 170 160 C230 132 260 180 300 158 L300 300 L0 300 Z" fill="#3d7ea6"/><path d="M0 214 C80 190 130 236 210 210 C260 196 280 220 300 208 L300 300 L0 300 Z" fill="#1d4e73"/><path d="M78 196 L108 128 L138 196 Z" fill="#f7f4ff"/><rect x="106" y="128" width="4" height="68" fill="#241c3d"/></svg>`,
  city: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#1b1740"/><circle cx="230" cy="58" r="22" fill="#f4e7c3"/><circle cx="48" cy="40" r="2" fill="#fff"/><circle cx="90" cy="70" r="1.5" fill="#fff"/><circle cx="140" cy="36" r="1.5" fill="#fff"/><rect x="20" y="150" width="54" height="150" fill="#2d2a66"/><rect x="84" y="110" width="70" height="190" fill="#3a3578"/><rect x="164" y="140" width="48" height="160" fill="#2a275c"/><rect x="222" y="90" width="60" height="210" fill="#463f86"/><g fill="#ffe08a">${windows(32, 166, 3, 6)}${windows(98, 126, 4, 8)}${windows(176, 156, 3, 6)}${windows(236, 108, 3, 8)}</g></svg>`,
  garden: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="180" fill="#8ecae6"/><rect y="180" width="300" height="120" fill="#7dce7a"/><circle cx="60" cy="50" r="22" fill="#ffe08a"/><rect x="138" y="120" width="16" height="90" fill="#6b4a2d"/><circle cx="146" cy="100" r="46" fill="#2f9e68"/><circle cx="110" cy="120" r="28" fill="#248a58"/><circle cx="180" cy="118" r="30" fill="#37b074"/><circle cx="70" cy="230" r="10" fill="#f072b6"/><circle cx="110" cy="250" r="8" fill="#ffd166"/><circle cx="210" cy="236" r="12" fill="#e24b57"/><circle cx="240" cy="258" r="8" fill="#7c5cfc"/><path d="M0 210 C80 190 120 230 300 200" fill="none" stroke="#f4f2ff" stroke-width="8"/></svg>`,
};

function windows(x: number, y: number, cols: number, rows: number) {
  let marks = "";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      marks += `<rect x="${x + col * 14}" y="${y + row * 18}" width="7" height="9" rx="1"/>`;
    }
  }
  return marks;
}

export function coloringSvg(id: string) {
  return coloring[id] ?? coloring.house;
}

export function puzzleSvg(id: string) {
  return puzzles[id] ?? puzzles.coast;
}

export function svgDataUri(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
