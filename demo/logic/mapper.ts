import type { CurrencyNBROutput } from "@currency-nbr-a11y";

/**
 * Mapeia todos os outputs de uma instância CurrencyNBROutput para um objeto JSON.
 */
export function mapAllOutputs(
  output: CurrencyNBROutput,
): Record<string, string | number | null> {
  const buffer = output.toImageBuffer();
  const hex = Array.from(buffer).map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  const base64 = btoa(String.fromCharCode(...buffer));

  return {
    toString: output.toString(),
    toFloatNumber: output.toFloatNumber(),
    toBigInt: output.toBigInt().toString(),
    toMonetary: output.toMonetary(),
    toLaTeX: output.toLaTeX(),
    toHTML: output.toHTML(),
    toVerbalA11y: output.toVerbalA11y(),
    toUnicode: output.toUnicode(),
    toJson: output.toJson(),
    toImageBufferHex: hex,
    toImageDataBase64: `data:image/svg+xml;base64,${base64}`,
  };
}
