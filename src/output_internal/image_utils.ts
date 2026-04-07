/**
 * Generates an SVG string based on calculation results.
 */
export function generateSVG(
    html: string,
    latex: string,
    verbal: string,
    roundedStr: string,
    strategyId: string,
    precision: number,
): string {
    const scaleFactor = 1.3;
    const averagePxPerChar = 8;
    const paddingHorizontal = 16;
    const paddingVertical = 16;

    const textToMeasure = `round_{${strategyId}}(${latex}, ${precision}) = ${roundedStr}`;
    const estimatedWidth: number = (textToMeasure.length * averagePxPerChar * scaleFactor)
        + (paddingHorizontal * 2);
    const finalWidth: number = Math.max(300, Math.min(2000, Math.ceil(estimatedWidth)));

    let verticalExpansion = 0;
    const fracMatches: RegExpMatchArray | null = latex.match(/\\frac/g);
    if (fracMatches) { verticalExpansion += fracMatches.length * 15; }
    const sqrtMatches: RegExpMatchArray | null = latex.match(/\\sqrt/g);
    if (sqrtMatches) { verticalExpansion += sqrtMatches.length * 25; }

    const baseHeight: number = (24 * scaleFactor) + (paddingVertical * 2) + verticalExpansion;
    const finalHeight: number = Math.max(80, Math.min(1000, Math.ceil(baseHeight)));

    return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${finalWidth} ${finalHeight}"
  width="${finalWidth}"
  height="${finalHeight}"
  preserveAspectRatio="xMidYMid meet"
  aria-label="${verbal}"
  role="img"
  style="background: white; border-radius: 8px; border: 1px solid #eee;"
>
  <title>${verbal}</title>
  <foreignObject width="100%" height="100%">
    <div
      xmlns="http://www.w3.org/1999/xhtml"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        padding: ${paddingVertical}px ${paddingHorizontal}px;
        margin: 0;
        font-family: sans-serif;
      "
    >
      <div style="font-size: ${scaleFactor}em; margin: 0; color: #333;">
        ${html}
      </div>
    </div>
  </foreignObject>
</svg>`.trim();
}
