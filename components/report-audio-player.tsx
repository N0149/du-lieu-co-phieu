"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [1, 1.5, 2] as const;
const SEEK_STEP = 10; // tua ±10 giây

/** Định dạng mm:ss (hoặc m:ss) cho hiển thị thời gian. */
function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const controlCls =
  "inline-flex size-9 min-h-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400";
const playCls =
  "inline-flex size-11 min-h-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Nghe đọc báo cáo — SERVER-SIDE Google TTS (ghép MP3).
 * File audio được tạo bởi `/api/reports/[id]/audio` (tiếng Việt tự nhiên, đồng nhất
 * trên mọi thiết bị), phát qua thẻ <audio> HTML5. Chỉ tải audio khi bấm Play lần đầu.
 */
export function ReportAudioPlayer({ docId }: { docId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasLoadedAudio, setHasLoadedAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Điều khiển ─────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    if (!hasLoadedAudio) {
      // Chỉ tải file audio lần đầu khi người dùng bấm Play (tiết kiệm băng thông).
      // Dùng fetch → đọc duration từ header (MP3 ghép thiếu header duration) →
      // tạo Blob URL rồi phát qua <audio> (seek bar hoạt động đúng).
      setIsLoading(true);
      setError(null);
      const load = async () => {
        try {
          const res = await fetch(`/api/reports/${encodeURIComponent(docId)}/audio`);
          if (!res.ok) throw new Error(`Không tải được file audio (HTTP ${res.status}).`);
          const durHeader = res.headers.get("X-Duration-Seconds");
          if (durHeader) setDuration(Number(durHeader));
          const blob = await res.blob();
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = playbackRate;
            setHasLoadedAudio(true);
            setIsLoading(false);
            audioRef.current.play().catch(() => setError("Không thể phát audio."));
          }
        } catch (e) {
          setIsLoading(false);
          setError(e instanceof Error ? e.message : "Không tải được file audio.");
        }
      };
      void load();
      return;
    }
    audio.play().catch(() => setError("Không thể phát audio."));
  }, [docId, hasLoadedAudio, isLoading, playbackRate]);

  const handlePause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const handleSeek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = value;
    setCurrentTime(value);
  }, []);

  const changeSpeed = useCallback((value: number) => {
    setPlaybackRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  }, []);

  // ── Lắng nghe sự kiện audio ────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setHasLoadedAudio(true);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlaying = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setError("Không tải được file audio. Vui lòng thử lại sau.");
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // Huỷ phát + thu hồi Blob URL khi rời trang
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 text-emerald-600 dark:text-emerald-400 sm:p-4">
      {/* <audio> ẩn — phát MP3 từ server Google TTS */}
      <audio ref={audioRef} className="hidden" preload="none" />

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Nghe đọc báo cáo</p>
          <p className="truncate text-xs text-muted-foreground">
            Giọng đọc tiếng Việt tự nhiên · Google TTS
          </p>
        </div>
      </div>

      {/* ── Seek bar + thời gian ── */}
      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => handleSeek(Number(e.target.value))}
          disabled={!hasLoadedAudio}
          className="h-1.5 w-full cursor-pointer accent-emerald-600 disabled:cursor-default disabled:opacity-40"
          aria-label="Tiến trình đọc"
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
          <span>{fmtTime(currentTime)}</span>
          <span>{hasLoadedAudio ? fmtTime(duration) : "—"}</span>
        </div>
      </div>

      {/* ── Điều khiển ── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => seekBy(-SEEK_STEP)}
            disabled={!hasLoadedAudio}
            className={controlCls}
            aria-label={`Lùi ${SEEK_STEP} giây`}
            title={`-${SEEK_STEP}s`}
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={isLoading}
            className={playCls}
            aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-5" />
            ) : (
              <Play className="ml-0.5 size-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => seekBy(SEEK_STEP)}
            disabled={!hasLoadedAudio}
            className={controlCls}
            aria-label={`Tua tới ${SEEK_STEP} giây`}
            title={`+${SEEK_STEP}s`}
          >
            <RotateCw className="size-4" />
          </button>
        </div>

        {/* Tốc độ */}
        <div className="flex items-center gap-0.5 rounded-lg border border-emerald-500/20 bg-background p-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeSpeed(s)}
              className={cn(
                "min-h-8 rounded-md px-2.5 text-xs font-semibold transition-colors",
                playbackRate === s
                  ? "bg-emerald-600 text-white"
                  : "text-emerald-700/80 hover:text-emerald-600 dark:text-emerald-300/80",
              )}
            >
              {s.toFixed(1)}x
            </button>
          ))}
        </div>
      </div>

      {/* Trạng thái / lỗi */}
      {isLoading && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
          <Loader2 className="size-3 animate-spin" /> Đang tạo audio tiếng Việt...
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
