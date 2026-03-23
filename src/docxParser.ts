/**
 * Enhanced DOCX Parser
 * Strategy: Parse raw XML from DOCX ZIP directly
 * - Extract text from <w:t> elements
 * - Convert OMML (<m:oMath>) to LaTeX inline \(...\)
 * - Extract images from word/media/ as base64
 * - Map images via relationships (rId -> filename)
 * - Parse structured questions (Câu N: ... A. B. C. D. Đáp án: Độ khó:)
 *
 * Also uses mammoth as a FALLBACK when raw XML parsing fails
 */

import mammoth from 'mammoth';

// ================================================
// ZIP UTILITIES (DOCX is a ZIP archive)
// ================================================

async function extractZipEntry(bytes: Uint8Array, fileName: string): Promise<Uint8Array | null> {
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] !== 0x50 || bytes[i+1] !== 0x4B || bytes[i+2] !== 0x03 || bytes[i+3] !== 0x04) continue;
    
    const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
    const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
    const nameStart = i + 30;
    if (nameStart + nameLen > bytes.length) continue;
    
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen));
    if (name !== fileName) continue;
    
    const compressionMethod = bytes[i + 8] | (bytes[i + 9] << 8);
    const compressedSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24);
    const dataOffset = nameStart + nameLen + extraLen;
    const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);
    
    if (compressionMethod === 0) return compressedData;
    if (compressionMethod === 8) {
      try {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedData);
        writer.close();
        const buffer = await new Response(ds.readable).arrayBuffer();
        return new Uint8Array(buffer);
      } catch { return null; }
    }
  }
  return null;
}

function listZipEntries(bytes: Uint8Array, prefix: string): string[] {
  const results: string[] = [];
  for (let i = 0; i < bytes.length - 4; i++) {
    if (bytes[i] !== 0x50 || bytes[i+1] !== 0x4B || bytes[i+2] !== 0x03 || bytes[i+3] !== 0x04) continue;
    const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
    const nameStart = i + 30;
    if (nameStart + nameLen > bytes.length) continue;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLen));
    if (name.startsWith(prefix)) results.push(name);
  }
  return results;
}

// ================================================
// IMAGE EXTRACTION
// ================================================

async function extractImages(bytes: Uint8Array): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const mediaFiles = listZipEntries(bytes, 'word/media/');
  
  for (const mediaFile of mediaFiles) {
    try {
      const data = await extractZipEntry(bytes, mediaFile);
      if (!data || data.length === 0) continue;
      
      const fileName = mediaFile.split('/').pop() || '';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', bmp: 'image/bmp', wmf: 'image/x-wmf',
        emf: 'image/x-emf', tiff: 'image/tiff', tif: 'image/tiff'
      };
      const mime = mimeMap[ext] || 'image/png';
      
      let binary = '';
      for (let j = 0; j < data.length; j++) binary += String.fromCharCode(data[j]);
      imageMap.set(fileName, `data:${mime};base64,${btoa(binary)}`);
    } catch {}
  }
  return imageMap;
}

async function extractRelationships(bytes: Uint8Array): Promise<Map<string, string>> {
  const relMap = new Map<string, string>();
  const relsData = await extractZipEntry(bytes, 'word/_rels/document.xml.rels');
  if (!relsData) return relMap;
  
  const relsXml = new TextDecoder().decode(relsData);
  const matches = relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
  for (const m of matches) {
    if (m[2].startsWith('media/')) relMap.set(m[1], m[2].replace('media/', ''));
  }
  return relMap;
}

// ================================================
// OMML → LATEX CONVERTER (recursive, handles nested)
// ================================================

