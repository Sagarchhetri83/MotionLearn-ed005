export class GestureController {
  constructor(videoElement, onHandUpdate) {
    this.videoElement = videoElement;
    this.onHandUpdate = onHandUpdate;
    this.hands = null;
    this.camera = null;
    this.isActive = false;
  }
  
  async init() {
    try {
      // Wait for MediaPipe to load
      await this.waitForMediaPipe();
      
      const { Hands, Camera } = window;
      
      if (!Hands || !Camera) {
        throw new Error('MediaPipe not loaded');
      }
      
      // Initialize MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      this.hands.onResults((results) => this.onResults(results));
      
      // Start camera
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isActive && this.hands) {
            await this.hands.send({ image: this.videoElement });
          }
        },
        width: 1280,
        height: 720
      });
      
      this.isActive = true;
      await this.camera.start();
      
      return true;
    } catch (error) {
      console.error('GestureController init error:', error);
      return false;
    }
  }
  
  waitForMediaPipe(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (window.Hands && window.Camera) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('MediaPipe loading timeout'));
        } else {
          setTimeout(check, 100);
        }
      };
      
      check();
    });
  }
  
  onResults(results) {
    if (!this.isActive) return;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Get index finger tip (landmark 8)
      const indexTip = landmarks[8];
      
      if (this.onHandUpdate) {
        this.onHandUpdate({
          x: indexTip.x,
          y: indexTip.y,
          z: indexTip.z,
          landmarks: landmarks
        });
      }
    }
  }
  
  stop() {
    this.isActive = false;
    
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    
    this.hands = null;
  }
}
