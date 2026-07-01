import React from "react";

// Loại 1 ===============================
// export function Loading() {
//   return (
//     <div className="flex items-center justify-center space-x-2">
//       {[0, 1, 2].map((groupIndex) => (
//         <div key={groupIndex} className="flex flex-col space-y-1">
//           {[0, 1, 2].map((dotIndex) => (
//             <span
//               key={dotIndex}
//               className="block w-2 h-2 bg-blue-500 rounded-full"
//               style={{
//                 animation: `dotPulse 1s ease-in-out infinite`,
//                 animationDelay: `${(groupIndex * 0.2) + (dotIndex * 0.1)}s`,
//               }}
//             ></span>
//           ))}
//         </div>
//       ))}
//       <style jsx>{`
//         @keyframes dotPulse {
//           0%, 80%, 100% {
//             opacity: 0.3;
//             transform: scale(0.8);
//           }
//           40% {
//             opacity: 1;
//             transform: scale(1.2);
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// Loại 2 ===============================
// export function Loading({ count = 4 }: { count?: number }) {
//   return (
//     <div className="flex items-center justify-center w-full h-full">
//       <div className="relative w-10 h-10 animate-spin-slow">
//         {Array.from({ length: count }).map((_, i) => (
//           <span
//             key={i}
//             className="absolute w-2 h-2 bg-blue-500 rounded-full"
//             style={{
//               top: "50%",
//               left: "50%",
//               transform: `rotate(${(360 / count) * i}deg) translate(14px)`,
//               animation: "dotBounce 1s ease-in-out infinite",
//               animationDelay: `${i * 0.15}s`,
//             }}
//           ></span>
//         ))}
//       </div>

//       <style jsx>{`
//         @keyframes dotBounce {
//           0%, 80%, 100% {
//             transform: scale(0.8);
//             opacity: 0.6;
//           }
//           40% {
//             transform: scale(1.3);
//             opacity: 1;
//           }
//         }
//         @keyframes spinSlow {
//           0% {
//             transform: rotate(0deg);
//           }
//           100% {
//             transform: rotate(360deg);
//           }
//         }
//         .animate-spin-slow {
//           animation: spinSlow 1.2s linear infinite;
//         }
//       `}</style>
//     </div>
//   );
// }

// Loại 3 ===============================
// export function Loading({ count = 3 }: { count?: number }) {
//   return (
//     <div className="flex items-center justify-center w-full h-full">
//       <div className="relative w-10 h-10">
//         {Array.from({ length: count }).map((_, i) => (
//           <span
//             key={i}
//             className="absolute w-2 h-2 bg-blue-500 rounded-full"
//             style={{
//               top: "50%",
//               left: "50%",
//               transformOrigin: "0 -14px",
//               animation: `orbit 1.2s cubic-bezier(0.5, 0.2, 0.5, 0.8) infinite`,
//               animationDelay: `${(i * 1.2) / count}s`,
//             }}
//           ></span>
//         ))}
//       </div>

//       <style jsx>{`
//         @keyframes orbit {
//           0% {
//             transform: rotate(0deg) scale(0.7);
//             opacity: 0.5;
//           }
//           25% {
//             transform: rotate(90deg) scale(1);
//             opacity: 1;
//           }
//           50% {
//             transform: rotate(180deg) scale(0.7);
//             opacity: 0.5;
//           }
//           75% {
//             transform: rotate(270deg) scale(1);
//             opacity: 1;
//           }
//           100% {
//             transform: rotate(360deg) scale(0.7);
//             opacity: 0.5;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }

// Loại 4 ===============================
export function Loading() {
  const count = 4;
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative w-10 h-10 animate-spin-slow">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 bg-blue-500 rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${(360 / count) * i}deg) translate(14px)`,
              animation: "fadeDot 1s linear infinite",
              animationDelay: `${i * 0.25}s`,
            }}
          ></span>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeDot {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(0.7);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes spinSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spinSlow 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
