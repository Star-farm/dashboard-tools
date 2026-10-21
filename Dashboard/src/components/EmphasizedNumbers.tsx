const numericParts = /(?<![\p{L}\p{N}])([+−-]?\d+(?:[.,]\d+)*(?:[–—]\d+(?:[.,]\d+)*)?(?:\s?%)?)(?![\p{L}\p{N}])/gu

export default function EmphasizedNumbers({ text }: { text: string }) {
  return text.split(numericParts).map((part, index) => index % 2 ? <strong key={index}>{part}</strong> : part)
}
