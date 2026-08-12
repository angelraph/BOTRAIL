import { txExplorerUrl } from "@/lib/explorer";

export function TxHash({ hash, label }: { hash: string | null | undefined; label?: string }) {
  if (!hash) return <span className="text-zinc-400 text-xs">—</span>;
  const url = txExplorerUrl(hash);
  const short = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
  return (
    <span className="font-mono text-xs">
      {label ? <span className="text-zinc-500 mr-1">{label}:</span> : null}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          {short}
        </a>
      ) : (
        <span title={hash}>{short}</span>
      )}
    </span>
  );
}
