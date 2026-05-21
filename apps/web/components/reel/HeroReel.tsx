'use client';
import { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface Props { src?: string; poster?: string; captionsSrc?: string; }

export function HeroReel({
  src = '/media/apexpredix-reel.mp4',
  poster = '/media/apexpredix-reel-poster.avif',
  captionsSrc = '/media/apexpredix-reel.vtt',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl bg-ink-0 ring-1 ring-white/10 shadow-glow">
      {reducedMotion && !playing ? (
        <>
          <img src={poster} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="Play ApexPredix AI product preview"
            onClick={() => {
              setPlaying(true);
              videoRef.current?.play();
            }}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 ring-1 ring-white/20 backdrop-blur">
              <Play size={28} />
            </span>
          </button>
        </>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-label="ApexPredix AI product preview"
          className="h-full w-full object-cover"
        >
          <track kind="captions" srcLang="en" src={captionsSrc} default />
        </video>
      )}
      <button
        type="button"
        aria-label={muted ? 'Unmute video' : 'Mute video'}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = !v.muted;
          setMuted(v.muted);
          if (!v.muted) window.dispatchEvent(new CustomEvent('apexpredix:seedance:unmute'));
        }}
        className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur ring-1 ring-white/15 transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-cyan"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}
