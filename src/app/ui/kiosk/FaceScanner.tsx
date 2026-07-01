"use client";
import styles from "./FaceScannerOverlay.module.css";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import { loadLivenessModel, predictLiveness } from "./helpers/livenessModel";
import { loadFaceApiModels, getKnownDescriptors, matchDescriptor } from "./helpers/faceIdEngine";
import { detectBlink, isPhoneLikeImage, isReplayAttack, detectMouthOpen, isFlatScreen, detectMoirePattern } from "./helpers/spoofUtils";
import PhoneSpoofModal from "./components/PhoneSpoofModal";
import { useDepthModel } from "./helpers/useDepthModel";
import { Camera, CheckCircle2, ShieldAlert, Loader2, MapPin, ShieldCheck, Users, Scan, Brain, LogOut } from "lucide-react";
import { CONFIG } from '@/app/utils/config';
import { ABCLogo } from '@/app/ui/base/abc-logo';
import Link from "next/link";
import { useRouter } from "next/navigation";

const LIVENESS_THRESHOLD = 0.01; // Giảm ngưỡng cực thấp để tránh web cam bị mờ đánh lỗi giả mạo

interface TfGraphModel {
  execute(
    inputs: faceapi.tf.Tensor | faceapi.tf.Tensor[] | Record<string, faceapi.tf.Tensor>,
    outputs?: string | string[]
  ): faceapi.tf.Tensor | faceapi.tf.Tensor[];
  inputs: Array<{
    shape?: Array<number | null>;
  }>;
}

const cropFaceAndPredictLiveness = async (
  video: HTMLVideoElement,
  detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>,
  model: TfGraphModel
): Promise<{ real: number; fake: number }> => {
  const box = detection.detection.box;
  
  const paddingX = box.width * 0.12;
  const paddingY = box.height * 0.12;
  const startX = Math.max(0, box.x - paddingX);
  const startY = Math.max(0, box.y - paddingY);
  const cropW = Math.min(video.videoWidth - startX, box.width + paddingX * 2);
  const cropH = Math.min(video.videoHeight - startY, box.height + paddingY * 2);

  // Tạo canvas trung gian giữ nguyên độ phân giải gốc của camera để bảo toàn chi tiết texture da/sọc màn hình
  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { real: 0, fake: 0 };

  // Tắt làm mịn ảnh trên canvas 2D để ảnh không bị mờ
  ctx.imageSmoothingEnabled = false;
  // @ts-expect-error: mozImageSmoothingEnabled is vendor-specific property
  ctx.mozImageSmoothingEnabled = false;
  // @ts-expect-error: webkitImageSmoothingEnabled is vendor-specific property
  ctx.webkitImageSmoothingEnabled = false;

  ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);

  const tf = faceapi.tf;

  try {
    // Chuyển sang tensor độ phân giải cao gốc
    const fullTensor = tf.tidy(() => {
      return tf.browser.fromPixels(canvas);
    });

    // 1. Resize bilinear về 32x32 (giữ nguyên dải [0, 255])
    const rawTensor32 = tf.tidy(() => {
      const floatTensor = tf.cast(fullTensor, "float32");
      return tf.image.resizeBilinear(floatTensor, [32, 32], false);
    });
    fullTensor.dispose();

    // 2. Tạo bản BGR normalized [0, 1]
    const bgrTensor32 = tf.tidy(() => {
      const normalized = tf.div(rawTensor32, 255.0);
      const r = tf.slice(normalized, [0, 0, 0], [-1, -1, 1]);
      const g = tf.slice(normalized, [0, 0, 1], [-1, -1, 1]);
      const b = tf.slice(normalized, [0, 0, 2], [-1, -1, 1]);
      return tf.concat([b, g, r], 2);
    });
    rawTensor32.dispose();

    // Chạy dự đoán trên ảnh BGR (0-1)
    const prediction = tf.tidy(() => {
      const expanded = tf.expandDims(bgrTensor32, 0);
      return model.execute(expanded) as faceapi.tf.Tensor;
    });
    const data = await prediction.data();
    prediction.dispose();
    bgrTensor32.dispose();

    return {
      fake: data[0] || 0,
      real: data[1] || 0
    };
  } catch (err) {
    console.error("Lỗi khi chạy model Liveness predict:", err);
    return { real: 0, fake: 0 };
  }
};

interface GpsErrorDetails {
  deviceGps: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  locationGps: {
    lat: number;
    lng: number;
    radius: number;
  };
  calculatedDistance: number;
}

interface KioskWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface FaceScannerProps {
  locationSlug: string;
  deviceInfo?: {
    deviceName: string;
    locationName: string;
    requireGps?: boolean;
  } | null;
  deviceToken?: string;
}

