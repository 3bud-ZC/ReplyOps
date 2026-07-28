export interface Chunk {
  content: string;
  metadata?: any;
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Chunk[] {
  const chunks: Chunk[] = [];
  if (!text) return chunks;
  
  // Split into words to avoid breaking in the middle of words
  const words = text.split(/\s+/);
  
  let currentChunkWords: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentChunkWords.push(word);
    currentLength += word.length + 1; // +1 for space

    if (currentLength >= chunkSize) {
      chunks.push({
        content: currentChunkWords.join(' '),
        metadata: { chunkIndex: chunkIndex++ }
      });

      // Keep words for overlap
      let overlapLength = 0;
      const overlapWords = [];
      for (let j = currentChunkWords.length - 1; j >= 0; j--) {
        overlapWords.unshift(currentChunkWords[j]);
        overlapLength += currentChunkWords[j].length + 1;
        if (overlapLength >= overlap) break;
      }
      currentChunkWords = [...overlapWords];
      currentLength = overlapLength;
    }
  }

  // Push the last chunk if it has content
  if (currentChunkWords.length > 0) {
    const finalContent = currentChunkWords.join(' ');
    // Only push if it's not a tiny leftover or if it's the only chunk
    if (finalContent.length > overlap || chunks.length === 0) {
      chunks.push({
        content: finalContent,
        metadata: { chunkIndex: chunkIndex++ }
      });
    }
  }

  return chunks;
}
