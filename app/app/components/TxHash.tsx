import { txExplorerUrl } from "@/lib/explorer";

export function TxHash({ hash, label }: { hash: string | null | undefined; label?: string }) {
  if (!hash) return <span className="text-text-muted text-xs">-</span>;
  const url = txExplorerUrl(hash);
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  return (
    <span className="font-mono text-xs tabular">
      {label ? <span className="text-text-muted mr-1">{label}:</span> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover hover:underline">
          {short}
        </a>
      ) : (
        <span title={hash} className="text-text-secondary">
          {short}
        </span>
      )}
    </span>
  );
}
