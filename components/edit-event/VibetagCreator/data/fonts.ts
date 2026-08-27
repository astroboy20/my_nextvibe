/**
 * Font / text-style presets for the VibeTag studio.
 *
 * IMPORTANT: fontFamily in canvasStyles MUST exactly match the font-family
 * name declared in the @font-face rule in globals.css.
 *
 * webStyles   → CSS applied to the HTML preview button
 * canvasStyles → applied to Fabric.js Textbox when added to canvas
 */

export const fonts = [
  // ── Clean / Modern ────────────────────────────────────────────────────────
  {
    name: "Bold & Clean",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, color: "#111", letterSpacing: "0.04em" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fill: "#111111", charSpacing: 40 },
  },
  {
    name: "Minimal White",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 300, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", letterSpacing: "0.08em" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "300", fill: "#ffffff", shadow: { color: "rgba(0,0,0,0.6)", blur: 4, offsetX: 0, offsetY: 1 }, charSpacing: 80 },
  },

  // ── Outlined / Stroke ─────────────────────────────────────────────────────
  {
    name: "Outlined Black",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 900, color: "transparent", WebkitTextStroke: "1.5px #111", letterSpacing: "0.06em" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "900", fill: "transparent", stroke: "#111111", strokeWidth: 1.5, paintFirst: "stroke" },
  },
  {
    name: "Outlined White",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 900, color: "transparent", WebkitTextStroke: "1.5px #fff", letterSpacing: "0.06em" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "900", fill: "transparent", stroke: "#ffffff", strokeWidth: 1.5, paintFirst: "stroke" },
  },

  // ── Gradient fills ────────────────────────────────────────────────────────
  {
    name: "Gold Gradient",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#f7d060,#e0a020,#f7d060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#f7d060", 0.5, "#e0a020", 1, "#f7d060"] },
  },
  {
    name: "Sunset",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#ff6b35,#f7c59f,#ff1744)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#ff6b35", 0.5, "#f7c59f", 1, "#ff1744"] },
  },
  {
    name: "Ocean Vibe",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#00b4d8,#0077b6,#90e0ef)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#00b4d8", 0.5, "#0077b6", 1, "#90e0ef"] },
  },
  {
    name: "Rose Gold",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#f9a8d4,#ec4899,#fda4af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#f9a8d4", 0.5, "#ec4899", 1, "#fda4af"] },
  },
  {
    name: "Purple Haze",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, background: "linear-gradient(135deg,#a855f7,#7c3aed,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#a855f7", 0.5, "#7c3aed", 1, "#ec4899"] },
  },

  // ── Neon / Glow ───────────────────────────────────────────────────────────
  {
    name: "Neon Pink",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, color: "#ff2d78", textShadow: "0 0 6px #ff2d78,0 0 20px #ff2d78,0 0 40px #ff2d78" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fill: "#ff2d78", shadow: { color: "#ff2d78", blur: 30, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "Neon Blue",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, color: "#00d4ff", textShadow: "0 0 6px #00d4ff,0 0 20px #00d4ff,0 0 40px #00d4ff" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fill: "#00d4ff", shadow: { color: "#00d4ff", blur: 30, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "Neon Green",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, color: "#39ff14", textShadow: "0 0 6px #39ff14,0 0 20px #39ff14,0 0 40px #39ff14" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fill: "#39ff14", shadow: { color: "#39ff14", blur: 30, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "Neon Purple",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 800, color: "#bf5fff", textShadow: "0 0 6px #bf5fff,0 0 20px #bf5fff,0 0 40px #bf5fff" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "800", fill: "#bf5fff", shadow: { color: "#bf5fff", blur: 30, offsetX: 0, offsetY: 0 } },
  },

  // ── 3-D / Drop Shadow ─────────────────────────────────────────────────────
  {
    name: "3D Black",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 900, color: "#fff", textShadow: "2px 2px 0 #000,4px 4px 0 #333" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "900", fill: "#ffffff", stroke: "#000000", strokeWidth: 0.5, shadow: { color: "#000000", blur: 0, offsetX: 4, offsetY: 4 } },
  },
  {
    name: "3D Gold",
    webStyles: { fontFamily: "Helvetica, sans-serif", fontWeight: 900, color: "#f7d060", textShadow: "2px 2px 0 #7a5c00,4px 4px 0 #5c3d00" },
    canvasStyles: { fontFamily: "Helvetica", fontWeight: "900", fill: "#f7d060", shadow: { color: "#7a5c00", blur: 0, offsetX: 4, offsetY: 4 } },
  },

  // ── Decorative / Script ───────────────────────────────────────────────────
  {
    name: "Adam Script",
    webStyles: { fontFamily: "'Adam Script', cursive", fontSize: "1.4em", color: "#222" },
    canvasStyles: { fontFamily: "Adam Script", fontSize: 28, fill: "#222222" },
  },
  {
    name: "Script Gold",
    webStyles: { fontFamily: "'Adam Script', cursive", fontSize: "1.4em", background: "linear-gradient(135deg,#f7d060,#e0a020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Adam Script", fontSize: 28, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#f7d060", 1, "#e0a020"] },
  },
  {
    name: "Sweet Unicorn",
    // font-family from @font-face is 'Sweet Unicorn'
    webStyles: { fontFamily: "'Sweet Unicorn', cursive", fontSize: "1.4em", color: "#f2b122", textShadow: "5px 5px 5px rgba(242,177,34,1)" },
    canvasStyles: { fontFamily: "Sweet Unicorn", fontSize: 28, fill: "#f2b122", shadow: { color: "rgb(242,177,34)", blur: 5, offsetX: 5, offsetY: 5 } },
  },
  {
    name: "Geraldine",
    webStyles: { fontFamily: "'Geraldine', cursive", fontSize: "1.3em", color: "#222" },
    canvasStyles: { fontFamily: "Geraldine", fontSize: 26, fill: "#222222" },
  },
  {
    name: "Waltograph",
    webStyles: { fontFamily: "'Waltograph', fantasy", fontSize: "1.2em", color: "#1a237e" },
    canvasStyles: { fontFamily: "Waltograph", fontSize: 24, fill: "#1a237e" },
  },
  {
    name: "Lovely Script",
    webStyles: { fontFamily: "'Lovely Script', cursive", fontSize: "1.4em", color: "#ad1457" },
    canvasStyles: { fontFamily: "Lovely Script", fontSize: 28, fill: "#ad1457" },
  },
  {
    name: "Friday Vibes",
    webStyles: { fontFamily: "'Friday Vibes', cursive", fontSize: "1.3em", color: "#e65100" },
    canvasStyles: { fontFamily: "Friday Vibes", fontSize: 26, fill: "#e65100" },
  },

  // ── Street / Graffiti ─────────────────────────────────────────────────────
  {
    name: "Graffiti Treat",
    webStyles: { fontFamily: "'Graffiti Treat', cursive", fontSize: "1.3em", color: "#e53935", textShadow: "3px 3px 0 #000" },
    canvasStyles: { fontFamily: "Graffiti Treat", fontSize: 26, fill: "#e53935", shadow: { color: "#000000", blur: 0, offsetX: 3, offsetY: 3 } },
  },
  {
    name: "Throwupz",
    webStyles: { fontFamily: "'Throwupz', cursive", fontSize: "1.3em", color: "#fff", WebkitTextStroke: "1px #111" },
    canvasStyles: { fontFamily: "Throwupz", fontSize: 26, fill: "#ffffff", stroke: "#111111", strokeWidth: 1, paintFirst: "stroke" },
  },
  {
    name: "The Jacatra",
    // @font-face family name is 'THE JACATRA' (all caps)
    webStyles: { fontFamily: "'THE JACATRA', cursive", fontSize: "1.2em", background: "linear-gradient(45deg,red,blue)", WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text" },
    canvasStyles: { fontFamily: "THE JACATRA", fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#ff0000", 1, "#0000ff"] },
  },
  {
    name: "Deutsch Gothic",
    webStyles: { fontFamily: "'Deutsch Gothic', fantasy", fontSize: "1.2em", color: "#212121" },
    canvasStyles: { fontFamily: "Deutsch Gothic", fontSize: 24, fill: "#212121" },
  },
  {
    name: "Docallisme",
    // @font-face family name is 'DOCALLISME ON STREET' (all caps)
    webStyles: { fontFamily: "'DOCALLISME ON STREET', cursive", fontSize: "1.2em", color: "#212121", textShadow: "5px 5px 5px rgba(0,0,0,0.5)" },
    canvasStyles: { fontFamily: "DOCALLISME ON STREET", fontSize: 24, shadow: { color: "rgba(0,0,0,0.5)", blur: 5, offsetX: 5, offsetY: 5 } },
  },

  // ── Seasonal / Themed ─────────────────────────────────────────────────────
  {
    name: "Holiday Wishes",
    webStyles: { fontFamily: "'Holiday Wishes', cursive", fontSize: "1.3em", color: "#c62828", textShadow: "0 0 8px rgba(198,40,40,0.5)" },
    canvasStyles: { fontFamily: "Holiday Wishes", fontSize: 26, fill: "#c62828", shadow: { color: "rgba(198,40,40,0.5)", blur: 8, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "Haunted Moon",
    webStyles: { fontFamily: "'Haunted Moon', cursive", fontSize: "1.3em", color: "#ff6f00", textShadow: "0 0 10px rgba(255,111,0,0.7)" },
    canvasStyles: { fontFamily: "Haunted Moon", fontSize: 26, fill: "#ff6f00", shadow: { color: "rgba(255,111,0,0.7)", blur: 10, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "October Twilight",
    webStyles: { fontFamily: "'October Twilight', cursive", fontSize: "1.2em", color: "#4a148c" },
    canvasStyles: { fontFamily: "October Twilight", fontSize: 24, fill: "#4a148c" },
  },
  {
    name: "Amazing Sweety",
    webStyles: { fontFamily: "'Amazing Sweety', cursive", fontSize: "1.3em", color: "#ad1457" },
    canvasStyles: { fontFamily: "Amazing Sweety", fontSize: 26, fill: "#ad1457" },
  },
  {
    name: "Teaberry Essence",
    webStyles: { fontFamily: "'Teaberry Essence', cursive", fontSize: "1.2em", color: "#880e4f" },
    canvasStyles: { fontFamily: "Teaberry Essence", fontSize: 24, fill: "#880e4f" },
  },
  {
    name: "Welcome Summer",
    webStyles: { fontFamily: "'Welcome Summer', cursive", fontSize: "1.3em", background: "linear-gradient(135deg,#ff9800,#ff5722)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    canvasStyles: { fontFamily: "Welcome Summer", fontSize: 26, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 200, y: 60 }, fillLinearGradientColorStops: [0, "#ff9800", 1, "#ff5722"] },
  },
  {
    name: "The Nightfall",
    webStyles: { fontFamily: "'The Nightfall', cursive", fontSize: "1.2em", color: "#e3f2fd", textShadow: "0 0 12px #1565c0" },
    canvasStyles: { fontFamily: "The Nightfall", fontSize: 24, fill: "#e3f2fd", shadow: { color: "#1565c0", blur: 12, offsetX: 0, offsetY: 0 } },
  },
  {
    name: "Menlawai",
    webStyles: { fontFamily: "'Menlawai', cursive", fontSize: "1.2em", color: "#00695c" },
    canvasStyles: { fontFamily: "Menlawai", fontSize: 24, fill: "#00695c" },
  },
  {
    name: "Mind The Caps",
    webStyles: { fontFamily: "'Mind The Caps', sans-serif", fontWeight: 700, letterSpacing: "0.1em", color: "#212121" },
    canvasStyles: { fontFamily: "Mind The Caps", fontWeight: "700", charSpacing: 100 },
  },
  {
    name: "Retrow Mentho",
    webStyles: { fontFamily: "'Retrow Mentho', fantasy", fontSize: "1.2em", color: "#00bcd4", textShadow: "2px 2px 0 #006064" },
    canvasStyles: { fontFamily: "Retrow Mentho", fontSize: 24, fill: "#00bcd4", shadow: { color: "#006064", blur: 0, offsetX: 2, offsetY: 2 } },
  },
  {
    name: "Rocket Chicken",
    webStyles: { fontFamily: "'Rocket Chicken', fantasy", fontSize: "1.2em", color: "#b71c1c", textShadow: "2px 2px 0 #000" },
    canvasStyles: { fontFamily: "Rocket Chicken", fontSize: 24, fill: "#b71c1c", shadow: { color: "#000000", blur: 0, offsetX: 2, offsetY: 2 } },
  },
];