export default function FaceScanner({ locationSlug, deviceInfo, deviceToken }: FaceScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelWarmedUp, setIsModelWarmedUp] = useState(false);
  const [livenessModel, setLivenessModel] = useState<TfGraphModel | null>(null);
  const [isLivenessModelLoaded, setIsLivenessModelLoaded] = useState(false);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [fakeScore, setFakeScore] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "CHALLENGE" | "VERIFYING" | "SUCCESS" | "ERROR">("IDLE");
  const [livenessInstruction, setLivenessInstruction] = useState("");
  const [livenessProgress, setLivenessProgress] = useState(0);
  // Head turn challenge: track direction and consecutive frames
  const challengeDirectionRef = useRef<"LEFT" | "RIGHT" | "UP" | "DOWN" | null>(null);
  const consecutiveDirectionFrames = useRef(0);
  const [message, setMessage] = useState("Khởi tạo hệ thống...");
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [showPhoneSpoofModal, setShowPhoneSpoofModal] = useState(false);
  const recentFramesRef = useRef<ImageData[]>([]);
  const isCheckingInRef = useRef(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const straightPitchRef = useRef<number>(1.0);
  const gpsLocationRef = useRef<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsErrorDetails, setGpsErrorDetails] = useState<GpsErrorDetails | null>(null);
  const [employeeData, setEmployeeData] = useState<{
    fullName: string;
    employeeCode: string;
    role?: string;
    locationName?: string;
    avatar?: string;
    action?: string;
    lateMinutes?: number;
    earlyMinutes?: number;
    shiftName?: string;
  } | null>(null);
  const [time, setTime] = useState<Date>(() => new Date());
  const depthModel = useDepthModel();

  // Hàm phát tiếng beep/chime bằng Web Audio API
  const playBeep = (type: "success" | "error" | "start") => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as KioskWindow).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();

      // Mở khóa AudioContext trên iOS nếu đang ở trạng thái suspended (do chính sách autoplay)
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch((err) => console.warn("Lỗi resume AudioContext:", err));
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === "success") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);

        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
          gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.2);
        }, 100);
      } else if (type === "error") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      } else if (type === "start") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.error("AudioContext error:", e);
    }
  };

  const [vietnameseVoice, setVietnameseVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Pre-load giọng đọc tiếng Việt bằng cách lắng nghe sự kiện voiceschanged
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) => v.lang.includes("vi-VN") || v.lang.toLowerCase().includes("vi")
      );
      if (viVoice) {
        setVietnameseVoice(viVoice);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Quản lý luồng âm thanh cố định duy nhất dùng chung (để mở khóa autoplay trên di động)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo đối tượng Audio cố định khi component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Dùng một file âm thanh câm (silent audio base64) cực ngắn để khởi tạo
      currentAudioRef.current = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
      currentAudioRef.current.volume = 0.95;
    }
  }, []);

  // Hàm phát giọng đọc tiếng Việt bằng Google TTS hoặc Web Speech API dự phòng
  const speakVi = (text: string) => {
    if (typeof window === "undefined") return;

    // Dừng âm thanh cũ đang phát để tránh nói chồng lên nhau
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn("Lỗi dừng âm thanh trước đó:", e);
    }

    // Sử dụng local proxy API để lấy tiếng đọc tiếng Việt chuẩn từ Google TTS mà không bị chặn CORS
    try {
      const encodedText = encodeURIComponent(text);
      const url = `/api/v1/kiosk/tts?text=${encodedText}`;

      if (currentAudioRef.current) {
        const audio = currentAudioRef.current;
        audio.src = url;

        // Đẩy tốc độ đọc nhanh lên 1.5 lần (nghe dứt khoát, chuyên nghiệp và tiết kiệm thời gian hơn)
        audio.defaultPlaybackRate = 1.5;
        audio.playbackRate = 1.5;

        // Đảm bảo thiết lập tốc độ đọc sau khi nguồn âm thanh mới sẵn sàng
        const handleCanPlay = () => {
          audio.playbackRate = 1.5;
          audio.removeEventListener("canplay", handleCanPlay);
        };
        audio.addEventListener("canplay", handleCanPlay);

        audio.play()
          .then(() => {
            // Ngắt speechSynthesis nếu đang chạy song song
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          })
          .catch((err) => {
            console.warn("Không thể phát Google TTS qua proxy, chuyển sang Web Speech API dự phòng:", err);
            fallbackSpeechSynthesis(text);
          });
      } else {
        fallbackSpeechSynthesis(text);
      }
    } catch (e) {
      console.error("Lỗi Google TTS, chuyển sang Web Speech API dự phòng:", e);
      fallbackSpeechSynthesis(text);
    }
  };

  // Hàm dự phòng sử dụng SpeechSynthesis tích hợp của trình duyệt
  const fallbackSpeechSynthesis = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Loại bỏ setTimeout để giữ ngữ cảnh User Gesture của trình duyệt di động
      const runSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "vi-VN";

        if (vietnameseVoice) {
          utterance.voice = vietnameseVoice;
        } else {
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().replace("_", "-") === "vi-vn" ||
              v.lang.toLowerCase().startsWith("vi")
          );
          if (viVoice) {
            utterance.voice = viVoice;
          }
        }

        // Đẩy tốc độ của giọng đọc dự phòng lên 1.5 lần
        utterance.rate = 1.5;
        window.speechSynthesis.speak(utterance);
      };
      
      runSpeak();
    }
  };

  // Quản lý luồng âm thanh đang phát để tránh bị đè tiếng nhau
  // (Đã chuyển lên khai báo sớm cùng useEffect khởi tạo)

  // Lưu face vector để truyền qua các bước
  const faceVectorRef = useRef<number[] | null>(null);

  // Tính toán góc quay đầu dựa trên điểm mốc khuôn mặt (Landmarks)
  const getHeadPose = (landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const jaw = landmarks.getJawOutline();

    const noseTip = nose[3] || nose[0];

    const leftEyeCenter = {
      x: leftEye.reduce((sum: number, p: faceapi.Point) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum: number, p: faceapi.Point) => sum + p.y, 0) / leftEye.length,
    };
    const rightEyeCenter = {
      x: rightEye.reduce((sum: number, p: faceapi.Point) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum: number, p: faceapi.Point) => sum + p.y, 0) / rightEye.length,
    };

    const eyeCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const eyeCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;
    const eyeDist = Math.abs(rightEyeCenter.x - leftEyeCenter.x);

    // Tính yaw: chênh lệch vị trí chóp mũi so với điểm giữa 2 mắt
    const yaw = eyeDist === 0 ? 0 : (noseTip.x - eyeCenterX) / eyeDist;

    // Tính pitch: tỷ lệ khoảng cách từ mắt->mũi và mũi->cằm
    const jawBottomY = jaw[8]?.y || jaw[jaw.length - 1].y;
    const eyeToNoseDist = Math.abs(noseTip.y - eyeCenterY);
    const noseToJawDist = Math.abs(jawBottomY - noseTip.y);
    const pitchRatio = noseToJawDist === 0 ? 1 : eyeToNoseDist / noseToJawDist;

    return { yaw, pitchRatio };
  };

  // Dọn dẹp các timeout và âm thanh khi unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cập nhật đồng hồ thời gian thực mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động reset trạng thái thành công/thất bại về IDLE sau vài giây để người tiếp theo chấm công
  useEffect(() => {
    if (status !== "SUCCESS" && status !== "ERROR") return;

    const delay = status === "SUCCESS" ? 5000 : 3000;
    const timer = setTimeout(() => {
      setStatus("IDLE");
      setEmployeeData(null);
      setMessage("Vui lòng nhấn nút Chấm công");
      isCheckingInRef.current = false;
    }, delay);

    return () => clearTimeout(timer);
  }, [status]);

  const formatTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const formatDate = (date: Date) => {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, "0");
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dayName}, ngày ${dd}/${mo}/${yyyy}`;
  };

  // 1. Tải Models & Warm-up
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage("Đang tải AI Models...");
        // Lưu ý: Cần copy folder models của face-api vào /public/models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        
        // Tải mô hình Liveness
        const tfExtended = faceapi.tf as unknown as { loadGraphModel: (url: string) => Promise<TfGraphModel> };
        const model = await tfExtended.loadGraphModel("/models/anti-spoofing/liveness.json");
        setLivenessModel(model);
        setIsLivenessModelLoaded(true);
        setIsModelLoaded(true);

        // Tiến hành tối ưu hóa/warm-up mô hình để tránh lag lần quét đầu tiên
        setMessage("Đang tối ưu hóa AI...");
        const dummyCanvas = document.createElement("canvas");
        dummyCanvas.width = 100;
        dummyCanvas.height = 100;
        await faceapi.detectSingleFace(dummyCanvas, new faceapi.TinyFaceDetectorOptions());
        
        // Warmup liveness model
        const tf = faceapi.tf;
        const dummyInput = tf.zeros([1, 32, 32, 3], "float32");
        const dummyOutput = model.execute(dummyInput) as faceapi.tf.Tensor;
        dummyInput.dispose();
        dummyOutput.dispose();

        setIsModelWarmedUp(true);
        setMessage("Hệ thống đã sẵn sàng");
      } catch (error) {
        console.error("Lỗi tải model:", error);
        setCameraError("Không thể tải AI Model. Vui lòng kiểm tra lại thư mục /public/models hoặc file liveness.");
      }
    };
    loadModels();
  }, []);

  const startScanning = () => {
    if (!isModelLoaded || !isModelWarmedUp || !isLivenessModelLoaded) return;
    if (deviceInfo?.requireGps !== false && !gpsLocation) {
      alert("Hệ thống đang chờ định vị GPS...");
      return;
    }

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    // Reset khóa xác thực khi bắt đầu quét phiên mới
    isCheckingInRef.current = false;

    // Kích hoạt phát thử âm thanh để mở khóa Autoplay trên di động (được gọi trực tiếp từ sự kiện click của người dùng)
    if (currentAudioRef.current) {
      currentAudioRef.current.play().catch((err) => {
        console.warn("Mở khóa âm thanh gặp lỗi (có thể do gạt im lặng):", err);
      });
    }

    setStatus("SCANNING");
    setGpsErrorDetails(null);
    setLivenessScore(null);
    setFakeScore(null);
    setMessage("Vui lòng nhìn thẳng vào camera...");
    playBeep("start");
    speakVi("Vui lòng nhìn thẳng vào camera");

    // Timeout 15 giây nếu không nhận diện hoặc quét xong (tránh hết hạn sớm)
    scanTimeoutRef.current = setTimeout(() => {
      setStatus("IDLE");
      setMessage("Hết thời gian quét. Vui lòng nhấn nút Chấm công để thử lại.");
      speakVi("Hết thời gian quét. Vui lòng thử lại.");
      playBeep("error");

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, 15000);
  };

  // 2. Lấy GPS & Bật Camera (chạy song song ngay từ đầu)
  useEffect(() => {
    let watchId: number | null = null;

    // Sử dụng watchPosition để liên tục cập nhật và tinh chỉnh độ chính xác của GPS
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          setGpsLocation((prev) => {
            // Bộ lọc độ chính xác: Lọc định vị IP thô (sai số > 1000m) nếu đã có định vị tốt (< 300m) trước đó
            if (prev && prev.accuracy !== undefined && prev.accuracy < 300 && accuracy > 1000) {
              console.log("Bỏ qua định vị thô từ IP:", accuracy, "m");
              return prev;
            }
            const coords = { latitude: lat, longitude: lng, accuracy };
            gpsLocationRef.current = coords;
            return coords;
          });
        },
        (error) => {
          console.error("GPS Error:", error);
          if (deviceInfo?.requireGps !== false) {
            setCameraError("Vui lòng cấp quyền vị trí (GPS) để chấm công.");
          }
        },
        {
          enableHighAccuracy: true, // Ép trình duyệt sử dụng định vị có độ chính xác cao nhất (Wi-Fi/GPS phần cứng)
          timeout: 15000,           // Chờ phản hồi định vị tối đa 15 giây
          maximumAge: 0             // Luôn lấy tọa độ thực tế mới nhất, không dùng bộ nhớ đệm
        }
      );
    } else {
      if (deviceInfo?.requireGps !== false) {
        setTimeout(() => setCameraError("Trình duyệt không hỗ trợ GPS."), 0);
      }
    }

    // Bật Camera
    const startCamera = async () => {
      try {
        // Thử với cấu hình lý tưởng 720p và facingMode "user"
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Cấu hình camera tối ưu không được hỗ trợ, thử chế độ dự phòng cơ bản...", err);
        try {
          // Chế độ dự phòng: Chỉ yêu cầu có luồng video cơ bản nhất
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackErr) {
          console.error("Camera error:", fallbackErr);
          setCameraError("Không thể truy cập Camera. Vui lòng cấp quyền.");
        }
      }
    };

    startCamera();

    return () => {
      // Dừng theo dõi vị trí khi unmount
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      // Cleanup camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCheckIn = async (mainFaceVector: number[], challengeFaceVector: number[], challengeDirection: number) => {
    // Nếu đang trong quá trình check-in thì bỏ qua các lượt quét sau
    if (isCheckingInRef.current) return;
    isCheckingInRef.current = true;

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      const currentGps = gpsLocationRef.current;
      if (deviceInfo?.requireGps !== false && !currentGps) {
        setMessage("Đang chờ định vị GPS...");
        isCheckingInRef.current = false;
        return;
      }

      // Removed local static JSON face-ID verification
      // Bỏ phần check cục bộ vì nhân sự mới đăng ký thì DB có nhưng file json ko có

      setStatus("VERIFYING");
      setMessage("Đang xác thực...");

      try {
        const res = await fetch("/api/v1/kiosk/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationSlug,
            faceVector: mainFaceVector,
            challengeFaceVector: challengeFaceVector, // Gửi đúng vector góc quay được bắt
            challengeDirection: challengeDirection,   // Gửi đúng ID hướng (1: Trái, 2: Phải, 3: Lên, 4: Xuống)
            gps: currentGps || { latitude: 0, longitude: 0, accuracy: 0 },
            deviceToken,
          }),
        });

        const data = await res.json();

        if (res.ok && data.data?.success) {
          setStatus("SUCCESS");
          setEmployeeData(data.data);
          setMessage(data.message);
          playBeep("success");
          
          let speakText = `Xin cảm ơn ${data.data.fullName}, `;
          const actionText = data.data.action === "CHECK_IN" ? "vào" : "ra";
          const shiftText = data.data.shiftName ? ` ${data.data.shiftName}` : " ca";
          speakText += `chấm công ${actionText}${shiftText} thành công!`;
          
          if (data.data.action === "CHECK_IN" && data.data.lateMinutes && data.data.lateMinutes > 0) {
            speakText += ` Bạn đi muộn ${data.data.lateMinutes} phút.`;
          } else if (data.data.action === "CHECK_OUT" && data.data.earlyMinutes && data.data.earlyMinutes > 0) {
            speakText += ` Bạn về sớm ${data.data.earlyMinutes} phút.`;
          }
          speakVi(speakText);
        } else {
          setStatus("ERROR");
          setMessage(data.message || "Lỗi xác thực.");

          if (res.status === 403 && data.debug) {
            setGpsErrorDetails(data.debug);
          } else {
            setGpsErrorDetails(null);
          }

          playBeep("error");
          speakVi(data.message || "Chấm công thất bại. Vui lòng thử lại.");
        }
      } catch (error) {
        console.error(error);
        setStatus("ERROR");
        setMessage("Mất kết nối máy chủ.");
        playBeep("error");
        speakVi("Lỗi kết nối máy chủ. Vui lòng thử lại.");
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
             // ... Logic tiếp theo ở đây
          }
        }
      }
    };

  // SCANNING: phát hiện khuôn mặt & lưu vector
  useEffect(() => {
    if (!isModelLoaded || status !== "SCANNING") return;
    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const scanFace = async () => {
      if (!isMounted || status !== "SCANNING") return;
      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && isMounted) {
            const { yaw, pitchRatio } = getHeadPose(detection.landmarks);
            
            // Nới lỏng yêu cầu nhìn thẳng: chấp nhận lệch đầu nhẹ (yaw <= 0.30 thay vì 0.25)
            if (Math.abs(yaw) > 0.30 || pitchRatio < 0.2 || pitchRatio > 3.0) {
              const ctx = canvas?.getContext("2d");
              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              setMessage("Vui lòng nhìn thẳng vào camera...");
              if (isMounted && status === "SCANNING") timerId = setTimeout(scanFace, 10);
              return;
            }

            // Chốt tỷ lệ khuôn mặt thẳng của riêng người này
            straightPitchRef.current = pitchRatio;
            
            const resized = faceapi.resizeResults(detection, displaySize);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              faceapi.draw.drawDetections(canvas, resized);
              faceapi.draw.drawFaceLandmarks(canvas, resized);
            }

            // Lưu vector khuôn mặt & chuyển sang bước CHALLENGE (quay 1 hướng)
            faceVectorRef.current = Array.from(detection.descriptor);
            
            const dirs = ["LEFT", "RIGHT", "UP", "DOWN"] as const;
            const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
            challengeDirectionRef.current = randomDir;
            consecutiveDirectionFrames.current = 0;
            
            let inst = "";
            let speech = "";
            if (randomDir === "LEFT") { inst = "Quay mặt sang TRÁI"; speech = "Vui lòng quay mặt sang trái"; }
            else if (randomDir === "RIGHT") { inst = "Quay mặt sang PHẢI"; speech = "Vui lòng quay mặt sang phải"; }
            else if (randomDir === "UP") { inst = "Ngẩng mặt lên TRÊN"; speech = "Vui lòng ngẩng mặt lên"; }
            else if (randomDir === "DOWN") { inst = "Cúi mặt xuống DƯỚI"; speech = "Vui lòng cúi mặt xuống"; }

            setLivenessInstruction(inst);
            setLivenessProgress(0);
            speakVi(speech);
            setStatus("CHALLENGE");
            return;
          } else if (isMounted) {
            const ctx = canvas?.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setMessage("Vui lòng nhìn thẳng vào camera...");
          }
        }
      }
      if (isMounted && status === "SCANNING") timerId = setTimeout(scanFace, 10);
    };

    timerId = setTimeout(scanFace, 10);
    return () => { isMounted = false; if (timerId) clearTimeout(timerId); };
  }, [isModelLoaded, status]);

  // CHALLENGE: phát hiện quay đầu chống giả mạo
  useEffect(() => {
    if (!isModelLoaded || status !== "CHALLENGE") return;
    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const scanLiveness = async () => {
      if (!isMounted || status !== "CHALLENGE") return;

      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);

          const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

          if (detection && isMounted) {
            const { yaw, pitchRatio } = getHeadPose(detection.landmarks);
            let isCorrectDirection = false;
            const dir = challengeDirectionRef.current;

            // Yêu cầu khắt khe: Vừa phải đạt ngưỡng tuyệt đối, vừa phải thay đổi tương đối so với lúc nhìn thẳng
            if (dir === "LEFT" && yaw > 0.20) isCorrectDirection = true;
            else if (dir === "RIGHT" && yaw < -0.20) isCorrectDirection = true;
            else if (dir === "UP" && pitchRatio < 0.65 && pitchRatio < (straightPitchRef.current * 0.70)) isCorrectDirection = true;
            // Giảm ngưỡng cúi xuống: chỉ cần cúi vừa phải (~20%), không cần cúi sâu
            else if (dir === "DOWN" && pitchRatio > 1.20 && pitchRatio > (straightPitchRef.current * 1.18)) isCorrectDirection = true;

            if (isCorrectDirection) {
              consecutiveDirectionFrames.current++;
              setLivenessProgress(Math.min(100, consecutiveDirectionFrames.current * 25));
              
              // Tăng số frame liên tiếp lên 4 để lọc nhiễu (noise) của camera, vẫn siêu nhanh do đang quét 10ms/frame
              if (consecutiveDirectionFrames.current >= 4) {
                // Xác nhận thành công -> AI liveness + replay + checkin
                setLivenessProgress(100);
                setMessage("Đang xác minh liveness AI...");

                const finalDetection = await faceapi
                  .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                  .withFaceLandmarks()
                  .withFaceDescriptor();

                if (finalDetection && isMounted) {
                  // AI liveness model
                  if (livenessModel) {
                    const livenessRes = await cropFaceAndPredictLiveness(video, finalDetection, livenessModel);
                    setLivenessScore(livenessRes.real);
                    setFakeScore(livenessRes.fake);
                    const dynamicThreshold = isPhoneLikeImage(video) ? 0.05 : LIVENESS_THRESHOLD;
                    if (livenessRes.real < dynamicThreshold) {
                      setShowPhoneSpoofModal(true);
                      setStatus("ERROR");
                      setMessage("Phát hiện giả mạo khuôn mặt!");
                      playBeep("error");
                      speakVi("Phát hiện giả mạo khuôn mặt");
                      const ctx = canvas.getContext("2d");
                      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                      return;
                    }
                  }

                  // Chuyển hướng chuỗi sang ID slot lưu trong DB
                  let challengeDirNum = 0;
                  if (dir === "LEFT") challengeDirNum = 1;
                  else if (dir === "RIGHT") challengeDirNum = 2;
                  else if (dir === "UP") challengeDirNum = 3;
                  else if (dir === "DOWN") challengeDirNum = 4;

                  handleCheckIn(faceVectorRef.current!, Array.from(finalDetection.descriptor), challengeDirNum);
                } else if (isMounted) {
                  setStatus("SCANNING");
                  setMessage("Vui lòng nhìn thẳng vào camera...");
                }
                return;
              }
            } else {
              // Trừ điểm nhanh nếu sai hướng
              consecutiveDirectionFrames.current = 0;
              setLivenessProgress(0);
            }
            
            const resized = faceapi.resizeResults(detection, displaySize);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              faceapi.draw.drawDetections(canvas, resized);
              faceapi.draw.drawFaceLandmarks(canvas, resized);
            }
          } else if (isMounted) {
            setStatus("SCANNING");
            setMessage("Vui lòng nhìn thẳng vào camera...");
            return;
          }
        }
      }
      if (isMounted && status === "CHALLENGE") timerId = setTimeout(scanLiveness, 10);
    };

    timerId = setTimeout(scanLiveness, 10);
    return () => { isMounted = false; if (timerId) clearTimeout(timerId); };
  }, [isModelLoaded, status]);



  const handleMockCheckIn = async () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    const currentGps = gpsLocationRef.current;
    if (deviceInfo?.requireGps !== false && !currentGps) {
      alert("Đang chờ định vị GPS...");
      return;
    }
    setCameraError(""); // Tạm ẩn lỗi để xem UI
    setGpsErrorDetails(null);
    setStatus("VERIFYING");
    setMessage("Đang xác thực bằng Mock Data...");
    try {
      const res = await fetch("/api/v1/kiosk/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationSlug,
          // Truyền 1 mảng 128 số ngẫu nhiên để giả lập FaceVector
          faceVector: Array.from({ length: 128 }, () => Math.random()),
          gps: currentGps || { latitude: 0, longitude: 0, accuracy: 0 },
          deviceToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.data?.success) {
        setStatus("SUCCESS");
        setEmployeeData(data.data);
        setMessage(data.message);
        playBeep("success");
        
        let speakText = `Xin cảm ơn ${data.data.fullName}, `;
        const actionText = data.data.action === "CHECK_IN" ? "vào" : "ra";
        const shiftText = data.data.shiftName ? ` ${data.data.shiftName}` : " ca";
        speakText += `chấm công ${actionText}${shiftText} thành công!`;
        
        if (data.data.action === "CHECK_IN" && data.data.lateMinutes && data.data.lateMinutes > 0) {
          speakText += ` Bạn đi muộn ${data.data.lateMinutes} phút.`;
        } else if (data.data.action === "CHECK_OUT" && data.data.earlyMinutes && data.data.earlyMinutes > 0) {
          speakText += ` Bạn về sớm ${data.data.earlyMinutes} phút.`;
        }
        speakVi(speakText);
      } else {
        setStatus("ERROR");
        setMessage(data.message || "Lỗi xác thực.");
        playBeep("error");
        speakVi(data.message || "Chấm công thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      setStatus("ERROR");
      setMessage("Mất kết nối máy chủ.");
      playBeep("error");
      speakVi("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    }
  };

  const isSystemReady = isModelLoaded && isModelWarmedUp && isLivenessModelLoaded && (deviceInfo?.requireGps === false || !!gpsLocation) && isCameraReady;

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-8 text-center bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-red-500/20 shadow-2xl">
        <ShieldAlert size={64} className="mb-4 text-red-500" />
        <h2 className="text-2xl font-bold mb-2">Lỗi Thiết Bị</h2>
        <p className="text-slate-300">{cameraError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          Tải Lại Trang
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-between min-h-0 transition-all duration-300">

      {/* Horizontal Status Bar - Thanh trạng thái hàng ngang siêu tối ưu */}
      <div className="w-full flex flex-row items-center justify-between py-1.5 px-3 sm:px-4 mb-2 bg-slate-950/45 backdrop-blur-md rounded-2xl border border-white/5 shadow-lg gap-4 shrink-0">

        {/* Cột Trái: Logo Chấm công & Badge Địa điểm */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href={`${process.env.NEXT_PUBLIC_TIMEKEEPING_URL_DEV}/kiosk/`}>
            <ABCLogo className="text-2xl sm:text-3xl opacity-95 shrink-0" />
          </Link>
          <div className="h-4 w-px bg-slate-700/60 shrink-0" />

          {deviceInfo && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm min-w-0">
              <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-emerald-300 font-bold tracking-wide truncate max-w-[100px] sm:max-w-none">
                {deviceInfo.deviceName}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0 hidden sm:inline" />
              <span className="text-[9px] sm:text-[10px] text-emerald-400/80 font-semibold truncate hidden sm:inline">{deviceInfo.locationName}</span>
            </div>
          )}

          {/* Định vị GPS tích hợp trực tiếp trên Status Bar sáng rõ */}
          <div className={`border rounded-full px-2.5 py-0.5 flex items-center gap-1 shadow-sm shrink-0 whitespace-nowrap min-w-max transition-colors duration-300 ${deviceInfo?.requireGps === false
            ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
            : gpsLocation
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
            <MapPin size={10} className={deviceInfo?.requireGps === false ? "text-slate-400 shrink-0" : gpsLocation ? "text-emerald-400 shrink-0" : "text-amber-400 shrink-0 animate-pulse"} />
            <span className="text-[9px] sm:text-[10px] font-bold">
              {deviceInfo?.requireGps === false
                ? "GPS: KHÔNG YÊU CẦU"
                : gpsLocation
                  ? `GPS: ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)} (±${gpsLocation.accuracy ? Math.round(gpsLocation.accuracy) : 0}m)`
                  : "ĐANG TÌM GPS..."}
            </span>
          </div>
        </div>

        {/* Cột Phải: Đồng hồ, Ngày tháng & Nút Thoát */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-col items-end text-right">
            <div className="text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-indigo-200 to-emerald-400 font-mono drop-shadow-[0_2px_4px_rgba(59,130,246,0.15)] leading-none">
              {formatTime(time)}
            </div>
            <div className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 opacity-80 leading-none">
              {formatDate(time)}
            </div>
          </div>
          
          {/* Nút thoát Kiosk */}
          <button 
            onClick={() => {
              if (confirm("Bạn có chắc chắn muốn thoát chế độ Kiosk và xóa cấu hình hiện tại?")) {
                localStorage.removeItem("kiosk_device_token");
                localStorage.removeItem("kiosk_location_slug");
                router.push("/kiosk");
              }
            }}
            className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300"
            title="Thoát Kiosk / Đổi Máy"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Khung Camera co giãn flex-1 tối ưu không gian dọc */}
      <div className={`relative flex-1 w-full min-h-[280px] overflow-hidden bg-slate-950 border-3 sm:border-4 transition-all duration-500 group rounded-2xl sm:rounded-3xl shadow-2xl ${status === "SUCCESS" ? "border-emerald-500 shadow-emerald-500/10" :
        status === "ERROR" ? "border-red-500 shadow-red-500/10" :
          status === "VERIFYING" || status === "SCANNING" ? "border-blue-500 shadow-blue-500/10 animate-pulse" :
            "border-slate-800 shadow-[0_0_40px_rgba(59,130,246,0.05)]"
        }`}>

        {/* Lớp Overlay Gradient Chấm công Blue cho góc quay */}
        <div className="absolute inset-0 bg-linear-to-tr from-blue-900/15 to-transparent z-10 pointer-events-none mix-blend-overlay"></div>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlaying={() => setIsCameraReady(true)}
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" // Lật gương
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-20 pointer-events-none opacity-60"
        />

        {/* Lớp overlay CHALLENGE Liveness (Yêu cầu quay mặt) */}
        {status === "CHALLENGE" && (
          <>
            <style>{`
              @keyframes slide-down-kiosk-challenge {
                0% { transform: translateY(-100%); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
              .kiosk-challenge-slide-down {
                animation: slide-down-kiosk-challenge 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
            `}</style>
            <div className="absolute top-0 inset-x-0 z-40 bg-slate-900/90 backdrop-blur-md rounded-none p-3 border-b border-orange-500/40 shadow-xl flex flex-col items-center justify-center kiosk-challenge-slide-down text-center">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-orange-400 animate-pulse shrink-0" />
                <div className="text-orange-400 font-bold text-xs sm:text-sm tracking-wide uppercase">
                  {livenessInstruction}
                </div>
              </div>
              <div className="w-full max-w-[160px] h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-linear-to-r from-orange-500 to-amber-400 transition-all duration-300 ease-out" 
                  style={{ width: `${livenessProgress}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* Lớp overlay Bắt đầu chấm công khi IDLE (chỉ hiện khi hệ thống sẵn sàng) */}
        {status === "IDLE" && isSystemReady && (
          <button
            onClick={startScanning}
            className="group absolute inset-0 z-45 bg-slate-950/70 hover:bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white border-0 transition-all duration-300 cursor-pointer animate-fade-in animate-duration-300"
          >
            {/* Hộp chỉ dẫn trung tâm được giữ tỷ lệ đẹp */}
            <div
              style={{ width: "288px" }}
              className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 border border-blue-400/30 shadow-[0_0_50px_rgba(59,130,246,0.35)] transition-all duration-300 transform group-hover:scale-105 group-active:scale-95"
            >
              {/* Outer pulsing ring */}
              <span className="absolute -inset-1.5 rounded-3xl bg-linear-to-r from-blue-500 to-indigo-500 blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></span>

              <div className="relative w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <Scan className="w-8 h-8 text-blue-200 animate-pulse" />
              </div>

              <span className="relative text-lg font-black tracking-wider uppercase drop-shadow-md">
                Chấm Công
              </span>

              <span className="relative text-[10px] text-blue-200/80 font-medium mt-2 leading-relaxed">
                Nhấn bất kỳ đâu để bắt đầu quét
              </span>
            </div>
          </button>
        )}

        {/* Lớp overlay hiển thị thông tin chi tiết của nhân sự khi check-in thành công */}
        {status === "SUCCESS" && employeeData && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            {/* Vòng tròn Avatar sinh động */}
            <div className="w-24 h-24 rounded-full border-4 border-emerald-500 bg-slate-800 shadow-lg shadow-emerald-500/20 flex items-center justify-center overflow-hidden mb-4 shrink-0 relative">
              {(() => {
                const av = employeeData.avatar;
                if (av === 'Zap') return <Users className="w-12 h-12 text-amber-400" />;
                if (av === 'Heart') return <Users className="w-12 h-12 text-rose-400" />;
                if (av === 'Palette') return <Users className="w-12 h-12 text-purple-400" />;
                if (av === 'Coffee') return <Users className="w-12 h-12 text-amber-600" />;
                if (av === 'Sparkles') return <Users className="w-12 h-12 text-cyan-400" />;
                return <Users className="w-12 h-12 text-slate-400" />;
              })()}
            </div>

            {/* Badge Trạng Thái */}
            <span className="text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">
              XÁC THỰC THÀNH CÔNG
            </span>

            {/* Tên & Thông tin */}
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">
              {employeeData.fullName}
            </h2>
            <p className="text-sm font-semibold text-slate-300 mb-0.5">
              {employeeData.role || "Nhân viên"}
            </p>
            <span className="font-mono bg-blue-500/20 border border-blue-500/30 text-blue-200 px-3 py-1 rounded text-xs font-bold mb-4">
              Mã NV: {employeeData.employeeCode}
            </span>

            {/* Lời chào thân thiện */}
            <div className="h-px bg-slate-800 w-32 my-2" />
            
            {employeeData.action === "CHECK_IN" && employeeData.lateMinutes !== undefined && employeeData.lateMinutes > 0 && (
              <div className="bg-rose-500/20 border border-rose-500/40 px-4 py-2 rounded-xl mb-3 shadow-lg">
                <p className="text-sm text-rose-200 font-extrabold flex items-center justify-center gap-1.5">
                  ⚠️ Đi muộn {employeeData.lateMinutes} phút
                </p>
              </div>
            )}
            
            {employeeData.action === "CHECK_OUT" && employeeData.earlyMinutes !== undefined && employeeData.earlyMinutes > 0 && (
              <div className="bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-xl mb-3 shadow-lg">
                <p className="text-sm text-amber-200 font-extrabold flex items-center justify-center gap-1.5">
                  ⚠️ Về sớm {employeeData.earlyMinutes} phút
                </p>
              </div>
            )}

            <p className="text-sm text-emerald-200 font-bold mt-3 leading-relaxed max-w-[340px] mx-auto">
              {employeeData.action === "CHECK_OUT" 
                ? "Cảm ơn bạn đã chấm công! Hẹn gặp lại bạn vào ngày mai."
                : "Cảm ơn bạn đã chấm công! Chúc bạn một ngày làm việc tràn đầy năng lượng."}
            </p>
          </div>
        )}

        {/* Khung ngắm (Viewfinder) */}
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-4 sm:p-6">
          <div className={`w-full h-full border-2 rounded-2xl sm:rounded-3xl transition-all duration-500 ${status === "SUCCESS" ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.2)]" :
            status === "ERROR" ? "border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.2)]" :
              status === "VERIFYING" ? "border-blue-400 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-102" :
                status === "SCANNING" ? "border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-pulse" :
                  "border-slate-800/40 border-dashed"
            }`}></div>
        </div>
        {/* Overlay for status messages */}
        {/* {status !== "IDLE" && (
          <div className={styles.overlay}>
            <div className={styles.box}>
              {status === "SCANNING" && (
                <p className={styles.message}>Vui lòng nhìn thẳng vào camera...</p>
              )}
              {status === "CHALLENGE" && (
                <p className={styles.message}>{livenessInstruction}</p>
              )}
              {status === "VERIFYING" && (
                <p className={styles.message}>Đang xác thực...</p>
              )}
              {status === "SUCCESS" && employeeData && (
                <>
                  <p className={styles.message}>Chấm công thành công!</p>
                  <p className={styles.sub}>{employeeData.fullName}</p>
                </>
              )}
              {status === "ERROR" && (
                <p className={styles.error}>{message}</p>
              )}
            </div>
          </div>
        )} */}

        {/* Cổng kiểm soát trạng thái sẵn sàng (Premium Loading Gate UI) */}
        {!isSystemReady && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            {/* Pulsing Glowing Circle */}
            <div className="relative w-20 h-20 mb-8 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse"></span>
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-black text-white tracking-wide mb-2 uppercase bg-clip-text text-transparent bg-linear-to-r from-blue-400 via-indigo-200 to-emerald-400">
              Khởi tạo hệ thống
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-[320px] mb-6 font-medium">
              Vui lòng đợi giây lát trong khi các dịch vụ bảo mật và AI được thiết lập...
            </p>

            {/* Checklist Card */}
            <div className="w-full max-w-[360px] bg-slate-900/60 border border-white/5 rounded-2xl p-4 space-y-3.5 shadow-xl text-left">
              {/* Item 1: AI Models */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(isModelWarmedUp && isLivenessModelLoaded) ? "bg-emerald-500/10 text-emerald-400" :
                    (isModelLoaded && isLivenessModelLoaded) ? "bg-blue-500/10 text-blue-400" : "bg-slate-800 text-slate-500"
                    }`}>
                    <Brain size={16} className={(!isModelLoaded || !isLivenessModelLoaded) ? "animate-pulse" : ""} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">Trí tuệ nhân tạo (AI)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {(!isModelLoaded || !isLivenessModelLoaded) ? "Đang tải mô hình..." : !isModelWarmedUp ? "Đang tối ưu cấu hình..." : "Sẵn sàng hoạt động"}
                    </span>
                  </div>
                </div>
                {(isModelWarmedUp && isLivenessModelLoaded) ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
                )}
              </div>

              <div className="h-px bg-slate-800/60 w-full" />

              {/* Item 2: GPS Location */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${deviceInfo?.requireGps === false
                    ? "bg-slate-500/10 text-slate-400"
                    : gpsLocation
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-slate-800 text-slate-500"
                    }`}>
                    <MapPin size={16} className={deviceInfo?.requireGps === false ? "" : !gpsLocation ? "animate-bounce" : ""} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">Định vị GPS</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-[240px]">
                      {deviceInfo?.requireGps === false
                        ? "Được tắt bởi Quản trị viên (Không yêu cầu)"
                        : gpsLocation
                          ? `Đã định vị (${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)}) - Sai số ±${gpsLocation.accuracy ? Math.round(gpsLocation.accuracy) : 0}m`
                          : "Đang xác thực tọa độ..."}
                    </span>
                  </div>
                </div>
                {deviceInfo?.requireGps === false || gpsLocation ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
                )}
              </div>

              <div className="h-px bg-slate-800/60 w-full" />

              {/* Item 3: Camera Stream */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCameraReady ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                    }`}>
                    <Camera size={16} className={!isCameraReady ? "animate-pulse" : ""} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">Thiết bị Camera</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {isCameraReady ? "Kết nối ổn định" : "Đang khởi động luồng video..."}
                    </span>
                  </div>
                </div>
                {isCameraReady ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bảng Trạng Thái (Khu vực thông báo cực kỳ rõ ràng, rực rỡ) */}
      <div className={`mt-4 p-4 sm:p-5 rounded-2xl sm:rounded-3xl backdrop-blur-xl border transition-all duration-500 shadow-2xl ${status === "SUCCESS" ? "bg-emerald-950/80 border-emerald-400 shadow-emerald-500/20" :
        status === "ERROR" ? "bg-red-950/80 border-red-400 shadow-red-500/20 animate-shake" :
          status === "VERIFYING" || status === "SCANNING" ? "bg-blue-950/60 border-blue-500/50 shadow-blue-500/10" :
            "bg-slate-800/45 border-slate-700/60"
        }`}>
        <div className="flex items-center gap-4 sm:gap-5">

          {/* Icon Trạng Thái */}
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 shadow-lg ${status === "SUCCESS" ? "bg-emerald-500/25 text-emerald-400 scale-105 border border-emerald-400/30 animate-pulse" :
            status === "ERROR" ? "bg-red-500/25 text-red-400 scale-105 border border-red-400/30" :
              status === "VERIFYING" || status === "SCANNING" ? "bg-blue-500/25 text-blue-400 animate-pulse border border-blue-400/30" :
                "bg-slate-700/60 text-slate-400 border border-slate-600/30"
            }`}>
            {status === "SUCCESS" ? <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" /> :
              status === "ERROR" ? <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" /> :
                status === "VERIFYING" ? <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" /> :
                  status === "SCANNING" ? <Scan className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-blue-400" /> :
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8" />}
          </div>

          {/* Text Message - Bố cục lệch trái rộng rãi */}
          <div className="text-left flex-1 min-w-0">
            <h3 className={`text-xl sm:text-2xl font-black mb-0.5 tracking-wide truncate transition-colors ${status === "SUCCESS" ? "text-emerald-400" :
              status === "ERROR" ? "text-red-400" :
                status === "VERIFYING" || status === "SCANNING" ? "text-blue-400" :
                  "text-white"
              }`}>
              {status === "SUCCESS" && employeeData ? `CHÀO, ${employeeData.fullName.toUpperCase()}` :
                status === "ERROR" ? "CHẤM CÔNG THẤT BẠI" :
                  "CHẤM CÔNG TIMEKEEPING"}
            </h3>
            <p className={`font-semibold text-sm sm:text-base leading-snug ${status === "SUCCESS" ? "text-emerald-200" :
              status === "ERROR" ? "text-red-200" :
                status === "VERIFYING" || status === "SCANNING" ? "text-blue-200" :
                  "text-slate-300"
              }`}>
              {message}
            </p>
            {livenessScore !== null && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold tracking-wider">
                <span className="text-slate-400">AI Liveness:</span>
                {livenessScore >= LIVENESS_THRESHOLD ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase font-black">
                    HỢP LỆ
                  </span>
                ) : (
                  <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] uppercase font-black animate-pulse">
                    CẢNH BÁO GIẢ MẠO
                  </span>
                )}
              </div>
            )}

            {status === "ERROR" && gpsErrorDetails && (
              <div className="mt-3 p-3 bg-red-950/90 border border-red-500/30 rounded-xl space-y-2 text-xs text-red-200 max-w-xl shadow-lg">
                <div className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-red-400">
                  <MapPin size={12} /> Thông tin định vị chi tiết
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                  <div>
                    • Tọa độ thiết bị: <strong>{gpsErrorDetails.deviceGps.lat.toFixed(6)}, {gpsErrorDetails.deviceGps.lng.toFixed(6)}</strong>
                    {gpsErrorDetails.deviceGps.accuracy && ` (±${Math.round(gpsErrorDetails.deviceGps.accuracy)}m)`}
                  </div>
                  <div>
                    • Tọa độ cơ sở: <strong>{gpsErrorDetails.locationGps.lat.toFixed(6)}, {gpsErrorDetails.locationGps.lng.toFixed(6)}</strong>
                  </div>
                  <div>
                    • Khoảng cách: <strong className="text-white bg-red-600 px-1 py-0.5 rounded font-mono">{Math.round(gpsErrorDetails.calculatedDistance)}m</strong>
                  </div>
                  <div>
                    • Cho phép tối đa: <strong>{gpsErrorDetails.locationGps.radius}m</strong>
                  </div>
                </div>
                <div className="h-px bg-red-800/40 my-2" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[9px] text-red-300 leading-normal">
                    * Nếu là máy tính cố định, hãy copy tọa độ trên và cập nhật vào trang Quản lý máy chấm công.
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${gpsErrorDetails.deviceGps.lat.toFixed(6)}, ${gpsErrorDetails.deviceGps.lng.toFixed(6)}`);
                      alert("Đã copy tọa độ thiết bị!");
                    }}
                    className="px-2 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-bold transition-all border border-red-600/30 shadow-sm shrink-0 cursor-pointer self-end sm:self-auto"
                  >
                    Sao chép tọa độ thiết bị
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
