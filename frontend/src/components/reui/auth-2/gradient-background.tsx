"use client"

import { motion, useReducedMotion } from "motion/react"

const FIBER_LINES = Array.from({ length: 44 }, (_, index) => index)
const LOWER_FIBER_LINES = Array.from({ length: 34 }, (_, index) => index)

function round(value: number) {
  return Number(value.toFixed(1))
}

function getPrimaryFiberPath(
  line: number,
  wave: number,
  leftSpread = 1,
  rightSpread = 1
) {
  const offset = line - 22
  const neckSpread = (leftSpread + rightSpread) / 2
  const startY =
    384 + offset * 4.8 * leftSpread + Math.sin(wave + line * 0.18) * 10
  const centerY = 358 - offset * 2.2 + Math.cos(wave * 1.1 + line * 0.23) * 18
  const crestY =
    226 - offset * 5.2 * rightSpread + Math.sin(wave * 1.35 + line * 0.15) * 22
  const endY =
    238 + offset * 2.8 * rightSpread + Math.cos(wave + line * 0.2) * 14
  const pinchY = centerY + offset * (neckSpread - 1) * 1.8
  const pinchX =
    520 + Math.sin(wave + line * 0.11) * 22 + (rightSpread - leftSpread) * 18
  const crestX = 1010 + Math.cos(wave * 0.9 + line * 0.07) * 28

  return `M -80 ${round(startY)} C 180 ${round(startY - 52 * leftSpread)} 360 ${round(centerY + 44 * leftSpread)} ${round(pinchX)} ${round(pinchY)} C 710 ${round(centerY - 82 * rightSpread)} 820 ${round(crestY)} ${round(crestX)} ${round(crestY + 10 * rightSpread)} C 1120 ${round(crestY + 16 * rightSpread)} 1200 ${round(endY)} 1300 ${round(endY - 8 * rightSpread)}`
}

function getSecondaryFiberPath(
  line: number,
  wave: number,
  leftSpread = 1,
  rightSpread = 1
) {
  const offset = line - 17
  const neckSpread = (leftSpread + rightSpread) / 2
  const startY =
    430 + offset * 4.2 * leftSpread + Math.cos(wave + line * 0.2) * 9
  const crossY =
    346 - offset * 1.9 * neckSpread + Math.sin(wave * 1.2 + line * 0.19) * 20
  const endY =
    412 + offset * 3.4 * rightSpread + Math.cos(wave * 0.85 + line * 0.14) * 18
  const crossX =
    520 + Math.sin(wave + line * 0.08) * 26 + (rightSpread - leftSpread) * 16
  const tailX = 900 + Math.cos(wave * 1.1 + line * 0.1) * 34

  return `M -120 ${round(startY)} C 130 ${round(startY - 86 * leftSpread)} 330 ${round(startY - 56 * leftSpread)} ${round(crossX)} ${round(crossY)} C 700 ${round(crossY + 52 * rightSpread)} ${round(tailX)} ${round(endY + 8 * rightSpread)} 1320 ${round(endY - 70 * rightSpread)}`
}

