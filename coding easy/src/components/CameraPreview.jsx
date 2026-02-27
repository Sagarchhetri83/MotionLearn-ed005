import React, { useEffect, useRef } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const CameraPreview = ({ onGesture }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Use a ref to store the latest callback to avoid stale closures
    const onGestureRef = useRef(onGesture);

    useEffect(() => {
        onGestureRef.current = onGesture;
    }, [onGesture]);

    useEffect(() => {
        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        hands.onResults(onResults);

        let camera = null;
        if (videoRef.current) {
            camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (videoRef.current) await hands.send({ image: videoRef.current });
                },
                width: 320,
                height: 240
            });
            camera.start();
        }

        return () => {
            if (camera) camera.stop();
        };
    }, []);

    const detectGesture = (landmarks) => {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];

        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        const indexExt = dist(indexTip, wrist) > 0.3;
        const middleExt = dist(middleTip, wrist) > 0.3;
        const ringExt = dist(ringTip, wrist) > 0.3;
        const pinkyExt = dist(pinkyTip, wrist) > 0.3;

        const indexCurled = dist(indexTip, wrist) < 0.25;
        const middleCurled = dist(middleTip, wrist) < 0.25;
        const ringCurled = dist(ringTip, wrist) < 0.25;
        const pinkyCurled = dist(pinkyTip, wrist) < 0.25;

        // TWO FINGERS (Victory/Peace: Index & Middle UP, others DOWN)
        if (indexExt && middleExt && ringCurled && pinkyCurled) {
            return 'TWO_FINGERS';
        }

        // FIST Check (Index, Middle, Ring, Pinky curled)
        // Note: We use the `allCurled` logic to determine if it's a Fist-like shape
        const tips = [indexTip, middleTip, ringTip, pinkyTip];
        const allCurled = tips.every(tip => dist(tip, wrist) < 0.4); // Slightly increased threshold for flexibility

        if (allCurled) {
            // THUMB UP: Thumb Tip is HIGHER (lower Y value) than Wrist
            if (thumbTip.y < wrist.y - 0.05) return 'THUMB_UP';

            // THUMB DOWN: Thumb Tip is LOWER (higher Y value) than Wrist
            if (thumbTip.y > wrist.y + 0.05) return 'THUMB_DOWN';

            return 'FIST';
        }

        // PINCH
        if (dist(thumbTip, indexTip) < 0.05) return 'PINCH';

        // OPEN HAND
        if (tips.every(tip => dist(tip, wrist) > 0.35)) return 'OPEN';

        return 'NEUTRAL';
    };

    const onResults = (results) => {
        if (!canvasRef.current) return;
        const canvasCtx = canvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, width, height);
        canvasCtx.drawImage(results.image, 0, 0, width, height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });

            const gesture = detectGesture(landmarks);
            const cursorY = landmarks[8].y;

            canvasCtx.fillStyle = 'red';
            canvasCtx.font = '20px Arial';
            canvasCtx.fillText(gesture, 10, 30);

            // Call the latest onGesture from the ref
            if (onGestureRef.current) {
                onGestureRef.current({ gesture, cursorY });
            }
        }
        canvasCtx.restore();
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <video ref={videoRef} className="hidden" style={{ display: 'none' }} />
            <canvas
                ref={canvasRef}
                width={320}
                height={240}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} // Mirror effect
            />
        </div>
    );
};

export default CameraPreview;
