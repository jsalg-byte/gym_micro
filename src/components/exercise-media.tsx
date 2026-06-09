type ExerciseMediaProps = {
  src?: string | null;
  name: string;
  mediaType?: "video" | "external" | "none";
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
};

function getYouTubeEmbedUrl(src: string) {
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] ?? null;
      } else if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      }
    }

    if (!videoId) {
      return null;
    }

    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
    const start = url.searchParams.get("start") ?? url.searchParams.get("t");
    if (start && /^\d+$/.test(start)) {
      embed.searchParams.set("start", start);
    }
    return embed.toString();
  } catch {
    return null;
  }
}

export function ExerciseMedia({
  src,
  name,
  mediaType,
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

  const embedUrl = mediaType === "external" ? getYouTubeEmbedUrl(src) : null;
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={`${name} exercise demo`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className={`aspect-video w-full rounded-xl ${className}`}
      />
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
