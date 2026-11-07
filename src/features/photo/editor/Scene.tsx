import { Group, ImageShader, Paragraph, Path, Rect, RoundedRect, Shader, Skia, SkImage, Image as SkiaImage } from '@shopify/react-native-skia';
import { toneEffect, toneUniforms } from './color';
import { boxOf, stickerParagraph, textParagraph } from './paragraphs';
import type { EditState, Pt, Stroke } from './types';

export function strokePath(points: Pt[]) {
  const p = Skia.PathBuilder.Make();
  if (!points.length) return p.detach();
  p.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    p.lineTo(points[0].x + 0.01, points[0].y);
    return p.detach();
  }
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    p.quadTo(points[i].x, points[i].y, mx, my);
  }
  const last = points[points.length - 1];
  p.lineTo(last.x, last.y);
  return p.detach();
}

/** The photo with tone/filter shader applied. */
export function TonedImage({ image, s }: { image: SkImage; s: Pick<EditState, 'adjust' | 'filter' | 'filterAmount' | 'width' | 'height'> }) {
  const rect = { x: 0, y: 0, width: s.width, height: s.height };
  if (!toneEffect) return <SkiaImage image={image} x={0} y={0} width={s.width} height={s.height} fit="fill" />;
  return (
    <Rect {...rect}>
      <Shader source={toneEffect} uniforms={toneUniforms(s.adjust, s.filter, s.filterAmount, s.width, s.height)}>
        <ImageShader image={image} fit="fill" rect={rect} tx="clamp" ty="clamp" />
      </Shader>
    </Rect>
  );
}

function Strokes({ strokes }: { strokes: Stroke[] }) {
  if (!strokes.length) return null;
  return (
    <Group layer>
      {strokes.map((st) => (
        <Path
          key={st.id}
          path={strokePath(st.points)}
          color={st.erase ? '#000' : st.color}
          style="stroke"
          strokeWidth={st.size}
          strokeCap="round"
          strokeJoin="round"
          blendMode={st.erase ? 'clear' : 'srcOver'}
        />
      ))}
    </Group>
  );
}

/**
 * Whole document in IMAGE PIXEL space (0..width, 0..height). Rendered inside a scaled
 * Group for preview and via drawAsImage at 1:1 for export, so both are identical.
 */
export function SceneContent({ image, s, extraStroke, hideLayers }: { image: SkImage; s: EditState; extraStroke?: Stroke | null; hideLayers?: boolean }) {
  const strokes = extraStroke ? [...s.strokes, extraStroke] : s.strokes;
  return (
    <Group clip={{ x: 0, y: 0, width: s.width, height: s.height }}>
      <TonedImage image={image} s={s} />
      {hideLayers ? null : (
        <>
          <Strokes strokes={strokes} />
          {s.texts.map((t) => {
            const p = textParagraph(t);
            const b = boxOf(p, t.x, t.y);
            const pad = t.size * 0.28;
            return (
              <Group key={t.id}>
                {t.bg ? (
                  <RoundedRect x={b.x - pad} y={b.y - pad * 0.5} width={b.width + pad * 2} height={b.height + pad} r={t.size * 0.3} color={t.color} />
                ) : null}
                <Paragraph paragraph={p} x={b.x} y={b.y} width={b.width} />
              </Group>
            );
          })}
          {s.stickers.map((st) => {
            const p = stickerParagraph(st);
            const b = boxOf(p, st.x, st.y);
            return <Paragraph key={st.id} paragraph={p} x={b.x} y={b.y} width={b.width} />;
          })}
        </>
      )}
    </Group>
  );
}
