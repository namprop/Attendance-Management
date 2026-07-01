import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Row, Col, Button, message, Popconfirm, Spin } from 'antd';
import { ScanFace, CheckCircle, AlertTriangle, ShieldAlert, X, Volume2, VolumeX } from 'lucide-react';
import * as faceapi from "@vladmandic/face-api";
import { Employee, IDuplicateDetails } from '../types';

// ==================== TEXT-TO-SPEECH HELPER ====================
function speak(text: string, lang = 'vi-VN', rate = 1.05, pitch = 1.0) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

function stopSpeak() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
// ================================================================

const FACE_GUIDES = [
  "Nhìn thẳng tự nhiên (Bắt buộc)",
  "Quay đầu sang TRÁI (Bắt buộc)",
  "Quay đầu sang PHẢI (Bắt buộc)",
  "Ngước đầu lên TRÊN (Bắt buộc)",
  "Cúi đầu xuống DƯỚI (Bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)",
  "Góc tự do (Không bắt buộc)"
];

// Câu thông báo giọng nói cho từng góc
const FACE_VOICE_GUIDES = [
  "Nhìn thẳng vào camera",
  "Quay đầu sang trái",
  "Quay đầu sang phải",
  "Ngước đầu lên trên",
  "Cúi đầu xuống dưới",
  "Góc tự do, đứng thoải mái",
  "Góc tự do, đứng thoải mái",
  "Góc tự do, đứng thoải mái",
  "Góc tự do, đứng thoải mái",
  "Góc tự do, đứng thoải mái"
];

const FACE_SLOT_LABELS = [
  "1. Mặt Chính (Thẳng) *",
  "2. Quay Trái *",
  "3. Quay Phải *",
  "4. Ngước Lên *",
  "5. Cúi Xuống *",
  "6. Tự Do",
  "7. Tự Do",
  "8. Tự Do",
  "9. Tự Do",
  "10. Tự Do"
];

// Số frame liên tiếp đúng tư thế cần đạt để xác nhận (stability buffer)
const STABILITY_FRAMES_REQUIRED = 12; // ~400ms @ 30fps
// Tốc độ tăng progress (mỗi frame hợp lệ)
const PROGRESS_STEP = 100 / STABILITY_FRAMES_REQUIRED;
// Tốc độ giảm progress khi sai tư thế (decay, không reset về 0 đột ngột)
const PROGRESS_DECAY = PROGRESS_STEP * 1.2;

interface FaceIdEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmp: Employee | null;
  onSuccess: () => void;
}

