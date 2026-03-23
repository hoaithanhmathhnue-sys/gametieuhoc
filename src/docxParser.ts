/**
 * Enhanced DOCX Parser - Hỗ trợ:
 * ✅ Text extraction
 * ✅ Images extraction (word/media/)
 * ✅ MathType OMML → LaTeX conversion
 * ✅ Inline images in questions/options
 */

// Extract a file from ZIP (DOCX is a ZIP)
async function extractZipEntry(arrayBuffer: ArrayBuffer, fileName: string): Promise<Uint8Array | null> {
  const bytes = new Uint8Array(arrayBuffer);
  const searchBytes = new TextEncoder().encode(fileName);
  
  // Find local file header for this entry
  for (let i = 0; i < bytes.length - searchBytes.length; i++) {
    // Check for PK local file header signature
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
      const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
      const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
      const nameStart = i + 30;
      const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen));
      
      if (name === fileName) {
        const compressionMethod = bytes[i + 8] | (bytes[i + 9] << 8);
        const compressedSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24);
        const dataOffset = nameStart + nameLen + extraLen;
        const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);
        
        if (compressionMethod === 0) {
          return compressedData;
        } else if (compressionMethod === 8) {
          if (typeof DecompressionStream === 'undefined') return null;
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compressedData);
          writer.close();
          const response = new Response(ds.readable);
          const buffer = await response.arrayBuffer();
          return new Uint8Array(buffer);
        }
      }
    }
  }
  return null;
}

// List all files in ZIP matching a prefix
function listZipEntries(arrayBuffer: ArrayBuffer, prefix: string): string[] {
  const bytes = new Uint8Array(arrayBuffer);
  const results: string[] = [];
  
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4B && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
      const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
      const nameStart = i + 30;
      if (nameStart + nameLen <= bytes.length) {
        const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen));
        if (name.startsWith(prefix)) {
          results.push(name);
        }
      }
    }
  }
  return results;
}

// Extract images from DOCX as base64 data URLs
async function extractImages(arrayBuffer: ArrayBuffer): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const mediaFiles = listZipEntries(arrayBuffer, 'word/media/');
  
  for (const mediaFile of mediaFiles) {
    try {
      const data = await extractZipEntry(arrayBuffer, mediaFile);
      if (data) {
        const fileName = mediaFile.split('/').pop() || '';
        const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg', 
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'bmp': 'image/bmp',
          'wmf': 'image/x-wmf',
          'emf': 'image/x-emf',
          'tiff': 'image/tiff',
          'tif': 'image/tiff',
        };
        const mime = mimeTypes[ext] || 'image/png';
        
        // Convert to base64
        let binary = '';
        for (let i = 0; i < data.length; i++) {
          binary += String.fromCharCode(data[i]);
        }
        const base64 = btoa(binary);
        imageMap.set(fileName, `data:${mime};base64,${base64}`);
      }
    } catch (e) {
      console.warn(`Failed to extract image: ${mediaFile}`, e);
    }
  }
  
  return imageMap;
}

// Extract relationships (image references rId -> filename)
async function extractRelationships(arrayBuffer: ArrayBuffer): Promise<Map<string, string>> {
  const relMap = new Map<string, string>();
  const relsData = await extractZipEntry(arrayBuffer, 'word/_rels/document.xml.rels');
  if (relsData) {
    const relsXml = new TextDecoder().decode(relsData);
    const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
    for (const match of relMatches) {
      const rId = match[1];
      const target = match[2];
      if (target.startsWith('media/')) {
        relMap.set(rId, target.replace('media/', ''));
      }
    }
  }
  return relMap;
}

