import re
import os
import sys
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font('helvetica', 'I', 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 10, 'Smart Lead Bot - API Specification', new_x="RIGHT", new_y="TOP", align='L')
            self.set_draw_color(226, 232, 240)
            self.set_line_width(0.5)
            self.line(15, 22, 195, 22)
            self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', new_x="RIGHT", new_y="TOP", align='R')

def clean_text(text):
    # Replace curly quotes and unicode dashes
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u2014', '-').replace('\u2013', '-')
    
    # Custom replacements for visual checkmarks/bullets
    text = text.replace('✔', '[PASS]')
    text = text.replace('✘', '[FAIL]')
    text = text.replace('🚀', 'RUN:')
    text = text.replace('🛠️', 'SETUP:')
    text = text.replace('📋', 'SPEC:')
    text = text.replace('🏁', 'SUMMARY:')
    text = text.replace('•', '-')
    
    # Keep only characters encodeable in latin-1
    return text.encode('latin-1', 'ignore').decode('latin-1')

def parse_and_write_markdown(pdf, line):
    line_cleaned = clean_text(line)
    # Split text by bold markers (e.g. **text**)
    parts = re.split(r'(\*\*.*?\*\*)', line_cleaned)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            pdf.set_font('helvetica', 'B', 10)
            pdf.write(5, part[2:-2])
        else:
            # Check for inline code (e.g. `code`)
            sub_parts = re.split(r'(`.*?`)', part)
            for sub_part in sub_parts:
                if sub_part.startswith('`') and sub_part.endswith('`'):
                    pdf.set_font('Courier', 'B', 9.5)
                    pdf.set_text_color(220, 38, 38)
                    pdf.write(5, sub_part[1:-1])
                    pdf.set_text_color(30, 41, 59)
                else:
                    pdf.set_font('helvetica', '', 10)
                    pdf.write(5, sub_part)

def build_pdf():
    md_path = "/home/satish/.gemini/antigravity/brain/94c57423-148f-49d8-affc-fe7db64f6eed/api_testing_documentation.md"
    pdf_path = "/home/satish/Desktop/Frontend/api_testing_documentation.pdf"
    
    if not os.path.exists(md_path):
        print(f"Error: markdown file not found at {md_path}")
        return False
        
    pdf = PDF()
    pdf.alias_nb_pages()
    pdf.set_margins(15, 20, 15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_code_block = False
    code_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Check for code blocks
        if stripped.startswith('```'):
            if in_code_block:
                # Render code block
                pdf.set_font('Courier', '', 8.5)
                code_text = clean_text('\n'.join(code_lines))
                
                # Check page boundary before writing code block
                lines_count = len(code_lines)
                estimated_height = lines_count * 4.2 + 8
                if pdf.get_y() + estimated_height > (pdf.h - 20):
                    pdf.add_page()
                    
                pdf.set_fill_color(248, 250, 252) # slate-50
                pdf.set_draw_color(226, 232, 240) # slate-200
                pdf.set_text_color(15, 23, 42)    # slate-900
                
                pdf.multi_cell(0, 4.2, code_text, border=1, fill=True)
                pdf.ln(3)
                
                in_code_block = False
                code_lines = []
            else:
                in_code_block = True
            continue
            
        if in_code_block:
            code_lines.append(line.rstrip('\n'))
            continue
            
        # Headers
        if stripped.startswith('# '):
            pdf.ln(6)
            pdf.set_font('helvetica', 'B', 22)
            pdf.set_text_color(15, 23, 42) # Slate-900
            pdf.cell(0, 12, clean_text(stripped[2:]), new_x="LMARGIN", new_y="NEXT")
            # Gold bottom line
            pdf.set_draw_color(197, 160, 89) # Gold color
            pdf.set_line_width(1.5)
            y_curr = pdf.get_y()
            pdf.line(15, y_curr, 195, y_curr)
            pdf.ln(6)
            
        elif stripped.startswith('## '):
            pdf.ln(8)
            pdf.set_font('helvetica', 'B', 15)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(0, 10, clean_text(stripped[3:]), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            
        elif stripped.startswith('### '):
            # Check page bounds to keep header with content
            if pdf.get_y() > (pdf.h - 40):
                pdf.add_page()
            pdf.ln(5)
            pdf.set_font('helvetica', 'B', 11.5)
            pdf.set_text_color(197, 160, 89) # Gold accent
            pdf.cell(0, 8, clean_text(stripped[4:]), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
            
        elif stripped.startswith('* '):
            pdf.set_font('helvetica', '', 10)
            pdf.set_text_color(30, 41, 59)
            pdf.write(5, '  -  ')
            parse_and_write_markdown(pdf, line.rstrip('\n')[2:])
            pdf.ln(5.5)
            
        elif stripped == '---':
            pdf.add_page()
            
        else:
            if not stripped:
                pdf.ln(2.5)
                continue
            pdf.set_font('helvetica', '', 10)
            pdf.set_text_color(30, 41, 59)
            parse_and_write_markdown(pdf, line.rstrip('\n'))
            pdf.ln(5.5)
            
    pdf.output(pdf_path)
    print("✔ Successfully generated PDF at:", pdf_path)
    return True

if __name__ == "__main__":
    success = build_pdf()
    sys.exit(0 if success else 1)
