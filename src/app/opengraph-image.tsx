import { ImageResponse } from 'next/og';

export const alt = 'Trovun — the student marketplace for Waterloo';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background:
          'radial-gradient(circle at 78% 18%, rgba(231,188,53,.23), transparent 30%), linear-gradient(145deg, #06070a, #0d131d 55%, #070a0f)',
        color: '#f7f4ee',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        height: '100%',
        justifyContent: 'space-between',
        padding: '70px 76px',
        position: 'relative',
        width: '100%',
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 22 }}>
        <div
          style={{
            alignItems: 'center',
            background: '#f2d56f',
            borderRadius: 22,
            color: '#080c13',
            display: 'flex',
            fontSize: 48,
            fontWeight: 900,
            height: 82,
            justifyContent: 'center',
            width: 82,
          }}
        >
          T
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1.5px' }}>Trovun</span>
          <span
            style={{
              color: 'rgba(247,244,238,.52)',
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: '4px',
              marginTop: 6,
              textTransform: 'uppercase',
            }}
          >
            Waterloo marketplace
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 950 }}>
        <span
          style={{
            color: '#f2d56f',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '5px',
            textTransform: 'uppercase',
          }}
        >
          One campus · One marketplace
        </span>
        <span
          style={{
            fontSize: 78,
            fontWeight: 900,
            letterSpacing: '-4px',
            lineHeight: 0.98,
            marginTop: 24,
          }}
        >
          Waterloo buys from Waterloo.
        </span>
        <span
          style={{
            color: 'rgba(247,244,238,.64)',
            fontSize: 25,
            lineHeight: 1.4,
            marginTop: 28,
          }}
        >
          Textbooks, tech, clothing, and home essentials from verified students.
        </span>
      </div>
    </div>,
    size,
  );
}
