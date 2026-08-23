"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "ready" | "playing" | "paused" | "error";

const SPEED_OPTIONS = [1, 1.5, 2] as const;
const VI_LANG = "vi-VN";
// Mỗi câu dài trên Chromium/Safari dễ bị speechSynthesis tự dừng giữa chừng (~15s).
const MAX_CHUNK_LEN = 200;

/** Tách văn bản thành các đoạn ngắn theo dấu câu (chống dừng đọc giữa chừng). */
function chunkText(text: string, maxLen = MAX_CHUNK_LEN): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];

  // Bảo vệ dấu chấm/phẩy bên trong SỐ (28.500, 1,234.56...) — không coi là hết câu,
  // tránh đọc bị ngắt quãng giữa các con số trong báo cáo tài chính.
  const protectedText = clean.replace(/(\d)[.,](?=\d)/g, "$1\u0000");

  // Tách theo câu kết thúc bằng . ! ? … (giữ nguyên dấu, cắt theo từng câu)
  const sentences =
    protectedText
      .match(/[^.!?…]+(?:[.!?…]+|$)/g)
      ?.map((s) => s.trim().replace(/\u0000/g, "."))
      .filter(Boolean) ?? [];

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && (current + " " + sentence).length > maxLen) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const STATUS_TEXT: Record<Status, string> = {
  idle: "Nhấn nút phát để nghe đọc nội dung báo cáo.",
  loading: "Đang tải nội dung báo cáo...",
  ready: "Sẵn sàng. Nhấn nút phát để bắt đầu.",
  playing: "Đang đọc...",
  paused: "Đã tạm dừng.",
  error: "Không thể đọc nội dung.",
};

/**
 * Chọn giọng đọc tiếng Việt có sẵn (ưu tiên giọng Google tiếng Việt / vi-VN).
 * Trả null nếu trình duyệt chưa nạp giọng hoặc không có giọng tiếng Việt.
 */
function pickVietnameseVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  const vi = voices.filter((v) => {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();
    return (
      lang.startsWith("vi") ||
      name.includes("vietnamese") ||
      name.includes("tiếng việt") ||
      name.includes("tieng viet")
    );
  });
  // Ưu tiên giọng Google (vd "Google tiếng Việt") — rõ ràng nhất trên Chromium
  return vi.find((v) => /google/i.test(v.name)) ?? vi[0] ?? null;
}

/**
 * Nghe đọc báo cáo bằng Web Speech API (giọng tiếng Việt).
 * Nội dung lấy từ `/api/reports/[docId]/content`, chia nhỏ theo câu rồi đọc
 * nối tiếp qua `onend` để tránh trình duyệt dừng đọc giữa chừng.
 */
