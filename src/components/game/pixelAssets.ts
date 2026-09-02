/**
 * 16-bit Retro Pixel Sprite Generators and Asset Helpers
 * All rendered in crisp pixelated SVG/Canvas with retro palettes.
 * Properly URL-encoded to guarantee flawless rendering in all browsers.
 */

export const PALETTE = {
  black: '#181425',
  darkBlue: '#262b44',
  deepPurple: '#3a2720',
  brown: '#5d4037',
  sand: '#e2d2a9',
  cream: '#f4eedb',
  gold: '#ffc825',
  goldBright: '#ffe769',
  orange: '#f07122',
  red: '#e43b44',
  redDark: '#a22633',
  green: '#38b764',
  greenDark: '#257942',
  cyan: '#3cd2c4',
  cyanDark: '#1fa397',
  blue: '#3b5dc9',
  blueDark: '#263b82',
  slate: '#637599',
  steel: '#9babbf',
  white: '#ffffff',
};

export function encodeSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export function normalizeCareer(
  type: string | null | undefined
): 'monitoring' | 'grid' | 'health_factor' | 'yield' | 'player' | 'npc_grey' {
  if (!type) return 'monitoring';
  const t = String(type).toLowerCase().replace(/[-_\s]/g, '');
  if (t.includes('grey') || t.includes('npc') || t.includes('inactive')) return 'npc_grey';
  if (t.includes('player') || t.includes('hunter') || t.includes('buyer')) return 'player';
  if (t.includes('health') || t.includes('factor') || t.includes('vulcan') || t.includes('forge') || t.includes('ltv') || t.includes('venus') || t.includes('shield')) {
    return 'health_factor';
  }
  if (t.includes('grid') || t.includes('chronos') || t.includes('dca') || t.includes('ladder') || t.includes('pancake')) {
    return 'grid';
  }
  if (t.includes('yield') || t.includes('demeter') || t.includes('farm') || t.includes('harvest') || t.includes('apy') || t.includes('greenhouse')) {
    return 'yield';
  }
  if (t.includes('monitor') || t.includes('watch') || t.includes('aegis') || t.includes('whale') || t.includes('mempool') || t.includes('radar')) {
    return 'monitoring';
  }
  return 'monitoring';
}

