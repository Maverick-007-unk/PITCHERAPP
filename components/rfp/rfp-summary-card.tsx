interface RfpSummaryCardProps {
  label: string
  value: string | string[]
}

export function RfpSummaryCard({ label, value }: RfpSummaryCardProps) {
  return (
    <div className="border-l-2 border-ko-orange pl-4 py-2">
      <p className="font-mono text-[9px] uppercase tracking-tight2 text-[#555] mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="font-mono text-[9px] uppercase tracking-tight2 border border-[#333] text-[#888] px-2 py-0.5 rounded-full">{v}</span>
          ))}
        </div>
      ) : (
        <p className="font-archivo text-xl uppercase tracking-tight4 text-ko-white">{value || '—'}</p>
      )}
    </div>
  )
}
