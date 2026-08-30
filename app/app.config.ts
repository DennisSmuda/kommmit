export default defineAppConfig({
  ui: {
    colors: {
      // Matches the reference design's SPINN palette: a warm orange accent
      // (Tailwind orange-500 is #f97316, the design's exact accent hex) over
      // stone neutrals for its near-black ink and warm grays, instead of the
      // cooler default slate.
      primary: 'orange',
      neutral: 'stone',
    },
  },
})
