import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const STATUS = {
  NOT_VISITED: "not_visited",
  NOT_ANSWERED: "not_answered",
  ANSWERED: "answered",
  REVIEW: "review",
  ANSWERED_REVIEW: "answered_review",
} as const;

type StatusValue = (typeof STATUS)[keyof typeof STATUS];

interface Meta {
  questionsCount: number;
  totalMarks: number;
  totalTime: number;      // total time in SECONDS
  markPerAnswer: number;
}

interface ExamState {
  loading: boolean;
  fetchError: string;
  questions: any[];
  currentIndex: number;
  answers: Record<number, number | null>;
  statusMap: Record<number, StatusValue>;
  remainingSeconds: number | null;
  showComprehension: boolean;
  showSubmitModal: boolean;
  isSubmitting: boolean;
  submitError: string;
  meta: Meta;
}

const initialState: ExamState = {
  loading: true,
  fetchError: "",
  questions: [],
  currentIndex: 0,
  answers: {},
  statusMap: {},
  remainingSeconds: null,
  showComprehension: false,
  showSubmitModal: false,
  isSubmitting: false,
  submitError: "",
  meta: {
    questionsCount: 0,
    totalMarks: 0,
    totalTime: 0,
    markPerAnswer: 0,
  },
};

const examSlice = createSlice({
  name: "exam",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setFetchError(state, action: PayloadAction<string>) {
      state.fetchError = action.payload;
    },
    initializeExam(
      state,
      action: PayloadAction<{
        questions: any[];
        questionsCount: number;
        totalMarks: number;
        totalTime: number;          // ← already in seconds
        markPerAnswer: number;
      }>
    ) {
      const { questions, questionsCount, totalMarks, totalTime, markPerAnswer } =
        action.payload;

      state.questions = questions;
      state.meta = {
        questionsCount,
        totalMarks,
        totalTime,
        markPerAnswer,
      };

      const initStatus: Record<number, StatusValue> = {};
      const initAnswers: Record<number, number | null> = {};

      questions.forEach((_, idx) => {
        initStatus[idx] = STATUS.NOT_VISITED;
        initAnswers[idx] = null;
      });

      if (questions.length > 0) {
        initStatus[0] = STATUS.NOT_ANSWERED;
      }

      state.statusMap = initStatus;
      state.answers = initAnswers;
      state.currentIndex = 0;

      // Fixed: no extra multiplication - totalTime is already in seconds!
      state.remainingSeconds = totalTime > 0 ? totalTime : null;

      state.showComprehension = false;
      state.showSubmitModal = false;
      state.isSubmitting = false;
      state.submitError = "";
    },

    tick(state) {
      if (state.remainingSeconds !== null && state.remainingSeconds > 0) {
        state.remainingSeconds -= 1;
      }
    },

    setShowComprehension(state, action: PayloadAction<boolean>) {
      state.showComprehension = action.payload;
    },

    setShowSubmitModal(state, action: PayloadAction<boolean>) {
      state.showSubmitModal = action.payload;
    },

    setIsSubmitting(state, action: PayloadAction<boolean>) {
      state.isSubmitting = action.payload;
    },

    setSubmitError(state, action: PayloadAction<string>) {
      state.submitError = action.payload;
    },

    optionSelected(state, action: PayloadAction<number>) {
      const optionId = action.payload;
      const idx = state.currentIndex;
      state.answers[idx] = optionId;

      const currentStatus = state.statusMap[idx];

      if (currentStatus === STATUS.REVIEW || currentStatus === STATUS.ANSWERED_REVIEW) {
        state.statusMap[idx] = STATUS.ANSWERED_REVIEW;
      } else {
        state.statusMap[idx] = STATUS.ANSWERED;
      }
    },

    goToQuestion(state, action: PayloadAction<number>) {
      const index = action.payload;
      if (index < 0 || index >= state.questions.length) return;

      const currentIdx = state.currentIndex;
      const currentStatus = state.statusMap[currentIdx];
      const hasAnswer = !!state.answers[currentIdx];

      if (currentStatus === STATUS.REVIEW) {
        if (hasAnswer) state.statusMap[currentIdx] = STATUS.ANSWERED_REVIEW;
      } else if (currentStatus !== STATUS.ANSWERED_REVIEW) {
        state.statusMap[currentIdx] = hasAnswer ? STATUS.ANSWERED : STATUS.NOT_ANSWERED;
      }

      const targetStatus = state.statusMap[index];
      if (targetStatus === STATUS.NOT_VISITED) {
        state.statusMap[index] = STATUS.NOT_ANSWERED;
      }

      state.currentIndex = index;
      state.showComprehension = false;
    },

    markForReview(state) {
      const idx = state.currentIndex;
      const hasAnswer = !!state.answers[idx];

      state.statusMap[idx] = hasAnswer ? STATUS.ANSWERED_REVIEW : STATUS.REVIEW;
    },
  },
});

export const {
  setLoading,
  setFetchError,
  initializeExam,
  tick,
  setShowComprehension,
  setShowSubmitModal,
  setIsSubmitting,
  setSubmitError,
  optionSelected,
  goToQuestion,
  markForReview,
} = examSlice.actions;

export { STATUS };
export default examSlice.reducer;