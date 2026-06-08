type ExerciseMediaProps = {
  src?: string | null;
  name: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
};

export function ExerciseMedia({
  src,
  name,
  className = "",
  autoPlay = false,
  controls = false,
}: ExerciseMediaProps) {
  if (!src) {
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-xl border border-line bg-surface text-sm text-muted ${className}`}
      >
        No demo video
      </div>
    );
  }

  return (
    <video
      src={src}
      muted
      loop
      playsInline
      preload={autoPlay ? "metadata" : "none"}
      autoPlay={autoPlay}
      controls={controls}
      aria-label={`${name} exercise demo`}
      className={`aspect-video w-full rounded-xl object-cover ${className}`}
    />
  );
}
