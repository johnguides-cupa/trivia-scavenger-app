'use client';

import { useState, useEffect } from 'react';

interface ScavengerSubmission {
  id: string;
  player_id: string;
  player_name: string;
  submitted_at: string;
  submission_order: number;
}

interface ScavengerReviewProps {
  roomCode: string;
  questionId: string;
  scavengerText: string;
}

export default function ScavengerReview({
  roomCode,
  questionId,
  scavengerText
}: ScavengerReviewProps) {
  const [submissions, setSubmissions] = useState<ScavengerSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
    // Poll for new submissions every 2 seconds
    const interval = setInterval(fetchSubmissions, 2000);
    return () => clearInterval(interval);
  }, [questionId]);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(
        `/api/scavenger-submissions?room_code=${roomCode}&question_id=${questionId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, approved: boolean) => {
    setProcessing(submissionId);
    setError(null);

    try {
      const response = await fetch('/api/review-scavenger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          approved
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to review submission');
      }

      // Remove the submission from the list
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Review Scavenger Submissions</h2>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <p className="font-medium">{scavengerText}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No pending submissions</p>
          <p className="text-sm mt-2">Waiting for players to submit...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-gray-700 rounded-xl p-4 flex items-center justify-between border border-gray-600"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  #{submission.submission_order}
                </div>
                <div>
                  <p className="font-bold text-white">{submission.player_name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(submission.submitted_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleReview(submission.id, true)}
                  disabled={processing === submission.id}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  {processing === submission.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReview(submission.id, false)}
                  disabled={processing === submission.id}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  {processing === submission.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        {submissions.length} pending {submissions.length === 1 ? 'submission' : 'submissions'}
      </div>
    </div>
  );
}
