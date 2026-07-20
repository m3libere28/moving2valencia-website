import React, { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// --- Web Audio Engine Singleton ---
let audioCtx = null;
let masterGain = null;
let droneOsc = null;
let lfo = null;

let isAudioOn = false;

const toggleAudioEngine = (enable) => {
  isAudioOn = enable;
  if (enable) {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioCtx.destination);

      droneOsc = audioCtx.createOscillator();
      lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      
      droneOsc.type = 'sawtooth';
      droneOsc.frequency.value = 50; // Deep ominous tone
      
      lfo.type = 'sine';
      lfo.frequency.value = 0.15; 
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain);
      lfoGain.connect(droneOsc.detune);
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;

      droneOsc.connect(filter);
      filter.connect(masterGain);
      
      droneOsc.start();
      lfo.start();
    } else if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } else {
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
  }
}

const playUIHover = () => {
  if (isAudioOn && audioCtx) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 200, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }
}

const dialHotline = () => {
  if (!isAudioOn || !audioCtx) return;
  const frequencies = [ [697, 1209], [770, 1336], [852, 1209], [941, 1477] ];
  let time = audioCtx.currentTime;
  
  for(let i=0; i<7; i++) {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    const freqs = frequencies[Math.floor(Math.random()*frequencies.length)];
    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];
    
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.setValueAtTime(0, time + 0.1);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);
    
    osc1.start(time); osc2.start(time);
    osc1.stop(time + 0.1); osc2.stop(time + 0.1);
    
    time += 0.15; 
  }
}

// --- 1. Custom Cursor Component ---
const CustomCursor = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hovered, setHovered] = useState(false)
  const isFinePointer = window.matchMedia('(pointer: fine)').matches

  useEffect(() => {
    if (!isFinePointer) return;
    const moveCursor = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
      const isInteractive = e.target.closest('a, button, .interactive, .episode-card') !== null;
      setHovered(isInteractive);
    }
    window.addEventListener('mousemove', moveCursor)
    return () => window.removeEventListener('mousemove', moveCursor)
  }, [isFinePointer])

  if (!isFinePointer) return null;
  return (
    <div className={`custom-cursor ${hovered ? 'expanded' : ''}`} style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      <span className="cursor-text">{hovered ? '[ EXPLORE ]' : ''}</span>
    </div>
  )
}

