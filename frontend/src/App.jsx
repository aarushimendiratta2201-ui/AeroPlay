import { useState, useEffect, useRef } from "react"

const HOUR = new Date().getHours()
const IS_DAY = HOUR >= 6 && HOUR < 20

const THEME = {
  day: {
    bg: "linear-gradient(180deg, #87CEEB 0%, #B0E0FF 30%, #90EE90 70%, #228B22 100%)",
    sidebar: "rgba(255,255,255,0.25)",
    glass: "rgba(255,255,255,0.2)",
    glassBorder: "rgba(255,255,255,0.6)",
    accent: "#00cc44",
    accentGlow: "rgba(0,204,68,0.5)",
    text: "#003320",
    textSub: "rgba(0,51,32,0.6)",
    playerBg: "rgba(200,240,255,0.35)",
    bubbleColor: "rgba(255,255,255,0.35)",
    highlight: "#00aa33",
  },
  night: {
    bg: "linear-gradient(180deg, #000814 0%, #001233 30%, #0a2a0a 70%, #001a00 100%)",
    sidebar: "rgba(0,20,60,0.5)",
    glass: "rgba(0,30,80,0.35)",
    glassBorder: "rgba(0,150,255,0.3)",
    accent: "#00ffaa",
    accentGlow: "rgba(0,255,170,0.5)",
    text: "#c8f0ff",
    textSub: "rgba(150,210,255,0.6)",
    playerBg: "rgba(0,20,60,0.5)",
    bubbleColor: "rgba(0,100,255,0.15)",
    highlight: "#00ddff",
  }
}

const T = IS_DAY ? THEME.day : THEME.night

const SAMPLE_PLAYLISTS = [
  { name: "Liked Songs", sub: "1,338 songs", icon: "💚" },
  { name: "Chill Vibes", sub: "Playlist", icon: "🌊" },
  { name: "2000s Hits", sub: "Playlist", icon: "💿" },
  { name: "Focus Flow", sub: "Playlist", icon: "🌿" },
  { name: "Summer Drive", sub: "Playlist", icon: "☀️" },
]

