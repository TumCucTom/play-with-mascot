"use client";

import React, { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Mesh, Group } from 'three'

// Key state type
type KeyState = {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
}

export default function Home() {
  const [mascotLoaded, setMascotLoaded] = useState(false)

  // Handler for mascot loaded
  const handleMascotLoaded = () => {
    setMascotLoaded(true)
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #1a1a1a;
        }

        #__next {
          width: 100%;
          height: 100%;
        }
      `}</style>
      
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#1a1a1a',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        {/* Loading Overlay */}
        {!mascotLoaded && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(20,20,30,0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '0.08em' }}>Loading...</div>
            <div style={{ width: 48, height: 48, border: '5px solid #fff', borderTop: '5px solid #ff8a00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
          </div>
        )}

        {/* 3D Canvas */}
        <div style={{ height: '100vh' }}>
          <Canvas
            style={{ height: '100%', width: '100%' }}
            shadows
            gl={{ alpha: true }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight 
              position={[5, 10, 7.5]} 
              intensity={1} 
              castShadow
            />
            <MascotWithEyes onLoaded={handleMascotLoaded} />
          </Canvas>
        </div>
      </div>
    </>
  )
}

function MascotWithEyes({ onLoaded }: { onLoaded?: () => void }) {
  const { scene } = useGLTF('/models/mascot.glb', true)
  const groupRef = useRef<Group>(null)
  const leftEyeRef = useRef<Mesh>(null)
  const rightEyeRef = useRef<Mesh>(null)
  const [keyState, setKeyState] = useState<KeyState>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  })

  // Add refs for smooth animation
  const targetEyePos = useRef({ x: 0, y: 0 })
  const currentEyePos = useRef({ x: 0, y: 0 })

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (Object.keys(keyState).includes(event.key)) {
        setKeyState(prev => ({ ...prev, [event.key]: true }))
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (Object.keys(keyState).includes(event.key)) {
        setKeyState(prev => ({ ...prev, [event.key]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Animate mascot eyes based on key state
  useFrame((state, delta) => {
    // Calculate target eye position based on key state
    let targetX = 0
    let targetY = 0

    if (keyState.ArrowLeft) targetX -= 1
    if (keyState.ArrowRight) targetX += 1
    if (keyState.ArrowUp) targetY += 1
    if (keyState.ArrowDown) targetY -= 1

    // Normalize diagonal movement
    if (targetX !== 0 && targetY !== 0) {
      targetX *= 0.707 // 1/√2
      targetY *= 0.707
    }

    // Update target position
    targetEyePos.current = {
      x: targetX,
      y: targetY
    }

    // Smoothly interpolate current position towards target
    const smoothFactor = 1 - Math.pow(0.1, delta) // Smooth transition factor
    currentEyePos.current = {
      x: currentEyePos.current.x + (targetEyePos.current.x - currentEyePos.current.x) * smoothFactor,
      y: currentEyePos.current.y + (targetEyePos.current.y - currentEyePos.current.y) * smoothFactor
    }

    const moveFactor = 0.05
    const maxOffset = 0.06
    const forwardZ = 0.12 // Z position when looking straight ahead
    const backZ = 0.08 // Z position when looking in any direction

    if (leftEyeRef.current && rightEyeRef.current) {
      const newX = clamp(currentEyePos.current.x * moveFactor, -maxOffset, maxOffset)
      const newY = clamp(currentEyePos.current.y * moveFactor, -maxOffset, maxOffset)

      // Calculate how far we are from center look
      const lookDistance = Math.sqrt(
        currentEyePos.current.x * currentEyePos.current.x + 
        currentEyePos.current.y * currentEyePos.current.y
      )
      
      // Smoothly interpolate Z position based on look distance
      // lookDistance will be between 0 (center) and ~1.4 (diagonal)
      const normalizedDistance = Math.min(lookDistance, 1)
      const newZ = forwardZ - (normalizedDistance * (forwardZ - backZ))

      leftEyeRef.current.position.x = newX
      leftEyeRef.current.position.y = newY
      leftEyeRef.current.position.z = newZ

      rightEyeRef.current.position.x = newX
      rightEyeRef.current.position.y = newY
      rightEyeRef.current.position.z = newZ
    }

    // Subtle mascot body movement with smooth interpolation
    if (groupRef.current) {
      const targetRotY = currentEyePos.current.x * 0.2
      const targetRotX = -currentEyePos.current.y * 0.1
      
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * smoothFactor
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * smoothFactor
    }
  })

  useEffect(() => {
    if (scene && onLoaded) onLoaded()
  }, [scene, onLoaded])

  return (
    <group ref={groupRef} scale={[3, 3, 3]} position={[0, -4, 0]}>
      {/* Mascot Model */}
      <primitive object={scene} position={[0, 0, 0]} castShadow receiveShadow />

      {/* Left Eye White */}
      <mesh position={[-0.2, 1.3, 0.4]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color={'white'} />
        {/* Left Pupil */}
        <mesh ref={leftEyeRef} position={[0, 0, 0.12]}>
          <sphereGeometry args={[0.05, 32, 32]} />
          <meshStandardMaterial color={'black'} />
        </mesh>
      </mesh>

      {/* Right Eye White */}
      <mesh position={[0.2, 1.3, 0.4]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color={'white'} />
        {/* Right Pupil */}
        <mesh ref={rightEyeRef} position={[0, 0, 0.12]}>
          <sphereGeometry args={[0.05, 32, 32]} />
          <meshStandardMaterial color={'black'} />
        </mesh>
      </mesh>
    </group>
  )
}

// Clamp helper
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

// Preload the GLTF
useGLTF.preload('/models/mascot.glb') 