function ommlToLatex(xml: string): string {
  // Remove namespaces for easier parsing
  let s = xml;
  
  function extractText(fragment: string): string {
    const texts: string[] = [];
    const regex = /<m:t[^>]*>([\s\S]*?)<\/m:t>/g;
    let m;
    while ((m = regex.exec(fragment)) !== null) texts.push(m[1]);
    return texts.join('');
  }
  
  function processElement(fragment: string): string {
    let result = fragment;
    
    // Process nested fractions: <m:f>...<m:num>...</m:num><m:den>...</m:den>...</m:f>
    result = result.replace(/<m:f[\s>][\s\S]*?<\/m:f>/g, (match) => {
      const numM = match.match(/<m:num>([\s\S]*?)<\/m:num>/);
      const denM = match.match(/<m:den>([\s\S]*?)<\/m:den>/);
      if (numM && denM) {
        const num = processElement(numM[1]);
        const den = processElement(denM[1]);
        const numText = num.replace(/<[^>]+>/g, '').trim() || extractText(numM[1]);
        const denText = den.replace(/<[^>]+>/g, '').trim() || extractText(denM[1]);
        return `\\frac{${numText}}{${denText}}`;
      }
      return extractText(match);
    });
    
    // Process superscripts: <m:sSup>...<m:e>base</m:e><m:sup>exp</m:sup>...</m:sSup>
    result = result.replace(/<m:sSup[\s>][\s\S]*?<\/m:sSup>/g, (match) => {
      const baseM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const supM = match.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      if (baseM && supM) {
        const base = processElement(baseM[1]).replace(/<[^>]+>/g, '').trim() || extractText(baseM[1]);
        const sup = processElement(supM[1]).replace(/<[^>]+>/g, '').trim() || extractText(supM[1]);
        return `${base}^{${sup}}`;
      }
      return extractText(match);
    });
    
    // Process subscripts: <m:sSub>...<m:e>base</m:e><m:sub>sub</m:sub>...</m:sSub>
    result = result.replace(/<m:sSub[\s>][\s\S]*?<\/m:sSub>/g, (match) => {
      const baseM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const subM = match.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      if (baseM && subM) {
        const base = processElement(baseM[1]).replace(/<[^>]+>/g, '').trim() || extractText(baseM[1]);
        const sub = processElement(subM[1]).replace(/<[^>]+>/g, '').trim() || extractText(subM[1]);
        return `${base}_{${sub}}`;
      }
      return extractText(match);
    });
    
    // Process sub-superscript: <m:sSubSup>
    result = result.replace(/<m:sSubSup[\s>][\s\S]*?<\/m:sSubSup>/g, (match) => {
      const baseM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const subM = match.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      const supM = match.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      if (baseM) {
        const base = extractText(baseM[1]);
        const sub = subM ? extractText(subM[1]) : '';
        const sup = supM ? extractText(supM[1]) : '';
        return `${base}_{${sub}}^{${sup}}`;
      }
      return extractText(match);
    });
    
    // Process radicals: <m:rad>
    result = result.replace(/<m:rad[\s>][\s\S]*?<\/m:rad>/g, (match) => {
      const degM = match.match(/<m:deg>([\s\S]*?)<\/m:deg>/);
      const eM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      if (eM) {
        const content = processElement(eM[1]).replace(/<[^>]+>/g, '').trim() || extractText(eM[1]);
        if (degM) {
          const deg = extractText(degM[1]).trim();
          if (deg && deg !== '2' && deg !== '') return `\\sqrt[${deg}]{${content}}`;
        }
        return `\\sqrt{${content}}`;
      }
      return extractText(match);
    });
    
    // Process delimiters (parentheses, brackets): <m:d>
    result = result.replace(/<m:d[\s>][\s\S]*?<\/m:d>/g, (match) => {
      const begM = match.match(/<m:begChr\s+m:val="([^"]*)"/);
      const endM = match.match(/<m:endChr\s+m:val="([^"]*)"/);
      const elements = match.match(/<m:e>([\s\S]*?)<\/m:e>/g) || [];
      
      const beg = begM?.[1] || '(';
      const end = endM?.[1] || ')';
      const content = elements.map(e => {
        const inner = e.match(/<m:e>([\s\S]*?)<\/m:e>/);
        return inner ? (processElement(inner[1]).replace(/<[^>]+>/g, '').trim() || extractText(inner[1])) : '';
      }).join(', ');
      
      return `\\left${beg === '{' ? '\\{' : beg}${content}\\right${end === '}' ? '\\}' : end}`;
    });
    
    // Process nary (summation, integral, product): <m:nary>
    result = result.replace(/<m:nary[\s>][\s\S]*?<\/m:nary>/g, (match) => {
      const chrM = match.match(/<m:chr\s+m:val="([^"]*)"/);
      const subM = match.match(/<m:sub>([\s\S]*?)<\/m:sub>/);
      const supM = match.match(/<m:sup>([\s\S]*?)<\/m:sup>/);
      const eM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      
      const chr = chrM?.[1] || '∑';
      let symbol = '\\sum';
      if (chr === '∫' || chr.includes('int')) symbol = '\\int';
      if (chr === '∏' || chr.includes('prod')) symbol = '\\prod';
      
      const sub = subM ? extractText(subM[1]).trim() : '';
      const sup = supM ? extractText(supM[1]).trim() : '';
      const content = eM ? (processElement(eM[1]).replace(/<[^>]+>/g, '').trim() || extractText(eM[1])) : '';
      
      let latex = symbol;
      if (sub) latex += `_{${sub}}`;
      if (sup) latex += `^{${sup}}`;
      latex += ` ${content}`;
      return latex;
    });
    
    // Process bar/overline: <m:bar>
    result = result.replace(/<m:bar[\s>][\s\S]*?<\/m:bar>/g, (match) => {
      const eM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      if (eM) {
        const content = extractText(eM[1]);
        return `\\overline{${content}}`;
      }
      return extractText(match);
    });
    
    // Process accent: <m:acc>
    result = result.replace(/<m:acc[\s>][\s\S]*?<\/m:acc>/g, (match) => {
      const chrM = match.match(/<m:chr\s+m:val="([^"]*)"/);
      const eM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      if (eM) {
        const content = extractText(eM[1]);
        const chr = chrM?.[1] || '^';
        if (chr === '→' || chr === '⃗') return `\\vec{${content}}`;
        if (chr === '̂' || chr === '^') return `\\hat{${content}}`;
        if (chr === '~' || chr === '̃') return `\\tilde{${content}}`;
        if (chr === '̇') return `\\dot{${content}}`;
        return `\\hat{${content}}`;
      }
      return extractText(match);
    });
    
    // Process matrix: <m:m>
    result = result.replace(/<m:m[\s>][\s\S]*?<\/m:m>/g, (match) => {
      const rows = match.match(/<m:mr>([\s\S]*?)<\/m:mr>/g) || [];
      const rowTexts = rows.map(row => {
        const cells = row.match(/<m:e>([\s\S]*?)<\/m:e>/g) || [];
        return cells.map(cell => {
          const inner = cell.match(/<m:e>([\s\S]*?)<\/m:e>/);
          return inner ? extractText(inner[1]) : '';
        }).join(' & ');
      });
      return `\\begin{pmatrix}${rowTexts.join(' \\\\ ')}\\end{pmatrix}`;
    });
    
    // Process limit/lower: <m:limLow> and <m:limUpp>
    result = result.replace(/<m:limLow[\s>][\s\S]*?<\/m:limLow>/g, (match) => {
      const eM = match.match(/<m:e>([\s\S]*?)<\/m:e>/);
      const limM = match.match(/<m:lim>([\s\S]*?)<\/m:lim>/);
      const func = eM ? extractText(eM[1]) : 'lim';
      const lim = limM ? extractText(limM[1]) : '';
      return `\\${func}_{${lim}}`;
    });
    
    return result;
  }
  
  let latex = processElement(s);
  
  // Strip any remaining XML tags
  latex = latex.replace(/<[^>]+>/g, '');
  
  // Replace common math Unicode symbols
  const symbolMap: [RegExp, string][] = [
    [/×/g, '\\times '], [/÷/g, '\\div '], [/±/g, '\\pm '],
    [/≤/g, '\\leq '], [/≥/g, '\\geq '], [/≠/g, '\\neq '],
    [/∞/g, '\\infty '], [/π/g, '\\pi '], [/α/g, '\\alpha '],
    [/β/g, '\\beta '], [/γ/g, '\\gamma '], [/δ/g, '\\delta '],
    [/Δ/g, '\\Delta '], [/θ/g, '\\theta '], [/λ/g, '\\lambda '],
    [/μ/g, '\\mu '], [/σ/g, '\\sigma '], [/Σ/g, '\\Sigma '],
    [/√/g, '\\sqrt'], [/∈/g, '\\in '], [/∉/g, '\\notin '],
    [/⊂/g, '\\subset '], [/⊃/g, '\\supset '], [/∪/g, '\\cup '],
    [/∩/g, '\\cap '], [/∅/g, '\\emptyset '], [/∀/g, '\\forall '],
    [/∃/g, '\\exists '], [/→/g, '\\to '], [/⇒/g, '\\Rightarrow '],
    [/⇔/g, '\\Leftrightarrow '], [/≈/g, '\\approx '],
  ];
  for (const [pattern, replacement] of symbolMap) {
    latex = latex.replace(pattern, replacement);
  }
  
  return latex.trim();
}

