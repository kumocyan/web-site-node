const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
const { path: ffprobePath } = require('@ffprobe-installer/ffprobe');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const OUTPUT = path.resolve(__dirname, '..', 'media', 'promo-sample.mp4');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nstyle-promo-'));

const FPS = 30;
const SEGMENTS = [
  {
    duration: 3.5,
    title: 'AlphaTheta × N-STYLE',
    subtitle: 'Night Drive Collaboration',
    colors: ['#f9fbff', '#e4f0ff'],
    accent: '#5668ff'
  },
  {
    duration: 3.5,
    title: 'Sound & Motion Sync',
    subtitle: '光と音が呼応するドライブ体験',
    colors: ['#fff6fb', '#ffe5f2'],
    accent: '#ff5c8d'
  },
  {
    duration: 3.5,
    title: 'Book Your Night Session',
    subtitle: '試乗 & ショールームツアー受付中',
    colors: ['#f3fff6', '#e4fffb'],
    accent: '#31c48d'
  }
];

const TEXT_SAFE = (str) => str.replace(/&/g, '&amp;');

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColors(colorA, colorB, t) {
  const a = colorA.match(/#(..)(..)(..)/).slice(1).map((hex) => parseInt(hex, 16));
  const b = colorB.match(/#(..)(..)(..)/).slice(1).map((hex) => parseInt(hex, 16));
  const mixed = a.map((val, idx) => Math.round(lerp(val, b[idx], t)));
  return `rgb(${mixed.join(',')})`;
}

function generateFrameSvg(segment, globalFrame, progress) {
  const wave = Math.sin(progress * Math.PI * 2);
  const colorShift = (1 - Math.cos(progress * Math.PI)) / 2;
  const bgStart = mixColors(segment.colors[0], segment.colors[1], colorShift);
  const bgEnd = mixColors(segment.colors[1], segment.colors[0], colorShift);
  const accentOpacity = (Math.sin(progress * Math.PI * 2) + 1) / 2 * 0.4 + 0.2;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg${globalFrame}" x1="${(0.2 + progress * 0.6).toFixed(2)}" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="100%" stop-color="${bgEnd}" />
      </linearGradient>
      <radialGradient id="glow${globalFrame}" cx="${(0.5 + wave * 0.1).toFixed(2)}" cy="${(0.4 + wave * 0.05).toFixed(2)}" r="0.6">
        <stop offset="0%" stop-color="${segment.accent}" stop-opacity="${accentOpacity.toFixed(2)}" />
        <stop offset="100%" stop-color="${segment.accent}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg${globalFrame})" />
    <rect width="1920" height="1080" fill="url(#glow${globalFrame})" />
    <g fill="none" stroke="rgba(24,32,54,0.15)" stroke-width="2">
      <path d="M200,${(900 + wave * 20).toFixed(2)} C${(600 + progress * 200).toFixed(2)},${(700 + wave * 60).toFixed(2)} ${(1320 - progress * 200).toFixed(2)},${(920 - wave * 80).toFixed(2)} 1720,${(760 - wave * 20).toFixed(2)}" />
      <path d="M160,${(700 - wave * 30).toFixed(2)} C${(540 + wave * 120).toFixed(2)},${(620 - wave * 20).toFixed(2)} ${(1380 - wave * 120).toFixed(2)},${(780 + wave * 40).toFixed(2)} 1760,${(640 + wave * 30).toFixed(2)}" />
    </g>
    <g fill="rgba(255,255,255,0.12)">
      <circle cx="${(400 + wave * 60).toFixed(2)}" cy="${(260 + progress * 80).toFixed(2)}" r="180" />
      <circle cx="${(1520 - wave * 40).toFixed(2)}" cy="${(340 + progress * 40).toFixed(2)}" r="120" />
    </g>
    <text x="50%" y="45%" fill="#182036" font-family="'Montserrat','Segoe UI',sans-serif" font-size="96" font-weight="700" text-anchor="middle">${TEXT_SAFE(segment.title)}</text>
    <text x="50%" y="58%" fill="#2a3148" font-family="'Noto Sans JP','Segoe UI',sans-serif" font-size="42" font-weight="400" text-anchor="middle">${TEXT_SAFE(segment.subtitle)}</text>
    <text x="50%" y="72%" fill="${segment.accent}" font-family="'Montserrat','Segoe UI',sans-serif" font-size="24" letter-spacing="0.4em" font-weight="600" text-anchor="middle" opacity="0.8">PREMIUM NIGHT DRIVE EXPERIENCE</text>
  </svg>`;
}

async function generateFrames() {
  let globalFrame = 0;
  const framePaths = [];

  for (const segment of SEGMENTS) {
    const totalFrames = Math.round(segment.duration * FPS);
    for (let frame = 0; frame < totalFrames; frame++) {
      const progress = frame / totalFrames;
      const svg = generateFrameSvg(segment, globalFrame, progress);
      const svgPath = path.join(TMP, `frame-${String(globalFrame).padStart(4, '0')}.svg`);
      const pngPath = svgPath.replace('.svg', '.png');
      fs.writeFileSync(svgPath, svg, 'utf8');
      await sharp(svgPath).png({ quality: 95 }).toFile(pngPath);
      fs.unlinkSync(svgPath);
      framePaths.push(pngPath);
      globalFrame += 1;
    }
  }

  return framePaths;
}

async function buildVideo(framePaths) {
  return new Promise((resolve, reject) => {
    const input = ffmpeg();
    input.input(`concat:${framePaths.join('|')}`);
    input
      .inputOptions('-f', 'image2pipe', '-framerate', FPS.toString())
      .outputOptions('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', FPS.toString())
      .on('start', (commandLine) => console.log('FFmpeg command:', commandLine))
      .on('error', reject)
      .on('end', resolve)
      .save(OUTPUT);
  });
}

(async () => {
  try {
    const framePaths = await generateFrames();
    await buildVideo(framePaths);
    console.log('Promo video generated at:', OUTPUT);
  } catch (error) {
    console.error('Failed to generate promo video:', error);
    process.exit(1);
  }
})();
