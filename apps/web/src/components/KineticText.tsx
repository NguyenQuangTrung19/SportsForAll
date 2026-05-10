export function KineticText({
  text,
  baseDelay = 0,
  perLetter = 36,
}: {
  text: string;
  baseDelay?: number;
  perLetter?: number;
}) {
  return (
    <span className="inline-block whitespace-nowrap">
      {[...text].map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="inline-block animate-letter-up will-change-transform"
          style={{ animationDelay: `${baseDelay + i * perLetter}ms` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
