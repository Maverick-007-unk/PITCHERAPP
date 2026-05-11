export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="overflow-hidden border-y-2 border-ko-black bg-ko-orange py-2.5" style={{ transform: 'skewY(-1deg)' }}>
      <div className="flex gap-8 whitespace-nowrap" style={{ animation: 'marquee 20s linear infinite' }}>
        {doubled.map((item, i) => (
          <span key={i} className="font-archivo text-lg uppercase tracking-tight4 text-ko-black shrink-0">
            {item} <span className="opacity-40">◆</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  )
}
