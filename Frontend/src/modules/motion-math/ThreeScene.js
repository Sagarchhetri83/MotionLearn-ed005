import * as THREE from 'three';

export class ThreeScene {
  constructor(container, onAnswerHover, onAnswerSelect) {
    this.container = container;
    this.onAnswerHover = onAnswerHover;
    this.onAnswerSelect = onAnswerSelect;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.answerSpheres = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredSphere = null;
    this.hoverStartTime = null;
    this.hoverDuration = 2000;
    this.animationId = null;
    this.isActive = false;
    this.handCursor = null;
    
    this.init();
  }
  
  init() {
    // Scene
    this.scene = new THREE.Scene();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    
    // Create hand cursor indicator
    const cursorGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const cursorMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff00ff,
      transparent: true,
      opacity: 0.8
    });
    this.handCursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.handCursor.visible = false;
    this.scene.add(this.handCursor);
    
    // Resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    
    this.isActive = true;
    this.animate();
  }
  
  createNumberTexture(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#4FC3F7');
    gradient.addColorStop(1, '#0288D1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Add border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.stroke();
    
    // Text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 128, 128);
    
    return new THREE.CanvasTexture(canvas);
  }
  
  createAnswerSpheres(options, correctAnswer) {
    this.clearAnswerSpheres();
    
    const spacing = 3;
    const startX = -(spacing * (options.length - 1)) / 2;
    
    options.forEach((number, index) => {
      const geometry = new THREE.SphereGeometry(1.2, 32, 32);
      const texture = this.createNumberTexture(number);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x222266,
        emissiveIntensity: 0.2
      });
      
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(startX + (index * spacing), 0, 0);
      sphere.userData = {
        number: number,
        isCorrect: number === correctAnswer,
        originalY: 0,
        originalScale: 1,
        index: index
      };
      
      this.scene.add(sphere);
      this.answerSpheres.push(sphere);
    });
  }
  
  clearAnswerSpheres() {
    this.answerSpheres.forEach(sphere => {
      sphere.geometry.dispose();
      sphere.material.map.dispose();
      sphere.material.dispose();
      this.scene.remove(sphere);
    });
    this.answerSpheres = [];
    this.hoveredSphere = null;
    this.hoverStartTime = null;
  }
  
  updateMousePosition(x, y) {
    this.mouse.x = (x * 2) - 1;
    this.mouse.y = -(y * 2) + 1;
    
    // Update hand cursor position
    if (this.handCursor) {
      this.handCursor.visible = true;
      // Convert screen coordinates to 3D position
      const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      this.handCursor.position.copy(pos);
    }
  }
  
  checkHover() {
    if (this.answerSpheres.length === 0) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.answerSpheres);
    
    if (intersects.length > 0) {
      const sphere = intersects[0].object;
      
      if (this.hoveredSphere !== sphere) {
        // Reset previous
        if (this.hoveredSphere) {
          this.hoveredSphere.scale.set(1, 1, 1);
          this.hoveredSphere.material.emissive.setHex(0x222266);
        }
        
        // New hover
        this.hoveredSphere = sphere;
        this.hoverStartTime = Date.now();
        
        if (this.onAnswerHover) {
          this.onAnswerHover(sphere.userData.number);
        }
      }
      
      // Check hover duration
      if (this.hoverStartTime) {
        const elapsed = Date.now() - this.hoverStartTime;
        const progress = Math.min(elapsed / this.hoverDuration, 1);
        
        // Scale effect with progress
        const scale = 1 + (progress * 0.4);
        sphere.scale.set(scale, scale, scale);
        
        // Color change based on progress
        const greenIntensity = Math.floor(progress * 255);
        sphere.material.emissive.setRGB(0, greenIntensity / 255, 0);
        
        // Selection
        if (progress >= 1 && this.onAnswerSelect) {
          this.onAnswerSelect(sphere.userData.number, sphere.userData.isCorrect);
          this.hoverStartTime = null;
        }
      }
    } else {
      // No hover
      if (this.hoveredSphere) {
        this.hoveredSphere.scale.set(1, 1, 1);
        this.hoveredSphere.material.emissive.setHex(0x222266);
        this.hoveredSphere = null;
        this.hoverStartTime = null;
      }
    }
  }
  
  animate() {
    if (!this.isActive) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const time = Date.now() * 0.001;
    
    // Animate spheres
    this.answerSpheres.forEach((sphere, index) => {
      // Enhanced float animation - more visible movement
      sphere.position.y = Math.sin(time + index * 0.8) * 0.3;
      
      // Rotation
      sphere.rotation.y += 0.015;
      sphere.rotation.x = Math.sin(time * 0.5 + index) * 0.1;
      
      // Pulsing glow effect
      if (sphere.material.emissiveIntensity !== undefined) {
        sphere.material.emissiveIntensity = 0.2 + Math.sin(time * 2 + index) * 0.1;
      }
    });
    
    // Animate hand cursor
    if (this.handCursor && this.handCursor.visible) {
      const pulse = 1 + Math.sin(time * 5) * 0.3;
      this.handCursor.scale.set(pulse, pulse, pulse);
    }
    
    this.checkHover();
    this.renderer.render(this.scene, this.camera);
  }
  
  handleResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  showQuestion(questionText) {
    // Question will be shown in UI, not in 3D
  }
  
  destroy() {
    this.isActive = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.handleResize);
    
    this.clearAnswerSpheres();
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
