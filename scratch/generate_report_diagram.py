# -*- coding: utf-8 -*-
"""
Generates publication-grade, high-resolution (300 DPI)
System Architecture Diagrams for MockAI:
1. mockai_architecture_report.png  -> Clean IEEE / Word / Project Report version
2. mockai_architecture_slide.png   -> College Presentation Slide version with KEC styling
3. mockai_architecture_report.pdf  -> Vector PDF for LaTeX / Overleaf
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
import os

def render_diagram(output_png, output_pdf=None, is_slide=False):
    # Set 16:10 or 16:9 widescreen ratio
    fig = plt.figure(figsize=(15, 10), dpi=300)
    ax = fig.add_subplot(111)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Color Scheme
    c_blue_dark   = '#0369a1'
    c_blue_bg     = '#f0f9ff'
    c_blue_border = '#0284c7'
    
    c_proc_bg     = '#f0fdfa'
    c_proc_border = '#0d9488'
    c_proc_dark   = '#0f766e'

    c_assess_bg     = '#fffbeb'
    c_assess_border = '#d97706'
    c_assess_dark   = '#b45309'

    c_dash_bg     = '#f8fafc'
    c_dash_border = '#334155'
    c_dash_dark   = '#0f172a'

    c_pill        = '#0284c7'
    c_text_main   = '#0f172a'
    c_text_sub    = '#334155'

    # Shift content right if slide banner is active
    shift_x = 7.0 if is_slide else 0.0
    scale_w = 0.93 if is_slide else 1.0

    # Draw College Left Ribbon if is_slide is True
    if is_slide:
        # Green ribbon background
        ribbon = Rectangle((0, 0), 5.5, 100, facecolor='#2e7d43', edgecolor='none', zorder=10)
        ax.add_patch(ribbon)
        ribbon_edge = Rectangle((5.2, 0), 0.5, 100, facecolor='#1e532d', edgecolor='none', zorder=11)
        ax.add_patch(ribbon_edge)
        
        # Vertical College Name
        ax.text(2.8, 50, "KONGU ENGINEERING COLLEGE", color='#ffffff', weight='black',
                fontsize=15, rotation=90, ha='center', va='center', zorder=12,
                fontfamily='sans-serif')

    # Helper: Draw pill
    def draw_pill(x, y, w, h, text):
        actual_x = x * scale_w + shift_x
        p = FancyBboxPatch((actual_x, y), w * scale_w, h, boxstyle=f"round,pad=0.2,rounding_size={h/2}",
                           facecolor=c_pill, edgecolor='#0369a1', linewidth=1.5, zorder=5)
        ax.add_patch(p)
        ax.text(actual_x + (w * scale_w)/2, y + h/2, text, color='#ffffff', weight='bold', fontsize=12,
                ha='center', va='center', zorder=6, fontfamily='sans-serif')

    # Helper: Draw card with clean spacing
    def draw_card(x, y, w, h, title, items, bg_color, border_color, title_color, badge=None):
        actual_x = x * scale_w + shift_x
        actual_w = w * scale_w
        
        # Card body
        card = FancyBboxPatch((actual_x, y), actual_w, h, boxstyle="round,pad=0.4,rounding_size=1.2",
                              facecolor=bg_color, edgecolor=border_color, linewidth=1.8, zorder=3)
        ax.add_patch(card)
        
        # Header banner strip
        hdr_h = 4.2
        hdr = FancyBboxPatch((actual_x, y + h - hdr_h), actual_w, hdr_h, boxstyle="round,pad=0.1,rounding_size=0.8",
                             facecolor='#ffffff', edgecolor=border_color, linewidth=1.2, zorder=4)
        ax.add_patch(hdr)
        
        # Title text (centered)
        ax.text(actual_x + actual_w/2, y + h - hdr_h/2, title, color=title_color, weight='bold',
                fontsize=11.5, ha='center', va='center', zorder=5, fontfamily='sans-serif')
        
        # Optional small badge
        if badge:
            badge_box = FancyBboxPatch((actual_x + actual_w - 9.5, y + h - hdr_h + 0.8), 8.5, 2.6,
                                       boxstyle="round,pad=0.1,rounding_size=0.6",
                                       facecolor=border_color, edgecolor='none', zorder=6)
            ax.add_patch(badge_box)
            ax.text(actual_x + actual_w - 5.25, y + h - hdr_h + 2.1, badge, color='#ffffff',
                    weight='bold', fontsize=7.5, ha='center', va='center', zorder=7)

        # Bullets
        start_y = y + h - hdr_h - 2.8
        avail_h = h - hdr_h - 4.5
        spacing = avail_h / max(len(items), 1)
        for i, item in enumerate(items):
            cur_y = start_y - (i * spacing)
            if item.startswith('header:'):
                ax.text(actual_x + 2.2, cur_y, item.replace('header:', ''), color=title_color,
                        weight='bold', fontsize=10, ha='left', va='center', zorder=5)
            elif item.startswith('code:'):
                ax.text(actual_x + 4.5, cur_y, item.replace('code:', ''), color='#b45309',
                        weight='bold', fontsize=8.8, fontfamily='monospace', ha='left', va='center', zorder=5)
            else:
                ax.text(actual_x + 2.2, cur_y, item, color=c_text_sub, weight='medium',
                        fontsize=9.2, ha='left', va='center', zorder=5)

    # Helper: Draw clean arrow with badge
    def draw_arrow(x1, y1, x2, y2, label=None, color='#334155', lw=1.6, rad=0.0):
        ax1 = x1 * scale_w + shift_x
        ax2 = x2 * scale_w + shift_x
        arr = FancyArrowPatch((ax1, y1), (ax2, y2),
                              connectionstyle=f"arc3,rad={rad}",
                              arrowstyle="-|>",
                              mutation_scale=13,
                              color=color,
                              linewidth=lw,
                              zorder=2)
        ax.add_patch(arr)
        if label:
            mx = (ax1 + ax2) / 2
            my = (y1 + y2) / 2
            ax.text(mx, my, label, color=color, weight='bold', fontsize=8.5,
                    ha='center', va='center', zorder=8,
                    bbox=dict(boxstyle="round,pad=0.25", facecolor="#ffffff", edgecolor=color, linewidth=0.8, alpha=0.95))

    # ============================================================
    # 1. HEADER
    # ============================================================
    title_x = 50 * scale_w + shift_x
    ax.text(title_x, 96.5, "FLOW CHART & SYSTEM ARCHITECTURE", weight='bold', fontsize=19,
            ha='center', va='center', color='#0f172a', fontfamily='serif')
    ax.text(title_x, 93.8, "MockAI: Multi-Agent Automated Placement Assessment & Proctoring Framework",
            weight='medium', fontsize=10.5, ha='center', va='center', color='#64748b')

    # ============================================================
    # 2. START & USER INTERFACE
    # ============================================================
    draw_pill(43, 87.2, 14, 3.8, "START")
    
    ui_w = 48
    ui_h = 11.5
    ui_x = (100 - ui_w) / 2
    ui_y = 72.8
    draw_card(ui_x, ui_y, ui_w, ui_h,
              "USER INTERFACE & IDENTITY AUTHENTICATION",
              ["• Student Portal (React 19, Monaco IDE, Webcam Feed, Audio Interface)",
               "• Faculty & Placement Cell Dashboard (Role Config & Test Analytics)",
               "• Client Face Authentication & Verification (face-api.js)"],
              c_blue_bg, c_blue_border, c_blue_dark, "PORTAL")
    
    # Arrow: START -> UI
    draw_arrow(50, 87.2, 50, ui_y + ui_h, lw=1.8)

    # ============================================================
    # 3. MIDDLE ENGINES (PROCTORING vs 4-ROUND ASSESSMENT)
    # ============================================================
    proc_x = 4.5
    proc_y = 26.5
    proc_w = 42.0
    proc_h = 41.0
    draw_card(proc_x, proc_y, proc_w, proc_h,
              "REAL-TIME PROCTORING ENGINE (OpenCV)",
              ["header:Vision Sensors & DOM Event Listeners",
               "• 30 FPS Webcam Stream + Browser Tab/Window Focus Listeners",
               "• Lightweight CPU Execution (Zero GPU Required for Campus Labs)",
               "header:Hazard Detection Modules (18ms Latency)",
               "• Gaze Center Deviation (Pupil Moment Ratios Δx, Δy)",
               "• Face Absence & Multiple Faces Detection",
               "• Head Pose Pitch / Yaw Rotation (> 25°)",
               "• Mobile Phone & Secondary Peripheral Detection",
               "• Browser Tab-Switching & Window Blur Events",
               "header:Hybrid Risk Engine & 3-Strike Rule",
               "• Dynamic Violation Accumulator (Threshold = 3)",
               "• Strike Limit Exceeded → Exam Auto-Termination & Alert Audio",
               "• Normal Behavior → Continuous Integrity Verified Pass"],
              c_proc_bg, c_proc_border, c_proc_dark, "SECURITY")

    assess_x = 53.5
    assess_y = 26.5
    assess_w = 42.0
    assess_h = 41.0
    draw_card(assess_x, assess_y, assess_w, assess_h,
              "4-ROUND ASSESSMENT & AGENT PIPELINE",
              ["header:Round 1: Adaptive Aptitude Assessment",
               "• Softmax Error-Rate Weighting Engine:",
               "code:P(t_i) = exp(β·e_i) / Σ exp(β·e_j)",
               "• Dynamic Question Generation from MongoDB ($sample)",
               "header:Round 2: Sandboxed Coding Compilation",
               "• Judge0 Docker Sandbox (C, C++, Java, Python, JS)",
               "• Runtime, Memory Bounds & Hidden Test Case Verification",
               "header:Round 3: AI Technical Interview (LangGraph)",
               "• Resume ATS Parsing (PDF Skill & Project Extraction)",
               "• 6-Turn Progressive CS Dialogue (DSA, OS, DBMS, Networks)",
               "• Ultra-Fast LLM Inference: Groq Cloud (Llama-3.1-8B)",
               "header:Round 4: Behavioral HR Round (STAR Method)",
               "• Situation, Task, Action, Result Evaluation Rubrics",
               "• Multi-Turn ConversationBufferMemory Context Tracking"],
              c_assess_bg, c_assess_border, c_assess_dark, "ACADEMIC")

    # Connectors from UI down to Proctoring and Assessment
    draw_arrow(ui_x + 6, ui_y, proc_x + proc_w/2, proc_y + proc_h,
               label="Webcam Stream & Focus Events", color=c_proc_dark, lw=1.6)
    
    draw_arrow(ui_x + ui_w - 6, ui_y, assess_x + assess_w/2, assess_y + assess_h,
               label="Candidate Resume & Test Pipeline", color=c_assess_dark, lw=1.6)

    # Horizontal connector: Proctor Pass -> Assessment
    draw_arrow(proc_x + proc_w, proc_y + 11, assess_x, proc_y + 11,
               label="Integrity Pass", color='#16a34a', lw=1.6)

    # ============================================================
    # 4. BOTTOM LAYER: EVALUATION & DASHBOARDS
    # ============================================================
    dash_w = 91.0
    dash_h = 16.0
    dash_x = 4.5
    dash_y = 6.8
    
    draw_card(dash_x, dash_y, dash_w, dash_h,
              "SCORECARD EVALUATION & CENTRAL REPORTING DASHBOARD",
              ["header:Automated Scorecard Evaluator (Agent 7)",
               "• 4-Pattern Regular Expression Cascade + Keyword-Sentiment Fallback (Pearson Correlation r = 0.89)",
               "header:Student & Faculty Dashboards (Agent 8)",
               "• Student Dashboard: Placement Readiness Index (0 - 100), Topic Strengths/Weaknesses Radar, Custom Roadmap",
               "• Faculty Hub: Class-wide Analytics, Code Execution Logs, Transcripts, and Proctoring Audit Logs",
               "header:Cloud Persistence & Backend",
               "• MongoDB Atlas Cloud (Profiles, Question Banks, Exam Submissions) | Node.js & Flask 3.0 REST API"],
              c_dash_bg, c_dash_border, c_dash_dark, "ANALYTICS")

    # Connectors to Dashboard
    draw_arrow(proc_x + proc_w/2, proc_y, dash_x + dash_w*0.25, dash_y + dash_h,
               label="Integrity Audit Logs", color='#dc2626', lw=1.6)

    draw_arrow(assess_x + assess_w/2, assess_y, dash_x + dash_w*0.75, dash_y + dash_h,
               label="Round Scores & Transcripts", color=c_blue_dark, lw=1.6)

    # ============================================================
    # 5. END CAPSULE
    # ============================================================
    draw_pill(43, 1.0, 14, 3.4, "END")
    draw_arrow(50, dash_y, 50, 4.4, lw=1.6)

    # Save outputs
    plt.tight_layout()
    plt.savefig(output_png, format='png', dpi=300, bbox_inches='tight', facecolor='#ffffff')
    print(f"Generated: {output_png}")
    
    if output_pdf:
        plt.savefig(output_pdf, format='pdf', bbox_inches='tight', facecolor='#ffffff')
        print(f"Generated: {output_pdf}")
        
    plt.close()

if __name__ == '__main__':
    out_dir = r"d:\mockai\architecture"
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Clean Report Version (IEEE / Project Report without side banner)
    rep_png = os.path.join(out_dir, "mockai_architecture_report.png")
    rep_pdf = os.path.join(out_dir, "mockai_architecture_report.pdf")
    render_diagram(rep_png, rep_pdf, is_slide=False)

    # 2. College Slide Presentation Version (with KEC green banner)
    slide_png = os.path.join(out_dir, "mockai_architecture_slide.png")
    render_diagram(slide_png, None, is_slide=True)
