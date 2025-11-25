/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, 
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // 줄바꿈 없이 한 줄로 입력해야 합니다.
            // 변경점: connect-src에 'https://kr-col-ext.nelo.navercorp.com' 추가 (네이버 로그 수집 허용)
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://oapi.map.naver.com http://oapi.map.naver.com *.map.naver.com *.map.naver.net *.pstatic.net http://localhost:3000; img-src 'self' data: blob: *.map.naver.com *.map.naver.net *.pstatic.net http://static.naver.net http://localhost:3000; connect-src 'self' *.map.naver.com *.map.naver.net *.pstatic.net https://kr-col-ext.nelo.navercorp.com http://localhost:3000 http://127.0.0.1:8000;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;