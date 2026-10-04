# -*- coding: utf-8 -*-
"""
Generates high-resolution, vector-accurate, publication-grade SVG architecture diagrams
for the MockAI project:
1. architecture_slide.svg  -> College presentation slide style with KEC ribbon
2. architecture_paper.svg  -> Clean IEEE publication style for research paper
"""
import os

def generate_svg(include_banner=True):
    width = 1680
    height = 980
    
    # Coordinates offset based on banner
    x_offset = 110 if include_banner else 0
    canvas_w = width
    
    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas_w} {height}" width="100%" height="100%" style="background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">')
    
    # Defs: Markers, Gradients, Filters, Icons
    svg.append('''<defs>
    <!-- Arrow marker -->
    <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#16a34a" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7" />
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7c3aed" />
    </marker>

    <!-- Drop Shadow Filter -->
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.07" />
    </filter>
    <filter id="pill-shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0284c7" flood-opacity="0.35" />
    </filter>

    <!-- Gradients -->
    <linearGradient id="kec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#559966" />
      <stop offset="50%" stop-color="#408252" />
      <stop offset="100%" stop-color="#2a6639" />
    </linearGradient>
    <linearGradient id="start-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>''')

    # 1. College Left Banner (if requested)
    if include_banner:
        svg.append('''<!-- KEC Ribbon / Banner -->
    <g id="kec-banner">
      <!-- Curved green banner shape -->
      <path d="M 0 0 L 75 0 C 105 160, 115 480, 75 980 L 0 980 Z" fill="url(#kec-grad)" />
      <!-- Subtle shadow arc -->
      <path d="M 75 0 C 105 160, 115 480, 75 980" fill="none" stroke="#1b4d27" stroke-width="3" opacity="0.4" />
      
      <!-- Vertical College Name Text (Kongu Engineering College style) -->
      <g transform="translate(48, 540) rotate(-90)">
        <text font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="34" letter-spacing="3" text-anchor="middle" fill="#9c155f" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round">
          KONGU ENGINEERING COLLEGE
        </text>
      </g>
    </g>''')

    # Main Canvas Area
    cx = 860 if include_banner else 840
    
    # Slide Title
    svg.append(f'''<!-- SLIDE HEADER -->
    <g id="header" text-anchor="middle">
      <text x="{cx}" y="48" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="32" letter-spacing="2" fill="#0f172a">
        FLOW CHART
      </text>
      <text x="{cx}" y="70" font-size="13" font-weight="600" fill="#64748b" letter-spacing="0.5">
        SYSTEM ARCHITECTURE &amp; MULTI-AGENT WORKFLOW OF MOCKAI
      </text>
    </g>''')

    # Top Control: START & END
    start_x = cx - 220
    end_x = cx + 510
    
    svg.append(f'''<!-- START & END CAPSULES -->
    <!-- START PILL -->
    <g id="node-start" filter="url(#pill-shadow)">
      <rect x="{start_x}" y="88" width="110" height="38" rx="19" fill="url(#start-grad)" />
      <text x="{start_x + 55}" y="112" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="15" letter-spacing="1">START</text>
    </g>

    <!-- END PILL (Top Right, like reference image) -->
    <g id="node-end" filter="url(#pill-shadow)">
      <rect x="{end_x}" y="88" width="110" height="38" rx="19" fill="url(#start-grad)" />
      <text x="{end_x + 55}" y="112" text-anchor="middle" fill="#ffffff" font-weight="bold" font-size="15" letter-spacing="1">END</text>
    </g>''')

    # 1. USER INTERFACE BOX
    ui_x = start_x - 55
    ui_y = 155
    ui_w = 220
    ui_h = 95
    svg.append(f'''<!-- USER INTERFACE (PORTAL) -->
    <g id="node-ui" filter="url(#card-shadow)">
      <rect x="{ui_x}" y="{ui_y}" width="{ui_w}" height="{ui_h}" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
      <!-- Top header strip -->
      <rect x="{ui_x}" y="{ui_y}" width="{ui_w}" height="28" rx="8" fill="#f8fafc" />
      <line x1="{ui_x}" y1="{ui_y + 28}" x2="{ui_x + ui_w}" y2="{ui_y + 28}" stroke="#cbd5e1" stroke-width="1" />
      <text x="{ui_x + ui_w/2}" y="{ui_y + 19}" text-anchor="middle" font-weight="bold" font-size="13" fill="#0f172a">USER INTERFACE</text>
      
      <!-- Sub components / Icons -->
      <g transform="translate({ui_x + 20}, {ui_y + 36})">
        <!-- Student icon -->
        <circle cx="16" cy="12" r="8" fill="#3b82f6" />
        <path d="M 6 30 C 6 22, 26 22, 26 30 Z" fill="#3b82f6" />
        <!-- React icon / web -->
        <circle cx="70" cy="18" r="10" fill="#0284c7" opacity="0.15" />
        <ellipse cx="70" cy="18" rx="12" ry="5" fill="none" stroke="#0284c7" stroke-width="1.5" transform="rotate(30 70 18)" />
        <ellipse cx="70" cy="18" rx="12" ry="5" fill="none" stroke="#0284c7" stroke-width="1.5" transform="rotate(-30 70 18)" />
        <circle cx="70" cy="18" r="2.5" fill="#0284c7" />
        <!-- Webcam / mic -->
        <rect x="115" y="10" width="18" height="15" rx="3" fill="#64748b" />
        <circle cx="124" cy="17.5" r="4.5" fill="#ef4444" />
        <path d="M 133 13 L 140 9 L 140 25 L 133 21 Z" fill="#64748b" />
      </g>
      <text x="{ui_x + ui_w/2}" y="{ui_y + 82}" text-anchor="middle" font-size="11" font-weight="600" fill="#475569">
        Student &amp; Faculty Portals
      </text>
    </g>''')

    # Arrow START -> USER INTERFACE
    svg.append(f'''<line x1="{start_x + 55}" y1="126" x2="{start_x + 55}" y2="{ui_y}" stroke="#334155" stroke-width="1.8" marker-end="url(#arrow)" />''')

    # Splitting Node: AUTH & PIPELINE DISPATCHER (Candidate Details / Resume)
    split_y = 285
    disp_x = ui_x + 10
    disp_w = 200
    disp_h = 50
    svg.append(f'''<!-- CANDIDATE PROFILE & RESUME -->
    <g id="node-candidate" filter="url(#card-shadow)">
      <rect x="{disp_x}" y="{split_y}" width="{disp_w}" height="{disp_h}" rx="6" fill="#ffffff" stroke="#3b82f6" stroke-width="1.6" />
      <text x="{disp_x + disp_w/2}" y="{split_y + 20}" text-anchor="middle" font-weight="bold" font-size="12" fill="#1e3a8a">CANDIDATE DISPATCHER</text>
      <text x="{disp_x + disp_w/2}" y="{split_y + 38}" text-anchor="middle" font-size="10.5" fill="#475569">Profile Auth + Resume Upload</text>
    </g>
    <line x1="{ui_x + ui_w/2}" y1="{ui_y + ui_h}" x2="{disp_x + disp_w/2}" y2="{split_y}" stroke="#334155" stroke-width="1.8" marker-end="url(#arrow)" />''')

    # ----------------------------------------------------
    # LEFT WING: MULTI-HAZARD PROCTORING PIPELINE
    # ----------------------------------------------------
    proc_box_x = 140 if include_banner else 40
    proc_box_y = 365
    proc_box_w = 340
    proc_box_h = 365
    
    svg.append(f'''<!-- MULTI-HAZARD PROCTORING GROUP -->
    <rect x="{proc_box_x}" y="{proc_box_y}" width="{proc_box_w}" height="{proc_box_h}" rx="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6 4" />
    <rect x="{proc_box_x + 15}" y="{proc_box_y - 12}" width="210" height="24" rx="4" fill="#0f172a" />
    <text x="{proc_box_x + 120}" y="{proc_box_y + 4}" text-anchor="middle" font-weight="bold" font-size="11" fill="#ffffff" letter-spacing="0.5">CPU MULTI-HAZARD PROCTORING</text>''')

    # Card 1: Video & Event Sensors
    sen_x = proc_box_x + 20
    sen_y = proc_box_y + 25
    sen_w = 300
    sen_h = 60
    svg.append(f'''<!-- SENSORS INPUT -->
    <g id="node-sensors" filter="url(#card-shadow)">
      <rect x="{sen_x}" y="{sen_y}" width="{sen_w}" height="{sen_h}" rx="6" fill="#ffffff" stroke="#0891b2" stroke-width="1.5" />
      <text x="{sen_x + sen_w/2}" y="{sen_y + 19}" text-anchor="middle" font-weight="bold" font-size="12" fill="#0e7490">Webcam Stream &amp; DOM Listeners</text>
      <text x="{sen_x + sen_w/2}" y="{sen_y + 36}" text-anchor="middle" font-size="10.5" fill="#475569">Video Frames (30 FPS) + Window Blur / Visibility</text>
      <text x="{sen_x + sen_w/2}" y="{sen_y + 50}" text-anchor="middle" font-size="9.5" fill="#64748b">(Lightweight Client &amp; CPU Thread)</text>
    </g>''')

    # Card 2: Feature Extraction & Detection Models (OpenCV Haar + Moment Gaze)
    cv_y = sen_y + 85
    cv_h = 100
    svg.append(f'''<!-- OPENCV FEATURE EXTRACTION -->
    <g id="node-opencv" filter="url(#card-shadow)">
      <rect x="{sen_x}" y="{cv_y}" width="{sen_w}" height="{cv_h}" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="1.5" />
      <rect x="{sen_x}" y="{cv_y}" width="{sen_w}" height="22" rx="6" fill="#f1f5f9" />
      <line x1="{sen_x}" y1="{cv_y + 22}" x2="{sen_x + sen_w}" y2="{cv_y + 22}" stroke="#cbd5e1" stroke-width="1" />
      <text x="{sen_x + sen_w/2}" y="{cv_y + 15}" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#0f172a">OpenCV Haar &amp; Gaze Centroid Model</text>
      
      <!-- Bullet list -->
      <text x="{sen_x + 12}" y="{cv_y + 38}" font-size="10" font-weight="600" fill="#334155">• Center Gaze Deviation (Δx, Δy ratio)</text>
      <text x="{sen_x + 12}" y="{cv_y + 53}" font-size="10" font-weight="600" fill="#334155">• Face Absence &amp; Multiple Faces Detected</text>
      <text x="{sen_x + 12}" y="{cv_y + 68}" font-size="10" font-weight="600" fill="#334155">• Excessive Head Rotation (&gt; 25° roll/pitch)</text>
      <text x="{sen_x + 12}" y="{cv_y + 83}" font-size="10" font-weight="600" fill="#334155">• Mobile Phone &amp; Peripheral Usage</text>
      <text x="{sen_x + 12}" y="{cv_y + 95}" font-size="9" fill="#0284c7">⚡ 18 ms Latency | Zero GPU Requirement</text>
    </g>
    <!-- Arrow from Sensors to OpenCV -->
    <line x1="{sen_x + sen_w/2}" y1="{sen_y + sen_h}" x2="{sen_x + sen_w/2}" y2="{cv_y}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)" />''')

    # Card 3: Hybrid Risk & Violation Engine
    risk_y = cv_y + 125
    risk_h = 55
    svg.append(f'''<!-- HYBRID INTEGRITY ENGINE -->
    <g id="node-risk-engine" filter="url(#card-shadow)">
      <rect x="{sen_x}" y="{risk_y}" width="{sen_w}" height="{risk_h}" rx="6" fill="#ffffff" stroke="#e11d48" stroke-width="1.6" />
      <text x="{sen_x + sen_w/2}" y="{risk_y + 18}" text-anchor="middle" font-weight="bold" font-size="12" fill="#be123c">HYBRID INTEGRITY RISK ENGINE</text>
      <text x="{sen_x + sen_w/2}" y="{risk_y + 35}" text-anchor="middle" font-size="10.5" fill="#475569">Multi-Modal Hazard Scoring &amp; Strike Counter</text>
      <text x="{sen_x + sen_w/2}" y="{risk_y + 48}" text-anchor="middle" font-size="9" font-weight="600" fill="#e11d48">Violation Threshold: 3 Warnings</text>
    </g>
    <!-- Arrow OpenCV to Risk Engine -->
    <line x1="{sen_x + sen_w/2}" y1="{cv_y + cv_h}" x2="{sen_x + sen_w/2}" y2="{risk_y}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)" />''')

    # Arrow from Candidate Dispatcher to Proctoring Sensors
    svg.append(f'''<!-- Dispatcher to Proctoring Branch -->
    <path d="M {disp_x} {split_y + disp_h/2} L {sen_x + sen_w/2} {split_y + disp_h/2} L {sen_x + sen_w/2} {sen_y}" fill="none" stroke="#0891b2" stroke-width="1.8" marker-end="url(#arrow)" />
    <text x="{disp_x - 30}" y="{split_y + 15}" font-size="10" font-weight="bold" fill="#0891b2" text-anchor="end">Webcam + State</text>''')

    # Decision Split from Risk Engine:
    # 1. Red Block (Violations >= 3)
    # 2. Green Pass (Safe Content / Exam Integrity Maintained)
    dec_y = risk_y + 75
    
    # Red Block Node (Phishing Found equivalent: EXAM VIOLATION)
    red_x = sen_x - 10
    red_w = 145
    red_h = 75
    svg.append(f'''<!-- VIOLATION EXCEEDED (RED ALERT) -->
    <g id="node-alert" filter="url(#card-shadow)">
      <rect x="{red_x}" y="{dec_y}" width="{red_w}" height="{red_h}" rx="8" fill="#fff1f2" stroke="#dc2626" stroke-width="1.8" />
      <!-- Red circle prohibition icon -->
      <circle cx="{red_x + red_w/2}" cy="{dec_y + 22}" r="12" fill="none" stroke="#dc2626" stroke-width="2.5" />
      <line x1="{red_x + red_w/2 - 8}" y1="{dec_y + 14}" x2="{red_x + red_w/2 + 8}" y2="{dec_y + 30}" stroke="#dc2626" stroke-width="2.5" />
      
      <text x="{red_x + red_w/2}" y="{dec_y + 46}" text-anchor="middle" font-weight="bold" font-size="11" fill="#991b1b">STRIKE LIMIT REACHED</text>
      <text x="{red_x + red_w/2}" y="{dec_y + 59}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">(Auto-Terminate &amp; Flag)</text>
      <text x="{red_x + red_w/2}" y="{dec_y + 70}" text-anchor="middle" font-size="8.5" fill="#7f1d1d">Alert Audio Fired</text>
    </g>''')

    # Green Shield Node (Integrity Verified)
    grn_x = sen_x + 165
    grn_w = 145
    grn_h = 75
    svg.append(f'''<!-- INTEGRITY VERIFIED (GREEN PASS) -->
    <g id="node-verified" filter="url(#card-shadow)">
      <rect x="{grn_x}" y="{dec_y}" width="{grn_w}" height="{grn_h}" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8" />
      <!-- Green shield icon -->
      <path d="M {grn_x + grn_w/2} {dec_y + 10} L {grn_x + grn_w/2 + 10} {dec_y + 14} L {grn_x + grn_w/2 + 10} {dec_y + 26} C {grn_x + grn_w/2 + 10} {dec_y + 33}, {grn_x + grn_w/2} {dec_y + 36}, {grn_x + grn_w/2} {dec_y + 36} C {grn_x + grn_w/2} {dec_y + 36}, {grn_x + grn_w/2 - 10} {dec_y + 33}, {grn_x + grn_w/2 - 10} {dec_y + 26} L {grn_x + grn_w/2 - 10} {dec_y + 14} Z" fill="#16a34a" />
      <path d="M {grn_x + grn_w/2 - 4} {dec_y + 23} L {grn_x + grn_w/2 - 1} {dec_y + 26} L {grn_x + grn_w/2 + 5} {dec_y + 19}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      
      <text x="{grn_x + grn_w/2}" y="{dec_y + 46}" text-anchor="middle" font-weight="bold" font-size="11" fill="#166534">INTEGRITY VERIFIED</text>
      <text x="{grn_x + grn_w/2}" y="{dec_y + 59}" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">(Continuous Pass)</text>
      <text x="{grn_x + grn_w/2}" y="{dec_y + 70}" text-anchor="middle" font-size="8.5" fill="#14532d">Permit Full Assessment</text>
    </g>''')

    # Arrows from Risk Engine to Red Alert & Green Pass
    svg.append(f'''<path d="M {sen_x + sen_w/2} {risk_y + risk_h} L {sen_x + sen_w/2} {risk_y + risk_h + 12} L {red_x + red_w/2} {risk_y + risk_h + 12} L {red_x + red_w/2} {dec_y}" fill="none" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrow-red)" />
    <text x="{red_x + red_w/2 - 5}" y="{risk_y + risk_h + 10}" font-size="9.5" font-weight="bold" fill="#dc2626" text-anchor="end">VIOLATIONS &gt;= 3</text>

    <path d="M {sen_x + sen_w/2} {risk_y + risk_h} L {sen_x + sen_w/2} {risk_y + risk_h + 12} L {grn_x + grn_w/2} {risk_y + risk_h + 12} L {grn_x + grn_w/2} {dec_y}" fill="none" stroke="#16a34a" stroke-width="1.5" marker-end="url(#arrow-green)" />
    <text x="{grn_x + grn_w/2 + 5}" y="{risk_y + risk_h + 10}" font-size="9.5" font-weight="bold" fill="#16a34a" text-anchor="start">NORMAL BEHAVIOR</text>''')

    # ----------------------------------------------------
    # CENTER & RIGHT: 4-ROUND ASSESSMENT & AGENT PIPELINE
    # ----------------------------------------------------
    # Connecting Dispatcher to Assessment Stream
    assess_start_x = disp_x + disp_w
    center_branch_x = assess_start_x + 50
    
    # 1. ROUND 1: ADAPTIVE APTITUDE ASSESSMENT
    apt_x = 520 if include_banner else 420
    apt_y = 285
    apt_w = 260
    apt_h = 100
    svg.append(f'''<!-- ROUND 1: APTITUDE -->
    <g id="node-aptitude" filter="url(#card-shadow)">
      <rect x="{apt_x}" y="{apt_y}" width="{apt_w}" height="{apt_h}" rx="8" fill="#ffffff" stroke="#d97706" stroke-width="1.6" />
      <rect x="{apt_x}" y="{apt_y}" width="{apt_w}" height="22" rx="8" fill="#fffbeb" />
      <line x1="{apt_x}" y1="{apt_y + 22}" x2="{apt_x + apt_w}" y2="{apt_y + 22}" stroke="#fde68a" stroke-width="1" />
      <text x="{apt_x + apt_w/2}" y="{apt_y + 15}" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#92400e">ROUND 1: ADAPTIVE APTITUDE</text>
      
      <text x="{apt_x + 12}" y="{apt_y + 38}" font-size="10" font-weight="600" fill="#334155">• Softmax Error-Rate Weighting Engine</text>
      <text x="{apt_x + 20}" y="{apt_y + 52}" font-size="9" font-family="Courier, monospace" fill="#b45309">P(t_i) = exp(β·e_i) / Σ exp(β·e_j)</text>
      <text x="{apt_x + 12}" y="{apt_y + 68}" font-size="10" font-weight="600" fill="#334155">• Dynamic Question Bank (MongoDB $sample)</text>
      <text x="{apt_x + 12}" y="{apt_y + 83}" font-size="10" font-weight="600" fill="#334155">• Quantitative, Logical, Verbal MCQs</text>
      <text x="{apt_x + 12}" y="{apt_y + 94}" font-size="8.5" fill="#78350f">Focuses on identified student weaknesses</text>
    </g>''')

    # 2. ROUND 2: SANDBOXED CODING COMPILATION
    code_y = apt_y + 125
    code_h = 100
    svg.append(f'''<!-- ROUND 2: CODING SANDBOX -->
    <g id="node-coding" filter="url(#card-shadow)">
      <rect x="{apt_x}" y="{code_y}" width="{apt_w}" height="{code_h}" rx="8" fill="#ffffff" stroke="#7c3aed" stroke-width="1.6" />
      <rect x="{apt_x}" y="{code_y}" width="{apt_w}" height="22" rx="8" fill="#f5f3ff" />
      <line x1="{apt_x}" y1="{code_y + 22}" x2="{apt_x + apt_w}" y2="{code_y + 22}" stroke="#ddd6fe" stroke-width="1" />
      <text x="{apt_x + apt_w/2}" y="{code_y + 15}" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#5b21b6">ROUND 2: CODING COMPILATION</text>
      
      <text x="{apt_x + 12}" y="{code_y + 38}" font-size="10" font-weight="600" fill="#334155">• Monaco Editor (C, C++, Java, Py, JS)</text>
      <text x="{apt_x + 12}" y="{code_y + 53}" font-size="10" font-weight="600" fill="#334155">• Judge0 API Sandbox (Docker Isolated)</text>
      <text x="{apt_x + 12}" y="{code_y + 68}" font-size="10" font-weight="600" fill="#334155">• Hidden Test Cases &amp; Complexity Check</text>
      <text x="{apt_x + 12}" y="{code_y + 83}" font-size="10" font-weight="600" fill="#334155">• Execution Output, Time &amp; Memory Bounds</text>
      <text x="{apt_x + 12}" y="{code_y + 94}" font-size="8.5" fill="#6d28d9">Strict CPU isolation against malicious code</text>
    </g>''')

    # Connect Candidate Dispatcher to Aptitude
    svg.append(f'''<!-- Dispatcher to Round 1 -->
    <path d="M {disp_x + disp_w} {split_y + disp_h/2} L {apt_x} {split_y + disp_h/2}" fill="none" stroke="#d97706" stroke-width="1.8" marker-end="url(#arrow)" />
    <text x="{disp_x + disp_w + 10}" y="{split_y + disp_h/2 - 6}" font-size="10" font-weight="bold" fill="#d97706">Candidate Profile</text>
    
    <!-- Round 1 to Round 2 -->
    <line x1="{apt_x + apt_w/2}" y1="{apt_y + apt_h}" x2="{apt_x + apt_w/2}" y2="{code_y}" stroke="#334155" stroke-width="1.6" marker-end="url(#arrow)" />
    <text x="{apt_x + apt_w/2 + 6}" y="{apt_y + apt_h + 15}" font-size="9.5" font-weight="bold" fill="#64748b">Aptitude Passed</text>''')

    # ----------------------------------------------------
    # RIGHT WING: AGENTIC AI INTERVIEW PIPELINE
    # ----------------------------------------------------
    # Bounding Box (dashed) for Agentic AI Interview Pipeline
    pipe_x = 815 if include_banner else 715
    pipe_y = 200
    pipe_w = 485
    pipe_h = 530
    
    svg.append(f'''<!-- AGENTIC AI PIPELINE BOUNDARY -->
    <g id="group-ai-pipeline">
      <rect x="{pipe_x}" y="{pipe_y}" width="{pipe_w}" height="{pipe_h}" rx="14" fill="#fafafa" stroke="#059669" stroke-width="1.8" stroke-dasharray="7 5" />
      <rect x="{pipe_x + pipe_w - 230}" y="{pipe_y - 12}" width="210" height="24" rx="4" fill="#065f46" />
      <text x="{pipe_x + pipe_w - 125}" y="{pipe_y + 4}" text-anchor="middle" font-weight="bold" font-size="11" fill="#ffffff" letter-spacing="0.5">AGENTIC AI INTERVIEW PIPELINE</text>
    </g>''')

    # ATS Parser Box (Input to AI Pipeline)
    ats_x = pipe_x + 25
    ats_y = pipe_y + 25
    ats_w = 205
    ats_h = 65
    svg.append(f'''<!-- ATS RESUME PARSER -->
    <g id="node-ats" filter="url(#card-shadow)">
      <rect x="{ats_x}" y="{ats_y}" width="{ats_w}" height="{ats_h}" rx="6" fill="#ffffff" stroke="#0f766e" stroke-width="1.5" />
      <text x="{ats_x + ats_w/2}" y="{ats_y + 18}" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#115e59">ATS Resume Parser (PDF/DOCX)</text>
      <text x="{ats_x + ats_w/2}" y="{ats_y + 35}" text-anchor="middle" font-size="10" fill="#334155">PDF Text Preprocessing &amp; Normalization</text>
      <text x="{ats_x + ats_w/2}" y="{ats_y + 50}" text-anchor="middle" font-size="9.5" fill="#64748b">Skill, Project &amp; Tech Stack Extraction</text>
    </g>''')

    # Vector RAG & Knowledge Store Box
    rag_x = pipe_x + 255
    rag_y = pipe_y + 25
    rag_w = 205
    rag_h = 65
    svg.append(f'''<!-- VECTOR STORE & RAG -->
    <g id="node-rag" filter="url(#card-shadow)">
      <rect x="{rag_x}" y="{rag_y}" width="{rag_w}" height="{rag_h}" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="1.5" />
      <text x="{rag_x + rag_w/2}" y="{rag_y + 18}" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#1e40af">Pinecone / ChromaDB (RAG)</text>
      <text x="{rag_x + rag_w/2}" y="{rag_y + 35}" text-anchor="middle" font-size="10" fill="#334155">Domain Question Embeddings</text>
      <text x="{rag_x + rag_w/2}" y="{rag_y + 50}" text-anchor="middle" font-size="9.5" fill="#64748b">Curriculum &amp; Placement Knowledge</text>
    </g>''')

    # Agentic Interview Flowchart Box (Core LangGraph / LangChain)
    agent_x = pipe_x + 25
    agent_y = ats_y + 85
    agent_w = pipe_w - 50
    agent_h = 245
    svg.append(f'''<!-- CORE AGENTIC AI ASSISTANT -->
    <g id="node-agentic-interview" filter="url(#card-shadow)">
      <rect x="{agent_x}" y="{agent_y}" width="{agent_w}" height="{agent_h}" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
      <rect x="{agent_x}" y="{agent_y}" width="{agent_w}" height="28" rx="8" fill="#f8fafc" />
      <line x1="{agent_x}" y1="{agent_y + 28}" x2="{agent_x + agent_w}" y2="{agent_y + 28}" stroke="#cbd5e1" stroke-width="1" />
      <text x="{agent_x + agent_w/2}" y="{agent_y + 19}" text-anchor="middle" font-weight="bold" font-size="13" fill="#0f172a">
        AGENTIC AI INTERVIEW ENGINE (LangGraph / LangChain)
      </text>

      <!-- Sub Module 1: Technical Round (Agent 4) -->
      <g transform="translate({agent_x + 15}, {agent_y + 38})">
        <rect x="0" y="0" width="195" height="110" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.2" />
        <text x="97" y="18" text-anchor="middle" font-weight="bold" font-size="11" fill="#15803d">ROUND 3: TECHNICAL AGENT</text>
        <text x="8" y="38" font-size="9.5" font-weight="600" fill="#334155">• Resume-parsed CS dialogue</text>
        <text x="8" y="52" font-size="9.5" font-weight="600" fill="#334155">• 6-Turn Progressive Probe</text>
        <text x="8" y="66" font-size="9.5" font-weight="600" fill="#334155">• DSA, OS, DBMS, Networks</text>
        <text x="8" y="80" font-size="9.5" font-weight="600" fill="#334155">• Dynamic follow-up adaptivity</text>
        <text x="8" y="98" font-size="8.5" fill="#166534">Powered by gpt-oss-120b / LLaMA</text>
      </g>

      <!-- Sub Module 2: Behavioral HR Round (Agent 5) -->
      <g transform="translate({agent_x + 225}, {agent_y + 38})">
        <rect x="0" y="0" width="195" height="110" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.2" />
        <text x="97" y="18" text-anchor="middle" font-weight="bold" font-size="11" fill="#1d4ed8">ROUND 4: BEHAVIORAL HR AGENT</text>
        <text x="8" y="38" font-size="9.5" font-weight="600" fill="#334155">• STAR Method Framework</text>
        <text x="8" y="52" font-size="9.5" font-weight="600" fill="#334155">  (Situation, Task, Action, Result)</text>
        <text x="8" y="66" font-size="9.5" font-weight="600" fill="#334155">• Conflict resolution &amp; ethics</text>
        <text x="8" y="80" font-size="9.5" font-weight="600" fill="#334155">• Leadership &amp; adaptability</text>
        <text x="8" y="98" font-size="8.5" fill="#1e40af">Powered by llama-3.1-8b-instant</text>
      </g>

      <!-- Conversation Memory & State Router -->
      <g transform="translate({agent_x + 15}, {agent_y + 160})">
        <rect x="0" y="0" width="405" height="42" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" />
        <text x="202" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">
          ConversationBufferMemory &amp; Deterministic State Router
        </text>
        <text x="202" y="31" text-anchor="middle" font-size="9" fill="#475569">
          Maintains multi-turn context, candidate responses, and per-question evaluation logs
        </text>
      </g>

      <!-- Sub-models logos bar -->
      <g transform="translate({agent_x + 15}, {agent_y + 210})">
        <text x="0" y="16" font-size="9.5" font-weight="bold" fill="#64748b">INTEGRATED BACKENDS:</text>
        <!-- Groq Pill -->
        <rect x="140" y="4" width="75" height="18" rx="4" fill="#f97316" />
        <text x="177" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">Groq Cloud</text>
        <!-- Meta Llama Pill -->
        <rect x="225" y="4" width="85" height="18" rx="4" fill="#0284c7" />
        <text x="267" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">Llama-3.1-8B</text>
        <!-- LangChain Pill -->
        <rect x="320" y="4" width="85" height="18" rx="4" fill="#059669" />
        <text x="362" y="16" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">LangGraph</text>
      </g>
    </g>
    <!-- Connectors inside AI Pipeline -->
    <line x1="{ats_x + ats_w/2}" y1="{ats_y + ats_h}" x2="{ats_x + ats_w/2}" y2="{agent_y}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)" />
    <line x1="{rag_x + rag_w/2}" y1="{rag_y + rag_h}" x2="{rag_x + rag_w/2}" y2="{agent_y}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)" />''')

    # Card: EVALUATION AND SCORECARD AGENT (Agent 7)
    eval_x = agent_x
    eval_y = agent_y + agent_h + 20
    eval_w = agent_w
    eval_h = 70
    svg.append(f'''<!-- EVALUATION & SCORECARD AGENT -->
    <g id="node-evaluator" filter="url(#card-shadow)">
      <rect x="{eval_x}" y="{eval_y}" width="{eval_w}" height="{eval_h}" rx="6" fill="#ffffff" stroke="#4f46e5" stroke-width="1.6" />
      <rect x="{eval_x}" y="{eval_y}" width="{eval_w}" height="20" rx="6" fill="#eef2ff" />
      <line x1="{eval_x}" y1="{eval_y + 20}" x2="{eval_x + eval_w}" y2="{eval_y + 20}" stroke="#c7d2fe" stroke-width="1" />
      <text x="{eval_x + eval_w/2}" y="{eval_y + 14}" text-anchor="middle" font-weight="bold" font-size="11" fill="#3730a3">
        EVALUATION &amp; SCORECARD AGENT (Agent 7)
      </text>

      <text x="{eval_x + 12}" y="{eval_y + 36}" font-size="9.5" font-weight="600" fill="#334155">• 4-Pattern Regular Expression Cascade + Sentiment Fallback</text>
      <text x="{eval_x + 12}" y="{eval_y + 50}" font-size="9.5" font-weight="600" fill="#334155">• Score Extraction (/50), Strengths, Improvement Areas &amp; Weaknesses</text>
      <text x="{eval_x + 12}" y="{eval_y + 63}" font-size="9" fill="#4338ca">⚡ Pearson Correlation r = 0.89 with human evaluators</text>
    </g>
    <!-- Arrow from Agentic Engine to Evaluator -->
    <line x1="{eval_x + eval_w/2}" y1="{agent_y + agent_h}" x2="{eval_x + eval_w/2}" y2="{eval_y}" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)" />''')

    # Arrow from Round 2 (Coding) into AI Interview Pipeline
    svg.append(f'''<!-- Round 2 Coding -> AI Interview Pipeline -->
    <path d="M {apt_x + apt_w} {code_y + code_h/2} L {pipe_x} {code_y + code_h/2}" fill="none" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#arrow-purple)" />
    <text x="{pipe_x - 10}" y="{code_y + code_h/2 - 6}" font-size="10" font-weight="bold" fill="#7c3aed" text-anchor="end">Codes Compiled &amp; Passed</text>''')

    # Arrow from Green Verified into Coding / Technical
    svg.append(f'''<!-- Proctor Pass to Round 1 / Assessment -->
    <path d="M {grn_x + grn_w} {dec_y + grn_h/2} L {apt_x + apt_w/2} {dec_y + grn_h/2} L {apt_x + apt_w/2} {code_y + code_h}" fill="none" stroke="#16a34a" stroke-width="1.8" stroke-dasharray="4 3" marker-end="url(#arrow-green)" />
    <text x="{grn_x + grn_w + 10}" y="{dec_y + grn_h/2 - 6}" font-size="9.5" font-weight="bold" fill="#16a34a">Continuous Integrity Verified</text>''')

    # ----------------------------------------------------
    # FINAL DESTINATION: USER DASHBOARDS (Student & Teacher) & END
    # ----------------------------------------------------
    dash_x = cx + 450
    dash_y = 155
    dash_w = 230
    dash_h = 320
    
    svg.append(f'''<!-- USER DASHBOARDS (CENTRALIZED) -->
    <g id="node-dashboards" filter="url(#card-shadow)">
      <rect x="{dash_x}" y="{dash_y}" width="{dash_w}" height="{dash_h}" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
      <rect x="{dash_x}" y="{dash_y}" width="{dash_w}" height="28" rx="8" fill="#f8fafc" />
      <line x1="{dash_x}" y1="{dash_y + 28}" x2="{dash_x + dash_w}" y2="{dash_y + 28}" stroke="#cbd5e1" stroke-width="1" />
      <text x="{dash_x + dash_w/2}" y="{dash_y + 19}" text-anchor="middle" font-weight="bold" font-size="13" fill="#0f172a">USER DASHBOARDS</text>
      
      <!-- Section 1: Student Dashboard -->
      <g transform="translate({dash_x + 12}, {dash_y + 36})">
        <rect x="0" y="0" width="{dash_w - 24}" height="105" rx="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <text x="10" y="18" font-size="11" font-weight="bold" fill="#1e40af">🎓 STUDENT DASHBOARD</text>
        <text x="12" y="36" font-size="9.5" fill="#334155">• Placement Readiness Score</text>
        <text x="24" y="49" font-size="8.5" font-weight="bold" fill="#0284c7">(0 to 100 Index)</text>
        <text x="12" y="64" font-size="9.5" fill="#334155">• Round-by-Round Breakdown</text>
        <text x="12" y="78" font-size="9.5" fill="#334155">• Strengths &amp; Topic Radar</text>
        <text x="12" y="92" font-size="9.5" fill="#334155">• Recommended Learning Path</text>
      </g>

      <!-- Section 2: Teacher Dashboard (Agent 8) -->
      <g transform="translate({dash_x + 12}, {dash_y + 152})">
        <rect x="0" y="0" width="{dash_w - 24}" height="155" rx="5" fill="#fdf4ff" stroke="#e879f9" stroke-width="1" />
        <text x="10" y="18" font-size="11" font-weight="bold" fill="#86198f">👩‍🏫 CENTRAL TEACHER HUB</text>
        <text x="12" y="36" font-size="9.5" fill="#334155">• Placement Cell Analytics</text>
        <text x="12" y="51" font-size="9.5" fill="#334155">• Topic-wise Aggregate Scores</text>
        <text x="12" y="66" font-size="9.5" fill="#334155">• Sandboxed Code Execution Logs</text>
        <text x="12" y="81" font-size="9.5" fill="#334155">• Multi-Hazard Proctoring Audit</text>
        <text x="12" y="96" font-size="9.5" fill="#334155">• Full Interview Transcripts</text>
        <text x="12" y="111" font-size="9.5" fill="#334155">• PDF Report Generation</text>
        <text x="12" y="126" font-size="9.5" fill="#334155">• Drive &amp; Role Management</text>
        <text x="12" y="143" font-size="8.5" font-weight="bold" fill="#c026d3">MongoDB Atlas Persistence</text>
      </g>
    </g>''')

    # Arrow from Dashboard to END (Top Right)
    svg.append(f'''<!-- Dashboard to END -->
    <line x1="{dash_x + dash_w/2}" y1="{dash_y}" x2="{dash_x + dash_w/2}" y2="126" stroke="#334155" stroke-width="1.8" marker-end="url(#arrow)" />
    <text x="{dash_x + dash_w/2 + 8}" y="142" font-size="9.5" font-weight="bold" fill="#64748b">Report Exported</text>''')

    # Route: Evaluator Agent to User Dashboard
    svg.append(f'''<!-- Evaluator to Dashboard -->
    <path d="M {eval_x + eval_w} {eval_y + eval_h/2} L {dash_x - 30} {eval_y + eval_h/2} L {dash_x - 30} {dash_y + 100} L {dash_x} {dash_y + 100}" fill="none" stroke="#4f46e5" stroke-width="1.8" marker-end="url(#arrow)" />
    <text x="{dash_x - 20}" y="{eval_y + eval_h/2 - 6}" font-size="9.5" font-weight="bold" fill="#4f46e5" text-anchor="end">Final Scorecard</text>''')

    # Route: Red Alert (Strike Exceeded) to Teacher Audit Log
    svg.append(f'''<!-- Red Alert to Teacher Audit -->
    <path d="M {red_x} {dec_y + red_h/2} L {proc_box_x - 15} {dec_y + red_h/2} L {proc_box_x - 15} {height - 40} L {dash_x + dash_w/2} {height - 40} L {dash_x + dash_w/2} {dash_y + dash_h}" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)" />
    <text x="{proc_box_x - 20}" y="{dec_y + red_h/2 - 6}" font-size="9.5" font-weight="bold" fill="#dc2626" text-anchor="end">Violation Flag Logged</text>''')

    # Database Footprint & Tech Stack Bar (Bottom)
    foot_y = height - 70
    foot_w = 800
    foot_x = cx - 180
    svg.append(f'''<!-- PERSISTENCE & CLUSTER INFRASTRUCTURE -->
    <g id="cluster-footer" transform="translate({foot_x}, {foot_y})">
      <rect x="0" y="0" width="{foot_w}" height="42" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
      <text x="15" y="25" font-size="11" font-weight="bold" fill="#334155">CORE BACKEND INFRASTRUCTURE:</text>
      
      <!-- Tech badges -->
      <g transform="translate(230, 8)">
        <rect x="0" y="0" width="90" height="24" rx="4" fill="#00ed64" opacity="0.15" />
        <rect x="0" y="0" width="90" height="24" rx="4" fill="none" stroke="#00ed64" stroke-width="1" />
        <text x="45" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#047857">MongoDB Atlas</text>

        <rect x="100" y="0" width="80" height="24" rx="4" fill="#0284c7" opacity="0.15" />
        <rect x="100" y="0" width="80" height="24" rx="4" fill="none" stroke="#0284c7" stroke-width="1" />
        <text x="140" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#0369a1">Docker Sandbox</text>

        <rect x="190" y="0" width="75" height="24" rx="4" fill="#000000" opacity="0.08" />
        <rect x="190" y="0" width="75" height="24" rx="4" fill="none" stroke="#000000" stroke-width="1" />
        <text x="227" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">Flask 3.0</text>

        <rect x="275" y="0" width="75" height="24" rx="4" fill="#339933" opacity="0.15" />
        <rect x="275" y="0" width="75" height="24" rx="4" fill="none" stroke="#339933" stroke-width="1" />
        <text x="312" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">Node 20.x</text>

        <rect x="360" y="0" width="90" height="24" rx="4" fill="#61dafb" opacity="0.18" />
        <rect x="360" y="0" width="90" height="24" rx="4" fill="none" stroke="#0284c7" stroke-width="1" />
        <text x="405" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#0369a1">React 19 SPA</text>

        <rect x="460" y="0" width="90" height="24" rx="4" fill="#f59e0b" opacity="0.18" />
        <rect x="460" y="0" width="90" height="24" rx="4" fill="none" stroke="#d97706" stroke-width="1" />
        <text x="505" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#b45309">Groq LPU</text>
      </g>
    </g>''')

    svg.append('</svg>')
    return '\n'.join(svg)

# Write both versions:
out_dir = r"d:\mockai\architecture"
os.makedirs(out_dir, exist_ok=True)

# 1. Slide version (with KEC banner)
slide_content = generate_svg(include_banner=True)
slide_path = os.path.join(out_dir, "architecture_flowchart_slide.svg")
with open(slide_path, "w", encoding="utf-8") as f:
    f.write(slide_content)
print(f"Generated slide SVG: {slide_path} ({len(slide_content)} bytes)")

# 2. Paper version (without KEC banner, clean white margins for IEEE paper)
paper_content = generate_svg(include_banner=False)
paper_path = os.path.join(out_dir, "architecture_flowchart_paper.svg")
with open(paper_path, "w", encoding="utf-8") as f:
    f.write(paper_content)
print(f"Generated paper SVG: {paper_path} ({len(paper_content)} bytes)")
