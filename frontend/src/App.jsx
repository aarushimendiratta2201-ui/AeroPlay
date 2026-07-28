import { useState, useEffect, useRef } from "react"

const HOUR = new Date().getHours()
const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max)

const THEMES = {
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
    highlight: "#00ddff",
  }
}

export default function App() {
  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState("0:00")
  const [duration, setDuration] = useState("0:00")
  const [volume, setVolume] = useState(80)
  const [time, setTime] = useState("--:--")
  const [moodGroups, setMoodGroups] = useState({})
  const [selectedMood, setSelectedMood] = useState(null)

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [isDayMode, setIsDayMode] = useState(HOUR >= 6 && HOUR < 20)
  const [bubbleCount, setBubbleCount] = useState(25)
  const [accentColor, setAccentColor] = useState("#00cc44")
  const [bgImage, setBgImage] = useState(null)

  const T = {
    ...THEMES[isDayMode ? "day" : "night"],
    accent: accentColor,
    accentGlow: accentColor + "88",
    highlight: accentColor,
  }
  const IS_DAY = isDayMode

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const vizCanvasRef = useRef(null)
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const animRef = useRef(null)
  const vizAnimRef = useRef(null)
  const bubblesRef = useRef([])

  // Wake up backend
  useEffect(() => {
    fetch("https://aeroplay.onrender.com/health").catch(() => {})
  }, [])

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Bubbles — recreate when count changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    bubblesRef.current = Array.from({ length: bubbleCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 35 + 15,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.35 + 0.15,
      wobble: Math.random() * Math.PI * 2,
    }))

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      bubblesRef.current.forEach(b => {
        b.y -= b.speed
        b.wobble += 0.015
        b.x += Math.sin(b.wobble) * 0.5
        if (b.y + b.r < 0) {
          b.y = canvas.height + b.r
          b.x = Math.random() * canvas.width
        }
        const ba = b.opacity
        const grad = ctx.createRadialGradient(b.x-b.r*0.3, b.y-b.r*0.3, b.r*0.05, b.x, b.y, b.r)
        if (IS_DAY) {
          grad.addColorStop(0, `rgba(255,255,255,${clamp(ba+0.45)})`)
          grad.addColorStop(0.35, `rgba(180,235,255,${clamp(ba+0.15)})`)
          grad.addColorStop(0.7, `rgba(120,200,255,${clamp(ba*0.6)})`)
          grad.addColorStop(1, `rgba(100,180,255,0)`)
        } else {
          grad.addColorStop(0, `rgba(140,220,255,${clamp(ba+0.35)})`)
          grad.addColorStop(0.35, `rgba(0,120,220,${clamp(ba+0.15)})`)
          grad.addColorStop(0.7, `rgba(0,60,160,${clamp(ba*0.5)})`)
          grad.addColorStop(1, `rgba(0,20,80,0)`)
        }
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill()
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2)
        ctx.strokeStyle = IS_DAY ? `rgba(255,255,255,${clamp(ba*0.85)})` : `rgba(120,200,255,${clamp(ba*0.7)})`
        ctx.lineWidth=1.2; ctx.stroke()
        const g1 = ctx.createRadialGradient(b.x-b.r*0.3,b.y-b.r*0.35,0,b.x-b.r*0.3,b.y-b.r*0.35,Math.max(b.r*0.5,1))
        g1.addColorStop(0,`rgba(255,255,255,${clamp(ba+0.55)})`); g1.addColorStop(0.5,`rgba(255,255,255,${clamp(ba*0.25)})`); g1.addColorStop(1,`rgba(255,255,255,0)`)
        ctx.beginPath(); ctx.ellipse(b.x-b.r*0.25,b.y-b.r*0.28,Math.max(b.r*0.38,1),Math.max(b.r*0.22,1),-Math.PI/4,0,Math.PI*2); ctx.fillStyle=g1; ctx.fill()
        ctx.beginPath(); ctx.arc(b.x-b.r*0.35,b.y-b.r*0.4,Math.max(b.r*0.08,0.5),0,Math.PI*2)
        ctx.fillStyle=`rgba(255,255,255,${clamp(ba+0.65,0,0.95)})`; ctx.fill()
        const g2 = ctx.createRadialGradient(b.x,b.y+b.r*0.6,0,b.x,b.y+b.r*0.6,Math.max(b.r*0.4,1))
        g2.addColorStop(0,IS_DAY?`rgba(200,245,255,${clamp(ba*0.4)})`:`rgba(0,180,255,${clamp(ba*0.3)})`); g2.addColorStop(1,`rgba(255,255,255,0)`)
        ctx.beginPath(); ctx.ellipse(b.x,b.y+b.r*0.55,Math.max(b.r*0.3,1),Math.max(b.r*0.15,1),0,0,Math.PI*2); ctx.fillStyle=g2; ctx.fill()
      })
    }
    draw()
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animRef.current) }
  }, [bubbleCount, isDayMode])

  function startViz() {
    const canvas = vizCanvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    const ctx = canvas.getContext("2d")
    const data = new Uint8Array(analyser.frequencyBinCount)
    function draw() {
      vizAnimRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(data)
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.clearRect(0, 0, rect.width, rect.height)
      const barW = (rect.width / data.length) * 1.8
      let x = 0
      data.forEach(val => {
        const barH = (val/255)*rect.height*0.9
        const g = ctx.createLinearGradient(0,rect.height,0,rect.height-barH)
        g.addColorStop(0, accentColor + "ee")
        g.addColorStop(1, accentColor + "44")
        ctx.fillStyle = g
        ctx.beginPath(); ctx.roundRect(x,rect.height-barH,Math.max(barW-2,1),barH,2); ctx.fill()
        x += barW
      })
    }
    draw()
  }

  function fmt(s) {
    if (!s || isNaN(s)) return "0:00"
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`
  }

  function readMetadata(file) {
    return new Promise((resolve) => {
      if (typeof window.jsmediatags === "undefined") { resolve({title:null,artist:null,art:null}); return }
      window.jsmediatags.read(file, {
        onSuccess: (tag) => {
          const {title,artist,picture} = tag.tags
          let art = null
          if (picture) {
            const base64 = btoa(picture.data.reduce((a,b) => a+String.fromCharCode(b),""))
            art = `data:${picture.format};base64,${base64}`
          }
          resolve({title:title||null,artist:artist||null,art})
        },
        onError: () => resolve({title:null,artist:null,art:null})
      })
    })
  }

  function getDuration(file) {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.src = URL.createObjectURL(file)
      audio.addEventListener("loadedmetadata", () => { resolve(fmt(audio.duration)); URL.revokeObjectURL(audio.src) })
      audio.addEventListener("error", () => resolve("—"))
    })
  }

  async function analyseMood(file) {
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("https://aeroplay.onrender.com/analyse", {method:"POST", body:formData})
      const data = await res.json()
      return data.mood || "Chill"
    } catch { return "Chill" }
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    const newTracks = await Promise.all(files.map(async (f) => {
      const meta = await readMetadata(f)
      const dur = await getDuration(f)
      return {file:f, name:meta.title||f.name.replace(/\.[^.]+$/,""), artist:meta.artist||"Local Track", art:meta.art, url:URL.createObjectURL(f), mood:null, duration:dur}
    }))
    setTracks(prev => {
      const updated = [...prev, ...newTracks]
      if (prev.length === 0) setTimeout(() => loadTrack(0, updated), 100)
      return updated
    })
    newTracks.forEach(async (t) => {
      const mood = await analyseMood(t.file)
      setTracks(prev => { const u=[...prev]; const idx=u.findIndex(p=>p.url===t.url); if(idx!==-1) u[idx]={...u[idx],mood}; return u })
      setMoodGroups(prev => { const u={...prev}; if(!u[mood]) u[mood]=[]; if(!u[mood].find(x=>x.url===t.url)) u[mood]=[...u[mood],t]; return u })
    })
  }

  function handleBgImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setBgImage(URL.createObjectURL(file))
  }

  function initAudioCtx() {
    if (audioCtxRef.current) return
    const audio = audioRef.current
    const ctx = new (window.AudioContext||window.webkitAudioContext)()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser); analyser.connect(ctx.destination)
    audioCtxRef.current = ctx; analyserRef.current = analyser
    startViz()
  }

  function loadTrack(index, list) {
    const tl = list||tracks
    if (!tl[index]) return
    cancelAnimationFrame(vizAnimRef.current)
    const audio = audioRef.current
    audio.src = tl[index].url; audio.play()
    setIsPlaying(true); setCurrentIndex(index)
    initAudioCtx()
    if (analyserRef.current) startViz()
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio.src) return
    if (isPlaying) { audio.pause(); setIsPlaying(false); cancelAnimationFrame(vizAnimRef.current) }
    else { audio.play(); setIsPlaying(true); initAudioCtx(); startViz() }
  }

  function next() { if (tracks.length) loadTrack((currentIndex+1)%tracks.length) }
  function prev() { if (tracks.length) loadTrack((currentIndex-1+tracks.length)%tracks.length) }

  const track = tracks[currentIndex]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box !important; margin: 0; padding: 0; }
        html, body { margin:0; padding:0; width:100vw; height:100vh; background:${T.bg}; font-family:'Inter',sans-serif; overflow:hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.accent}55; border-radius: 4px; }

        .app {
          width:100vw; height:100vh; display:flex; flex-direction:column;
          position:relative; overflow:hidden; background:${bgImage ? "transparent" : T.bg};
        }

        .bg-image {
          position:absolute; inset:0; z-index:0;
          background-image: url(${bgImage});
          background-size:cover; background-position:center;
          opacity:0.55; filter:saturate(1.3);
        }

        ${IS_DAY ? `
        .app::before { content:''; position:absolute; top:-80px; right:100px; width:350px; height:350px;
          background:radial-gradient(circle,rgba(255,255,200,0.45) 0%,rgba(255,220,100,0.15) 40%,transparent 70%);
          pointer-events:none; z-index:0; }` : `
        .app::before { content:''; position:absolute; inset:0;
          background-image: radial-gradient(1px 1px at 10% 15%,white 0%,transparent 100%),radial-gradient(1px 1px at 25% 8%,white 0%,transparent 100%),radial-gradient(1.5px 1.5px at 40% 20%,white 0%,transparent 100%),radial-gradient(1px 1px at 60% 5%,white 0%,transparent 100%),radial-gradient(1px 1px at 75% 18%,white 0%,transparent 100%),radial-gradient(1px 1px at 85% 10%,white 0%,transparent 100%);
          pointer-events:none; z-index:0; }`}

        canvas.bg-canvas { position:absolute; inset:0; pointer-events:none; z-index:1; }

        .main-layout { display:flex; flex:1; width:100%; height:calc(100vh - 80px); overflow:hidden; position:relative; z-index:2; }

        .sidebar {
          width:240px; min-width:240px; max-width:240px; height:100%;
          display:flex; flex-direction:column; padding:20px 14px; gap:12px;
          background:${IS_DAY ? "linear-gradient(160deg,rgba(255,255,255,0.55) 0%,rgba(200,235,255,0.3) 40%,rgba(255,255,255,0.2) 100%)" : "linear-gradient(160deg,rgba(0,60,120,0.7) 0%,rgba(0,30,80,0.5) 50%,rgba(0,40,100,0.35) 100%)"};
          backdrop-filter:blur(40px) saturate(220%) brightness(1.1);
          -webkit-backdrop-filter:blur(40px) saturate(220%) brightness(1.1);
          border-right:1px solid ${T.glassBorder}; overflow-y:auto; z-index:5; position:relative;
          box-shadow:4px 0 24px rgba(0,0,0,0.08),1px 0 0 rgba(255,255,255,0.4) inset;
        }
        .sidebar::before { content:''; position:absolute; top:0; left:0; right:0; height:55%;
          background:linear-gradient(180deg,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0.06) 60%,transparent 100%);
          pointer-events:none; z-index:0; }
        .sidebar::after { content:''; position:absolute; top:0; left:0; width:1px; height:100%;
          background:linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.1),transparent);
          pointer-events:none; z-index:1; }

        .logo { font-size:20px; font-weight:700; color:${T.accent}; text-shadow:0 0 12px ${T.accentGlow}; padding:4px 10px 12px; letter-spacing:-0.5px; display:flex; justify-content:space-between; align-items:center; }
        .settings-btn { background:none; border:none; cursor:pointer; font-size:16px; color:${T.textSub}; transition:all 0.2s; padding:4px; border-radius:6px; }
        .settings-btn:hover { color:${T.accent}; background:${T.glass}; }

        .section-label { font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:${T.textSub}; padding:10px 10px 4px; }

        .mood-group { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:all 0.15s; }
        .mood-group:hover { background:${T.glass}; }
        .mood-group .mg-name { font-size:12px; font-weight:600; color:${T.text}; }
        .mood-group .mg-count { font-size:10px; color:${T.textSub}; }

        .upload-side {
  display: flex; 
  align-items: center; 
  justify-content: center;
  gap: 8px;
  padding: 12px; 
  border-radius: 10px;
  font-size: 13px; 
  font-weight: 600;
  color: ${T.accent}; 
  cursor: pointer;
  border: 1px dashed ${T.accent}66;
  background: ${T.accent}11;
  transition: all 0.2s; 
  position: relative;
  z-index: 20;
  box-shadow: 0 2px 8px ${T.accentGlow}22;
}
.upload-side:hover { background: ${T.accent}22; border-color: ${T.accent}99; }

        .content { flex:1; height:100%; overflow-y:auto; padding:24px 28px; display:flex; flex-direction:column; gap:18px; min-width:0; }
        .content-header { display:flex; justify-content:space-between; align-items:center; }
        .greeting { font-size:13px; font-weight:600; color:${T.textSub}; text-transform:uppercase; letter-spacing:0.05em; }
        .clock-badge { font-size:12px; font-weight:600; color:${T.textSub}; }

        .hero-card {
          display:flex; gap:20px; padding:20px; border-radius:20px; position:relative; overflow:hidden;
          background:${IS_DAY ? "linear-gradient(135deg,rgba(255,255,255,0.6) 0%,rgba(200,235,255,0.35) 50%,rgba(255,255,255,0.25) 100%)" : "linear-gradient(135deg,rgba(0,60,140,0.6) 0%,rgba(0,30,80,0.4) 50%,rgba(0,50,120,0.3) 100%)"};
          backdrop-filter:blur(32px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter:blur(32px) saturate(200%) brightness(1.05);
          border:1px solid rgba(255,255,255,0.5);
          box-shadow:0 8px 40px rgba(0,0,0,0.12),0 2px 0 rgba(255,255,255,0.6) inset,0 -1px 0 rgba(255,255,255,0.15) inset;
          width:100%;
        }
        .hero-card::before { content:''; position:absolute; top:0; left:0; right:0; height:50%;
          background:linear-gradient(180deg,rgba(255,255,255,0.35) 0%,rgba(255,255,255,0.08) 50%,transparent 100%);
          border-radius:20px 20px 60% 60%; pointer-events:none; z-index:0; }
        .hero-card::after { content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.8),transparent); pointer-events:none; }

        .hero-art { width:110px; height:110px; min-width:110px; border-radius:10px; overflow:hidden;
          background:linear-gradient(135deg,${T.accent}33,${T.highlight}22); border:1px solid ${T.glassBorder};
          display:flex; align-items:center; justify-content:center; font-size:44px; box-shadow:0 4px 16px rgba(0,0,0,0.2); }
        .hero-art img { width:100%; height:100%; object-fit:cover; }
        .hero-info { display:flex; flex-direction:column; justify-content:center; gap:5px; flex:1; min-width:0; overflow:hidden; z-index:5; }
        .hero-label { font-size:10px; font-weight:700; color:${T.textSub}; text-transform:uppercase; letter-spacing:0.1em; }
        .hero-title { font-size:18px; font-weight:700; color:${T.text}; text-shadow:0 1px 4px rgba(255,255,255,0.2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; }
        .hero-sub { font-size:12px; color:${T.textSub}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hero-btns { display:flex; align-items:center; gap:8px; margin-top:6px; }

        .btn-play-hero { width:44px; height:44px; border-radius:50%; border:1px solid rgba(255,255,255,0.5); cursor:pointer;
          background:radial-gradient(circle at 35% 30%,rgba(255,255,255,0.9) 0%,${T.accent} 30%,${T.highlight} 100%);
          color:white; font-size:17px; display:flex; align-items:center; justify-content:center;
          box-shadow:0 8px 24px ${T.accentGlow},0 2px 0 rgba(255,255,255,0.7) inset,0 -2px 6px rgba(0,0,0,0.1) inset;
          position:relative; overflow:hidden; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .btn-play-hero::before { content:''; position:absolute; top:3px; left:3px; right:3px; height:48%;
          background:linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.1)); border-radius:50% 50% 0 0; pointer-events:none; }
        .btn-play-hero:hover { transform:scale(1.1); box-shadow:0 10px 32px ${T.accentGlow},0 2px 0 rgba(255,255,255,0.8) inset; }
        .btn-play-hero:active { transform:scale(0.94); }

        .visualizer-bar { width:100%; height:48px; border-radius:10px; background:${IS_DAY ? "rgba(0,0,0,0.08)" : "rgba(0,20,50,0.3)"}; border:1px solid ${T.glassBorder}; overflow:hidden; }
        .visualizer-bar canvas { width:100%; height:100%; display:block; }

        .track-list-header { display:grid; grid-template-columns:40px 1fr 120px 80px; padding:0 12px 6px; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${T.textSub}; border-bottom:1px solid ${T.glassBorder}; width:100%; }
        .track-row { display:grid; grid-template-columns:40px 1fr 120px 80px; align-items:center; padding:8px 12px; border-radius:8px; cursor:pointer; transition:all 0.15s; width:100%; }
        .track-row:hover { background:${T.glass}; }
        .track-row.active { background:${T.accent}22; box-shadow:0 0 10px ${T.accentGlow}22; }
        .track-num { font-size:12px; color:${T.textSub}; }
        .track-num.playing { color:${T.accent}; font-weight:700; }
        .track-name { font-size:13px; font-weight:500; color:${T.text}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .track-name.active { color:${T.accent}; }
        .track-artist { font-size:11px; color:${T.textSub}; }
        .track-dur { font-size:12px; color:${T.textSub}; text-align:right; }

        .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:48px 24px; border-radius:16px; border:2px dashed ${T.glassBorder}; background:${T.glass}; backdrop-filter:blur(8px); cursor:pointer; transition:all 0.2s; width:100%; }
        .empty-state:hover { border-color:${T.accent}; box-shadow:0 0 20px ${T.accentGlow}33; }
        .empty-icon { font-size:40px; }
        .empty-title { font-size:15px; font-weight:600; color:${T.text}; }
        .empty-sub { font-size:12px; color:${T.textSub}; }

        .player-bar {
          height:80px; min-height:80px; display:flex; align-items:center; justify-content:space-between;
          padding:0 24px; gap:24px; position:relative; z-index:10;
          background:${IS_DAY ? "linear-gradient(180deg,rgba(200,240,255,0.5) 0%,rgba(255,255,255,0.35) 100%)" : "linear-gradient(180deg,rgba(0,20,60,0.7) 0%,rgba(0,10,40,0.6) 100%)"};
          backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%);
          border-top:1px solid rgba(255,255,255,0.4); width:100%; box-sizing:border-box;
          box-shadow:0 -4px 24px rgba(0,0,0,0.08),0 -1px 0 rgba(255,255,255,0.5) inset;
        }
        .player-bar::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent); pointer-events:none; }
        .player-bar::after { content:''; position:absolute; top:0; left:0; right:0; height:40%; background:linear-gradient(180deg,rgba(255,255,255,0.15),transparent); pointer-events:none; }

        .now-playing { display:flex; align-items:center; gap:10px; width:180px; min-width:0; flex-shrink:1; }
        .np-art { width:44px; height:44px; border-radius:8px; flex-shrink:0; background:linear-gradient(135deg,${T.accent}44,${T.highlight}22); border:1px solid ${T.glassBorder}; display:flex; align-items:center; justify-content:center; font-size:20px; overflow:hidden; }
        .np-art img { width:100%; height:100%; object-fit:cover; }
        .np-title-wrap { width:150px; overflow:hidden; position:relative; }
        .np-title { font-size:12px; font-weight:600; color:${T.text}; white-space:nowrap; display:inline-block; }
        .np-artist { font-size:10px; color:${T.textSub}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .player-center { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; min-width:0; }
        .player-controls { display:flex; align-items:center; gap:12px; }

        .ctrl-sm { width:30px; height:30px; border-radius:50%; border:1px solid rgba(255,255,255,0.45);
          background:${IS_DAY ? "radial-gradient(circle at 35% 30%,rgba(255,255,255,0.85),rgba(200,235,255,0.5),rgba(150,210,255,0.2))" : "radial-gradient(circle at 35% 30%,rgba(0,100,200,0.7),rgba(0,50,130,0.5),rgba(0,20,80,0.3))"};
          color:${T.textSub}; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center;
          transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 3px 10px rgba(0,0,0,0.12),0 1px 0 rgba(255,255,255,0.6) inset; position:relative; overflow:hidden; }
        .ctrl-sm::before { content:''; position:absolute; top:2px; left:2px; right:2px; height:46%; background:linear-gradient(180deg,rgba(255,255,255,0.6),transparent); border-radius:50% 50% 0 0; pointer-events:none; }
        .ctrl-sm:hover { color:${T.accent}; transform:scale(1.12); box-shadow:0 4px 14px ${T.accentGlow}88,0 1px 0 rgba(255,255,255,0.7) inset; }
        .ctrl-sm:active { transform:scale(0.9); }

        .ctrl-play { width:40px; height:40px; border-radius:50%; border:1px solid rgba(255,255,255,0.5); cursor:pointer;
          background:radial-gradient(circle at 35% 30%,rgba(255,255,255,0.9) 0%,${T.accent} 35%,${T.highlight} 100%);
          color:white; font-size:15px; display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 20px ${T.accentGlow},0 2px 4px rgba(0,0,0,0.15),0 1px 0 rgba(255,255,255,0.7) inset,0 -2px 6px rgba(0,0,0,0.1) inset;
          position:relative; overflow:hidden; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .ctrl-play::before { content:''; position:absolute; top:2px; left:2px; right:2px; height:48%; background:linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.1)); border-radius:50% 50% 0 0; pointer-events:none; }
        .ctrl-play::after { content:''; position:absolute; bottom:3px; left:6px; right:6px; height:20%; background:linear-gradient(180deg,transparent,rgba(255,255,255,0.15)); border-radius:0 0 50% 50%; pointer-events:none; }
        .ctrl-play:hover { transform:scale(1.1); box-shadow:0 8px 28px ${T.accentGlow},0 2px 0 rgba(255,255,255,0.8) inset; }
        .ctrl-play:active { transform:scale(0.93); }

        .progress-row { display:flex; align-items:center; gap:8px; width:100%; max-width:480px; }
        .time-lbl { font-size:10px; color:${T.textSub}; min-width:30px; }
        .time-lbl.r { text-align:right; }
        .prog-track { flex:1; height:4px; border-radius:2px; background:${T.glass}; border:1px solid ${T.glassBorder}; cursor:pointer; overflow:hidden; }
        .prog-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,${T.accent},${T.highlight}); box-shadow:0 0 6px ${T.accentGlow}; transition:width 0.1s linear; }

        .player-right { min-width:120px; width:120px; display:flex; align-items:center; justify-content:flex-end; gap:8px; }

        input[type=range] { -webkit-appearance:none; height:4px; border-radius:2px; background:${T.glass}; border:1px solid ${T.glassBorder}; outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:${T.accent}; box-shadow:0 0 6px ${T.accentGlow}; cursor:pointer; }

        /* SETTINGS PANEL */
        .settings-overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.3); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; }
        .settings-panel {
          width:340px; border-radius:24px; padding:28px;
          background:${IS_DAY ? "linear-gradient(160deg,rgba(255,255,255,0.85),rgba(200,235,255,0.7))" : "linear-gradient(160deg,rgba(0,30,80,0.9),rgba(0,20,60,0.85))"};
          backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%);
          border:1px solid rgba(255,255,255,0.5);
          box-shadow:0 24px 60px rgba(0,0,0,0.3),0 2px 0 rgba(255,255,255,0.5) inset;
          display:flex; flex-direction:column; gap:20px;
          position:relative; overflow:hidden;
        }
        .settings-panel::before { content:''; position:absolute; top:0; left:0; right:0; height:50%;
          background:linear-gradient(180deg,rgba(255,255,255,0.3),transparent); border-radius:24px 24px 60% 60%; pointer-events:none; }
        .settings-title { font-size:18px; font-weight:700; color:${T.text}; display:flex; justify-content:space-between; align-items:center; z-index:1; }
        .settings-close { background:none; border:none; cursor:pointer; font-size:18px; color:${T.textSub}; transition:all 0.2s; }
        .settings-close:hover { color:${T.accent}; transform:scale(1.1); }
        .settings-row { display:flex; flex-direction:column; gap:8px; z-index:1; }
        .settings-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:${T.textSub}; }
        .settings-desc { font-size:11px; color:${T.textSub}; margin-top:-4px; }

        .toggle-row { display:flex; align-items:center; justify-content:space-between; }
        .toggle { position:relative; width:44px; height:24px; }
        .toggle input { opacity:0; width:0; height:0; }
        .toggle-slider { position:absolute; inset:0; border-radius:24px; cursor:pointer; transition:all 0.3s;
          background:${IS_DAY ? T.accent : "rgba(255,255,255,0.2)"}; border:1px solid rgba(255,255,255,0.4); }
        .toggle-slider::before { content:''; position:absolute; height:18px; width:18px; left:3px; bottom:2px;
          background:white; border-radius:50%; transition:all 0.3s;
          box-shadow:0 2px 4px rgba(0,0,0,0.2),0 1px 0 rgba(255,255,255,0.5) inset;
          transform:${isDayMode ? "translateX(20px)" : "translateX(0)"}; }

        .color-swatches { display:flex; gap:8px; flex-wrap:wrap; }
        .swatch { width:28px; height:28px; border-radius:50%; cursor:pointer; border:2px solid transparent;
          transition:all 0.2s; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
        .swatch:hover { transform:scale(1.15); }
        .swatch.active { border-color:white; box-shadow:0 0 0 2px rgba(0,0,0,0.3),0 2px 8px rgba(0,0,0,0.2); }

        .bg-upload-btn { display:flex; align-items:center; justify-content:center; gap:8px; padding:10px;
          border-radius:10px; cursor:pointer; font-size:12px; font-weight:600; color:${T.accent};
          border:1px dashed ${T.accent}66; background:${T.accent}11; transition:all 0.2s; }
        .bg-upload-btn:hover { background:${T.accent}22; }

        .settings-slider { width:100%; accent-color:${T.accent}; }
      `}</style>

      <audio ref={audioRef}
        onTimeUpdate={() => {
          const a = audioRef.current
          if (!a||!a.duration) return
          setProgress((a.currentTime/a.duration)*100)
          setCurrentTime(fmt(a.currentTime))
          setDuration(fmt(a.duration))
        }}
        onEnded={next}
      />

      <div className="app">
        {bgImage && <div className="bg-image"/>}
        <canvas ref={canvasRef} className="bg-canvas"/>

        <div className="main-layout">
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="logo">
              <span>{IS_DAY ? "🌿" : "🌙"} AeroPlay</span>
              <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
            </div>

            <label className="upload-side">
              <span>+</span> Add Music
              <input type="file" accept=".mp3,.wav,.ogg" multiple hidden onChange={handleFiles}/>
            </label>

            {tracks.length > 0 && (
              <>
                <div className="section-label">Your Music</div>
                <div className="mood-group"
                  onClick={() => setSelectedMood(null)}
                  style={{background:selectedMood===null?`${T.accent}22`:undefined, border:selectedMood===null?`1px solid ${T.accent}44`:"1px solid transparent", borderRadius:8}}>
                  <span style={{fontSize:18}}>🎵</span>
                  <div>
                    <div className="mg-name">All Tracks</div>
                    <div className="mg-count">{tracks.length} song{tracks.length>1?"s":""}</div>
                  </div>
                </div>
              </>
            )}

            {Object.keys(moodGroups).length > 0 && (
              <>
                <div className="section-label">By Mood</div>
                {Object.entries(moodGroups).map(([mood, list]) => (
                  <div key={mood} className="mood-group"
                    onClick={() => setSelectedMood(selectedMood===mood?null:mood)}
                    style={{background:selectedMood===mood?`${T.accent}22`:undefined, border:selectedMood===mood?`1px solid ${T.accent}44`:"1px solid transparent", borderRadius:8}}>
                    <span style={{fontSize:18}}>{mood==="Energetic"?"⚡":mood==="Happy"?"😊":mood==="Melancholic"?"🌧️":mood==="Focused"?"🎯":"🌊"}</span>
                    <div>
                      <div className="mg-name">{mood}</div>
                      <div className="mg-count">{list.length} song{list.length>1?"s":""}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* MAIN CONTENT */}
          <div className="content">
            <div className="content-header">
              <span className="greeting">{IS_DAY ? "☀️ Good day" : "🌙 Good evening"}</span>
              <span className="clock-badge">{time}</span>
            </div>

            {selectedMood && (
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <span style={{fontSize:13, fontWeight:600, color:T.accent}}>
                  {selectedMood==="Energetic"?"⚡":selectedMood==="Happy"?"😊":selectedMood==="Melancholic"?"🌧️":selectedMood==="Focused"?"🎯":"🌊"} {selectedMood} playlist
                </span>
                <span onClick={() => setSelectedMood(null)} style={{fontSize:11, color:T.textSub, cursor:"pointer", textDecoration:"underline"}}>Clear</span>
              </div>
            )}

            <div className="hero-card">
              <div className="hero-art">
                {track?.art ? <img src={track.art} alt="album art"/> : IS_DAY ? "🌿" : "🌙"}
              </div>
              <div className="hero-info">
                <span className="hero-label">{track?(track.mood||"Now Playing"):"Welcome to AeroPlay"}</span>
                <h1 className="hero-title">{track?.name||"Add your music"}</h1>
                <span className="hero-sub">{track?.artist||(tracks.length>0?`${tracks.length} tracks loaded`:"Upload MP3s to get started")}</span>
                {tracks.length > 0 && (
                  <div className="hero-btns">
                    <button className="btn-play-hero" onClick={togglePlay}>{isPlaying?"⏸":"▶"}</button>
                  </div>
                )}
              </div>
            </div>

            <div className="visualizer-bar" style={{display:isPlaying?"block":"none"}}>
              <canvas ref={vizCanvasRef}/>
            </div>

            {tracks.length === 0 ? (
              <label className="empty-state">
                <span className="empty-icon">{IS_DAY?"🌿":"🌙"}</span>
                <span className="empty-title">Drop your music here</span>
                <span className="empty-sub">Supports MP3, WAV, OGG</span>
                <input type="file" accept=".mp3,.wav,.ogg" multiple hidden onChange={handleFiles}/>
              </label>
            ) : (
              <div>
                <div className="track-list-header">
                  <span>#</span><span>Title</span><span>Playlist</span><span style={{textAlign:"right"}}>Duration</span>
                </div>
                {(selectedMood?tracks.filter(t=>t.mood===selectedMood):tracks).map((t,i) => (
                  <div key={i} className={`track-row ${i===currentIndex?"active":""}`} onClick={() => loadTrack(i)}>
                    <span className={`track-num ${i===currentIndex&&isPlaying?"playing":""}`}>{i===currentIndex&&isPlaying?"▶":i+1}</span>
                    <div style={{minWidth:0}}>
                      <div className={`track-name ${i===currentIndex?"active":""}`}>{t.name}</div>
                      <div className="track-artist">{t.artist}</div>
                    </div>
                    <span className="track-dur" style={{fontSize:11,textAlign:"left",paddingLeft:8}}>{t.mood||"—"}</span>
                    <span className="track-dur">{t.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PLAYER BAR */}
        <div className="player-bar">
          <div className="now-playing">
            <div className="np-art">{track?.art?<img src={track.art} alt="art"/>:IS_DAY?"🌿":"🌙"}</div>
            <div className="np-title-wrap">
              <div className="np-title">{track?.name||"No track selected"}</div>
              <div className="np-artist">{track?.artist||"AeroPlay"}</div>
            </div>
          </div>
          <div className="player-center">
            <div className="player-controls">
              <button className="ctrl-sm" onClick={prev}>⏮</button>
              <button className="ctrl-play" onClick={togglePlay}>{isPlaying?"⏸":"▶"}</button>
              <button className="ctrl-sm" onClick={next}>⏭</button>
            </div>
            <div className="progress-row">
              <span className="time-lbl">{currentTime}</span>
              <div className="prog-track" onClick={e => {
                const audio = audioRef.current
                if (!audio||!audio.duration) return
                const rect = e.currentTarget.getBoundingClientRect()
                audio.currentTime = ((e.clientX-rect.left)/rect.width)*audio.duration
              }}>
                <div className="prog-fill" style={{width:`${progress}%`}}/>
              </div>
              <span className="time-lbl r">{duration}</span>
            </div>
          </div>
          <div className="player-right">
  <span style={{fontSize:13, color:T.textSub}}>🔊</span>
  <input type="range" min="0" max="100" value={volume}
              onChange={e => { const v=Number(e.target.value); setVolume(v); if(audioRef.current) audioRef.current.volume=v/100 }}
              style={{width:70, accentColor:T.accent, cursor:"pointer"}}
            />
            <span className="theme-pill" onClick={() => setIsDayMode(!isDayMode)} style={{cursor:"pointer"}}>
    {isDayMode ? "☀️ Day" : "🌙 Night"}
  </span>
          </div>
        </div>

        {/* SETTINGS PANEL */}
        {showSettings && (
          <div className="settings-overlay" onClick={e => { if(e.target===e.currentTarget) setShowSettings(false) }}>
            <div className="settings-panel">
              <div className="settings-title">
                <span>⚙️ Settings</span>
                <button className="settings-close" onClick={() => setShowSettings(false)}>✕</button>
              </div>

              {/* Day / Night Toggle */}
              <div className="settings-row">
                <div className="toggle-row">
                  <div>
                    <div className="settings-label">Theme</div>
                    <div className="settings-desc">{isDayMode ? "☀️ Aero Day" : "🌙 Gloss Night"}</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={isDayMode} onChange={e => setIsDayMode(e.target.checked)}/>
                    <span className="toggle-slider"/>
                  </label>
                </div>
              </div>

              {/* Accent Color */}
              <div className="settings-row">
                <div className="settings-label">Accent Color</div>
                <div className="color-swatches">
                  {["#00cc44","#00ffaa","#00aaff","#ff6b6b","#ffaa00","#cc44ff","#ff44aa","#ffffff"].map(color => (
                    <div key={color} className={`swatch ${accentColor===color?"active":""}`}
                      style={{background:color}}
                      onClick={() => setAccentColor(color)}/>
                  ))}
                </div>
              </div>

              {/* Bubble Count */}
              <div className="settings-row">
                <div className="settings-label">Bubbles — {bubbleCount}</div>
                <input type="range" className="settings-slider" min="0" max="50" value={bubbleCount}
                  onChange={e => setBubbleCount(Number(e.target.value))}/>
              </div>

              {/* Background Image */}
              <div className="settings-row">
                <div className="settings-label">Background</div>
                <div className="settings-desc">Upload a Frutiger Aero wallpaper</div>
                <label className="bg-upload-btn">
                  🖼 {bgImage ? "Change wallpaper" : "Upload wallpaper"}
                  <input type="file" accept="image/*" hidden onChange={handleBgImage}/>
                </label>
                {bgImage && (
                  <button onClick={() => setBgImage(null)}
                    style={{marginTop:4, background:"none", border:"none", cursor:"pointer", fontSize:11, color:T.textSub, textDecoration:"underline"}}>
                    Remove wallpaper
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}