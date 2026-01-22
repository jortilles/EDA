import { Component, type ElementRef, OnInit, ViewChild, type AfterViewInit, type OnDestroy } from "@angular/core"

interface Particle {
    x: number
    y: number
    size: number
    speedX: number
    speedY: number
    opacity: number
}

@Component({
    selector: "app-particles-background",
    standalone: true,
    template: "<canvas #particlesCanvas></canvas>",
    styles: [
        `
    canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom right, #EBF4FF, #FFFFFF, #EBF4FF);
    }
  `,
    ],
})
export class ParticlesBackgroundComponent implements AfterViewInit, OnDestroy {
    @ViewChild("particlesCanvas") canvasRef!: ElementRef<HTMLCanvasElement>
    private ctx!: CanvasRenderingContext2D
    private animationFrameId: number | null = null
    private particles: Particle[] = []

    ngAfterViewInit() {
        const canvas = this.canvasRef.nativeElement
        this.ctx = canvas.getContext("2d")!

        this.setCanvasSize()
        window.addEventListener("resize", this.setCanvasSize.bind(this))

        this.initParticles()
        this.animate()
    }

    ngOnDestroy() {
        window.removeEventListener("resize", this.setCanvasSize.bind(this))
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
        }
    }

    private setCanvasSize() {
        const canvas = this.canvasRef.nativeElement
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
    }

    private initParticles() {
        const particleCount = 100
        const canvas = this.canvasRef.nativeElement

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 6 + 2,
                speedX: Math.random() * 0.4 - 0.15,
                speedY: Math.random() * 0.4 - 0.15,
                opacity: Math.random() * 0.5 + 0.2,
            })
        }
    }

    private animate() {
        const canvas = this.canvasRef.nativeElement
        this.ctx.clearRect(0, 0, canvas.width, canvas.height)

        this.particles.forEach((particle) => {
            particle.x += particle.speedX
            particle.y += particle.speedY

            if (particle.x < 0) particle.x = canvas.width
            if (particle.x > canvas.width) particle.x = 0
            if (particle.y < 0) particle.y = canvas.height
            if (particle.y > canvas.height) particle.y = 0

            this.ctx.beginPath()
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
            this.ctx.fillStyle = `hsla(210, 80%, 50%, ${particle.opacity})`
            this.ctx.fill()

            this.particles.forEach((otherParticle) => {
                const dx = particle.x - otherParticle.x
                const dy = particle.y - otherParticle.y
                const distance = Math.sqrt(dx * dx + dy * dy)

                if (distance < 150) {
                    this.ctx.beginPath()
                    this.ctx.strokeStyle = `hsla(210, 80%, 50%, ${0.1 * (1 - distance / 150)})`
                    this.ctx.lineWidth = 0.8
                    this.ctx.moveTo(particle.x, particle.y)
                    this.ctx.lineTo(otherParticle.x, otherParticle.y)
                    this.ctx.stroke()
                }
            })
        })

        this.animationFrameId = requestAnimationFrame(() => this.animate())
    }
}