// Generates scalable crisp pixel SVGs for the 4 careers, player, and NPCs
export function getPixelSprite(type: string, state = 'idle'): string {
  const norm = normalizeCareer(type);
  const isWorking = state === 'working' || state === 'running' || state === 'funded';
  const isAlert = state === 'alert' || state === 'emergency';
  const isSuccess = state === 'success' || state === 'submitted' || state === 'paid';

  switch (norm) {
    case 'monitoring': {
      // Aegis Watchtower Sentinel (16x16 pixel art)
      // Deep blue hooded mantle, cyan radar monocle, golden telescope staff
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <!-- Hood & Head -->
        <rect x="5" y="1" width="6" height="2" fill="${PALETTE.blueDark}" />
        <rect x="4" y="2" width="8" height="2" fill="${PALETTE.blue}" />
        <rect x="5" y="3" width="6" height="3" fill="${PALETTE.sand}" />
        <!-- Cyan Visor / Optical Monocle -->
        <rect x="5" y="4" width="3" height="2" fill="${PALETTE.cyan}" />
        <rect x="6" y="4" width="1" height="1" fill="${PALETTE.white}" />
        <rect x="9" y="4" width="2" height="2" fill="${PALETTE.darkBlue}" />
        <!-- Robe & Gold Accents -->
        <rect x="4" y="6" width="8" height="2" fill="${PALETTE.blue}" />
        <rect x="7" y="6" width="2" height="5" fill="${PALETTE.gold}" />
        <rect x="3" y="8" width="10" height="5" fill="${PALETTE.blueDark}" />
        <!-- Golden Telescope / Radar Lens in Hand -->
        <rect x="1" y="5" width="2" height="6" fill="${PALETTE.gold}" />
        <rect x="1" y="4" width="3" height="1" fill="${PALETTE.cyan}" />
        <rect x="1" y="11" width="1" height="3" fill="${PALETTE.brown}" />
        <!-- Right Hand -->
        <rect x="13" y="8" width="2" height="3" fill="${PALETTE.sand}" />
        <!-- Boots -->
        <rect x="5" y="13" width="2" height="3" fill="${PALETTE.black}" />
        <rect x="9" y="13" width="2" height="3" fill="${PALETTE.black}" />
        ${
          isWorking
            ? `<!-- Radar Scan Waves -->
               <rect x="0" y="2" width="1" height="1" fill="${PALETTE.cyan}" />
               <rect x="0" y="0" width="2" height="1" fill="${PALETTE.cyan}" />
               <rect x="2" y="1" width="1" height="1" fill="${PALETTE.cyanDark}" />`
            : ''
        }
        ${
          isAlert
            ? `<!-- Alert Red Flashes -->
               <rect x="12" y="1" width="3" height="2" fill="${PALETTE.red}" />
               <rect x="13" y="3" width="1" height="1" fill="${PALETTE.redDark}" />`
            : ''
        }
        ${
          isSuccess
            ? `<!-- Gold Success Sparkle -->
               <rect x="13" y="1" width="2" height="2" fill="${PALETTE.gold}" />
               <rect x="14" y="0" width="1" height="4" fill="${PALETTE.goldBright}" />`
            : ''
        }
      </svg>`;
      return encodeSvg(svg);
    }

    case 'grid': {
      // Chronos Dynamic Grid Bot (16x16 pixel art)
      // Steampunk brass automaton, cogwheel crest, amber optic, wrench caliper
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <!-- Cog Crest / Antenna -->
        <rect x="7" y="0" width="2" height="2" fill="${PALETTE.gold}" />
        <rect x="6" y="1" width="4" height="1" fill="${PALETTE.orange}" />
        <!-- Metallic Chassis Head -->
        <rect x="4" y="2" width="8" height="5" fill="${PALETTE.orange}" />
        <rect x="5" y="3" width="6" height="4" fill="${PALETTE.brown}" />
        <!-- Glowing Amber Dual Optics -->
        <rect x="5" y="4" width="2" height="2" fill="${PALETTE.gold}" />
        <rect x="9" y="4" width="2" height="2" fill="${PALETTE.gold}" />
        <rect x="6" y="4" width="1" height="1" fill="${PALETTE.white}" />
        <rect x="10" y="4" width="1" height="1" fill="${PALETTE.white}" />
        <!-- Torso & Internal Cogs -->
        <rect x="3" y="7" width="10" height="6" fill="${PALETTE.brown}" />
        <rect x="6" y="8" width="4" height="4" fill="${PALETTE.gold}" />
        <rect x="7" y="9" width="2" height="2" fill="${PALETTE.black}" />
        <!-- Mechanical Arms & Grid Caliper -->
        <rect x="1" y="7" width="2" height="5" fill="${PALETTE.orange}" />
        <rect x="13" y="7" width="2" height="3" fill="${PALETTE.orange}" />
        <rect x="13" y="10" width="3" height="3" fill="${PALETTE.steel}" />
        <rect x="14" y="11" width="1" height="1" fill="${PALETTE.black}" />
        <!-- Piston Legs -->
        <rect x="5" y="13" width="2" height="3" fill="${PALETTE.slate}" />
        <rect x="9" y="13" width="2" height="3" fill="${PALETTE.slate}" />
        <rect x="4" y="15" width="3" height="1" fill="${PALETTE.black}" />
        <rect x="9" y="15" width="3" height="1" fill="${PALETTE.black}" />
        ${
          isWorking
            ? `<!-- Spark of Computation -->
               <rect x="14" y="7" width="1" height="2" fill="${PALETTE.goldBright}" />
               <rect x="13" y="6" width="2" height="1" fill="${PALETTE.cyan}" />`
            : ''
        }
        ${
          isAlert
            ? `<!-- Warning Flare -->
               <rect x="1" y="2" width="2" height="2" fill="${PALETTE.red}" />`
            : ''
        }
      </svg>`;
      return encodeSvg(svg);
    }

    case 'health_factor': {
      // Vulcan Health Factor Guardian (16x16 pixel art)
      // Crimson plate mail, gold horned helm, molten heater shield with Venus V crest, forge hammer
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <!-- Horned Crest & Helm -->
        <rect x="2" y="1" width="2" height="3" fill="${PALETTE.gold}" />
        <rect x="12" y="1" width="2" height="3" fill="${PALETTE.gold}" />
        <rect x="4" y="1" width="8" height="2" fill="${PALETTE.redDark}" />
        <rect x="4" y="3" width="8" height="4" fill="${PALETTE.red}" />
        <!-- Visor with Glowing Red Eyes -->
        <rect x="5" y="4" width="6" height="2" fill="${PALETTE.black}" />
        <rect x="6" y="4" width="1" height="1" fill="${PALETTE.goldBright}" />
        <rect x="9" y="4" width="1" height="1" fill="${PALETTE.goldBright}" />
        <!-- Heavy Plate Chest & Pauldrons -->
        <rect x="3" y="7" width="10" height="6" fill="${PALETTE.redDark}" />
        <rect x="6" y="7" width="4" height="5" fill="${PALETTE.gold}" />
        <!-- Molten Shield with V Crest (Left Hand) -->
        <rect x="0" y="6" width="4" height="7" fill="${isAlert ? PALETTE.red : PALETTE.gold}" />
        <rect x="1" y="7" width="2" height="5" fill="${isAlert ? PALETTE.goldBright : PALETTE.redDark}" />
        <rect x="1" y="8" width="1" height="2" fill="${PALETTE.gold}" />
        <rect x="2" y="8" width="1" height="2" fill="${PALETTE.gold}" />
        <!-- Forge Hammer (Right Hand) -->
        <rect x="13" y="5" width="3" height="3" fill="${PALETTE.steel}" />
        <rect x="13" y="8" width="1" height="5" fill="${PALETTE.brown}" />
        <!-- Armored Sabatons -->
        <rect x="5" y="13" width="2" height="3" fill="${PALETTE.black}" />
        <rect x="9" y="13" width="2" height="3" fill="${PALETTE.black}" />
        ${
          isAlert
            ? `<!-- High Danger Red Beacons -->
               <rect x="7" y="0" width="2" height="1" fill="${PALETTE.red}" />
               <rect x="6" y="1" width="4" height="1" fill="${PALETTE.goldBright}" />`
            : ''
        }
      </svg>`;
      return encodeSvg(svg);
    }

    case 'yield': {
      // Demeter APY Yield Harvester (16x16 pixel art)
      // Woven straw hat, emerald farmer tunic, golden sickle, wheat stalk & overflowing $U pouch
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <!-- Wide Brim Straw Hat -->
        <rect x="2" y="2" width="12" height="2" fill="${PALETTE.sand}" />
        <rect x="5" y="0" width="6" height="2" fill="${PALETTE.sand}" />
        <rect x="4" y="2" width="8" height="1" fill="${PALETTE.greenDark}" />
        <!-- Face & Friendly Eyes -->
        <rect x="5" y="4" width="6" height="3" fill="${PALETTE.cream}" />
        <rect x="6" y="4" width="1" height="1" fill="${PALETTE.brown}" />
        <rect x="9" y="4" width="1" height="1" fill="${PALETTE.brown}" />
        <!-- Emerald Tunic & Suspenders -->
        <rect x="4" y="7" width="8" height="6" fill="${PALETTE.green}" />
        <rect x="5" y="7" width="2" height="4" fill="${PALETTE.brown}" />
        <rect x="9" y="7" width="2" height="4" fill="${PALETTE.brown}" />
        <!-- Golden Sickle (Right Hand) -->
        <rect x="12" y="5" width="3" height="2" fill="${PALETTE.gold}" />
        <rect x="14" y="7" width="1" height="2" fill="${PALETTE.gold}" />
        <rect x="13" y="9" width="1" height="3" fill="${PALETTE.brown}" />
        <!-- Golden Wheat / Sprout (Left Hand) -->
        <rect x="1" y="6" width="3" height="4" fill="${PALETTE.gold}" />
        <rect x="2" y="10" width="1" height="2" fill="${PALETTE.greenDark}" />
        <!-- Boots -->
        <rect x="5" y="13" width="2" height="3" fill="${PALETTE.brown}" />
        <rect x="9" y="13" width="2" height="3" fill="${PALETTE.brown}" />
        ${
          isWorking
            ? `<!-- Sprouting Gold Coins -->
               <rect x="0" y="3" width="2" height="2" fill="${PALETTE.goldBright}" />
               <rect x="14" y="2" width="2" height="2" fill="${PALETTE.goldBright}" />`
            : ''
        }
      </svg>`;
      return encodeSvg(svg);
    }

    case 'npc_grey': {
      // Inactive Dormant ERC-8004 Agent Husk (Beat 1 Story)
      // Slumped stone grey statue, dusty offline silhouette
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <rect x="5" y="2" width="6" height="5" fill="${PALETTE.slate}" />
        <rect x="4" y="4" width="8" height="4" fill="${PALETTE.slate}" />
        <!-- Dormant/Closed Visor Lines -->
        <rect x="6" y="5" width="4" height="1" fill="${PALETTE.darkBlue}" />
        <!-- Dusty Slumped Torso -->
        <rect x="3" y="8" width="10" height="5" fill="${PALETTE.steel}" />
        <rect x="2" y="9" width="1" height="4" fill="${PALETTE.slate}" />
        <rect x="13" y="9" width="1" height="4" fill="${PALETTE.slate}" />
        <!-- Stone Pedestal / Inactive Base -->
        <rect x="4" y="13" width="8" height="3" fill="${PALETTE.darkBlue}" />
        <!-- Cobweb Accent -->
        <rect x="3" y="2" width="1" height="1" fill="${PALETTE.white}" opacity="0.3" />
        <rect x="12" y="3" width="1" height="1" fill="${PALETTE.white}" opacity="0.3" />
      </svg>`;
      return encodeSvg(svg);
    }

    case 'player':
    default: {
      // The Buyer / Web3 Hunter Hero (16x16 pixel art)
      // Feathered cavalier hat, red hero cape, regal tunic, leather boots
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="64" height="64" shape-rendering="crispEdges">
        <!-- Feathered Hat -->
        <rect x="2" y="2" width="12" height="2" fill="${PALETTE.deepPurple}" />
        <rect x="5" y="0" width="6" height="2" fill="${PALETTE.deepPurple}" />
        <rect x="10" y="0" width="2" height="2" fill="${PALETTE.gold}" />
        <rect x="11" y="2" width="1" height="1" fill="${PALETTE.gold}" />
        <!-- Face & Brave Eyes -->
        <rect x="5" y="4" width="6" height="3" fill="${PALETTE.cream}" />
        <rect x="6" y="4" width="1" height="1" fill="${PALETTE.darkBlue}" />
        <rect x="9" y="4" width="1" height="1" fill="${PALETTE.darkBlue}" />
        <!-- Regal Doublet & Golden Buckle -->
        <rect x="4" y="7" width="8" height="6" fill="${PALETTE.darkBlue}" />
        <rect x="7" y="7" width="2" height="4" fill="${PALETTE.gold}" />
        <rect x="4" y="11" width="8" height="1" fill="${PALETTE.brown}" />
        <rect x="7" y="11" width="2" height="1" fill="${PALETTE.gold}" />
        <!-- Flowing Red Cape Behind Shoulders -->
        <rect x="2" y="7" width="2" height="6" fill="${PALETTE.red}" />
        <rect x="12" y="7" width="2" height="6" fill="${PALETTE.red}" />
        <!-- Traveler Boots -->
        <rect x="5" y="13" width="2" height="3" fill="${PALETTE.brown}" />
        <rect x="9" y="13" width="2" height="3" fill="${PALETTE.brown}" />
      </svg>`;
      return encodeSvg(svg);
    }
  }
}

