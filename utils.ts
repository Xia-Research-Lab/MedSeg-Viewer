import { COCORLE, COCOImage } from './types';

/**
 * Decodes COCO RLE String (Compressed) into an array of run lengths.
 * Based on the official COCO C implementation (maskApi.c).
 */
export const decodeCocoRleString = (rleString: string): number[] => {
  const counts: number[] = [];
  let p = 0;
  let k = 0;
  let x = 0;
  let more = 0;
  let m = 0;

  while (p < rleString.length) {
    x = 0;
    k = 0;
    more = 1;
    
    // Decode LEB128-like variable integer
    while (more) {
      const c = rleString.charCodeAt(p) - 48;
      x |= (c & 0x1f) << (5 * k);
      more = c & 0x20;
      p++;
      k++;
      if (!more && (c & 0x10)) {
        x |= -1 << (5 * k);
      }
    }

    // Delta decoding: specific to COCO's format
    if (m > 2) {
      x += counts[m - 2];
    }
    
    counts[m++] = x;
  }
  
  return counts;
};

/**
 * Decodes COCO RLE (Run-Length Encoding) into an HTMLCanvasElement.
 * Supports both Array (Uncompressed) and String (Compressed) formats.
 */
export const decodeRleToCanvas = (
  rle: COCORLE,
  color: [number, number, number]
): HTMLCanvasElement | null => {
  const [h, w] = rle.size;
  
  // Normalize counts: ensure we have a number[]
  let counts: number[];
  if (Array.isArray(rle.counts)) {
    counts = rle.counts;
  } else if (typeof rle.counts === 'string') {
    try {
      counts = decodeCocoRleString(rle.counts);
    } catch (e) {
      console.error("Failed to decode RLE string", e);
      return null;
    }
  } else {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;

  let countsIndex = 0;
  if (!counts || counts.length === 0) return null;

  let runRemaining = counts[0];
  let currentValue = 0; // 0 = background, 1 = foreground. Starts with 0.

  // Iterate in Column-Major order (x outer, y inner)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      
      // Consume runs until we have a valid positive run length or run out of data
      while (runRemaining === 0) {
        countsIndex++;
        if (countsIndex < counts.length) {
          runRemaining = counts[countsIndex];
          currentValue = countsIndex % 2;
        } else {
          // End of stream, stop processing
          break;
        }
      }

      // If foreground, set pixel color
      if (currentValue === 1) {
        // Convert (x,y) to Row-Major index for ImageData
        // Index = (y * width + x) * 4 (RGBA)
        const idx = (y * w + x) * 4;
        data[idx] = color[0];     // R
        data[idx + 1] = color[1]; // G
        data[idx + 2] = color[2]; // B
        data[idx + 3] = 210;      // Alpha (0-255). Increased for better visibility.
      }

      if (runRemaining > 0) {
          runRemaining--;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

/**
 * Calculates the center of mass (centroid) for a mask from RLE counts.
 */
export const calculateCentroid = (rle: COCORLE): { x: number; y: number } | null => {
  const [h, w] = rle.size;
  
  let counts: number[];
  if (Array.isArray(rle.counts)) {
    counts = rle.counts;
  } else if (typeof rle.counts === 'string') {
    counts = decodeCocoRleString(rle.counts);
  } else {
    return null;
  }
  
  if (!counts || counts.length === 0) return null;

  let totalX = 0;
  let totalY = 0;
  let totalPixels = 0;

  let countsIndex = 0;
  let runRemaining = counts[0];
  let currentValue = 0;

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      while (runRemaining === 0) {
        countsIndex++;
        if (countsIndex < counts.length) {
          runRemaining = counts[countsIndex];
          currentValue = countsIndex % 2;
        } else {
          break;
        }
      }

      if (currentValue === 1) {
        totalX += x;
        totalY += y;
        totalPixels++;
      }
      
      if (runRemaining > 0) runRemaining--;
    }
  }

  if (totalPixels === 0) return null;

  return {
    x: totalX / totalPixels,
    y: totalY / totalPixels
  };
};

/**
 * Generates a consistent random color for an ID.
 */
export const getColorForId = (id: number): [number, number, number] => {
  // Hash function optimized for distinct colors for sequential IDs
  // Multiply by large prime to scatter sequential IDs
  const hue = (id * 137.508) % 360; 
  // Higher saturation (80%) and slightly lighter (60%) for better visibility on dark medical scans
  return hslToRgb(hue / 360, 0.8, 0.6);
};

// Helper: HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; 
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return p;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Extracts the filename from a potentially long path.
 * e.g. "train/images/slice_001.jpg" -> "slice_001.jpg"
 * Also trims whitespace.
 */
export const getBasename = (path: string): string => {
  return (path.split(/[/\\]/).pop() || path).trim();
};

/**
 * Structure for Tree Nodes
 */
export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  children?: { [key: string]: TreeNode };
  data?: COCOImage;
  path: string;
}

/**
 * Builds a directory tree from a list of COCO images.
 */
export const buildFileTree = (images: COCOImage[]): TreeNode => {
  const root: TreeNode = { name: 'root', type: 'folder', children: {}, path: '' };

  images.forEach(img => {
    // Normalize path separators
    const parts = img.file_name.split(/[/\\]/);
    let current = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (!current.children) {
        current.children = {};
      }

      // If it's the last part, it's a file
      if (index === parts.length - 1) {
        current.children[part] = {
          name: part,
          type: 'file',
          data: img,
          path: currentPath
        };
      } else {
        // It's a folder
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            type: 'folder',
            children: {},
            path: currentPath
          };
        }
        current = current.children[part];
      }
    });
  });

  return root;
};