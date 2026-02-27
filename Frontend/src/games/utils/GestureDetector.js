/**
 * GestureDetector - Utility for detecting hand gestures from MediaPipe landmarks
 */

export class GestureDetector {
  constructor(canvasWidth = 1280, canvasHeight = 720) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Get finger tip position
   * @param {Array} landmarks - Hand landmarks from MediaPipe
   * @param {number} fingerIndex - 0:Thumb, 1:Index, 2:Middle, 3:Ring, 4:Pinky
   */
  getFingerTip(landmarks, fingerIndex) {
    if (!landmarks) return null;
    
    const tipIndices = [4, 8, 12, 16, 20];
    const tip = landmarks[tipIndices[fingerIndex]];
    
    return {
      x: tip.x * this.canvasWidth,
      y: tip.y * this.canvasHeight,
      z: tip.z
    };
  }

  /**
   * Get all finger tips
   */
  getAllFingerTips(landmarks) {
    if (!landmarks) return null;
    
    return {
      thumb: this.getFingerTip(landmarks, 0),
      index: this.getFingerTip(landmarks, 1),
      middle: this.getFingerTip(landmarks, 2),
      ring: this.getFingerTip(landmarks, 3),
      pinky: this.getFingerTip(landmarks, 4)
    };
  }

  /**
   * Detect pinch gesture (thumb + index finger)
   */
  isPinching(landmarks, threshold = 30) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const thumb = landmarks[4];
    const index = landmarks[8];
    
    const distance = Math.sqrt(
      Math.pow((thumb.x - index.x) * this.canvasWidth, 2) +
      Math.pow((thumb.y - index.y) * this.canvasHeight, 2)
    );
    
    return distance < threshold;
  }

  /**
   * Detect pointing gesture (index finger extended)
   */
  isPointing(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    // Check if index finger is extended
    const indexTip = landmarks[8];
    const indexMiddle = landmarks[6];
    const indexBase = landmarks[5];
    
    // Index should be extended (tip further than base in y)
    const indexExtended = indexTip.y < indexBase.y;
    
    // Other fingers should be closed
    const middleClosed = landmarks[12].y > landmarks[10].y;
    const ringClosed = landmarks[16].y > landmarks[14].y;
    const pinkyClosed = landmarks[20].y > landmarks[18].y;
    
    return indexExtended && middleClosed && ringClosed && pinkyClosed;
  }

  /**
   * Detect open palm (all fingers extended)
   */
  isOpenPalm(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const fingertips = [8, 12, 16, 20]; // Index, middle, ring, pinky tips
    const bases = [5, 9, 13, 17]; // Their bases
    
    let extendedCount = 0;
    for (let i = 0; i < fingertips.length; i++) {
      if (landmarks[fingertips[i]].y < landmarks[bases[i]].y) {
        extendedCount++;
      }
    }
    
    return extendedCount >= 3; // At least 3 fingers extended
  }

  /**
   * Detect closed fist
   */
  isClosedFist(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const fingertips = [8, 12, 16, 20];
    const bases = [5, 9, 13, 17];
    
    let closedCount = 0;
    for (let i = 0; i < fingertips.length; i++) {
      if (landmarks[fingertips[i]].y > landmarks[bases[i]].y) {
        closedCount++;
      }
    }
    
    return closedCount >= 3;
  }

  /**
   * Detect thumbs up
   */
  isThumbsUp(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[2];
    const wrist = landmarks[0];
    
    // Thumb should be extended upward
    const thumbUp = thumbTip.y < wrist.y;
    
    // Other fingers closed
    const fist = this.isClosedFist(landmarks);
    
    return thumbUp && fist;
  }

  /**
   * Detect peace sign (index + middle extended)
   */
  isPeaceSign(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const indexExtended = landmarks[8].y < landmarks[6].y;
    const middleExtended = landmarks[12].y < landmarks[10].y;
    const ringClosed = landmarks[16].y > landmarks[14].y;
    const pinkyClosed = landmarks[20].y > landmarks[18].y;
    
    return indexExtended && middleExtended && ringClosed && pinkyClosed;
  }

  /**
   * Check if point is near finger (for collision detection)
   */
  isNearFinger(x, y, landmarks, fingerIndex = 1, threshold = 50) {
    const fingerTip = this.getFingerTip(landmarks, fingerIndex);
    if (!fingerTip) return false;
    
    const distance = Math.sqrt(
      Math.pow(x - fingerTip.x, 2) +
      Math.pow(y - fingerTip.y, 2)
    );
    
    return distance < threshold;
  }

  /**
   * Get hand velocity (requires previous landmarks)
   */
  getHandVelocity(currentLandmarks, previousLandmarks, deltaTime) {
    if (!currentLandmarks || !previousLandmarks) return { x: 0, y: 0 };
    
    const current = currentLandmarks[0]; // Wrist
    const previous = previousLandmarks[0];
    
    return {
      x: ((current.x - previous.x) * this.canvasWidth) / deltaTime,
      y: ((current.y - previous.y) * this.canvasHeight) / deltaTime
    };
  }

  /**
   * Detect swipe gesture
   */
  detectSwipe(velocity, threshold = 500) {
    const absX = Math.abs(velocity.x);
    const absY = Math.abs(velocity.y);
    
    if (absX > threshold && absX > absY) {
      return velocity.x > 0 ? 'right' : 'left';
    } else if (absY > threshold && absY > absX) {
      return velocity.y > 0 ? 'down' : 'up';
    }
    
    return null;
  }
}