// ================================================
// DOCUMENT XML PROCESSING
// ================================================

function processDocumentXml(xml: string, relMap: Map<string, string>): string {
  let result = '';
  
  // Split by paragraphs
  const paragraphs = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  
  for (const para of paragraphs) {
    let paraText = '';
    
    // 1) Extract and convert math blocks FIRST
    let processedPara = para;
    const mathBlocks = para.match(/<m:oMath[\s>][\s\S]*?<\/m:oMath>/g) || [];
    for (const mathBlock of mathBlocks) {
      const latex = ommlToLatex(mathBlock);
      if (latex.trim()) {
        // Replace math block with LaTeX marker
        processedPara = processedPara.replace(mathBlock, `MATH_PLACEHOLDER_${latex}_END_MATH`);
      }
    }
    
    // Also handle <m:oMathPara> (paragraph-level math)
    const mathParas = para.match(/<m:oMathPara[\s>][\s\S]*?<\/m:oMathPara>/g) || [];
    for (const mathPara of mathParas) {
      const innerMaths = mathPara.match(/<m:oMath[\s>][\s\S]*?<\/m:oMath>/g) || [];
      for (const innerMath of innerMaths) {
        if (!processedPara.includes(innerMath)) continue; // already processed
        const latex = ommlToLatex(innerMath);
        if (latex.trim()) {
          processedPara = processedPara.replace(innerMath, `MATH_PLACEHOLDER_${latex}_END_MATH`);
        }
      }
    }
    
    // 2) Handle images - find r:embed references in drawings
    const drawingBlocks = processedPara.match(/<w:drawing>[\s\S]*?<\/w:drawing>/g) || [];
    for (const drawing of drawingBlocks) {
      const embedMatch = drawing.match(/r:embed="(rId\d+)"/);
      if (embedMatch) {
        const rId = embedMatch[1];
        if (relMap.has(rId)) {
          processedPara = processedPara.replace(drawing, `[IMG:${relMap.get(rId)}]`);
        }
      }
    }
    
    // Also check for <v:imagedata> (VML images, older format)
    const vmlImages = processedPara.match(/<v:imagedata[^>]*>/g) || [];
    for (const vml of vmlImages) {
      const rIdMatch = vml.match(/r:id="(rId\d+)"/);
      if (rIdMatch && relMap.has(rIdMatch[1])) {
        processedPara = processedPara.replace(vml, `[IMG:${relMap.get(rIdMatch[1])}]`);
      }
    }
    
    // 3) Extract text content from <w:t> tags
    const textParts: string[] = [];
    // Process in order: iterate through all relevant elements
    const allTokens = processedPara.match(/(<w:t[^>]*>[\s\S]*?<\/w:t>|MATH_PLACEHOLDER_[\s\S]*?_END_MATH|\[IMG:[^\]]+\])/g) || [];
    
    for (const token of allTokens) {
      if (token.startsWith('MATH_PLACEHOLDER_')) {
        const latex = token.replace('MATH_PLACEHOLDER_', '').replace('_END_MATH', '');
        textParts.push(`\\(${latex}\\)`);
      } else if (token.startsWith('[IMG:')) {
        textParts.push(token);
      } else {
        // <w:t>text</w:t>
        const textContent = token.replace(/<[^>]+>/g, '');
        textParts.push(textContent);
      }
    }
    
    // If no tokens found via the combined approach, try simpler approach
    if (textParts.length === 0) {
      const simpleTexts = processedPara.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      for (const t of simpleTexts) {
        textParts.push(t.replace(/<[^>]+>/g, ''));
      }
      // Also preserve math and image markers that were injected
      const mathMarkers = processedPara.match(/MATH_PLACEHOLDER_[\s\S]*?_END_MATH/g) || [];
      for (const marker of mathMarkers) {
        const latex = marker.replace('MATH_PLACEHOLDER_', '').replace('_END_MATH', '');
        textParts.push(`\\(${latex}\\)`);
      }
      const imgMarkers = processedPara.match(/\[IMG:[^\]]+\]/g) || [];
      for (const marker of imgMarkers) {
        if (!textParts.includes(marker)) textParts.push(marker);
      }
    }
    
    paraText = textParts.join('');
    
    if (paraText.trim()) {
      result += paraText.trim() + '\n';
    }
  }
  
  return result;
}

