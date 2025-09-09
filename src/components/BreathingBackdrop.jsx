export default function BreathingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* soft radial glows */}
      <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30"
           style={{ background:"radial-gradient(circle at 30% 30%, #3b82f6, transparent 60%)", animation:"float1 18s ease-in-out infinite" }} />
      <div className="absolute -bottom-52 -right-40 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-30"
           style={{ background:"radial-gradient(circle at 70% 70%, #ef4444, transparent 60%)", animation:"float2 22s ease-in-out infinite" }} />
      {/* subtle moving geometry (hex-ish) */}
      <div className="absolute inset-0 opacity-[0.075]"
           style={{
             backgroundImage:
               "repeating-linear-gradient(60deg, rgba(255,255,255,.18) 0 2px, transparent 2px 28px), repeating-linear-gradient(-60deg, rgba(255,255,255,.18) 0 2px, transparent 2px 28px)",
             backgroundSize: "200% 200%",
             animation: "pan 28s linear infinite, hue 20s linear infinite",
           }} />
      <style>{`
        @keyframes pan { 0% {background-position:0% 0%} 50% {background-position:100% 50%} 100% {background-position:0% 0%} }
        @keyframes hue { 0% { filter:hue-rotate(0deg) } 100% { filter:hue-rotate(360deg) } }
        @keyframes float1 { 0%,100%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(12px,-10px,0) } }
        @keyframes float2 { 0%,100%{ transform:translate3d(0,0,0) } 50%{ transform:translate3d(-14px,10px,0) } }
      `}</style>
    </div>
  );
}