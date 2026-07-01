import Script from "next/script";

export default function FacebookSDK() {
  return (
    <>
      <div id="fb-root" />
      <Script
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src="https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v23.0"
      />
    </>
  );
}