export function GradientBackground() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,var(--color-cyan-950)_0,transparent_34%),radial-gradient(circle_at_84%_30%,var(--color-fuchsia-950)_0,transparent_34%),linear-gradient(145deg,var(--color-zinc-950),var(--color-slate-950)_46%,var(--color-indigo-950))] opacity-95" />
      <motion.svg
        viewBox="0 0 1200 620"
        preserveAspectRatio="none"
        className="absolute inset-x-[-20%] top-[18%] h-[62%] w-[140%] opacity-90"
        animate={
          shouldReduceMotion
            ? { opacity: 0.9 }
            : { opacity: [0.82, 0.96, 0.86], y: [0, 5, 0] }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                duration: 11,
                ease: "easeInOut",
                repeat: Infinity,
              }
        }
      >
        <defs>
          <linearGradient id="auth20-fiber-primary" x1="0" y1="0" x2="1" y2="0">
            <stop
              offset="0%"
              stopColor="var(--color-amber-300)"
              stopOpacity="0.08"
            />
            <stop
              offset="38%"
              stopColor="var(--color-rose-400)"
              stopOpacity="0.88"
            />
            <stop
              offset="58%"
              stopColor="var(--color-fuchsia-500)"
              stopOpacity="0.94"
            />
            <stop
              offset="100%"
              stopColor="var(--color-violet-600)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id="auth20-fiber-secondary"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              offset="0%"
              stopColor="var(--color-sky-500)"
              stopOpacity="0"
            />
            <stop
              offset="32%"
              stopColor="var(--color-teal-300)"
              stopOpacity="0.36"
            />
            <stop
              offset="58%"
              stopColor="var(--color-purple-500)"
              stopOpacity="0.86"
            />
            <stop
              offset="100%"
              stopColor="var(--color-blue-500)"
              stopOpacity="0.08"
            />
          </linearGradient>
          <filter
            id="auth20-fiber-glow"
            x="-10%"
            y="-30%"
            width="120%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.g
          filter="url(#auth20-fiber-glow)"
          fill="none"
          animate={
            shouldReduceMotion
              ? { x: 0, y: 0, rotate: 0, scaleX: 1, skewX: 0 }
              : {
                  x: [-18, 22, -10, -18],
                  y: [0, -10, 8, 0],
                  rotate: [-0.9, 0.8, -0.45, -0.9],
                  scaleX: [1, 1.025, 0.99, 1],
                  skewX: [-1.2, 0.85, -0.7, -1.2],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 18,
                  ease: "easeInOut",
                  repeat: Infinity,
                }
          }
          style={{ transformOrigin: "50% 50%" }}
        >
          {FIBER_LINES.map((line) => {
            const path = getPrimaryFiberPath(line, 0, 1.15, 0.68)

            return (
              <motion.path
                key={line}
                d={path}
                initial={{ d: path }}
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        d: [
                          path,
                          getPrimaryFiberPath(line, 1.15, 0.62, 1.55),
                          getPrimaryFiberPath(line, 2.35, 1.22, 0.66),
                          getPrimaryFiberPath(line, 3.45, 0.66, 1.48),
                          path,
                        ],
                      }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        duration: 15.5,
                        ease: "easeInOut",
                        repeat: Infinity,
                      }
                }
                stroke="url(#auth20-fiber-primary)"
                strokeWidth="1.35"
                opacity={0.24 + line * 0.012}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </motion.g>

        <motion.g
          filter="url(#auth20-fiber-glow)"
          fill="none"
          animate={
            shouldReduceMotion
              ? { x: 0, y: 0, rotate: 0, scaleX: 1, skewX: 0 }
              : {
                  x: [16, -24, 19, 16],
                  y: [8, -7, 11, 8],
                  rotate: [0.6, -0.75, 0.5, 0.6],
                  scaleX: [1.015, 0.99, 1.025, 1.015],
                  skewX: [1, -0.9, 0.65, 1],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 21,
                  ease: "easeInOut",
                  repeat: Infinity,
                }
          }
          style={{ transformOrigin: "48% 52%" }}
        >
          {LOWER_FIBER_LINES.map((line) => {
            const path = getSecondaryFiberPath(line, 0.4, 0.72, 1.28)

            return (
              <motion.path
                key={line}
                d={path}
                initial={{ d: path }}
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        d: [
                          path,
                          getSecondaryFiberPath(line, 1.55, 1.24, 0.68),
                          getSecondaryFiberPath(line, 2.75, 0.64, 1.48),
                          getSecondaryFiberPath(line, 3.85, 1.18, 0.7),
                          path,
                        ],
                      }
                }
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        duration: 17,
                        ease: "easeInOut",
                        repeat: Infinity,
                      }
                }
                stroke="url(#auth20-fiber-secondary)"
                strokeWidth="1.2"
                opacity={0.18 + line * 0.01}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </motion.g>
      </motion.svg>

      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-zinc-950 via-zinc-950/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-zinc-950 via-zinc-950/72 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,transparent_0,var(--color-zinc-950)_74%)] opacity-45" />
    </div>
  )
}