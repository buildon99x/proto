import { expect, it } from 'vitest';
import { creditLesson, freshLessons, lessonCopy, lessonsComplete } from '../src/lessons';

it('does not credit an opponent or a serve as a learned return', () => {
    const p = freshLessons();
    expect(creditLesson(p, { actor: 1, isServe: false, intent: 'clear', technique: 'clear' })).toBe(
        p,
    );
    expect(creditLesson(p, { actor: 0, isServe: true, intent: 'clear', technique: 'clear' })).toBe(
        p,
    );
    expect(lessonCopy(p)).toContain('1/3');
});

it('does not teach drop when an ordinary attack falls back to a safe drop', () => {
    const p = creditLesson(freshLessons(), {
        actor: 0,
        isServe: false,
        intent: 'default',
        technique: 'drop',
    });
    expect(p).toEqual({ returned: true, cleared: false, dropped: false });
    expect(lessonCopy(p)).toContain('2/3');
});

it('credits a real chosen high clear or lift but not a failed deep-shot fallback', () => {
    for (const technique of ['clear', 'lift'] as const) {
        const p = creditLesson(freshLessons(), {
            actor: 0,
            isServe: false,
            intent: 'clear',
            technique,
        });
        expect(p.cleared).toBe(true);
        expect(lessonCopy(p)).toContain('3/3');
    }
    expect(
        creditLesson(freshLessons(), {
            actor: 0,
            isServe: false,
            intent: 'clear',
            technique: 'drop',
        }).cleared,
    ).toBe(false);
});

it('credits actual chosen soft replies and preserves out-of-order learning', () => {
    for (const technique of ['drop', 'net', 'block'] as const) {
        let p = creditLesson(freshLessons(), {
            actor: 0,
            isServe: false,
            intent: 'drop',
            technique,
        });
        expect(lessonCopy(p)).toContain('2/3');
        p = creditLesson(p, { actor: 0, isServe: false, intent: 'clear', technique: 'clear' });
        expect(lessonsComplete(p)).toBe(true);
        expect(lessonCopy(p)).toBe('');
    }
});

it('keeps the next unperformed lesson stable across repeated ordinary returns', () => {
    const p = creditLesson(freshLessons(), {
        actor: 0,
        isServe: false,
        intent: 'default',
        technique: 'smash',
    });
    let next = p;
    for (let i = 0; i < 100; i++)
        next = creditLesson(next, {
            actor: 0,
            isServe: false,
            intent: 'default',
            technique: 'smash',
        });
    expect(next).toBe(p);
    expect(lessonCopy(next)).toContain('2/3');
});
