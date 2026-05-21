import type { OddsByBook } from '@apexpredix/types';
import books from '@/data/bookmakers.json';

interface Props { odds: OddsByBook[]; region: string; }

export function OddsCompare({ odds, region }: Props) {
  const visible = odds.filter((o) => {
    const book = (books as Array<{ code: string; regions: string[] }>).find((b) => b.code === o.bookCode);
    return book?.regions.includes(region as never);
  });
  if (visible.length === 0) return <div className="text-sm text-mute-1">No licensed books in this region.</div>;
  const best = Math.max(...visible.map((o) => o.price));
  return (
    <ul className="grid gap-2">
      {visible.map((o) => {
        const isBest = o.price === best;
        const book = (books as Array<{ code: string; name: string; deeplink: string }>).find((b) => b.code === o.bookCode)!;
        return (
          <li key={o.bookCode} className={`flex items-center justify-between rounded-xl bg-ink-2 px-4 py-3 ring-1 ${isBest ? 'ring-edge-cyan/40' : 'ring-white/10'}`}>
            <div>
              <div className="text-sm font-medium">{book.name}</div>
              <div className="text-xs text-mute-2">{o.market}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg">{o.price.toFixed(2)}</span>
              {isBest && <span className="rounded bg-edge-cyan/15 px-2 py-0.5 text-[10px] uppercase text-edge-cyan">Best</span>}
              <a href={book.deeplink} target="_blank" rel="noopener nofollow noreferrer" className="text-xs text-edge-cyan hover:underline">Open ↗</a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