export default function App() {
  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState("0:00")
  const [duration, setDuration] = useState("0:00")
  const [volume, setVolume] = useState(80)
  const [time, setTime] = useState("--:--")
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const animRef = useRef(null)
  const bubblesRef = useRef([])

  // clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // bubbles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)

    bubblesRef.current = Array.from({length: 18}, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 40 + 10,
      speed: Math.random() * 0.4 + 0.1,
      opacity: Math.random() * 0.4 + 0.1,
      wobble: Math.random() * Math.PI * 2,
    }))

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      bubblesRef.current.forEach(b => {
        b.y -= b.speed
        b.wobble += 0.015
        b.x += Math.sin(b.wobble) * 0.4
        if (b.y + b.r < 0) {
          b.y = canvas.height + b.r
          b.x = Math.random() * canvas.width
        }
        // bubble
        const grad = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.1, b.x, b.y, b.r)
        grad.addColorStop(0, IS_DAY ? `rgba(255,255,255,${b.opacity + 0.3})` : `rgba(0,150,255,${b.opacity + 0.2})`)
        grad.addColorStop(0.5, IS_DAY ? `rgba(200,240,255,${b.opacity})` : `rgba(0,50,150,${b.opacity})`)
        grad.addColorStop(1, `rgba(255,255,255,0)`)
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI*2)
        ctx.fillStyle = grad
        ctx.fill()
        // gloss
        ctx.beginPath()
        ctx.ellipse(b.x - b.r*0.25, b.y - b.r*0.3, b.r*0.35, b.r*0.2, -Math.PI/4, 0, Math.PI*2)
        ctx.fillStyle = IS_DAY ? "rgba(255,255,255,0.6)" : "rgba(100,200,255,0.4)"
        ctx.fill()
      })
    }
    draw()
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current) }
  }, [])

  function fmt(s) {
    if (!s || isNaN(s)) return "0:00"
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files)
    const newTracks = files.map(f => ({
      file: f,
      name: f.name.replace(/\.[^.]+$/, ""),
      url: URL.createObjectURL(f),
    }))
    setTracks(prev => {
      const updated = [...prev, ...newTracks]
      if (prev.length === 0 && newTracks.length > 0) {
        setTimeout(() => loadTrack(0, updated), 100)
      }
      return updated
    })
  }

  function loadTrack(index, list) {
    const trackList = list || tracks
    if (!trackList[index]) return
    const audio = audioRef.current
    audio.src = trackList[index].url
    audio.play()
    setIsPlaying(true)
    setCurrentIndex(index)
    initVisualizer()
  }

  function initVisualizer() {
    if (audioCtxRef.current) return
    const audio = audioRef.current
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    analyser.connect(ctx.destination)
    audioCtxRef.current = ctx
    analyserRef.current = analyser
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio.src) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true); initVisualizer() }
  }

  function next() { if (tracks.length) loadTrack((currentIndex+1) % tracks.length) }
  function prev() { if (tracks.length) loadTrack((currentIndex-1+tracks.length) % tracks.length) }

  const track = tracks[currentIndex]

  const glassStyle = {
    background: T.glass,
    backdropFilter: "blur(16px) saturate(150%)",
    WebkitBackdropFilter: "blur(16px) saturate(150%)",
    border: `1px solid ${T.glassBorder}`,
    borderRadius: 16,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.accent}55; border-radius: 4px; }

        .app {
          width: 100vw; height: 100vh;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          background: ${T.bg};
        }

        /* stars for night */
        ${!IS_DAY ? `
        .app::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 15%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 8%, white 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 40% 20%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 5%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 75% 18%, white 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 85% 10%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 25%, white 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 35%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 50% 30%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,0.6) 0%, transparent 100%);
          pointer-events: none; z-index: 0;
        }` : `
        /* sun rays for day */
        .app::before {
          content: '';
          position: absolute;
          top: -100px; right: 80px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(255,255,200,0.4) 0%, rgba(255,220,100,0.15) 40%, transparent 70%);
          pointer-events: none; z-index: 0;
        }`}

        canvas.bg-canvas {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 1;
        }

        .main-layout {
          display: flex; flex: 1;
          overflow: hidden;
          position: relative; z-index: 2;
        }

        /* SIDEBAR */
        .sidebar {
          width: 220px; min-width: 220px;
          display: flex; flex-direction: column;
          padding: 16px 12px;
          gap: 6px;
          background: ${T.sidebar};
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-right: 1px solid ${T.glassBorder};
          overflow-y: auto;
        }

        .logo {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px 16px;
          font-size: 20px; font-weight: 700;
          color: ${T.accent};
          text-shadow: 0 0 12px ${T.accentGlow};
          letter-spacing: -0.5px;
        }

        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          color: ${T.text}; cursor: pointer;
          transition: all 0.15s;
          border: none; background: none; text-align: left; width: 100%;
        }
        .nav-item:hover, .nav-item.active {
          background: ${T.glass};
          color: ${T.accent};
          box-shadow: 0 0 8px ${T.accentGlow};
        }

        .section-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${T.textSub}; padding: 12px 12px 4px;
        }

        .playlist-item-side {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 12px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s;
        }
        .playlist-item-side:hover {
          background: ${T.glass};
        }
        .playlist-item-side .name {
          font-size: 12px; font-weight: 500; color: ${T.text};
        }
        .playlist-item-side .sub {
          font-size: 10px; color: ${T.textSub};
        }

        /* MAIN CONTENT */
        .content {
          flex: 1; overflow-y: auto;
          padding: 24px 28px;
          display: flex; flex-direction: column; gap: 20px;
        }

        .content-header {
          display: flex; align-items: center;
          justify-content: space-between;
        }

        .greeting {
          font-size: 13px; font-weight: 600;
          color: ${T.textSub}; letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .clock-display {
          font-size: 13px; font-weight: 600;
          color: ${T.textSub};
        }

        .hero-card {
          display: flex; gap: 20px;
          padding: 20px;
          position: relative; overflow: hidden;
          ${Object.entries(glassStyle).map(([k,v]) => `${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')};
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        }

        /* gloss on hero card */
        .hero-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.2), transparent);
          border-radius: 16px 16px 0 0;
          pointer-events: none;
        }

        .hero-art {
          width: 120px; height: 120px; min-width: 120px;
          border-radius: 12px; overflow: hidden;
          background: linear-gradient(135deg, ${T.accent}33, ${T.highlight}22);
          border: 1px solid ${T.glassBorder};
          display: flex; align-items: center; justify-content: center;
          font-size: 48px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px ${T.glassBorder};
        }

        .hero-info { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
        .hero-label { font-size: 11px; font-weight: 600; color: ${T.textSub}; text-transform: uppercase; letter-spacing: 0.08em; }
        .hero-title { font-size: 32px; font-weight: 700; color: ${T.text}; line-height: 1.1; }
        .hero-sub { font-size: 12px; color: ${T.textSub}; }

        .hero-controls {
          display: flex; align-items: center; gap: 10px; margin-top: 8px;
        }

        .play-btn-main {
          width: 44px; height: 44px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; position: relative; overflow: hidden;
          background: linear-gradient(160deg, ${T.accent}, ${T.highlight});
          box-shadow: 0 4px 16px ${T.accentGlow}, 0 1px 0 rgba(255,255,255,0.4) inset;
          color: white; transition: all 0.15s;
        }
        .play-btn-main::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent);
          border-radius: 50% 50% 0 0;
          pointer-events: none;
        }
        .play-btn-main:hover { transform: scale(1.05); box-shadow: 0 6px 20px ${T.accentGlow}; }

        .icon-btn {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid ${T.glassBorder};
          background: ${T.glass};
          backdrop-filter: blur(8px);
          color: ${T.text}; font-size: 14px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .icon-btn:hover { background: ${T.accent}33; color: ${T.accent}; }

        /* TRACK LIST */
        .track-list-header {
          display: grid;
          grid-template-columns: 32px 1fr 120px 60px;
          padding: 0 12px 8px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${T.textSub};
          border-bottom: 1px solid ${T.glassBorder};
        }

        .track-row {
          display: grid;
          grid-template-columns: 32px 1fr 120px 60px;
          align-items: center;
          padding: 8px 12px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s;
          font-size: 13px; color: ${T.text};
        }
        .track-row:hover { background: ${T.glass}; }
        .track-row.active {
          background: ${T.accent}22;
          color: ${T.accent};
          box-shadow: 0 0 12px ${T.accentGlow}22;
        }

        .track-num { color: ${T.textSub}; font-size: 12px; }
        .track-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .track-artist { color: ${T.textSub}; font-size: 12px; }
        .track-duration { color: ${T.textSub}; font-size: 12px; text-align: right; }

        .upload-zone {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px; padding: 32px;
          border-radius: 16px; cursor: pointer;
          border: 2px dashed ${T.glassBorder};
          background: ${T.glass};
          backdrop-filter: blur(8px);
          color: ${T.textSub}; font-size: 13px;
          transition: all 0.2s;
        }
        .upload-zone:hover {
          border-color: ${T.accent};
          color: ${T.accent};
          box-shadow: 0 0 16px ${T.accentGlow}44;
        }
        .upload-icon { font-size: 32px; }

        /* BOTTOM PLAYER */
        .player-bar {
          height: 80px; min-height: 80px;
          display: flex; align-items: center;
          padding: 0 24px; gap: 16px;
          position: relative; z-index: 10;
          background: ${T.playerBg};
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-top: 1px solid ${T.glassBorder};
          box-shadow: 0 -4px 24px rgba(0,0,0,0.1);
        }

        /* gloss on player bar */
        .player-bar::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          pointer-events: none;
        }

        .now-playing {
          display: flex; align-items: center; gap: 10px;
          min-width: 200px; width: 200px;
        }

        .np-art {
          width: 44px; height: 44px; border-radius: 8px;
          background: linear-gradient(135deg, ${T.accent}44, ${T.highlight}22);
          border: 1px solid ${T.glassBorder};
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }

        .np-title { font-size: 12px; font-weight: 600; color: ${T.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .np-artist { font-size: 10px; color: ${T.textSub}; }

        .player-center {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 6px;
        }

        .player-controls {
          display: flex; align-items: center; gap: 14px;
        }

        .ctrl-sm {
          width: 28px; height: 28px; border-radius: 50%;
          border: none; background: none;
          color: ${T.textSub}; font-size: 13px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .ctrl-sm:hover { color: ${T.accent}; }

        .ctrl-play {
          width: 36px; height: 36px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; position: relative; overflow: hidden;
          background: linear-gradient(160deg, ${T.accent}, ${T.highlight});
          color: white;
          box-shadow: 0 3px 12px ${T.accentGlow}, 0 1px 0 rgba(255,255,255,0.35) inset;
          transition: all 0.15s;
        }
        .ctrl-play::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.35), transparent);
          border-radius: 50% 50% 0 0; pointer-events: none;
        }
        .ctrl-play:hover { transform: scale(1.08); }

        .progress-row {
          display: flex; align-items: center; gap: 8px;
          width: 100%; max-width: 500px;
        }

        .time-label { font-size: 10px; color: ${T.textSub}; min-width: 32px; }
        .time-label.right { text-align: right; }

        .progress-track {
          flex: 1; height: 4px; border-radius: 2px;
          background: ${T.glass};
          border: 1px solid ${T.glassBorder};
          cursor: pointer; position: relative;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, ${T.accent}, ${T.highlight});
          box-shadow: 0 0 6px ${T.accentGlow};
          transition: width 0.1s linear;
        }

        .player-right {
          min-width: 200px; width: 200px;
          display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        }

        .vol-track {
          width: 80px; height: 4px; border-radius: 2px;
          background: ${T.glass};
          border: 1px solid ${T.glassBorder};
          cursor: pointer; position: relative; overflow: hidden;
        }
        .vol-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, ${T.accent}, ${T.highlight});
        }

        .theme-badge {
          font-size: 10px; font-weight: 600;
          padding: 3px 8px; border-radius: 20px;
          color: ${T.accent};
          background: ${T.accent}22;
          border: 1px solid ${T.accent}44;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
      `}</style>

      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          const a = audioRef.current
          if (!a.duration) return
          setProgress((a.currentTime / a.duration) * 100)
          setCurrentTime(fmt(a.currentTime))
          setDuration(fmt(a.duration))
        }}
        onEnded={next}
      />

      <div className="app">
        <canvas ref={canvasRef} className="bg-canvas"/>

        <div className="main-layout">

          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="logo">
              {IS_DAY ? "🌿" : "🌙"} Aura
            </div>
            {[["🏠","Home"],["🔍","Search"],["📚","Your Library"]].map(([icon,label]) => (
              <button key={label} className={`nav-item${label==="Home"?" active":""}`}>
                <span>{icon}</span> {label}
              </button>
            ))}
            <div className="section-label">Playlists</div>
            {SAMPLE_PLAYLISTS.map(p => (
              <div key={p.name} className="playlist-item-side">
                <span style={{fontSize:18}}>{p.icon}</span>
                <div>
                  <div className="name">{p.name}</div>
                  <div className="sub">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <div className="content">
            <div className="content-header">
              <span className="greeting">{IS_DAY ? "☀️ Good day" : "🌙 Good evening"}</span>
              <span className="clock-display">{time}</span>
            </div>

            {/* HERO */}
            <div className="hero-card">
              <div className="hero-art">
                {track ? "🎵" : IS_DAY ? "🌿" : "🌙"}
              </div>
              <div className="hero-info">
                <span className="hero-label">Now Playing</span>
                <h1 className="hero-title">{track?.name || "Add your music"}</h1>
                <span className="hero-sub">
                  {tracks.length > 0 ? `${tracks.length} track${tracks.length>1?"s":""} loaded` : "Upload MP3s to get started"}
                </span>
                <div className="hero-controls">
                  <button className="play-btn-main" onClick={togglePlay}>
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                  <button className="icon-btn">+</button>
                  <button className="icon-btn">↓</button>
                  <button className="icon-btn">•••</button>
                </div>
              </div>
            </div>

            {/* TRACK LIST */}
            {tracks.length > 0 ? (
              <>
                <div className="track-list-header">
                  <span>#</span>
                  <span>Title</span>
                  <span>Plays</span>
                  <span style={{textAlign:"right"}}>⏱</span>
                </div>
                {tracks.map((t, i) => (
                  <div key={i}
                    className={`track-row${i===currentIndex?" active":""}`}
                    onClick={() => loadTrack(i)}>
                    <span className="track-num">{i===currentIndex && isPlaying ? "▶" : i+1}</span>
                    <div>
                      <div className="track-name">{t.name}</div>
                      <div className="track-artist">Local Track</div>
                    </div>
                    <span className="track-duration">—</span>
                    <span className="track-duration">{i===currentIndex ? currentTime : "—"}</span>
                  </div>
                ))}
              </>
            ) : (
              <label className="upload-zone">
                <span className="upload-icon">{IS_DAY ? "🌿" : "🌙"}</span>
                <span style={{fontWeight:600}}>Drop your music here</span>
                <span style={{fontSize:11}}>Supports MP3, WAV, OGG</span>
                <input type="file" accept=".mp3,.wav,.ogg" multiple hidden onChange={handleFiles}/>
              </label>
            )}
          </div>
        </div>

        {/* BOTTOM PLAYER BAR */}
        <div className="player-bar">
          {/* now playing */}
          <div className="now-playing">
            <div className="np-art">{track ? "🎵" : IS_DAY ? "🌿" : "🌙"}</div>
            <div>
              <div className="np-title">{track?.name || "No track loaded"}</div>
              <div className="np-artist">Local Track</div>
            </div>
          </div>

          {/* center controls */}
          <div className="player-center">
            <div className="player-controls">
              <button className="ctrl-sm" onClick={prev}>⏮</button>
              <button className="ctrl-play" onClick={togglePlay}>
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button className="ctrl-sm" onClick={next}>⏭</button>
            </div>
            <div className="progress-row">
              <span className="time-label">{currentTime}</span>
              <div className="progress-track"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  if (audioRef.current.duration) {
                    audioRef.current.currentTime = ((e.clientX-rect.left)/rect.width) * audioRef.current.duration
                  }
                }}>
                <div className="progress-fill" style={{width:progress+"%"}}/>
              </div>
              <span className="time-label right">{duration}</span>
            </div>
          </div>

          {/* right — volume + theme badge */}
          <div className="player-right">
            <span style={{fontSize:13, color: T.textSub}}>🔊</span>
            <div className="vol-track"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const v = Math.round(((e.clientX-rect.left)/rect.width)*100)
                setVolume(v)
                if (audioRef.current) audioRef.current.volume = v/100
              }}>
              <div className="vol-fill" style={{width:volume+"%"}}/>
            </div>
            <span className="theme-badge">
              {IS_DAY ? "☀️ Aero Day" : "🌙 Aero Night"}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}