// --- 2. Ambient Particles (Canvas) ---
const AmbientParticles = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const particles = []
    for(let i=0; i<150; i++) {
      particles.push({
        x: Math.random() * width, y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1
      })
    }

    let mouse = { x: -1000, y: -1000 }
    const handleMouse = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    window.addEventListener('mousemove', handleMouse)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    let animationId
    const render = () => {
      ctx.clearRect(0,0,width,height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

        const dx = mouse.x - p.x; const dy = mouse.y - p.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        if (dist < 100) { p.x -= (dx / dist) * 2; p.y -= (dy / dist) * 2; }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`; ctx.fill()
      })
      animationId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  return <canvas ref={canvasRef} className="ambient-particles-canvas" aria-hidden="true" />
}

// --- 3. Scramble Text Component ---
const ScrambleText = ({ text, className, style }) => {
  const [displayText, setDisplayText] = useState(text)
  const textRef = useRef(null)
  const chars = '!<>-_\\/[]{}—=+*^?#________'

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: textRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          let iteration = 0;
          const interval = setInterval(() => {
            setDisplayText(prev => 
              text.split("").map((letter, index) => {
                if(index < iteration) return text[index];
                return chars[Math.floor(Math.random() * chars.length)]
              }).join("")
            );
            if(iteration >= text.length) clearInterval(interval);
            iteration += 1 / 3; 
          }, 30);
        }
      })
    })
    return () => ctx.revert()
  }, [text])
  return <span ref={textRef} className={className} style={style}>{displayText}</span>
}

// --- Scratch-off Canvas Evidence ---
const ScratchEvidenceCanvas = ({ imgSrc, alt }) => {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const rect = canvas.parentElement.getBoundingClientRect()
    canvas.width = rect.width; canvas.height = rect.height

    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#1a1c23'
    for(let i=0; i<canvas.width; i+=4) ctx.fillRect(i, 0, 1, canvas.height)

    ctx.font = '24px "VT323", monospace'; ctx.fillStyle = '#d90e0e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('TOP SECRET DECRYPT [SCRUB FILE TO REVEAL]', canvas.width/2, canvas.height/2)

    let isDrawing = false;
    const scratch = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left; const y = clientY - rect.top
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2, false); ctx.fill()
    }

    const handleDown = (e) => { isDrawing = true; scratch(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY) }
    const handleUp = () => { isDrawing = false }
    const handleMove = (e) => { if (isDrawing) scratch(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY) }

    canvas.addEventListener('mousedown', handleDown); canvas.addEventListener('mousemove', handleMove); canvas.addEventListener('mouseup', handleUp); canvas.addEventListener('mouseleave', handleUp);
    canvas.addEventListener('touchstart', handleDown); canvas.addEventListener('touchmove', handleMove); canvas.addEventListener('touchend', handleUp);

    return () => {
      canvas.removeEventListener('mousedown', handleDown); canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('mouseup', handleUp); canvas.removeEventListener('mouseleave', handleUp);
      canvas.removeEventListener('touchstart', handleDown); canvas.removeEventListener('touchmove', handleMove); canvas.removeEventListener('touchend', handleUp);
    }
  }, [])
  return (
    <div className="scratch-container interactive" onMouseEnter={playUIHover}>
      <img src={imgSrc} alt={alt} style={{ width: '100%', display: 'block' }} />
      <canvas ref={canvasRef} className="scratch-canvas" aria-label="Interactive scratch-off overlay covering evidence" />
    </div>
  )
}

// --- Navbar with Audio State ---
const NavBar = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleToggle = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    toggleAudioEngine(newState);
  }

  return (
    <nav className="main-nav" aria-label="Main Navigation">
      <div className="nav-inner">
        <div className="red-mono" style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>THE ARCHIVE</div>
        <div className="nav-links">
          <a href="#hero" className="nav-link" onMouseEnter={playUIHover}>Home</a>
          <a href="#featured" className="nav-link" onMouseEnter={playUIHover}>Featured</a>
          <a href="#vault" className="nav-link" onMouseEnter={playUIHover}>Vault</a>
          <a href="#timeline" className="nav-link" onMouseEnter={playUIHover}>Chronology</a>
          <button className="audio-toggle-btn interactive" onClick={handleToggle} onMouseEnter={playUIHover}>
            AUDIO: {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </nav>
  )
}

const HeroSection = () => {
  const bgRef = useRef(null)
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        scrollTrigger: { trigger: '.hero-container', start: 'top top', end: 'bottom top', scrub: true },
        scale: 1.15, y: 100, opacity: 0
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <header className="hero-container" id="hero">
      <div className="hero-bg" ref={bgRef} aria-label="Robert Stack standing in front of a dark cinematic sky with a UFO" />
      <div className="hero-gradient" />
      <div className="hero-content">
        <div style={{ textAlign: 'left', maxWidth: '600px' }}>
          <h1 style={{ fontSize: 'clamp(3rem, 8vw, 8rem)', letterSpacing: '0.15em', margin: 0, lineHeight: 0.9, textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
            <ScrambleText text="UNSOLVED" />
          </h1>
          <div className="mono" style={{ marginTop: '30px', fontSize: '1.2rem', color: 'var(--vhs-amber)', letterSpacing: '0.1em' }}>
            <ScrambleText text="[ FOR EVERY MYSTERY, THERE IS SOMEONE," />
            <br />
            <ScrambleText text="SOMEWHERE, WHO KNOWS THE TRUTH. ]" />
          </div>
        </div>
      </div>
    </header>
  )
}

const FeaturedCase = () => (
  <section className="section" id="featured" aria-labelledby="featured-title">
    <div className="inner">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="red-mono" style={{ marginBottom: '15px' }}>FEATURED CLASSIFIED FILE</div>
        <h2 id="featured-title" style={{ fontSize: '3rem', marginBottom: '30px' }}>
          <ScrambleText text="The Kecksburg Incident" />
        </h2>
        <ScratchEvidenceCanvas imgSrc="/assets/episode_ufo.png" alt="A glowing saucer hovering in a dense forest at night illuminating the trees" />
        <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
          In 1965, a massive fireball was seen streaking across the sky before allegedly crashing into the woods. The military cordoned off the area immediately, preventing civilians from entering the impact zone.
        </p>
      </div>
    </div>
  </section>
)

const episodeData = [
  { id: 'S01E03', year: 1987, topic: 'THE PARANORMAL', title: 'The Ghost of Queen Mary', image: '/assets/episode_ghost.png', synopsis: 'Poltergeist activity and terrifying apparitions haunt a permanently docked ocean liner.' },
  { id: 'S03E09', year: 1991, topic: 'UNEXPLAINED', title: 'Route 47 Vanishing', image: '/assets/episode_missing.png', synopsis: 'A family pulls over in the fog to check their engine. Minutes later, they are gone.', hasUpdate: true, updateText: 'DECLASIFIED LOG: Ground penetrating radar discovered an anomalous metallic object buried 40 feet beneath the highway.' },
  { id: 'S08E01', year: 1996, topic: 'EXTRATERRESTRIAL', title: 'The Phoenix Lights', image: '/assets/episode_ufo.png', synopsis: 'Thousands of residents witness a massive V-shaped formation of lights gliding silently over the city.' },
  { id: 'S03E04', year: 1990, topic: 'THE PARANORMAL', title: 'The Myrtles Plantation', image: '/assets/episode_ghost.png', synopsis: 'Photographs capture what appears to be spirits haunting a home.' }
];

const EpisodeCard = ({ ep }) => {
  const [showUpdate, setShowUpdate] = useState(false);

  return (
    <article 
      className="episode-card interactive" tabIndex="0" 
      onMouseEnter={playUIHover} 
      onClick={() => ep.hasUpdate && setShowUpdate(!showUpdate)}
      style={{ cursor: ep.hasUpdate ? 'pointer' : 'default' }}
    >
      {ep.hasUpdate && !showUpdate && <div className="update-badge">UPDATE</div>}
      <div className="episode-image-wrapper">
        <img src={ep.image} alt={`Screenshot of ${ep.title}`} className="episode-image" />
      </div>
      <div className="episode-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--brand-red)' }}>{ep.id}</div>
          <div className="mono" style={{ fontSize: '0.9rem' }}>{ep.year}</div>
        </header>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{ep.title}</h3>
        <p style={{ fontSize: '1rem', color: '#ccc' }}>{ep.synopsis}</p>

        {showUpdate && ep.hasUpdate && (
          <div className="update-content">
            <span style={{ color: 'var(--brand-red)' }}>NEW DEVELOPMENT:</span><br/>
            {ep.updateText}
          </div>
        )}
      </div>
    </article>
  )
}

const EpisodeVault = () => (
  <section className="section" id="vault" aria-labelledby="vault-title" style={{ background: 'var(--panel)', paddingBottom: '120px' }}>
    <div className="inner">
      <h2 id="vault-title" style={{ fontSize: '3rem', marginBottom: '40px' }}><ScrambleText text="Video Evidence Vault" /></h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
        {episodeData.map((ep, i) => <EpisodeCard key={i} ep={ep} />)}
      </div>
    </div>
  </section>
)

const HorizontalTimeline = () => {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    const ctx = gsap.context(() => {
      const scrollAmount = containerRef.current.scrollWidth - wrapperRef.current.offsetWidth;
      gsap.to(containerRef.current, {
        x: -scrollAmount, ease: "none",
        scrollTrigger: { trigger: wrapperRef.current, start: "top top", end: `+=${scrollAmount}`, pin: true, scrub: 1, invalidateOnRefresh: true }
      });
    }, wrapperRef);
    return () => ctx.revert();
  }, []);

  const timelineEvents = [
    { time: "DEC 26, 1980 - 03:00", title: "First Radar Anomalies", desc: "Military radar detects unexplained bogies dropping into the atmosphere." },
    { time: "DEC 26, 1980 - 03:20", title: "Visual Confirmation", desc: "Patrol reports a glowing metallic craft in the forest." },
    { time: "DEC 27, 1980 - 01:00", title: "Radiation Spikes", desc: "Indentations found on the ground emit massive radiation markers." },
    { time: "DEC 28, 1980 - 04:00", title: "The Binary Transmission", desc: "An officer touches the hull and receives a binary code download in his mind." }
  ];

  return (
    <section className="timeline-wrapper" ref={wrapperRef} id="timeline" aria-labelledby="timeline-title">
      <div className="inner" style={{ paddingTop: '80px', paddingBottom: '20px' }}>
        <h2 id="timeline-title" style={{ fontSize: '3rem' }}><ScrambleText text="Chronological Evidence Log" /></h2>
        <p className="mono" style={{ color: 'var(--brand-red)' }}>[ SCROLL TO PAN TIMELINE ]</p>
      </div>

      <div className="timeline-container interactive" ref={containerRef} onMouseEnter={playUIHover}>
        {timelineEvents.map((evt, i) => (
          <article key={i} className="timeline-item">
            <div className="timeline-marker" aria-hidden="true" />
            <time className="mono" style={{ fontSize: '1.2rem', color: 'var(--vhs-amber)' }}>{evt.time}</time>
            <h3 style={{ fontSize: '2rem', marginTop: '10px' }}>{evt.title}</h3>
            <p style={{ fontSize: '1.2rem', color: '#ccc', marginTop: '10px' }}>{evt.desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const SubmitEvidenceForm = () => {
  const [formState, setFormState] = useState('idle');
  const [formData, setFormData] = useState({ name: '', details: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.details.trim()) return setFormState('error');
    setFormState('success');
  }

  return (
    <section className="section" id="submit" aria-labelledby="form-title">
      <div className="inner" style={{ maxWidth: '600px' }}>
        <h2 id="form-title" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Submit Your Evidence</h2>
        <p style={{ marginBottom: '40px' }}>Have you experienced the unexplained? Submit your sighting to our secure, encrypted database below.</p>
        
        {formState === 'success' ? (
          <div style={{ padding: '30px', border: '1px solid var(--vhs-amber)', background: 'rgba(232, 176, 37, 0.1)' }}>
            <h3 style={{ color: 'var(--vhs-amber)', marginBottom: '10px' }}>Transmission Successful</h3>
            <p>Thank you for your submission. Our investigators will review your evidence shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {formState === 'error' && (
              <div role="alert" style={{ color: 'var(--brand-red)', padding: '15px', border: '1px solid var(--brand-red)', marginBottom: '20px' }}>
                <strong>Error:</strong> Please fill out all required fields before submitting.
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name or Alias (Required)</label>
              <input type="text" id="name" className="form-input" 
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                onKeyDown={playUIHover} aria-required="true" />
            </div>

            <div className="form-group">
              <label htmlFor="details" className="form-label">Sighting Details (Required)</label>
              <textarea id="details" className="form-input" rows="6"
                value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})}
                onKeyDown={playUIHover} aria-required="true" />
            </div>

            <button type="submit" className="btn-primary interactive" style={{ width: '100%' }} onMouseEnter={playUIHover}>
              Submit Evidence
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

const HotlineFooter = () => (
  <footer className="hotline-footer" aria-labelledby="hotline-title">
    <div className="red-mono" style={{ fontSize: '1.2rem', marginBottom: '20px' }}>END OF TRANSMISSION</div>
    <h2 id="hotline-title" style={{ fontSize: '1.5rem', fontFamily: 'var(--sans)', fontWeight: 'normal' }}>
      Do you have information regarding any of these cases?
    </h2>
    <div 
      className="hotline-number interactive" 
      onClick={dialHotline}
      onMouseEnter={playUIHover}
      role="button"
      tabIndex="0"
    >
      1-800-876-5353
    </div>
    <div style={{ color: '#aaa', fontSize: '0.95rem' }}>You do not have to reveal your identity.</div>
  </footer>
)

function App() {
  return (
    <>
      <AmbientParticles />
      <CustomCursor />
      
      <NavBar />
      
      <main>
        <HeroSection />
        <FeaturedCase />
        <EpisodeVault />
        <HorizontalTimeline />
        <SubmitEvidenceForm />
      </main>

      <HotlineFooter />
    </>
  )
}

export default App
