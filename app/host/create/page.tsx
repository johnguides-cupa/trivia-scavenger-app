'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClientUUID, setHostKey } from '@/lib/utils'
import { createRoom } from '@/app/actions'
import type { GameSettings } from '@/types'

interface CustomQuestion {
  id: string
  stem: string
  correct_answer: string
  wrong_answer_1: string
  wrong_answer_2: string
  wrong_answer_3: string
  scavenger_instruction: string
}

export default function CreateRoomPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [settings, setSettings] = useState<GameSettings>({
    number_of_rounds: 3,
    questions_per_round: 3,
    time_per_trivia_question: 30,
    time_per_scavenger: 60,
    points_for_first_scavenger: 10,
    points_for_other_approved_scavengers: 5,
    points_for_rejected_scavengers: 2,
    trivia_base_point: 100,
    trivia_time_scaling: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [useDefaultQuestions, setUseDefaultQuestions] = useState(true)
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])

  const totalQuestions = settings.number_of_rounds * settings.questions_per_round

  // Initialize custom questions when switching to custom mode
  useEffect(() => {
    if (!useDefaultQuestions && customQuestions.length === 0) {
      const initialQuestions: CustomQuestion[] = []
      for (let i = 0; i < totalQuestions; i++) {
        initialQuestions.push({
          id: `q${i + 1}`,
          stem: '',
          correct_answer: '',
          wrong_answer_1: '',
          wrong_answer_2: '',
          wrong_answer_3: '',
          scavenger_instruction: '',
        })
      }
      setCustomQuestions(initialQuestions)
    }
  }, [useDefaultQuestions, totalQuestions])

  // Update custom questions count when total questions changes
  useEffect(() => {
    if (!useDefaultQuestions) {
      setCustomQuestions(prev => {
        const updated = [...prev]
        if (updated.length < totalQuestions) {
          // Add more questions
          for (let i = updated.length; i < totalQuestions; i++) {
            updated.push({
              id: `q${i + 1}`,
              stem: '',
              correct_answer: '',
              wrong_answer_1: '',
              wrong_answer_2: '',
              wrong_answer_3: '',
              scavenger_instruction: '',
            })
          }
        } else if (updated.length > totalQuestions) {
          // Remove excess questions
          return updated.slice(0, totalQuestions)
        }
        return updated
      })
    }
  }, [totalQuestions, useDefaultQuestions])

  const updateQuestion = (index: number, field: keyof CustomQuestion, value: string) => {
    setCustomQuestions(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const isCustomQuestionsValid = () => {
    if (useDefaultQuestions) return true
    return customQuestions.every(q => 
      q.stem.trim() && 
      q.correct_answer.trim() && 
      q.wrong_answer_1.trim() && 
      q.wrong_answer_2.trim() && 
      q.wrong_answer_3.trim() && 
      q.scavenger_instruction.trim()
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate custom questions if using them
    if (!useDefaultQuestions && !isCustomQuestionsValid()) {
      setError('Please fill in all question fields')
      return
    }

    setIsLoading(true)

    // Get client UUID on the client side before calling server action
    const clientUuid = typeof window !== 'undefined' ? getClientUUID() : 'anonymous'
    console.log('🎮 Creating room with UUID:', clientUuid)

    try {
      // Prepare custom questions if not using defaults
      let questionsToSubmit = undefined
      if (!useDefaultQuestions) {
        questionsToSubmit = []
        let index = 0
        for (let round = 1; round <= settings.number_of_rounds; round++) {
          for (let qNum = 1; qNum <= settings.questions_per_round; qNum++) {
            const q = customQuestions[index]
            questionsToSubmit.push({
              round_number: round,
              question_number: qNum,
              stem: q.stem,
              choices: [
                { id: 'a', label: q.correct_answer, is_correct: true },
                { id: 'b', label: q.wrong_answer_1, is_correct: false },
                { id: 'c', label: q.wrong_answer_2, is_correct: false },
                { id: 'd', label: q.wrong_answer_3, is_correct: false },
              ],
              scavenger_instruction: q.scavenger_instruction,
            })
            index++
          }
        }
      }

      console.log('📤 Sending createRoom request with UUID:', clientUuid)
      
      const response = await createRoom({
        title: title || 'Trivia Scavenger Game',
        settings,
        questions: questionsToSubmit,
        host_client_uuid: clientUuid,
      })
      
      console.log('✅ Room created:', response.room.room_code)

      // Save host key with room code
      const roomCode = response.room.room_code
      if (typeof window !== 'undefined') {
        localStorage.setItem(`host_key_${roomCode}`, response.host_key)
      }

      // Navigate to host dashboard
      router.push(`/host/${roomCode}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create room')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-2">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">Create Game</span>
          </h1>
          <p className="text-gray-400">Customize your party game settings</p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Game Title */}
          <div className="card">
            <label className="block text-lg font-semibold text-white mb-3">
              Game Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Friday Night Party"
              className="input"
              maxLength={50}
            />
          </div>

          {/* Game Settings */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Game Settings</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Rounds */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Number of Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.number_of_rounds}
                  onChange={(e) => setSettings({ ...settings, number_of_rounds: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>

              {/* Questions per Round */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Questions per Round
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.questions_per_round}
                  onChange={(e) => setSettings({ ...settings, questions_per_round: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>

              {/* Trivia Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Trivia Time (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={settings.time_per_trivia_question}
                  onChange={(e) => setSettings({ ...settings, time_per_trivia_question: parseInt(e.target.value) || 30 })}
                  className="input"
                />
              </div>

              {/* Scavenger Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Scavenger Time (seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={settings.time_per_scavenger}
                  onChange={(e) => setSettings({ ...settings, time_per_scavenger: parseInt(e.target.value) || 60 })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Scoring Settings */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Scoring Settings</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Trivia Base Points */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Trivia Base Points
                </label>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  step={10}
                  value={settings.trivia_base_point}
                  onChange={(e) => setSettings({ ...settings, trivia_base_point: parseInt(e.target.value) || 100 })}
                  className="input"
                />
              </div>

              {/* Time Scaling */}
              <div className="flex items-center h-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trivia_time_scaling}
                    onChange={(e) => setSettings({ ...settings, trivia_time_scaling: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-semibold text-gray-300">
                    Time-based Scoring (Kahoot style)
                  </span>
                </label>
              </div>

              {/* First Scavenger Points */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  First Scavenger Points
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.points_for_first_scavenger}
                  onChange={(e) => setSettings({ ...settings, points_for_first_scavenger: parseInt(e.target.value) || 10 })}
                  className="input"
                />
              </div>

              {/* Other Approved Points */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Other Approved Points
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.points_for_other_approved_scavengers}
                  onChange={(e) => setSettings({ ...settings, points_for_other_approved_scavengers: parseInt(e.target.value) || 5 })}
                  className="input"
                />
              </div>

              {/* Rejected Points */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Rejected Scavenger Points
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={settings.points_for_rejected_scavengers}
                  onChange={(e) => setSettings({ ...settings, points_for_rejected_scavengers: parseInt(e.target.value) || 2 })}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Questions</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="useDefault"
                  checked={useDefaultQuestions}
                  onChange={(e) => setUseDefaultQuestions(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="useDefault" className="flex-1">
                  <span className="font-semibold text-blue-900">Use Default Questions</span>
                  <p className="text-sm text-blue-700 mt-1">
                    We'll automatically generate {totalQuestions} fun trivia questions with scavenger hunts for your game.
                    Perfect for getting started quickly!
                  </p>
                </label>
              </div>
            </div>

            {!useDefaultQuestions && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
                  <p className="font-semibold mb-1">📝 Custom Questions Builder</p>
                  <p>Create {totalQuestions} unique trivia questions with scavenger hunt challenges. Each question needs 4 answer choices and a scavenger instruction.</p>
                </div>

                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {customQuestions.map((q, index) => (
                    <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Question {index + 1} of {totalQuestions}
                      </h3>

                      {/* Question Stem */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Question *
                        </label>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => updateQuestion(index, 'stem', e.target.value)}
                          placeholder="e.g., What color do you get when you mix blue and yellow?"
                          className="input text-sm"
                          required
                        />
                      </div>

                      {/* Answers */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">
                            ✓ Correct Answer *
                          </label>
                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                            placeholder="e.g., Green"
                            className="input text-sm border-green-300 focus:ring-green-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Wrong Answer 1 *
                          </label>
                          <input
                            type="text"
                            value={q.wrong_answer_1}
                            onChange={(e) => updateQuestion(index, 'wrong_answer_1', e.target.value)}
                            placeholder="e.g., Orange"
                            className="input text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Wrong Answer 2 *
                          </label>
                          <input
                            type="text"
                            value={q.wrong_answer_2}
                            onChange={(e) => updateQuestion(index, 'wrong_answer_2', e.target.value)}
                            placeholder="e.g., Purple"
                            className="input text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Wrong Answer 3 *
                          </label>
                          <input
                            type="text"
                            value={q.wrong_answer_3}
                            onChange={(e) => updateQuestion(index, 'wrong_answer_3', e.target.value)}
                            placeholder="e.g., Red"
                            className="input text-sm"
                            required
                          />
                        </div>
                      </div>

                      {/* Scavenger Hunt */}
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-1">
                          🎯 Scavenger Hunt Challenge *
                        </label>
                        <input
                          type="text"
                          value={q.scavenger_instruction}
                          onChange={(e) => updateQuestion(index, 'scavenger_instruction', e.target.value)}
                          placeholder="e.g., Find something/someone wearing green 💚"
                          className="input text-sm border-purple-300 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || (!useDefaultQuestions && !isCustomQuestionsValid())}
              className="btn-primary flex-1 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
            <a href="/" className="btn-outline">Cancel</a>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-1">� How It Works:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Create room with default questions (fast & easy!)</li>
            <li>Share the room code with players</li>
            <li>Start game when everyone joins</li>
            <li>Players answer on their devices, you control the flow</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
