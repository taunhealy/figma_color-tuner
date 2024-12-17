figma.showUI(__html__, { width: 320, height: 480 });

// Convert color to frequency (Hz)
function colorToFrequency(color) {
  // Map hue (0-360) to frequency range (256-512 Hz, spanning one octave)
  const hue = color.h;
  return 256 + (hue / 360) * 256;
}

// Convert frequency to nearest note in C major scale
function snapToScale(freq) {
  const cMajorScale = [256, 288, 320, 341.33, 384, 426.67, 480]; // C4 to B4
  return cMajorScale.reduce((prev, curr) => 
    Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev
  );
}

// Convert frequency back to color
function frequencyToColor(freq) {
  const hue = ((freq - 256) / 256) * 360;
  return { h: hue, s: 100, l: 50 };
}

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

figma.ui.onmessage = async msg => {
  if (msg.type === 'tune-colors') {
    const colors = msg.colors;
    const tunedColors = colors.map(color => {
      const hsl = rgbToHsl(color.r, color.g, color.b);
      const freq = colorToFrequency(hsl);
      const tunedFreq = snapToScale(freq);
      const tunedHsl = frequencyToColor(tunedFreq);
      return hslToRgb(tunedHsl.h, tunedHsl.s, tunedHsl.l);
    });

    figma.ui.postMessage({ type: 'tuned-colors', colors: tunedColors });
  }

  if (msg.type === 'apply-colors') {
    const selection = figma.currentPage.selection;
    if (selection.length > 0) {
      for (const node of selection) {
        if ('fills' in node) {
          const fills = JSON.parse(JSON.stringify(node.fills));
          if (fills.length > 0 && fills[0].type === 'SOLID') {
            const newColor = msg.color;
            fills[0].color = {
              r: newColor.r / 255,
              g: newColor.g / 255,
              b: newColor.b / 255
            };
            node.fills = fills;
          }
        }
      }
    }
  }
}; 