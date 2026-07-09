import { useEffect, useRef } from 'react';

/**
 * SeasonalCanvas - Component rendering background particle weather effects based on seasonal themes.
 * 
 * Themes supported:
 * - 'spring': Soft pink cherry blossom petals (hoa anh đào) drifting gently.
 * - 'summer': Warm golden sunbeams/light dust floating upwards.
 * - 'autumn': Falling golden-orange maple leaves (lá phong) swaying and rotating.
 * - 'winter': Soft minty white snowflakes (tuyết rơi) falling down.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.theme - Current seasonal theme ('spring', 'summer', 'autumn', 'winter').
 */
function SeasonalCanvas({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class definition
    class Particle {
      constructor(isInitial = false) {
        this.reset(isInitial);
      }

      reset(isInitial = false) {
        this.size = Math.random() * 8 + 4; // Particle size
        
        // Spawn coordinates
        this.x = Math.random() * width;
        // If initial, scatter across vertical screen, else spawn at top/bottom border depending on theme
        if (isInitial) {
          this.y = Math.random() * height;
        } else {
          this.y = theme === 'summer' ? height + 20 : -20;
        }

        // Particle speed configuration based on theme
        if (theme === 'spring') {
          // Spring: Cherry blossoms drift down and to the right
          this.vx = Math.random() * 1.5 + 0.5;
          this.vy = Math.random() * 1.2 + 0.8;
          this.color = `rgba(255, ${Math.floor(Math.random() * 40 + 175)}, ${Math.floor(Math.random() * 30 + 195)}, ${Math.random() * 0.4 + 0.35})`;
          this.angle = Math.random() * Math.PI * 2;
          this.spin = (Math.random() - 0.5) * 0.02;
          this.swayFrequency = Math.random() * 0.01 + 0.005;
          this.swayTime = Math.random() * 100;
        } else if (theme === 'summer') {
          // Summer: Warm glowing dust floating upwards
          this.vx = (Math.random() - 0.5) * 0.4;
          this.vy = -(Math.random() * 0.5 + 0.3); // float up
          this.size = Math.random() * 14 + 6;
          this.opacity = Math.random() * 0.35 + 0.15;
          this.pulseSpeed = Math.random() * 0.01 + 0.005;
          this.pulseTime = Math.random() * 100;
        } else if (theme === 'autumn') {
          // Autumn: Falling leaves, sway and rotate
          this.vx = (Math.random() - 0.5) * 0.8;
          this.vy = Math.random() * 1.0 + 0.8;
          
          // Leaf colors (warm golden oranges, reds, dark amber)
          const leafColors = [
            `rgba(245, 158, 11, ${Math.random() * 0.4 + 0.35})`, // Amber
            `rgba(217, 119, 6, ${Math.random() * 0.4 + 0.35})`,  // Dark Orange
            `rgba(239, 68, 68, ${Math.random() * 0.3 + 0.3})`,   // Soft Red
            `rgba(251, 191, 36, ${Math.random() * 0.4 + 0.35})`  // Warm Yellow
          ];
          this.color = leafColors[Math.floor(Math.random() * leafColors.length)];
          this.angle = Math.random() * Math.PI * 2;
          this.spin = (Math.random() - 0.5) * 0.025;
          this.swayFrequency = Math.random() * 0.015 + 0.005;
          this.swayTime = Math.random() * 100;
          this.widthRatio = Math.random() * 0.4 + 0.6;
        } else {
          // Winter: Soft white minty snowflakes falling down
          this.vx = (Math.random() - 0.5) * 0.6;
          this.vy = Math.random() * 0.8 + 0.6;
          this.opacity = Math.random() * 0.45 + 0.25;
          this.swayFrequency = Math.random() * 0.02 + 0.005;
          this.swayTime = Math.random() * 100;
        }
      }

      update() {
        if (theme === 'spring') {
          // Spring update: Drift with wind + sway
          this.swayTime += this.swayFrequency;
          this.x += this.vx + Math.sin(this.swayTime) * 0.3;
          this.y += this.vy;
          this.angle += this.spin;

          // Recycle if out of bounds
          if (this.y > height + 20 || this.x > width + 20) {
            this.reset();
          }
        } else if (theme === 'summer') {
          // Summer update: Float up + pulse size & opacity
          this.pulseTime += this.pulseSpeed;
          this.x += this.vx;
          this.y += this.vy;
          this.currentOpacity = this.opacity + Math.sin(this.pulseTime) * 0.1;
          this.currentOpacity = Math.max(0.02, Math.min(this.currentOpacity, 0.6));

          // Recycle if floated off top or sides
          if (this.y < -30 || this.x < -30 || this.x > width + 30) {
            this.reset();
          }
        } else if (theme === 'autumn') {
          // Autumn update: Fall + sway + rotate
          this.swayTime += this.swayFrequency;
          this.x += this.vx + Math.sin(this.swayTime) * 0.5;
          this.y += this.vy;
          this.angle += this.spin;

          // Recycle if out of bounds
          if (this.y > height + 20 || this.x > width + 20 || this.x < -20) {
            this.reset();
          }
        } else {
          // Winter update: Fall down + sway
          this.swayTime += this.swayFrequency;
          this.x += this.vx + Math.sin(this.swayTime) * 0.4;
          this.y += this.vy;

          // Recycle if out of bounds
          if (this.y > height + 20 || this.x > width + 20 || this.x < -20) {
            this.reset();
          }
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (theme === 'spring') {
          // Spring: Draw cherry blossom petal (soft pink oval/teardrop)
          ctx.rotate(this.angle);
          ctx.beginPath();
          // Draw a curved petal shape
          ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
        } else if (theme === 'summer') {
          // Summer: Draw a soft glowing sunbeam particle
          ctx.beginPath();
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
          // Pure warm yellow / golden glow
          grad.addColorStop(0, `rgba(253, 224, 71, ${this.currentOpacity})`);
          grad.addColorStop(0.3, `rgba(253, 224, 71, ${this.currentOpacity * 0.4})`);
          grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = grad;
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme === 'autumn') {
          // Autumn: Draw a curved maple leaf shape
          ctx.rotate(this.angle);
          ctx.beginPath();
          const w = this.size;
          const h = this.size * this.widthRatio;
          
          // Draw leaf using bezier curves
          ctx.moveTo(0, -h);
          ctx.quadraticCurveTo(w * 0.8, -h * 0.2, 0, h);
          ctx.quadraticCurveTo(-w * 0.8, -h * 0.2, 0, -h);
          
          ctx.fillStyle = this.color;
          ctx.fill();
          
          // Draw leaf stem
          ctx.beginPath();
          ctx.moveTo(0, h * 0.8);
          ctx.lineTo(0, h * 1.3);
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Winter: Draw a soft mint/white snowflake
          ctx.beginPath();
          ctx.arc(0, 0, this.size * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240, 253, 250, ${this.opacity})`; // Mint white
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // Initialize particles
    const particleCount = theme === 'summer' ? 25 : 35; // Lower count for summer glow, optimal for performance
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(true)); // initial scatter
    }

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Re-initialize particles to scatter across resized canvas
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(true));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0, // Behind dashboard cards, headers and sidebar, but in front of body gradients
        mixBlendMode: theme === 'summer' ? 'screen' : 'normal'
      }}
    />
  );
}

export default SeasonalCanvas;