export const FaceIdEnrollModal: React.FC<FaceIdEnrollModalProps> = ({
  isOpen,
  onClose,
  targetEmp,
  onSuccess
}) => {
  const [faceEnrollStep, setFaceEnrollStep] = useState(1);
  const [faceSlots, setFaceSlots] = useState<{ index: number; faceVector: number[]; createdAt: string }[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isAutoScanning, setIsAutoScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isAiWarmingUp, setIsAiWarmingUp] = useState(true);

  const [duplicateErrorMsg, setDuplicateErrorMsg] = useState("");
  const [duplicateDetails, setDuplicateDetails] = useState<IDuplicateDetails['duplicateEmployee'] | null>(null);
  const [currentAngleLabel, setCurrentAngleLabel] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceEnabledRef = useRef(true);
  // State dành cho render (không dùng ref trực tiếp trong JSX)
  const [currentSlotDisplay, setCurrentSlotDisplay] = useState(0); // mirror currentSlotIndexRef
  const [isCalibrated, setIsCalibrated] = useState(false); // true khi baselinePitchRef đã có giá trị
  const [completedSlots, setCompletedSlots] = useState<Set<number>>(new Set()); // các slot đã capture
  // Toast thông báo góc trượt từ trên xuống
  const [angleToast, setAngleToast] = useState<{ text: string; emoji: string } | null>(null);
  const angleToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeSpeak = useCallback((text: string) => {
    if (voiceEnabledRef.current) speak(text);
  }, []);

  // Emoji map cho từng slot
  const ANGLE_TOAST_MAP: { text: string; emoji: string }[] = [
    { text: 'Nhìn thẳng vào camera', emoji: '😐' },
    { text: 'Quay đầu sang TRÁI', emoji: '👈' },
    { text: 'Quay đầu sang PHẢI', emoji: '👉' },
    { text: 'Ngước đầu lên TRÊN', emoji: '⬆️' },
    { text: 'Cúi đầu xuống nhẹ', emoji: '⬇️' },
    { text: 'Tư thế tự do', emoji: '🙂' },
    { text: 'Tư thế tự do', emoji: '🙂' },
    { text: 'Tư thế tự do', emoji: '🙂' },
    { text: 'Tư thế tự do', emoji: '🙂' },
    { text: 'Tư thế tự do', emoji: '🙂' },
  ];

  const showAngleToast = useCallback((slotIdx: number) => {
    if (angleToastTimerRef.current) clearTimeout(angleToastTimerRef.current);
    setAngleToast(ANGLE_TOAST_MAP[slotIdx] ?? { text: 'Tư thế tiếp theo', emoji: '🙂' });
    angleToastTimerRef.current = setTimeout(() => setAngleToast(null), 2800);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentSlotIndexRef = useRef(0);
  const scanProgressRef = useRef(0);
  const hasConfirmedForceRef = useRef(false);
  const capturedVectorsRef = useRef<{ [key: number]: number[] }>({});
  const isMountedRef = useRef(false);

  // Calibration refs cho pitch (góc lên/xuống)
  const baselinePitchRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const CALIBRATION_SAMPLES = 8; // Lấy trung bình 8 frame mặt thẳng để tính baseline pitch

  const [isSavingAll, setIsSavingAll] = useState(false);

  const fetchFaceSlots = useCallback(async (empId: string) => {
    try {
      const res = await fetch(`/api/v1/employees/${empId}/face`);
      const data = await res.json();
      if (res.ok && data.data && data.data.slots) {
        const mappedSlots = (data.data.slots as boolean[])
          .map((isEnrolled, idx) => isEnrolled ? { index: idx } : null)
          .filter(Boolean);
        setFaceSlots(mappedSlots as { index: number; faceVector: number[]; createdAt: string }[]);
      } else {
        setFaceSlots([]);
      }
    } catch (err) {
      console.error(err);
      setFaceSlots([]);
    }
  }, []);

  const setupCamera = useCallback(async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      setIsModelLoaded(true);
      // Thông báo AI đã sẵn sàng
      setTimeout(() => safeSpeak('Hệ thống đã sẵn sàng. Nhấn bắt đầu để quét khuôn mặt.'), 300);
    } catch (err) {
      console.error("Lỗi tải model:", err);
      message.error("Lỗi tải AI Model sinh trắc học.");
    }
  }, [safeSpeak]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && targetEmp) {
      setTimeout(() => {
        setFaceEnrollStep(1);
        fetchFaceSlots(targetEmp.id);
        setupCamera();
      }, 0);
    } else {
      stopCamera();
    }
  }, [isOpen, targetEmp, fetchFaceSlots, setupCamera, stopCamera]);

  const handleClose = () => {
    isMountedRef.current = false;
    stopCamera();
    stopSpeak();
    setDuplicateErrorMsg("");
    setDuplicateDetails(null);
    hasConfirmedForceRef.current = false;
    baselinePitchRef.current = null;
    calibrationSamplesRef.current = [];
    onClose();
  };

  const deleteFaceSlot = async (slotIdx: number) => {
    if (!targetEmp) return;
    try {
      message.loading({ content: "Đang xóa Face ID...", key: 'deleting_slot' });
      const res = await fetch(`/api/v1/employees/${targetEmp.id}/face?index=${slotIdx}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        message.success({ content: `Đã xóa Face ID tại Slot ${slotIdx + 1} thành công!`, key: 'deleting_slot' });
        await fetchFaceSlots(targetEmp.id);
        onSuccess();
      } else {
        message.error({ content: data.message || "Lỗi khi xóa Face ID.", key: 'deleting_slot' });
      }
    } catch (err) {
      console.error(err);
      message.error({ content: "Lỗi kết nối khi xóa Face ID.", key: 'deleting_slot' });
    }
  };

  const deleteAllFaceSlots = async () => {
    if (!targetEmp) return;
    try {
      message.loading({ content: "Đang xóa toàn bộ Face ID...", key: 'deleting_all_slots' });
      const res = await fetch(`/api/v1/employees/${targetEmp.id}/face?index=all`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        message.success({ content: `Đã xóa toàn bộ Face ID thành công!`, key: 'deleting_all_slots' });
        await fetchFaceSlots(targetEmp.id);
        onSuccess();
      } else {
        message.error({ content: data.message || "Lỗi khi xóa Face ID.", key: 'deleting_all_slots' });
      }
    } catch (err) {
      console.error(err);
      message.error({ content: "Lỗi kết nối khi xóa Face ID.", key: 'deleting_all_slots' });
    }
  };

  const startScanning = async (isResume = false, forceConfirm = false) => {
    if (!isModelLoaded) {
      message.loading("Hệ thống đang tải Mô hình AI Sinh Trắc Học. Xin chờ...");
      return;
    }

    if (!isResume && !forceConfirm) {
      if (isAutoScanning && faceSlots.length > 0) {
        Modal.confirm({
          title: <span className="text-orange-500 font-bold flex items-center gap-2"><AlertTriangle />Cảnh báo ghi đè toàn bộ</span>,
          content: 'Nhân sự này đã có dữ liệu khuôn mặt. Việc "Quét tự động" sẽ quét và lưu đè lại từ đầu đến cuối toàn bộ các góc. Bạn có chắc chắn muốn tiếp tục không?',
          okText: 'Tiếp tục Quét Tự Động',
          cancelText: 'Hủy Bỏ',
          okType: 'danger',
          onOk: () => startScanning(false, true),
        });
        return;
      } else if (!isAutoScanning) {
        const isAlreadyEnrolled = faceSlots.some(s => s.index === selectedSlotIndex);
        if (isAlreadyEnrolled) {
          Modal.confirm({
            title: <span className="text-orange-500 font-bold flex items-center gap-2"><AlertTriangle />Ghi đè dữ liệu cũ</span>,
            content: `Góc mặt số ${selectedSlotIndex + 1} đã được thiết lập trước đó. Bạn có chắc chắn muốn quét lại và ghi đè dữ liệu mới không?`,
            okText: 'Quét Lại Góc Này',
            cancelText: 'Hủy Bỏ',
            okType: 'danger',
            onOk: () => startScanning(false, true),
          });
          return;
        }
      }
    }

    if (!isResume) {
      currentSlotIndexRef.current = isAutoScanning ? 0 : selectedSlotIndex;
      capturedVectorsRef.current = {};
      baselinePitchRef.current = null;
      calibrationSamplesRef.current = [];
      // Reset render states
      setCurrentSlotDisplay(isAutoScanning ? 0 : selectedSlotIndex);
      setIsCalibrated(false);
      setCompletedSlots(new Set());
    }

    scanProgressRef.current = 0;
    setScanProgress(0);
    setIsAiWarmingUp(true);
    setFaceEnrollStep(2);
    setCurrentAngleLabel(FACE_GUIDES[currentSlotIndexRef.current]);

    // Thông báo góc quét đầu tiên
    setTimeout(() => {
      safeSpeak(FACE_VOICE_GUIDES[currentSlotIndexRef.current]);
      showAngleToast(currentSlotIndexRef.current);
    }, 800);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
        });
      } catch (optErr) {
        console.warn("Dự phòng camera...", optErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error(err);
      message.error("Vui lòng cấp quyền truy cập Camera để quét khuôn mặt.");
      setFaceEnrollStep(1);
    }
  };

  /**
   * Tính toán góc đầu (yaw: trái/phải, pitch: lên/xuống) từ landmarks
   * Trả về giá trị chuẩn hóa theo kích thước khuôn mặt (eye distance)
   */
  const getHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const jaw = landmarks.getJawOutline();

    // Điểm tham chiếu chính
    const noseTip = nose[3] || nose[0]; // Đỉnh mũi

    const leftEyeCenter = {
      x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
      y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length
    };
    const rightEyeCenter = {
      x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
      y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length
    };

    const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const eyeDist = Math.max(1, Math.abs(rightEyeCenter.x - leftEyeCenter.x));

    // Yaw: chênh lệch X của chóp mũi so với điểm giữa 2 mắt, chuẩn hóa theo eyeDist
    // Giá trị dương → quay trái (mũi lệch phải ảnh = người quay trái)
    const yaw = (noseTip.x - eyeCenterX) / eyeDist;

    // Pitch: chuẩn hóa theo eyeDist để không phụ thuộc khoảng cách camera
    const jawBottomY = jaw[8]?.y ?? jaw[jaw.length - 1].y;
    const eyeToNoseDist = Math.abs(noseTip.y - eyeCenterY);
    const noseToJawDist = Math.max(1, Math.abs(jawBottomY - noseTip.y));
    // pitchRatio > baseline → cúi xuống, pitchRatio < baseline → ngước lên
    const pitchRatio = eyeToNoseDist / noseToJawDist;

    return { yaw, pitchRatio, eyeDist };
  };

  /**
   * Kiểm tra tư thế hiện tại có đúng với góc yêu cầu không
   */
  const isPoseCorrect = (
    slotIdx: number,
    yaw: number,
    pitchRatio: number,
    baseline: number | null
  ): boolean => {
    switch (slotIdx) {
      case 0: // Thẳng: yaw gần 0, pitch gần baseline
        return Math.abs(yaw) <= 0.13 && pitchRatio >= 0.25 && pitchRatio <= 3.5;
      case 1: // Quay trái (người dùng quay trái → mũi sang phải ảnh → yaw > 0)
        return yaw > 0.20;
      case 2: // Quay phải (người dùng quay phải → mũi sang trái ảnh → yaw < 0)
        return yaw < -0.20;
      case 3: // Ngước lên (mắt xa mũi hơn bình thường → pitchRatio nhỏ hơn baseline)
        if (baseline === null) return false;
        return pitchRatio < baseline * 0.72; // Giảm 28% so với baseline
      case 4: // Cúi xuống nhẹ (chỉ cần cúi vừa phải ~22%)
        if (baseline === null) return false;
        return pitchRatio > baseline * 1.22; // Giảm từ 1.38 xuống 1.22 → không cần cúi quá sâu
      default: // Góc tự do (5-9)
        return true;
    }
  };

  const handleVideoPlay = async () => {
    if (!videoRef.current || !canvasRef.current || faceEnrollStep !== 2) return;
    scanProgressRef.current = 0;
    setScanProgress(0);
    isMountedRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const runDetection = async () => {
      if (!isMountedRef.current || video.paused || video.ended) return;
      if (faceEnrollStep !== 2) return;

      try {
        const displaySize = { width: video.videoWidth || 640, height: video.videoHeight || 480 };
        if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
          faceapi.matchDimensions(canvas, displaySize);
        }

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.25, inputSize: 416 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        setIsAiWarmingUp(false);

        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection && isMountedRef.current) {
          const { yaw, pitchRatio } = getHeadPose(detection.landmarks);
          const slotIdx = currentSlotIndexRef.current;

          // Tự động calibrate baseline pitch từ góc 0 (mặt thẳng)
          if (slotIdx === 0 && baselinePitchRef.current === null) {
            if (Math.abs(yaw) <= 0.13) {
              calibrationSamplesRef.current.push(pitchRatio);
              if (calibrationSamplesRef.current.length >= CALIBRATION_SAMPLES) {
                const avg = calibrationSamplesRef.current.reduce((a, b) => a + b, 0) / calibrationSamplesRef.current.length;
                baselinePitchRef.current = avg;
                calibrationSamplesRef.current = [];
                setIsCalibrated(true); // Cập nhật render state
              }
            }
          }

          // Kiểm tra tư thế
          const correct = isPoseCorrect(slotIdx, yaw, pitchRatio, baselinePitchRef.current);

          // Vẽ khung nhận diện
          const resized = faceapi.resizeResults(detection, displaySize);
          if (ctx) {
            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);
          }

          if (correct) {
            // Tăng progress theo từng frame (smooth accumulation)
            const next = Math.min(100, scanProgressRef.current + PROGRESS_STEP);
            scanProgressRef.current = next;
            setScanProgress(Math.round(next));

            if (next >= 100) {
              const descriptor = Array.from(detection.descriptor);

              if (isAutoScanning) {
                // Lưu vector vào bộ đệm RAM
                capturedVectorsRef.current[slotIdx] = descriptor;

                // Chốt baseline pitch ngay khi quét xong góc 0
                if (slotIdx === 0 && baselinePitchRef.current === null) {
                  baselinePitchRef.current = pitchRatio;
                }

                if (slotIdx < 4) {
                  // Chuyển sang góc tiếp theo
                  const nextSlot = slotIdx + 1;
                  currentSlotIndexRef.current = nextSlot;
                  setSelectedSlotIndex(nextSlot);
                  setCurrentSlotDisplay(nextSlot); // sync render state
                  setCurrentAngleLabel(FACE_GUIDES[nextSlot]);
                  // Ghi nhận slot đã hoàn thành
                  setCompletedSlots(prev => new Set(prev).add(slotIdx));
                  scanProgressRef.current = 0;
                  setScanProgress(0);

                  // Toast + giọng nói thông báo góc mới
                  showAngleToast(nextSlot);
                  safeSpeak(`Góc ${slotIdx + 1} hoàn tất. ${FACE_VOICE_GUIDES[nextSlot]}`);

                  // Delay 600ms để người dùng kịp đổi tư thế
                  if (isMountedRef.current) {
                    setTimeout(() => {
                      if (isMountedRef.current) requestAnimationFrame(runDetection);
                    }, 600);
                  }
                  return;
                } else {
                  // Đã đủ 5 góc → lưu tất cả atomically
                  safeSpeak('Hoàn tất quét. Đang lưu dữ liệu, vui lòng chờ.');
                  isMountedRef.current = false;
                  stopCamera();
                  saveAllCapturedVectors();
                }
              } else {
                // Chế độ thủ công
                safeSpeak('Hoàn tất. Đang lưu góc mặt.');
                isMountedRef.current = false;
                stopCamera();
                saveSingleVector(descriptor, slotIdx);
              }
              return;
            }
          } else {
            // Sai tư thế → decay progress từ từ (không reset đột ngột)
            const next = Math.max(0, scanProgressRef.current - PROGRESS_DECAY);
            scanProgressRef.current = next;
            setScanProgress(Math.round(next));
          }
        } else if (isMountedRef.current) {
          // Mất track khuôn mặt → decay
          const next = Math.max(0, scanProgressRef.current - PROGRESS_DECAY * 2);
          scanProgressRef.current = next;
          setScanProgress(Math.round(next));
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      if (isMountedRef.current) requestAnimationFrame(runDetection);
    };

    runDetection();
  };

  // Bulk atomic save: gọi 1 lần duy nhất với tất cả vectors
  const saveAllCapturedVectors = async (forceFlag?: boolean) => {
    if (!targetEmp) return;
    setIsSavingAll(true);
    const useForce = forceFlag ?? hasConfirmedForceRef.current;

    try {
      const vectors = Array.from({ length: 5 }, (_, i) => capturedVectorsRef.current[i]).filter(Boolean) as number[][];

      if (vectors.length === 0) {
        message.error("Không có dữ liệu khuôn mặt để lưu.");
        setFaceEnrollStep(1);
        return;
      }

      const saveRes = await fetch(`/api/v1/employees/${targetEmp.id}/face`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceVectors: vectors, force: useForce })
      });

      if (saveRes.ok) {
        message.success(`Đăng ký thành công ${vectors.length} góc Face ID!`);
        await fetchFaceSlots(targetEmp.id);
        onSuccess();
        setFaceEnrollStep(3);
      } else {
        const errData = await saveRes.json();
        handleSaveError(saveRes.status, errData, true);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi kết nối khi lưu khuôn mặt.");
      setFaceEnrollStep(1);
    } finally {
      setIsSavingAll(false);
    }
  };

  const saveSingleVector = async (vector: number[], idx: number, forceFlag?: boolean) => {
    if (!targetEmp) return;
    setIsSavingAll(true);
    const useForce = forceFlag ?? hasConfirmedForceRef.current;

    try {
      const saveRes = await fetch(`/api/v1/employees/${targetEmp.id}/face`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceVector: vector, index: idx, force: useForce })
      });

      if (saveRes.ok) {
        message.success(`Lưu thành công góc ${idx + 1}!`);
        await fetchFaceSlots(targetEmp.id);
        onSuccess();
        setFaceEnrollStep(3);
      } else {
        const errData = await saveRes.json();
        handleSaveError(saveRes.status, errData, false);
      }
    } catch (err) {
      console.error(err);
      message.error("Lỗi kết nối khi lưu khuôn mặt.");
      setFaceEnrollStep(1);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleSaveError = (status: number, errData: { message?: string; isHardBlock?: boolean; data?: { duplicateEmployee?: IDuplicateDetails['duplicateEmployee']; metrics?: { similarity: number } } }, isBulk: boolean) => {
    if (status === 409) {
      setDuplicateErrorMsg(errData.message ?? "");
      setDuplicateDetails(errData.data?.duplicateEmployee ?? null);

      if (errData.isHardBlock) {
        Modal.error({
          title: <span className="text-red-600 font-bold flex items-center gap-2"><ShieldAlert />Cấm Đăng Ký Trùng (Cùng Cơ Sở)</span>,
          content: (
            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-700">{errData.message}</p>
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg mt-3">
                <p className="text-xs text-red-700 mb-1"><strong>Trùng khớp với:</strong> {errData.data?.duplicateEmployee?.fullName || 'Không xác định'}</p>
                <p className="text-xs text-red-700"><strong>Độ giống:</strong> {errData.data?.metrics?.similarity}%</p>
              </div>
            </div>
          ),
          okText: 'Quay lại',
          okButtonProps: { danger: true },
          onOk: () => {
            setFaceEnrollStep(1);
            hasConfirmedForceRef.current = false;
          }
        });
      } else {
        Modal.confirm({
          title: <span className="text-orange-500 font-bold flex items-center gap-2"><AlertTriangle />Cảnh Báo Trùng Lặp (Khác Cơ Sở)</span>,
          content: (
            <div className="mt-2">
              <p className="text-sm text-slate-700">{errData.message}</p>
              <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg mt-3">
                <p className="text-xs text-orange-700">
                  <strong>Người giống:</strong> {errData.data?.duplicateEmployee?.fullName || 'Không xác định'} ({errData.data?.metrics?.similarity}%)
                </p>
              </div>
            </div>
          ),
          okText: 'Vẫn Tiếp Tục Lưu',
          cancelText: 'Hủy bỏ',
          okType: 'danger',
          onOk: async () => {
            hasConfirmedForceRef.current = true;
            if (isBulk) {
              await saveAllCapturedVectors(true);
            } else {
              await saveSingleVector(capturedVectorsRef.current[selectedSlotIndex], selectedSlotIndex, true);
            }
          },
          onCancel: () => {
            setFaceEnrollStep(1);
            hasConfirmedForceRef.current = false;
          }
        });
      }
    } else {
      message.error(errData.message || "Lỗi lưu khuôn mặt");
      setFaceEnrollStep(1);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={faceEnrollStep === 1 ? 800 : 900}
      centered
      destroyOnHidden
      style={{ borderRadius: 24, overflow: 'hidden' }}
      closeIcon={<X className="w-5 h-5 text-slate-400 hover:text-red-500 transition-colors" />}
    >
      <div className="bg-white -m-5 p-6 text-slate-800 pb-8 rounded-2xl font-sans transition-all duration-500">
        <div className="text-center mb-6">
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-600 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Hupuna Bio-Scanner
          </span>
          <h4 className="text-xl font-black mt-3 text-slate-800 tracking-tight">Thiết Lập Face ID Của Nhân Sự</h4>
          {targetEmp && (
            <p className="text-sm font-semibold text-slate-600 mt-2">
              {targetEmp.fullName} - <span className="font-mono text-slate-400">{targetEmp.employeeCode}</span>
            </p>
          )}
        </div>

        {faceEnrollStep === 1 ? (
          <Row gutter={[24, 24]} className="animate-fade-in flex-col md:flex-row items-stretch">
            {/* Cột trái: Cấu hình quét */}
            <Col xs={24} md={10} className="w-full flex flex-col h-full">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex-1 flex flex-col justify-between">
                <div>
                  <h5 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                    <ScanFace className="w-4 h-4 text-blue-500" /> Cấu hình quét
                  </h5>
                  <div className="space-y-3">
                    <Button
                      type={isAutoScanning ? "primary" : "default"}
                      className={`w-full h-11 rounded-xl font-bold ${isAutoScanning ? 'bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-white'}`}
                      onClick={() => setIsAutoScanning(true)}
                    >
                      Quét tự động (5 Góc chuẩn)
                    </Button>
                    <Button
                      type={!isAutoScanning ? "primary" : "default"}
                      className={`w-full h-11 rounded-xl font-bold ${!isAutoScanning ? 'bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-white'}`}
                      onClick={() => setIsAutoScanning(false)}
                    >
                      Quét thủ công (Từng góc)
                    </Button>
                  </div>
                  {/* Thông tin ngưỡng */}
                  <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-blue-700 leading-relaxed space-y-1">
                    <p className="font-bold uppercase tracking-wider text-blue-500 mb-1">Hướng dẫn quét tự động:</p>
                    <p>① Nhìn thẳng → ② Quay trái → ③ Quay phải → ④ Ngước lên → ⑤ Cúi xuống</p>
                    <p className="text-slate-400 mt-1">Giữ tư thế ~0.5 giây để hệ thống tự động bắt nét và chuyển góc.</p>
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    type="primary"
                    disabled={!isModelLoaded}
                    className={`w-full h-14 text-sm font-black uppercase rounded-2xl border-none shadow-lg transition-all ${
                      isModelLoaded ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/20' : 'bg-slate-300 shadow-none'
                    }`}
                    onClick={() => startScanning()}
                  >
                    {!isModelLoaded ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spin size="small" /> Đang khởi động AI...
                      </span>
                    ) : "Bắt đầu quét Face ID"}
                  </Button>
                </div>
              </div>
            </Col>

            {/* Cột phải: Trạng thái 10 slot */}
            <Col xs={24} md={14} className="w-full h-full">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl h-full shadow-xs overflow-y-auto max-h-[350px]">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider m-0">Trạng thái 10 góc mặt</h5>
                  <div className="flex items-center gap-2">
                    {faceSlots.length > 0 && (
                      <Popconfirm title="Xóa toàn bộ dữ liệu Face ID của nhân sự này?" onConfirm={deleteAllFaceSlots} okText="Xóa tất cả" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button size="small" type="text" danger className="text-[10px] h-5 px-2 font-semibold">Xóa toàn bộ</Button>
                      </Popconfirm>
                    )}
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Đã lưu {faceSlots.length}/10
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  {FACE_SLOT_LABELS.map((label, i) => {
                    const isEnrolled = faceSlots.some(s => s.index === i);
                    const isSelected = selectedSlotIndex === i && !isAutoScanning;
                    return (
                      <div
                        key={i}
                        className={`relative border p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' :
                          isEnrolled ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-300'
                        }`}
                        onClick={() => { if (!isAutoScanning) setSelectedSlotIndex(i); }}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-bold block ${isEnrolled ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
                          {isEnrolled && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        {isEnrolled ? (
                          <Popconfirm title="Xóa góc này?" onConfirm={() => deleteFaceSlot(i)} okText="Xóa" cancelText="Hủy">
                            <span className="text-[9px] text-red-500 hover:text-red-700 mt-2 block font-medium underline">Xóa ảnh</span>
                          </Popconfirm>
                        ) : (
                          <span className="text-[9px] text-slate-400 mt-2 block">Chưa có dữ liệu</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>
          </Row>

        ) : faceEnrollStep === 2 ? (
          /* Bước 2: Quét Camera */
          <div className="flex flex-col md:flex-row gap-6 animate-fade-in w-full">
            {/* Camera Viewfinder */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[400px] aspect-square rounded-3xl overflow-hidden bg-slate-900 shadow-xl border-4 border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onPlay={handleVideoPlay}
                  className="w-full h-full object-cover -scale-x-100 transition-opacity duration-300"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
                />

                {/* HUD Overlay */}
                <div className="absolute inset-0 border-[6px] border-white/10 rounded-[20px] pointer-events-none m-4" />

                {/* AI Warming Up */}
                {isAiWarmingUp && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 backdrop-blur-xl z-20 overflow-hidden rounded-[20px]">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-[60px] animate-pulse pointer-events-none" />
                    <div className="relative flex items-center justify-center mb-6 w-24 h-24">
                      <div className="absolute inset-0 border-[3px] border-transparent border-t-blue-500 border-b-cyan-400 rounded-full animate-spin [animation-duration:1.5s]" />
                      <div className="absolute inset-2 border-[3px] border-transparent border-l-blue-400 border-r-indigo-500 rounded-full animate-spin [animation-duration:2s] [animation-direction:reverse]" />
                      <div className="relative z-10 w-16 h-16 bg-slate-800/80 backdrop-blur-xs rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-slate-700/50">
                        <ScanFace className="w-8 h-8 text-cyan-400 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300 font-black text-base tracking-[0.2em] uppercase animate-pulse mb-2 z-10">
                      Khởi tạo AI Core
                    </h3>
                    <p className="text-slate-400 text-[11px] z-10 text-center max-w-[260px] leading-relaxed font-medium">
                      Đang biên dịch mạng nơ-ron sinh trắc học...
                    </p>
                  </div>
                )}

                {/* Saving Loading */}
                {isSavingAll && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md z-30 rounded-[20px]">
                    <Spin size="large" />
                    <span className="text-white font-bold tracking-wider mt-4 animate-pulse text-sm">Đang đồng bộ dữ liệu Face ID...</span>
                  </div>
                )}

                {/* Progress color overlay based on progress */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 transition-all duration-200"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${scanProgress}%, transparent ${scanProgress}%)`,
                    opacity: scanProgress > 0 ? 1 : 0
                  }}
                />

                {/* ===== ANGLE TOAST — slide-in from top ===== */}
                <div
                  className="absolute top-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
                  style={{
                    transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
                    transform: angleToast ? 'translateY(0)' : 'translateY(-110%)',
                    opacity: angleToast ? 1 : 0,
                  }}
                >
                  <div className="mt-3 mx-3 flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm border border-blue-500/40 px-5 py-3 rounded-2xl shadow-2xl shadow-blue-900/40 max-w-[90%]">
                    <span className="text-2xl leading-none">{angleToast?.emoji}</span>
                    <div>
                      <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-0.5">Góc tiếp theo</p>
                      <p className="text-white font-black text-base leading-tight">{angleToast?.text}</p>
                    </div>
                  </div>
                </div>
                {/* ============================================ */}
              </div>

              {/* Progress & Instruction */}
              <div className="w-full max-w-[400px] mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiến trình bắt góc</span>
                  <span className="text-sm font-black text-blue-600">{scanProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-150 ease-out rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                {!isCalibrated && currentSlotDisplay === 0 && !isAiWarmingUp && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-2 text-center animate-pulse">
                    🔄 Đang hiệu chỉnh góc chuẩn... Nhìn thẳng vào camera
                  </p>
                )}
              </div>
            </div>

            {/* Right: Instructions & Steps */}
            <div className="w-[280px] shrink-0 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col h-full">
              <h5 className="font-extrabold text-slate-800 text-sm mb-4 uppercase tracking-widest text-center">Hướng dẫn</h5>

              <div className="flex-1 space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest block mb-1">Góc mặt yêu cầu</span>
                  <span className="font-black text-blue-700 text-base leading-tight">
                    {currentAngleLabel || FACE_GUIDES[selectedSlotIndex]}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg leading-relaxed text-justify">
                  Giữ khuôn mặt trong khung hình và thực hiện đúng góc quay. Hệ thống tự động bắt nét khi đúng tư thế.
                </div>

                <div className="space-y-2 mt-4">
                  {FACE_SLOT_LABELS.slice(0, 5).map((label, idx) => {
                    const isActive = idx === (isAutoScanning ? currentSlotDisplay : selectedSlotIndex);
                    const isDone = isAutoScanning ? completedSlots.has(idx) : false;
                    return (
                      <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold transition-all ${
                        isActive ? 'bg-blue-600 text-white shadow-md' :
                        isDone ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400 border border-slate-100'
                      }`}>
                        {isDone ? <CheckCircle className="w-4 h-4" /> : <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-white' : 'border-slate-200'}`} />}
                        {label.split('*')[0]}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                danger
                type="text"
                className="w-full mt-4 font-bold h-10 bg-red-50 hover:bg-red-100"
                onClick={() => {
                  isMountedRef.current = false;
                  stopCamera();
                  setFaceEnrollStep(1);
                }}
              >
                Hủy Quét
              </Button>
            </div>
          </div>

        ) : faceEnrollStep === 3 ? (
          <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
            <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
            <h3 className="text-xl font-black text-slate-800">Hoàn Tất Sinh Trắc Học!</h3>
            <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">Hệ thống đã mã hóa và lưu trữ dữ liệu Face ID của nhân sự thành công. Sẵn sàng chấm công.</p>
            <Button type="primary" size="large" className="mt-6 bg-slate-800 rounded-xl px-10 h-12 font-bold" onClick={handleClose}>
              Đóng Cửa Sổ
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
