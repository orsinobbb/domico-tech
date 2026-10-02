import {
  QUESTIONS,
  answerQuestion,
  createAssessmentState,
  getAssessmentProgress,
} from "./assessment.js";

function withoutEvent(journeyState) {
  return { ...journeyState, lastEventName: null };
}

export function createJourneyState(assessmentState = createAssessmentState()) {
  const safeAssessmentState = createAssessmentState(assessmentState?.answers);
  const progress = getAssessmentProgress(safeAssessmentState);
  const firstUnanswered = QUESTIONS.findIndex(({ id }) => !safeAssessmentState.answers[id]);
  return {
    assessmentState: safeAssessmentState,
    currentIndex: progress.complete ? QUESTIONS.length - 1 : Math.max(0, firstUnanswered),
    mode: progress.complete ? "result" : "questions",
    lastEventName: null,
  };
}

export function transitionJourney(journeyState, action = {}) {
  if (!journeyState || !journeyState.assessmentState) return createJourneyState();

  switch (action.type) {
    case "SELECT_AUDIENCE": {
      if (journeyState.assessmentState.answers.audience === action.value) return withoutEvent(journeyState);
      const nextAssessment = answerQuestion(journeyState.assessmentState, "audience", action.value);
      if (nextAssessment === journeyState.assessmentState) return withoutEvent(journeyState);
      return {
        assessmentState: nextAssessment,
        currentIndex: 0,
        mode: "questions",
        lastEventName: "audience_selected",
      };
    }
    case "ANSWER": {
      const questionId = action.questionId ?? QUESTIONS[journeyState.currentIndex]?.id;
      if (!QUESTIONS.some(({ id }) => id === questionId)) return withoutEvent(journeyState);
      if (journeyState.assessmentState.answers[questionId] === action.value) return withoutEvent(journeyState);
      const progressBefore = getAssessmentProgress(journeyState.assessmentState);
      const nextAssessment = answerQuestion(journeyState.assessmentState, questionId, action.value);
      if (nextAssessment === journeyState.assessmentState) return withoutEvent(journeyState);
      const isFirstWorkingAnswer = progressBefore.answered === 0
        || (progressBefore.answered === 1 && Boolean(journeyState.assessmentState.answers.audience) && questionId !== "audience");
      return {
        assessmentState: nextAssessment,
        currentIndex: journeyState.currentIndex,
        mode: "questions",
        lastEventName: isFirstWorkingAnswer ? "assessment_started" : null,
      };
    }
    case "NEXT": {
      const question = QUESTIONS[journeyState.currentIndex];
      if (journeyState.mode !== "questions" || !question || !journeyState.assessmentState.answers[question.id]) {
        return withoutEvent(journeyState);
      }
      if (journeyState.currentIndex >= QUESTIONS.length - 1) return withoutEvent(journeyState);
      return {
        assessmentState: journeyState.assessmentState,
        currentIndex: journeyState.currentIndex + 1,
        mode: "questions",
        lastEventName: null,
      };
    }
    case "PREVIOUS": {
      if (journeyState.mode === "result") {
        return {
          assessmentState: journeyState.assessmentState,
          currentIndex: QUESTIONS.length - 1,
          mode: "questions",
          lastEventName: null,
        };
      }
      if (journeyState.currentIndex === 0) return withoutEvent(journeyState);
      return {
        assessmentState: journeyState.assessmentState,
        currentIndex: journeyState.currentIndex - 1,
        mode: "questions",
        lastEventName: null,
      };
    }
    case "SHOW_RESULT": {
      if (journeyState.mode === "result" || !getAssessmentProgress(journeyState.assessmentState).complete) {
        return withoutEvent(journeyState);
      }
      return {
        assessmentState: journeyState.assessmentState,
        currentIndex: QUESTIONS.length - 1,
        mode: "result",
        lastEventName: "assessment_completed",
      };
    }
    case "RESTART":
      return createJourneyState();
    default:
      return withoutEvent(journeyState);
  }
}
