// cspell:ignore mult
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Header() {
  const navigate = useNavigate()

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="#" className="text-3xl font-bold text-rose-500">MotionLearn</a>
  
        </div>
        <button
          onClick={() => navigate('/login')}
          className="bg-rose-500 text-white px-6 py-2 rounded-full hover:bg-rose-600 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
        >
          Sign In
        </button>
      </nav>
    </header>
  )
}

function Hero() {
  const containerRef = useRef(null)
  const bgRef = useRef(null)
  const [p5Loaded, setP5Loaded] = useState(false)

  // Check if p5.js is loaded
  useEffect(() => {
    const checkP5 = () => {
      if (window.p5) {
        setP5Loaded(true)
      } else {
        setTimeout(checkP5, 100)
      }
    }
    checkP5()
  }, [])

  // Foreground wobble text + click burst
  useEffect(() => {
    if (!p5Loaded || !window.p5 || !containerRef.current) { return }

    const sketch = (p) => {
      class Particle {
        constructor(x, y) {
          this.pos = p.createVector(x, y)
          this.vel = window.p5.Vector.random2D().mult(p.random(2, 6))
          this.lifespan = 255
        }
        isFinished() { return this.lifespan < 0 }
        update() {
          this.pos.add(this.vel)
          this.vel.mult(0.96)
          this.lifespan -= 3
        }
      }

      class CircleParticle extends Particle {
        constructor(x, y) {
          super(x, y)
          this.size = p.random(5, 12)
        }
        show() {
          p.noFill()
          p.strokeWeight(3)
          p.stroke(0, this.lifespan)
          p.ellipse(this.pos.x, this.pos.y, this.size * 2)
        }
      }

      class LineParticle extends Particle {
        show() {
          p.strokeWeight(3)
          p.stroke(0, this.lifespan)
          p.line(this.pos.x, this.pos.y, this.pos.x - this.vel.x * 15, this.pos.y - this.vel.y * 15)
        }
      }

      class WobblyText {
        constructor(str, x, y) {
          this.str = str
          this.target = p.createVector(x, y)
          this.pos = p.createVector(x, y)
          this.vel = p.createVector(0, 0)
          this.acc = p.createVector(0, 0)
          this.repelRadius = 200
          this.repelStrength = 3
          this.springStiffness = 0.04
          this.damping = 0.8
        }
        applyForce(force) { this.acc.add(force) }
        update() {
          const mouseVec = p.createVector(p.mouseX, p.mouseY)
          const repelVec = window.p5.Vector.sub(this.pos, mouseVec)
          const distance = repelVec.mag()
          if (distance < this.repelRadius) {
            const repelForce = repelVec.copy()
            const strength = p.map(distance, 0, this.repelRadius, this.repelStrength, 0)
            repelForce.setMag(strength)
            this.applyForce(repelForce)
          }
          const springVec = window.p5.Vector.sub(this.target, this.pos)
          const springForce = springVec.mult(this.springStiffness)
          this.applyForce(springForce)
          this.vel.add(this.acc)
          this.vel.mult(this.damping)
          this.pos.add(this.vel)
          this.acc.mult(0)
        }
        show() {
          p.strokeWeight(6)
          p.stroke(0)
          p.fill(255)
          p.text(this.str, this.pos.x, this.pos.y)
        }
      }

      let particles = []
      let wobblyTexts = []

      const getSize = () => {
        const el = containerRef.current
        const w = el ? el.clientWidth : p.windowWidth / 2
        const h = el ? el.clientHeight : Math.max(480, p.windowHeight * 0.8)
        return { w, h }
      }

      p.setup = () => {
        const { w, h } = getSize()
        const cnv = p.createCanvas(w, h)
        cnv.parent(containerRef.current)
        cnv.mousePressed(() => {
          for (let i = 0; i < 60; i++) {
            if (p.random(1) > 0.4) {
              particles.push(new LineParticle(p.mouseX, p.mouseY))
            } else {
              particles.push(new CircleParticle(p.mouseX, p.mouseY))
            }
          }
        })
        if (cnv.addClass) { cnv.addClass('mix-blend-multiply') }
        else { cnv.elt && (cnv.elt.style.mixBlendMode = 'multiply') }
        p.frameRate(48)
        p.textFont('Oswald')
        const base = Math.min(w, h)
        const tSize = Math.max(36, Math.min(96, base * 0.12))
        p.textSize(tSize)
        p.textAlign(p.CENTER, p.CENTER)
        p.strokeJoin(p.ROUND)
        const cx = w / 2
        const cy = h / 2
        wobblyTexts.push(new WobblyText('MOVES', cx, cy - 85))
        wobblyTexts.push(new WobblyText('CLICK', cx, cy))
        wobblyTexts.push(new WobblyText('DO IT AGAIN', cx, cy + 85))
      }

      p.draw = () => {
        p.clear()
        for (const wt of wobblyTexts) { wt.update(); wt.show() }
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].update()
          particles[i].show()
          if (particles[i].isFinished()) { particles.splice(i, 1) }
        }
      }

      p.mousePressed = () => {
        for (let i = 0; i < 60; i++) {
          if (p.random(1) > 0.4) {
            particles.push(new LineParticle(p.mouseX, p.mouseY))
          } else {
            particles.push(new CircleParticle(p.mouseX, p.mouseY))
          }
        }
      }

      p.windowResized = () => {
        const { w, h } = getSize()
        p.resizeCanvas(w, h)
        const base = Math.min(w, h)
        const tSize = Math.max(48, Math.min(120, base * 0.15))
        p.textSize(tSize)
        const cx = w / 2
        const cy = h / 2
        wobblyTexts = []
        wobblyTexts.push(new WobblyText('MOVES', cx, cy - 85))
        wobblyTexts.push(new WobblyText('CLICK', cx, cy))
        wobblyTexts.push(new WobblyText('DO IT AGAIN', cx, cy + 85))
      }
    }

    const instance = new window.p5(sketch)
    const el = containerRef.current
    let ro
    if ('ResizeObserver' in window && el) {
      ro = new ResizeObserver(() => { instance && instance.windowResized() })
      ro.observe(el)
    }
    return () => { ro && ro.disconnect(); instance.remove() }
  }, [p5Loaded])

  // Background particle network
  useEffect(() => {
    if (!p5Loaded || !window.p5 || !bgRef.current) { return }

    const sketch = (p) => {
      class NetworkParticle {
        constructor(x, y) {
          this.pos = p.createVector(x, y)
          this.vel = window.p5.Vector.random2D().mult(0.05)
          this.acc = p.createVector(0, 0)
          this.size = p.random(1.5, 3.5)
          this.maxSpeed = 1.2
          this.maxForce = 0.2
        }
        applyForce(force) { this.acc.add(force) }
        repel(target) {
          const force = window.p5.Vector.sub(this.pos, target)
          const distance = force.mag()
          const repelRadius = 200
          if (distance < repelRadius) {
            const strength = p.map(distance, 0, repelRadius, 1, 0)
            force.setMag(this.maxSpeed * strength)
            force.limit(this.maxForce)
            this.applyForce(force)
          }
        }
        edges() {
          if (this.pos.x > p.width) { this.pos.x = 0 }
          if (this.pos.x < 0) { this.pos.x = p.width }
          if (this.pos.y > p.height) { this.pos.y = 0 }
          if (this.pos.y < 0) { this.pos.y = p.height }
        }
        update() {
          this.vel.add(this.acc)
          this.vel.limit(this.maxSpeed)
          this.pos.add(this.vel)
          this.acc.mult(0)
        }
        draw() {
          p.noStroke()
          p.fill(0, 200)
          p.ellipse(this.pos.x, this.pos.y, this.size)
        }
      }

      let particles = []

      const size = () => {
        const el = bgRef.current
        return { w: el ? el.clientWidth : p.windowWidth, h: el ? el.clientHeight : p.windowHeight }
      }

      const build = (w, h) => {
        particles = []
        const count = Math.floor((w * h) / 15000)
        for (let i = 0; i < count; i++) { particles.push(new NetworkParticle(p.random(w), p.random(h))) }
      }

      p.setup = () => {
        const { w, h } = size()
        const cnv = p.createCanvas(w, h)
        cnv.parent(bgRef.current)
        if (cnv.style) { cnv.style('position', 'absolute'); cnv.style('inset', '0'); cnv.style('pointer-events', 'none') }
        p.frameRate(48)
        build(w, h)
      }

      p.draw = () => {
        p.clear()
        const mouse = p.createVector(p.mouseX, p.mouseY)
        for (let i = 0; i < particles.length; i++) {
          particles[i].repel(mouse)
          particles[i].update()
          particles[i].edges()
          particles[i].draw()
        }
        for (let i = 0; i < particles.length; i++) {
          for (let j = i; j < particles.length; j++) {
            const a = particles[i], b = particles[j]
            const d = p.dist(a.pos.x, a.pos.y, b.pos.x, b.pos.y)
            const limit = 150
            if (d < limit) {
              const alpha = p.map(d, 0, limit, 0.5, 0)
              p.stroke(0, alpha * 255)
              p.strokeWeight(1.2)
              p.line(a.pos.x, a.pos.y, b.pos.x, b.pos.y)
            }
          }
        }
      }

      p.windowResized = () => {
        const { w, h } = size()
        p.resizeCanvas(w, h)
        build(w, h)
      }
    }

    const instance = new window.p5(sketch)
    const el = bgRef.current
    let ro
    if ('ResizeObserver' in window && el) {
      ro = new ResizeObserver(() => { instance && instance.windowResized() })
      ro.observe(el)
    }
    return () => { ro && ro.disconnect(); instance.remove() }
  }, [p5Loaded])

  return (
    <section id="home" className="relative container mx-auto px-6 py-12 md:py-20 overflow-hidden">
      {/* soft background blobs */}
      <div className="pointer-events-none absolute -left-24 -top-10 w-80 h-80 bg-yellow-100 rounded-full mix-blend-multiply blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -right-28 bottom-0 w-96 h-96 bg-rose-100 rounded-full mix-blend-multiply blur-3xl opacity-70" />
      <div className="relative flex flex-col md:flex-row items-center gap-10">
        <div className="md:w-1/2 w-full">
          <div className="relative w-full h-[55vh] md:h-[70vh] min-h-[360px] rounded-2xl shadow overflow-hidden">
            <div ref={bgRef} className="absolute inset-0" aria-hidden="true" />
            <div ref={containerRef} className="absolute inset-0 cursor-pointer" />
          </div>
        </div>
        <div className="md:w-1/2 w-full mt-8 md:mt-0 flex justify-center items-center">
          <div className="w-full max-w-md h-auto min-h-80">
            <img src="/images/hero-child.png" alt="Happy child using a tablet" className="rounded-lg shadow-2xl w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contact" className="bg-indigo-900 text-white relative overflow-hidden">
      {/* Wavy section divider */}
      <div className="w-full h-8 bg-gradient-to-r from-yellow-400 to-orange-500 relative">
        <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="currentColor" opacity="0.25" />
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" fill="currentColor" opacity="0.5" />
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor" />
        </svg>
      </div>
      <div className="container mx-auto px-6 py-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Children Image Section */}
          <div className="relative h-full flex justify-center">
            <img src="/images/footer-icon.png" alt="Happy children learning" className="w-full max-w-sm h-auto rounded-lg object-cover shadow-md" />
          </div>

          {/* Contact */}
          <div>
            <h5 className="font-bold text-lg mb-4 text-white">Contact Us</h5>
            <ul className="space-y-3">
              <li>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=educatch.io@gmail.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 4h20v16H2V4zm2 2v.01L12 13l8-6.99V6H4zm16 12V8.24l-7.4 5.16a2 2 0 01-2.2 0L4 8.24V18h16z" />
                  </svg>
                  educatch.io@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center text-xs">
          <p className="text-gray-400">© 2025 Educatch. All Rights Reserved.</p>
          <div className="flex items-center gap-4 mt-3 md:mt-0">
            <a href="/privacy.html" className="text-gray-400 hover:text-white transition">Privacy Policy</a>
            <a href="/terms.html" className="text-gray-400 hover:text-white transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  // Load p5.js library
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
    <main>
      <Header />
      <Hero />
      <Footer />
    </main>
  )
}