// ================================================
// QUESTION PARSER
// ================================================

function parseQuestionsFromText(fullText: string, imageMap: Map<string, string>) {
  const questions: Array<{
    text: string;
    options: string[];
    answer: number;
    difficulty: string;
    image: string | null;
  }> = [];

  // Split by "Câu X:" or "Câu X." pattern
  const blocks = fullText.split(/Câu\s+\d+[.:]\s*/i).filter(b => b.trim().length > 0);

  for (const block of blocks) {
    // Split by option markers (A. B. C. D.), answer, difficulty
    const lines = block.split(/(?=^[A-D]\.\s|^Đáp án:|^Độ khó:)/mi).map(l => l.trim()).filter(l => l);
    if (lines.length === 0) continue;

    let text = lines[0];
    const options = ['', '', '', ''];
    let answer = 0;
    let difficulty = 'medium';
    let questionImage: string | null = null;

    // Extract image from question text
    const imgMatch = text.match(/\[IMG:([^\]]+)\]/);
    if (imgMatch) {
      const imgFileName = imgMatch[1];
      if (imageMap.has(imgFileName)) questionImage = imageMap.get(imgFileName)!;
      text = text.replace(/\[IMG:[^\]]+\]/g, '').trim();
    }

    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      
      // Extract images from options
      const optImgMatch = line.match(/\[IMG:([^\]]+)\]/);
      if (optImgMatch) {
        if (!questionImage && imageMap.has(optImgMatch[1])) {
          questionImage = imageMap.get(optImgMatch[1])!;
        }
        line = line.replace(/\[IMG:[^\]]+\]/g, '').trim();
      }

      if (/^A\.\s/i.test(line)) options[0] = line.replace(/^A\.\s*/i, '').trim();
      else if (/^B\.\s/i.test(line)) options[1] = line.replace(/^B\.\s*/i, '').trim();
      else if (/^C\.\s/i.test(line)) options[2] = line.replace(/^C\.\s*/i, '').trim();
      else if (/^D\.\s/i.test(line)) options[3] = line.replace(/^D\.\s*/i, '').trim();
      else if (/^Đáp án:/i.test(line)) {
        const ansChar = line.replace(/^Đáp án:\s*/i, '').trim().toUpperCase();
        if (ansChar.startsWith('A')) answer = 0;
        else if (ansChar.startsWith('B')) answer = 1;
        else if (ansChar.startsWith('C')) answer = 2;
        else if (ansChar.startsWith('D')) answer = 3;
      } else if (/^Độ khó:/i.test(line)) {
        const diffStr = line.replace(/^Độ khó:\s*/i, '').trim().toLowerCase();
        if (diffStr.includes('dễ')) difficulty = 'easy';
        else if (diffStr.includes('siêu')) difficulty = 'super_hard';
        else if (diffStr.includes('khó')) difficulty = 'hard';
        else difficulty = 'medium';
      }
    }

    if (options.filter(o => o).length >= 2 && text) {
      questions.push({ text, options, answer, difficulty, image: questionImage });
    }
  }

  return questions;
}

