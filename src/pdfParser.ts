/**
 * PDF Parser - Extract questions from PDF files
 * Uses pdfjs-dist for text extraction
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const parsePdf = async (file: File) => {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageText = '';
      
      for (const item of textContent.items) {
        const textItem = item as any;
        if (textItem.str !== undefined) {
          // Detect line breaks by Y position change
          if (lastY !== null && Math.abs(textItem.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += textItem.str;
          lastY = textItem.transform[5];
        }
      }
      
      fullText += pageText + '\n\n';
    }
    
    // Parse questions from extracted text
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
      const lines = block.split(/(?=^[A-D]\.\s|^Đáp án:|^Độ khó:)/mi).map(l => l.trim()).filter(l => l);
      
      if (lines.length === 0) continue;
      
      let text = lines[0];
      const options = ['', '', '', ''];
      let answer = 0;
      let difficulty = 'medium';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

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
        questions.push({ text, options, answer, difficulty, image: null });
      }
    }

    return questions;
  } catch (e: any) {
    console.error('PDF Parse Error:', e);
    throw new Error(e.message || "Không thể đọc file PDF.");
  }
};