// Simple OMML to LaTeX converter for basic math expressions
function ommlToLatex(ommlXml: string): string {
  let latex = '';
  
  // Extract text runs from OMML
  const runs = ommlXml.match(/<m:t[^>]*>(.*?)<\/m:t>/gs);
  if (!runs) return ommlXml.replace(/<[^>]+>/g, '');
  
  // Process fractions
  if (ommlXml.includes('<m:f>') || ommlXml.includes('<m:f ')) {
    const numMatch = ommlXml.match(/<m:num>(.*?)<\/m:num>/s);
    const denMatch = ommlXml.match(/<m:den>(.*?)<\/m:den>/s);
    if (numMatch && denMatch) {
      const num = numMatch[1].replace(/<[^>]+>/g, '').trim();
      const den = denMatch[1].replace(/<[^>]+>/g, '').trim();
      return `\\frac{${num}}{${den}}`;
    }
  }
  
  // Process superscripts
  if (ommlXml.includes('<m:sup>')) {
    const baseMatch = ommlXml.match(/<m:e>(.*?)<\/m:e>/s);
    const supMatch = ommlXml.match(/<m:sup>(.*?)<\/m:sup>/s);
    if (baseMatch && supMatch) {
      const base = baseMatch[1].replace(/<[^>]+>/g, '').trim();
      const sup = supMatch[1].replace(/<[^>]+>/g, '').trim();
      return `${base}^{${sup}}`;
    }
  }
  
  // Process subscripts
  if (ommlXml.includes('<m:sub>')) {
    const baseMatch = ommlXml.match(/<m:e>(.*?)<\/m:e>/s);
    const subMatch = ommlXml.match(/<m:sub>(.*?)<\/m:sub>/s);
    if (baseMatch && subMatch) {
      const base = baseMatch[1].replace(/<[^>]+>/g, '').trim();
      const sub = subMatch[1].replace(/<[^>]+>/g, '').trim();
      return `${base}_{${sub}}`;
    }
  }
  
  // Process radicals (square root)
  if (ommlXml.includes('<m:rad>')) {
    const degMatch = ommlXml.match(/<m:deg>(.*?)<\/m:deg>/s);
    const eMatch = ommlXml.match(/<m:e>(.*?)<\/m:e>/s);
    if (eMatch) {
      const content = eMatch[1].replace(/<[^>]+>/g, '').trim();
      if (degMatch) {
        const deg = degMatch[1].replace(/<[^>]+>/g, '').trim();
        if (deg) return `\\sqrt[${deg}]{${content}}`;
      }
      return `\\sqrt{${content}}`;
    }
  }
  
  // Fallback: extract all text
  latex = runs.map(r => r.replace(/<[^>]+>/g, '')).join('');
  
  // Replace common math symbols
  latex = latex.replace(/×/g, '\\times ');
  latex = latex.replace(/÷/g, '\\div ');
  latex = latex.replace(/±/g, '\\pm ');
  latex = latex.replace(/≤/g, '\\leq ');
  latex = latex.replace(/≥/g, '\\geq ');
  latex = latex.replace(/≠/g, '\\neq ');
  latex = latex.replace(/∞/g, '\\infty ');
  latex = latex.replace(/π/g, '\\pi ');
  latex = latex.replace(/α/g, '\\alpha ');
  latex = latex.replace(/β/g, '\\beta ');
  latex = latex.replace(/γ/g, '\\gamma ');
  latex = latex.replace(/δ/g, '\\delta ');
  latex = latex.replace(/Δ/g, '\\Delta ');
  latex = latex.replace(/θ/g, '\\theta ');
  latex = latex.replace(/λ/g, '\\lambda ');
  latex = latex.replace(/μ/g, '\\mu ');
  latex = latex.replace(/σ/g, '\\sigma ');
  latex = latex.replace(/Σ/g, '\\Sigma ');
  latex = latex.replace(/√/g, '\\sqrt');
  
  return latex;
}

// Process document XML to extract text with math and image placeholders
function processDocumentXml(xml: string, relMap: Map<string, string>): string {
  let result = '';
  
  // Split by paragraphs
  const paragraphs = xml.match(/<w:p[ >].*?<\/w:p>/gs) || [];
  
  for (const para of paragraphs) {
    let paraText = '';
    
    // Process runs within this paragraph
    // Handle math zones first
    const mathBlocks = para.match(/<m:oMath[ >].*?<\/m:oMath>/gs) || [];
    let processedPara = para;
    
    for (const mathBlock of mathBlocks) {
      const latex = ommlToLatex(mathBlock);
      if (latex.trim()) {
        processedPara = processedPara.replace(mathBlock, `\\(${latex}\\)`);
      }
    }
    
    // Handle images
    const imageRefs = processedPara.match(/r:embed="(rId\d+)"/g) || [];
    for (const ref of imageRefs) {
      const rId = ref.match(/rId\d+/)?.[0];
      if (rId && relMap.has(rId)) {
        const fileName = relMap.get(rId)!;
        processedPara = processedPara.replace(
          new RegExp(`<[^>]*${rId}[^>]*>`, 'g'), 
          `[IMG:${fileName}]`
        );
      }
    }
    
    // Extract text content
    const textMatches = processedPara.match(/<w:t(?:.*?)>(.*?)<\/w:t>/gs);
    if (textMatches) {
      paraText += textMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
    }
    
    // Preserve math markers
    const mathMarkers = processedPara.match(/\\\(.*?\\\)/g) || [];
    for (const marker of mathMarkers) {
      if (!paraText.includes(marker)) {
        paraText += ' ' + marker;
      }
    }
    
    // Preserve image markers
    const imgMarkers = processedPara.match(/\[IMG:[^\]]+\]/g) || [];
    for (const marker of imgMarkers) {
      if (!paraText.includes(marker)) {
        paraText += ' ' + marker;
      }
    }
    
    if (paraText.trim()) {
      result += paraText.trim() + '\n';
    }
  }
  
  return result;
}

