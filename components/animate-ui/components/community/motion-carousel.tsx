"use client"

import * as React from "react"
import { motion, type Transition, useReducedMotion } from "motion/react"
import type { EmblaOptionsType, EmblaCarouselType } from "embla-carousel"
import useEmblaCarousel from "embla-carousel-react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type PropType<TSlide> = {
  slides: TSlide[]
  options?: EmblaOptionsType
  renderSlide: (
    slide: TSlide,
    index: number,
    isActive: boolean
  ) => React.ReactNode
  getSlideKey?: (slide: TSlide, index: number) => React.Key
  className?: string
  viewportClassName?: string
  trackClassName?: string
  slideClassName?: string
  controlsClassName?: string
  showDots?: boolean
  hideControls?: boolean
  uniformOpacity?: boolean
  autoplayMs?: number
  previousLabel?: string
  nextLabel?: string
}

type EmblaControls = {
  selectedIndex: number
  scrollSnaps: number[]
  prevDisabled: boolean
  nextDisabled: boolean
  onDotClick: (index: number) => void
  onPrev: () => void
  onNext: () => void
}

type DotButtonProps = {
  selected?: boolean
  label: string
  onClick: () => void
}

const transition: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 24,
  mass: 1,
}

const useEmblaControls = (
  emblaApi: EmblaCarouselType | undefined
): EmblaControls => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [scrollSnaps, setScrollSnaps] = React.useState<number[]>([])
  const [prevDisabled, setPrevDisabled] = React.useState(true)
  const [nextDisabled, setNextDisabled] = React.useState(true)

  const onDotClick = React.useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  )

  const onPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const onNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const updateSelectionState = (api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap())
    setPrevDisabled(!api.canScrollPrev())
    setNextDisabled(!api.canScrollNext())
  }

  const onInit = React.useCallback((api: EmblaCarouselType) => {
    setScrollSnaps(api.scrollSnapList())
    updateSelectionState(api)
  }, [])

  const onSelect = React.useCallback((api: EmblaCarouselType) => {
    updateSelectionState(api)
  }, [])

  React.useEffect(() => {
    if (!emblaApi) return

    onInit(emblaApi)
    emblaApi.on("reInit", onInit).on("select", onSelect)

    return () => {
      emblaApi.off("reInit", onInit).off("select", onSelect)
    }
  }, [emblaApi, onInit, onSelect])

  return {
    selectedIndex,
    scrollSnaps,
    prevDisabled,
    nextDisabled,
    onDotClick,
    onPrev,
    onNext,
  }
}

function MotionCarousel<TSlide>(props: PropType<TSlide>) {
  const {
    slides,
    options,
    renderSlide,
    getSlideKey,
    className,
    viewportClassName,
    trackClassName,
    slideClassName,
    controlsClassName,
    showDots = true,
    hideControls = false,
    uniformOpacity = false,
    autoplayMs,
    previousLabel = "Previous slide",
    nextLabel = "Next slide",
  } = props
  const prefersReducedMotion = useReducedMotion()
  const [emblaRef, emblaApi] = useEmblaCarousel(options)
  const {
    selectedIndex,
    scrollSnaps,
    prevDisabled,
    nextDisabled,
    onDotClick,
    onPrev,
    onNext,
  } = useEmblaControls(emblaApi)
  const [autoPaused, setAutoPaused] = React.useState(false)

  React.useEffect(() => {
    if (!emblaApi || !autoplayMs || slides.length < 2 || autoPaused) {
      return
    }

    const timer = window.setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext()
      } else {
        emblaApi.scrollTo(0)
      }
    }, autoplayMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [autoPaused, autoplayMs, emblaApi, slides.length])

  return (
    <div
      className={cn("w-full space-y-4", className)}
      onMouseEnter={() => setAutoPaused(true)}
      onMouseLeave={() => setAutoPaused(false)}
    >
      <div className={cn("overflow-hidden", viewportClassName)} ref={emblaRef}>
        <div
          className={cn("flex touch-pan-y touch-pinch-zoom", trackClassName)}
        >
          {slides.map((slide, index) => {
            const isActive = index === selectedIndex

            return (
              <motion.div
                key={getSlideKey ? getSlideKey(slide, index) : index}
                className={cn("mr-4 flex min-w-0 flex-none", slideClassName)}
                initial={false}
                animate={{
                  scale:
                    prefersReducedMotion || uniformOpacity
                      ? 1
                      : isActive
                        ? 1
                        : 0.97,
                  opacity: uniformOpacity ? 1 : isActive ? 1 : 0.72,
                }}
                transition={prefersReducedMotion ? { duration: 0 } : transition}
              >
                {renderSlide(slide, index, isActive)}
              </motion.div>
            )
          })}
        </div>
      </div>

      {!hideControls && scrollSnaps.length > 1 && (
        <div
          className={cn(
            "flex items-center justify-between gap-4",
            controlsClassName
          )}
        >
          <Button
            size="icon"
            variant="outline"
            onClick={onPrev}
            disabled={prevDisabled}
            aria-label={previousLabel}
          >
            <ChevronLeft className="size-5" />
          </Button>

          {showDots ? (
            <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-end">
              {scrollSnaps.map((_, index) => (
                <DotButton
                  key={index}
                  label={`Slide ${index + 1}`}
                  selected={index === selectedIndex}
                  onClick={() => onDotClick(index)}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <Button
            size="icon"
            variant="outline"
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={nextLabel}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function DotButton({ selected = false, label, onClick }: DotButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={false}
      className="flex cursor-pointer items-center justify-center rounded-full border-none bg-primary text-sm text-primary-foreground select-none"
      animate={{
        width: selected ? 68 : 12,
        height: selected ? 28 : 12,
      }}
      transition={transition}
      aria-label={label}
      aria-pressed={selected}
    >
      <motion.span
        layout
        initial={false}
        className="block px-3 py-1 whitespace-nowrap"
        animate={{
          opacity: selected ? 1 : 0,
          scale: selected ? 1 : 0,
          filter: selected ? "blur(0)" : "blur(4px)",
        }}
        transition={transition}
      >
        {label}
      </motion.span>
    </motion.button>
  )
}

export { MotionCarousel }