export function ReportAudioPlayer({ docId }: { docId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [noViVoice, setNoViVoice] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const speedRef = useRef(1);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const supported = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    [],
  );

  // Nạp danh sách giọng đọc (voices nạp bất đồng bộ — lắng nghe voiceschanged).
  // LUÔN gán rõ utterance.voice bằng giọng tiếng Việt: chỉ đặt lang="vi-VN" không đủ,
  // Chrome sẽ mặc định dùng giọng tiếng Anh nếu voice không được gán.
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      const voice = pickVietnameseVoice(synth);
      voiceRef.current = voice;
      setNoViVoice(!voice);
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => synth.removeEventListener("voiceschanged", refresh);
  }, [supported]);

  // Tải nội dung báo cáo từ API
  const loadContent = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(docId)}/content`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Không tải được nội dung (HTTP ${res.status}).`);
      }
      const data = (await res.json()) as { content?: string };
      chunksRef.current = chunkText(data.content ?? "");
      if (chunksRef.current.length === 0) {
        setStatus("ready");
        setError("Không tìm thấy nội dung văn bản để đọc (có thể tài liệu chưa public).");
        return;
      }
      setProgress({ done: 0, total: chunksRef.current.length });
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Không tải được nội dung báo cáo.");
    }
  }, [docId]);

  // Đọc chunk tại indexRef.current, khi hết gọi onend → đọc tiếp chunk kế
  const speakNext = useCallback(() => {
    const synth = window.speechSynthesis;
    if (indexRef.current >= chunksRef.current.length) {
      setStatus("ready");
      return;
    }
    const text = chunksRef.current[indexRef.current];
    const utterance = new SpeechSynthesisUtterance(text);
    // Ưu tiên giọng tiếng Việt — tìm lại mỗi chunk (voices có thể vừa nạp xong)
    const voice = pickVietnameseVoice(synth) ?? voiceRef.current;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = VI_LANG;
    }
    utterance.rate = speedRef.current;

    utterance.onend = () => {
      indexRef.current += 1;
      setProgress({ done: indexRef.current, total: chunksRef.current.length });
      if (indexRef.current < chunksRef.current.length) {
        // nối tiếp chunk sau một nhịp ngắn (tránh giọng đọc bị nuốt âm)
        window.setTimeout(speakNext, 40);
      } else {
        setStatus("ready");
      }
    };
    utterance.onerror = (e) => {
      // "interrupted"/"canceled" là do hành động Pause/Stop — không phải lỗi
      if (e.error === "interrupted" || e.error === "canceled") return;
      setStatus("ready");
      setError("Có lỗi khi đọc nội dung, hãy thử phát lại.");
    };

    currentUtteranceRef.current = utterance;
    synth.speak(utterance);
    setStatus("playing");
  }, []);

  const handlePlay = useCallback(async () => {
    if (!supported) {
      setStatus("error");
      setError("Trình duyệt không hỗ trợ đọc văn bản (Web Speech API).");
      return;
    }
    const synth = window.speechSynthesis;

    // Đang tạm dừng → tiếp tục
    if (status === "paused") {
      synth.resume();
      setStatus("playing");
      return;
    }

    // Chưa có nội dung → tải về trước
    if (chunksRef.current.length === 0) {
      await loadContent();
      if (chunksRef.current.length === 0) return; // tải lỗi / không có nội dung
    }

    // Đã đọc hết trước đó → đọc lại từ đầu
    if (indexRef.current >= chunksRef.current.length) {
      indexRef.current = 0;
      setProgress({ done: 0, total: chunksRef.current.length });
    }

    synth.cancel();
    speakNext();
  }, [supported, status, loadContent, speakNext]);

  const handlePause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, [supported]);

  const handleStop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    currentUtteranceRef.current = null;
    indexRef.current = 0;
    setProgress(chunksRef.current.length ? { done: 0, total: chunksRef.current.length } : null);
    setStatus(chunksRef.current.length ? "ready" : "idle");
    setError(null);
  }, [supported]);

  // Đổi tốc độ tức thì (kể cả khi đang phát)
  const changeSpeed = useCallback((value: number) => {
    setSpeed(value);
    speedRef.current = value;
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.rate = value;
    }
  }, []);

  // Workaround lỗi Chromium/Safari: speechSynthesis tự dừng sau ~15s nếu không kích hoạt
  useEffect(() => {
    if (status !== "playing" || !supported) return;
    const timer = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [status, supported]);

  // Huỷ giọng đọc khi rời trang
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const isSpeaking = status === "playing";
  const statusLine = error ?? STATUS_TEXT[status];
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tiêu đề */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
            {status === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Nghe đọc báo cáo</p>
            <p className="text-xs text-muted-foreground">Giọng đọc tiếng Việt · Web Speech API</p>
          </div>
        </div>

        {/* Điều khiển */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="icon"
            variant="default"
            onClick={handlePlay}
            aria-label="Phát"
            title={status === "paused" ? "Tiếp tục" : "Phát"}
          >
            <Play className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handlePause}
            disabled={!isSpeaking}
            aria-label="Tạm dừng"
            title="Tạm dừng"
          >
            <Pause className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleStop}
            disabled={status === "idle" || status === "loading"}
            aria-label="Dừng lại"
            title="Dừng lại"
          >
            <Square className="size-3.5" />
          </Button>

          {/* Tốc độ đọc */}
          <div className="ml-1 flex items-center gap-0.5 rounded-lg border border-emerald-200/70 bg-background p-0.5 dark:border-emerald-900/60">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSpeed(s)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                  speed === s
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400",
                )}
              >
                {s.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tiến trình + trạng thái */}
      <div className="mt-3">
        {progress && progress.total > 0 && (
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-600/10">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p
          className={cn(
            "text-xs",
            error ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
          )}
        >
          {statusLine}
          {status === "playing" && progress && progress.total > 0
            ? ` · đoạn ${progress.done}/${progress.total} (${pct}%)`
            : ""}
        </p>
        {noViVoice && (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            Không tìm thấy giọng tiếng Việt trên thiết bị. Nếu đọc sai ngôn ngữ, hãy cài giọng
            “Tiếng Việt” trong cài đặt hệ thống / trình duyệt rồi thử lại.
          </p>
        )}
      </div>
    </div>
  );
}
