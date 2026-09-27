import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Long-lived, aggressive caching for the frame sequences: repeat
        // visits and mid-session scroll-backs are served from cache instead
        // of re-fetching. Trade-off: these filenames are NOT content-hashed,
        // so if a frame's content is ever replaced under the same path (as
        // happened when we bumped mobile resolution), a browser that already
        // cached the old bytes won't see the new ones until this max-age
        // (1 year) expires or the visitor hard-refreshes. If frame content
        // changes again later, rename the folder/files to bust the cache.
        source: "/frames/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
