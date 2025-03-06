"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import { Minus, Plus } from "lucide-react"
// Add these imports at the top of the file, after the existing imports
import { Download, Clipboard, X } from "lucide-react"
import html2canvas from "html2canvas"

export default function Home() {
  // Add these state variables after the existing state declarations
  const [showCopyTooltip, setShowCopyTooltip] = useState(false)
  const [showDownloadTooltip, setShowDownloadTooltip] = useState(false)
  // Update the magnifier state type to handle gradient borders
  const [magnifier, setMagnifier] = useState<{
    x: number
    y: number
    size: number
    selected: boolean
    zoomFactor: number
    borderColor: string
    borderWidth: number
    isGradient?: boolean
  } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 })
  const [isDraggingMagnifier, setIsDraggingMagnifier] = useState(false)
  const [isResizingMagnifier, setIsResizingMagnifier] = useState(false)
  const [resizeCorner, setResizeCorner] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStartData, setResizeStartData] = useState<{
    startX: number
    startY: number
    startSize: number
    startMagnifierX: number
    startMagnifierY: number
  } | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  // Update the colorOptions array to have 9 colors plus the custom picker (10 total)
  const [colorOptions] = useState([
    "#FFFFFF", // white
    "#000000", // black
    "#3B82F6", // blue
    "#FF4500", // orange-red (new color)
    { value: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", isGradient: true }, // Instagram gradient
    { value: "linear-gradient(45deg, #00c6ff, #0072ff)", isGradient: true }, // Blue gradient
    { value: "linear-gradient(45deg, #ff9a9e, #fad0c4)", isGradient: true }, // Soft pink gradient
    { value: "linear-gradient(45deg, #a18cd1, #fbc2eb)", isGradient: true }, // Purple pink gradient
    { value: "linear-gradient(45deg, #84fab0, #8fd3f4)", isGradient: true }, // Green blue gradient
  ])

  // Add these new state variables after the existing state declarations
  const [isResizingImage, setIsResizingImage] = useState(false)
  const [imageResizeCorner, setImageResizeCorner] = useState<string | null>(null)
  const [imageResizeStartData, setImageResizeStartData] = useState<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startImageX: number
    startImageY: number
  } | null>(null)
  const [imageContainerSize, setImageContainerSize] = useState({ width: 0, height: 0 })

  // Add these new state variables after the existing state declarations
  const [isMobile, setIsMobile] = useState(false)

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const magnifierRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const resizeHandleRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Add these refs after the existing refs
  const imageContainerResizeHandleRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // Load preferences from local storage on initial render
  useEffect(() => {
    const savedPreferences = localStorage.getItem("magnifierPreferences")
    if (savedPreferences) {
      const { zoomFactor, borderColor, borderWidth, isGradient } = JSON.parse(savedPreferences)
      setDefaultPreferences({
        zoomFactor: zoomFactor || 2,
        borderColor: borderColor || "#FFFFFF",
        borderWidth: borderWidth || 2,
        isGradient: isGradient || false,
      })
    }
  }, [])

  // Default preferences for new magnifiers
  // Update the defaultPreferences to include isGradient property
  const [defaultPreferences, setDefaultPreferences] = useState({
    zoomFactor: 2,
    borderColor: "#FFFFFF",
    borderWidth: 2,
    isGradient: false,
  })

  // Save preferences to local storage when they change
  useEffect(() => {
    localStorage.setItem("magnifierPreferences", JSON.stringify(defaultPreferences))
  }, [defaultPreferences])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]

      if (droppedFile.type.startsWith("image/")) {
        setFile(droppedFile)
        const imageUrl = URL.createObjectURL(droppedFile)
        setPreview(imageUrl)
      }
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      if (selectedFile.type.startsWith("image/")) {
        setFile(selectedFile)
        const imageUrl = URL.createObjectURL(selectedFile)
        setPreview(imageUrl)
      }
    }
  }, [])

  // Add this function after handleFileChange
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            setFile(blob)
            const imageUrl = URL.createObjectURL(blob)
            setPreview(imageUrl)
            break
          }
        }
      }
    }
  }, [])

  // Improved resize start handler
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.stopPropagation()
      e.preventDefault()

      if (!magnifier || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      setIsResizingMagnifier(true)
      setResizeCorner(corner)
      setResizeStartData({
        startX: mouseX,
        startY: mouseY,
        startSize: magnifier.size,
        startMagnifierX: magnifier.x,
        startMagnifierY: magnifier.y,
      })
    },
    [magnifier],
  )

  // Add this function after handleResizeStart
  const handleImageResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.stopPropagation()
      e.preventDefault()

      if (!imageContainerRef.current || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const imageContainerRect = imageContainerRef.current.getBoundingClientRect()

      const mouseX = e.clientX - containerRect.left
      const mouseY = e.clientY - containerRect.top

      setIsResizingImage(true)
      setImageResizeCorner(direction)
      setImageResizeStartData({
        startX: mouseX,
        startY: mouseY,
        startWidth: imageContainerRect.width,
        startHeight: imageContainerRect.height,
        startImageX: imagePosition.x,
        startImageY: imagePosition.y,
      })
    },
    [imagePosition.x, imagePosition.y],
  )

  // Update the handleMouseDown function to better handle control clicks
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!preview) return

      const container = containerRef.current
      if (!container) return

      // Check if clicking on controls or their children
      const target = e.target as HTMLElement
      if (target.closest(".controls-panel")) {
        // Clicked on controls, do nothing
        return
      }

      const rect = container.getBoundingClientRect()

      // Check if clicking on magnifier
      if (magnifier && magnifierRef.current) {
        // Check if clicking inside magnifier for dragging
        const dx = e.clientX - rect.left - magnifier.x
        const dy = e.clientY - rect.top - magnifier.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= magnifier.size / 2) {
          setIsDraggingMagnifier(true)
          setDragOffset({
            x: dx,
            y: dy,
          })
          setMagnifier({
            ...magnifier,
            selected: true,
          })
          e.stopPropagation()
          return
        } else {
          // Clicked outside the magnifier, deselect it
          setMagnifier({
            ...magnifier,
            selected: false,
          })
        }
      }

      // If not interacting with magnifier, start drawing a new selection
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setIsDrawing(true)
      setStartPoint({ x, y })
      setEndPoint({ x, y })
    },
    [preview, magnifier],
  )

  // Improved mouse move handler with better resizing logic
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Handle magnifier dragging
      if (isDraggingMagnifier && magnifier) {
        const newX = mouseX - dragOffset.x
        const newY = mouseY - dragOffset.y

        setMagnifier({
          ...magnifier,
          x: newX,
          y: newY,
        })
        return
      }

      // Handle magnifier resizing with improved logic
      if (isResizingMagnifier && magnifier && resizeCorner && resizeStartData) {
        let newSize = magnifier.size
        let newX = magnifier.x
        let newY = magnifier.y

        // Calculate distance from current mouse position to original center
        const dx = mouseX - resizeStartData.startMagnifierX
        const dy = mouseY - resizeStartData.startMagnifierY

        if (resizeCorner === "bottomRight") {
          // Bottom right - just adjust size based on distance
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)
        } else if (resizeCorner === "topLeft") {
          // Top left - move in opposite direction of resize
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Move center in the opposite direction of resize
          newX = resizeStartData.startMagnifierX - (Math.cos(angle) * (newSize - resizeStartData.startSize)) / 2
          newY = resizeStartData.startMagnifierY - (Math.sin(angle) * (newSize - resizeStartData.startSize)) / 2
        } else if (resizeCorner === "topRight") {
          // Top right - adjust Y position and size
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Only adjust Y position
          newY = resizeStartData.startMagnifierY - (Math.sin(angle) * (newSize - resizeStartData.startSize)) / 2
        } else if (resizeCorner === "bottomLeft") {
          // Bottom left - adjust X position and size
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Only adjust X position
          newX = resizeStartData.startMagnifierX - (Math.cos(angle) * (newSize - resizeStartData.startSize)) / 2
        }

        setMagnifier({
          ...magnifier,
          x: newX,
          y: newY,
          size: newSize,
        })
        return
      }

      // Add this code inside handleMouseMove, after the magnifier resizing logic and before the drawing selection logic
      if (
        isResizingImage &&
        imageResizeStartData &&
        imageResizeCorner &&
        imageContainerRef.current &&
        containerRef.current
      ) {
        let newWidth = imageContainerSize.width
        let newHeight = imageContainerSize.height
        const containerRect = containerRef.current.getBoundingClientRect()
        const imageContainerRect = imageContainerRef.current.getBoundingClientRect()

        // Calculate aspect ratio to maintain
        const aspectRatio = imageResizeStartData.startWidth / imageResizeStartData.startHeight

        // Calculate center point of the image container for maintaining central position
        const centerX = containerRect.width / 2
        const centerY = containerRect.height / 2

        if (imageResizeCorner === "right") {
          // Calculate distance from center to cursor
          const distanceFromCenter = mouseX - centerX
          // Set width based on twice the distance (since we're centering)
          newWidth = Math.max(100, Math.abs(distanceFromCenter) * 2)
          // Maintain aspect ratio
          newHeight = newWidth / aspectRatio
        } else if (imageResizeCorner === "bottom") {
          // Calculate distance from center to cursor
          const distanceFromCenter = mouseY - centerY
          // Set height based on twice the distance (since we're centering)
          newHeight = Math.max(100, Math.abs(distanceFromCenter) * 2)
          // Maintain aspect ratio
          newWidth = newHeight * aspectRatio
        }

        setImageContainerSize({ width: newWidth, height: newHeight })
        return
      }

      // Handle drawing selection
      if (isDrawing && preview) {
        let x = mouseX
        let y = mouseY

        // Calculate the size for a square
        const width = Math.abs(x - startPoint.x)
        const height = Math.abs(y - startPoint.y)
        const size = Math.max(width, height)

        // Adjust the end point to make it a square
        if (x >= startPoint.x) {
          x = startPoint.x + size
        } else {
          x = startPoint.x - size
        }

        if (y >= startPoint.y) {
          y = startPoint.y + size
        } else {
          y = startPoint.y - size
        }

        setEndPoint({ x, y })
      }
    },
    [
      isDrawing,
      isDraggingMagnifier,
      isResizingMagnifier,
      preview,
      startPoint,
      magnifier,
      dragOffset,
      resizeCorner,
      resizeStartData,
      isResizingImage,
      imageResizeStartData,
      imageResizeCorner,
      imageContainerSize,
    ],
  )

  const handleMouseUp = useCallback(() => {
    // Add this code at the beginning of handleMouseUp
    if (isResizingImage) {
      setIsResizingImage(false)
      setImageResizeCorner(null)
      setImageResizeStartData(null)
      return
    }

    // Handle finishing magnifier drag
    if (isDraggingMagnifier) {
      setIsDraggingMagnifier(false)
      return
    }

    // Handle finishing magnifier resize
    if (isResizingMagnifier) {
      setIsResizingMagnifier(false)
      setResizeCorner(null)
      setResizeStartData(null)
      return
    }

    // Handle finishing drawing selection
    if (isDrawing && preview) {
      setIsDrawing(false)

      // Create magnifier from the square
      const size = Math.abs(endPoint.x - startPoint.x)
      const centerX = Math.min(startPoint.x, endPoint.x) + size / 2
      const centerY = Math.min(startPoint.y, endPoint.y) + size / 2

      // Update the magnifier creation to include isGradient
      if (size > 10) {
        // Only create if it's a meaningful size
        setMagnifier({
          x: centerX,
          y: centerY,
          size: size,
          selected: true,
          zoomFactor: defaultPreferences.zoomFactor,
          borderColor: defaultPreferences.borderColor,
          borderWidth: defaultPreferences.borderWidth,
          isGradient: defaultPreferences.isGradient,
        })
      }
    }
  }, [
    isDrawing,
    isDraggingMagnifier,
    isResizingMagnifier,
    preview,
    startPoint,
    endPoint,
    defaultPreferences,
    isResizingImage,
  ])

  // Handle key press for deleting magnifier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (magnifier?.selected && (e.key === "Backspace" || e.key === "Delete")) {
        setMagnifier(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [magnifier])

  // Add this effect after the existing effects
  useEffect(() => {
    // Add paste event listener to the window
    window.addEventListener("paste", handlePaste)

    return () => {
      window.removeEventListener("paste", handlePaste)
    }
  }, [handlePaste])

  // Update image size and position when image loads or container changes
  useEffect(() => {
    if (preview && imageRef.current && imageContainerRef.current) {
      const updateImageInfo = () => {
        if (imageRef.current && imageContainerRef.current && containerRef.current) {
          const imageRect = imageRef.current.getBoundingClientRect()
          const containerRect = containerRef.current.getBoundingClientRect()

          // Calculate the position of the image relative to the container
          setImagePosition({
            x: imageRect.left - containerRect.left,
            y: imageRect.top - containerRect.top,
          })

          // Calculate the scale of the displayed image relative to its natural size
          setImageScale(imageRef.current.width / imageRef.current.naturalWidth)

          // Add this line inside the updateImageInfo function after setting imageScale
          setImageContainerSize({ width: imageRect.width, height: imageRect.height })

          setImageSize({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight,
          })
        }
      }

      // Set initial size if already loaded
      updateImageInfo()

      // Add load event for when image finishes loading
      imageRef.current.addEventListener("load", updateImageInfo)

      // Create a ResizeObserver to detect container size changes
      const resizeObserver = new ResizeObserver(updateImageInfo)
      resizeObserver.observe(imageContainerRef.current)

      return () => {
        if (imageRef.current) {
          imageRef.current.removeEventListener("load", updateImageInfo)
        }
        resizeObserver.disconnect()
      }
    }
  }, [preview])

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  // Handle zoom factor change
  const handleZoomChange = useCallback(
    (delta: number) => {
      if (!magnifier) return

      const newZoom = Math.min(5, Math.max(1, magnifier.zoomFactor + delta))

      setMagnifier({
        ...magnifier,
        zoomFactor: newZoom,
      })

      // Update default preferences
      setDefaultPreferences({
        ...defaultPreferences,
        zoomFactor: newZoom,
      })
    },
    [magnifier, defaultPreferences],
  )

  // Update the handleBorderColorChange function to handle gradients
  const handleBorderColorChange = useCallback(
    (color: string, isGradient = false) => {
      if (!magnifier) return

      setMagnifier({
        ...magnifier,
        borderColor: color,
        isGradient: isGradient,
      })

      // Update default preferences
      setDefaultPreferences({
        ...defaultPreferences,
        borderColor: color,
        isGradient: isGradient,
      })
    },
    [magnifier, defaultPreferences],
  )

  // Handle border width change
  const handleBorderWidthChange = useCallback(
    (width: number) => {
      if (!magnifier) return

      setMagnifier({
        ...magnifier,
        borderWidth: width,
      })

      // Update default preferences
      setDefaultPreferences({
        ...defaultPreferences,
        borderWidth: width,
      })
    },
    [magnifier, defaultPreferences],
  )

  // Add this effect to detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Check on initial load
    checkMobile()

    // Add resize listener
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Add these touch event handlers after the existing mouse event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!preview) return

      const container = containerRef.current
      if (!container) return

      // Check if touching controls or their children
      const target = e.target as HTMLElement
      if (target.closest(".controls-panel")) {
        // Touched on controls, do nothing
        return
      }

      const rect = container.getBoundingClientRect()
      const touch = e.touches[0]
      const touchX = touch.clientX - rect.left
      const touchY = touch.clientY - rect.top

      // Check if touching magnifier
      if (magnifier && magnifierRef.current) {
        // Check if touching inside magnifier for dragging
        const dx = touchX - magnifier.x
        const dy = touchY - magnifier.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= magnifier.size / 2) {
          setIsDraggingMagnifier(true)
          setDragOffset({
            x: dx,
            y: dy,
          })
          setMagnifier({
            ...magnifier,
            selected: true,
          })
          return
        } else {
          // Touched outside the magnifier, deselect it
          setMagnifier({
            ...magnifier,
            selected: false,
          })
        }
      }

      // If not interacting with magnifier, start drawing a new selection
      setIsDrawing(true)
      setStartPoint({ x: touchX, y: touchY })
      setEndPoint({ x: touchX, y: touchY })
    },
    [preview, magnifier],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const touch = e.touches[0]
      const touchX = touch.clientX - rect.left
      const touchY = touch.clientY - rect.top

      // Handle magnifier dragging
      if (isDraggingMagnifier && magnifier) {
        const newX = touchX - dragOffset.x
        const newY = touchY - dragOffset.y

        setMagnifier({
          ...magnifier,
          x: newX,
          y: newY,
        })
        return
      }

      // Handle magnifier resizing with improved logic
      if (isResizingMagnifier && magnifier && resizeCorner && resizeStartData) {
        let newSize = magnifier.size
        let newX = magnifier.x
        let newY = magnifier.y

        // Calculate distance from current touch position to original center
        const dx = touchX - resizeStartData.startMagnifierX
        const dy = touchY - resizeStartData.startMagnifierY

        if (resizeCorner === "bottomRight") {
          // Bottom right - just adjust size based on distance
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)
        } else if (resizeCorner === "topLeft") {
          // Top left - move in opposite direction of resize
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Move center in the opposite direction of resize
          newX = resizeStartData.startMagnifierX - (Math.cos(angle) * (newSize - resizeStartData.startSize)) / 2
          newY = resizeStartData.startMagnifierY - (Math.sin(angle) * (newSize - resizeStartData.startSize)) / 2
        } else if (resizeCorner === "topRight") {
          // Top right - adjust Y position and size
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Only adjust Y position
          newY = resizeStartData.startMagnifierY - (Math.sin(angle) * (newSize - resizeStartData.startSize)) / 2
        } else if (resizeCorner === "bottomLeft") {
          // Bottom left - adjust X position and size
          const distance = Math.sqrt(dx * dx + dy * dy) * 2
          newSize = Math.max(40, distance)

          // Calculate the angle to maintain direction
          const angle = Math.atan2(dy, dx)
          // Only adjust X position
          newX = resizeStartData.startMagnifierX - (Math.cos(angle) * (newSize - resizeStartData.startSize)) / 2
        }

        setMagnifier({
          ...magnifier,
          x: newX,
          y: newY,
          size: newSize,
        })
        return
      }

      // Handle image resizing
      if (
        isResizingImage &&
        imageResizeStartData &&
        imageResizeCorner &&
        imageContainerRef.current &&
        containerRef.current
      ) {
        let newWidth = imageContainerSize.width
        let newHeight = imageContainerSize.height
        const containerRect = containerRef.current.getBoundingClientRect()
        const imageContainerRect = imageContainerRef.current.getBoundingClientRect()

        // Calculate aspect ratio to maintain
        const aspectRatio = imageResizeStartData.startWidth / imageResizeStartData.startHeight

        // Calculate center point of the image container for maintaining central position
        const centerX = containerRect.width / 2
        const centerY = containerRect.height / 2

        if (imageResizeCorner === "right") {
          // Calculate distance from center to touch point
          const distanceFromCenter = touchX - centerX
          // Set width based on twice the distance (since we're centering)
          newWidth = Math.max(100, Math.abs(distanceFromCenter) * 2)
          // Maintain aspect ratio
          newHeight = newWidth / aspectRatio
        } else if (imageResizeCorner === "bottom") {
          // Calculate distance from center to touch point
          const distanceFromCenter = touchY - centerY
          // Set height based on twice the distance (since we're centering)
          newHeight = Math.max(100, Math.abs(distanceFromCenter) * 2)
          // Maintain aspect ratio
          newWidth = newHeight * aspectRatio
        }

        setImageContainerSize({ width: newWidth, height: newHeight })
        return
      }

      // Handle drawing selection
      if (isDrawing && preview) {
        let x = touchX
        let y = touchY

        // Calculate the size for a square
        const width = Math.abs(x - startPoint.x)
        const height = Math.abs(y - startPoint.y)
        const size = Math.max(width, height)

        // Adjust the end point to make it a square
        if (x >= startPoint.x) {
          x = startPoint.x + size
        } else {
          x = startPoint.x - size
        }

        if (y >= startPoint.y) {
          y = startPoint.y + size
        } else {
          y = startPoint.y - size
        }

        setEndPoint({ x, y })
      }
    },
    [
      isDrawing,
      isDraggingMagnifier,
      isResizingMagnifier,
      preview,
      startPoint,
      magnifier,
      dragOffset,
      resizeCorner,
      resizeStartData,
      isResizingImage,
      imageResizeStartData,
      imageResizeCorner,
      imageContainerSize,
    ],
  )

  const handleTouchEnd = useCallback(() => {
    // Handle finishing image resize
    if (isResizingImage) {
      setIsResizingImage(false)
      setImageResizeCorner(null)
      setImageResizeStartData(null)
      return
    }

    // Handle finishing magnifier drag
    if (isDraggingMagnifier) {
      setIsDraggingMagnifier(false)
      return
    }

    // Handle finishing magnifier resize
    if (isResizingMagnifier) {
      setIsResizingMagnifier(false)
      setResizeCorner(null)
      setResizeStartData(null)
      return
    }

    // Handle finishing drawing selection
    if (isDrawing && preview) {
      setIsDrawing(false)

      // Create magnifier from the square
      const size = Math.abs(endPoint.x - startPoint.x)
      const centerX = Math.min(startPoint.x, endPoint.x) + size / 2
      const centerY = Math.min(startPoint.y, endPoint.y) + size / 2

      if (size > 10) {
        // Only create if it's a meaningful size
        setMagnifier({
          x: centerX,
          y: centerY,
          size: size,
          selected: true,
          zoomFactor: defaultPreferences.zoomFactor,
          borderColor: defaultPreferences.borderColor,
          borderWidth: defaultPreferences.borderWidth,
          isGradient: defaultPreferences.isGradient,
        })
      }
    }
  }, [
    isDrawing,
    isDraggingMagnifier,
    isResizingMagnifier,
    preview,
    startPoint,
    endPoint,
    defaultPreferences,
    isResizingImage,
  ])

  // Update the handleImageResizeStart function to work with touch events
  const handleImageResizeTouchStart = useCallback(
    (e: React.TouchEvent, direction: string) => {
      e.stopPropagation()
      e.preventDefault()

      if (!imageContainerRef.current || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const imageContainerRect = imageContainerRef.current.getBoundingClientRect()
      const touch = e.touches[0]

      const touchX = touch.clientX - containerRect.left
      const touchY = touch.clientY - containerRect.top

      setIsResizingImage(true)
      setImageResizeCorner(direction)
      setImageResizeStartData({
        startX: touchX,
        startY: touchY,
        startWidth: imageContainerRect.width,
        startHeight: imageContainerRect.height,
        startImageX: imagePosition.x,
        startImageY: imagePosition.y,
      })
    },
    [imagePosition.x, imagePosition.y],
  )

  // Update the handleResizeStart function to work with touch events
  const handleResizeTouchStart = useCallback(
    (e: React.TouchEvent, corner: string) => {
      e.stopPropagation()
      e.preventDefault()

      if (!magnifier || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      const touchX = touch.clientX - rect.left
      const touchY = touch.clientY - rect.top

      setIsResizingMagnifier(true)
      setResizeCorner(corner)
      setResizeStartData({
        startX: touchX,
        startY: touchY,
        startSize: magnifier.size,
        startMagnifierX: magnifier.x,
        startMagnifierY: magnifier.y,
      })
    },
    [magnifier],
  )

  // Add these functions inside the Home component, before the return statement
  const captureScreenshot = useCallback(async () => {
    if (!containerRef.current || !preview || !imageContainerRef.current) return

    try {
      // Create a temporary canvas with the exact dimensions of the image container
      const captureContainer = document.createElement("div")
      captureContainer.style.position = "absolute"
      captureContainer.style.left = "0"
      captureContainer.style.top = "0"
      captureContainer.style.width = `${imageContainerSize.width}px`
      captureContainer.style.height = `${imageContainerSize.height}px`
      captureContainer.style.overflow = "hidden"
      captureContainer.style.backgroundColor = "transparent"

      // Clone the image with exact dimensions
      if (imageRef.current) {
        const clonedImage = imageRef.current.cloneNode(true) as HTMLImageElement
        clonedImage.style.width = "100%"
        clonedImage.style.height = "100%"
        clonedImage.style.objectFit = "contain"
        captureContainer.appendChild(clonedImage)
      }

      // Clone the magnifier if it exists, with position adjusted relative to the image container
      if (magnifier && magnifierRef.current) {
        const imageRect = imageContainerRef.current.getBoundingClientRect()

        const containerRect = containerRef.current.getBoundingClientRect()

        const clonedMagnifier = magnifierRef.current.cloneNode(true) as HTMLDivElement

        // Calculate position relative to the image container
        const magnifierLeft = magnifier.x - (imageRect.left - containerRect.left)
        const magnifierTop = magnifier.y - (imageRect.top - containerRect.top)

        clonedMagnifier.style.left = `${magnifierLeft - magnifier.size / 2}px`
        clonedMagnifier.style.top = `${magnifierTop - magnifier.size / 2}px`

        captureContainer.appendChild(clonedMagnifier)
      }

      // Add the capture container to the DOM temporarily
      document.body.appendChild(captureContainer)

      // Take the screenshot with exact dimensions
      const canvas = await html2canvas(captureContainer, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
        allowTaint: true,
        useCORS: true,
        width: imageContainerSize.width,
        height: imageContainerSize.height,
      })

      // Remove the temporary container
      document.body.removeChild(captureContainer)

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        // Use original filename if available
        const fileName = file?.name ? `${file.name.split(".")[0]}_magnified.png` : "screenshot.png"
        a.download = fileName
        a.click()

        // Clean up
        URL.revokeObjectURL(url)

        // Show tooltip
        setShowDownloadTooltip(true)
        setTimeout(() => setShowDownloadTooltip(false), 2000)
      }, "image/png")
    } catch (error) {
      console.error("Error capturing screenshot:", error)
    }
  }, [preview, magnifier, imageContainerSize, file])

  // Also update the copyToClipboard function with the same improvements
  const copyToClipboard = useCallback(async () => {
    if (!containerRef.current || !preview || !imageContainerRef.current) return

    try {
      // Create a temporary canvas with the exact dimensions of the image container
      const captureContainer = document.createElement("div")
      captureContainer.style.position = "absolute"
      captureContainer.style.left = "0"
      captureContainer.style.top = "0"
      captureContainer.style.width = `${imageContainerSize.width}px`
      captureContainer.style.height = `${imageContainerSize.height}px`
      captureContainer.style.overflow = "hidden"
      captureContainer.style.backgroundColor = "transparent"

      // Clone the image with exact dimensions
      if (imageRef.current) {
        const clonedImage = imageRef.current.cloneNode(true) as HTMLImageElement
        clonedImage.style.width = "100%"
        clonedImage.style.height = "100%"
        clonedImage.style.objectFit = "contain"
        captureContainer.appendChild(clonedImage)
      }

      // Clone the magnifier if it exists, with position adjusted relative to the image container
      if (magnifier && magnifierRef.current) {
        const imageRect = imageContainerRef.current.getBoundingClientRect()
        const containerRect = containerRef.current.getBoundingClientRect()

        const clonedMagnifier = magnifierRef.current.cloneNode(true) as HTMLDivElement

        // Calculate position relative to the image container
        const magnifierLeft = magnifier.x - (imageRect.left - containerRect.left)
        const magnifierTop = magnifier.y - (imageRect.top - containerRect.top)

        clonedMagnifier.style.left = `${magnifierLeft - magnifier.size / 2}px`
        clonedMagnifier.style.top = `${magnifierTop - magnifier.size / 2}px`

        captureContainer.appendChild(clonedMagnifier)
      }

      // Add the capture container to the DOM temporarily
      document.body.appendChild(captureContainer)

      // Take the screenshot with exact dimensions
      const canvas = await html2canvas(captureContainer, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
        allowTaint: true,
        useCORS: true,
        width: imageContainerSize.width,
        height: imageContainerSize.height,
      })

      // Remove the temporary container
      document.body.removeChild(captureContainer)

      // Copy to clipboard with file representation
      canvas.toBlob(async (blob) => {
        if (!blob) return

        try {
          // Create a named file representation for the clipboard
          const fileName = file?.name ? `${file.name.split(".")[0]}_magnified.png` : "screenshot.png"

          // For modern browsers that support the Clipboard API with ClipboardItem
          if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({
              [blob.type]: blob,
            })
            await navigator.clipboard.write([clipboardItem])

            // Show tooltip
            setShowCopyTooltip(true)
            setTimeout(() => setShowCopyTooltip(false), 2000)
          } else {
            // Fallback for older browsers
            const url = URL.createObjectURL(blob)
            const img = document.createElement("img")
            img.src = url

            const div = document.createElement("div")
            div.contentEditable = "true"
            div.appendChild(img)
            document.body.appendChild(div)

            // Select the image
            const range = document.createRange()
            range.selectNodeContents(div)
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(range)

            // Copy to clipboard
            document.execCommand("copy")

            // Clean up
            document.body.removeChild(div)
            URL.revokeObjectURL(url)

            // Show tooltip
            setShowCopyTooltip(true)
            setTimeout(() => setShowCopyTooltip(false), 2000)
          }
        } catch (err) {
          console.error("Failed to copy to clipboard:", err)
        }
      }, "image/png")
    } catch (error) {
      console.error("Error copying to clipboard:", error)
    }
  }, [preview, magnifier, imageContainerSize, file])

  const clearAll = useCallback(() => {
    setFile(null)
    setPreview(null)
    setMagnifier(null)
  }, [])

  // Update the controls panel to have a class name for targeting and organize colors in two rows
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4 select-none">
      <div
        ref={containerRef}
        className={`w-full h-screen flex items-center justify-center transition-all duration-200 relative ${
          isDragging ? "bg-gray-200" : "bg-gray-100"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Replace the existing preview section in the return statement with this updated version */}
        {!preview ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              Paste, drag, or{" "}
              <label htmlFor="file-upload" className="text-gray-500 cursor-pointer hover:underline">
                select
              </label>{" "}
              a photo.
            </p>
            <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
          </div>
        ) : (
          <div
            ref={imageContainerRef}
            className="relative max-w-full max-h-full pointer-events-none"
            style={{
              width: imageContainerSize.width > 0 ? imageContainerSize.width : "auto",
              height: imageContainerSize.height > 0 ? imageContainerSize.height : "auto",
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Image
              ref={imageRef}
              src={preview || "/placeholder.svg"}
              alt=""
              className="max-h-[90vh] w-auto object-contain"
              width={1200}
              height={800}
              draggable="false"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement
                setImageSize({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                })
              }}
            />

            {/* Right resize bar */}
            <div
              className={`absolute top-0 bottom-0 right-0 cursor-ew-resize z-10 pointer-events-auto ${
                isMobile ? "w-8 bg-blue-200 bg-opacity-30" : "w-4 hover:bg-blue-200 hover:bg-opacity-30"
              }`}
              style={{
                right: -2,
              }}
              onMouseDown={(e) => handleImageResizeStart(e, "right")}
              onTouchStart={(e) => handleImageResizeTouchStart(e, "right")}
            />

            {/* Bottom resize bar */}
            <div
              className={`absolute left-0 right-0 bottom-0 cursor-ns-resize z-10 pointer-events-auto ${
                isMobile ? "h-8 bg-blue-200 bg-opacity-30" : "h-4 hover:bg-blue-200 hover:bg-opacity-30"
              }`}
              style={{
                bottom: -2,
              }}
              onMouseDown={(e) => handleImageResizeStart(e, "bottom")}
              onTouchStart={(e) => handleImageResizeTouchStart(e, "bottom")}
            />
          </div>
        )}

        {/* Selection rectangle */}
        {isDrawing && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none"
            style={{
              left: Math.min(startPoint.x, endPoint.x),
              top: Math.min(startPoint.y, endPoint.y),
              width: Math.abs(endPoint.x - startPoint.x),
              height: Math.abs(endPoint.y - startPoint.y),
            }}
          />
        )}

        {/* Circular magnifier */}
        {magnifier && preview && (
          <>
            {/* Selection square when selected */}
            {magnifier.selected && (
              <div
                className="absolute border border-blue-500 pointer-events-none"
                style={{
                  left: magnifier.x - magnifier.size / 2,
                  top: magnifier.y - magnifier.size / 2,
                  width: magnifier.size,
                  height: magnifier.size,
                }}
              />
            )}

            {/* Update the magnifier rendering to handle gradients */}
            <div
              ref={magnifierRef}
              className="absolute rounded-full overflow-hidden cursor-move"
              style={{
                left: magnifier.x - magnifier.size / 2,
                top: magnifier.y - magnifier.size / 2,
                width: magnifier.size,
                height: magnifier.size,
                ...(magnifier.isGradient
                  ? {
                      backgroundImage: magnifier.borderColor,
                      padding: `${magnifier.borderWidth}px`,
                    }
                  : {
                      border: `${magnifier.borderWidth}px solid ${magnifier.borderColor}`,
                    }),
                boxShadow: magnifier.selected ? "0 0 0 1px #3b82f6" : "none",
              }}
            >
              {/* Magnified content */}
              {preview && (
                <div
                  className={`w-full h-full relative overflow-hidden rounded-full ${magnifier.isGradient ? "bg-white" : ""}`}
                >
                  {/* Calculate the relative position within the image */}
                  <div
                    style={{
                      position: "absolute",
                      width: `${imageSize.width * imageScale * magnifier.zoomFactor}px`,
                      height: `${imageSize.height * imageScale * magnifier.zoomFactor}px`,
                      backgroundImage: `url(${preview})`,
                      backgroundSize: `${imageSize.width * imageScale * magnifier.zoomFactor}px ${imageSize.height * imageScale * magnifier.zoomFactor}px`,
                      backgroundRepeat: "no-repeat",
                      transform: `translate(${-((magnifier.x - imagePosition.x) * magnifier.zoomFactor - magnifier.size / 2 + magnifier.borderWidth)}px, ${-((magnifier.y - imagePosition.y) * magnifier.zoomFactor - magnifier.size / 2 + magnifier.borderWidth)}px)`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Controls panel */}
            {magnifier.selected && (
              <div
                className="absolute bg-gray-900 rounded-md shadow-md p-2 flex flex-col gap-1.5 z-20 controls-panel"
                style={{
                  left: magnifier.x - (isMobile ? 120 : 90),
                  top: magnifier.y + magnifier.size / 2 + 10,
                  width: isMobile ? "240px" : "180px",
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {/* Zoom controls */}
                <div className="flex items-center justify-between">
                  <span className={`${isMobile ? "text-xs" : "text-[10px]"} text-gray-300 font-mono`}>Zoom</span>
                  <div className="flex items-center">
                    <button
                      className={`${isMobile ? "w-8 h-8" : "w-4 h-4"} flex items-center justify-center bg-gray-700 rounded-sm`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleZoomChange(-0.5)
                      }}
                      disabled={magnifier.zoomFactor <= 1}
                    >
                      <Minus size={isMobile ? 16 : 10} className="text-gray-300" />
                    </button>
                    <span
                      className={`mx-1 ${isMobile ? "text-xs" : "text-[10px]"} text-gray-300 font-mono w-10 text-center`}
                    >
                      {magnifier.zoomFactor.toFixed(1)}x
                    </span>
                    <button
                      className={`${isMobile ? "w-8 h-8" : "w-4 h-4"} flex items-center justify-center bg-gray-700 rounded-sm`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleZoomChange(0.5)
                      }}
                      disabled={magnifier.zoomFactor >= 5}
                    >
                      <Plus size={isMobile ? 16 : 10} className="text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Border width controls */}
                <div className="flex items-center justify-between">
                  <span className={`${isMobile ? "text-xs" : "text-[10px]"} text-gray-300 font-mono`}>Border</span>
                  <div className="flex items-center">
                    <button
                      className={`${isMobile ? "w-8 h-8" : "w-4 h-4"} flex items-center justify-center bg-gray-700 rounded-sm`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleBorderWidthChange(Math.max(1, magnifier.borderWidth - 1))
                      }}
                      disabled={magnifier.borderWidth <= 1}
                    >
                      <Minus size={isMobile ? 16 : 10} className="text-gray-300" />
                    </button>
                    <span
                      className={`mx-1 ${isMobile ? "text-xs" : "text-[10px]"} text-gray-300 font-mono w-10 text-center`}
                    >
                      {magnifier.borderWidth}px
                    </span>
                    <button
                      className={`${isMobile ? "w-8 h-8" : "w-4 h-4"} flex items-center justify-center bg-gray-700 rounded-sm`}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        handleBorderWidthChange(magnifier.borderWidth + 1)
                      }}
                      disabled={magnifier.borderWidth >= 10}
                    >
                      <Plus size={isMobile ? 16 : 10} className="text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Color picker - Fixed alignment */}
                <div className="flex items-center justify-between">
                  <span className={`${isMobile ? "text-xs" : "text-[10px]"} text-gray-300 font-mono`}>Color</span>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex flex-wrap justify-end gap-0.5">
                      {colorOptions.slice(0, 5).map((color, index) => {
                        const isColorObject = typeof color === "object"
                        const colorValue = isColorObject ? color.value : color
                        const isGradient = isColorObject ? color.isGradient : false

                        return (
                          <button
                            key={index}
                            className={`w-3 h-3 rounded-full mx-0.5 ${colorValue === "#FFFFFF" ? "border border-gray-600" : ""} ${magnifier.borderColor === colorValue ? "ring-1 ring-blue-500" : ""}`}
                            style={{ background: colorValue }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleBorderColorChange(colorValue, isGradient)
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                          />
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap justify-end gap-0.5">
                      {colorOptions.slice(5).map((color, index) => {
                        const isColorObject = typeof color === "object"
                        const colorValue = isColorObject ? color.value : color
                        const isGradient = isColorObject ? color.isGradient : false

                        return (
                          <button
                            key={index + 5}
                            className={`w-3 h-3 rounded-full mx-0.5 ${colorValue === "#FFFFFF" ? "border border-gray-600" : ""} ${magnifier.borderColor === colorValue ? "ring-1 ring-blue-500" : ""}`}
                            style={{ background: colorValue }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleBorderColorChange(colorValue, isGradient)
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                            }}
                          />
                        )
                      })}
                      <div className="relative w-3 h-3 mx-0.5">
                        <div className="absolute inset-0 rounded-full border border-dashed border-gray-400 pointer-events-none"></div>
                        <input
                          type="color"
                          className="w-3 h-3 opacity-0 cursor-pointer"
                          value={magnifier.borderColor.startsWith("#") ? magnifier.borderColor : "#FFFFFF"}
                          onChange={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleBorderColorChange(e.target.value)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resize handles */}
            {magnifier.selected && (
              <>
                <div
                  ref={(el) => (resizeHandleRefs.current[0] = el)}
                  className={`absolute bg-white border border-blue-500 rounded-sm cursor-nwse-resize z-10 ${
                    isMobile ? "w-6 h-6" : "w-2 h-2"
                  }`}
                  style={{
                    top: magnifier.y - magnifier.size / 2 - (isMobile ? 8 : 3),
                    left: magnifier.x - magnifier.size / 2 - (isMobile ? 8 : 3),
                  }}
                  onMouseDown={(e) => handleResizeStart(e, "topLeft")}
                  onTouchStart={(e) => handleResizeTouchStart(e, "topLeft")}
                />
                <div
                  ref={(el) => (resizeHandleRefs.current[1] = el)}
                  className={`absolute bg-white border border-blue-500 rounded-sm cursor-nesw-resize z-10 ${
                    isMobile ? "w-6 h-6" : "w-2 h-2"
                  }`}
                  style={{
                    top: magnifier.y - magnifier.size / 2 - (isMobile ? 8 : 3),
                    left: magnifier.x + magnifier.size / 2 - (isMobile ? 8 : 3),
                  }}
                  onMouseDown={(e) => handleResizeStart(e, "topRight")}
                  onTouchStart={(e) => handleResizeTouchStart(e, "topRight")}
                />
                <div
                  ref={(el) => (resizeHandleRefs.current[2] = el)}
                  className={`absolute bg-white border border-blue-500 rounded-sm cursor-nesw-resize z-10 ${
                    isMobile ? "w-6 h-6" : "w-2 h-2"
                  }`}
                  style={{
                    top: magnifier.y + magnifier.size / 2 - (isMobile ? 8 : 3),
                    left: magnifier.x - magnifier.size / 2 - (isMobile ? 8 : 3),
                  }}
                  onMouseDown={(e) => handleResizeStart(e, "bottomLeft")}
                  onTouchStart={(e) => handleResizeTouchStart(e, "bottomLeft")}
                />
                <div
                  ref={(el) => (resizeHandleRefs.current[3] = el)}
                  className={`absolute bg-white border border-blue-500 rounded-sm cursor-nwse-resize z-10 ${
                    isMobile ? "w-6 h-6" : "w-2 h-2"
                  }`}
                  style={{
                    top: magnifier.y + magnifier.size / 2 - (isMobile ? 8 : 3),
                    left: magnifier.x + magnifier.size / 2 - (isMobile ? 8 : 3),
                  }}
                  onMouseDown={(e) => handleResizeStart(e, "bottomRight")}
                  onTouchStart={(e) => handleResizeTouchStart(e, "bottomRight")}
                />
              </>
            )}
          </>
        )}
      </div>
      {preview && (
        <div className="fixed bottom-4 right-4 flex items-center space-x-3 z-30">
          <button
            onClick={copyToClipboard}
            className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gray-700 transition-colors relative"
            title="Copy to clipboard"
          >
            <Clipboard size={16} />
            {showCopyTooltip && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap animate-fade-in-out">
                Copied to clipboard!
              </div>
            )}
          </button>
          <button
            onClick={captureScreenshot}
            className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gray-700 transition-colors relative"
            title="Download screenshot"
          >
            <Download size={16} />
            {showDownloadTooltip && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap animate-fade-in-out">
                Downloaded!
              </div>
            )}
          </button>
          <button
            onClick={clearAll}
            className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-gray-700 transition-colors font-mono"
            title="Clear all"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  )
}

