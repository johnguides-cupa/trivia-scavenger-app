'use client';

import { useState, useEffect } from 'react';

interface ScavengerSubmitProps {
  roomCode: string;
  playerId: string;
  questionId: string;
  scavengerText: string;
  disabled?: boolean;
  onSubmitComplete?: () => void;
}

export default function ScavengerSubmit({
  roomCode,
  playerId,
  questionId,
  scavengerText,
  disabled = false,
  onSubmitComplete
}: ScavengerSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSubmitted(false);
    setError(null);
    setShowConfirm(false);
    setChecking(true);
  }, [questionId]);

  // Check if already submitted on mount or when question changes
  useEffect(() => {
    const checkExistingSubmission = async () => {
      try {
        const response = await fetch(
          `/api/check-scavenger-submission?player_id=${playerId}&question_id=${questionId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.has_submitted) {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error('Failed to check submission status:', err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingSubmission();
  }, [playerId, questionId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setShowConfirm(false);

    try {
      const response = await fetch('/api/submit-scavenger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode,
          player_id: playerId,
          question_id: questionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setSubmitted(true);
      onSubmitComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-green-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Submitted!</h3>
        <p className="text-gray-400">Waiting for host approval...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Scavenger Challenge</h2>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white">
          <p className="text-lg font-medium">{scavengerText}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {showConfirm ? (
        <div className="space-y-3">
          <div className="bg-yellow-900/50 border-2 border-yellow-700 rounded-lg p-4 mb-4">
            <p className="text-yellow-300 font-semibold mb-2">⚠️ Confirm Submission</p>
            <p className="text-yellow-400 text-sm">
              Have you completed the challenge? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={disabled || isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
        >
          Submit Completion
        </button>
      )}
    </div>
  );
}
