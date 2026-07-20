"""
technical_interview_bp.py
--------------------------
Flask Blueprint wrapper for the AI Technical Interview Multi-Agent System.
Register this in app.py with:

    from technical_interview_bp import tech_interview_bp
    app.register_blueprint(tech_interview_bp)

All routes are prefixed with /api/v2/
"""

import io
import re
import json
import base64 as b64mod
import logging
from uuid import uuid4
from typing import Optional, List, Dict, Any

from flask import Blueprint, request, jsonify, session

# ── Agent imports from the main module ──────────────────────────────────────
from technical_interview_agent import (
    resume_extractor_agent,
    question_generator_agent,
    evaluator_agent,
    generate_final_report_node,
    _init_interview_state,
    _extract_text_from_pdf,
    _extract_text_from_docx,
    PDF_AVAILABLE,
    DOCX_AVAILABLE,
    MAX_QUESTIONS,
    MARKS_PER_QUESTION,
)

logger = logging.getLogger("TechInterview.Blueprint")

# ── In-memory session store (shared with main module) ───────────────────────
session_store: Dict[str, Dict[str, Any]] = {}

tech_interview_bp = Blueprint("tech_interview", __name__, url_prefix="/api/v2")


# ── Helpers ──────────────────────────────────────────────────────────────────
def _get_session_id() -> str:
    if "ti_session_id" not in session:
        session["ti_session_id"] = str(uuid4())
    return session["ti_session_id"]


def _get_state(sid: str):
    return session_store.get(sid)


def _save_state(sid: str, state):
    session_store[sid] = state


# ── Routes ────────────────────────────────────────────────────────────────────

