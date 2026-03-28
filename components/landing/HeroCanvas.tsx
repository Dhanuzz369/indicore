// components/landing/HeroCanvas.tsx
'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PARTICLE_COUNT = 800
const LINE_DISTANCE_SQ = 120 * 120   // squared — avoids sqrt per frame
const LERP = 0.05

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    )
    camera.position.z = 300

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // ── Particles ──────────────────────────────────────────
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const pts: { x: number; y: number; z: number }[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 700
      const y = (Math.random() - 0.5) * 500
      const z = (Math.random() - 0.5) * 400
      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      pts.push({ x, y, z })
    }

    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x4a90e2,
      size: 2.5,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    })
    const particlesMesh = new THREE.Points(particleGeo, particleMat)

    // ── Lines (computed once — particles are static) ───────
    const lineVerts: number[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const dz = pts[i].z - pts[j].z
        if (dx * dx + dy * dy + dz * dz < LINE_DISTANCE_SQ) {
          lineVerts.push(
            pts[i].x, pts[i].y, pts[i].z,
            pts[j].x, pts[j].y, pts[j].z,
          )
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(lineVerts), 3),
    )
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0,
    })
    const linesMesh = new THREE.LineSegments(lineGeo, lineMat)

    // ── Group (slow rotation) ──────────────────────────────
    const group = new THREE.Group()
    group.add(particlesMesh)
    group.add(linesMesh)
    scene.add(group)

    // ── Mouse parallax ────────────────────────────────────
    let targetX = 0
    let targetY = 0
    let camX = 0
    let camY = 0

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth  - 0.5) * 30
      targetY = (e.clientY / window.innerHeight - 0.5) * 30
    }
    window.addEventListener('mousemove', onMouseMove)

    // ── Animation loop ─────────────────────────────────────
    const startTime = Date.now()
    let animId: number

    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Fade-in over 2 s
      const t = Math.min((Date.now() - startTime) / 2000, 1)
      particleMat.opacity = t
      lineMat.opacity = t * 0.35

      // Camera parallax
      camX += (targetX - camX) * LERP
      camY += (targetY - camY) * LERP
      camera.position.x = camX
      camera.position.y = -camY

      // Slow rotation
      group.rotation.y += 0.0004

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ─────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      particleGeo.dispose()
      particleMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />
}
