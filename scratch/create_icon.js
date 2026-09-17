const fs = require('fs');
const path = require('path');
const { zlib } = require('zlib');

// Minimal 192x192 PNG generator in pure Node.js
function createPng192() {
  const width = 192;
  const height = 192;
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth 8
  ihdrData[9] = 2; // Truecolor RGB
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: 192 rows, each row has 1 filter byte (0) + 192 * 3 RGB bytes
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);

  // Blue color #2563eb (RGB: 37, 99, 235) with a subtle lighter inner square
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Border or rounded corners visual
      const dx = x - 96;
      const dy = y - 96;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 70 && Math.abs(dx) < 40 && Math.abs(dy) < 30) {
        // Inner icon box color (White #ffffff)
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
      } else {
        // Brand blue #2563eb
        rawData[pixelOffset] = 37;
        rawData[pixelOffset + 1] = 99;
        rawData[pixelOffset + 2] = 235;
      }
    }
  }

  const compressedData = require('zlib').deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);

  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const pngBuffer = createPng192();
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffer);
console.log('icon-192.png created successfully!');