@tech_interview_bp.route("/upload-resume", methods=["POST"])
def upload_resume():
    """
    Accepts resume via:
      1. multipart/form-data  key='resume'  (File)
      2. JSON body  { "resume_text": "..." }
      3. JSON body  { "resume_base64": "...", "filename": "resume.pdf" }
    """
    try:
        file_bytes = None
        filename = ""

        # Method 1 — file upload
        if request.files and "resume" in request.files:
            f = request.files["resume"]
            filename = (f.filename or "resume.pdf").lower()
            file_bytes = f.read()
            logger.info(f"[upload] file='{filename}' size={len(file_bytes)}")

        # Method 2/3 — JSON body
        elif request.is_json or (request.content_type and "application/json" in request.content_type):
            data = request.get_json(silent=True) or {}
            if data.get("resume_text"):
                file_bytes = data["resume_text"].encode("utf-8")
                filename = "resume.txt"
            elif data.get("resume_base64"):
                file_bytes = b64mod.b64decode(data["resume_base64"])
                filename = (data.get("filename") or "resume.pdf").lower()
            logger.info(f"[upload] JSON body size={len(file_bytes or b'')}")

        # Method 3 — raw body
        elif request.data:
            file_bytes = request.data
            filename = "resume.txt"

        if not file_bytes:
            return jsonify({
                "error": "No resume content received.",
                "hint": "Send form-data (key='resume' File), or JSON {\"resume_text\":\"...\"}",
            }), 400

        # Extract text
        if filename.endswith(".pdf"):
            resume_text = _extract_text_from_pdf(file_bytes)
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            resume_text = _extract_text_from_docx(file_bytes)
        else:
            resume_text = file_bytes.decode("utf-8", errors="ignore")

        if not resume_text.strip():
            return jsonify({"error": "Could not extract text. Ensure it is not a scanned image."}), 400

        sid = _get_session_id()
        state = _init_interview_state(resume_text=resume_text)
        result = resume_extractor_agent(state)

        if result.get("phase") == "error":
            return jsonify({"error": result.get("error", "Extraction failed")}), 500

        _save_state(sid, result)

        candidate_name = "Candidate"
        try:
            candidate_name = json.loads(result["resume_summary"]).get("candidate_name", "Candidate")
        except Exception:
            pass

        return jsonify({
            "status": "ready",
            "candidate_name": candidate_name,
            "message": "Resume processed. Call /api/v2/start to begin.",
            "resume_length": len(resume_text),
        }), 200

    except Exception as e:
        logger.error(f"[upload-resume] {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@tech_interview_bp.route("/start", methods=["GET"])
def start_interview():
    sid = _get_session_id()
    state = _get_state(sid)
    if not state:
        return jsonify({"error": "No resume uploaded. Call /api/v2/upload-resume first."}), 400
    if state.get("phase") == "complete":
        return jsonify({"error": "Interview already complete. Reset to start again."}), 400

    # Reset but keep resume
    state.update({
        "questions_asked": 0, "followups_asked": 0,
        "current_question": "", "current_answer": "",
        "conversation_history": [], "scores": [],
        "question_feedbacks": [], "total_marks": 0,
        "phase": "asking", "next_action": "generate_question",
        "error": None, "final_report": None,
    })

    state = question_generator_agent(state)
    _save_state(sid, state)

    return jsonify({
        "status": "interview_started",
        "question": state["current_question"],
        "question_number": state["questions_asked"],
        "total_questions": MAX_QUESTIONS,
        "topic": state["current_question_topic"],
        "marks_per_question": MARKS_PER_QUESTION,
        "total_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
        "is_followup": False,
    }), 200


@tech_interview_bp.route("/answer", methods=["POST"])
def submit_answer():
    sid = _get_session_id()
    state = _get_state(sid)
    if not state:
        return jsonify({"error": "No active session. Upload resume and call /start first."}), 400
    if state.get("phase") == "complete":
        return jsonify({
            "status": "complete",
            "final_report": state.get("final_report"),
            "total_marks": state.get("total_marks", 0),
            "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
            "scores": state.get("scores", []),
        }), 200

    data = request.get_json(silent=True) or {}
    answer = (data.get("answer") or "").strip()
    if not answer:
        return jsonify({"error": "Answer cannot be empty."}), 400

    state["current_answer"] = answer
    state = evaluator_agent(state)

    if state.get("next_action") == "generate_report":
        state = generate_final_report_node(state)
        _save_state(sid, state)
        return jsonify({
            "status": "complete",
            "final_report": state["final_report"],
            "total_marks": state["total_marks"],
            "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
            "scores": state["scores"],
        }), 200

    state = question_generator_agent(state)
    _save_state(sid, state)
    is_followup = state.get("followups_asked", 0) > 0

    return jsonify({
        "status": "followup" if is_followup else "question",
        "question": state["current_question"],
        "question_number": state["questions_asked"],
        "total_questions": MAX_QUESTIONS,
        "topic": state.get("current_question_topic", ""),
        "is_followup": is_followup,
        "scores_so_far": state["scores"],
        "marks_earned_so_far": sum(state["scores"]),
        "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
    }), 200


@tech_interview_bp.route("/status", methods=["GET"])
def interview_status():
    sid = _get_session_id()
    state = _get_state(sid)
    if not state:
        return jsonify({"status": "no_session", "message": "Upload resume to begin."}), 200
    return jsonify({
        "status": state.get("phase", "unknown"),
        "questions_asked": state.get("questions_asked", 0),
        "total_questions": MAX_QUESTIONS,
        "scores_so_far": state.get("scores", []),
        "marks_earned": sum(state.get("scores", [])),
        "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
        "has_resume": bool(state.get("resume_summary")),
        "is_complete": state.get("phase") == "complete",
        "current_question": state.get("current_question", ""),
    }), 200


@tech_interview_bp.route("/reset", methods=["POST"])
def reset_session():
    sid = session.get("ti_session_id")
    if sid and sid in session_store:
        del session_store[sid]
    session.pop("ti_session_id", None)
    return jsonify({"status": "reset", "message": "Session cleared."}), 200


@tech_interview_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Technical Interview Multi-Agent System",
        "agents": ["ResumeExtractor", "QuestionGenerator", "Evaluator"],
        "pdf_support": PDF_AVAILABLE,
        "docx_support": DOCX_AVAILABLE,
        "active_sessions": len(session_store),
        "max_questions": MAX_QUESTIONS,
        "total_max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
    }), 200
