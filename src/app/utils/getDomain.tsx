// lấy domain hiện tại https://domain.com
export const getDomain = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return ""; // fallback khi SSR
};
