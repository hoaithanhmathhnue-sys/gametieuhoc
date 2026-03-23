async function extractDocumentXml(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const searchStr = "word/document.xml";
  const searchBytes = new TextEncoder().encode(searchStr);
  let headerIdx = -1;
  for (let i = 0; i < bytes.length - searchBytes.length; i++) {
    let match = true;
    for (let j = 0; j < searchBytes.length; j++) {
      if (bytes[i + j] !== searchBytes[j]) { match = false; break; }
    }
    if (match) {
      if (i >= 30 && bytes[i-30] === 0x50 && bytes[i-29] === 0x4B && bytes[i-28] === 0x03 && bytes[i-27] === 0x04) {
        headerIdx = i - 30;
        break;
      }
    }
  }
  if (headerIdx === -1) throw new Error("Không tìm thấy word/document.xml trong file");
  
  const dataView = new DataView(arrayBuffer);
  const compressionMethod = dataView.getUint16(headerIdx + 8, true);
  const compressedSize = dataView.getUint32(headerIdx + 18, true);
  const fileNameLength = dataView.getUint16(headerIdx + 26, true);
  const extraFieldLength = dataView.getUint16(headerIdx + 28, true);
  
  const dataOffset = headerIdx + 30 + fileNameLength + extraFieldLength;
  const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);
  
  if (compressionMethod === 0) {
    return new TextDecoder().decode(compressedData);
  } else if (compressionMethod === 8) {
    if (typeof DecompressionStream === 'undefined') throw new Error("Trình duyệt không hỗ trợ DecompressionStream");
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedData);
    writer.close();
    const response = new Response(ds.readable);
    return await response.text();
  }
  throw new Error("Định dạng nén không được hỗ trợ");
}

export const parseDocx = async (file: File) => {
  try {
    const buffer = await file.arrayBuffer();
    const xml = await extractDocumentXml(buffer);
    const textMatches = xml.match(/<w:t(?:.*?)>(.*?)<\/w:t>/g);
    if (!textMatches) return [];
    const fullText = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
    
    const questions = [];
    const blocks = fullText.split(/Câu\s+\d+:/i).filter(b => b.trim().length > 0);
    for (const block of blocks) {
      const lines = block.split(/(?=A\.|B\.|C\.|D\.|Đáp án:|Độ khó:)/i).map(l => l.trim()).filter(l => l);
      let text = lines[0];
      let options = ['', '', '', ''];
      let answer = 0;
      let difficulty = 'medium';
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.toUpperCase().startsWith('A.')) options[0] = line.substring(2).trim();
        else if (line.toUpperCase().startsWith('B.')) options[1] = line.substring(2).trim();
        else if (line.toUpperCase().startsWith('C.')) options[2] = line.substring(2).trim();
        else if (line.toUpperCase().startsWith('D.')) options[3] = line.substring(2).trim();
        else if (line.toLowerCase().startsWith('đáp án:')) {
          const ansChar = line.substring(7).trim().toUpperCase();
          if (ansChar === 'A') answer = 0;
          if (ansChar === 'B') answer = 1;
          if (ansChar === 'C') answer = 2;
          if (ansChar === 'D') answer = 3;
        }
        else if (line.toLowerCase().startsWith('độ khó:')) {
          const diffStr = line.substring(7).trim().toLowerCase();
          if (diffStr.includes('dễ')) difficulty = 'easy';
          else if (diffStr.includes('khó') && !diffStr.includes('siêu')) difficulty = 'hard';
          else if (diffStr.includes('siêu')) difficulty = 'super_hard';
          else difficulty = 'medium';
        }
      }
      if (options.filter(o => o).length === 4 && text) {
        questions.push({ text, options, answer, difficulty });
      }
    }
    return questions;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Không thể đọc file Word.");
  }
}