export const parseDocx = async (file: File) => {
  try {
    const buffer = await file.arrayBuffer();
    
    // Extract all components
    const [documentData, imageMap, relMap] = await Promise.all([
      extractZipEntry(buffer, 'word/document.xml'),
      extractImages(buffer),
      extractRelationships(buffer),
    ]);
    
    if (!documentData) throw new Error("Không tìm thấy word/document.xml trong file");
    
    const xml = new TextDecoder().decode(documentData);
    const fullText = processDocumentXml(xml, relMap);
    
    const questions: Array<{
      text: string;
      options: string[];
      answer: number;
      difficulty: string;
      image: string | null;
    }> = [];
    
    const blocks = fullText.split(/Câu\s+\d+[.:]/i).filter(b => b.trim().length > 0);
    
    for (const block of blocks) {
      const lines = block.split(/(?=A\.|B\.|C\.|D\.|Đáp án:|Độ khó:)/i).map(l => l.trim()).filter(l => l);
      let text = lines[0];
      let options = ['', '', '', ''];
      let answer = 0;
      let difficulty = 'medium';
      let questionImage: string | null = null;
      
      // Process image markers in question text
      const imgMatch = text.match(/\[IMG:([^\]]+)\]/);
      if (imgMatch) {
        const imgFileName = imgMatch[1];
        if (imageMap.has(imgFileName)) {
          questionImage = imageMap.get(imgFileName)!;
        }
        text = text.replace(/\[IMG:[^\]]+\]/g, '').trim();
      }
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Process image markers in options
        let processedLine = line;
        const optImgMatch = processedLine.match(/\[IMG:([^\]]+)\]/);
        if (optImgMatch) {
          const imgFileName = optImgMatch[1];
          if (imageMap.has(imgFileName)) {
            // If option has image but no question image, set it as question image
            if (!questionImage) {
              questionImage = imageMap.get(imgFileName)!;
            }
          }
          processedLine = processedLine.replace(/\[IMG:[^\]]+\]/g, '').trim();
        }
        
        if (processedLine.toUpperCase().startsWith('A.')) options[0] = processedLine.substring(2).trim();
        else if (processedLine.toUpperCase().startsWith('B.')) options[1] = processedLine.substring(2).trim();
        else if (processedLine.toUpperCase().startsWith('C.')) options[2] = processedLine.substring(2).trim();
        else if (processedLine.toUpperCase().startsWith('D.')) options[3] = processedLine.substring(2).trim();
        else if (processedLine.toLowerCase().startsWith('đáp án:')) {
          const ansChar = processedLine.substring(7).trim().toUpperCase();
          if (ansChar === 'A') answer = 0;
          if (ansChar === 'B') answer = 1;
          if (ansChar === 'C') answer = 2;
          if (ansChar === 'D') answer = 3;
        }
        else if (processedLine.toLowerCase().startsWith('độ khó:')) {
          const diffStr = processedLine.substring(7).trim().toLowerCase();
          if (diffStr.includes('dễ')) difficulty = 'easy';
          else if (diffStr.includes('khó') && !diffStr.includes('siêu')) difficulty = 'hard';
          else if (diffStr.includes('siêu')) difficulty = 'super_hard';
          else difficulty = 'medium';
        }
      }
      
      if (options.filter(o => o).length === 4 && text) {
        questions.push({ text, options, answer, difficulty, image: questionImage });
      }
    }
    
    return questions;
  } catch (e: any) {
    console.error(e);
    throw new Error(e.message || "Không thể đọc file Word.");
  }
}