// ================================================
// MAIN EXPORT: parseDocx
// ================================================

export const parseDocx = async (file: File) => {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Try raw XML parsing first (best for math preservation)
    let fullText = '';
    let imageMap = new Map<string, string>();
    
    try {
      const [documentData, imgMap, relMap] = await Promise.all([
        extractZipEntry(bytes, 'word/document.xml'),
        extractImages(bytes),
        extractRelationships(bytes),
      ]);
      
      if (documentData) {
        const xml = new TextDecoder().decode(documentData);
        fullText = processDocumentXml(xml, relMap);
        imageMap = imgMap;
        console.log('[DocxParser] Raw XML parsing successful, text length:', fullText.length);
      }
    } catch (xmlErr) {
      console.warn('[DocxParser] Raw XML parsing failed:', xmlErr);
    }
    
    // If raw XML parsing yielded nothing, fallback to mammoth
    if (!fullText.trim()) {
      console.log('[DocxParser] Falling back to mammoth...');
      try {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        fullText = result.value;
        console.log('[DocxParser] Mammoth extraction successful, text length:', fullText.length);
      } catch (mammothErr) {
        console.error('[DocxParser] Mammoth also failed:', mammothErr);
        throw new Error('Không thể đọc file Word. File có thể bị hỏng.');
      }
    }
    
    if (!fullText.trim()) {
      throw new Error('File Word không có nội dung text.');
    }
    
    return parseQuestionsFromText(fullText, imageMap);
  } catch (e: any) {
    console.error('[DocxParser] Error:', e);
    throw new Error(e.message || 'Không thể đọc file Word.');
  }
};
