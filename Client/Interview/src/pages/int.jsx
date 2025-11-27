import React, { useCallback, useMemo, useRef, useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function Int() {
  const [sessionId, setSessionId] = useState('interview_session_1')
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('Idle')
  const [question, setQuestion] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [stage, setStage] = useState('')
  const [answer, setAnswer] = useState('')
  const [isFollowup, setIsFollowup] = useState(false)
  const [followupQuestion, setFollowupQuestion] = useState('')
  const [completed, setCompleted] = useState(false)
  const [summary, setSummary] = useState(null)

  const inputRef = useRef(null)

  const resetInterviewState = useCallback(() => {
    setQuestion(null)
    setQuestionNumber(0)
    setTotalQuestions(0)
    setStage('')
    setAnswer('')
    setIsFollowup(false)
    setFollowupQuestion('')
    setCompleted(false)
    setSummary(null)
  }, [])

  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) {
      setStatus('Please choose a PDF resume')
      return
    }
    setUploading(true)
    setStatus('Uploading and processing resume...')
    resetInterviewState()
    try {
      const form = new FormData()
      form.append('file', file)

      const res = await axios.post(`${API_BASE}/upload_resume`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const data = res.data
      setStatus(data.message || 'Resume processed')
      if (data.session_id) setSessionId(data.session_id)
      setTotalQuestions(data.total_questions || 0)
      if (data.first_question) {
        setQuestion(data.first_question)
        setQuestionNumber(1)
        setStage(data.first_question.stage)
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Upload failed'
      setStatus(`Error: ${msg}`)
    } finally {
      setUploading(false)
    }
  }, [file, resetInterviewState])

  const getCurrentQuestion = useCallback(async () => {
    setStatus('Fetching current question...')
    try {
      const res = await axios.get(`${API_BASE}/get_question`, {
        params: { session_id: sessionId },
      })
      const data = res.data
      if (data.completed) {
        setCompleted(true)
        setQuestion(null)
        setQuestionNumber(data.total_answered || 0)
        setStage('')
        setStatus('Interview completed')
        return
      }
      setQuestion(data.question)
      setQuestionNumber(data.question_number)
      setTotalQuestions(data.total_questions)
      setStage(data.stage)
      setStatus('Current question loaded')
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Could not fetch question'
      setStatus(`Error: ${msg}`)
    }
  }, [sessionId])

  const submitAnswer = useCallback(async () => {
    if (!answer.trim()) {
      setStatus('Please write an answer before submitting')
      return
    }
    setStatus('Submitting answer...')
    try {
      const res = await axios.post(`${API_BASE}/submit_answer`, {
        session_id: sessionId,
        answer: answer.trim(),
      })

      const data = res.data
      setAnswer('')

      if (data.completed) {
        setCompleted(true)
        setQuestion(null)
        setIsFollowup(false)
        setFollowupQuestion('')
        setStatus('Interview completed')
        return
      }

      if (data.is_followup) {
        setIsFollowup(true)
        setFollowupQuestion(data.followup_question)
        setStage(data.stage || stage)
        setStatus('Follow-up generated; please answer the follow-up')
      } else if (data.next_question) {
        setIsFollowup(false)
        setFollowupQuestion('')
        setQuestion(data.next_question)
        setQuestionNumber(data.question_number)
        setTotalQuestions(data.total_questions)
        setStage(data.next_question.stage)
        setStatus('Moved to next question')
      } else {
        setStatus(data.message || 'Answer recorded')
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Submit failed'
      setStatus(`Error: ${msg}`)
    }
  }, [answer, sessionId, stage])

  const fetchSummary = useCallback(async () => {
    setStatus('Fetching summary...')
    try {
      const res = await axios.get(`${API_BASE}/get_summary`, {
        params: { session_id: sessionId },
      })
      setSummary(res.data)
      setStatus('Summary loaded')
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Could not fetch summary'
      setStatus(`Error: ${msg}`)
    }
  }, [sessionId])

  const canUpload = useMemo(() => !uploading && !!file, [uploading, file])

  return (
    <div className="min-h-screen flex flex-col gap-4 p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Interview (temp.py integration)</h1>

      <div className="flex flex-col gap-2 p-3 border rounded-md">
        <label className="font-medium">Session ID</label>
        <input
          className="border rounded px-3 py-2"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
        <div className="text-sm text-gray-600">Default is the backend thread: interview_session_1</div>
      </div>

      <div className="flex flex-col gap-3 p-3 border rounded-md">
        <div className="font-medium">1) Upload Resume (PDF)</div>
        <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFileChange} />
        <button
          disabled={!canUpload}
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload & Start'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={getCurrentQuestion}
          className="bg-gray-800 text-white px-3 py-2 rounded"
        >
          Get Current Question
        </button>
        <button
          onClick={fetchSummary}
          className="bg-indigo-600 text-white px-3 py-2 rounded"
        >
          Get Summary
        </button>
      </div>

      <div className="p-3 border rounded-md">
        <div className="font-medium mb-2">Status</div>
        <div className="text-sm whitespace-pre-wrap">{status}</div>
      </div>

      {completed && (
        <div className="p-3 border rounded-md bg-green-50">Interview completed.</div>
      )}

      {!completed && (question || isFollowup) && (
        <div className="flex flex-col gap-3 p-3 border rounded-md">
          <div className="text-sm text-gray-600">Stage: {stage || '-'}</div>
          {!isFollowup && question && (
            <div>
              <div className="font-medium">Question {questionNumber} / {totalQuestions}</div>
              <div className="mt-1">{question?.question}</div>
            </div>
          )}
          {isFollowup && (
            <div>
              <div className="font-medium">Follow-up</div>
              <div className="mt-1">{followupQuestion}</div>
            </div>
          )}
          <textarea
            className="border rounded p-2 min-h-28"
            placeholder={isFollowup ? 'Type your follow-up answer...' : 'Type your answer...'}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button
            onClick={submitAnswer}
            className="bg-emerald-600 text-white px-4 py-2 rounded"
          >
            Submit Answer
          </button>
        </div>
      )}

      {summary && (
        <div className="flex flex-col gap-2 p-3 border rounded-md">
          <div className="font-medium">Summary</div>
          <div className="text-sm">Total questions: {summary.total_questions}</div>
          <div className="text-sm">Answered: {summary.answered_questions}</div>
          <div className="text-sm">Follow-ups: {summary.followup_questions}</div>
          <div className="text-sm">Stages completed: {summary.stages_completed}</div>
          <div className="mt-2">
            <div className="font-medium">Extracted Info</div>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
{JSON.stringify(summary.extracted_info, null, 2)}
            </pre>
          </div>
          <div className="mt-2">
            <div className="font-medium">Conversation</div>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
{JSON.stringify(summary.conversation_history, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default Int


