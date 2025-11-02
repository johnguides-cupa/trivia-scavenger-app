import { computeTriviaPoints, computeScavengerPoints } from '@/lib/utils'

describe('Scoring Logic', () => {
  describe('computeTriviaPoints', () => {
    test('returns 0 for incorrect answer', () => {
      const points = computeTriviaPoints(false, 100, 30, 5000, true)
      expect(points).toBe(0)
    })

    test('returns full points for correct answer without time scaling', () => {
      const points = computeTriviaPoints(true, 100, 30, 15000, false)
      expect(points).toBe(100)
    })

    test('returns scaled points for fast correct answer', () => {
      // Answered in 3 seconds out of 30 (very fast)
      const points = computeTriviaPoints(true, 100, 30, 3000, true)
      // Should be close to 100 (max points)
      expect(points).toBeGreaterThan(90)
      expect(points).toBeLessThanOrEqual(100)
    })

    test('returns fewer points for slow correct answer', () => {
      // Answered in 27 seconds out of 30 (very slow)
      const points = computeTriviaPoints(true, 100, 30, 27000, true)
      // Should be close to 50 (minimum 50% of base)
      expect(points).toBeGreaterThanOrEqual(50)
      expect(points).toBeLessThan(60)
    })

    test('returns mid-range points for medium-speed answer', () => {
      // Answered in 15 seconds out of 30 (halfway)
      const points = computeTriviaPoints(true, 100, 30, 15000, true)
      // Should be around 75 (75% of base)
      expect(points).toBeGreaterThan(70)
      expect(points).toBeLessThan(80)
    })

    test('handles edge case: answered at exactly time limit', () => {
      const points = computeTriviaPoints(true, 100, 30, 30000, true)
      // Should be minimum 50% of base
      expect(points).toBe(50)
    })

    test('handles edge case: instant answer', () => {
      const points = computeTriviaPoints(true, 100, 30, 0, true)
      // Should be maximum points
      expect(points).toBe(100)
    })
  })

  describe('computeScavengerPoints', () => {
    test('returns 0 for pending approval', () => {
      const points = computeScavengerPoints(null, false, 10, 5, 2)
      expect(points).toBe(0)
    })

    test('returns rejected points for rejected submission', () => {
      const points = computeScavengerPoints(false, false, 10, 5, 2)
      expect(points).toBe(2)
    })

    test('returns first approved points for first approved submission', () => {
      const points = computeScavengerPoints(true, true, 10, 5, 2)
      expect(points).toBe(10)
    })

    test('returns other approved points for non-first approved submission', () => {
      const points = computeScavengerPoints(true, false, 10, 5, 2)
      expect(points).toBe(5)
    })

    test('uses default values correctly', () => {
      const points = computeScavengerPoints(true, true)
      expect(points).toBe(10) // Default first approved points
    })

    test('handles custom point values', () => {
      const firstPoints = computeScavengerPoints(true, true, 20, 8, 3)
      expect(firstPoints).toBe(20)

      const otherPoints = computeScavengerPoints(true, false, 20, 8, 3)
      expect(otherPoints).toBe(8)

      const rejectedPoints = computeScavengerPoints(false, false, 20, 8, 3)
      expect(rejectedPoints).toBe(3)
    })
  })

  describe('Edge Cases and Rules', () => {
    test('first approved submission gets higher points even if not first submitted', () => {
      // Simulates scenario where first submitter is rejected
      // Second submitter (first approved) should get first points
      const firstSubmittedRejected = computeScavengerPoints(false, false, 10, 5, 2)
      const secondSubmittedApproved = computeScavengerPoints(true, true, 10, 5, 2)

      expect(firstSubmittedRejected).toBe(2)
      expect(secondSubmittedApproved).toBe(10) // Gets first approved points
    })

    test('trivia points never exceed base points', () => {
      // Test various scenarios
      const scenarios = [
        { elapsed: 0, limit: 30 },
        { elapsed: 5000, limit: 30 },
        { elapsed: 10000, limit: 30 },
        { elapsed: 15000, limit: 30 },
      ]

      scenarios.forEach(({ elapsed, limit }) => {
        const points = computeTriviaPoints(true, 100, limit, elapsed, true)
        expect(points).toBeLessThanOrEqual(100)
      })
    })

    test('trivia points never go below 50% of base with time scaling', () => {
      // Even at max time
      const points = computeTriviaPoints(true, 100, 30, 30000, true)
      expect(points).toBeGreaterThanOrEqual(50)
    })

    test('handles very high base points', () => {
      const points = computeTriviaPoints(true, 1000, 30, 15000, true)
      expect(points).toBeGreaterThan(700)
      expect(points).toBeLessThanOrEqual(1000)
    })

    test('handles very short time limits', () => {
      const points = computeTriviaPoints(true, 100, 10, 5000, true)
      expect(points).toBeGreaterThanOrEqual(50)
      expect(points).toBeLessThanOrEqual(100)
    })
  })
})
