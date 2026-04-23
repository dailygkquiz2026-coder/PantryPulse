import firebaseConfig from '../../firebase-applet-config.json';

const STORE_MAP: Record<string, string> = {
  bigbasket: 'BigBasket',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  swiggy: 'Swiggy Instamart',
  instamart: 'Swiggy Instamart',
  amazon: 'Amazon Fresh',
  flipkart: 'Flipkart Grocery',
  jiomart: 'JioMart',
  dmart: 'DMart',
};

function matchStore(source: string): string {
  const s = source.toLowerCase();
  for (const [key, name] of Object.entries(STORE_MAP)) {
    if (s.includes(key)) return name;
  }
  return source;
}

function parsePrice(raw: string): number {
  return parseFloat(raw.replace(/[₹$,\s]/g, '')) || 0;
}

function parsePricePerUnit(title: string, price: number): { pricePerUnit: number; unit: string } {
  const m = title.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l(?:itre)?|pcs?|pieces?|pack)/i);
  if (!m) return { pricePerUnit: price, unit: '1 unit' };
  const qty = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  if (u === 'kg') return { pricePerUnit: Math.round((price / qty / 10) * 100) / 100, unit: '100g' };
  if (u === 'g') return { pricePerUnit: Math.round((price / qty * 100) * 100) / 100, unit: '100g' };
  if (u === 'l' || u.startsWith('litre')) return { pricePerUnit: Math.round((price / qty / 10) * 100) / 100, unit: '100ml' };
  if (u === 'ml') return { pricePerUnit: Math.round((price / qty * 100) * 100) / 100, unit: '100ml' };
  return { pricePerUnit: price, unit: '1 unit' };
}

function buildStoreLink(storeName: string, productName: string): string {
  const q = encodeURIComponent(productName);
  const map: Record<string, string> = {
    'BigBasket': `https://www.bigbasket.com/ps/?q=${q}`,
    'Blinkit': `https://blinkit.com/s/?q=${q}`,
    'Zepto': `https://www.zepto.com/search?query=${q}`,
    'Swiggy Instamart': `https://www.swiggy.com/instamart/search?query=${q}`,
    'Amazon Fresh': `https://www.amazon.in/s?k=${q}&i=nowstore`,
    'Flipkart Grocery': `https://www.flipkart.com/search?q=${q}&marketplace=GROCERY`,
    'JioMart': `https://www.jiomart.com/search/${q}`,
    'DMart': `https://www.dmart.in/search?q=${q}`,
  };
  return map[storeName] || `https://www.google.com/search?q=${q}+price+india`;
}

async function verifyToken(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    const apiKey = process.env.FIREBASE_WEB_API_KEY ?? firebaseConfig.apiKey;
    if (!apiKey) return false;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await verifyToken(req.headers.authorization);
  if (!authed) return res.status(401).json({ error: 'Unauthorized' });

  const { itemName, location } = req.body ?? {};
  if (!itemName || typeof itemName !== 'string') return res.status(400).json({ error: 'itemName required' });

  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return res.status(503).json({ error: 'Price search not configured' });

  const locationHint = location ? ` near ${location}` : ' india';
  const query = `${itemName.slice(0, 80)} grocery price${locationHint}`;

  try {
    const serperRes = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'in', hl: 'en', num: 10 }),
    });

    if (!serperRes.ok) return res.status(502).json({ error: 'Search service unavailable' });

    const data = await serperRes.json();
    const items: any[] = data.shopping ?? [];

    const results = items
      .filter(item => item.price && parsePrice(item.price) > 0)
      .map(item => {
        const price = parsePrice(item.price);
        const storeName = matchStore(item.source ?? '');
        const { pricePerUnit, unit } = parsePricePerUnit(item.title ?? '', price);
        return {
          productName: item.title ?? itemName,
          storeName,
          price,
          quantity: item.title?.match(/\d+(?:\.\d+)?\s*(?:kg|g|ml|l|pcs)/i)?.[0] ?? '',
          pricePerUnit,
          unit,
          link: item.link ?? buildStoreLink(storeName, item.title ?? itemName),
          productImage: item.imageUrl ?? '',
          sourceVerification: 'Google Shopping',
          sourceUrl: item.link ?? '',
        };
      })
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit)
      .slice(0, 5);

    return res.status(200).json(results);
  } catch {
    return res.status(500).json({ error: 'Search failed. Please try again.' });
  }
}