// Token Icons (16-bit pixelated)
export function getTokenPixelIcon(symbol: 'U' | 'BNB'): string {
  if (symbol === 'BNB') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
      <rect x="6" y="1" width="4" height="2" fill="${PALETTE.gold}" />
      <rect x="4" y="3" width="8" height="2" fill="${PALETTE.gold}" />
      <rect x="2" y="5" width="12" height="6" fill="${PALETTE.gold}" />
      <rect x="4" y="11" width="8" height="2" fill="${PALETTE.gold}" />
      <rect x="6" y="13" width="4" height="2" fill="${PALETTE.gold}" />
      <rect x="7" y="3" width="2" height="10" fill="${PALETTE.black}" />
      <rect x="3" y="7" width="10" height="2" fill="${PALETTE.black}" />
    </svg>`;
    return encodeSvg(svg);
  }

  // $U Dollar Coin
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
    <rect x="5" y="1" width="6" height="2" fill="${PALETTE.cyan}" />
    <rect x="3" y="3" width="10" height="10" fill="${PALETTE.cyan}" />
    <rect x="5" y="13" width="6" height="2" fill="${PALETTE.cyan}" />
    <!-- Letter U -->
    <rect x="5" y="4" width="2" height="6" fill="${PALETTE.black}" />
    <rect x="9" y="4" width="2" height="6" fill="${PALETTE.black}" />
    <rect x="5" y="10" width="6" height="2" fill="${PALETTE.black}" />
  </svg>`;
  return encodeSvg(svg);
}

// Town Crest
export function getTownCrestPixel(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="48" height="48" shape-rendering="crispEdges">
    <rect x="3" y="1" width="10" height="10" fill="${PALETTE.gold}" />
    <rect x="5" y="11" width="6" height="3" fill="${PALETTE.gold}" />
    <rect x="7" y="14" width="2" height="2" fill="${PALETTE.gold}" />
    <rect x="4" y="2" width="8" height="8" fill="${PALETTE.blueDark}" />
    <rect x="7" y="3" width="2" height="6" fill="${PALETTE.gold}" />
    <rect x="5" y="5" width="6" height="2" fill="${PALETTE.gold}" />
  </svg>`;
  return encodeSvg(svg);
}

